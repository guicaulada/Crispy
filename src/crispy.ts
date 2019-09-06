/**
 * Crispy - An annoying bot.
 * Copyright (C) 2018  Guilherme Caulada (Sighmir)
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
import request from "request";
import io from "socket.io-client";

export interface ICrispyOptions {
  [key: string]: any;
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

export interface IJumpinMessage {
  [key: string]: string;
  handle: string;
  color: string;
  userId: string;
  message: string;
  timestamp: string;
  id: string;
}

export type CrispyCommand = (args: string[], data: IJumpinMessage) => void;

export class Crispy {
  public db: any;
  public user: any;
  public options: ICrispyOptions;
  public cooldown: Set<string>;
  public commands: { [key: string]: CrispyCommand};

  private _api: string;
  private _url: string;
  private _token: string;
  private _room: string;
  private _cors: string;
  private _headers: { [index: string]: any };

  private _globalCorpus: any;
  private _userCorpus: { [index: string]: any };
  private _events: { [index: string]: string[] };
  private _io: SocketIOClient.Socket | undefined;

  constructor(token: string, options = {} as ICrispyOptions) {
    this.user = {};
    this.commands = {};
    this.options = options;
    this.cooldown = new Set();
    this.db = low(new FileSync("db.json"));
    this.db.defaults({ admins: [], messages: [] }).write();
    this._room = "";
    this._cors = "https://cors-anywhere.herokuapp.com/";
    this._api = "https://jumpin.chat/api";
    this._url = "https://jumpin.chat";
    this._token = token;
    this._userCorpus = {};
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

    this.on("message", async (data: IJumpinMessage) => {
      if (data.handle !== this.user.handle) {
        let room;
        try {
          room = await this.getRoom(this.room);
        } catch {
          // Failed to get room info (WIP)
        } finally {
          if (room) {
            const user = room.users.filter((u: any) => u.handle === data.handle)[0];
            if (user && user.username && this.isAdmin(user.username)) {
              if ((this.options.prefix || "!") === data.message[0]) {
                const args = data.message.slice(1, data.message.length).split(/\s+/);
                const command = args.shift();
                for (const cmd in this.commands) {
                  if (command === cmd) {
                    this.commands[cmd](args, data);
                    break;
                  }
                }
              }
            }
          }
        }
      }
    });

    this._headers = {
      Origin: this._url,
    };

    this._initCorpus();
    setInterval(this.cleanCooldown, (this.options.cooldown || 5) * 1000 * 60);
  }

  get room() {
    return this._room;
  }

  get io() {
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

  public getEventPrefix(eventName: string) {
    for (const prefix in this._events) {
      if (this._events[prefix].includes(eventName)) {
        return prefix;
      }
    }
    return null;
  }

  public connect() {
    return new Promise((resolve, reject) => {
      this.io.on("connect", (e: any) => {
        resolve(e);
        this.on("handleChange", (c: any) => {
          this.user.handle = c.handle;
        });

        this.on("join", (j: any) => {
          this.user = j.user;
        });
      });
      this.io.on("error", (e: any) => {
        reject(e);
      });
    });
  }

  public join(room: string, user?: object) {
    this._room = room;
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

  public isStillJoined(room: string) {
    return this.io.emit("room::isStillJoined", { room });
  }

  public message(room: string, message: string) {
    return this.io.emit("room::message", { room, message });
  }

  public command(room: string, command: string, value?: string) {
    return this.io.emit("room::command", { room, message: { command, value } });
  }

  public on(event: string, handler: (data?: any) => void) {
    const prefix = this.getEventPrefix(event);
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
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + "/user", {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getUserProfile(userId: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/user/${userId}/profile`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getUnreadMessages(userId: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/message/${userId}/unread`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public checkCanBroadcast(room: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/user/checkCanBroadcast/${room}`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getRoom(room: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/rooms/${room}`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getRoomEmojis(room: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/rooms/${room}/emoji`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getRoomPlaylist(room: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/youtube/${room}/playlist`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public searchYoutube(query: string) {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + `/youtube/search/${query}`, {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getTurnServer() {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + "/turn", {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getJanusToken() {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + "/janus/token", {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public getJanusEndpoints() {
    return new Promise((resolve, reject) => {
      request.get(this._cors + this._api + "/janus/endpoints", {
        headers: this._headers,
      }, this._requestPromise(resolve, reject));
    }) as any;
  }

  public addUniqueMessage(message: string, user?: string) {
    if (!this.db.get("messages").has({ user, message }).value()) {
      this.db.get("messages").push({ user, message }).write();
      return true;
    }
    return false;
  }

  public hasMessage(message: string) {
    return this.db.get("messages").has({ message }).value();
  }

  public addMessage(message: string, user?: string) {
    this.db.get("messages").push({ user, message }).write();
    this._buildCorpus(user);
  }

  public getMessages(user?: string) {
    if (user) {
      return this.db.get("messages").filter({ user }).map("message").value();
    } else {
      return this.db.get("messages").map("message").value();
    }
  }

  public removeMessage(message: string, user?: string) {
    if (user) {
      return this.db.get("messages").remove({ message }).write();
    } else {
      return this.db.get("messages").remove({ message, user }).write();
    }
  }

  public hasUser(user: string) {
    return this.db.get("messages").has({ user }).value();
  }

  public getUsers() {
    return this.db.get("messages").map("user").uniq().value();
  }

  public removeUser(user: string) {
    return this.db.get("messages").remove({ user }).write();
  }

  public isAdmin(username: string) {
    return this.db.get("admins").has(username).value();
  }

  public setAdmins(usernames: string[]) {
    return this.db.set("admins", usernames).write();
  }

  public addAdmin(username: string) {
    return this.db.get("admins").push(username).write();
  }

  public removeAdmin(username: string) {
    return this.db.get("admins").remove(username).write();
  }

  public hasCommand(command: string) {
    return this.commands[command] !== undefined;
  }

  public addCommand(command: string, handler: CrispyCommand) {
    this.commands[command] = handler.bind(this);
  }

  public removeCommand(command: string) {
    delete this.commands[command];
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
    this.cooldown.add(message.string);
    return message;
  }

  public cleanCooldown() {
    this.cooldown = new Set();
  }

  public markovFilter(result: MarkovResult) {
    return result.string.length >= (this.options.minLength || 0) &&
      result.string.split(" ").length >= (this.options.minWords || 0) &&
      !result.refs.map((o) => o.string).includes(result.string) &&
      result.score >= (this.options.minScore || 0) &&
      !this.cooldown.has(result.string);
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

  private _requestPromise(resolve: any, reject: any) {
    return (err: any, res: any, body: any) => {
      if (err) {
        return reject(err);
      } else {
        if (`${res.statusCode}`[0] !== "2") {
          return reject({ statusCode: res.statusCode, statusMessage: res.statusMessage });
        }
        return resolve(body);
      }
    };
  }
}
