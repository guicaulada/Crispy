export declare class Crispy {
    user: any;
    private token;
    private events;
    private io;
    constructor(token: string);
    getEventPrefix(eventName: string): string | null;
    connect(): Promise<unknown>;
    join(room: string, user?: object): void;
    getIgnoreList(roomName: string): void;
    checkYoutube(notify?: boolean): void;
    handleChange(handle: string): void;
    isStillJoined(room: string): void;
    message(room: string, message: string): void;
    command(room: string, command: string, value?: string): void;
    on(event: string, handler: (data?: any) => void): void;
    emit(event: string, data?: any): void;
}
//# sourceMappingURL=crispy.d.ts.map