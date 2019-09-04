export declare class Crispy {
    handle: string;
    private io;
    private events;
    private token;
    constructor(token: string);
    getEventPrefix(event: string): string | null;
    connect(): Promise<unknown>;
    join(room: string): void;
    getIgnoreList(roomName: string): void;
    checkYoutube(notify: boolean): void;
    handleChange(handle: string): void;
    isStillJoined(room: string): void;
    message(room: string, message: string): void;
    command(room: string, command: string, value: string | undefined): void;
    on(event: string, handler: (data: any) => void): void;
    emit(event: string, data: any): void;
}
//# sourceMappingURL=crispy.d.ts.map