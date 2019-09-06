"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const markov_strings_1 = __importDefault(require("markov-strings"));
const request_1 = __importDefault(require("request"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
class Crispy {
    constructor(token, options = {}) {
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
        this.on("message", async (data) => {
            if (data.handle !== this.user.handle) {
                let room;
                try {
                    room = await this.getRoom(this.room);
                }
                catch {
                }
                finally {
                    if (room) {
                        const user = room.users.filter((u) => u.handle === data.handle)[0];
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
        }
        else {
            this._io = socket_io_client_1.default.connect(this._url, { query: { token: this._token } });
            return this._io;
        }
    }
    getEventPrefix(eventName) {
        for (const prefix in this._events) {
            if (this._events[prefix].includes(eventName)) {
                return prefix;
            }
        }
        return null;
    }
    connect() {
        return new Promise((resolve, reject) => {
            this.io.on("connect", (e) => {
                resolve(e);
                this.on("handleChange", (c) => {
                    this.user.handle = c.handle;
                });
                this.on("join", (j) => {
                    this.user = j.user;
                });
            });
            this.io.on("error", (e) => {
                reject(e);
            });
        });
    }
    join(room, user) {
        this._room = room;
        return this.io.emit("room::join", { room, user });
    }
    getIgnoreList(roomName) {
        return this.io.emit("room::getIgnoreList", { roomName });
    }
    checkYoutube(notify = true) {
        return this.io.emit("youtube::checkisplaying", { notify });
    }
    handleChange(handle) {
        return this.io.emit("room::handleChange", { handle });
    }
    isStillJoined(room) {
        return this.io.emit("room::isStillJoined", { room });
    }
    message(room, message) {
        return this.io.emit("room::message", { room, message });
    }
    command(room, command, value) {
        return this.io.emit("room::command", { room, message: { command, value } });
    }
    on(event, handler) {
        const prefix = this.getEventPrefix(event);
        if (prefix) {
            return this.io.on(`${prefix}::${event}`, handler);
        }
        else {
            return this.io.on(event, handler);
        }
    }
    emit(event, data) {
        this.io.emit(event, data);
    }
    getCurrentUser() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + "/user", {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getUserProfile(userId) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/user/${userId}/profile`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getUnreadMessages(userId) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/message/${userId}/unread`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    checkCanBroadcast(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/user/checkCanBroadcast/${room}`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getRoom(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/rooms/${room}`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getRoomEmojis(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/rooms/${room}/emoji`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getRoomPlaylist(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/youtube/${room}/playlist`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    searchYoutube(query) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + `/youtube/search/${query}`, {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getTurnServer() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + "/turn", {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getJanusToken() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + "/janus/token", {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    getJanusEndpoints() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._cors + this._api + "/janus/endpoints", {
                headers: this._headers,
            }, this._requestPromise(resolve, reject));
        });
    }
    addUniqueMessage(message, user) {
        if (!this.db.get("messages").has({ user, message }).value()) {
            this.db.get("messages").push({ user, message }).write();
            return true;
        }
        return false;
    }
    hasMessage(message) {
        return this.db.get("messages").has({ message }).value();
    }
    addMessage(message, user) {
        this.db.get("messages").push({ user, message }).write();
        this._buildCorpus(user);
    }
    getMessages(user) {
        if (user) {
            return this.db.get("messages").filter({ user }).map("message").value();
        }
        else {
            return this.db.get("messages").map("message").value();
        }
    }
    removeMessage(message, user) {
        if (user) {
            return this.db.get("messages").remove({ message }).write();
        }
        else {
            return this.db.get("messages").remove({ message, user }).write();
        }
    }
    hasUser(user) {
        return this.db.get("messages").has({ user }).value();
    }
    getUsers() {
        return this.db.get("messages").map("user").uniq().value();
    }
    removeUser(user) {
        return this.db.get("messages").remove({ user }).write();
    }
    isAdmin(username) {
        return this.db.get("admins").has(username).value();
    }
    setAdmins(usernames) {
        return this.db.set("admins", usernames).write();
    }
    addAdmin(username) {
        return this.db.get("admins").push(username).write();
    }
    removeAdmin(username) {
        return this.db.get("admins").remove(username).write();
    }
    hasCommand(command) {
        return this.commands[command] !== undefined;
    }
    addCommand(command, handler) {
        this.commands[command] = handler.bind(this);
    }
    removeCommand(command) {
        delete this.commands[command];
    }
    generateMessage(user, options = {}) {
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
        }
        else {
            message = this._globalCorpus.generate(options);
        }
        this.cooldown.add(message.string);
        return message;
    }
    cleanCooldown() {
        this.cooldown = new Set();
    }
    markovFilter(result) {
        return result.string.length >= (this.options.minLength || 0) &&
            result.string.split(" ").length >= (this.options.minWords || 0) &&
            !result.refs.map((o) => o.string).includes(result.string) &&
            result.score >= (this.options.minScore || 0) &&
            !this.cooldown.has(result.string);
    }
    _prng() {
        return (Math.random() * (new Date()).getTime()) % 1;
    }
    _initCorpus() {
        this._buildCorpus();
        for (const user of this.getUsers()) {
            this._buildCorpus(user);
        }
    }
    _buildCorpus(user) {
        const messages = this.getMessages(user);
        if (messages.length > 0) {
            if (user) {
                this._userCorpus[user] = new markov_strings_1.default(messages, { stateSize: this.options.stateSize });
                this._userCorpus[user].buildCorpus();
            }
            else {
                this._globalCorpus = new markov_strings_1.default(messages, { stateSize: this.options.stateSize });
                this._globalCorpus.buildCorpus();
            }
        }
    }
    _requestPromise(resolve, reject) {
        return (err, res, body) => {
            if (err) {
                return reject(err);
            }
            else {
                if (`${res.statusCode}`[0] !== "2") {
                    return reject({ statusCode: res.statusCode, statusMessage: res.statusMessage });
                }
                return resolve(body);
            }
        };
    }
}
exports.Crispy = Crispy;
//# sourceMappingURL=crispy.js.map