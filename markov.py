from markovify import Text as T
from difflib import SequenceMatcher
import nltk
import re

class Text(T):
  def make_short_sentence_with(self, message, max_chars, min_chars=0, **kwargs):
    tries = kwargs.get('tries', 50)
    similarity = kwargs.get('similarity', 0.5)
    tokens = nltk.word_tokenize(message)
    keywords = [w for w, t in nltk.pos_tag(tokens) if (t[0] == 'N' or t[0] == 'R' or t[0] == 'V')]
    for _ in range(tries):
      sentence = self.make_short_sentence(max_chars, min_chars,**kwargs)
      used_kw = [w for w in sentence.split() if w in keywords]
      if len(used_kw)/len(keywords) > similarity:
        return sentence

class NewlineText(Text):
  def sentence_split(self, text):
    return re.split(r"\s*\n\s*", text)