/**
 * Crispy - An annoying bot.
 * Copyright (C) 2019  Guilherme Caulada (Sighmir)
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import low = require("lowdb");
import FileSync = require("lowdb/adapters/FileSync");
import Markov, { MarkovGenerateOptions, MarkovResult } from "markov-strings";
import puppeteer, { Browser, Page } from "puppeteer";
import io from "socket.io-client";

export interface IJumpInMessage {
  [key: string]: string;
  handle: string;
  color: string;
  userId: string;
  message: string;
  timestamp: string;
  id: string;
}

export interface ICrispyOptions {
  [key: string]: any;
  ban?: boolean;
  debug?: boolean;
  target?: boolean;
  unique?: boolean;
  commands?: boolean;
  headless?: boolean;
  prefix?: string;
  cooldown?: number;
  stateSize?: number;
  minLength?: number;
  minWords?: number;
  minScore?: number;
  maxTries?: number;
  prng?: () => number;
  filter?: (result: MarkovResult) => boolean;
}

export type CrispyCommand = (args: string[], data: IJumpInMessage) => void;

export class Crispy {
  public user: any;
  public options: ICrispyOptions;

  private _db: any;
  private _api: string;
  private _url: string;
  private _token: string;
  private _room: string;
  private _commands: { [key: string]: CrispyCommand };
  private _browser: Browser | undefined;
  private _cooldown: Set<string>;

  private _globalCorpus: any;
  private _userCorpus: { [index: string]: any };
  private _events: { [index: string]: string[] };
  private _io: SocketIOClient.Socket | undefined;

  constructor(token: string, options = {} as ICrispyOptions) {
    this.user = {};
    this.options = options;
    this._cooldown = new Set();
    this._db = low(new FileSync("db.json"));
    this._room = "";
    this._api = "https://jumpin.chat/api";
    this._url = "https://jumpin.chat";
    this._token = token;
    this._commands = {};
    this._userCorpus = {};

    this._db.defaults({
      admins: [],
      banned: [],
      blocked: [],
      ignored: [],
      messages: [],
      targets: [],
      triggers: [],
    }).write();

    this._events = {
      client: [
        "stillConnected",
        "handleChange",
        "error",
      ],
      room: [
        "updateIgnore",
        "handleChange",
        "status",
        "message",
        "disconnect",
        "updateUserList",
        "updateUser",
      ],
      self: [
        "join",
      ],
      youtube: [
        "play",
        "playvideo",
        "playlistUpdate",
      ],
    };

    if (!this.options.prng) {
      this.options.prng = this._prng.bind(this);
    }

    if (!this.options.filter) {
      this.options.filter = this.markovFilter.bind(this);
    }

    if (this.options.commands == null) {
      this.options.commands = true;
    }

    if (this.options.unique == null) {
      this.options.unique = true;
    }

    if (this.options.target == null) {
      this.options.target = true;
    }

    if (this.options.ban == null) {
      this.options.ban = true;
    }

    this.on("message", async (data: IJumpInMessage) => {
      try {
        if (data.userId !== this.user._id &&
          !await this.checkBlocked(data.handle) &&
          !this.checkIgnored(data.message)
        ) {
          if (this.options.commands && this.isCommand(data.message)) {
            const args = data.message.slice(1, data.message.length).split(/\s+/);
            const command = args.shift();
            for (const cmd in this._commands) {
              if (command === cmd) {
                this._commands[cmd](args, data);
                break;
              }
            }
          } else if (
            this.options.ban &&
            (await this.checkBanned(data.handle) || await this.checkBanned(data.message))
          ) {
            this.command("ban", data.handle);
          } else if (this.options.target) {
            if (this.options.unique) {
              this.addUniqueMessage(data.message, data.handle);
            } else {
              this.addMessage(data.message, data.handle);
            }
            if (await this.checkTarget(data.handle) || this.checkTrigger(data.message)) {
              try {
                const message = this.generateMessage(data.handle);
                this.message(message.string);
                if (this.options.debug) {
                  console.log(message);
                }
              } catch {
                try {
                  const message = this.generateMessage();
                  this.message(message.string);
                  if (this.options.debug) {
                    console.log(message);
                  }
                } catch (err) {
                  if (this.options.debug) {
                    console.log(err.message);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        if (this.options.debug) {
          console.error(err);
        }
      }
    });

    this.on("handleChange", (data: any) => {
      this.user.handle = data.handle;
    });

    this.on("room::handleChange", async (data: any) => {
      if (data.userId !== this.user._id) {
        if (this.options.ban && await this.checkBanned(data.handle)) {
          this.command("ban", data.handle);
        }
      }
    });

    this.on("join", (j: any) => {
      this.user = j.user;
    });

    this.io.on("error", (err: any) => {
      if (this.options.debug) {
        console.error(err);
      }
    });

    this._initCorpus();

    const cooldownTimeout = () => {
      if (this.options.cooldown !== 0) {
        this.cleanCooldown();
      }
      setTimeout(cooldownTimeout.bind(this), (this.options.cooldown || 5) * 1000 * 60);
    };

    setTimeout(cooldownTimeout.bind(this), (this.options.cooldown || 5) * 1000 * 60);
    setInterval(this.isStillJoined.bind(this), 1000 * 60);
  }

  get room() {
    return this._room;
  }

  private get io() {
    if (this._io) {
      if (this._io.disconnected) {
        this._io.connect();
      }
      return this._io;
    } else {
      this._io = io.connect(this._url, { query: { token: this._token } });
      return this._io;
    }
  }

  public join(room: string, user?: object) {
    this._room = room;
    this._getPage(this._url + "/" + room).then((page: any) => {
      page.waitForSelector(".chat").then(() => page.close()).catch();
    }).catch();
    return this.io.emit("room::join", { room, user });
  }

  public getIgnoreList(roomName: string) {
    return this.io.emit("room::getIgnoreList", { roomName });
  }

  public checkYoutube(notify = true) {
    return this.io.emit("youtube::checkisplaying", { notify });
  }

  public handleChange(handle: string) {
    return this.io.emit("room::handleChange", { handle });
  }

  public isStillJoined() {
    return this.io.emit("room::isStillJoined", { room: this.room });
  }

  public message(message: string) {
    return this.io.emit("room::message", { room: this.room, message });
  }

  public command(command: string, value?: string) {
    return this.io.emit("room::command", { room: this.room, message: { command, value } });
  }

  public on(event: string, handler: (data?: any) => void) {
    const prefix = this._getEventPrefix(event);
    if (prefix) {
      return this.io.on(`${prefix}::${event}`, handler);
    } else {
      return this.io.on(event, handler);
    }
  }

  public emit(event: string, data?: any) {
    this.io.emit(event, data);
  }

  public getCurrentUser() {
    return this._getPageContent(this._api + "/user") as any;
  }

  public getUserProfile(userId: string) {
    return this._getPageContent(this._api + `/user/${userId}/profile`) as any;
  }

  public getUnreadMessages(userId: string) {
    return this._getPageContent(this._api + `/message/${userId}/unread`) as any;
  }

  public checkCanBroadcast() {
    return this._getPageContent(this._api + `/user/checkCanBroadcast/${this.room}`) as any;
  }

  public getRoom() {
    return this._getPageContent(this._api + `/rooms/${this.room}`) as any;
  }

  public getRoomEmojis() {
    return this._getPageContent(this._api + `/rooms/${this.room}/emoji`) as any;
  }

  public getRoomPlaylist() {
    return this._getPageContent(this._api + `/youtube/${this.room}/playlist`) as any;
  }

  public searchYoutube(query: string) {
    return this._getPageContent(this._api + `/youtube/search/${query}`) as any;
  }

  public getTurnServer() {
    return this._getPageContent(this._api + "/turn") as any;
  }

  public getJanusToken() {
    return this._getPageContent(this._api + "/janus/token") as any;
  }

  public getJanusEndpoints() {
    return this._getPageContent(this._api + "/janus/endpoints") as any;
  }

  public addUniqueMessage(message: string | { message: string, user?: string }, user?: string) {
    if (!this.hasMessage(message, user)) {
      this.addMessage(message, user);
      return true;
    }
    return false;
  }

  public addUniqueMessages(messages: Array<string | { message: string, user?: string }>) {
    for (const message of messages) {
      if (!this.hasMessage(message)) {
        this.addMessage(message);
      }
    }
  }

  public hasMessage(message: string | { message: string, user?: string }, user?: string) {
    if (typeof message === "object") {
      return this._db.get("messages").filter(message).size().value() > 0;
    }
    if (user) {
      return this._db.get("messages").filter({ user, message}).size().value() > 0;
    }
    return this._db.get("messages").filter({ message }).size().value() > 0;
  }

  public addMessage(message: string | { message: string, user?: string }, user?: string) {
    if (typeof message === "object") {
      this._db.get("messages").push(message).write();
      this._buildCorpus(message.user);
    } else {
      if (user) {
        this._db.get("messages").push({ user, message }).write();
        this._buildCorpus(user);
      } else {
        this._db.get("messages").push({ message }).write();
        this._buildCorpus();
      }
    }
  }

  public addMessages(messages: Array<{message: string, user?: string}>) {
    for (const message of messages) {
      this.addMessage(message);
    }
  }

  public getMessages(user?: string) {
    if (user) {
      return this._db.get("messages").filter({ user }).map("message").value();
    } else {
      return this._db.get("messages").map("message").value();
    }
  }

  public removeMessage(message: string | { message: string, user?: string }, user?: string) {
    if (typeof message === "object") {
      this._db.get("messages").remove(message).write();
      this._buildCorpus(message.user);
    } else {
      if (user) {
        this._db.get("messages").remove({ message, user }).write();
        this._buildCorpus(user);
      } else {
        this._db.get("messages").remove({ message }).write();
        this._buildCorpus();
      }
    }
  }

  public removeMessages(messages: Array<{ message: string, user?: string }>) {
    for (const message of messages) {
      this.removeMessage(message);
    }
  }

  public generateMessage(user?: string, options = {} as MarkovGenerateOptions) {
    if (!options.maxTries) {
      options.maxTries = this.options.maxTries;
    }

    if (!options.prng) {
      options.prng = this.options.prng;
    }

    if (!options.filter) {
      options.filter = this.options.filter;
    }

    let message;
    if (user) {
      message = this._userCorpus[user].generate(options);
    } else {
      message = this._globalCorpus.generate(options);
    }
    this._cooldown.add(message.string);
    return message;
  }

  public generateMessages(maxAmount: number = 10, user?: string, options = {} as MarkovGenerateOptions) {
    const messages = [];
    for (let i = 0; i < maxAmount; i++) {
      try {
        messages.push(this.generateMessage(user, options));
      } catch (e) {
        // ignore
      }
    }
    return messages;
  }

  public hasUser(user: string) {
    return this._db.get("messages").filter({ user }).size().value() > 0;
  }

  public getUsers() {
    return this._db.get("messages").map("user").uniq().value();
  }

  public removeUser(user: string) {
    return this._db.get("messages").remove({ user }).write();
  }

  public removeUsers(users: string[]) {
    for (const user of users) {
      this.removeUser(user);
    }
  }

  public isAdmin(username: string) {
    return this._db.get("admins").value().includes(username);
  }

  public getAdmins() {
    return this._db.get("admins").value();
  }

  public setAdmins(usernames: string[]) {
    return this._db.set("admins", usernames).write();
  }

  public addAdmin(username: string) {
    if (!this.isAdmin(username)) {
      return this._db.get("admins").push(username).write();
    }
  }

  public addAdmins(usernames: string[]) {
    for (const username of usernames) {
      this.addAdmin(username);
    }
  }

  public removeAdmin(username: string) {
    return this._db.get("admins").pull(username).write();
  }

  public removeAdmins(usernames: string[]) {
    for (const username of usernames) {
      this.removeAdmin(username);
    }
  }

  public checkAdmin(handle: string) {
    return new Promise(async (resolve, reject) => {
      try {
        const room = await this.getRoom();
        const user = room.users.filter((u: any) => u.handle === handle)[0];
        resolve(this.isAdmin(user.username));
      } catch (err) {
        reject(err);
      }
    });
  }

  public isCommand(message: string) {
    return (this.options.prefix || "!") === message[0];
  }

  public hasCommand(command: string) {
    return this._commands[command] !== undefined;
  }

  public addCommand(command: string, handler: CrispyCommand) {
    this._commands[command] = handler.bind(this);
  }

  public removeCommand(command: string) {
    delete this._commands[command];
  }

  public isTarget(handle: string) {
    return this._db.get("targets").value().includes(handle);
  }

  public getTargets() {
    return this._db.get("targets").value();
  }

  public setTargets(handles: string[]) {
    return this._db.set("targets", handles).write();
  }

  public addTarget(handle: string) {
    if (!this.isTarget(handle)) {
      return this._db.get("targets").push(handle).write();
    }
  }

  public addTargets(handles: string[]) {
    for (const handle of handles) {
      this.addTarget(handle);
    }
  }

  public removeTarget(handle: string) {
    return this._db.get("targets").pull(handle).write();
  }

  public removeTargets(handles: string) {
    for (const handle of handles) {
      this.removeTarget(handle);
    }
  }

  public checkTarget(handle: string) {
    return new Promise(async (resolve, reject) => {
      if (this.isTarget(handle)) {
        return resolve(true);
      }
      try {
        const room = await this.getRoom();
        const user = room.users.filter((u: any) => u.handle === handle)[0];
        resolve(this.isTarget(user.username));
      } catch (err) {
        reject(err);
      }
    });
  }

  public isTrigger(word: string) {
    return this._db.get("triggers").value().includes(word);
  }

  public getTriggers() {
    return this._db.get("triggers").value();
  }

  public setTriggers(words: string[]) {
    return this._db.set("triggers", words).write();
  }

  public addTrigger(word: string) {
    if (!this.isTrigger(word)) {
      return this._db.get("triggers").push(word).write();
    }
  }

  public addTriggers(words: string[]) {
    for (const word of words) {
      this.addTrigger(word);
    }
  }

  public removeTrigger(word: string) {
    return this._db.get("triggers").pull(word).write();
  }

  public removeTriggers(words: string) {
    for (const word of words) {
      this.removeTrigger(word);
    }
  }

  public checkTrigger(message: string) {
    const triggers = this.getTriggers();
    for (const word of triggers) {
      if (message.includes(word)) {
        return true;
      }
    }
    return false;
  }

  public isIgnored(word: string) {
    return this._db.get("ignored").value().includes(word);
  }

  public getIgnored() {
    return this._db.get("ignored").value();
  }

  public setIgnored(words: string[]) {
    return this._db.set("ignored", words).write();
  }

  public addIgnored(word: string | string[]) {
    if (typeof word === "string") {
      if (!this.isIgnored(word)) {
        return this._db.get("ignored").push(word).write();
      }
    } else {
      for (const w of word) {
        this.addIgnored(w);
      }
    }
  }

  public removeIgnored(word: string | string[]) {
    if (typeof word === "string") {
      return this._db.get("ignored").pull(word).write();
    } else {
      for (const w of word) {
        this.removeIgnored(w);
      }
    }
  }

  public checkIgnored(message: string) {
    const ignored = this.getIgnored();
    for (const word of ignored) {
      if (message.includes(word)) {
        return true;
      }
    }
    return false;
  }

  public isBlocked(handle: string) {
    return this._db.get("blocked").value().includes(handle);
  }

  public getBlocked() {
    return this._db.get("blocked").value();
  }

  public setBlocked(handles: string[]) {
    return this._db.set("blocked", handles).write();
  }

  public addBlocked(handle: string | string[]) {
    if (typeof handle === "string") {
      if (!this.isBlocked(handle)) {
        return this._db.get("blocked").push(handle).write();
      }
    } else {
      for (const h of handle) {
        this.addBlocked(h);
      }
    }
  }

  public removeBlocked(handle: string | string[]) {
    if (typeof handle === "string") {
      return this._db.get("blocked").pull(handle).write();
    } else {
      for (const h of handle) {
        this.removeBlocked(h);
      }
    }
  }

  public checkBlocked(handle: string) {
    return new Promise(async (resolve, reject) => {
      if (this.isBlocked(handle)) {
        return resolve(true);
      }
      try {
        const room = await this.getRoom();
        const user = room.users.filter((u: any) => u.handle === handle)[0];
        resolve(this.isBlocked(user.username));
      } catch (err) {
        reject(err);
      }
    });
  }

  public isBanned(handle: string) {
    return this._db.get("banned").value().includes(handle);
  }

  public getBanned() {
    return this._db.get("banned").value();
  }

  public setBanned(handles: string[]) {
    return this._db.set("banned", handles).write();
  }

  public addBanned(handle: string | string[]) {
    if (typeof handle === "string") {
      if (!this.isBanned(handle)) {
        return this._db.get("banned").push(handle).write();
      }
    } else {
      for (const h of handle) {
        this.addBanned(h);
      }
    }
  }

  public removeBanned(handle: string | string[]) {
    if (typeof handle === "string") {
      return this._db.get("banned").pull(handle).write();
    } else {
      for (const h of handle) {
        this.removeBanned(h);
      }
    }
  }

  public checkBanned(handleOrMessage: string) {
    return new Promise(async (resolve, reject) => {
      const words = handleOrMessage.split(/\s+/);
      if (words.length > 1) {
        const message = handleOrMessage;
        const banned = this.getBanned();
        for (const word of banned) {
          if (message.includes(word)) {
            return resolve(true);
          }
        }
        resolve(false);
      } else {
        const handle = handleOrMessage;
        if (this.isBanned(handle)) {
          return resolve(true);
        }
        try {
          const room = await this.getRoom();
          const user = room.users.filter((u: any) => u.handle === handle)[0];
          if (user) {
            resolve(this.isBanned(user.username));
          } else {
            resolve(false);
          }
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  public markovFilter(result: MarkovResult) {
    return result.string.length >= (this.options.minLength || 0) &&
      result.string.split(" ").length >= (this.options.minWords || 0) &&
      !result.refs.map((o) => o.string).includes(result.string) &&
      result.score >= (this.options.minScore || 0) &&
      !this._cooldown.has(result.string);
  }

  public cleanCooldown() {
    this._cooldown = new Set();
  }

  public get(...args: any[]) {
    return this._db.get(...args);
  }

  public set(...args: any[]) {
    return this._db.set(...args);
  }

  private _getEventPrefix(eventName: string) {
    for (const prefix in this._events) {
      if (this._events[prefix].includes(eventName)) {
        return prefix;
      }
    }
    return null;
  }

  private _prng() {
    return (Math.random() * (new Date()).getTime()) % 1;
  }

  private _initCorpus() {
    this._buildCorpus();
    for (const user of this.getUsers()) {
      this._buildCorpus(user);
    }
  }

  private _buildCorpus(user?: string) {
    const messages = this.getMessages(user);
    if (messages.length > 0) {
      if (user) {
        this._userCorpus[user] = new Markov(messages, { stateSize: this.options.stateSize });
        this._userCorpus[user].buildCorpus();
      } else {
        this._globalCorpus = new Markov(messages, { stateSize: this.options.stateSize });
        this._globalCorpus.buildCorpus();
      }
    }
  }

  private _getBrowser() {
    return new Promise(async (resolve, reject) => {
      if (this._browser) {
        resolve(this._browser);
      } else {
        try {
          this._browser = await puppeteer.launch({
            headless: this.options.headless != null ? this.options.headless : true,
          });
          resolve(this._browser);
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  private _getPage(url?: any) {
    return new Promise(async (resolve, reject) => {
      try {
        const browser = await this._getBrowser() as any;
        const page = await browser.newPage() as Page;
        await page.goto(url || "about:blank");
        await page.waitForSelector("body");
        resolve(page);
      } catch (err) {
        reject(err);
      }
    });
  }

  private _getPageContent(url?: any) {
    return new Promise(async (resolve, reject) => {
      try {
        const page = await this._getPage(url) as Page;
        const content = await page.evaluate(() => document.body.textContent);
        page.close();
        if (!content || (content && content.includes("HTTP ERROR"))) {
          reject(content);
        } else {
          try {
            resolve(JSON.parse(content));
          } catch {
            resolve(content);
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}
