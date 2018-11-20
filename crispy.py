from splinter import Browser
from difflib import SequenceMatcher
from markov import Text, NewlineText
import time
import atexit

class Crispy():
  def __init__(self, **kwargs):
    if not 'bot' in kwargs or not 'room' in kwargs or not 'target' in kwargs or not 'admins' in kwargs:
      print('Missing required bot parameter please provide bot, room, taget and admins!')
      exit()
    self.logged_in = False
    self.last_wipe = self.current_time()
    self.last_save = self.current_time()
    self.training = {}
    self.training_text = {}
    self.tries = kwargs.get('tries', 10)
    self.max_cache = kwargs.get('max_cache', 100)
    self.max_len = kwargs.get('max_len', 60)
    self.min_len = kwargs.get('min_len', 10)
    self.wipe_interval = kwargs.get('wipe_interval', 10)
    self.save_interval = kwargs.get('save_interval', 10)
    self.sensitivity = kwargs.get('sensitivity', 0.5)
    self.similarity = kwargs.get('similarity', 0.5)
    self.state_size = kwargs.get('state_size', 2)
    self.cache = []
    self.sent = []
    self.browser = Browser('chrome', headless=True)
    self.vocabulary = None
    self.vocabularies = {}
    self.bot = kwargs['bot']
    self.room = kwargs['room']
    self.target = kwargs['target']
    self.admins = kwargs['admins']
    self.url = 'https://jumpin.chat/'+str(self.room)
    self.commands = {}
    atexit.register(self.shutdown)

  def is_action(self, message):
    return message[0] == '*'

  def filter_message(self, message, filtr):
    for f in filtr:
      if f.lower() in message.lower():
        return False
    return True

  def is_trained(self,train,message):
    return message in self.training_text[train]

  def is_command(self,message):
    return message[0] == '!'

  def train(self, username, message):
    for train in self.training:
        if not self.is_bot(username) and not self.is_trained(train,message) and len(message) > self.min_len:
          self.training[train](message)

  def add_command(self, command, func):
    self.commands[command] = func

  def del_command(self, command):
    del self.commands[command]

  def try_command(self,message):
    for command in self.commands:
      if message[1:].lower() == command.lower():
        self.commands[command]()

  def is_bot(self,username):
    if not username:
      return False
    return username.lower() == self.bot.lower()

  def is_target(self,username):
    if not username:
      return False
    return SequenceMatcher(None, self.target.lower(), username.lower()).ratio() > min(max(1-self.sensitivity,0),1) and not self.is_bot(username)

  def is_admin(self,username):
    if not username:
      return False
    return username.lower() in self.admins

  def has_cache(self):
    return len(self.cache) > 0

  def send_message(self, message):
    self.sent.append(message)
    self.browser.find_by_css('.chat__Input').fill(message)
    self.browser.find_by_css('.chat__InputSubmit').click()

  def send_cached_message(self):
    if self.has_cache():
      self.send_message(self.cache.pop(0))

  def capture_message(self):
    if ('chat__MessageHandle' in self.browser.find_by_css('.chat__Message').last.html):
      user = self.browser.find_by_css('.chat__MessageHandle').last.text
    else:
      user = None
    message = self.browser.find_by_css('.chat__MessageBody').last.text
    return user, message

  def is_message_present(self):
    return self.browser.is_element_present_by_css('.chat__Message')

  def login(self):
    print('Logging in to '+self.url)
    self.browser.visit(self.url)
    time.sleep(0.25)
    self.browser.find_by_css('.form__Input-inline').fill(self.bot)
    time.sleep(0.25)
    self.browser.find_by_text('Go').click()
    time.sleep(0.25)
    self.browser.find_by_css('.fa-gear').click()
    time.sleep(0.25)
    self.browser.find_by_id('enableyoutubevideos').click()
    time.sleep(0.25)
    self.browser.find_by_css('.fa-gear').click()
    time.sleep(0.25)
    self.browser.find_by_id('enabledarktheme').click()
    time.sleep(0.25)
    self.browser.find_by_css('.chat__HeaderOption-streamVolume').click()
    time.sleep(0.25)
    self.browser.find_by_css('.chat__HeaderOption-sounds').click()
    time.sleep(0.25)
    self.browser.find_by_text('Close cams').click()
    print('Login complete! Bot is ready to receive messages!')
    self.logged_in = True

  def set_vocabulary(self,name):
    if self.vocabularies.get(name):
      self.vocabulary = self.vocabularies[name]

  def add_vocabulary(self, name, file, **kwargs):
    with open(file) as f:
      text = f.read()
      if (kwargs.get('newline_text')):
        self.vocabularies[name] = NewlineText(text, state_size=self.state_size)
        if (kwargs.get('training')):
          filtr = kwargs.get('filter', [])
          def training_function(message):
            if self.filter_message(message, filtr):
              old_vocabulary = self.vocabularies[name]
              self.training_text[file] = self.training_text[file] + '\n' + message
              self.vocabularies[name] = NewlineText(self.training_text[file], state_size=self.state_size)
              if (self.vocabulary==old_vocabulary):
                self.set_vocabulary(name)
          self.training[file] = training_function
          self.training_text[file] = text
      else:
        self.vocabularies[name] = Text(text, state_size=self.state_size)

    def vocabulary_command():
      self.send_message('Now using {} vocabulary!'.format(name))
      self.vocabulary = self.vocabularies[name]
      self.cache = []
    self.add_command(name, vocabulary_command)

  def generate_message(self):
    return self.vocabulary.make_short_sentence(self.max_len, tries=self.tries)

  def generate_message_from(self,message):
    return self.vocabulary.make_sentence_from(message, max(self.max_len, len(message)), 0, state_size=self.state_size, tries=self.tries, similarity=self.similarity, blacklist=self.sent)

  def generate_cached_message(self):
    if (len(self.cache) < self.max_cache) and self.vocabulary:
      text = self.generate_message()
      if text:
        self.cache.append(text)

  def generate_cached_message_from(self,message):
    if (len(self.cache) < self.max_cache) and self.vocabulary:
      text = self.generate_message_from(message)
      if text:
        self.cache.append(text)

  def current_time(self):
    return int(round(time.time() * 1000))

  def save(self, **kwargs):
    if (self.current_time()-self.last_save > self.save_interval*60000) or kwargs.get('force'):
      self.last_save = self.current_time()
      self.cache = []
      for train in self.training:
        with open(train, '+w') as f:
          f.write(self.training_text[train])

  def force_save(self):
    self.save(force=True)

  def capture_action(self, message):
    return message.split()[1], ' '.join(message.split()[2:])

  def answer_to(self, message):
    text = self.generate_message_from(message)
    if text:
      self.send_message(text)
    else:
      self.send_cached_message()

  def wipe_sent_messages(self, **kwargs):
    if (self.current_time()-self.last_wipe > self.wipe_interval*60000) or kwargs.get('force'):
      self.sent = []

  def force_wipe(self):
    self.wipe_sent_messages(force=True)

  def scan(self):
    if not self.logged_in:
      self.login()
    while not self.logged_in:
      time.sleep(0.25)
    while self.logged_in:
      if (self.is_message_present()):
        username, message = self.capture_message()
        if self.is_target(username):
          self.answer_to(message)
        elif self.is_admin(username):
          if self.is_command(message):
            self.try_command(message)
        elif self.is_action(message):
          username, message = self.capture_action(message)
          if self.is_target(username):
            self.answer_to(message)
        self.train(username,message)
      self.generate_cached_message()
      self.wipe_sent_messages()
      self.save()
      time.sleep(0.25)

  def shutdown(self):
    print('Saving and shutting down!')
    self.force_save()
    self.browser.quit()
