"""Audio-only remix: never imports or invokes a speech provider."""
import sys,json,pathlib,wave,array,math,subprocess,hashlib,random
rate=48000

def db(value):return round(20*math.log10(max(value,1e-12)),2)
def active_rms(samples):
 energies=[sum(v*v for v in samples[i:i+960])/max(1,len(samples[i:i+960])) for i in range(0,len(samples),960)]
 threshold=max(energies,default=0)*.0025
 active=[e for e in energies if e>max(threshold,1e-12)]
 return math.sqrt(sum(active)/len(active)) if active else 0

def effect_envelope(k,length,fade_in,fade_out,smooth=False):
 # Smoothstep reaches silence with zero slope, including when a cue meets the movie end.
 enter=max(0,min(1,k/max(1,rate*fade_in)))
 leave=max(0,min(1,(length-k-1)/max(1,rate*fade_out)))
 if smooth:enter=enter*enter*(3-2*enter);leave=leave*leave*(3-2*leave)
 return min(enter,leave)

def synthetic(cue):
 effect=cue.get('effect','');duration=.55 if effect=='soft-whoosh' else .42 if effect=='ui-highlight' else .15
 out=array.array('f');rng=random.Random(751);low=0
 for k in range(round(duration*rate)):
  t=k/rate;x=t/duration
  if effect=='soft-whoosh':
   noise=rng.uniform(-1,1);low+=.055*(noise-low);high=noise-low
   v=(high*.65+math.sin(2*math.pi*(280*t+1400*t*t))*.12)*math.sin(math.pi*x)**1.7
  elif effect=='ui-highlight':v=(math.sin(2*math.pi*880*t)+.55*math.sin(2*math.pi*1320*t))*math.exp(-t*12)
  else:v=math.exp(-t*35)*math.sin(2*math.pi*(650-t*700)*t)
  out.append(v)
 return out

def resize_audio(samples,length):
 if len(samples)==length:return samples
 if not samples:raise ValueError('Empty time-stretched effect')
 if length<=1:return array.array('f',[samples[0]])
 step=(len(samples)-1)/(length-1);out=array.array('f')
 for i in range(length):
  at=i*step;left=int(at);mix=at-left
  out.append(samples[left]*(1-mix)+samples[min(len(samples)-1,left+1)]*mix)
 return out

def timed_effect(samples,cue,ffmpeg):
 if len(samples)<2:raise ValueError('Empty sound effect')
 duration=cue.get('durationSeconds');mode=cue.get('durationMode');tempo=cue.get('playbackRate',1)
 if not isinstance(tempo,(int,float)) or not math.isfinite(tempo) or not .125<=tempo<=4:raise ValueError('Unsafe effect playback rate')
 if duration is not None and (not isinstance(duration,(int,float)) or not math.isfinite(duration) or not 0<duration<=180):raise ValueError('Unsafe effect duration')
 if mode is not None and (mode not in ['stretch','loop'] or duration is None):raise ValueError('Invalid effect duration mode')
 if mode=='stretch':tempo=len(samples)/rate/duration
 if mode=='stretch' or tempo!=1:
  remaining=tempo;filters=[]
  while remaining<.5:filters.append('atempo=0.5');remaining/=.5
  while remaining>2:filters.append('atempo=2');remaining/=2
  filters.append('atempo='+str(remaining))
  converted=subprocess.run([ffmpeg,'-v','error','-f','f32le','-ar',str(rate),'-ac','1','-i','pipe:0','-af',','.join(filters),'-f','f32le','pipe:1'],input=samples.tobytes(),capture_output=True,check=True,timeout=30)
  samples=array.array('f');samples.frombytes(converted.stdout)
 target=round(duration*rate) if duration is not None else len(samples)
 if mode=='stretch':samples=resize_audio(samples,target)
 elif mode=='loop':
  # Preserve the start once, then crossfade a steady interior segment, never replay the startup click.
  body=samples[round(len(samples)*.4):max(round(len(samples)*.4)+2,round(len(samples)*.95))]
  cross=min(round(.08*rate),len(body)//4);out=array.array('f',samples)
  while len(out)<target:
   count=min(cross,len(out))
   for j in range(count):
    mix=(j+1)/(count+1);mix=mix*mix*(3-2*mix);out[len(out)-count+j]=out[len(out)-count+j]*(1-mix)+body[j]*mix
   out.extend(body[count:])
  samples=out[:target]
 elif duration is not None:samples=samples[:target]
 return samples,tempo

def checked_automation(cue):
 keys=cue.get('automation',[]);last=-1
 for k in keys:
  at=k.get('at');value=k.get('value')
  if not isinstance(at,(int,float)) or not math.isfinite(at) or at<=last or at<0 or not isinstance(value,(int,float)) or not math.isfinite(value) or not 0<=value<=1:raise ValueError('Invalid sound automation')
  last=at
 return keys

def read_music_bed(root,sheet,total):
 # docs/background-music.md: rendered per project to the scene clock by the worker, never fetched or generated here.
 bed=sheet.get('musicBed')
 if bed is None:return None
 if sheet.get('version') not in (9,10) or sheet.get('backgroundGain')!=0:raise ValueError('Music bed needs cue sheet v9/v10 without the legacy tone')
 file=(root/str(bed.get('file',''))).resolve()
 if file.parent!=root.resolve() or file.suffix!='.f32':raise ValueError('Music bed outside the project')
 data=file.read_bytes()
 if hashlib.sha256(data).hexdigest()!=bed.get('sha256'):raise ValueError('Music bed hash changed')
 music=array.array('f');music.frombytes(data)
 if sys.byteorder!='little':music.byteswap()
 if len(music)%2 or abs(len(music)//2-total)>480:raise ValueError('Music bed length differs from the scene clock')
 if any(not math.isfinite(v) or abs(v)>.5 for v in music):raise ValueError('Unsafe music bed level')
 return music

def main():
 root=pathlib.Path(sys.argv[1]);ffmpeg=sys.argv[2]
 plan=json.loads((root/'storyboard.json').read_text(encoding='utf-8'));total=round(sum(s['seconds'] for s in plan['scenes'])*rate)
 sheet=json.loads((root/'sound-cues.json').read_text(encoding='utf-8'));voice=(root/'narration.wav').exists()
 background_gain=sheet.get('backgroundGain',.006)
 if not isinstance(background_gain,(int,float)) or not math.isfinite(background_gain) or not 0<=background_gain<=.02:raise ValueError('Unsafe background gain')
 music=read_music_bed(root,sheet,total)
 if voice:
  with wave.open(str(root/'narration.wav'),'rb') as f:
   if f.getframerate()!=rate or f.getnchannels()!=1 or f.getsampwidth()!=2:raise ValueError('Unexpected narration master format')
   source=array.array('h',f.readframes(f.getnframes()))
 else:source=array.array('h')
 mixed=array.array('f',(source[i]/32768 if i<len(source) else 0.0 for i in range(total)));stem=array.array('f',[0])*total
 report=[]
 for cue in sheet['cues']:
  start=round(cue['at']*rate)
  if start>=total:continue
  if cue.get('file'):
   sample=(root/cue['file']).resolve()
   if not sample.is_relative_to((root/'sfx').resolve()):raise ValueError('SFX outside project snapshot')
   if hashlib.sha256(sample.read_bytes()).hexdigest()!=cue['sha256']:raise ValueError('SFX snapshot hash changed')
   with wave.open(str(sample),'rb') as f:
    if f.getframerate()!=rate or f.getnchannels()!=1 or f.getsampwidth()!=2:raise ValueError('Unexpected effect format')
    pcm=array.array('h',f.readframes(min(f.getnframes(),3*rate)))
   effect=array.array('f',(v/32768 for v in pcm))
  else:effect=synthetic(cue)
  source_duration=len(effect)/rate;effect,playback_rate=timed_effect(effect,cue,ffmpeg);automation=checked_automation(cue)
  peak=max((abs(v) for v in effect),default=0)
  if not peak:raise ValueError('Silent sound effect')
  target=cue.get('targetRmsDbFS');before=active_rms(effect);gain=cue['gain']*(1 if voice else 2)
  if target is not None:
   if not -40<=target<=-18 or not -22<=cue.get('peakDbFS',-12)<=-6:raise ValueError('Unsafe SFX calibration')
   ceiling=10**(cue.get('peakDbFS',-12)/20);scale=10**(target/20)/max(before,1e-8)
   # Calibrate energy, not the single loudest click in a field recording.
   # Soft limiting restrains transient peaks without turning the motor/air back down.
   for _ in range(5):
    calibrated=array.array('f',(ceiling*math.tanh(v*scale/ceiling) for v in effect))
    actual=active_rms(calibrated)
    if actual<=1e-10 or abs(db(actual)-target)<.15:break
    scale*=min(4,10**(target/20)/actual)
  else:calibrated=array.array('f',(gain*v/peak for v in effect))
  level_scale=cue.get('levelScale',1)
  if not isinstance(level_scale,(int,float)) or not math.isfinite(level_scale) or not 0<=level_scale<=1:raise ValueError('Unsafe effect level scale')
  fade_in=cue.get('fadeInSeconds',.008);fade_out=cue.get('fadeOutSeconds',.06)
  if any(not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<v<=2 for v in (fade_in,fade_out)):raise ValueError('Unsafe effect fade duration')
  smooth_fade='fadeInSeconds' in cue or 'fadeOutSeconds' in cue
  audible_length=min(len(effect),total-start) if smooth_fade else len(effect)
  applied=array.array('f');automation_index=0
  for k,v in enumerate(calibrated[:audible_length]):
   fade=effect_envelope(k,audible_length,fade_in,fade_out,smooth_fade) if cue.get('file') or target is not None or smooth_fade else 1
   activity=1
   if automation:
    at=cue['at']+k/rate
    while automation_index+1<len(automation) and at>=automation[automation_index+1]['at']:automation_index+=1
    a=automation[automation_index];b=automation[min(automation_index+1,len(automation)-1)]
    mix=max(0,min(1,(at-a['at'])/max(1e-8,b['at']-a['at'])));mix=mix*mix*(3-2*mix)
    activity=a['value']+(b['value']-a['value'])*mix
   value=v*fade*level_scale*activity;applied.append(value)
   if 0<=start+k<total:stem[start+k]+=value
  report.append({'at':cue['at'],'kind':cue.get('kind','legacy'),'effect':cue.get('effect'),'file':cue.get('file'),'targetActiveRmsDbFS':target,'levelScale':level_scale,'fadeInSeconds':fade_in,'fadeOutSeconds':fade_out,'fadeCurve':'smoothstep' if smooth_fade else 'linear','actualActiveRmsDbFS':db(active_rms(applied)),'peakDbFS':db(max(abs(v) for v in applied)),'boostVsLegacyDb':round(db(active_rms(applied))-db(before/peak*gain),2),'duration':len(applied)/rate,'sourceDuration':source_duration,'playbackRate':playback_rate,'durationMode':cue.get('durationMode'),'automation':automation,'sync':cue.get('sync')})
 if music is None:
  for i in range(total):
   t=i/rate;fade=max(0,min(1,t/1.5,(total/rate-t)/1.5));mixed[i]+=stem[i]+(math.sin(2*math.pi*130.813*t)+.4*math.sin(2*math.pi*196*t))*background_gain*fade
 else:
  # Cue sheet v9: the stereo music bed replaces the legacy tone; voice and effects stay centred.
  for i in range(total):mixed[i]+=stem[i]
  out=array.array('f',[0])*(2*total);bed_frames=len(music)//2
  for i in range(total):
   v=mixed[i];out[2*i]=v+(music[2*i] if i<bed_frames else 0);out[2*i+1]=v+(music[2*i+1] if i<bed_frames else 0)
 premix=mixed if music is None else out
 if any(abs(v)>=1 for v in premix):raise ValueError('Premix clipping: reduce SFX levels')
 def write(file,samples,channels=1):
  pcm=array.array('h',(max(-32767,min(32767,round(v*32767))) for v in samples))
  with wave.open(str(root/file),'wb') as f:f.setnchannels(channels);f.setsampwidth(2);f.setframerate(rate);f.writeframes(pcm.tobytes())
 write('premix.wav',premix,1 if music is None else 2);write('sfx-only.wav',stem)
 mix_report={'version':2,'voiceGainDb':0,'voiceMasterUnmodified':True,'backgroundGain':background_gain,'soundPreferences':sheet.get('soundPreferences'),'masterTargetLUFS':-16,'masterTruePeakLimitDbTP':-1.5,'cues':report}
 if music is not None:
  left=music[0::2];mix_report['musicBed']={**sheet['musicBed'],'activeRmsDbFS':db(active_rms(left)),'peakDbFS':db(max(abs(v) for v in music))}
 (root/'sound-mix-report.json').write_text(json.dumps(mix_report,ensure_ascii=False,indent=2),encoding='utf-8')
 subprocess.run([ffmpeg,'-y','-v','error','-i',str(root/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-ac','2',str(root/'audio.wav')],check=True)
if __name__=='__main__':main()
