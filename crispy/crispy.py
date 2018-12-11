from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver import Chrome, ChromeOptions
from selenium.webdriver.common.by import By
from difflib import SequenceMatcher
from crispy.markov import Text, NewlineText
import time
import atexit

class Crispy():
  def __init__(self, **kwargs):
    self.logged_in = False
    self.start_time = self.current_time()
    self.last_wipe = self.start_time
    self.last_save = self.start_time
    self.training = {}
    self.training_text = {}
    self.filter = kwargs.get('filter', [])
    self.tries = kwargs.get('tries', 10)
    self.max_cache = kwargs.get('max_cache', 100)
    self.max_len = kwargs.get('max_len', 60)
    self.min_len = kwargs.get('min_len', 10)
    self.refresh_interval = kwargs.get('refresh_interval', 10)
    self.sleep_interval = kwargs.get('sleep_interval', 0.25)
    self.wipe_interval = kwargs.get('wipe_interval', 10)
    self.save_interval = kwargs.get('save_interval', 10)
    self.sensitivity = kwargs.get('sensitivity', 0.5)
    self.similarity = kwargs.get('similarity', 0.5)
    self.state_size = kwargs.get('state_size', 2)
    self.targets = kwargs.get('targets', [])
    self.triggers = kwargs.get('triggers', [])
    self.banned = kwargs.get('banned', [])
    self.ban_message = kwargs.get('ban_message', ':)')
    self.triggered = kwargs.get('triggered', 0.0)
    self.bot = kwargs.get('bot', 'Crispybot')
    self.room = kwargs.get('room', self.bot)
    self.admins = kwargs.get('admins', [])
    self.username = kwargs.get('username', None)
    self.password = kwargs.get('password', None)
    self.cache = []
    self.sent = []
    self.vocabulary = None
    self.vocabularies = {}
    options=ChromeOptions()
    options.add_argument('headless')
    options.add_argument('log-level=3')
    self.browser = Chrome(chrome_options=options)
    self.url = 'https://jumpin.chat/'+str(self.room)
    self.login_url = 'https://jumpin.chat/login'
    self.commands = {}
    atexit.register(self.shutdown)

  def sleep(self, ratio=1):
    time.sleep(self.sleep_interval*ratio)

  def is_action(self, message):
    if not message:
      return False
    return message[0] == '*'

  def filter_message(self, message):
    for f in self.filter:
      if f.lower() in message.lower():
        return False
    return True

  def is_trained(self,train,message):
    if not message:
      return False
    return message in self.training_text[train]

  def is_command(self,message):
    if not message:
      return False
    return message[0] == '!'

  def is_trigger(self, message):
    if not message:
      return False
    for t in self.triggers:
      for m in message.split():
        if SequenceMatcher(None, t.lower(), m.lower()).ratio() > min(max(1-self.triggered,0),1):
          return True
    return False

  def is_banned(self, message):
    if not message:
      return False
    for t in self.banned:
      for m in message.split():
        if SequenceMatcher(None, t.lower(), m.lower()).ratio() > min(max(1-self.triggered, 0), 1):
          return True
    return False

  def train(self, message):
    for train in self.training:
        if not self.is_trained(train,message) and len(message) > self.min_len:
          self.training[train](message)

  def add_command(self, command, func):
    self.commands[command] = func

  def del_command(self, command):
    del self.commands[command]

  def try_command(self,message):
    for command in self.commands:
      if message.split()[0][1:] == command:
        self.commands[command](crispy=self,args=message.split()[1:])

  def is_bot(self,username):
    if not username:
      return False
    return username.lower() == self.bot.lower()

  def is_target(self,username):
    if not username:
      return False
    for t in self.targets:
      if SequenceMatcher(None, t.lower(), username.lower()).ratio() > min(max(1-self.sensitivity,0),1) and not self.is_bot(username):
        return True
    return False

  def add_target(self,target):
    if isinstance(target, str):
      if target not in self.targets:
        self.targets.append(target)
    elif isinstance(target,list):
      for t in target:
        if t not in self.targets:
          self.targets.append(t)

  def del_target(self,target):
    if isinstance(target, str):
      if target in self.targets:
        self.targets.remove(target)
    elif isinstance(target,list):
      for t in target:
        if t in self.targets:
          self.targets.remove(t)

  def is_admin(self,username):
    if not username:
      return False
    return username.lower() in self.admins

  def has_cache(self):
    return len(self.cache) > 0

  def is_message_present(self):
    try:
      self.browser.find_element(By.CSS_SELECTOR, '.chat__MessageHandle')
    except NoSuchElementException:
      return False
    else:
      return True

  def send_message(self, message):
    self.sent.append(message)
    self.browser.find_element(By.CSS_SELECTOR, '.chat__Input').send_keys(message)
    self.browser.find_element(By.CSS_SELECTOR, '.chat__InputSubmit').click()

  def send_cached_message(self):
    if self.has_cache():
      self.send_message(self.cache.pop(0))

  def capture_message(self):
    if ('chat__MessageHandle' in self.browser.find_elements(By.CSS_SELECTOR, '.chat__Message')[-1].get_attribute('innerHTML')):
      username = self.browser.find_elements(By.CSS_SELECTOR, '.chat__MessageHandle')[-1].text
    else:
      username = None
    message = self.browser.find_elements(By.CSS_SELECTOR, '.chat__MessageBody')[-1].text
    return username, message

  def wait_for_element(self, by, element, t=10):
    return WebDriverWait(self.browser, t).until(EC.presence_of_element_located((by, element)))

  def has_user_account(self):
    return self.username and self.password

  def login(self):
    if self.has_user_account():
      self.browser.get(self.login_url)
      self.wait_for_element(By.ID, 'username').send_keys(self.username)
      self.sleep()
      self.browser.find_element(By.ID, 'password').send_keys(self.password)
      self.sleep()
      self.browser.find_element(By.XPATH, '//button[text()="Log In"]').click()
      print('\nLogging in to account '+self.username)
      self.sleep()
    self.connect()
    self.logged_in = True

  def connect(self):
    print('\nConnecting to '+self.url)
    self.last_refresh = self.current_time()
    self.browser.get(self.url)
    self.wait_for_element(By.CSS_SELECTOR, '.form__Input-inline').send_keys(self.bot)
    self.sleep()
    self.browser.find_element(By.XPATH, '//button[text()="Go"]').click()
    self.sleep()
    self.browser.find_element(By.CSS_SELECTOR, '.fa-gear').click()
    self.sleep()
    self.browser.find_element(By.ID, 'enableyoutubevideos').click()
    self.sleep()
    self.browser.find_element(By.CSS_SELECTOR, '.fa-gear').click()
    self.sleep()
    self.browser.find_element(By.ID, 'enabledarktheme').click()
    self.sleep()
    self.browser.find_element(By.CSS_SELECTOR, '.chat__HeaderOption-streamVolume').click()
    self.sleep()
    self.browser.find_element(By.CSS_SELECTOR, '.chat__HeaderOption-sounds').click()
    self.sleep()
    self.browser.find_element(By.XPATH, '//span[text()="Close cams"]').click()
    print('\nLogin complete! Bot is ready to receive messages!\n')

  def ban(self, username):
    if username:
      user = self.browser.find_element(By.XPATH, '//div[contains(@class, "userList__UserHandle") and text()="'+username+'"]')
      while (not user.is_displayed()):
        self.browser.execute_script("var mt = Number(document.getElementsByClassName('scrollarea-content')[1].style.marginTop.replace('px', '')); document.getElementsByClassName('scrollarea-content')[1].style.marginTop = (mt-10)+'px';")
      user.click()
      self.sleep()
      try:
        self.browser.find_element(By.XPATH, '//button[text()="Ban user"]').click()
      except NoSuchElementException:
        pass
      self.sleep()
      self.send_message(self.ban_message)


  def set_vocabulary(self,name):
    if self.vocabularies.get(name):
      self.vocabulary = self.vocabularies[name]

  def add_vocabulary(self, name, file, **kwargs):
    with open(file, 'r', encoding='utf-8') as f:
      text = f.read()
      if (kwargs.get('newline_text')):
        self.vocabularies[name] = NewlineText(text, state_size=self.state_size)
        if (kwargs.get('training')):
          def training_function(message):
            old_vocabulary = self.vocabularies[name]
            self.training_text[file] = self.training_text[file] + '\n' + message
            self.vocabularies[name] = NewlineText(self.training_text[file], state_size=self.state_size)
            if (self.vocabulary==old_vocabulary):
              self.set_vocabulary(name)
          self.training[file] = training_function
          self.training_text[file] = text
      else:
        self.vocabularies[name] = Text(text, state_size=self.state_size)

    def vocabulary_command(**kwargs):
      self.send_message('Now using {} vocabulary!'.format(name))
      self.vocabulary = self.vocabularies[name]
      self.cache = []
    self.add_command(name, vocabulary_command)

  def generate_message(self):
    return self.vocabulary.make_short_sentence(self.max_len, tries=self.tries)

  def generate_message_from(self,message):
    return self.vocabulary.make_sentence_from(message, max(self.max_len, len(message)), self.min_len, state_size=self.state_size, tries=self.tries, similarity=self.similarity, filter=self.sent)

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
        with open(train, '+w', encoding='utf-8') as f:
          f.write(self.training_text[train])

  def force_save(self):
    self.save(force=True)

  def capture_action(self, message):
    return message.split()[1], ' '.join(message.split()[1:])

  def answer_to(self, message):
    text = self.generate_message_from(message)
    if text:
      self.send_message(text)
    else:
      self.send_cached_message()

  def wipe_sent_messages(self, **kwargs):
    if (self.current_time()-self.last_wipe > self.wipe_interval*60000) or kwargs.get('force'):
      self.last_wipe = self.current_time()
      self.sent = []

  def force_wipe(self):
    self.wipe_sent_messages(force=True)

  def spam(self, text, amount):
    for i in range(amount):
      self.send_message(text)

  def forget(self, text):
    for train in self.training:
      self.training_text[train] = '\n'.join([message for message in self.training_text[train].split('\n') if text not in message])

  def check_for_command(self, username, message):
    if self.is_command(message) and self.is_admin(username):
      self.try_command(message)
      return True
    return False

  def check_for_triggered(self, username, message):
    if self.is_target(username) or self.is_trigger(message):
      self.answer_to(message)
      return True
    return False

  def check_for_banned(self, username, message):
    if self.is_banned(message):
      self.ban(username)
      return True
    return False

  def refresh(self, **kwargs):
    if (self.current_time()-self.last_refresh > self.refresh_interval*60000) or kwargs.get('force'):
      self.connect()


  def check_for_routines(self):
    self.generate_cached_message()
    self.wipe_sent_messages()
    self.save()
    self.refresh()

  def wait_for_login(self):
    if not self.logged_in:
      self.login()
    while not self.logged_in:
      self.sleep()

  def scan(self):
    try:
      self.wait_for_login()
      while self.logged_in:
        if (self.is_message_present()):
          username, message = self.capture_message()
          if not self.is_bot(username):
            is_command = self.check_for_command(username, message)
            if not is_command:
              if self.filter_message(message):
                if username:
                  self.check_for_triggered(username, message)
                elif self.is_action(message):
                  username, message = self.capture_action(message)
                  self.check_for_triggered(username, message)
                if (self.has_user_account):
                  self.check_for_banned(username, message)
                self.train(message)
        self.check_for_routines()
        self.sleep()
    except KeyboardInterrupt:
      pass

  def shutdown(self):
    print('Saving and shutting down!\n')
    self.browser.quit()
    self.force_save()
