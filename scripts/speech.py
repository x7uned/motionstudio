"""Russian speech providers, measured fit and deterministic procedural bed."""
import sys,json,asyncio,pathlib,subprocess,wave,array,math,hashlib,re,os
import edge_tts
from elevenlabs_speech import synthesize

async def main():
 root=pathlib.Path(sys.argv[1]);ffmpeg=sys.argv[2]
 data=json.loads((root/'render.json').read_text());plan=data['plan'];voice=data['voice'];rate=48000
 provider=data.get('ttsProvider') or os.environ.get('STUDIO_TTS_PROVIDER') or 'edge'
 if provider not in ('edge','elevenlabs'):raise ValueError('Неизвестный провайдер озвучки.')
 segments=synthesize(root,plan,ffmpeg,data.get('maxDuration'),data.get('paidGate')) if voice and provider=='elevenlabs' else None
 total=round(sum(s['seconds'] for s in plan['scenes'])*rate)
 mixed=array.array('f',(0.0 for _ in range(total)));continuous=isinstance(segments,dict) and segments.get('mode')=='continuous';alignment=segments['alignment'] if continuous else [];start=0
 if continuous:
  pos=round(segments['lead']*rate)
  for j,v in enumerate(segments['samples']):
   if pos+j<total:mixed[pos+j]+=v/32768*.8
 for i,s in enumerate(plan['scenes']):
  if continuous:
   pass
  elif segments is not None:
   seg=segments[i];samples=seg['samples'];pos=round((start+.32)*rate)
   for j,v in enumerate(samples):
    if pos+j<total:mixed[pos+j]+=v/32768*.8
   words=[{'text':w['text'],'start':start+.32+w['start']-seg['sourceStart'],'end':start+.32+w['end']-seg['sourceStart']} for w in seg['words']]
   alignment.append({'scene':i+1,'start':start+.32,'end':(pos+len(samples))/rate,'sceneEnd':start+s['seconds'],'speed':1.0,'text':s['narration'],'words':words})
  elif voice and s['narration'].strip():
   text=s['narration'];key=hashlib.sha256(('Svetlana+8%WordBoundary-v2'+text).encode()).hexdigest()[:12];mp3=root/f'{i}-{key}.mp3';wav=root/f'{i}-raw.wav'
   if not mp3.exists() or mp3.stat().st_size==0:
    for attempt in range(3):
     try:
      await edge_tts.Communicate(text,'ru-RU-SvetlanaNeural',rate='+8%',boundary='WordBoundary',receive_timeout=35,connect_timeout=15).save(str(mp3),str(root/f'{i}-words.jsonl'));break
     except Exception:
      if attempt==2:raise
      await asyncio.sleep(2)
   subprocess.run([ffmpeg,'-y','-v','error','-i',str(mp3),'-ac','1','-ar',str(rate),'-c:a','pcm_s16le',str(wav)],check=True)
   with wave.open(str(wav),'rb') as f:samples=array.array('h',f.readframes(f.getnframes()))
   active=[j for j in range(0,len(samples),96) if max(abs(x) for x in samples[j:j+96])>210]
   if not active:raise ValueError('Не удалось получить речь')
   lo=max(0,active[0]-int(.035*rate));hi=min(len(samples),active[-1]+int(.09*rate));samples=samples[lo:hi]
   available=s['seconds']-.65;speed=max(1.0,len(samples)/rate/available)
   if speed>1.20:raise ValueError(f'Сцена {i+1}: озвучка не помещается. Сократите текст в редакторе и повторите рендер.')
   trim=root/f'{i}-trim.wav';fit=root/f'{i}-fit.wav'
   with wave.open(str(trim),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(samples.tobytes())
   subprocess.run([ffmpeg,'-y','-v','error','-i',str(trim),'-af',f'atempo={speed:.7f},afade=t=in:d=0.012,afade=t=out:st={max(0,len(samples)/rate/speed-.035):.4f}:d=0.035','-c:a','pcm_s16le',str(fit)],check=True)
   with wave.open(str(fit),'rb') as f:samples=array.array('h',f.readframes(f.getnframes()))
   pos=round((start+.32)*rate)
   for j,v in enumerate(samples):
    if pos+j<total:mixed[pos+j]+=v/32768*.8
   words=[]
   tokens=re.findall(r"[A-Za-zА-Яа-яЁё0-9]+(?:[-‑][A-Za-zА-Яа-яЁё0-9]+)*[.,!?;:]*",text);token_index=0
   for line in (root/f'{i}-words.jsonl').read_text().splitlines():
    w=json.loads(line)
    if w.get('type')=='WordBoundary':
     ws=start+.32+(w['offset']/1e7-lo/rate)/speed
     we=ws+w['duration']/1e7/speed
     display=w['text']
     for ti in range(token_index,len(tokens)):
      if tokens[ti].rstrip('.,!?;:').casefold()==display.casefold():
       display=tokens[ti];token_index=ti+1;break
     words.append({'text':display,'start':max(start+.32,ws),'end':min((pos+len(samples))/rate,we)})
   alignment.append({'scene':i+1,'start':start+.32,'end':(pos+len(samples))/rate,'sceneEnd':start+s['seconds'],'speed':speed,'text':text,'words':words})
  start+=s['seconds']
 if segments is None:
  (root/'speech-provider.json').write_text(json.dumps({'provider':'edge' if voice else 'none','voice':'ru-RU-SvetlanaNeural' if voice else None},indent=2))
 # Verify the actual word clock, including chapter boundaries, before mixing the bed.
 if segments is not None:
  all_words=[w for a in alignment for w in a['words']]
  gaps=[{'after':l['text'],'before':r['text'],'seconds':round(r['start']-l['end'],4)} for l,r in zip(all_words,all_words[1:])]
  chapter_gaps=[round(b['words'][0]['start']-a['words'][-1]['end'],4) for a,b in zip(alignment,alignment[1:])]
  rhythm={'maxWordGap':max((g['seconds'] for g in gaps),default=0),'chapterGaps':chapter_gaps,'duration':total/rate,'speed':1,'limit':1.5,'passed':all(g['seconds']<=1.5 for g in gaps),'mode':'continuous' if continuous else 'segmented','insertedInterSceneSilenceSeconds':0 if continuous else None}
  (root/'speech-rhythm.json').write_text(json.dumps(rhythm,ensure_ascii=False,indent=2))
  preserving=(root/'voice-plan.json').exists()
  rhythm['naturalPausesPreserved']=preserving
  rhythm['warnings']=[g for g in gaps if g['seconds']>1.5]
  (root/'speech-rhythm.json').write_text(json.dumps(rhythm,ensure_ascii=False,indent=2))
  if not rhythm['passed'] and not preserving:raise ValueError('ElevenLabs: пауза между словами превышает 1,5 с. Монтаж остановлен для проверки.')
  voice_pcm=array.array('h',(max(-32767,min(32767,round(v*32767))) for v in mixed))
  with wave.open(str(root/'narration.wav'),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(voice_pcm.tobytes())
 if voice and segments is None:
  voice_pcm=array.array('h',(max(-32767,min(32767,round(v*32767))) for v in mixed))
  with wave.open(str(root/'narration.wav'),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(voice_pcm.tobytes())
 # Quiet tonal bed and a short soft cue on each scene boundary, below speech.
 for j in range(total):
  t=j/rate;fade=min(1,t/1.5,(total/rate-t)/1.5);mixed[j]+=(math.sin(2*math.pi*130.813*t)+.4*math.sin(2*math.pi*196*t))*0.008*max(0,fade)
 start=0
 for s in plan['scenes']:
  pos=round(start*rate)
  for k in range(int(.16*rate)):
   if pos+k<total:mixed[pos+k]+=(.012 if voice else .045)*math.exp(-k/rate*35)*math.sin(2*math.pi*(650-k/rate*700)*k/rate)
  start+=s['seconds']
 pcm=array.array('h',(max(-32767,min(32767,round(v*32767))) for v in mixed))
 with wave.open(str(root/'premix.wav'),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
 subprocess.run([ffmpeg,'-y','-v','error','-i',str(root/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-ac','2',str(root/'audio.wav')],check=True)
 (root/'alignment.json').write_text(json.dumps(alignment,ensure_ascii=False,indent=2))
if __name__=='__main__':
 try:asyncio.run(main())
 except ValueError as error:
  print(str(error),file=sys.stderr);sys.exit(2)
