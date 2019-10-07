/**
 * Crispy - An annoying bot.
 * Copyright (C) 2019  Guilherme Caulada (Sighmir)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import low = require("lowdb");
import FileSync = require("lowdb/adapters/FileSync");
import Markov, { MarkovGenerateOptions, MarkovResult } from "markov-strings";
import puppeteer, { Browser, Page } from "puppeteer";
import readline, { ReadLine } from "readline";
import io from "socket.io-client";
import { compareTwoStrings, findBestMatch } from "string-similarity";

export interface IJumpInMessage {
  [key: string]: any;
  handle: string;
  color: string;
  userId: string;
  message: string;
  timestamp: string;
  id: string;
  user: IJumpInUser | undefined;
}

export interface IJumpInUser {
  [key: string]: any;
  _id: string;
  handle: string;
  operator_id: string | undefined;
  user_id: string | undefined;
  username: string | undefined;
  isBroadcasting: boolean;
  assignedBy: string | undefined;
  isAdmin: boolean;
  isSupporter: boolean;
  userIcon: string | undefined;
  color: string;
}

export interface ICrispySensitivity {
  [key: string]: any;
  banned?: {
    users?: number;
    messages?: number;
    words?: number;
  };
  blocked?: number;
  ignored?: number;
  targets?: number;
  triggers?: number;
}

export interface ICrispyOptions {
  [key: string]: any;
  ban?: boolean;
  debug?: boolean;
  markov?: boolean;
  unique?: boolean;
  commands?: boolean;
  prefix?: string;
  cliPrefix?: string;
  cooldown?: number;
  stateSize?: number;
  minLength?: number;
  minMessages?: number;
  minScore?: number;
  maxTries?: number;
  maxAmount?: number;
  prng?: () => number;
  filter?: (result: MarkovResult) => boolean;
  puppeteer?: any;
  sensitivity?: ICrispySensitivity | number;
  similarity?: number;
  caseSensitive?: boolean;
}

export type CrispyCommand = (args: string[], data: IJumpInMessage) => void;
export type CrispyCliCommand = (args: string[]) => void;

export class Crispy {
  public user: any;
  public options: ICrispyOptions;

  private _db: any;
  private _api: string;
  private _url: string;
  private _token: string;
  private _room: string;
  private _commands: { [key: string]: CrispyCommand };
  private _cliCommands: { [key: string]: CrispyCliCommand };
  private _browser: Browser | undefined;
  private _cooldown: Set<string>;

  private _globalCorpus: any;
  private _userCorpus: { [index: string]: any };
  private _events: { [index: string]: string[] };
  private _io: SocketIOClient.Socket | undefined;
  private _rl: ReadLine | undefined;

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
    this._cliCommands = {};

    this._db.defaults({
      admins: [],
      banned: { messages: [], users: [], words: [] },
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

    if (this.options.markov == null) {
      this.options.markov = true;
    }

    if (this.options.ban == null) {
      this.options.ban = true;
    }

    if (this.options.sensitivity == null) {
      this.options.sensitivity = {};
    }

    if (typeof this.options.sensitivity === "number") {
      this.options.sensitivity = {
        banned: {
          messages: this.options.sensitivity,
          users: this.options.sensitivity,
          words: this.options.sensitivity,
        },
        blocked: this.options.sensitivity,
        ignored: this.options.sensitivity,
        targets: this.options.sensitivity,
        triggers: this.options.sensitivity,
      };
    }

    this.on("message", async (data: IJumpInMessage) => {
      try {
        const room = await this.getRoom();
        data.user = room.users.filter((u: any) => u.handle === data.handle)[0];
        if (data.user) {
          if (data.userId !== this.user._id) {
            if (this.options.commands && this.isCommand(data.message)) {
              const args = data.message.slice(1, data.message.length).split(/\s+/);
              const command = args.shift();
              if (command && this.hasCommand(command)) {
                this._commands[command](args, data);
              }
            } else if (
              this.options.ban && (
                this.checkBannedWord(data.message) ||
                this.checkBannedMessage(data.message) ||
                this.checkBannedUser(data.handle) ||
                (data.user.username && this.checkBannedUser(data.user.username))
              )
            ) {
              this.command("ban", data.handle);
            } else if (this.options.markov) {
              if (!(
                this.checkIgnored(data.message) ||
                this.checkBlocked(data.handle) ||
                (data.user.username && this.checkBlocked(data.user.username))
              )) {
                if (this.options.unique) {
                  this.addUniqueMessage(data.message, data.user.username || data.handle);
                } else {
                  this.addMessage(data.message, data.user.username || data.handle);
                }
              }
              if (
                this.checkTarget(data.handle) ||
                this.checkTrigger(data.message) ||
                (data.user.username && this.checkTarget(data.user.username))
              ) {
                let match = null;
                let messages = this.generateMessages(this.options.maxAmount, data.user.username || data.handle);
                if (messages.length) {
                  match = findBestMatch(data.message, messages.map((m) => m.string));
                  if (match.bestMatch.rating >= (this.options.similarity || 0)) {
                    this._cooldown.add(match.bestMatch.target);
                    this.message(match.bestMatch.target);
                  }
                } else {
                  messages = this.generateMessages(this.options.maxAmount);
                  if (messages.length) {
                    match = findBestMatch(data.message, messages.map((m) => m.string));
                    if (match.bestMatch.rating >= (this.options.similarity || 0)) {
                      this._cooldown.add(match.bestMatch.target);
                      this.message(match.bestMatch.target);
                    }
                  }
                }

                if (this.options.debug && match) {
                  console.log(Object.assign({}, match.bestMatch, messages[match.bestMatchIndex]));
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
        const room = await this.getRoom();
        data.user = room.users.filter((u: any) => u.handle === data.handle)[0];
        if (this.options.ban && (
          this.checkBannedUser(data.handle) ||
          (data.user.username && this.checkBannedUser(data.user.username))
        )) {
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

    if (this.options.cli === undefined ? true : this.options.cli) {
      this._rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      this._rl.on("line", (input) => {
        if (this.isCliCommand(input)) {
          const args = input.slice(1, input.length).split(/\s+/);
          const command = args.shift();
          if (command && this.hasCliCommand(command)) {
            this._cliCommands[command](args);
          }
        }
      });
    }

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
    return message;
  }

  public generateMessages(maxAmount: number = 10, user?: string, options = {} as MarkovGenerateOptions) {
    const messages = [] as MarkovResult[];

    options.filter = (result: MarkovResult) => {
      const filter = this.options.filter as (result: MarkovResult) => boolean;
      return filter(result) && !messages.map((m) => m.string).includes(result.string);
    };

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

  public isCliCommand(message: string) {
    return (this.options.cliPrefix || "/") === message[0];
  }

  public hasCliCommand(command: string) {
    return this._cliCommands[command] !== undefined;
  }

  public addCliCommand(command: string, handler: CrispyCliCommand) {
    this._cliCommands[command] = handler.bind(this);
  }

  public removeCliCommand(command: string) {
    delete this._cliCommands[command];
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
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const targets = this.getTargets();
    for (const h of targets) {
      if (compareTwoStrings(
        this.options.caseSensitive ? h : h.toLowerCase(),
        this.options.caseSensitive ? handle : handle.toLowerCase(),
      ) >= (1 - (sensitivity.targets || 0)) || (
        this.options.caseSensitive ? handle.includes(h) : handle.toLowerCase().includes(h.toLowerCase())
      )) {
        return true;
      }
    }
    return false;
  }

  public isTrigger(message: string) {
    return this._db.get("triggers").value().includes(message);
  }

  public getTriggers() {
    return this._db.get("triggers").value();
  }

  public setTriggers(messages: string[]) {
    return this._db.set("triggers", messages).write();
  }

  public addTrigger(message: string) {
    if (!this.isTrigger(message)) {
      return this._db.get("triggers").push(message).write();
    }
  }

  public addTriggers(messages: string[]) {
    for (const message of messages) {
      this.addTrigger(message);
    }
  }

  public removeTrigger(message: string) {
    return this._db.get("triggers").pull(message).write();
  }

  public removeTriggers(messages: string) {
    for (const message of messages) {
      this.removeTrigger(message);
    }
  }

  public checkTrigger(message: string) {
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const triggers = this.getTriggers();
    const words = message.split(/\s+/);
    for (const m of triggers) {
      for (const w of words) {
        if (compareTwoStrings(
          this.options.caseSensitive ? m : m.toLowerCase(),
          this.options.caseSensitive ? w : w.toLowerCase(),
        ) >= (1 - (sensitivity.triggers || 0)) || (
          this.options.caseSensitive ? w.includes(m) : w.toLowerCase().includes(m.toLowerCase())
        )) {
          return true;
        }
      }
    }
    return false;
  }

  public isIgnored(message: string) {
    return this._db.get("ignored").value().includes(message);
  }

  public getIgnored() {
    return this._db.get("ignored").value();
  }

  public setIgnored(messages: string[]) {
    return this._db.set("ignored", messages).write();
  }

  public addIgnored(message: string | string[]) {
    if (typeof message === "string") {
      if (!this.isIgnored(message)) {
        return this._db.get("ignored").push(message).write();
      }
    } else {
      for (const m of message) {
        this.addIgnored(m);
      }
    }
  }

  public removeIgnored(message: string | string[]) {
    if (typeof message === "string") {
      return this._db.get("ignored").pull(message).write();
    } else {
      for (const m of message) {
        this.removeIgnored(m);
      }
    }
  }

  public checkIgnored(message: string) {
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const ignored = this.getIgnored();
    const words = message.split(/\s+/);
    for (const m of ignored) {
      for (const w of words) {
        if (compareTwoStrings(
          this.options.caseSensitive ? m : m.toLowerCase(),
          this.options.caseSensitive ? w : w.toLowerCase(),
        ) >= (1 - (sensitivity.ignored || 0)) || (
          this.options.caseSensitive ? w.includes(m) : w.toLowerCase().includes(m.toLowerCase())
        )) {
          return true;
        }
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
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const blocked = this.getBlocked();
    for (const h of blocked) {
      if (compareTwoStrings(
        this.options.caseSensitive ? h : h.toLowerCase(),
        this.options.caseSensitive ? handle : handle.toLowerCase(),
      ) >= (1 - (sensitivity.blocked || 0)) || (
        this.options.caseSensitive ? handle.includes(h) : handle.toLowerCase().includes(h.toLowerCase())
      )) {
        return true;
      }
    }
    return false;
  }

  public isBannedUser(handle: string) {
    return this._db.get("banned.users").value().includes(handle);
  }

  public isBannedMessage(message: string) {
    return this._db.get("banned.messages").value().includes(message);
  }

  public isBannedWord(word: string) {
    return this._db.get("banned.words").value().includes(word);
  }

  public getBannedUsers() {
    return this._db.get("banned.users").value();
  }

  public getBannedMessages() {
    return this._db.get("banned.messages").value();
  }

  public getBannedWords() {
    return this._db.get("banned.words").value();
  }

  public setBannedUsers(handles: string[]) {
    return this._db.set("banned.users", handles).write();
  }

  public setBannedMessages(messages: string[]) {
    return this._db.set("banned.messages", messages).write();
  }

  public setBannedWords(words: string[]) {
    return this._db.set("banned.words", words).write();
  }

  public addBannedUser(handle: string) {
    if (!this.isBannedUser(handle)) {
      return this._db.get("banned.users").push(handle).write();
    }
  }

  public addBannedUsers(handles: string[]) {
    for (const h of handles) {
      this.addBannedUser(h);
    }
  }

  public addBannedMessage(message: string) {
    if (!this.isBannedMessage(message)) {
      return this._db.get("banned.messages").push(message).write();
    }
  }

  public addBannedMessages(messages: string[]) {
    for (const m of messages) {
      this.addBannedMessage(m);
    }
  }

  public addBannedWord(word: string) {
    if (!this.isBannedWord(word)) {
      return this._db.get("banned.words").push(word).write();
    }
  }

  public addBannedWords(words: string[]) {
    for (const w of words) {
      this.addBannedWord(w);
    }
  }

  public removeBannedUser(handle: string) {
    return this._db.get("banned.users").pull(handle).write();
  }

  public removeBannedUsers(handle: string[]) {
    for (const h of handle) {
      this.removeBannedUser(h);
    }
  }

  public removeBannedMessage(message: string) {
    return this._db.get("banned.messages").pull(message).write();
  }

  public removeBannedMessages(messages: string[]) {
    for (const m of messages) {
      this.removeBannedMessage(m);
    }
  }

  public removeBannedWord(word: string) {
    return this._db.get("banned.words").pull(word).write();
  }

  public removeBannedWords(words: string[]) {
    for (const w of words) {
      this.removeBannedWord(w);
    }
  }

  public checkBannedUser(handle: string) {
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const banSensitivity = sensitivity.banned || {};
    const banned = this.getBannedUsers();
    for (const h of banned) {
      if (compareTwoStrings(
        this.options.caseSensitive ? h : h.toLowerCase(),
        this.options.caseSensitive ? handle : handle.toLowerCase(),
      ) >= (1 - (banSensitivity.users || 0)) || (
        this.options.caseSensitive ? handle.includes(h) : handle.toLowerCase().includes(h.toLowerCase())
      )) {
        return true;
      }
    }
    return false;
  }

  public checkBannedMessage(message: string) {
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const banSensitivity = sensitivity.banned || {};
    const banned = this.getBannedMessages();
    for (const m of banned) {
      if (compareTwoStrings(
        this.options.caseSensitive ? m : m.toLowerCase(),
        this.options.caseSensitive ? message : message.toLowerCase(),
      ) >= (1 - (banSensitivity.messages || 0)) || (
        this.options.caseSensitive ? message.includes(m) : message.toLowerCase().includes(m.toLowerCase())
      )) {
        return true;
      }
    }
    return false;
  }

  public checkBannedWord(message: string) {
    const sensitivity = this.options.sensitivity as ICrispySensitivity;
    const banSensitivity = sensitivity.banned || {};
    const banned = this.getBannedWords();
    const words = message.split(/\s+/);
    for (const m of banned) {
      for (const w of words) {
        if (compareTwoStrings(
          this.options.caseSensitive ? m : m.toLowerCase(),
          this.options.caseSensitive ? w : w.toLowerCase(),
        ) >= (1 - (banSensitivity.words || 0)) || (
          this.options.caseSensitive ? w.includes(m) : w.toLowerCase().includes(m.toLowerCase())
        )) {
          return true;
        }
      }
    }
    return false;
  }

  public markovFilter(result: MarkovResult) {
    return result.string.length >= (this.options.minLength || 0) &&
      result.string.split(" ").length >= (this.options.minMessages || 0) &&
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
          this._browser = await puppeteer.launch(this.options.puppeteer);
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
