"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const markov_strings_1 = __importDefault(require("markov-strings"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const readline_1 = __importDefault(require("readline"));
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const string_similarity_1 = require("string-similarity");
class Crispy {
    constructor(token, options = {}) {
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
        this.on("message", async (data) => {
            try {
                const room = await this.getRoom();
                data.user = room.users.filter((u) => u.handle === data.handle)[0];
                if (data.user) {
                    if (data.userId !== this.user._id) {
                        if (this.options.commands && this.isCommand(data.message)) {
                            const args = data.message.slice(1, data.message.length).split(/\s+/);
                            const command = args.shift();
                            if (command && this.hasCommand(command)) {
                                this._commands[command](args, data);
                            }
                        }
                        else if (this.options.ban && (this.checkBannedWord(data.message) ||
                            this.checkBannedMessage(data.message) ||
                            this.checkBannedUser(data.handle) ||
                            (data.user.username && this.checkBannedUser(data.user.username)))) {
                            this.command("ban", data.handle);
                        }
                        else if (this.options.markov) {
                            if (!(this.checkIgnored(data.message) ||
                                this.checkBlocked(data.handle) ||
                                (data.user.username && this.checkBlocked(data.user.username)))) {
                                if (this.options.unique) {
                                    this.addUniqueMessage(data.message, data.user.username || data.handle);
                                }
                                else {
                                    this.addMessage(data.message, data.user.username || data.handle);
                                }
                            }
                            if (this.checkTarget(data.handle) ||
                                this.checkTrigger(data.message) ||
                                (data.user.username && this.checkTarget(data.user.username))) {
                                let match = null;
                                let messages = this.generateMessages(this.options.maxAmount, data.user.username || data.handle);
                                if (messages.length) {
                                    match = string_similarity_1.findBestMatch(data.message, messages.map((m) => m.string));
                                    if (match.bestMatch.rating >= (this.options.similarity || 0)) {
                                        this._cooldown.add(match.bestMatch.target);
                                        this.message(match.bestMatch.target);
                                    }
                                }
                                else {
                                    messages = this.generateMessages(this.options.maxAmount);
                                    if (messages.length) {
                                        match = string_similarity_1.findBestMatch(data.message, messages.map((m) => m.string));
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
            }
            catch (err) {
                if (this.options.debug) {
                    console.error(err);
                }
            }
        });
        this.on("handleChange", (data) => {
            this.user.handle = data.handle;
        });
        this.on("room::handleChange", async (data) => {
            if (data.userId !== this.user._id) {
                const room = await this.getRoom();
                data.user = room.users.filter((u) => u.handle === data.handle)[0];
                if (this.options.ban && (this.checkBannedUser(data.handle) ||
                    (data.user.username && this.checkBannedUser(data.user.username)))) {
                    this.command("ban", data.handle);
                }
            }
        });
        this.on("join", (j) => {
            this.user = j.user;
        });
        this.io.on("error", (err) => {
            if (this.options.debug) {
                console.error(err);
            }
        });
        if (this.options.cli === undefined ? true : this.options.cli) {
            this._rl = readline_1.default.createInterface({
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
    isStillJoined() {
        return this.io.emit("room::isStillJoined", { room: this.room });
    }
    message(message) {
        return this.io.emit("room::message", { room: this.room, message });
    }
    command(command, value) {
        return this.io.emit("room::command", { room: this.room, message: { command, value } });
    }
    on(event, handler) {
        const prefix = this._getEventPrefix(event);
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
    checkCanBroadcast() {
        return this._getPageContent(this._api + `/user/checkCanBroadcast/${this.room}`);
    }
    getRoom() {
        return this._getPageContent(this._api + `/rooms/${this.room}`);
    }
    getRoomEmojis() {
        return this._getPageContent(this._api + `/rooms/${this.room}/emoji`);
    }
    getRoomPlaylist() {
        return this._getPageContent(this._api + `/youtube/${this.room}/playlist`);
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
        if (!this.hasMessage(message, user)) {
            this.addMessage(message, user);
            return true;
        }
        return false;
    }
    addUniqueMessages(messages) {
        for (const message of messages) {
            if (!this.hasMessage(message)) {
                this.addMessage(message);
            }
        }
    }
    hasMessage(message, user) {
        if (typeof message === "object") {
            return this._db.get("messages").filter(message).size().value() > 0;
        }
        if (user) {
            return this._db.get("messages").filter({ user, message }).size().value() > 0;
        }
        return this._db.get("messages").filter({ message }).size().value() > 0;
    }
    addMessage(message, user) {
        if (typeof message === "object") {
            this._db.get("messages").push(message).write();
            this._buildCorpus(message.user);
        }
        else {
            if (user) {
                this._db.get("messages").push({ user, message }).write();
                this._buildCorpus(user);
            }
            else {
                this._db.get("messages").push({ message }).write();
                this._buildCorpus();
            }
        }
    }
    addMessages(messages) {
        for (const message of messages) {
            this.addMessage(message);
        }
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
        if (typeof message === "object") {
            this._db.get("messages").remove(message).write();
            this._buildCorpus(message.user);
        }
        else {
            if (user) {
                this._db.get("messages").remove({ message, user }).write();
                this._buildCorpus(user);
            }
            else {
                this._db.get("messages").remove({ message }).write();
                this._buildCorpus();
            }
        }
    }
    removeMessages(messages) {
        for (const message of messages) {
            this.removeMessage(message);
        }
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
        return message;
    }
    generateMessages(maxAmount = 10, user, options = {}) {
        const messages = [];
        options.filter = (result) => {
            const filter = this.options.filter;
            return filter(result) && !messages.map((m) => m.string).includes(result.string);
        };
        for (let i = 0; i < maxAmount; i++) {
            try {
                messages.push(this.generateMessage(user, options));
            }
            catch (e) {
                // ignore
            }
        }
        return messages;
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
    removeUsers(users) {
        for (const user of users) {
            this.removeUser(user);
        }
    }
    isAdmin(username) {
        return this._db.get("admins").value().includes(username);
    }
    getAdmins() {
        return this._db.get("admins").value();
    }
    setAdmins(usernames) {
        return this._db.set("admins", usernames).write();
    }
    addAdmin(username) {
        if (!this.isAdmin(username)) {
            return this._db.get("admins").push(username).write();
        }
    }
    addAdmins(usernames) {
        for (const username of usernames) {
            this.addAdmin(username);
        }
    }
    removeAdmin(username) {
        return this._db.get("admins").pull(username).write();
    }
    removeAdmins(usernames) {
        for (const username of usernames) {
            this.removeAdmin(username);
        }
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
    isCliCommand(message) {
        return (this.options.cliPrefix || "/") === message[0];
    }
    hasCliCommand(command) {
        return this._cliCommands[command] !== undefined;
    }
    addCliCommand(command, handler) {
        this._cliCommands[command] = handler.bind(this);
    }
    removeCliCommand(command) {
        delete this._cliCommands[command];
    }
    isTarget(handle) {
        return this._db.get("targets").value().includes(handle);
    }
    getTargets() {
        return this._db.get("targets").value();
    }
    setTargets(handles) {
        return this._db.set("targets", handles).write();
    }
    addTarget(handle) {
        if (!this.isTarget(handle)) {
            return this._db.get("targets").push(handle).write();
        }
    }
    addTargets(handles) {
        for (const handle of handles) {
            this.addTarget(handle);
        }
    }
    removeTarget(handle) {
        return this._db.get("targets").pull(handle).write();
    }
    removeTargets(handles) {
        for (const handle of handles) {
            this.removeTarget(handle);
        }
    }
    checkTarget(handle) {
        const sensitivity = this.options.sensitivity;
        const targets = this.getTargets();
        for (const h of targets) {
            if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? h : h.toLowerCase(), this.options.caseSensitive ? handle : handle.toLowerCase()) >= (1 - (sensitivity.targets || 0)) || (this.options.caseSensitive ? handle.includes(h) : handle.toLowerCase().includes(h.toLowerCase()))) {
                return true;
            }
        }
        return false;
    }
    isTrigger(message) {
        return this._db.get("triggers").value().includes(message);
    }
    getTriggers() {
        return this._db.get("triggers").value();
    }
    setTriggers(messages) {
        return this._db.set("triggers", messages).write();
    }
    addTrigger(message) {
        if (!this.isTrigger(message)) {
            return this._db.get("triggers").push(message).write();
        }
    }
    addTriggers(messages) {
        for (const message of messages) {
            this.addTrigger(message);
        }
    }
    removeTrigger(message) {
        return this._db.get("triggers").pull(message).write();
    }
    removeTriggers(messages) {
        for (const message of messages) {
            this.removeTrigger(message);
        }
    }
    checkTrigger(message) {
        const sensitivity = this.options.sensitivity;
        const triggers = this.getTriggers();
        const words = message.split(/\s+/);
        for (const m of triggers) {
            for (const w of words) {
                if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? m : m.toLowerCase(), this.options.caseSensitive ? w : w.toLowerCase()) >= (1 - (sensitivity.triggers || 0)) || (this.options.caseSensitive ? w.includes(m) : w.toLowerCase().includes(m.toLowerCase()))) {
                    return true;
                }
            }
        }
        return false;
    }
    isIgnored(message) {
        return this._db.get("ignored").value().includes(message);
    }
    getIgnored() {
        return this._db.get("ignored").value();
    }
    setIgnored(messages) {
        return this._db.set("ignored", messages).write();
    }
    addIgnored(message) {
        if (typeof message === "string") {
            if (!this.isIgnored(message)) {
                return this._db.get("ignored").push(message).write();
            }
        }
        else {
            for (const m of message) {
                this.addIgnored(m);
            }
        }
    }
    removeIgnored(message) {
        if (typeof message === "string") {
            return this._db.get("ignored").pull(message).write();
        }
        else {
            for (const m of message) {
                this.removeIgnored(m);
            }
        }
    }
    checkIgnored(message) {
        const sensitivity = this.options.sensitivity;
        const ignored = this.getIgnored();
        const words = message.split(/\s+/);
        for (const m of ignored) {
            for (const w of words) {
                if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? m : m.toLowerCase(), this.options.caseSensitive ? w : w.toLowerCase()) >= (1 - (sensitivity.ignored || 0)) || (this.options.caseSensitive ? w.includes(m) : w.toLowerCase().includes(m.toLowerCase()))) {
                    return true;
                }
            }
        }
        return false;
    }
    isBlocked(handle) {
        return this._db.get("blocked").value().includes(handle);
    }
    getBlocked() {
        return this._db.get("blocked").value();
    }
    setBlocked(handles) {
        return this._db.set("blocked", handles).write();
    }
    addBlocked(handle) {
        if (typeof handle === "string") {
            if (!this.isBlocked(handle)) {
                return this._db.get("blocked").push(handle).write();
            }
        }
        else {
            for (const h of handle) {
                this.addBlocked(h);
            }
        }
    }
    removeBlocked(handle) {
        if (typeof handle === "string") {
            return this._db.get("blocked").pull(handle).write();
        }
        else {
            for (const h of handle) {
                this.removeBlocked(h);
            }
        }
    }
    checkBlocked(handle) {
        const sensitivity = this.options.sensitivity;
        const blocked = this.getBlocked();
        for (const h of blocked) {
            if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? h : h.toLowerCase(), this.options.caseSensitive ? handle : handle.toLowerCase()) >= (1 - (sensitivity.blocked || 0)) || (this.options.caseSensitive ? handle.includes(h) : handle.toLowerCase().includes(h.toLowerCase()))) {
                return true;
            }
        }
        return false;
    }
    isBannedUser(handle) {
        return this._db.get("banned.users").value().includes(handle);
    }
    isBannedMessage(message) {
        return this._db.get("banned.messages").value().includes(message);
    }
    isBannedWord(word) {
        return this._db.get("banned.words").value().includes(word);
    }
    getBannedUsers() {
        return this._db.get("banned.users").value();
    }
    getBannedMessages() {
        return this._db.get("banned.messages").value();
    }
    getBannedWords() {
        return this._db.get("banned.words").value();
    }
    setBannedUsers(handles) {
        return this._db.set("banned.users", handles).write();
    }
    setBannedMessages(messages) {
        return this._db.set("banned.messages", messages).write();
    }
    setBannedWords(words) {
        return this._db.set("banned.words", words).write();
    }
    addBannedUser(handle) {
        if (!this.isBannedUser(handle)) {
            return this._db.get("banned.users").push(handle).write();
        }
    }
    addBannedUsers(handles) {
        for (const h of handles) {
            this.addBannedUser(h);
        }
    }
    addBannedMessage(message) {
        if (!this.isBannedMessage(message)) {
            return this._db.get("banned.messages").push(message).write();
        }
    }
    addBannedMessages(messages) {
        for (const m of messages) {
            this.addBannedMessage(m);
        }
    }
    addBannedWord(word) {
        if (!this.isBannedWord(word)) {
            return this._db.get("banned.words").push(word).write();
        }
    }
    addBannedWords(words) {
        for (const w of words) {
            this.addBannedWord(w);
        }
    }
    removeBannedUser(handle) {
        return this._db.get("banned.users").pull(handle).write();
    }
    removeBannedUsers(handle) {
        for (const h of handle) {
            this.removeBannedUser(h);
        }
    }
    removeBannedMessage(message) {
        return this._db.get("banned.messages").pull(message).write();
    }
    removeBannedMessages(messages) {
        for (const m of messages) {
            this.removeBannedMessage(m);
        }
    }
    removeBannedWord(word) {
        return this._db.get("banned.words").pull(word).write();
    }
    removeBannedWords(words) {
        for (const w of words) {
            this.removeBannedWord(w);
        }
    }
    checkBannedUser(handle) {
        const sensitivity = this.options.sensitivity;
        const banSensitivity = sensitivity.banned || {};
        const banned = this.getBannedUsers();
        for (const h of banned) {
            if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? h : h.toLowerCase(), this.options.caseSensitive ? handle : handle.toLowerCase()) >= (1 - (banSensitivity.users || 0)) || (this.options.caseSensitive ? handle.includes(h) : handle.toLowerCase().includes(h.toLowerCase()))) {
                return true;
            }
        }
        return false;
    }
    checkBannedMessage(message) {
        const sensitivity = this.options.sensitivity;
        const banSensitivity = sensitivity.banned || {};
        const banned = this.getBannedMessages();
        for (const m of banned) {
            if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? m : m.toLowerCase(), this.options.caseSensitive ? message : message.toLowerCase()) >= (1 - (banSensitivity.messages || 0)) || (this.options.caseSensitive ? message.includes(m) : message.toLowerCase().includes(m.toLowerCase()))) {
                return true;
            }
        }
        return false;
    }
    checkBannedWord(message) {
        const sensitivity = this.options.sensitivity;
        const banSensitivity = sensitivity.banned || {};
        const banned = this.getBannedWords();
        const words = message.split(/\s+/);
        for (const m of banned) {
            for (const w of words) {
                if (string_similarity_1.compareTwoStrings(this.options.caseSensitive ? m : m.toLowerCase(), this.options.caseSensitive ? w : w.toLowerCase()) >= (1 - (banSensitivity.words || 0)) || (this.options.caseSensitive ? w.includes(m) : w.toLowerCase().includes(m.toLowerCase()))) {
                    return true;
                }
            }
        }
        return false;
    }
    markovFilter(result) {
        return result.string.length >= (this.options.minLength || 0) &&
            result.string.split(" ").length >= (this.options.minMessages || 0) &&
            !result.refs.map((o) => o.string).includes(result.string) &&
            result.score >= (this.options.minScore || 0) &&
            !this._cooldown.has(result.string);
    }
    cleanCooldown() {
        this._cooldown = new Set();
    }
    get(...args) {
        return this._db.get(...args);
    }
    set(...args) {
        return this._db.set(...args);
    }
    _getEventPrefix(eventName) {
        for (const prefix in this._events) {
            if (this._events[prefix].includes(eventName)) {
                return prefix;
            }
        }
        return null;
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
                    this._browser = await puppeteer_1.default.launch(this.options.puppeteer);
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
            try {
                const browser = await this._getBrowser();
                const page = await browser.newPage();
                await page.goto(url || "about:blank");
                await page.waitForSelector("body");
                resolve(page);
            }
            catch (err) {
                reject(err);
            }
        });
    }
    _getPageContent(url) {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await this._getPage(url);
                const content = await page.evaluate(() => document.body.textContent);
                page.close();
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