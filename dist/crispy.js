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
        this.options = options;
        this.cooldown = new Set();
        this.db = low(new FileSync("db.json"));
        this.db.defaults({ messages: [] }).write();
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
            this.options.prng = () => (Math.random() * (new Date()).getTime()) % 1;
        }
        if (!this.options.filter) {
            this.options.filter = (result) => {
                return result.string.length >= (this.options.minLength || 0) &&
                    result.string.split(" ").length >= (this.options.minWords || 0) &&
                    !result.refs.map((o) => o.string).includes(result.string) &&
                    result.score >= (this.options.minScore || 0) &&
                    !this.cooldown.has(result.string);
            };
        }
        this._initCorpus();
        setInterval(this.cleanCooldown, (this.options.cooldown || 5) * 1000 * 60);
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
            request_1.default.get(this._api + "/user", this._requestPromise(resolve, reject));
        });
    }
    getUserProfile(userId) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + `/user/${userId}/profile`, this._requestPromise(resolve, reject));
        });
    }
    getUnreadMessages(userId) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + `/message/${userId}/unread`, this._requestPromise(resolve, reject));
        });
    }
    checkCanBroadcast(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + `/user/checkCanBroadcast/${room}`, this._requestPromise(resolve, reject));
        });
    }
    getRoomEmojis(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + `/rooms/${room}/emoji`, this._requestPromise(resolve, reject));
        });
    }
    getRoomPlaylist(room) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + `/youtube/${room}/playlist`, this._requestPromise(resolve, reject));
        });
    }
    searchYoutube(query) {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + `/youtube/search/${query}`, this._requestPromise(resolve, reject));
        });
    }
    getTurnServer() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + "/turn", this._requestPromise(resolve, reject));
        });
    }
    getJanusToken() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + "/janus/token", this._requestPromise(resolve, reject));
        });
    }
    getJanusEndpoints() {
        return new Promise((resolve, reject) => {
            request_1.default.get(this._api + "/janus/endpoints", this._requestPromise(resolve, reject));
        });
    }
    addUniqueMessage(message, user) {
        if (this.db.get("messages").filter({ user, message }).size().value() === 0) {
            this.db.get("messages").push({ user, message }).write();
            return true;
        }
        return false;
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
    hasUser(user) {
        return this.db.get("messages").map("user").has(user).value();
    }
    getUsers() {
        return this.db.get("messages").map("user").uniq().value();
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