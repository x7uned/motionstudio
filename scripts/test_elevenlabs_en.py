import unittest
from elevenlabs_speech import words_from_characters,speech_payload,spoken_alignment
def timed(text):return {'characters':list(text),'character_start_times_seconds':[i*.05 for i in range(len(text))],'character_end_times_seconds':[(i+1)*.05 for i in range(len(text))]}
class EnglishTests(unittest.TestCase):
 def test_english_contractions_and_currency_stay_one_caption_word(self):
  text="Don't pay $5 — it's xtuned's 2,000-byte trick."
  words=[w['text'] for w in words_from_characters(text,timed(text),'en')]
  self.assertEqual(words,["Don't",'pay','$5',"it's","xtuned's",'2,000-byte','trick.'])
 def test_domains_and_abbreviations_stay_whole(self):
  text="When you visit example.com, the .com server and the U.S. team answer."
  words=[w['text'] for w in words_from_characters(text,timed(text),'en')]
  self.assertEqual(words,['When','you','visit','example.com,','the','.com','server','and','the','U.S.','team','answer.'])
 def test_russian_tokenizer_is_unchanged_by_default(self):
  text="Don't пиши."
  self.assertEqual([w['text'] for w in words_from_characters(text,timed(text))],['Don','t','пиши.'])
 def test_v4_language_code_follows_the_project_and_v2_sends_none(self):
  self.assertEqual(speech_payload('abcdefgh12','Hi there.','eleven_v4','en')[0]['language_code'],'en')
  self.assertEqual(speech_payload('abcdefgh12','Привет.','eleven_v4')[0]['language_code'],'ru')
  self.assertNotIn('language_code',speech_payload('abcdefgh12','Hi there.','eleven_multilingual_v2','en')[0])
  with self.assertRaises(ValueError):speech_payload('abcdefgh12','Hallo.','eleven_v4','de')
 def test_tagged_english_alignment_maps_to_plain_words(self):
  plain="It's simple. Follow xtuned.";tagged="[curious] It's simple. Follow xtuned."
  words=spoken_alignment(plain,tagged,timed(tagged),'en')
  self.assertEqual([w['text'] for w in words],["It's",'simple.','Follow','xtuned.'])
if __name__=='__main__':unittest.main()
