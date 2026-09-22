import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('alignment',Path(__file__).parents[1]/'scripts/align_editorial.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class AlignmentTests(unittest.TestCase):
 def test_adjacent_definition_answer(self):
  stream=[('quick',1,1.3),('stop',1.4,1.8),('pit',3,3.2),('stop',3.3,3.5)]
  self.assertEqual(m.align_vocabulary(stream,'pit stop','quick stop',0,10)['start'],1)
 def test_does_not_cross_unrelated_words(self):
  stream=[('quick',1,1.3),('stop',1.4,1.8),('other',2,2.5),('pit',3,3.2),('stop',3.3,3.5)]
  self.assertIsNone(m.align_vocabulary(stream,'pit stop','quick stop',0,10))
 def test_missing_review(self):
  self.assertIsNone(m.align_vocabulary([], 'word','meaning',None,10))
 def test_invalid_word_times(self):
  self.assertEqual(m.word_stream([{'words':[{'word':'word','start':2,'end':1}]}],10),[])
if __name__=='__main__':unittest.main()
