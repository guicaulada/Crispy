from splinter import Browser
import markovify
import time
import atexit

class Crispy():
  def __init__(self, **kwargs):
    if not 'Bot' in kwargs or not 'Room' in kwargs or not 'Target' in kwargs or not 'Admins' in kwargs:
      print('Missing required bot parameter please provide bot, room, taget and admins!')
      exit()
    self.logged_in = False
    self.last_save = self.current_time()
    self.training = {}
    self.training_text = {}
    self.max_cache = 100
    self.max_len = 60  # For sent messages.
    self.min_len = 10 # For trained messages.
    self.save_interval = 10 # Save interval is in minutes.
    if (kwargs.get('MaxCache')):
      self.max_cache = kwargs['MaxCache']
    if (kwargs.get('MaxLen')):
      self.max_len = kwargs['MaxLen']
    if (kwargs.get('MinLen')):
      self.min_len = kwargs['MinLen']
    if (kwargs.get('SaveInterval')):
      self.save_interval = kwargs['SaveInterval']
    self.cache = []
    self.browser = Browser('chrome', headless=True)
    self.vocabulary = None
    self.vocabularies = {}
    self.bot = kwargs['Bot']
    self.room = kwargs['Room']
    self.target = kwargs['Target']
    self.admins = kwargs['Admins']
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
    return username.lower() == self.bot.lower()

  def is_target(self,username):
    return self.target.lower() in username.lower() and not self.is_bot(username)

  def is_admin(self,username):
    return username.lower() in self.admins

  def has_cache(self):
    return len(self.cache) > 0

  def send_message(self, message):
    self.browser.find_by_css('.chat__Input').fill(message)
    self.browser.find_by_css('.chat__InputSubmit').click()

  def send_cached_message(self):
    self.send_message(self.cache.pop(0))

  def capture_message(self):
    user = self.browser.find_by_css('.chat__MessageHandle').last.text
    message = self.browser.find_by_css('.chat__MessageBody').last.text
    return user, message

  def is_message_present(self):
    return self.browser.is_element_present_by_css('.chat__MessageHandle')

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
      if (kwargs.get('NewlineText')):
        self.vocabularies[name] = markovify.NewlineText(text)
        if (kwargs.get('Training')):
          filtr = []
          if (kwargs.get('Filter')):
            filtr = kwargs['Filter']
          def training_function(message):
            if self.filter_message(message, filtr):
              old_vocabulary = self.vocabularies[name]
              self.training_text[file] = self.training_text[file] + '\n' + message
              self.vocabularies[name] = markovify.NewlineText(self.training_text[file])
              if (self.vocabulary==old_vocabulary):
                self.set_vocabulary(name)
              time.sleep(0.25)
          self.training[file] = training_function
          self.training_text[file] = text
      else:
        self.vocabularies[name] = markovify.Text(text)

    def vocabulary_command():
      self.send_message('Now using {} vocabulary!'.format(name))
      self.vocabulary = self.vocabularies[name]
      self.cache = []
      time.sleep(0.25)
    self.add_command(name, vocabulary_command)

  def generate_message(self):
    if (len(self.cache) < self.max_cache) and self.vocabulary:
      text = self.vocabulary.make_short_sentence(self.max_len)
      if text:
        self.cache.append(text)

  def current_time(self):
    return int(round(time.time() * 1000))

  def save(self, **kwargs):
    if (self.current_time()-self.last_save > self.save_interval*60000) or kwargs.get('Force'):
      self.last_save = self.current_time()
      self.cache = []
      for train in self.training:
        with open(train, '+w') as f:
          f.write(self.training_text[train])
      time.sleep(0.25)

  def force_save(self):
    self.save(Force=True)

  def scan(self):
    if not self.logged_in:
      self.login()
    while not self.logged_in:
      time.sleep(0.25)
    while self.logged_in:
      if (self.is_message_present()):
        username, message = self.capture_message()
        if self.is_action(message):
          username = message.split(' ')[1]
        if self.is_target(username) and self.has_cache():
          self.send_cached_message()
        elif self.is_admin(username):
          if self.is_command(message):
            self.try_command(message)
        self.train(username,message)
      self.generate_message()
      self.save()

  def shutdown(self):
    self.force_save()
    self.browser.quit()
