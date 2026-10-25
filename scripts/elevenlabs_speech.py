"""ElevenLabs TTS with original-character timestamps and measured scene allocation.
Secrets come only from the server environment; API responses never contain the key.
"""
import os,sys,time,json,base64,hashlib,re,math,urllib.request,urllib.error,pathlib,wave,array,subprocess
TOKEN=re.compile(r"(?:[+−-]?\d+(?:[.,:/]\d+)+(?:%|‰)?|[+−-]?\d+(?:%|‰)|[+−-]\d+|[A-Za-zА-Яа-яЁё0-9]+(?:[-‑][A-Za-zА-Яа-яЁё0-9]+)*)[.,!?;:]*")
# English projects keep contractions/possessives (don't, xtuned's) and currency signs as one caption word. Russian TOKEN is unchanged.
TOKEN_EN=re.compile(r"(?:[$€£]?[+−-]?\d+(?:[.,:/]\d+)+(?:%|‰)?(?:[-‑][A-Za-z0-9]+)*|[$€£]?[+−-]?\d+(?:%|‰)?(?:[-‑][A-Za-z0-9]+)*|\.?[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*(?:['’][A-Za-z]+)*(?:[-‑][A-Za-z0-9]+(?:['’][A-Za-z]+)*)*)[.,!?;:]*")
LANGUAGES={'ru','en'}

# Parallel engine (2026-10-21): several projects may voice at once. ElevenLabs answers 429 to a request it did not
# process (concurrency/rate limit, busy system); it is retried with backoff, never a quota or unknown 429 status.
RETRY_429={None,'','too_many_concurrent_requests','system_busy','rate_limit_exceeded','concurrent_limit_exceeded'}
RETRY_DELAYS=(2,4,8,15,30)

def retry_delay(error,attempt):
 try:after=float(error.headers.get('Retry-After') or 0)
 except (TypeError,ValueError,AttributeError):after=0
 return min(60.0,max(after,RETRY_DELAYS[attempt]))

def request_json(endpoint,payload=None,pending=None,sleep=None):
 """pending=(path,text): the marker of an unknown paid result is removed while waiting after a rejected 429 and
 written again before the next attempt, so a stop between attempts never blocks a later explicit take."""
 key=os.environ.get('ELEVENLABS_API_KEY','').strip()
 if not key:raise ValueError('ElevenLabs: заполните ELEVENLABS_API_KEY в .env.local и перезапустите студию.')
 sleep=sleep or time.sleep
 for attempt in range(len(RETRY_DELAYS)+1):
  req=urllib.request.Request('https://api.elevenlabs.io'+endpoint,data=None if payload is None else json.dumps(payload,ensure_ascii=False).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='GET' if payload is None else 'POST')
  try:
   with urllib.request.urlopen(req,timeout=150) as response:return json.load(response)
  except urllib.error.HTTPError as e:
   try:detail=json.loads(e.read()).get('detail',{})
   except Exception:detail={}
   status=detail.get('status') if isinstance(detail,dict) else None
   if e.code==429 and status in RETRY_429 and attempt<len(RETRY_DELAYS):
    delay=retry_delay(e,attempt)
    print(f'ElevenLabs: HTTP 429 ({status or "rate limit"}), запрос не выполнен; повтор {attempt+1}/{len(RETRY_DELAYS)} через {delay:.0f} с.',file=sys.stderr,flush=True)
    if pending:pending[0].unlink(missing_ok=True)
    sleep(delay)
    if pending:pending[0].write_text(pending[1])
    continue
   return _http_failure(e,detail)
  except (urllib.error.URLError,TimeoutError):
   raise ValueError('ElevenLabs: соединение прервано. Результат запроса неизвестен; автоматического платного повтора нет. Проверьте историю в ElevenLabs перед повтором.') from None

def _http_failure(e,detail):
 if isinstance(detail,dict) and detail.get('status')=='missing_permissions':
  permission='voices_read' if 'voices_read' in str(detail.get('message','')) else 'text_to_speech'
  raise ValueError(f'ElevenLabs: ключу не хватает разрешения {permission}. Включите его в настройках ключа.') from None
 hints={401:'ключ отклонён',403:'нет доступа к голосу или методу',429:'лимит запросов или символов исчерпан',422:'проверьте модель и настройки голоса'}
 raise ValueError(f"ElevenLabs: HTTP {e.code}, {hints.get(e.code,'сервис не выполнил запрос')}. Повторный платный запрос автоматически не отправлен.") from None

def words_from_characters(text,alignment,language='ru'):
 chars=alignment.get('characters',[]);starts=alignment.get('character_start_times_seconds',[]);ends=alignment.get('character_end_times_seconds',[])
 if ''.join(chars)!=text or not (len(chars)==len(starts)==len(ends)):
  raise ValueError('ElevenLabs: метки не соответствуют исходному тексту; синхронизация остановлена.')
 if any(not math.isfinite(a) or not math.isfinite(b) or a<0 or b<a for a,b in zip(starts,ends)) or any(starts[i]<starts[i-1] for i in range(1,len(starts))):
  raise ValueError('ElevenLabs: некорректные временные метки.')
 return [{'text':m.group(),'start':starts[m.start()],'end':max(ends[m.start():m.end()]),'charStart':m.start(),'charEnd':m.end()} for m in (TOKEN_EN if language=='en' else TOKEN).finditer(text)]

def allocate_frames(durations,preferred,budget):
 """Selected duration is a ceiling, not a quota of silence. Keep natural speed."""
 frames=[max(90,math.ceil((d+(.7 if i<len(durations)-1 else .95))*30)) for i,d in enumerate(durations)]
 target=math.ceil(sum(frames)/30)*30
 if any(f>420 for f in frames) or target>budget:
  raise ValueError('ElevenLabs: естественная речь не помещается в выбранную длительность. Сократите сценарий; голос не ускорен и не обрезан.')
 # At most one second of rounding is shared across all scenes, never padded to a minute.
 while sum(frames)<target:
  choices=[i for i,f in enumerate(frames) if f<420 and (f+1)/30-durations[i]<=1.35]
  if not choices:raise ValueError('ElevenLabs: короткие реплики требуют объединения, чтобы паузы не превышали 1,5 с.')
  i=min(choices,key=lambda i:frames[i]/30-durations[i]);frames[i]+=1
 if any(f/30-d>1.35 for f,d in zip(frames,durations)):
  raise ValueError('ElevenLabs: объедините слишком короткие реплики, чтобы не растягивать паузы.')
 return frames

def compact_segment(samples,words,source_start,rate=48000,max_pause=1.1):
 """Remove only the quiet middle of long inter-word gaps; never speed up speech."""
 cuts=[]
 for left,right in zip(words,words[1:]):
  gap=right['start']-left['end']
  if gap>max_pause:
   lo=round((left['end']-source_start+max_pause/2)*rate)
   hi=round((right['start']-source_start-max_pause/2)*rate)
   if hi>lo:cuts.append((lo,hi))
 if not cuts:return samples,words
 out=array.array('h');cursor=0
 for lo,hi in cuts:out.extend(samples[cursor:lo]);cursor=hi
 out.extend(samples[cursor:])
 def mapped(t):
  sample=round((t-source_start)*rate)
  return t-sum(hi-lo for lo,hi in cuts if hi<=sample)/rate
 return out,[dict(w,start=mapped(w['start']),end=mapped(w['end'])) for w in words]

def retime_scene_events(plan,frames):
 for scene,count in zip(plan['scenes'],frames):
  previous=scene['seconds'];scene['seconds']=count/30
  for beat in scene.get('beats',[]):beat['at']=min(scene['seconds']-.35,beat['at']*scene['seconds']/previous)
 return plan

def narration_texts(plan):
 # Storyboard boundaries must not become separate performance prompts or paragraphs.
 texts=[re.sub(r"\s+", " ", scene['narration']).strip() for scene in plan['scenes']]
 if any(not text for text in texts):raise ValueError('ElevenLabs: для каждой сцены нужен текст.')
 return texts

def continuous_track(pcm,words,texts,plan,budget,rate=48000,preserve_pauses=False):
 """One PCM performance. Chapters are timed markers, never audio edit points."""
 lead=.18
 begin=max(0,words[0]['start']-.08)
 end=min(len(pcm)/rate,words[-1]['end']+.22)
 source=pcm[round(begin*rate):round(end*rate)]
 pause_edits=0 if preserve_pauses else sum(b['start']-a['end']>1.1 for a,b in zip(words,words[1:]))
 if not preserve_pauses:source,words=compact_segment(source,words,begin,rate=rate)
 mapped=[dict(w,start=lead+w['start']-begin,end=lead+w['end']-begin) for w in words]
 offsets=[];offset=0
 for text in texts:offsets.append((offset,offset+len(text)));offset+=len(text)+1
 groups=[[w for w in mapped if w['charStart']>=lo and w['charEnd']<=hi] for lo,hi in offsets]
 if any(not group for group in groups):raise ValueError('ElevenLabs: отсутствуют метки одной из глав.')
 # The @xtuned outro needs its measured tail after the last word for the press and reply; not a silence quota.
 outro_tail=max(.25,float((plan.get('creatorOutro') or {}).get('tailSeconds',0))-.22)
 # Loop ending (2026-10-22): the film runs back into its first word, so the seam pause is the take's own edges
 # (.22 s after the last word + .18 s lead + .08 s before the first word ≈ a sentence pause), frame-exact, not whole seconds.
 total_frames=math.ceil((lead+len(source)/rate)*30-1e-6) if plan.get('loopEnding') else math.ceil(lead+len(source)/rate+outro_tail)*30
 if total_frames>budget:raise ValueError('ElevenLabs: связный рассказ не помещается в выбранный предел. Сократите сценарий; голос не ускорен.')
 boundaries=[0]
 for left,right in zip(groups,groups[1:]):
  # Prefer the quiet midpoint between words. Frame rounding never changes the audio.
  low=math.ceil(left[-1]['end']*30);high=math.floor(right[0]['start']*30)
  middle=round((left[-1]['end']+right[0]['start'])*15)
  boundaries.append(min(high,max(low,middle)) if low<=high else middle)
 boundaries.append(total_frames)
 frames=[b-a for a,b in zip(boundaries,boundaries[1:])]
 scene_limit=900 if budget>60*30 else 420
 if any(f<90 or f>scene_limit for f in frames):raise ValueError('ElevenLabs: слишком короткая или длинная глава. Предел: 14 с для Shorts, 30 с для длинного объяснения. Непрерывная речь не растягивается паузами.')
 retime_scene_events(plan,frames)
 alignment=[{'scene':i+1,'start':g[0]['start'],'end':g[-1]['end'],'sceneEnd':boundaries[i+1]/30,'speed':1.0,'text':scene['narration'],'words':g} for i,(g,scene) in enumerate(zip(groups,plan['scenes']))]
 return {'mode':'continuous','samples':source,'lead':lead,'alignment':alignment,'pauseEdits':pause_edits,'insertedInterSceneSilenceSeconds':0,'sourceTrimStart':begin,'sourceTrimEnd':end}

def speech_key(voice,payload):
 return hashlib.sha256(json.dumps({'voice':voice,'payload':payload},sort_keys=True,ensure_ascii=False).encode()).hexdigest()[:20]

def check_paid_gate(root,key,chars,paid_gate):
 """Agent mode: after one successful take, a new paid take waits for the user's explicit yes (confirmed key)."""
 if paid_gate is None or (root/f'eleven-{key}.json').exists() or key in (paid_gate.get('confirmed') or []):return
 if any(not p.name.endswith('.pending.json') for p in root.glob('eleven-*.json')):raise ValueError(f'PAID_GATE tts {key} {chars}')

def cached_speech(root,voice,payload,endpoint):
 key=speech_key(voice,payload)
 cache=root/f'eleven-{key}.json';pending=root/f'eleven-{key}.pending.json'
 if cache.exists():return json.loads(cache.read_text()),key
 if pending.exists():raise ValueError('ElevenLabs: предыдущий платный запрос имеет неизвестный результат. Автоматического повтора нет. Проверьте историю ElevenLabs перед явным повтором.')
 if payload['model_id']=='eleven_v4':
  models=request_json('/v1/models')
  if not any(m.get('model_id')=='eleven_v4' and m.get('can_do_text_to_speech') for m in models):raise ValueError('ElevenLabs: модель eleven_v4 недоступна. Подмена модели запрещена.')
 marker=json.dumps({'model':payload['model_id'],'started':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()})
 pending.write_text(marker)
 try:response=request_json(endpoint,payload,pending=(pending,marker))
 except ValueError as error:
  if any(f'HTTP {code}' in str(error) for code in (400,401,403,404,422,429)):pending.unlink(missing_ok=True)
  raise
 if not response.get('audio_base64'):raise ValueError('ElevenLabs: пустой аудиоответ; результат платного запроса неизвестен.')
 temporary=cache.with_suffix('.tmp');temporary.write_text(json.dumps(response,ensure_ascii=False));temporary.replace(cache);pending.unlink(missing_ok=True)
 return response,key

def speech_payload(voice,text,model,language='ru'):
 if language not in LANGUAGES:raise ValueError('ElevenLabs: неподдержанный язык проекта.')
 if model=='eleven_v4':
  if len(text)>2000:raise ValueError('ElevenLabs: v4 continuous adapter requires <=2000 characters; no automatic chunking or fallback.')
  return {'inputs':[{'text':text,'voice_id':voice}],'model_id':model,'language_code':language},'/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128'
 if model!='eleven_multilingual_v2':raise ValueError('ElevenLabs: модель не поддерживается проверенным адаптером.')
 return {'text':text,'model_id':model,'voice_settings':{'stability':.55,'similarity_boost':.75,'style':0.0,'use_speaker_boost':True,'speed':1.0}},f'/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128'

def unpronounce(plain,spoken,mapped,pronunciations):
 """Map a spoken-only replacement (e.g. «экс-тюнд») back onto its written word, spreading its measured time evenly."""
 chars,starts,ends=[],[],[];i=j=0
 while i<len(plain):
  rule=next((r for r in pronunciations if plain[i:i+len(r['written'])].lower()==r['written'].lower() and spoken[j:j+len(r['spoken'])].lower()==r['spoken'].lower()),None)
  if rule:
   n,m=len(rule['written']),len(rule['spoken']);s0=mapped['character_start_times_seconds'][j];s1=max(mapped['character_end_times_seconds'][j:j+m])
   for k in range(n):chars.append(plain[i+k]);starts.append(s0+(s1-s0)*k/n);ends.append(s0+(s1-s0)*(k+1)/n)
   i+=n;j+=m;continue
  if j>=len(spoken) or plain[i]!=spoken[j]:raise ValueError('ElevenLabs: произношение не сопоставлено с исходными словами.')
  chars.append(plain[i]);starts.append(mapped['character_start_times_seconds'][j]);ends.append(mapped['character_end_times_seconds'][j]);i+=1;j+=1
 if j!=len(spoken):raise ValueError('ElevenLabs: произношение не сопоставлено с исходными словами.')
 return {'characters':chars,'character_start_times_seconds':starts,'character_end_times_seconds':ends}

def spoken_alignment(plain,annotated,alignment,language='ru',pronunciations=()):
 actual=''.join(alignment.get('characters',[]))
 if actual==plain:return words_from_characters(plain,alignment,language)
 if actual!=annotated:raise ValueError('ElevenLabs: метки не соответствуют чистому или аннотированному тексту. Дубль сохранён, синхронизация остановлена.')
 keep=[];cursor=0
 for tag in re.finditer(r'\[(?:curious|thoughtful|confident|warm)\] ',annotated):
  keep.extend(range(cursor,tag.start()));cursor=tag.end()
 keep.extend(range(cursor,len(annotated)))
 stripped=''.join(annotated[i] for i in keep)
 mapped={k:[alignment[k][i] for i in keep] for k in ('characters','character_start_times_seconds','character_end_times_seconds')}
 if stripped!=plain:
  if not pronunciations:raise ValueError('ElevenLabs: голосовые указания изменили произносимые слова.')
  mapped=unpronounce(plain,stripped,mapped,pronunciations)
 return words_from_characters(plain,mapped,language)

def synthesize(root,plan,ffmpeg,max_duration=None,paid_gate=None):
 voice=os.environ.get('ELEVENLABS_VOICE_ID','').strip()
 voice_plan=json.loads((root/'voice-plan.json').read_text()) if (root/'voice-plan.json').exists() else None
 if voice_plan and voice_plan.get('profile'):voice=voice_plan['profile']['voiceId']
 if not voice:raise ValueError('ElevenLabs: выберите русский голос и заполните ELEVENLABS_VOICE_ID в .env.local.')
 if not re.fullmatch(r'[A-Za-z0-9_-]{8,100}',voice):raise ValueError('ElevenLabs: некорректный voice ID.')
 texts=narration_texts(plan)
 text=' '.join(texts)
 if voice_plan and voice_plan['plainText']!=text:raise ValueError('ElevenLabs: голосовой план устарел; текст не совпадает.')
 model=voice_plan['profile']['model'] if voice_plan and voice_plan.get('profile') else os.environ.get('ELEVENLABS_MODEL_ID') or 'eleven_multilingual_v2'
 tts_input=voice_plan['ttsInput'] if voice_plan else text
 language=(voice_plan or {}).get('language') or 'ru'
 payload,endpoint=speech_payload(voice,tts_input,model,language)
 check_paid_gate(root,speech_key(voice,payload),len(tts_input),paid_gate)
 response,key=cached_speech(root,voice,payload,endpoint)
 words=spoken_alignment(text,tts_input,response.get('alignment') or {},language,(voice_plan or {}).get('pronunciations') or ())
 mp3=root/f'eleven-{key}.mp3';mp3.write_bytes(base64.b64decode(response['audio_base64'],validate=True))
 wav=root/'eleven-source.wav'
 subprocess.run([ffmpeg,'-y','-v','error','-i',str(mp3),'-ac','1','-ar','48000','-c:a','pcm_s16le',str(wav)],check=True)
 with wave.open(str(wav),'rb') as f:pcm=array.array('h',f.readframes(f.getnframes()))
 track=continuous_track(pcm,words,texts,plan,round((max_duration if max_duration is not None else sum(s['seconds'] for s in plan['scenes']))*30),preserve_pauses=bool(voice_plan and voice_plan.get('preservePauses')))
 (root/'storyboard.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2))
 (root/'narration-text.txt').write_text(text)
 metadata={'provider':'elevenlabs','voiceId':voice,'model':payload['model_id'],'speed':1,'cacheKey':key,'characterCount':len(tts_input),'alignment':'mapped to clean spoken characters','naturalTiming':True,'audioStrategy':'continuous master; chapters follow speech','voiceSettings':payload.get('voice_settings',{}),'deliveryApplied':model=='eleven_v4','preservePauses':bool(voice_plan and voice_plan.get('preservePauses')),'insertedInterSceneSilenceSeconds':0,'longPauseEdits':track['pauseEdits'],'sourceTrimStart':track['sourceTrimStart'],'sourceTrimEnd':track['sourceTrimEnd'],**({'language':language} if language!='ru' else {})}
 (root/'speech-provider.json').write_text(json.dumps(metadata,indent=2))
 return track

if __name__=='__main__':
 import sys
 if '--voices' in sys.argv:
  data=request_json('/v2/voices?page_size=100&include_total_count=false')
  print(json.dumps([{'id':v['voice_id'],'name':v['name'],'labels':v.get('labels',{}),'category':v.get('category'),'preview':v.get('preview_url')} for v in data.get('voices',[])],ensure_ascii=False,indent=2))
