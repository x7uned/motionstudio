"""Parallel engine (2026-10-21): ElevenLabs 429 retries never pay twice. Run: python -m unittest test_elevenlabs_retry (from scripts/)."""
import io,json,pathlib,tempfile,unittest,urllib.error
from unittest.mock import patch
from elevenlabs_speech import cached_speech,check_paid_gate,speech_key

def too_many(status='too_many_concurrent_requests',after=None):
 headers={'Retry-After':str(after)} if after is not None else {}
 return urllib.error.HTTPError('https://api.elevenlabs.io/v1/x',429,'Too Many Requests',headers,io.BytesIO(json.dumps({'detail':{'status':status,'message':'busy'}}).encode()))
def ok(body):return io.BytesIO(json.dumps(body).encode())
PAYLOAD={'text':'Привет.','model_id':'eleven_multilingual_v2'}
ENDPOINT='/v1/text-to-speech/voice-1234/with-timestamps'

class RetryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.tmp.name);self.key=speech_key('voice-1234',PAYLOAD)
  self.env=patch.dict('os.environ',{'ELEVENLABS_API_KEY':'test-key-not-real'});self.env.start()
 def tearDown(self):self.env.stop();self.tmp.cleanup()

 def test_concurrency_429_is_retried_then_cached_once(self):
  pending=self.root/f'eleven-{self.key}.pending.json';seen=[]
  def attempt(req,timeout=0):
   seen.append(pending.exists())
   if len(seen)<3:raise too_many()
   return ok({'audio_base64':'AA==','alignment':{}})
  waits=[]
  def wait(seconds):waits.append((seconds,pending.exists()))
  with patch('urllib.request.urlopen',side_effect=attempt) as http,patch('elevenlabs_speech.time.sleep',side_effect=wait):
   response,key=cached_speech(self.root,'voice-1234',PAYLOAD,ENDPOINT)
   self.assertEqual(http.call_count,3)
   self.assertEqual(response['audio_base64'],'AA==');self.assertEqual(key,self.key)
   # The unknown-result marker exists while a request is in flight and never while waiting after a rejection.
   self.assertEqual(seen,[True,True,True]);self.assertEqual([w[1] for w in waits],[False,False]);self.assertEqual([w[0] for w in waits],[2,4])
   self.assertFalse(pending.exists());self.assertTrue((self.root/f'eleven-{self.key}.json').exists())
   # Same take again: served from the cache, no new paid request.
   cached_speech(self.root,'voice-1234',PAYLOAD,ENDPOINT)
   self.assertEqual(http.call_count,3)
  self.assertEqual(sorted(p.name for p in self.root.iterdir()),[f'eleven-{self.key}.json'])

 def test_retry_after_header_is_respected(self):
  calls=[]
  def attempt(req,timeout=0):
   calls.append(1)
   if len(calls)==1:raise too_many('system_busy',after=7)
   return ok({'audio_base64':'AA=='})
  with patch('urllib.request.urlopen',side_effect=attempt),patch('elevenlabs_speech.time.sleep') as wait:
   cached_speech(self.root,'voice-1234',PAYLOAD,ENDPOINT)
  wait.assert_called_once_with(7.0)

 def test_quota_429_is_not_retried(self):
  with patch('urllib.request.urlopen',side_effect=too_many('quota_exceeded')) as http,patch('elevenlabs_speech.time.sleep') as wait:
   with self.assertRaisesRegex(ValueError,'HTTP 429'):cached_speech(self.root,'voice-1234',PAYLOAD,ENDPOINT)
  self.assertEqual(http.call_count,1);wait.assert_not_called()
  self.assertEqual(list(self.root.iterdir()),[])

 def test_retries_are_bounded(self):
  with patch('urllib.request.urlopen',side_effect=lambda req,timeout=0:(_ for _ in ()).throw(too_many())) as http,patch('elevenlabs_speech.time.sleep'):
   with self.assertRaisesRegex(ValueError,'HTTP 429'):cached_speech(self.root,'voice-1234',PAYLOAD,ENDPOINT)
  self.assertEqual(http.call_count,6)
  self.assertFalse((self.root/f'eleven-{self.key}.pending.json').exists())

 def test_paid_gate_still_stops_a_new_take_after_a_retried_success(self):
  def attempt(req,timeout=0,state={'n':0}):
   state['n']+=1
   if state['n']==1:raise too_many()
   return ok({'audio_base64':'AA=='})
  with patch('urllib.request.urlopen',side_effect=attempt),patch('elevenlabs_speech.time.sleep'):
   check_paid_gate(self.root,self.key,7,{'confirmed':[]})
   cached_speech(self.root,'voice-1234',PAYLOAD,ENDPOINT)
  check_paid_gate(self.root,self.key,7,{'confirmed':[]})
  other=speech_key('voice-1234',{**PAYLOAD,'text':'Другой текст.'})
  with self.assertRaisesRegex(ValueError,f'PAID_GATE tts {other} 13'):check_paid_gate(self.root,other,13,{'confirmed':[]})
  check_paid_gate(self.root,other,13,{'confirmed':[other]})

if __name__=='__main__':unittest.main()
