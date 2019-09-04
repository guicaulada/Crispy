"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_client_1 = __importDefault(require("socket.io-client"));
class Crispy {
    constructor(token) {
        this.handle = "crispybot";
        this.token = token;
        this.events = {
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
    }
    getEventPrefix(event) {
        for (const prefix in this.events) {
            if (this.events[prefix].includes(event)) {
                return prefix;
            }
        }
        return null;
    }
    connect() {
        return new Promise((resolve, reject) => {
            this.io = socket_io_client_1.default("https://jumpin.chat", { query: { token: this.token } });
            this.io.on("connect", (e) => {
                resolve(e);
                if (this.io) {
                    this.on("handleChange", (c) => {
                        this.handle = c.handle;
                    });
                    this.on("join", (j) => {
                        this.handle = j.user.handle;
                    });
                }
            });
            this.io.on("error", (e) => {
                reject(e);
            });
        });
    }
    join(room, user) {
        if (this.io) {
            this.io.emit("room::join", { room, user });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    getIgnoreList(roomName) {
        if (this.io) {
            this.io.emit("room::getIgnoreList", { roomName });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    checkYoutube(notify) {
        if (this.io) {
            this.io.emit("youtube::checkisplaying", { notify });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    handleChange(handle) {
        if (this.io) {
            this.io.emit("room::handleChange", { handle });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    isStillJoined(room) {
        if (this.io) {
            this.io.emit("room::isStillJoined", { room });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    message(room, message) {
        if (this.io) {
            this.io.emit("room::message", { room, message });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    command(room, command, value) {
        if (this.io) {
            this.io.emit("room::message", { room, message: { command, value } });
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    on(event, handler) {
        if (this.io) {
            const prefix = this.getEventPrefix(event);
            if (prefix) {
                this.io.on(`${prefix}::${event}`, handler);
            }
            else {
                this.io.on(event, handler);
            }
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
    emit(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
        else {
            throw new Error("Socket disconnected!");
        }
    }
}
exports.Crispy = Crispy;
//# sourceMappingURL=crispy.js.map