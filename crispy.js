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
const wd = require('webdriverio')
const cd = require('chromedriver')
const sm = require('sequencematcher')
const MarkovText = require('./markov.js')

class Crispy {
  constructor(kwargs={}) {
    // Init
    let self = this
    this.logged_in = false
    this.start_time = this.current_time()
    this.last_wipe = this.start_time
    this.last_save = this.start_time
    this.cache = new Set()
    this.commands = {}
    this.command_help = {}
    this.vocabularies = {}
    this.vocabulary = null
    this.last_message = null
    this.browser = null
    this.username = kwargs.username != null ? kwargs.username : null
    this.password = kwargs.password != null ? kwargs.password : null

    // Config
    this.config = kwargs
    this.bot = kwargs.bot != null ? kwargs.bot : 'Crispybot'
    this.room = kwargs.room != null ? kwargs.room : this.bot
    this.url = kwargs.url != null ? kwargs.url : 'https://jumpin.chat/'+this.room
    this.login_url = kwargs.login_url != null ? kwargs.login_url : 'https://jumpin.chat/login'
    this.max_tries = kwargs.max_tries != null ? kwargs.max_tries : 100
    this.max_len = kwargs.max_len != null ? kwargs.max_len : 60
    this.min_len = kwargs.min_len != null ? kwargs.min_len : 10
    this.refresh_interval = kwargs.refresh_interval != null ? kwargs.refresh_interval : 10
    this.sleep_interval = kwargs.sleep_interval != null ? kwargs.sleep_interval : 0.1
    this.wipe_interval = kwargs.wipe_interval != null ? kwargs.wipe_interval : 10
    this.save_interval = kwargs.save_interval != null ? kwargs.save_interval : 10
    this.case_sensitive = kwargs.case_sensitive != null ? kwargs.case_sensitive : true
    this.similarity_score = kwargs.similarity_score != null ? kwargs.similarity_score : 0.5
    this.filter = kwargs.filter != null ? new Set(kwargs.filter) : new Set()
    this.targets = kwargs.targets != null ? new Set(kwargs.targets) : new Set()
    this.triggers = kwargs.triggers != null ? new Set(kwargs.triggers) : new Set()
    this.closed_users = kwargs.closed_users != null ? new Set(kwargs.closed_users) : new Set()
    this.banned_users = kwargs.banned_users != null ? new Set(kwargs.banned_users) : new Set()
    this.banned_words = kwargs.banned_words != null ? new Set(kwargs.banned_words) : new Set()
    this.cleared_words = kwargs.cleared_words != null ? new Set(kwargs.cleared_words) : new Set()
    this.cleared_users = kwargs.cleared_users != null ? new Set(kwargs.cleared_users) : new Set()
    this.silenced_words = kwargs.silenced_words != null ? new Set(kwargs.silenced_words) : new Set()
    this.silenced_users = kwargs.silenced_users != null ? new Set(kwargs.silenced_users) : new Set()
    this.name_change = kwargs.name_change != null ? kwargs.name_change : 'changed their name to'
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
    this.admins = kwargs.admins != null ? new Set(kwargs.admins) : new Set()
    this.prefix = kwargs.prefix != null ? kwargs.prefix : '!'
    this.debug = kwargs.debug != null ? kwargs.debug : false

    // Webdriver
    cd.start()

    // Exit
    let exit = () => {self.exit = true}
    process.on('SIGHUP', exit)
    process.on('SIGQUIT', exit)
    process.on('SIGTERM', exit)
    process.on('SIGINT', exit)
    if (process.platform === 'win32') {
      process.on('SIGKILL', exit)
    }
  }

  default_commands() {
    return require('./commands.js')
  }

  async restart_driver() {
    if (this.browser != null) {
      this.browser = null
      cd.stop()
      cd.start()
    }
    let args = [
      'window-size=1920,1080',
      'disable-gpu',
      'disable-extensions',
      'start-maximized',
    ]
    let logLevel = 'silent'
    if (!this.debug) args.push('headless', 'log-level=3')
    else logLevel = 'error'
    this.browser = await wd.remote({
      port: 9515,
      path: '/',
      logLevel: logLevel,
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: args
        }
      }
    })
  }

  update_config(conf) {
    for (let key in conf) {
      this[key] = conf[key]
      if (conf[key].constructor == Set) {
        this.config[key] = Array.from(conf[key])
      } else {
        this.config[key] = conf[key]
      }
    }
    fs.writeFile('config.json', JSON.stringify(this.config, null, 2), 'utf8', (err) => {if (this.debug) console.log(err)});
  }

  sleep(ratio=1) {
    return new Promise(resolve => setTimeout(resolve, this.sleep_interval * ratio * 1000))
  }

  is_action(username, message) {
    if (!message) return false
    return (!username && message[0] == '*')
  }

  async filter_message(username, message) {
    let filter_set = new Set([...this.filter, ...this.banned_users, ...this.banned_words, ...this.silenced_users,
    ...this.silenced_words, ...this.cleared_users, ...this.cleared_words, this.bot, this.name_change])
    let profile = await this.get_user_profile(username)
    for (let f of filter_set) {
      if (message.toLowerCase().includes(f.toLowerCase())  || f.toLowerCase() == username.toLowerCase() || f.toLowerCase() == profile.toLowerCase()) return false
    }
    this.cache.add(message)
    return true
  }

  is_trained(name,username,message) {
    if (!message) return false
    return this.vocabularies[name].has_text(message, {username: username})
  }

  is_command(message) {
    if (message) {
      if(message[0] == this.prefix) {
        return this.commands[message.split(/\s+/)[0].slice(1)] != null
      }
    }
    return false
  }

  is_trigger(message) {
    if (!message) return false
    for (let t of this.triggers) {
      for (let m of message.split(/\s+/)) {
        if (sm.sequenceMatcher(t.toLowerCase(), m.toLowerCase()) > Math.min(Math.max(1-this.trigger_sensitivity,0),1)) {
          return true
        }
      }
    }
    return false
  }

  async is_banned(username, message) {
    if (!message || !username) return 0
    let profile = await this.get_user_profile(username)
    if (this.banned_users.has(username.toLowerCase()) || this.banned_users.has(profile.toLowerCase())) return 1
    for (let t of this.banned_words) {
      if (message.toLowerCase().includes(t.toLowerCase())) {
        return 2
      }
    }
    return 0
  }

  async is_cleared(username, message) {
    if (!message || !username) return 0
    let profile = await this.get_user_profile(username)
    if (this.cleared_users.has(username.toLowerCase()) || this.cleared_words.has(profile.toLowerCase())) return 1
    for (let t of this.cleared_words) {
      if (message.toLowerCase().includes(t.toLowerCase())) {
        return 2
      }
    }
    return 0
  }

  async is_silenced(username, message) {
    if (!message || !username) return 0
    let profile = await this.get_user_profile(username)
    if (this.silenced_users.has(username.toLowerCase()) || this.silenced_users.has(profile.toLowerCase())) return 1
    for (let t of this.silenced_words) {
      if (message.toLowerCase().includes(t.toLowerCase())) {
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

  async try_command(username, message) {
    for (let command in this.commands) {
      if (message.split(/\s+/)[0].slice(1) == command) {
        await this.commands[command]({crispy: this,args: message.split(/\s+/).slice(1),username: username})
      }
    }
  }

  is_bot(username) {
    if (typeof username != 'string') return false
    return username.toLowerCase() == this.bot.toLowerCase()
  }

  async is_target(username) {
    if (!username) return false
    if (!this.is_bot(username)) {
      let profile = await this.get_user_profile(username)
      for (let t of this.targets) {
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
      this.targets.add(target)
    } else if (target.constructor == Array) {
      for (let t of target) {
        this.targets.add(t)
      }
    }
    this.update_config({targets: this.targets})
  }

  del_target(target) {
    if (target.constructor == String) {
      this.targets.delete(target)
    } else if (target.constructor == Array) {
      for (let t of target) {
        this.targets.delete(t)
      }
    }
    this.update_config({targets: this.targets})
  }

  add_admin(admin) {
    if (admin.constructor == String) {
      this.admins.add(admin)
    } else if (admin.constructor == Array) {
      for (let t of admin) {
        this.admins.add(t)
      }
    }
    this.update_config({admins: this.admins})
  }

  del_admin(admin) {
    if (admin.constructor == String) {
      this.admins.delete(admin)
    } else if (admin.constructor == Array) {
      for (let t of admin) {
        this.admins.delete(t)
      }
    }
    this.update_config({admins: this.admins})
  }

  add_trigger(trigger) {
    if (trigger.constructor == String) {
      this.triggers.add(trigger)
    } else if (trigger.constructor == Array) {
      for (let t of trigger) {
        this.triggers.add(t)
      }
    }
    this.update_config({triggers: this.triggers})
  }

  del_trigger(trigger) {
    if (trigger.constructor == String) {
      this.triggers.delete(trigger)
    } else if (trigger.constructor == Array) {
      for (let t of trigger) {
        this.triggers.delete(t)
      }
    }
    this.update_config({triggers: this.triggers})
  }

  add_filter(message) {
    this.filter.add(message)
    this.update_config({filter:  this.filter})
  }

  del_filter(message) {
    this.filter.delete(message)
    this.update_config({filter: this.filter})
  }

  async is_admin(username) {
    let profile = await this.get_user_profile(username)
    return this.admins.has(profile)
  }

  has_cache() {
    return this.cache.length > 0
  }

  async send_message(message) {
    this.cache.add(message)
    let chat = await this.browser.$('.chat__Input')
    await chat.setValue(message)
    let send = await this.browser.$('.chat__InputSubmit')
    await send.click()
  }

  async capture_message() {
    let chat_messages = await this.browser.$$('.chat__Message')
    let username = ''
    let message = ''
    let id = ''
    if (chat_messages.length) {
      let chat_message = chat_messages.slice(-1)[0]
      let innerHTML = await chat_message.getHTML()
      id = chat_message.elementId
      try {
        if (innerHTML.includes('chat__MessageHandle')) {
          let handle = await chat_message.$('.chat__MessageHandle')
          username = await handle.getText()
        }
        let body = await chat_message.$('.chat__MessageBody')
        message = await body.getText()
      } catch (err) {
        if (this.debug) console.log(err)
      }
    }
    return {username: username, message: message, id: id}
  }

  has_user_account() {
    return this.username && this.password
  }

  async login() {
    if (this.has_user_account()) {
      await this.browser.url(this.login_url)
      let username = await this.browser.$('#username')
      await username.setValue(this.username)
      let password = await this.browser.$('#password')
      await password.setValue(this.password)
      let button = await this.browser.$('//button[text()="Log In"]')
      await button.click()
      console.log('\nLogging in to account ' + this.username)
    }
    return await this.connect()
  }

  async connect() {
    console.log(`\nConnecting to ${this.url}\n`)
    this.last_refresh = this.current_time()
    await this.browser.url(this.url)
    let nickname = await this.browser.$('.form__Input-inline')
    while (!nickname.error) {
      nickname = await this.browser.$('.form__Input-inline')
    }
    if (nickname) {
      await nickname.setValue(this.bot)
      let go = await this.browser.$('//button[text()="Go"]')
      await go.click()
      try {
        let close = await this.browser.$('//span[text()="Close cams"]')
        await close.click()
      } catch {
        console.log('\nNo open cameras found! Unable to close cams, will try again next refresh.')
      }
      try {
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
        this.logged_in = true
        console.log('\nLogin complete! Bot is ready to receive messages!')
      } catch {
        console.log(`\nFailed to login! ${this.bot} already in use? Refreshing...`)
        await this.force_refresh()
      }
    }
  }

  async reset_userlist() {
    await this.browser.execute(() => {document.getElementsByClassName('scrollarea-content')[1].style.marginTop = '0px'})
  }

  async scroll_userlist() {
    await this.browser.execute(() => {
      var viewers = Number(document.getElementsByClassName('cams__ViewerCount')[0].textContent)
      var userlist = document.getElementsByClassName('scrollarea-content')[1]
      var mt = Number(userlist.style.marginTop.replace('px', ''))-30
      if (mt > ((7*30)-(viewers*30))) {
        userlist.style.marginTop = mt+'px'
      } else {
        userlist.style.marginTop = '0px'
      }
    })
  }

  async click_username(username) {
    if (username && !this.is_bot(username)) {
      try {
        let user = await this.browser.$(`.userList__UserHandle=${username}`)
        if (!user.error) {
          await user.click()
        }
      } catch (err) {
        await this.scroll_userlist()
        await this.click_username(username)
      }
    }
  }

  async click_chat() {
    try {
      let chat = await this.browser.$('.chat__Input')
      await chat.click()
    } catch {
      console.log('\nTried to click .chat__Input but element not found. Refreshing page...')
      await this.refresh()
    }
  }


  async get_user_profile(username) {
    let profile = ''
    if (username) {
      await this.click_username(username)
      try {
        let check = await this.browser.$('//button[text()="Profile"]')
        if (!check.error) {
          profile = await this.browser.$('.dropdown__Option-header')
          if (!profile.error)
            profile = await profile.getText()
          else {
            profile = ''
          }
        }
      } catch(err) {
        if (this.debug) console.log(err)
        profile = ''
      }
      await this.click_chat()
    }
    return profile
  }

  async ban(username, notify=true) {
    if (username) {
      console.log('BANABNABNABNABNABNABNABNBANBANBANBANBANBA')
      await this.send_message(`${this.ban_command} ${username}`)
      if (notify) {
        await this.send_message(this.ban_message)
      }
    }
  }

  async unban(username, notify=true) {
    if (username) {
      await this.send_message(`${this.unban_command} ${username}`)
      if (notify) {
        await this.send_message(this.unban_message)
      }
    }
  }

  async close(username, notify=true) {
    if (username) {
      await this.send_message(`${this.close_command} ${username}`)
      if (notify) {
        await this.send_message(this.close_message)
      }
    }
  }

  async silence(username, notify=true) {
    if (username) {
      await this.send_message(`${this.silence_command} ${username}`)
      if (notify) {
        await this.send_message(this.silence_message)
      }
    }
  }

  async clear(notify=true) {
    await this.send_message(this.clear_command)
    if (notify) {
      await this.send_message(this.clear_message)
    }
  }

  async msg(username,message, notify=true) {
    if (username && message) {
      await this.send_message(`${this.msg_command} ${username} ${message}`)
      if (notify) {
        await this.send_message(this.msg_message)
      }
    }
  }

  async action(message, notify=true) {
    if (message) {
      await this.send_message(`${this.action_command} ${message}`)
      if (notify) {
        await this.send_message(this.action_message)
      }
    }
  }

  async nick(nickname, notify=true) {
    if (nickname) {
      await this.send_message(`${this.nick_command} ${nickname}`)
      this.bot = nickname
      this.update_config({bot: this.bot})
      if (notify) {
        await this.send_message(this.nick_message)
      }
    }
  }

  async color(color, notify=true) {
    if (color) {
      await this.send_message(`${this.color_command} ${color}`)
      if (notify) {
        await this.send_message(this.color_message)
      }
    }
  }

  has_vocabulary(name) {
    return this.vocabularies[name]
  }

  set_vocabulary(name) {
    if (this.has_vocabulary(name)) {
      this.vocabulary = this.vocabularies[name]
      this.cache = new Set()
    }
  }

  add_vocabulary(name, kwargs) {
    if (kwargs.file) {
      let file = fs.readFileSync(kwargs.file, 'utf8')
      let fname = kwargs.file.split('.')
      if (fname.slice(-1) == 'json') {
        kwargs.json = file
        this.vocabularies[name] = new MarkovText(kwargs)
      } else if (fname.slice(-1) == 'txt') {
        kwargs.corpus = file.split('\n')
        this.vocabularies[name] = new MarkovText(kwargs)
      } else {
        console.log(`Unknown vocabulary type for "${name}"`)
      }
    } else {
      console.log(`Vocabulary file not found for "${name}"`)
    }
  }

  async train_vocabulary(username, message, id) {
    if (username && message && this.last_message != id) {
      for (let name in this.vocabularies) {
        if (this.vocabularies[name].training) {
          if (!this.is_trained(name, username, message) && message.length > this.min_len) {
            await this.vocabularies[name].add_text(message, {username:username})
          }
        }
      }
    }
  }

  generate_message() {
  return this.vocabulary.make_sentence(this.max_len, {debug: this.debug, tries: this.max_tries, filter: this.cache, case_sensitive: this.case_sensitive})
  }

  generate_message_from(username, message) {
    return this.vocabulary.make_sentence_from(message, this.max_len, {debug: this.debug, tries: this.max_tries, similarity: this.similarity_score, filter: this.cache, username: username, case_sensitive: this.case_sensitive})
  }

  current_time() {
    return Number(Math.round(Date.now()))
  }

  save(kwargs={}) {
    let save = fs.writeFile
    if (kwargs.sync) save = fs.writeFileSync
    if ((this.current_time()-this.last_save > this.save_interval*60000) || kwargs.force) {
      this.last_save = this.current_time()
      for (let name in this.vocabularies) {
        if (this.vocabularies[name].training) {
          save(this.vocabularies[name].file, this.vocabularies[name].get_text(), 'utf8', (err) => {if (this.debug) console.log(err)})
        }
      }
    }
  }

  force_save() {
    this.save({force: true})
  }

  capture_action(message) {
    return {username: message.split(/\s+/)[1], message: message.split(/\s+/).slice(1).join(' ')}
  }

  async answer_to(username, message) {
    let text = this.generate_message_from(username, message)
    if (text) {
      this.cache.add(text)
      await this.send_message(text)
    }
  }

  wipe_cache(kwargs={}) {
    if ((this.current_time()-this.last_wipe > this.wipe_interval*60000) || kwargs.force) {
      this.last_wipe = this.current_time()
      this.cache = new Set()
    }
  }

  force_wipe() {
    this.wipe_cache({force: true})
  }

  async spam(text, amount) {
    for (let i=0; i < amount; i++) {
      await this.send_message(text)
    }
  }

  forget(text) {
    for (let name in this.vocabularies) {
      this.vocabularies[name].del_text(text)
    }
  }

  async check_for_triggers(username, message) {
    if (await this.is_target(username) || this.is_trigger(message)) {
      await this.answer_to(username, message)
      return true
    }
    return false
  }

  async check_for_banned(username, message) {
    let banned = await this.is_banned(username, message)
    if (banned) {
      await this.ban(username)
      if (banned == 2 && this.clear_banned) {
        await this.clear()
      }
      return true
    }
    return false
  }

  async check_for_cleared(username, message) {
    let cleared = await this.is_cleared(username, message)
    if (cleared) {
      await this.clear()
      return true
    }
    return false
  }

  async check_for_silenced(username, message) {
    let silenced = await this.is_silenced(username, message)
    if (silenced) {
      await this.silence(username)
      return true
    }
    return false
  }

  async check_for_closed() {
    let cam_handles = []
    try {
      cam_handles = await this.browser.$$('.cams__CamHandle')
    } catch(err) {
      if (this.debug) console.log(err)
    }
    for (let handle of cam_handles) {
      try {
        let username = await handle.getText()
        let profile = await this.get_user_profile(username)
        if (this.closed_users.has(username) || this.closed_users.has(profile))
          await this.close(username)
      } catch(err) {
        if (this.debug) console.log(err)
      }
    }
  }

  async refresh(kwargs={}) {
    if ((this.current_time()-this.last_refresh > this.refresh_interval*60000) || kwargs.force) {
      await this.connect()
    }
  }

  async force_refresh() {
    await this.refresh({force: true})
  }

  async add_banned(kwargs = {}) {
    if (!kwargs.users) kwargs.users = []
    if (!kwargs.words) kwargs.words = []
    for (let b of kwargs.users) {
      this.banned_users.add(b)
    }
    for (let b of kwargs.words) {
      this.banned_words.add(b)
    }
    this.update_config({banned_words: this.banned_words, banned_users: this.banned_users})
  }

  async del_banned(kwargs={}) {
    if (!kwargs.users) kwargs.users = []
    if (!kwargs.words) kwargs.words = []
    for (let b of kwargs.users) {
      this.banned_users.delete(b)
    }
    for (let b of kwargs.words) {
      this.banned_words.delete(b)
    }
    this.update_config({banned_words: this.banned_words, banned_users: this.banned_users})
  }

  add_cleared(kwargs={}) {
    if (!kwargs.users) kwargs.users = []
    if (!kwargs.words) kwargs.words = []
    for (let b of kwargs.users) {
      this.cleared_users.add(b)
    }
    for (let b of kwargs.words) {
      this.cleared_words.add(b)
    }
    this.update_config({cleared_words: this.cleared_words, cleared_users: this.cleared_users})
  }

  del_cleared(kwargs={}) {
    if (!kwargs.users) kwargs.users = []
    if (!kwargs.words) kwargs.words = []
    for (let b of kwargs.users) {
      this.cleared_users.delete(b)
    }
    for (let b of kwargs.words) {
      this.cleared_words.delete(b)
    }
    this.update_config({cleared_words: this.cleared_words, cleared_users: this.cleared_users})
  }

  add_silenced(kwargs={}) {
    if (!kwargs.users) kwargs.users = []
    if (!kwargs.words) kwargs.words = []
    for (let b of kwargs.users) {
      this.silenced_users.add(b)
    }
    for (let b of kwargs.words) {
      this.silenced_words.add(b)
    }
    this.update_config({silenced_words: this.silenced_words, silenced_users: this.silenced_users})
  }

  del_silenced(kwargs={}) {
    if (!kwargs.users) kwargs.users = []
    if (!kwargs.words) kwargs.words = []
    for (let b of kwargs.users) {
      this.silenced_users.delete(b)
    }
    for (let b of kwargs.words) {
      this.silenced_words.delete(b)
    }
    this.update_config({silenced_words: this.silenced_words, silenced_users: this.silenced_users})
  }

  add_closed(users) {
    if (!users) users = []
    for (let b of users) {
      this.closed_users.add(b)
    }
    this.update_config({closed_users: this.closed_users})
  }

  del_closed(users) {
    if (!users) users = []
    for (let b of users) {
      this.closed_users.delete(b)
    }
    this.update_config({closed_users: this.closed_users})
  }

  async check_for_routines() {
    this.wipe_cache()
    this.save()
    this.refresh()
  }

  check_name_change(username, message) {
    if (!username && message.includes(this.name_change)) {
      username = message.split(this.name_change)
      if (username.length == 2)
        username = username[1].trim()
    }
    return username
  }

  async check_for_command(username, message, id) {
    if (this.is_command(message)) {
      if (await this.is_admin(username)) {
        console.log(message)
        if (this.last_message != id) await this.try_command(username, message)
      } else {
        await this.send_message(this.deny_message)
      }
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
          if (this.exit) await this.shutdown()
          this.check_for_routines()
          await this.check_for_closed()
          let {username, message, id} = await this.capture_message()
          if (this.debug) console.log({username: username, message: message, id: id})
          if (!this.is_bot(username)) {
            let is_command = await this.check_for_command(username, message, id)
            if (!is_command) {
              if (this.is_action(username, message)) {
                let action = this.capture_action(message)
                username = action.username
                message = action.message
              }
              if (await this.filter_message(username, message)) {
                await this.check_for_triggers(username, message)
                this.train_vocabulary(username, message, id)
              } else if (this.has_user_account() && this.last_message != id) {
                username = this.check_name_change(username, message)
                if (!this.is_bot(username)) {
                  await this.check_for_banned(username, message)
                  await this.check_for_cleared(username, message)
                  await this.check_for_silenced(username, message)
                }
              }
            }
          }
          this.last_message = id
        }
      }
    } catch (err) {
      if (this.debug) console.log(err)
      await this.shutdown()
    }
  }

  shutdown() {
    console.log('\nSaving and shutting down!\n')
    this.save({ force: true, sync: true })
    this.browser.closeWindow()
    cd.stop()
    process.exit()
  }
}

module.exports=Crispy