import unittest,math,array,tempfile,pathlib,json
from unittest.mock import patch
from elevenlabs_speech import words_from_characters,allocate_frames,request_json,retime_scene_events,compact_segment,continuous_track,narration_texts,TOKEN,spoken_alignment,cached_speech,check_paid_gate,speech_key
class TimingTests(unittest.TestCase):
 def test_original_characters_preserve_russian_punctuation(self):
  text='Привет, мир!';a={'characters':list(text),'character_start_times_seconds':[i*.05 for i in range(len(text))],'character_end_times_seconds':[(i+1)*.05 for i in range(len(text))]}
  words=words_from_characters(text,a)
  self.assertEqual([w['text'] for w in words],['Привет,','мир!']);self.assertAlmostEqual(words[1]['start'],.4)
  a['characters'][0]='X'
  with self.assertRaises(ValueError):words_from_characters(text,a)
 def test_compact_timing_does_not_pad_short_speech_to_a_minute(self):
  durations=[3.8,4.8,6.4,5.4,6.8,6.4,5.5,8.5]
  frames=allocate_frames(durations,[5.5,6.3,7.5,6.7,8.2,7.8,7,11],1800)
  self.assertLess(sum(frames),1800)
  self.assertEqual(sum(frames)%30,0)
  for f,d in zip(frames,durations):
   self.assertGreaterEqual(f/30,d+.7)
   self.assertLessEqual(f/30-d,1.35)
   self.assertLessEqual(f,420)
 def test_long_internal_pause_cut_preserves_words_and_samples(self):
  samples=array.array('h',[100]*100+[0]*400+[200]*100)
  words=[{'text':'Один.','start':10.,'end':11.},{'text':'Два.','start':15.,'end':16.}]
  out,retimed=compact_segment(samples,words,10,rate=100,max_pause=1.1)
  self.assertEqual(len(out),310)
  self.assertEqual(out[:100],samples[:100]);self.assertEqual(out[-100:],samples[-100:])
  self.assertAlmostEqual(retimed[1]['start']-retimed[0]['end'],1.1)
  self.assertEqual(retimed[1]['text'],'Два.')
 def test_short_natural_pause_is_untouched(self):
  samples=array.array('h',[100]*300)
  words=[{'text':'А','start':0.,'end':1.},{'text':'Б','start':1.5,'end':2.}]
  out,retimed=compact_segment(samples,words,0,rate=100)
  self.assertEqual(out,samples);self.assertEqual(retimed,words)
 def test_too_short_chapter_rejected_instead_of_inserting_silence(self):
  with self.assertRaises(ValueError):allocate_frames([.5,5],[3,7],1800)
 def test_does_not_silently_accelerate_overlong_speech(self):
  with self.assertRaises(ValueError):allocate_frames([9]*8,[7.5]*8,1800)
 def test_director_events_retime_without_losing_word_cues(self):
  plan={'scenes':[{'seconds':10,'beats':[{'at':5,'cue':'кэш'},{'at':9.9,'cue':''}]}]}
  retime_scene_events(plan,[90])
  self.assertEqual(plan['scenes'][0]['seconds'],3)
  self.assertEqual(plan['scenes'][0]['beats'][0]['at'],1.5)
  self.assertEqual(plan['scenes'][0]['beats'][0]['cue'],'кэш')
  self.assertLessEqual(plan['scenes'][0]['beats'][1]['at'],2.65)
 def test_narration_is_one_paragraph_without_chapter_breaks(self):
  plan={'scenes':[{'narration':'  Первый\nблок. '},{'narration':' Второй блок.'}]}
  self.assertEqual(' '.join(narration_texts(plan)),'Первый блок. Второй блок.')
 def test_continuous_master_keeps_samples_and_natural_chapter_gap(self):
  texts=['Первый блок.','Второй блок.'];text=' '.join(texts)
  marks=[(0,1.4),(1.5,3),(3.3,4.9),(5,6.7)]
  words=[dict(text=m.group(),start=a,end=b,charStart=m.start(),charEnd=m.end()) for m,(a,b) in zip(TOKEN.finditer(text),marks)]
  samples=array.array('h',[(i%2000)-1000 for i in range(710)])
  plan={'scenes':[{'narration':t,'seconds':5} for t in texts]}
  track=continuous_track(samples,words,texts,plan,300,rate=100)
  self.assertEqual(track['samples'],samples[:692])
  self.assertEqual(track['insertedInterSceneSilenceSeconds'],0)
  self.assertAlmostEqual(track['alignment'][1]['words'][0]['start']-track['alignment'][0]['words'][-1]['end'],.3)
  self.assertEqual(track['pauseEdits'],0)
  self.assertEqual(sum(round(s['seconds']*30) for s in plan['scenes']),240)
  self.assertAlmostEqual(track['alignment'][1]['words'][0]['start'],3.48)
 def test_continuous_master_rejects_over_budget_without_speedup(self):
  texts=['Первый блок.','Второй блок.'];text=' '.join(texts)
  marks=[(0,1.4),(1.5,3),(3.3,4.9),(5,6.7)]
  words=[dict(text=m.group(),start=a,end=b,charStart=m.start(),charEnd=m.end()) for m,(a,b) in zip(TOKEN.finditer(text),marks)]
  with self.assertRaisesRegex(ValueError,'не помещается'):
   continuous_track(array.array('h',[1]*710),words,texts,{'scenes':[{'narration':t,'seconds':5} for t in texts]},210,rate=100)
 def test_long_form_allows_longer_chapters_without_weakening_shorts(self):
  texts=['Первый блок.','Второй блок.'];text=' '.join(texts)
  marks=[(0,10),(10.1,20),(20.3,30),(30.1,40)]
  words=[dict(text=m.group(),start=a,end=b,charStart=m.start(),charEnd=m.end()) for m,(a,b) in zip(TOKEN.finditer(text),marks)]
  pcm=array.array('h',[100]*4100)
  plan=lambda:{'scenes':[{'narration':t,'seconds':20} for t in texts]}
  track=continuous_track(pcm,words,texts,plan(),90*30,rate=100)
  self.assertEqual(track['insertedInterSceneSilenceSeconds'],0)
  self.assertEqual(track['samples'],pcm[:4022])
  with self.assertRaisesRegex(ValueError,'14 с'):
   continuous_track(pcm,words,texts,plan(),60*30,rate=100)
 def test_tagged_timestamps_map_back_to_clean_words(self):
  plain='Привет, мир!';tagged='[curious] Привет, мир!'
  a={'characters':list(tagged),'character_start_times_seconds':[i*.05 for i in range(len(tagged))],'character_end_times_seconds':[(i+1)*.05 for i in range(len(tagged))]}
  words=spoken_alignment(plain,tagged,a)
  self.assertEqual([w['text'] for w in words],['Привет,','мир!'])
  self.assertEqual(words[0]['charStart'],0)
  self.assertAlmostEqual(words[0]['start'],.5)
 def test_preserve_pauses_keeps_long_gap_in_one_master(self):
  texts=['Первый блок.','Второй блок.'];text=' '.join(texts)
  marks=[(0,1),(1.1,3),(5,6),(6.1,8)]
  words=[dict(text=m.group(),start=a,end=b,charStart=m.start(),charEnd=m.end()) for m,(a,b) in zip(TOKEN.finditer(text),marks)]
  pcm=array.array('h',[100]*850)
  track=continuous_track(pcm,words,texts,{'scenes':[{'narration':t,'seconds':5} for t in texts]},450,rate=100,preserve_pauses=True)
  self.assertEqual(track['pauseEdits'],0)
  self.assertAlmostEqual(track['alignment'][1]['words'][0]['start']-track['alignment'][0]['words'][-1]['end'],2)
 def test_spoken_brand_maps_back_to_written_caption_word(self):
  plain='Подписывайся на xtuned.';tagged='[warm] Подписывайся на экс-тюнд.'
  a={'characters':list(tagged),'character_start_times_seconds':[i*.05 for i in range(len(tagged))],'character_end_times_seconds':[(i+1)*.05 for i in range(len(tagged))]}
  with self.assertRaises(ValueError):spoken_alignment(plain,tagged,a)
  words=spoken_alignment(plain,tagged,a,'ru',[{'written':'xtuned','spoken':'экс-тюнд'}])
  self.assertEqual([w['text'] for w in words],['Подписывайся','на','xtuned.'])
  start=tagged.index('экс');self.assertAlmostEqual(words[2]['start'],start*.05)
  self.assertAlmostEqual(words[2]['end'],(len(tagged))*.05)
  self.assertGreater(words[2]['start'],words[1]['end']-.001)
 def test_number_and_repeated_word_positions_survive_tag_mapping(self):
  plain='Ответ 304, ответ 304.';tagged='[curious] Ответ 304, [confident] ответ 304.'
  a={'characters':list(tagged),'character_start_times_seconds':[i*.05 for i in range(len(tagged))],'character_end_times_seconds':[(i+1)*.05 for i in range(len(tagged))]}
  words=spoken_alignment(plain,tagged,a)
  self.assertEqual([w['text'] for w in words],['Ответ','304,','ответ','304.'])
  self.assertEqual(words[2]['charStart'],plain.index('ответ'))
  self.assertGreater(words[3]['start'],words[1]['start'])
 def test_decimal_sign_and_percent_remain_in_caption_tokens(self):
  text='Изменение -2,5%, затем +5 и 304.'
  a={'characters':list(text),'character_start_times_seconds':[i*.05 for i in range(len(text))],'character_end_times_seconds':[(i+1)*.05 for i in range(len(text))]}
  words=spoken_alignment(text,text,a)
  self.assertEqual([w['text'] for w in words],['Изменение','-2,5%,','затем','+5','и','304.'])
  self.assertEqual(words[1]['charStart'],text.index('-'))
 def test_uncertain_paid_request_is_not_automatically_repeated(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);payload={'model_id':'eleven_multilingual_v2','text':'Текст'}
   with patch('elevenlabs_speech.request_json',side_effect=ValueError('network unknown')) as api:
    with self.assertRaises(ValueError):cached_speech(root,'voice12345',payload,'/test')
    with self.assertRaisesRegex(ValueError,'неизвестный'):cached_speech(root,'voice12345',payload,'/test')
    self.assertEqual(api.call_count,1)
 def test_agent_paid_gate_allows_first_take_and_stops_a_second_new_take(self):
  import tempfile
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);gate={'confirmed':[]}
   check_paid_gate(root,'a'*20,100,gate)
   check_paid_gate(root,'a'*20,100,None)
   (root/('eleven-'+'a'*20+'.json')).write_text('{}')
   check_paid_gate(root,'a'*20,100,gate)
   with self.assertRaisesRegex(ValueError,'PAID_GATE tts '+'b'*20+' 100'):check_paid_gate(root,'b'*20,100,gate)
   check_paid_gate(root,'b'*20,100,{'confirmed':['b'*20]})
   check_paid_gate(root,'b'*20,100,None)
 def test_successful_response_is_reused_without_a_new_paid_request(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);payload={'model_id':'eleven_multilingual_v2','text':'Текст'}
   with patch('elevenlabs_speech.request_json',return_value={'audio_base64':'AA=='}) as api:
    first=cached_speech(root,'voice12345',payload,'/test');second=cached_speech(root,'voice12345',payload,'/test')
    self.assertEqual(first,second);self.assertEqual(api.call_count,1)
 def test_missing_key_never_sends_a_request(self):
  with patch.dict('os.environ',{'ELEVENLABS_API_KEY':''}),patch('urllib.request.urlopen') as http:
   with self.assertRaisesRegex(ValueError,'ELEVENLABS_API_KEY'):request_json('/unused',{})
   http.assert_not_called()
if __name__=='__main__':unittest.main()
