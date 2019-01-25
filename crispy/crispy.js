/**
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
*/

const fs = require('fs')
const sm = require('sequencematcher')
const MarkovText = require('./markov.js')
const wd = require('webdriverio')

class Crispy {
  constructor(kwargs={}) {
    // Init
    this.logged_in = false
    this.start_time = this.current_time()
    this.last_wipe = this.start_time
    this.last_save = this.start_time
    this.cache = []
    this.sent = []
    this.commands = {}
    this.command_help = {}
    this.vocabularies = {}
    this.vocabulary = null
    this.username = kwargs.username != null ? kwargs.username : null
    this.password = kwargs.password != null ? kwargs.password : null

    // Config
    this.config = kwargs
    this.bot = kwargs.bot != null ? kwargs.bot : 'Crispybot'
    this.room = kwargs.room != null ? kwargs.room : this.bot
    this.url = kwargs.url != null ? kwargs.url : 'https://jumpin.chat/'+this.room
    this.login_url = kwargs.login_url != null ? kwargs.login_url : 'https://jumpin.chat/login'
    this.max_tries = kwargs.max_tries != null ? kwargs.max_tries : 10
    this.max_len = kwargs.max_len != null ? kwargs.max_len : 60
    this.min_len = kwargs.min_len != null ? kwargs.min_len : 10
    this.max_cache = kwargs.max_cache != null ? kwargs.max_cache : 0
    this.refresh_interval = kwargs.refresh_interval != null ? kwargs.refresh_interval : 10
    this.sleep_interval = kwargs.sleep_interval != null ? kwargs.sleep_interval : 0.1
    this.wipe_interval = kwargs.wipe_interval != null ? kwargs.wipe_interval : 10
    this.save_interval = kwargs.save_interval != null ? kwargs.save_interval : 10
    this.case_sensitive = kwargs.case_sensitive != null ? kwargs.case_sensitive : true
    this.similarity_score = kwargs.similarity_score != null ? kwargs.similarity_score : 0.5
    this.triggers = kwargs.triggers != null ? kwargs.triggers : []
    this.closed_users = kwargs.closed_users != null ? kwargs.closed_users : []
    this.banned_users = kwargs.banned_users != null ? kwargs.banned_users : []
    this.banned_words = kwargs.banned_words != null ? kwargs.banned_words : []
    this.cleared_words = kwargs.cleared_words != null ? kwargs.cleared_words : []
    this.cleared_users = kwargs.cleared_users != null ? kwargs.cleared_users : []
    this.silenced_words = kwargs.silenced_words != null ? kwargs.silenced_words : []
    this.silenced_users = kwargs.silenced_users != null ? kwargs.silenced_users : []
    this.targets = kwargs.targets != null ? kwargs.targets : []
    this.name_change = kwargs.name_change != null ? kwargs.name_change : 'changed their name to'
    this.filter = kwargs.filter != null ? kwargs.filter : []
    this.deny_message = kwargs.deny_message != null ? kwargs.deny_message : '/shrug'
    this.ban_command = kwargs.ban_command != null ? kwargs.ban_command : '/ban'
    this.ban_message = kwargs.ban_message != null ? kwargs.ban_message : '/shrug'
    this.unban_command = kwargs.unban_command != null ? kwargs.unban_command : '/unban'
    this.unban_message = kwargs.unban_message != null ? kwargs.unban_message : '/shrug'
    this.close_command = kwargs.close_command != null ? kwargs.close_command : '/close'
    this.close_message = kwargs.close_message != null ? kwargs.close_message : '/shrug'
    this.clear_command = kwargs.clear_command != null ? kwargs.clear_command : '/clear'
    this.clear_message = kwargs.clear_message != null ? kwargs.clear_message : '/shrug'
    this.silence_command = kwargs.silence_command != null ? kwargs.silence_command : '/silence'
    this.silence_message = kwargs.silence_message != null ? kwargs.silence_message : '/shrug'
    this.msg_command = kwargs.msg_command != null ? kwargs.msg_command : '/msg'
    this.msg_message = kwargs.msg_message != null ? kwargs.msg_message : '/shrug'
    this.action_command = kwargs.action_command != null ? kwargs.action_command : '/me'
    this.action_message = kwargs.action_message != null ? kwargs.action_message : '/shrug'
    this.nick_command = kwargs.nick_command != null ? kwargs.nick_command : '/nick'
    this.nick_message = kwargs.nick_message != null ? kwargs.nick_message : '/shrug'
    this.color_command = kwargs.color_command != null ? kwargs.color_command : '/color'
    this.color_message = kwargs.color_message != null ? kwargs.color_message : '/shrug'
    this.clear_banned = kwargs.clear_banned != null ? kwargs.clear_banned : false
    this.trigger_sensitivity = kwargs.trigger_sensitivity != null ? kwargs.trigger_sensitivity : 0.0
    this.target_sensitivity = kwargs.target_sensitivity != null ? kwargs.target_sensitivity : 0.5
    this.admins = kwargs.admins != null ? kwargs.admins : []
    this.prefix = kwargs.prefix != null ? kwargs.prefix : '!'
    this.debug = kwargs.debug != null ? kwargs.debug : false
    this.browser = null
  }

  get_default_commands() {
    return require('./commands.js')
  }

  async restart_driver() {
    if (this.browser != null) {
      this.browser.shutdown()
    }
    let args = [
      'window-size=1920,1080',
      'disable-gpu',
      'disable-extensions',
      'start-maximized'
    ]
    if (!this.debug) {
      args.push('log-level=3')
      args.push('headless')
    }
    this.browser = await wd.remote({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: args
        }
      }
    })
  }

  update_config(conf) {
    this.config.update(conf)
    for (let key in conf) {
      this[key] = conf[key]
    }
    fs.writeFile('config.json', JSON.stringify(this.config, null, 2), 'utf8', (err) => {if (this.debug) console.log(err)});
  }

  sleep(ratio=1) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, this.sleep_interval * ratio)
  }

  is_action(username, message) {
    if (!message) return false
    return (!username && message[0] == '*')
  }

  filter_message(username, message) {
    let filter_set = new Set(
      this.filter + [this.bot] + [this.name_change] +
      this.banned_users + this.banned_words + this.silenced_users +
      this.silenced_words + this.cleared_users + this.cleared_words
    )
    if (!username) {
      username = ''
    }
    let profile = this.get_user_profile(username)
    for (let f in filter_set) {
      if (f.toLowerCase() in message.toLowerCase() || f.toLowerCase() == username.toLowerCase() || f.toLowerCase() == profile.toLowerCase()) return false
    }
    return true
  }

  is_trained(name,username,message) {
    if (!message) return false
    return this.vocabularies[name].has_text(message, username=username)
  }

  is_command(message) {
    if (message) {
      if(message[0] == this.prefix) {
        return this.commands[message.split()[0].slice(1)] != null
      }
    }
    return false
  }

  is_trigger(message) {
    if (!message) return false
    for (let t in this.triggers) {
      for (let m in message.split()) {
        if (sm.sequenceMatcher(t.toLowerCase(), m.toLowerCase()) > Math.min(Math.max(1-this.trigger_sensitivity,0),1)) {
          return true
        }
      }
    }
    return false
  }

  is_banned(username, message) {
    if (!message || !username) return 0
    let profile = this.get_user_profile(username)
    for (let t in this.banned_users) {
      if (t.toLowerCase() == username.toLowerCase() || t.toLowerCase() == profile.toLowerCase()) {
        return 1
      }
    }
    for (let t in this.banned_words) {
      if (t.toLowerCase() in message.toLowerCase() ){
        return 2
      }
    }
    return 0
  }

  is_cleared(username, message) {
    if (!message || !username) return 0
    let profile = this.get_user_profile(username)
    for (let t in this.cleared_users) {
      if (t.toLowerCase() == username.toLowerCase() || t.toLowerCase() == profile.toLowerCase()) {
        return 1
      }
    }
    for (let t in this.cleared_words) {
      if (t.toLowerCase() in message.toLowerCase()) {
        return 2
      }
    }
    return 0
  }

  is_silenced(username, message) {
    if (!message || !username) return 0
    let profile = this.get_user_profile(username)
    for (let t in this.silenced_users) {
      if (t.toLowerCase() == username.toLowerCase() || t.toLowerCase() == profile.toLowerCase()) {
        return 1
      }
    }
    for (let t in this.silenced_words) {
      if (t.toLowerCase() in message.toLowerCase()) {
        return 2
      }
    }
    return 0
  }

  set_command(command, func, comment='') {
    this.commands[command] = func
    this.command_help[command] = comment
  }

  del_command(command) {
    if (this.is_command(this.prefix+command)) {
      delete this.commands[command]
      delete this.command_help[command]
    }
  }

  try_command(username, message) {
    for (let command in this.commands) {
      if (message.split()[0].slice(1) == command) {
        this.commands[command](crispy=this,args=message.split().slice(1),username=username)
      }
    }
  }

  is_bot(username) {
    if (!username) return false
    return username.toLowerCase() == this.bot.toLowerCase()
  }

  is_target(username) {
    if (!username) return false
    if (!this.is_bot(username)) {
      let profile = this.get_user_profile(username)
      for (let t in this.targets) {
        if (sm.sequenceMatcher(t.toLowerCase(), username.toLowerCase()) > Math.min(Math.max(1-this.target_sensitivity,0),1))
          return true
        else (sm.sequenceMatcher(t.toLowerCase(), profile.toLowerCase()) > Math.min(Math.max(1-this.target_sensitivity, 0), 1))
          return true
      }
    }
    return false
  }

  add_target(target) {
    if (target.constructor == String) {
      if (!(target in this.targets))
        this.targets.push(target)
    } else if (target.constructor == Array) {
      for (let t in target) {
        if (!(t in this.targets))
          this.targets.push(t)
      }
    }
    this.update_config({targets: this.targets})
  }

  del_target(target) {
    if (target.constructor == String) {
      if (target in this.targets) {
        let index = this.targets.indexOf(target)
        if (index !== -1) this.targets.splice(index, 1)
      }
    } else if (target.constructor == Array) {
      for (let t in target) {
        if (t in this.targets) {
          let index = this.targets.indexOf(t)
          if (index !== -1) this.targets.splice(index, 1)
        }
      }
    }
    this.update_config({targets: this.targets})
  }

  add_admin(admin) {
    if (admin.constructor == String) {
      if (!(admin in this.admins))
        this.admins.push(admin)
    } else if (admin.constructor == Array) {
      for (let t in admin) {
        if (!(t in this.admins))
          this.admins.push(t)
      }
    this.update_config({admins: this.admins})
    }
  }

  del_admin(admin) {
    if (admin.constructor == String) {
      if (admin in this.admins) {
        let index = this.admins.indexOf(admin)
        if (index !== -1) this.admins.splice(index, 1)
      }
    } else if (admin.constructor == Array) {
      for (let t in admin) {
        if (t in this.admins) {
          let index = this.admins.indexOf(t)
          if (index !== -1) this.admins.splice(index, 1)
        }
      }
    }
    this.update_config({admins: this.admins})
  }

  add_trigger(trigger) {
    if (trigger.constructor == String) {
      if (!(trigger in this.triggers))
        this.triggers.push(trigger)
    } else if (trigger.constructor == Array) {
      for (let t in triggr) {
        if (!(t in this.triggers))
          this.triggers.push(t)
      }
    }
    this.update_config({triggers: this.triggers})
  }

  del_trigger(trigger) {
    if (trigger.constructor == String) {
      if (trigger in this.triggers) {
        let index = this.triggers.indexOf(trigger)
        if (index !== -1) this.triggers.splice(index, 1)
      }
    } else if (trigger.constructor == Array) {
      for (let t in triggr) {
        if (t in this.triggers) {
          let index = this.triggers.indexOf(t)
          if (index !== -1) this.triggers.splice(index, 1)
        }
      }
    }
    this.update_config({triggers: this.triggers})
  }

  add_filter(message) {
    if (!(message in this.filter))
      this.filter.push(message)
    this.update_config({filter:  this.filter})
  }

  del_filter(message) {
    if (message in this.filter) {
      let index = this.filter.indexOf(message)
      if (index !== -1) this.filter.splice(index, 1)
    }
    this.update_config({filter: this.filter})
  }

  is_admin(username) {
    let profile = this.get_user_profile(username)
    return profile in this.admins
  }

  has_cache() {
    return this.cache.length > 0
  }

  is_message_present() {
    try{
      let el = this.browser.$('.chat__Message')
      if (el) return true
    } catch {
      return false
    }
  }

  send_message(message) {
    this.sent.push(message)
    this.browser.$('.chat__Input').keys(message)
    this.browser.$('.chat__InputSubmit').click()
  }

  send_cached_message() {
    if (this.has_cache()) {
      this.send_message(this.cache.pop(0))
    }
  }

  async capture_message() {
    let chat_message = await this.browser.$('.chat__Message')
    console.log(chat_message)
    let username = null
    let message = null
    try {
      if ('chat__MessageHandle' in chat_message.getAttribute('innerHTML'))
        username = await chat_message.$('.chat__MessageHandle').text
      message = await chat_message.$('.chat__MessageBody').text
    } catch {
      username = ''
      message = ''
    }
    return username, message
  }

  has_user_account() {
    return this.username && this.password
  }

  async login() {
    if (this.has_user_account()) {
      await this.browser.url(this.login_url)
      let username = await this.browser.$('#username')
      username.setValue(this.username)
      let password = await this.browser.$('#password')
      password.setValue(this.password)
      let button = await this.browser.$('//button[text()="Log In"]')
      button.click()
      console.log('\nLogging in to account ' + this.username)
    }
    await this.connect()
  }

  async connect() {
    console.log('\nConnecting to '+this.url)
    this.last_refresh = this.current_time()
    await this.browser.url(this.url)
    let nickname = await this.browser.$('.form__Input-inline')
    if (nickname) {
      await nickname.setValue(this.bot)
      let go = await this.browser.$('//button[text()="Go"]')
      go.click()
      try {
        let close = await this.browser.$('//span[text()="Close cams"]')
        await close.click()
      } catch {
        console.log('\nNo open cameras found! Unable to close cams, will try again next refresh.')
      }
      if (!this.logged_in) {
        let gear = await this.browser.$('.fa-gear')
        await gear.click()
        let youtube = await this.browser.$('#enableyoutubevideos')
        if (youtube.isSelected()) {
          await youtube.click()
          await gear.click()
        }
        let darkmode = await this.browser.$('#enabledarktheme')
        if (!darkmode.isSelected()) {
          await darkmode.click()
        }
        let volume = await this.browser.$('.chat__HeaderOption-streamVolume')
        await volume.click()
        let sounds = await this.browser.$('.chat__HeaderOption-sounds')
        await sounds.click()
      }
      this.logged_in=true
      console.log('\nLogin complete! Bot is ready to receive messages!')
    }
  }

  reset_userlist() {
    this.browser.execute_script("document.getElementsByClassName('scrollarea-content')[1].style.marginTop = '0px';")
  }

  scroll_userlist() {
    this.browser.execute_script(`
      var viewers = Number(document.getElementsByClassName('cams__ViewerCount')[0].textContent)
      var userlist = document.getElementsByClassName('scrollarea-content')[1];
      var mt = Number(userlist.style.marginTop.replace('px', ''))-30;
      if (mt > ((7*30)-(viewers*30))) {
        userlist.style.marginTop = mt+'px';
      } else {
        userlist.style.marginTop = '0px';
      }
    `)
    }

  click_username(username) {
    if (username && !this.is_bot(username)) {
      try {
        let user = this.browser.$('"userList__UserHandle") and text()="'+username+'"')
        if (user) {
          while (!user.is_displayed())
            this.scroll_userlist()
          user.click()
          this.sleep()
        }
      } catch {
        console.log('\nTried to click {} but username is not displayed!'.format(username))
      }
    }
  }

  click_chat() {
    try {
      this.browser.$('.chat__Input').click()
    } catch {
      console.log('\nTried to click .chat__Input but element not found. Refreshing page...')
      this.refresh()
    }
  }


  get_user_profile(username) {
    let profile = ''
    if (username) {
      this.click_username(username)
      try {
        if (this.browser.$('//button[text()="Profile"]')) {
          profile = this.browser.$('.dropdown__Option-header').text
        }
      } catch {}
      this.click_chat()
    }
    return profile
  }

  ban(username, notify=true) {
    if (username) {
      this.send_message('{} {}'.format(this.ban_command,username))
      this.sleep()
      if (notify) {
        this.send_message(this.ban_message)
      }
    }
  }

  unban(username, notify=true) {
    if (username) {
      this.send_message('{} {}'.format(this.unban_command,username))
      this.sleep()
      if (notify) {
        this.send_message(this.unban_message)
      }
    }
  }

  close(username, notify=true) {
    if (username) {
      this.send_message('{} {}'.format(this.close_command,username))
      this.sleep()
      if (notify) {
        this.send_message(this.close_message)
      }
    }
  }

  silence(username, notify=true) {
    if (username) {
      this.send_message('{} {}'.format(this.silence_command,username))
      this.sleep()
      if (notify) {
        this.send_message(this.silence_message)
      }
    }
  }

  clear(notify=true) {
    this.send_message(this.clear_command)
    this.sleep()
    if (notify) {
      this.send_message(this.clear_message)
    }
  }

  msg(username,message, notify=true) {
    if (username && message) {
      this.send_message('{} {} {}'.format(this.msg_command,username,message))
      this.sleep()
      if (notify) {
        this.send_message(this.msg_message)
      }
    }
  }

  action(message, notify=true) {
    if (message) {
      this.send_message('{} {}'.format(this.action_command,message))
      this.sleep()
      if (notify) {
        this.send_message(this.action_message)
      }
    }
  }

  nick(nickname, notify=true) {
    if (nickname) {
      this.send_message('{} {}'.format(this.nick_command,nickname))
      this.bot = nickname
      this.update_config({bot: this.bot})
      this.sleep()
      if (notify) {
        this.send_message(this.nick_message)
      }
    }
  }

  color(color, notify=true) {
    if (color) {
      this.send_message('{} {}'.format(this.color_command,color))
      this.sleep()
      if (notify) {
        this.send_message(this.color_message)
      }
    }
  }

  has_vocabulary(name) {
    return this.vocabularies[name]
  }

  set_vocabulary(name) {
    if (this.has_vocabulary(name)) {
      this.vocabulary = this.vocabularies[name]
      this.cache = []
    }
  }

  add_vocabulary(name, kwargs) {
    if (kwargs.file) {
      let file = fs.readFileSync(kwargs.file, 'utf8')
      let fname = kwargs.file.split('.')
      if (fname[fname.length-1] == 'json') {
        kwargs.json = file
        this.vocabularies[name] = new MarkovText(kwargs={})
      } else if (fname[fname.length-1] == 'txt') {
        kwargs.corpus = file.split('\n')
        this.vocabularies[name] = new MarkovText(kwargs={})
      } else {
        console.log('Unknown vocabulary type for "{}"'.format(name))
      }
    } else {
      console.log('Vocabulary file not found for "{}"'.format(name))
    }
  }

  train_vocabulary(username, message) {
    if (username && message) {
      for (name in this.vocabularies) {
        if (this.vocabularies[name].training) {
          if (!this.is_trained(name, username, message) && message.length > this.min_len) {
            this.vocabularies[name].add_text(message, username=username)
          }
        }
      }
    }
  }

  generate_message() {
    return this.vocabulary.predict({
      init_state: null,
      max_chars: this.max_len,
      numberOfSentences: this.max_tries,
      popularFirstWord: true
    })
  }

  generate_message_from(sername,message) {
    return this.vocabulary.make_sentence_from(message, this.max_len, this.min_len, tries=this.max_tries, similarity=this.similarity_score, filter=this.sent, username=username, case_sensitive=this.case_sensitive)
  }

  generate_cached_message() {
    if ((this.cache.length < this.max_cache) && this.vocabulary) {
      let text = this.generate_message()
      if (text) this.cache.push(text)
    }
  }

  generate_cached_message_from(sername,message) {
    if ((this.cache.length < this.max_cache) && this.vocabulary) {
      let text = this.generate_message_from(username,message)
      if (text) this.cache.push(text)
    }
  }

  current_time() {
    return Number(Math.round(Date.now() * 1000))
  }

  save(kwargs={}) {
    if ((this.current_time()-this.last_save > this.save_interval*60000) || kwargs.force) {
      this.last_save = this.current_time()
      this.cache = []
      for (let name in this.vocabularies) {
        if (this.vocabularies[name].training) {
          fs.writeFile(this.vocabularies[name].file, this.vocabularies[name].get_text(), 'utf8', (err) => {if (this.debug) console.log(err)})
        }
      }
    }
  }

  force_save() {
    this.save({force: true})
  }

  capture_action(message) {
    return message.split()[1], ' '.join(message.split().slice(1))
  }

  answer_to(username, message) {
    text = this.generate_message_from(username, message)
    if (text)
      this.send_message(text)
    else
      this.send_cached_message()
  }

  wipe_sent_messages(kwargs={}) {
    if ((this.current_time()-this.last_wipe > this.wipe_interval*60000) || kwargs.force) {
      this.last_wipe = this.current_time()
      this.sent = []
    }
  }

  force_wipe() {
    this.wipe_sent_messages({force: true})
  }

  spam(text, amount) {
    for (let i=0; i < amount; i++) {
      this.send_message(text)
    }
  }

  forget(text) {
    for (let name in this.vocabularies) {
      this.vocabularies[name].del_text(text)
    }
  }

  check_for_triggers(username, message) {
    if (this.is_target(username) || this.is_trigger(message)) {
      this.answer_to(username, message)
      return true
    }
    return false
  }

  check_for_banned(username, message) {
    let banned = this.is_banned(username, message)
    if (banned) {
      this.ban(username)
      if (banned == 2 && this.clear_banned) {
        this.clear()
      }
      return true
    }
    return false
  }

  check_for_cleared(username, message) {
    let cleared = this.is_cleared(username, message)
    if (cleared) {
      this.clear()
      return true
    }
    return false
  }

  check_for_silenced(username, message) {
    let silenced = this.is_silenced(username, message)
    if (silenced) {
      this.silence(username)
      return true
    }
    return false
  }

  async check_for_closed() {
    let cam_handles = []
    try {
      cam_handles = this.browser.$('.cams__CamHandle')
    } catch {}
    for (handle in cam_handles) {
      try {
        username = handle.text
        profile = this.get_user_profile(username)
        if (username in this.closed_users || profile in this.closed_users)
          this.close(username)
      } catch {}
    }
  }

  refresh(kwargs={}) {
    if ((this.current_time()-this.last_refresh > this.refresh_interval*60000) || kwargs.force) {
      this.connect()
    }
  }

  force_refresh() {
    this.refresh({force: true})
  }

  add_banned(kwargs={}) {
    for (b in kwargs.users) {
      if (!(b in this.banned_users)) {
        this.banned_users.push(b)
        this.ban(b)
      }
    }
    for (let b in kwargs.words) {
      if (!(b in this.banned_words)) {
        this.banned_words.push(b)
        this.ban(b)
      }
    }
    this.update_config({banned_words: this.banned_words, 'banned_users': this.banned_users})
  }

  del_banned(kwargs={}) {
    for (b in kwargs.users) {
      if (b in this.banned_users) {
        let index = this.banned_users.indexOf(b)
        if (index !== -1) this.banned_users.splice(index, 1)
        this.unban(b)
      }
    }
    for (let b in kwargs.words) {
      if (b in this.banned_words) {
        let index = this.banned_words.indexOf(b)
        if (index !== -1) this.banned_words.splice(index, 1)
        this.unban(b)
      }
    }
    this.update_config({banned_words: this.banned_words, 'banned_users': this.banned_users})
  }

  add_cleared(kwargs={}) {
    for (b in kwargs.users) {
      if (!(b in this.cleared_users)) {
        this.cleared_users.push(b)
      }
    }
    for (let b in kwargs.words) {
      if (!(b in this.cleared_words)) {
        this.cleared_words.push(b)
      }
    }
    this.update_config({cleared_words: this.cleared_words, 'cleared_users': this.cleared_users})
  }

  del_cleared(kwargs={}) {
    for (b in kwargs.users) {
      if (b in this.cleared_users) {
        let index = this.cleared_users.indexOf(b)
        if (index !== -1) this.cleared_users.splice(index, 1)
      }
    }
    for (let b in kwargs.words) {
      if (b in this.cleared_words) {
        let index = this.cleared_words.indexOf(b)
        if (index !== -1) this.cleared_words.splice(index, 1)
      }
    }
    this.update_config({cleared_words: this.cleared_words, 'cleared_users': this.cleared_users})
  }

  add_silenced(kwargs={}) {
    for (let b in kwargs.users) {
      if (!(b in this.silenced_users))
        this.silenced_users.push(b)
    }
    for (let b in kwargs.words) {
      if (!(b in this.silenced_words))
        this.silenced_words.push(b)
    }
    this.update_config({silenced_words: this.silenced_words, 'silenced_users': this.silenced_users})
  }

  del_silenced(kwargs={}) {
    for (let b in kwargs.users) {
      if (b in this.silenced_users) {
        let index = this.silenced_users.indexOf(b)
        if (index !== -1) this.silenced_users.splice(index, 1)
      }
    }
    for (let b in kwargs.words) {
      if (b in this.silenced_words) {
        let index = this.silenced_words.indexOf(b)
        if (index !== -1) this.silenced_words.splice(index, 1)
      }
    }
    this.update_config({silenced_words: this.silenced_words, 'silenced_users': this.silenced_users})
  }

  add_closed(users) {
    for (let b in users) {
      if (!(b in this.closed_users))
        this.closed_users.push(b)
    }
    this.update_config({closed_users: this.closed_users})
  }

  del_closed(users) {
    for (let b in users) {
      if (b in this.closed_users) {
        let index = this.closed_users.indexOf(b)
        if (index !== -1) this.closed_users.splice(index, 1)
      }
    }
    this.update_config({closed_users: this.closed_users})
  }

  async check_for_routines() {
    this.generate_cached_message()
    this.wipe_sent_messages()
    this.save()
    this.refresh()
  }

  check_name_change(username, message) {
    if (!username && message) {
      usernames = message.split(this.name_change)
      if (usernames.length == 2)
        username = usernames[1].strip()
    }
    return username
  }

  check_for_command(username, message) {
    if (this.is_command(message) ){
      if (this.is_admin(username) )
        this.try_command(username, message)
      else
        this.send_message(this.deny_message)
      return true
    }
    return false
  }

  async scan() {
    try {
      await this.restart_driver()
      while (true) {
        if (!this.logged_in) {
          await this.login()
        }
        while (this.logged_in) {
          this.check_for_routines()
          //this.check_for_closed()
          if (this.is_message_present()) {
            let username, message = await this.capture_message()
            if (!this.is_bot(username)) {
              if (!this.check_for_command(username, message)) {
                if (this.is_action(username, message)) {
                  username, message = this.capture_action(message)
                }
                if (this.filter_message(username, message)) {
                  this.check_for_triggers(username, message)
                  this.train_vocabulary(username, message)
                } else if (this.has_user_account()) {
                  username = this.check_name_change(username, message)
                  if (!this.is_bot(username)) {
                    this.check_for_banned(username, message)
                    this.check_for_cleared(username, message)
                    this.check_for_silenced(username, message)
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      if (this.debug) console.log(err)
      this.shutdown()
    }
  }

  shutdown() {
    console.log('\nSaving and shutting down!\n')
    this.browser.shutdown()
    this.force_save()
  }
}

module.exports=Crispy