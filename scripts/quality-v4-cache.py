"""Exercise selected v4 through the actual speech mixer with networking forbidden."""
import sys,pathlib,json,shutil,os,runpy,wave
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import elevenlabs_speech
workspace=pathlib.Path(__file__).resolve().parent.parent
root=workspace/'data/quality-validation/v4-continuous';root.mkdir(exist_ok=True)
audition=workspace/'data/voice-auditions/f2b47b3c-f8ed-4676-9cdc-57d44da392b6'
s=json.loads((audition/'audition.json').read_text(encoding='utf-8'));assert s['status']=='selected' and s['selected']==1
index=s['order'][s['selected']];v=s['variants'][index];assert v['model']=='eleven_v4'
for cache in (audition/f'variant-{index}').glob('eleven-*.json'):shutil.copyfile(cache,root/cache.name)
texts=[s['text'].split(' Но в нашем')[0], 'Но в нашем'+s['text'].split(' Но в нашем')[1].split(' Здесь важно')[0], 'Здесь важно'+s['text'].split(' Здесь важно')[1].split(' Когда ответ')[0], 'Когда ответ'+s['text'].split(' Когда ответ')[1]]
assert ' '.join(texts)==s['text']
plan={'title':'Cached v4 integration','summary':'Technical fixture, not an approved film','scenes':[{'id':f's{i+1}','narration':text,'seconds':7.5,'title':'Пример','subtitle':'Условное объяснение','items':['Пример'],'visual':'flow'} for i,text in enumerate(texts)]}
(root/'render.json').write_text(json.dumps({'plan':plan,'voice':True,'maxDuration':30,'ttsProvider':'elevenlabs'}),encoding='utf-8')
(root/'voice-plan.json').write_text(json.dumps({'version':2,'plainText':s['text'],'ttsInput':v['ttsInput'],'profile':{'voiceId':v['voiceId'],'model':v['model']},'preservePauses':True}),encoding='utf-8')
def no_network(*args,**kwargs):raise AssertionError('Unexpected provider request: cache-only test forbids network')
elevenlabs_speech.request_json=no_network
sys.argv=[str(workspace/'scripts/speech.py'),str(root),str(workspace/'bin/ffmpeg')]
runpy.run_path(str(workspace/'scripts/speech.py'),run_name='__main__')
meta=json.loads((root/'speech-provider.json').read_text(encoding='utf-8'));clock=json.loads((root/'alignment.json').read_text(encoding='utf-8'));assert meta['preservePauses'] and meta['longPauseEdits']==0 and meta['insertedInterSceneSilenceSeconds']==0
with wave.open(str(root/'narration.wav'),'rb') as f:assert f.getnchannels()==1 and f.getframerate()==48000;duration=f.getnframes()/f.getframerate()
result={'model':meta['model'],'oneContinuousPCMMaster':True,'duration':duration,'sceneCount':len(clock),'words':sum(len(a['words']) for a in clock),'speed':1,'pauseEdits':0,'newProviderRequests':0,'scope':'actual speech.py using the owner-selected successful audition response; networking forbidden'}
(root/'result.json').write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
