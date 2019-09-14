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
/// <reference types="socket.io-client" />
import { MarkovGenerateOptions, MarkovResult } from "markov-strings";
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
export declare type CrispyCommand = (args: string[], data: IJumpInMessage) => void;
export declare type CrispyCliCommand = (args: string[]) => void;
export declare class Crispy {
    user: any;
    options: ICrispyOptions;
    private _db;
    private _api;
    private _url;
    private _token;
    private _room;
    private _commands;
    private _cliCommands;
    private _browser;
    private _cooldown;
    private _globalCorpus;
    private _userCorpus;
    private _events;
    private _io;
    private _rl;
    constructor(token: string, options?: ICrispyOptions);
    readonly room: string;
    private readonly io;
    join(room: string, user?: object): SocketIOClient.Socket;
    getIgnoreList(roomName: string): SocketIOClient.Socket;
    checkYoutube(notify?: boolean): SocketIOClient.Socket;
    handleChange(handle: string): SocketIOClient.Socket;
    isStillJoined(): SocketIOClient.Socket;
    message(message: string): SocketIOClient.Socket;
    command(command: string, value?: string): SocketIOClient.Socket;
    on(event: string, handler: (data?: any) => void): SocketIOClient.Emitter;
    emit(event: string, data?: any): void;
    getCurrentUser(): any;
    getUserProfile(userId: string): any;
    getUnreadMessages(userId: string): any;
    checkCanBroadcast(): any;
    getRoom(): any;
    getRoomEmojis(): any;
    getRoomPlaylist(): any;
    searchYoutube(query: string): any;
    getTurnServer(): any;
    getJanusToken(): any;
    getJanusEndpoints(): any;
    addUniqueMessage(message: string | {
        message: string;
        user?: string;
    }, user?: string): boolean;
    addUniqueMessages(messages: Array<string | {
        message: string;
        user?: string;
    }>): void;
    hasMessage(message: string | {
        message: string;
        user?: string;
    }, user?: string): boolean;
    addMessage(message: string | {
        message: string;
        user?: string;
    }, user?: string): void;
    addMessages(messages: Array<{
        message: string;
        user?: string;
    }>): void;
    getMessages(user?: string): any;
    removeMessage(message: string | {
        message: string;
        user?: string;
    }, user?: string): void;
    removeMessages(messages: Array<{
        message: string;
        user?: string;
    }>): void;
    generateMessage(user?: string, options?: MarkovGenerateOptions): any;
    generateMessages(maxAmount?: number, user?: string, options?: MarkovGenerateOptions): MarkovResult[];
    hasUser(user: string): boolean;
    getUsers(): any;
    removeUser(user: string): any;
    removeUsers(users: string[]): void;
    isAdmin(username: string): any;
    getAdmins(): any;
    setAdmins(usernames: string[]): any;
    addAdmin(username: string): any;
    addAdmins(usernames: string[]): void;
    removeAdmin(username: string): any;
    removeAdmins(usernames: string[]): void;
    isCommand(message: string): boolean;
    hasCommand(command: string): boolean;
    addCommand(command: string, handler: CrispyCommand): void;
    removeCommand(command: string): void;
    isCliCommand(message: string): boolean;
    hasCliCommand(command: string): boolean;
    addCliCommand(command: string, handler: CrispyCliCommand): void;
    removeCliCommand(command: string): void;
    isTarget(handle: string): any;
    getTargets(): any;
    setTargets(handles: string[]): any;
    addTarget(handle: string): any;
    addTargets(handles: string[]): void;
    removeTarget(handle: string): any;
    removeTargets(handles: string): void;
    checkTarget(handle: string): boolean;
    isTrigger(message: string): any;
    getTriggers(): any;
    setTriggers(messages: string[]): any;
    addTrigger(message: string): any;
    addTriggers(messages: string[]): void;
    removeTrigger(message: string): any;
    removeTriggers(messages: string): void;
    checkTrigger(message: string): boolean;
    isIgnored(message: string): any;
    getIgnored(): any;
    setIgnored(messages: string[]): any;
    addIgnored(message: string | string[]): any;
    removeIgnored(message: string | string[]): any;
    checkIgnored(message: string): boolean;
    isBlocked(handle: string): any;
    getBlocked(): any;
    setBlocked(handles: string[]): any;
    addBlocked(handle: string | string[]): any;
    removeBlocked(handle: string | string[]): any;
    checkBlocked(handle: string): boolean;
    isBannedUser(handle: string): any;
    isBannedMessage(message: string): any;
    isBannedWord(word: string): any;
    getBannedUsers(): any;
    getBannedMessages(): any;
    getBannedWords(): any;
    setBannedUsers(handles: string[]): any;
    setBannedMessages(messages: string[]): any;
    setBannedWords(words: string[]): any;
    addBannedUser(handle: string): any;
    addBannedUsers(handles: string[]): void;
    addBannedMessage(message: string): any;
    addBannedMessages(messages: string[]): void;
    addBannedWord(word: string): any;
    addBannedWords(words: string[]): void;
    removeBannedUser(handle: string): any;
    removeBannedUsers(handle: string[]): void;
    removeBannedMessage(message: string): any;
    removeBannedMessages(messages: string[]): void;
    removeBannedWord(word: string): any;
    removeBannedWords(words: string[]): void;
    checkBannedUser(handle: string): boolean;
    checkBannedMessage(message: string): boolean;
    checkBannedWord(message: string): boolean;
    markovFilter(result: MarkovResult): boolean;
    cleanCooldown(): void;
    get(...args: any[]): any;
    set(...args: any[]): any;
    private _getEventPrefix;
    private _prng;
    private _initCorpus;
    private _buildCorpus;
    private _getBrowser;
    private _getPage;
    private _getPageContent;
}
//# sourceMappingURL=crispy.d.ts.map