from markovify import Text as T
import nltk
import itertools
import re

class Text(T):
  def make_short_sentence_with(self, message, max_chars, min_chars=0, strict=False, **kwargs):
    tries = kwargs.get('tries', 10)
    tokens = nltk.word_tokenize(message)
    for w, t in nltk.pos_tag(tokens):
      if (t[0] == 'N' or t[0] == 'V' or t[0] == 'R' or t[0] == 'J'):
        for _ in range(tries):
          sentence = self.make_sentence_with_start(w,strict,**kwargs)
          if sentence and len(sentence) <= max_chars and len(sentence) >= min_chars:
            return sentence

class NewlineText(Text):
  def sentence_split(self, text):
    return re.split(r"\s*\n\s*", text)