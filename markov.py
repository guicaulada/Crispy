from markovify import Text as T
from difflib import SequenceMatcher
import nltk
import re

class Text(T):
  def make_sentence_from(self, message, max_chars, min_chars=0, **kwargs):
    tries = kwargs.get('tries', 100)
    state_size = kwargs.get('state_size', 2)-1
    similarity = kwargs.get('similarity', 0.5)
    filter = kwargs.get('filter', [])
    tokens = nltk.word_tokenize(message)
    tags = nltk.pos_tag(tokens)
    keywords = [w for w, t in tags if (t[0] == 'N' or t[0] == 'R' or t[0] == 'V')]
    for _ in range(tries):
      sentence = self.make_short_sentence(max_chars, min_chars,**kwargs)
      if sentence and sentence not in filter:
        s_tokens = nltk.word_tokenize(sentence)
        s_tags = nltk.pos_tag(s_tokens)
        s_keywords = [kw for kw, t in s_tags if (kw in keywords)]
        if SequenceMatcher(None, keywords, s_keywords).ratio() > similarity:
          return sentence

class NewlineText(Text):
  def sentence_split(self, text):
    return re.split(r"\s*\n\s*", text)