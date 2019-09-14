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
            banned: { users: [], messages: [] },
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
        this.on("message", async (data) => {
            try {
                if (data.userId !== this.user._id &&
                    !await this.checkBlocked(data.handle) &&
                    !this.checkIgnored(data.message)) {
                    if (this.options.commands && this.isCommand(data.message)) {
                        const args = data.message.slice(1, data.message.length).split(/\s+/);
                        const command = args.shift();
                        if (command && this.hasCommand(command)) {
                            this._commands[command](args, data);
                        }
                    }
                    else if (this.options.ban &&
                        (this.checkBannedMessage(data.message) || await this.checkBannedUser(data.handle))) {
                        this.command("ban", data.handle);
                    }
                    else if (this.options.target) {
                        if (this.options.unique) {
                            this.addUniqueMessage(data.message, data.handle);
                        }
                        else {
                            this.addMessage(data.message, data.handle);
                        }
                        if (await this.checkTarget(data.handle) || this.checkTrigger(data.message)) {
                            try {
                                const message = this.generateMessage(data.handle);
                                this.message(message.string);
                                if (this.options.debug) {
                                    console.log(message);
                                }
                            }
                            catch {
                                try {
                                    const message = this.generateMessage();
                                    this.message(message.string);
                                    if (this.options.debug) {
                                        console.log(message);
                                    }
                                }
                                catch (err) {
                                    if (this.options.debug) {
                                        console.log(err.message);
                                    }
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
                if (this.options.ban && await this.checkBannedUser(data.handle)) {
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
        this._cooldown.add(message.string);
        return message;
    }
    generateMessages(maxAmount = 10, user, options = {}) {
        const messages = [];
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
    checkAdmin(handle) {
        return new Promise(async (resolve, reject) => {
            try {
                const room = await this.getRoom();
                const user = room.users.filter((u) => u.handle === handle)[0];
                if (user) {
                    resolve(this.isAdmin(user.username));
                }
                else {
                    resolve(false);
                }
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
        return new Promise(async (resolve, reject) => {
            if (this.isTarget(handle)) {
                return resolve(true);
            }
            try {
                const room = await this.getRoom();
                const user = room.users.filter((u) => u.handle === handle)[0];
                if (user) {
                    resolve(this.isTarget(user.username));
                }
                else {
                    resolve(false);
                }
            }
            catch (err) {
                reject(err);
            }
        });
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
        const triggers = this.getTriggers();
        for (const m of triggers) {
            if (message.includes(m)) {
                return true;
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
        const ignored = this.getIgnored();
        for (const m of ignored) {
            if (message.includes(m)) {
                return true;
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
        return new Promise(async (resolve, reject) => {
            if (this.isBlocked(handle)) {
                return resolve(true);
            }
            try {
                const room = await this.getRoom();
                const user = room.users.filter((u) => u.handle === handle)[0];
                if (user) {
                    resolve(this.isBlocked(user.username));
                }
                else {
                    resolve(false);
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    isBannedUser(handle) {
        return this._db.get("banned.users").value().includes(handle);
    }
    isBannedMessage(message) {
        return this._db.get("banned.messages").value().includes(message);
    }
    getBannedUsers() {
        return this._db.get("banned.users").value();
    }
    getBannedMessages() {
        return this._db.get("banned.messages").value();
    }
    setBannedUsers(handles) {
        return this._db.set("banned.users", handles).write();
    }
    setBannedMessages(messages) {
        return this._db.set("banned.messages", messages).write();
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
    checkBannedUser(handle) {
        return new Promise(async (resolve, reject) => {
            if (this.isBannedUser(handle)) {
                return resolve(true);
            }
            try {
                const room = await this.getRoom();
                const user = room.users.filter((u) => u.handle === handle)[0];
                if (user) {
                    resolve(this.isBannedUser(user.username));
                }
                else {
                    resolve(false);
                }
            }
            catch (err) {
                reject(err);
            }
        });
    }
    checkBannedMessage(message) {
        const banned = this.getBannedMessages();
        for (const m of banned) {
            if (message.includes(m)) {
                return true;
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