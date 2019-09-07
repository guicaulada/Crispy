"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const markov_strings_1 = __importDefault(require("markov-strings"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
class Crispy {
    constructor(token, options = {}) {
        this.user = {};
        this.options = options;
        this._cooldown = new Set();
        this._db = low(new FileSync("db.json"));
        this._db.defaults({ admins: [], messages: [] }).write();
        this._room = "";
        this._api = "https://jumpin.chat/api";
        this._url = "https://jumpin.chat";
        this._token = token;
        this._commands = {};
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
                if (this.isCommand(data.message)) {
                    const args = data.message.slice(1, data.message.length).split(/\s+/);
                    const command = args.shift();
                    for (const cmd in this._commands) {
                        if (command === cmd) {
                            this._commands[cmd](args, data);
                            break;
                        }
                    }
                }
            }
        });
        this._initCorpus();
        setInterval(this.cleanCooldown, (this.options._cooldown || 5) * 1000 * 60);
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
                this.on("handleChange", (c) => {
                    this.user.handle = c.handle;
                });
                this.on("join", (j) => {
                    this.user = j.user;
                });
                resolve(e);
            });
            this.io.on("error", (e) => {
                reject(e);
            });
        });
    }
    join(room, user) {
        this._room = room;
        this._getPage(this._url + "/" + room).then((page) => {
            page.waitForSelector(".chat").then(() => page.close()).catch();
        }).catch();
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
        return this._getPageContent(this._api + "/user");
    }
    getUserProfile(userId) {
        return this._getPageContent(this._api + `/user/${userId}/profile`);
    }
    getUnreadMessages(userId) {
        return this._getPageContent(this._api + `/message/${userId}/unread`);
    }
    checkCanBroadcast(room) {
        return this._getPageContent(this._api + `/user/checkCanBroadcast/${room}`);
    }
    getRoom(room) {
        return this._getPageContent(this._api + `/rooms/${room}`);
    }
    getRoomEmojis(room) {
        return this._getPageContent(this._api + `/rooms/${room}/emoji`);
    }
    getRoomPlaylist(room) {
        return this._getPageContent(this._api + `/youtube/${room}/playlist`);
    }
    searchYoutube(query) {
        return this._getPageContent(this._api + `/youtube/search/${query}`);
    }
    getTurnServer() {
        return this._getPageContent(this._api + "/turn");
    }
    getJanusToken() {
        return this._getPageContent(this._api + "/janus/token");
    }
    getJanusEndpoints() {
        return this._getPageContent(this._api + "/janus/endpoints");
    }
    addUniqueMessage(message, user) {
        if (!this._db.get("messages").find({ user, message }).value()) {
            this._db.get("messages").push({ user, message }).write();
            return true;
        }
        return false;
    }
    hasMessage(message) {
        return this._db.get("messages").filter({ message }).size().value() > 0;
    }
    addMessage(message, user) {
        this._db.get("messages").push({ user, message }).write();
        this._buildCorpus(user);
    }
    getMessages(user) {
        if (user) {
            return this._db.get("messages").filter({ user }).map("message").value();
        }
        else {
            return this._db.get("messages").map("message").value();
        }
    }
    removeMessage(message, user) {
        if (user) {
            return this._db.get("messages").remove({ message }).write();
        }
        else {
            return this._db.get("messages").remove({ message, user }).write();
        }
    }
    hasUser(user) {
        return this._db.get("messages").filter({ user }).size().value() > 0;
    }
    getUsers() {
        return this._db.get("messages").map("user").uniq().value();
    }
    removeUser(user) {
        return this._db.get("messages").remove({ user }).write();
    }
    isAdmin(username) {
        return this._db.get("admins").value().includes(username);
    }
    setAdmins(usernames) {
        return this._db.set("admins", usernames).write();
    }
    addAdmin(username) {
        return this._db.get("admins").push(username).write();
    }
    removeAdmin(username) {
        return this._db.get("admins").remove(username).write();
    }
    checkAdmin(handle) {
        return new Promise(async (resolve, reject) => {
            try {
                const room = await this.getRoom(this.room);
                const user = room.users.filter((u) => u.handle === handle)[0];
                resolve(this.isAdmin(user.username));
            }
            catch (err) {
                reject(err);
            }
        });
    }
    isCommand(message) {
        return (this.options.prefix || "!") === message[0];
    }
    hasCommand(command) {
        return this._commands[command] !== undefined;
    }
    addCommand(command, handler) {
        this._commands[command] = handler.bind(this);
    }
    removeCommand(command) {
        delete this._commands[command];
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
        this._cooldown.add(message.string);
        return message;
    }
    cleanCooldown() {
        this._cooldown = new Set();
    }
    markovFilter(result) {
        return result.string.length >= (this.options.minLength || 0) &&
            result.string.split(" ").length >= (this.options.minWords || 0) &&
            !result.refs.map((o) => o.string).includes(result.string) &&
            result.score >= (this.options.minScore || 0) &&
            !this._cooldown.has(result.string);
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
    _getBrowser() {
        return new Promise(async (resolve, reject) => {
            if (this._browser) {
                resolve(this._browser);
            }
            else {
                try {
                    this._browser = await puppeteer_1.default.launch({
                        headless: this.options.headless != null ? this.options.headless : true,
                    });
                    resolve(this._browser);
                }
                catch (err) {
                    reject(err);
                }
            }
        });
    }
    _getPage(url) {
        return new Promise(async (resolve, reject) => {
            if (this._page && !this._page.isClosed()) {
                await this._page.goto(url || "about:blank", { waitUntil: ["networkidle0", "load", "domcontentloaded"] });
                resolve(this._page);
            }
            else {
                try {
                    const browser = await this._getBrowser();
                    this._page = await browser.newPage();
                    await this._page.goto(url || "about:blank");
                    resolve(this._page);
                }
                catch (err) {
                    reject(err);
                }
            }
        });
    }
    _getPageContent(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await this._getPage(url);
                const content = await page.evaluate(() => document.body.textContent);
                if (!content || (content && content.includes("HTTP ERROR"))) {
                    reject(content);
                }
                else {
                    try {
                        resolve(JSON.parse(content));
                    }
                    catch {
                        resolve(content);
                    }
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.Crispy = Crispy;
//# sourceMappingURL=crispy.js.map