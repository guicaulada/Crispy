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

from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, WebDriverException, StaleElementReferenceException, TimeoutException
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
    self.command_help = {}
    self.vocabularies = {}
    self.vocabulary = None
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
    self.max_cache = kwargs.get('max_cache', 0)
    self.refresh_interval = kwargs.get('refresh_interval', 10)
    self.sleep_interval = kwargs.get('sleep_interval', 0.1)
    self.wipe_interval = kwargs.get('wipe_interval', 10)
    self.save_interval = kwargs.get('save_interval', 10)
    self.case_sensitive = kwargs.get('case_sensitive', True)
    self.similarity_score = kwargs.get('similarity_score', 0.5)
    self.triggers = kwargs.get('triggers', [])
    self.closed_users = kwargs.get('closed_users', [])
    self.banned_users = kwargs.get('banned_users', [])
    self.banned_words = kwargs.get('banned_words', [])
    self.cleared_words = kwargs.get('cleared_words', [])
    self.cleared_users = kwargs.get('cleared_users', [])
    self.silenced_words = kwargs.get('silenced_words', [])
    self.silenced_users = kwargs.get('silenced_users', [])
    self.targets = kwargs.get('targets', [])
    self.name_change = kwargs.get('name_change', 'changed their name to')
    self.filter = kwargs.get('filter', [])
    self.deny_message = kwargs.get('deny_message', '/shrug')
    self.ban_command = kwargs.get('ban_command', '/ban')
    self.ban_message = kwargs.get('ban_message', '/shrug')
    self.unban_command = kwargs.get('unban_command', '/unban')
    self.unban_message = kwargs.get('unban_message', '/shrug')
    self.close_command = kwargs.get('close_command', '/close')
    self.close_message = kwargs.get('close_message', '/shrug')
    self.clear_command = kwargs.get('clear_command', '/clear')
    self.clear_message = kwargs.get('clear_message', '/shrug')
    self.silence_command = kwargs.get('silence_command', '/silence')
    self.silence_message = kwargs.get('silence_message', '/shrug')
    self.msg_command = kwargs.get('msg_command', '/msg')
    self.msg_message = kwargs.get('msg_message', '/shrug')
    self.action_command = kwargs.get('action_command', '/me')
    self.action_message = kwargs.get('action_message', '/shrug')
    self.nick_command = kwargs.get('nick_command', '/nick')
    self.nick_message = kwargs.get('nick_message', '/shrug')
    self.color_command = kwargs.get('color_command', '/color')
    self.color_message = kwargs.get('color_message', '/shrug')
    self.clear_banned = kwargs.get('clear_banned', False)
    self.trigger_sensitivity = kwargs.get('trigger_sensitivity', 0.0)
    self.target_sensitivity = kwargs.get('target_sensitivity', 0.5)
    self.admins = kwargs.get('admins', [])
    self.prefix = kwargs.get('prefix', '!')
    self.debug = kwargs.get('debug', False)
    self.browser = None
    self.restart_driver()

  def __setitem__(self, name, value):
    return setattr(self, name, value)

  def __getitem__(self, name):
    return getattr(self, name)

  def restart_driver(self):
    if self.browser != None:
      self.browser.quit()
    options = ChromeOptions()
    if not self.debug:
      options.add_argument('log-level=3')
      options.add_argument('headless')
    self.browser = Chrome(chrome_options=options)

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
    filter_set = list(
      set(self.filter) | set([self.bot]) | set([self.name_change]) |
      set(self.banned_users) | set(self.banned_words) |
      set(self.silenced_users) | set(self.silenced_words) |
      set(self.cleared_users) | set(self.cleared_words)
    )
    if not username:
      username = ''
    profile = self.get_user_profile(username)
    if not profile:
      profile = ''
    for f in filter_set:
      if f.lower() in message.lower() or f.lower() == username.lower() or f.lower() == profile.lower():
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
      return 0
    profile = self.get_user_profile(username)
    for t in self.banned_users:
      if t.lower() == username.lower() or t.lower() == profile.lower():
        return 1
    for t in self.banned_words:
      if t.lower() in message.lower():
        return 2
    return 0

  def is_cleared(self, username, message):
    if not message or not username:
      return 0
    profile = self.get_user_profile(username)
    for t in self.cleared_users:
      if t.lower() == username.lower() or t.lower() == profile.lower():
        return 1
    for t in self.cleared_words:
      if t.lower() in message.lower():
        return 2
    return 0

  def is_silenced(self, username, message):
    if not message or not username:
      return 0
    profile = self.get_user_profile(username)
    print('{} {}'.format(profile, username))
    for t in self.silenced_users:
      if t.lower() == username.lower() or t.lower() == profile.lower():
        return 1
    for t in self.silenced_words:
      if t.lower() in message.lower():
        return 2
    return 0

  def set_command(self, command, func, comment=''):
    self.commands[command] = func
    self.command_help[command] = comment

  def del_command(self, command):
    if self.is_command(self.prefix+command):
      del self.commands[command]
      del self.command_help[command]

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
    if not self.is_bot(username):
      profile = self.get_user_profile(username)
      for t in self.targets:
        if SequenceMatcher(None, t.lower(), username.lower()).ratio() > min(max(1-self.target_sensitivity,0),1):
          return True
        elif SequenceMatcher(None, t.lower(), profile.lower()).ratio() > min(max(1-self.target_sensitivity, 0), 1):
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
    if message not in self.filter:
      self.filter.append(message)
    self.update_config({'filter':  self.filter})

  def del_filter(self, message):
    if message in self.filter:
      self.filter.remove(message)
    self.update_config({'filter': self.filter})

  def is_admin(self,username):
    profile = self.get_user_profile(username)
    return profile in self.admins

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
    chat_message = self.browser.find_elements(By.CSS_SELECTOR, '.chat__Message')[-1]
    if ('chat__MessageHandle' in chat_message.get_attribute('innerHTML')):
      username = chat_message.find_element(By.CSS_SELECTOR, '.chat__MessageHandle').text
    else:
      username = None
    message = chat_message.find_element(By.CSS_SELECTOR, '.chat__MessageBody').text
    return username, message

  def wait_for_element(self, by, element, t=10):
    try:
      return WebDriverWait(self.browser, t).until(EC.presence_of_element_located((by, element)))
    except TimeoutException:
      print('\nTimed out waiting for element "'+element+'". Restarting driver...')
      self.logged_in = False
      self.restart_driver()

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
    if nickname:
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
        youtube = self.browser.find_element(By.ID, 'enableyoutubevideos')
        if youtube.is_selected():
          youtube.click()
          self.sleep(5)
          self.browser.find_element(By.CSS_SELECTOR, '.fa-gear').click()
          self.sleep(5)
        darkmode = self.browser.find_element(By.ID, 'enabledarktheme')
        if not darkmode.is_selected():
          darkmode.click()
          self.sleep(5)
        self.browser.find_element(By.CSS_SELECTOR, '.chat__HeaderOption-streamVolume').click()
        self.sleep(5)
        self.browser.find_element(By.CSS_SELECTOR, '.chat__HeaderOption-sounds').click()
        self.logged_in = True
      print('\nLogin complete! Bot is ready to receive messages!')

  def reset_scrollarea(self):
    self.browser.execute_script("document.getElementsByClassName('scrollarea-content')[1].style.marginTop = '0px';")

  def click_username(self, username):
    if username and not self.is_bot(username):
      self.reset_scrollarea()
      user = self.browser.find_element(By.XPATH, '//div[contains(@class, "userList__UserHandle") and text()="'+username+'"]')
      while (not user.is_displayed()):
        self.browser.execute_script("var mt = Number(document.getElementsByClassName('scrollarea-content')[1].style.marginTop.replace('px', '')); document.getElementsByClassName('scrollarea-content')[1].style.marginTop = (mt-10)+'px';")
      try:
        user.click()
        self.sleep()
      except WebDriverException:
        print('\nTried to click {} but username is not displayed!'.format(username))

  def click_chat(self):
    self.browser.find_element(By.CSS_SELECTOR, '.chat__Input').click()

  def get_user_profile(self, username):
    profile = None
    if username:
      self.click_username(username)
      try:
        profile = self.browser.find_element(By.XPATH, '//button[text()="Profile"]')
      except NoSuchElementException:
        print('\nTried to check profile for {} but profile not found!'.format(username))
      if profile:
        profile = self.browser.find_element(By.CSS_SELECTOR, '.dropdown__Option-header').text
      self.click_chat()
    return profile

  def ban(self, username, notify=True):
    if username:
      self.send_message('{} {}'.format(self.ban_command,username))
      self.sleep()
      if notify:
        self.send_message(self.ban_message)

  def unban(self, username, notify=True):
    if username:
      self.send_message('{} {}'.format(self.unban_command,username))
      self.sleep()
      if notify:
        self.send_message(self.unban_message)

  def close(self, username, notify=True):
    if username:
      self.send_message('{} {}'.format(self.close_command,username))
      self.sleep()
      if notify:
        self.send_message(self.close_message)

  def silence(self, username, notify=True):
    if username:
      self.send_message('{} {}'.format(self.silence_command,username))
      self.sleep()
      if notify:
        self.send_message(self.silence_message)

  def clear(self, notify=True):
    self.send_message(self.clear_command)
    self.sleep()
    if notify:
      self.send_message(self.clear_message)

  def msg(self, username,message, notify=True):
    if username and message:
      self.send_message('{} {} {}'.format(self.msg_command,username,message))
      self.sleep()
      if notify:
        self.send_message(self.msg_message)

  def action(self, message, notify=True):
    if message:
      self.send_message('{} {}'.format(self.action_command,message))
      self.sleep()
      if notify:
        self.send_message(self.action_message)

  def nick(self, nickname, notify=True):
    if nickname:
      self.send_message('{} {}'.format(self.nick_command,nickname))
      self.bot = nickname
      self.update_config({'bot': self.bot})
      self.sleep()
      if notify:
        self.send_message(self.nick_message)

  def color(self, color, notify=True):
    if color:
      self.send_message('{} {}'.format(self.color_command,color))
      self.sleep()
      if notify:
        self.send_message(self.color_message)

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
    return self.vocabulary.make_short_sentence(self.max_len, tries=self.max_tries)

  def generate_message_from(self,username,message):
    return self.vocabulary.make_sentence_from(message, self.max_len, self.min_len, tries=self.max_tries, similarity=self.similarity_score, filter=self.sent, username=username, case_sensitive=self.case_sensitive)

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

  def check_for_triggers(self, username, message):
    if self.is_target(username) or self.is_trigger(message):
      self.answer_to(username, message)
      return True
    return False

  def check_for_banned(self, username, message):
    banned = self.is_banned(username, message)
    if banned:
      self.ban(username)
      if banned == 2 and self.clear_banned:
        self.clear()
      return True
    return False

  def check_for_cleared(self, username, message):
    cleared = self.is_cleared(username, message)
    if cleared:
      self.clear()
      return True
    return False

  def check_for_silenced(self, username, message):
    silenced = self.is_silenced(username, message)
    if silenced:
      self.silence(username)
      return True
    return False

  def check_for_closed(self):
    cam_handles = []
    try:
      cam_handles = self.browser.find_elements(By.CSS_SELECTOR, '.cams__CamHandle')
    except NoSuchElementException:
      pass
    for handle in cam_handles:
      try:
        username = handle.text
        profile = self.get_user_profile(username)
        if username in self.closed_users or profile in self.closed_users:
          self.close(username)
      except StaleElementReferenceException:
        pass

  def refresh(self, **kwargs):
    if (self.current_time()-self.last_refresh > self.refresh_interval*60000) or kwargs.get('force'):
      self.connect()

  def force_refresh(self):
    self.refresh(force=True)

  def add_banned(self, **kwargs):
    for b in kwargs.get('users', []):
      if b not in self.banned_users:
        self.banned_users.append(b)
        self.ban(b)
    for b in kwargs.get('words', []):
      if b not in self.banned_words:
        self.banned_words.append(b)
        self.ban(b)
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

  def add_cleared(self, **kwargs):
    for b in kwargs.get('users', []):
      if b not in self.cleared_users:
        self.cleared_users.append(b)
    for b in kwargs.get('words', []):
      if b not in self.cleared_words:
        self.cleared_words.append(b)
    self.update_config({'cleared_words': self.cleared_words, 'cleared_users': self.cleared_users})

  def del_cleared(self, **kwargs):
    for b in kwargs.get('users', []):
      if b in self.cleared_users:
        self.cleared_users.remove(b)
    for b in kwargs.get('words', []):
      if b in self.cleared_words:
        self.cleared_words.remove(b)
    self.update_config({'cleared_words': self.cleared_words, 'cleared_users': self.cleared_users})

  def add_silenced(self, **kwargs):
    for b in kwargs.get('users', []):
      if b not in self.silenced_users:
        self.silenced_users.append(b)
    for b in kwargs.get('words', []):
      if b not in self.silenced_words:
        self.silenced_words.append(b)
    self.update_config({'silenced_words': self.silenced_words, 'silenced_users': self.silenced_users})

  def del_silenced(self, **kwargs):
    for b in kwargs.get('users', []):
      if b in self.silenced_users:
        self.silenced_users.remove(b)
    for b in kwargs.get('words', []):
      if b in self.silenced_words:
        self.silenced_words.remove(b)
    self.update_config({'silenced_words': self.silenced_words, 'silenced_users': self.silenced_users})

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

  def check_name_change(self, username, message):
    if not username and message:
      usernames = message.split(self.name_change)
      if len(usernames) == 2:
        username = usernames[1].strip()
    return username

  def check_for_command(self, username, message):
    if self.is_command(message):
      if self.is_admin(username):
        self.try_command(username, message)
      else:
        self.send_message(self.deny_message)
      return True
    return False

  def scan(self):
    try:
      while True:
        if not self.logged_in:
          self.wait_for_login()
        while self.logged_in:
          self.sleep(1.5)
          self.check_for_routines()
          self.check_for_closed()
          if self.is_message_present():
            username, message = self.capture_message()
            if not self.is_bot(username):
              if not self.check_for_command(username, message):
                if self.is_action(username, message):
                  username, message = self.capture_action(message)
                if self.filter_message(username, message):
                  self.check_for_triggers(username, message)
                  self.train_vocabulary(username, message)
                elif self.has_user_account():
                  username = self.check_name_change(username, message)
                  if not self.is_bot(username):
                    self.check_for_banned(username, message)
                    self.check_for_cleared(username, message)
                    self.check_for_silenced(username, message)
    except KeyboardInterrupt:
      pass


  def shutdown(self):
    print('\nSaving and shutting down!\n')
    self.browser.quit()
    self.force_save()
