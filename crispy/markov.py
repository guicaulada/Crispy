'''
Crispy - An annoying bot.
Copyright (C) 2018  Guilherme Caulada (Sighmir)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
'''

from markovify import Text as T
from difflib import SequenceMatcher
import re
import os
import json
os.environ['FOR_DISABLE_CONSOLE_CTRL_HANDLER'] = 'T'

print('\nUpdating NLTK data...\n')
import nltk
nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
print('\nUpdate complete!')

class Text(T):
  def __init__(self, input_text, **kwargs):
    self.options = kwargs
    self.input_text = input_text
    self.training = False
    self.file = kwargs.get('file')
    if kwargs.get('training') != None:
      del kwargs['training']
    if kwargs.get('file') != None:
      del kwargs['file']
    if kwargs.get('type') != None:
      del kwargs['type']
    super(Text, self).__init__(input_text, **kwargs)

  def __setitem__(self, name, value):
    return setattr(self, name, value)

  def __getitem__(self, name):
    return getattr(self, name)

  def make_sentence_from(self, message, max_chars, min_chars=0, **kwargs):
    tries = kwargs.get('tries', 10)
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
  def __init__(self, input_text, **kwargs):
    super(NewlineText, self).__init__(input_text, **kwargs)
    self.training = kwargs.get('training')

  def sentence_split(self, text):
    return re.split(r"\s*\n\s*", text)

  def add_text(self, text, **kwargs):
    self.input_text+= ('\n'+text)
    self = NewlineText(self.input_text, **self.options)

  def get_text(self):
    return self.input_text

  def has_text(self, text, **kwargs):
    return text in self.input_text

  def del_text(self, text):
    self.input_text = '\n'.join([message for message in self.input_text.split('\n') if text not in message])
    self = NewlineText(self.input_text, **self.options)

class JsonText():
  def __init__(self, json_str, **kwargs):
    self.options = kwargs
    self.user_data = json.loads(json_str)
    self.mixed_text = []
    self.user_model = {}
    self.training = kwargs.get('training')
    self.file = kwargs.get('file')
    for user in self.user_data:
      self.user_model[user] = NewlineText('\n'.join(self.user_data), **self.options)
      for line in self.user_data[user]:
        self.mixed_text.append(line)
    self.mixed_model = NewlineText('\n'.join(self.mixed_text), **self.options)

  def __setitem__(self, name, value):
    return setattr(self, name, value)

  def __getitem__(self, name):
    return getattr(self, name)

  def make_short_sentence(self, max_chars, min_chars=0, **kwargs):
    sentence = None
    username = kwargs.get('username')
    if username:
      if self.user_model.get(username):
        sentence = self.user_model[username].make_short_sentence(max_chars, **kwargs)
    if not sentence:
      sentence = self.mixed_model.make_short_sentence(max_chars, **kwargs)
    return sentence

  def make_sentence_from(self, message, max_chars, min_chars=0, **kwargs):
    sentence = None
    username = kwargs.get('username')
    if username:
      if self.user_model.get(username):
        if self.has_text(message, username=username):
          sentence = self.user_model[username].make_sentence_from(message, max_chars, **kwargs)
    if not sentence:
      sentence = self.mixed_model.make_sentence_from(message, max_chars, **kwargs)
    return sentence

  def add_text(self, text, **kwargs):
    username = kwargs.get('username')
    self.mixed_text.append(text)
    self.mixed_model = NewlineText('\n'.join(self.mixed_text), **self.options)
    if username:
      if not self.user_data.get(username):
        self.user_data[username] = []
      self.user_data[username].append(text)
      self.user_model[username] = NewlineText('\n'.join(self.user_data), **self.options)

  def get_text(self):
    return json.dumps(self.user_data, sort_keys=True, indent=2)

  def has_text(self, text, **kwargs):
    username = kwargs.get('username')
    if username and self.user_data.get(username):
      return text in '\n'.join(self.user_data[username])
    else:
      return text in '\n'.join(self.mixed_text)

  def del_text(self, text):
    self.mixed_text = [message for message in self.mixed_text.split('\n') if text not in message]
    self.mixed_model = NewlineText('\n'.join(self.mixed_text), **self.options)
    for username in self.user_data:
      self.user_data[username] = [message for message in self.user_data[username].split('\n') if text not in message]
      self.user_model[username] = NewlineText('\n'.join(self.user_data), **self.options)

