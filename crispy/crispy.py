from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, WebDriverException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver import Chrome, ChromeOptions
from selenium.webdriver.common.by import By
from difflib import SequenceMatcher
from crispy.markov import Text, NewlineText, JsonText
import traceback
import time
import json
import atexit

class Crispy():
  def __init__(self, **kwargs):
    # Init
    self.logged_in = False
    self.start_time = self.current_time()
    self.last_wipe = self.start_time
    self.last_save = self.start_time
    self.cache = []
    self.sent = []
    self.commands = {}
    self.vocabularies = {}
    self.vocabulary = None
    options = ChromeOptions()
    options.add_argument('headless')
    options.add_argument('log-level=3')
    self.browser = Chrome(chrome_options=options)
    self.username = kwargs.get('username', None)
    self.password = kwargs.get('password', None)
    atexit.register(self.shutdown)

    # Config
    self.config = kwargs
    self.bot = kwargs.get('bot', 'Crispybot')
    self.room = kwargs.get('room', self.bot)
    self.url = kwargs.get('url', 'https://jumpin.chat/'+self.room)
    self.login_url = kwargs.get('login_url', 'https://jumpin.chat/login')
    self.max_tries = kwargs.get('max_tries', 10)
    self.max_len = kwargs.get('max_len', 60)
    self.min_len = kwargs.get('min_len', 10)
    self.max_cache = kwargs.get('max_cache', 100)
    self.refresh_interval = kwargs.get('refresh_interval', 10)
    self.sleep_interval = kwargs.get('sleep_interval', 0.1)
    self.wipe_interval = kwargs.get('wipe_interval', 10)
    self.save_interval = kwargs.get('save_interval', 10)
    self.similarity_score = kwargs.get('similarity_score', 0.5)
    self.triggers = kwargs.get('triggers', [])
    self.closed_users = kwargs.get('closed_users', [])
    self.banned_users = kwargs.get('banned_users', [])
    self.banned_words = kwargs.get('banned_words', [])
    self.targets = kwargs.get('targets', [])
    self.name_change = kwargs.get('name_change', ' changed their name to ')
    self.filter = kwargs.get('filter', [])+self.banned_users+self.banned_words+[self.bot]+[self.name_change]
    self.deny_message = kwargs.get('deny_message', '/shrug ')
    self.ban_command = kwargs.get('ban_message', '/ban ')
    self.ban_message = kwargs.get('ban_message', '/shrug ')
    self.unban_command = kwargs.get('unban_message', '/unban ')
    self.unban_message = kwargs.get('unban_message', '/shrug ')
    self.close_command = kwargs.get('close_message', '/close ')
    self.close_message = kwargs.get('close_message', '/shrug ')
    self.trigger_sensitivity = kwargs.get('trigger_sensitivity', 0.0)
    self.target_sensitivity = kwargs.get('target_sensitivity', 0.5)
    self.admins = kwargs.get('admins', [])
    self.prefix = kwargs.get('prefix', '!')

  def __setitem__(self, name, value):
    return setattr(self, name, value)

  def __getitem__(self, name):
    return getattr(self, name)

  def update_config(self, conf):
    self.config.update(conf)
    for key in conf:
      setattr(self, key, conf[key])
    with open('config.json', '+w', encoding='utf-8') as f:
      f.write(json.dumps(self.config, sort_keys=True, indent=2))

  def sleep(self, ratio=1):
    time.sleep(self.sleep_interval*ratio)

  def is_action(self, username, message):
    if not message:
      return False
    return (not username and message[0] == '*')

  def filter_message(self, username, message):
    if not username:
      username = ''
    for f in self.filter:
      if f.lower() in message.lower() or f.lower() in username.lower():
        return False
    return True

  def is_trained(self,name,username,message):
    if not message:
      return False
    return self.vocabularies[name].has_text(message, username=username)

  def is_command(self,message):
    if message:
      if message[0] == self.prefix:
        return self.commands.get(message.split()[0][1:]) != None
    return False

  def is_trigger(self, message):
    if not message:
      return False
    for t in self.triggers:
      for m in message.split():
        if SequenceMatcher(None, t.lower(), m.lower()).ratio() > min(max(1-self.trigger_sensitivity,0),1):
          return True
    return False

  def is_banned(self, username, message):
    if not message or not username:
      return False
    for t in self.banned_users:
      if t.lower() == username.lower():
        return True
    for t in self.banned_words:
      if t.lower() in message.lower():
        return True
    return False

  def set_command(self, command, func):
    self.commands[command] = func

  def del_command(self, command):
    if self.is_command(self.prefix+command):
      del self.commands[command]

  def try_command(self, username, message):
    for command in self.commands:
      if message.split()[0][1:] == command:
        self.commands[command](crispy=self,args=message.split()[1:],username=username)

  def is_bot(self,username):
    if not username:
      return False
    return username.lower() == self.bot.lower()

  def is_target(self,username):
    if not username:
      return False
    for t in self.targets:
      if SequenceMatcher(None, t.lower(), username.lower()).ratio() > min(max(1-self.target_sensitivity,0),1) and not self.is_bot(username):
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
    self.update_config({'targets': self.targets})

  def del_target(self,target):
    if isinstance(target, str):
      if target in self.targets:
        self.targets.remove(target)
    elif isinstance(target,list):
      for t in target:
        if t in self.targets:
          self.targets.remove(t)
    self.update_config({'targets': self.targets})

  def add_admin(self, admin):
    if isinstance(admin, str):
      if admin not in self.admins:
        self.admins.append(admin)
    elif isinstance(admin, list):
      for t in admin:
        if t not in self.admins:
          self.admins.append(t)
    self.update_config({'admins': self.admins})

  def del_admin(self, admin):
    if isinstance(admin, str):
      if admin in self.admins:
        self.admins.remove(admin)
    elif isinstance(admin, list):
      for t in admin:
        if t in self.admins:
          self.admins.remove(t)
    self.update_config({'admins': self.admins})

  def add_trigger(self, trigger):
    if isinstance(trigger, str):
      if trigger not in self.triggers:
        self.triggers.append(trigger)
    elif isinstance(trigger, list):
      for t in trigger:
        if t not in self.triggers:
          self.triggers.append(t)
    self.update_config({'triggers': self.triggers})

  def del_trigger(self, trigger):
    if isinstance(trigger, str):
      if trigger in self.triggers:
        self.triggers.remove(trigger)
    elif isinstance(trigger, list):
      for t in trigger:
        if t in self.triggers:
          self.triggers.remove(t)
    self.update_config({'triggers': self.triggers})

  def add_filter(self, message):
    not_filter = self.banned_users+self.banned_words+[self.bot]+[self.name_change]
    if message not in self.filter:
      self.filter.append(message)
    self.update_config({'filter':  [f for f in self.filter if f not in not_filter]})

  def del_filter(self, message):
    not_filter = self.banned_users+self.banned_words+[self.bot]+[self.name_change]
    if message in self.filter:
      self.filter.remove(message)
    self.update_config({'filter': [f for f in self.filter if f not in not_filter]})

  def is_admin(self,username):
    if username:
      self.click_username(username)
      profile = None
      try:
        profile = self.browser.find_element(By.XPATH, '//button[text()="Profile"]')
      except NoSuchElementException:
        print('\nTried to check user {username} for admin but profile not found! Is {username} a guest ?'.format(username=username))
      if profile.is_displayed():
        account = self.browser.find_element(By.CSS_SELECTOR, '.dropdown__Option-header').text
        return account in self.admins
      self.send_message(self.deny_message)
    return False

  def has_cache(self):
    return len(self.cache) > 0

  def is_message_present(self):
    try:
      self.browser.find_element(By.CSS_SELECTOR, '.chat__Message')
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
      self.sleep(5)
      self.browser.find_element(By.ID, 'password').send_keys(self.password)
      self.sleep(5)
      self.browser.find_element(By.XPATH, '//button[text()="Log In"]').click()
      print('\nLogging in to account '+self.username)
      self.sleep(5)
    self.connect()

  def connect(self):
    print('\nConnecting to '+self.url)
    self.last_refresh = self.current_time()
    self.browser.get(self.url)
    nickname = self.wait_for_element(By.CSS_SELECTOR, '.form__Input-inline')
    nickname.clear()
    self.sleep(5)
    nickname.send_keys(self.bot)
    self.sleep(5)
    self.browser.find_element(By.XPATH, '//button[text()="Go"]').click()
    self.sleep(5)
    try:
      self.browser.find_element(By.XPATH, '//span[text()="Close cams"]').click()
    except NoSuchElementException:
      print('\nNo open cameras found! Unable to close cams, will try again next refresh.')
    if not self.logged_in:
      self.sleep(5)
      self.browser.find_element(By.CSS_SELECTOR, '.fa-gear').click()
      self.sleep(5)
      self.browser.find_element(By.ID, 'enableyoutubevideos').click()
      self.sleep(5)
      self.browser.find_element(By.CSS_SELECTOR, '.fa-gear').click()
      self.sleep(5)
      self.browser.find_element(By.ID, 'enabledarktheme').click()
      self.sleep(5)
      self.browser.find_element(By.CSS_SELECTOR, '.chat__HeaderOption-streamVolume').click()
      self.sleep(5)
      self.browser.find_element(By.CSS_SELECTOR, '.chat__HeaderOption-sounds').click()
      self.logged_in = True
    print('\nLogin complete! Bot is ready to receive messages!')

  def reset_scrollarea(self):
    self.browser.execute_script("document.getElementsByClassName('scrollarea-content')[1].style.marginTop = '0px';")

  def click_username(self, username):
    self.reset_scrollarea()
    user = self.browser.find_element(By.XPATH, '//div[contains(@class, "userList__UserHandle") and text()="'+username+'"]')
    while (not user.is_displayed()):
      self.browser.execute_script("var mt = Number(document.getElementsByClassName('scrollarea-content')[1].style.marginTop.replace('px', '')); document.getElementsByClassName('scrollarea-content')[1].style.marginTop = (mt-10)+'px';")
    try:
      user.click()
      self.sleep()
    except WebDriverException:
      print('\nTried to click {} but username is not displayed!'.format(username))

  def ban(self, username):
    if username:
      self.send_message(self.ban_command+username)
      self.sleep()
      self.send_message(self.ban_message)

  def unban(self, username):
    if username:
      self.send_message(self.unban_command+username)
      self.sleep()
      self.send_message(self.unban_message)

  def close(self, username):
    if username:
      self.send_message(self.close_command+username)
      self.sleep()
      self.send_message(self.close_message)

  def has_vocabulary(self, name):
    return self.vocabularies.get(name, False)

  def set_vocabulary(self,name):
    if self.has_vocabulary(name):
      self.vocabulary = self.vocabularies[name]
      self.cache = []

  def add_vocabulary(self, name, **kwargs):
    file = kwargs.get('file')
    type = kwargs.get('type')
    if file:
      with open(file, 'r', encoding='utf-8') as f:
        text = f.read()
        if type == 'line':
          self.vocabularies[name] = NewlineText(text, **kwargs)
        elif type == 'json':
          self.vocabularies[name] = JsonText(text, **kwargs)
        elif type == 'text':
          self.vocabularies[name] = Text(text, **kwargs)
        else:
          print('Unknown vocabulary type for "{}"'.format(name))
    else:
      print('Vocabulary file not found for "{}"'.format(name))

  def train_vocabulary(self, username, message):
    if username and message:
      for name in self.vocabularies:
        if self.vocabularies[name].training:
          if not self.is_trained(name, username, message) and len(message) > self.min_len:
            self.vocabularies[name].add_text(message, username=username)

  def generate_message(self):
    return self.vocabulary.make_short_sentence(self.max_len, tries=self.tries)

  def generate_message_from(self,username,message):
    return self.vocabulary.make_sentence_from(message, self.max_len, self.min_len, tries=self.max_tries, similarity=self.similarity_score, filter=self.sent, username=username)

  def generate_cached_message(self):
    if (len(self.cache) < self.max_cache) and self.vocabulary:
      text = self.generate_message()
      if text:
        self.cache.append(text)

  def generate_cached_message_from(self,username,message):
    if (len(self.cache) < self.max_cache) and self.vocabulary:
      text = self.generate_message_from(username,message)
      if text:
        self.cache.append(text)

  def current_time(self):
    return int(round(time.time() * 1000))

  def save(self, **kwargs):
    if (self.current_time()-self.last_save > self.save_interval*60000) or kwargs.get('force'):
      self.last_save = self.current_time()
      self.cache = []
      for name in self.vocabularies:
        if self.vocabularies[name].training:
          with open(self.vocabularies[name].file, '+w', encoding='utf-8') as f:
            f.write(self.vocabularies[name].get_text())

  def force_save(self):
    self.save(force=True)

  def capture_action(self, message):
    return message.split()[1], ' '.join(message.split()[1:])

  def answer_to(self, username, message):
    text = self.generate_message_from(username, message)
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
    for name in self.vocabularies:
      self.vocabularies[name].del_text(text)

  def check_for_command(self, username, message):
    if self.is_command(message) and self.is_admin(username):
      self.try_command(username, message)
      return True
    return False

  def check_for_triggers(self, username, message):
    if self.is_target(username) or self.is_trigger(message):
      self.answer_to(username, message)
      return True
    return False

  def check_for_banned(self, username, message):
    if self.is_banned(username, message):
      self.ban(username)
      return True
    return False

  def refresh(self, **kwargs):
    if (self.current_time()-self.last_refresh > self.refresh_interval*60000) or kwargs.get('force'):
      self.connect()

  def force_refresh(self):
    self.refresh(force=True)

  def add_banned(self, **kwargs):
    for b in kwargs.get('users', []):
      if b not in self.banned_users:
        self.banned_users.append(b)
    for b in kwargs.get('words', []):
      if b not in self.banned_words:
        self.banned_words.append(b)
    self.update_config({'banned_words': self.banned_words, 'banned_users': self.banned_users})

  def del_banned(self, **kwargs):
    for b in kwargs.get('users', []):
      if b in self.banned_users:
        self.banned_users.remove(b)
        self.unban(b)
    for b in kwargs.get('words', []):
      if b in self.banned_words:
        self.banned_words.remove(b)
        self.unban(b)
    self.update_config({'banned_words': self.banned_words, 'banned_users': self.banned_users})

  def add_closed(self, users):
    for b in users:
      if b not in self.closed_users:
        self.closed_users.append(b)
    self.update_config({'closed_users': self.closed_users})

  def del_closed(self, users):
    for b in users:
      if b in self.closed_users:
        self.closed_users.remove(b)
    self.update_config({'closed_users': self.closed_users})

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

  def get_name_change(self, username, message):
    if not username and message:
      usernames = message.split(self.name_change)
      if len(usernames) == 2:
        username = usernames[1]
    return username

  def scan(self):
    try:
      self.wait_for_login()
      while self.logged_in:
        if (self.is_message_present()):
          username, message = self.capture_message()
          if not self.is_bot(username):
            self.check_for_command(username, message)
            if not self.is_command(message):
              if self.is_action(username, message):
                username, message = self.capture_action(message)
              if self.filter_message(username, message):
                self.check_for_triggers(username, message)
                self.train_vocabulary(username, message)
              elif (self.has_user_account):
                username = self.get_name_change(username, message)
                self.check_for_banned(username, message)
        self.check_for_routines()
        self.sleep(1.5)
    except KeyboardInterrupt:
      pass
    except:
      traceback.print_exc()


  def shutdown(self):
    print('\nSaving and shutting down!\n')
    self.browser.quit()
    self.force_save()
