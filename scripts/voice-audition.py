"""One paid request per variant, journaled before network I/O and cached on success."""
import sys,json,pathlib,base64,subprocess
from elevenlabs_speech import speech_payload,cached_speech
root=pathlib.Path(sys.argv[1]);ffmpeg=sys.argv[2];variant=json.loads((root/'variant.json').read_text(encoding='utf-8'))
payload,endpoint=speech_payload(variant['voiceId'],variant['ttsInput'],variant['model'])
result,key=cached_speech(root,variant['voiceId'],payload,endpoint)
(root/'source.mp3').write_bytes(base64.b64decode(result['audio_base64'],validate=True))
subprocess.run([ffmpeg,'-y','-v','error','-i',str(root/'source.mp3'),'-af','loudnorm=I=-16:TP=-1.5:LRA=9','-ar','48000','-ac','1',str(root/'sample.wav')],check=True)
(root/'result.json').write_text(json.dumps({'cacheKey':key,'model':variant['model'],'characters':len(variant['ttsInput']),'successfulRequests':1}),encoding='utf-8')
