import io from "socket.io-client";

export class Crispy {
  public handle: string;
  private io: SocketIOClient.Socket | undefined;
  private events: { [index: string]: string[] };
  private token: string;
  constructor(token: string) {
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

  public getEventPrefix(eventName: string) {
    for (const prefix in this.events) {
      if (this.events[prefix].includes(eventName)) {
        return prefix;
      }
    }
    return null;
  }

  public connect() {
    return new Promise((resolve, reject) => {
      this.io = io("https://jumpin.chat", { query: { token: this.token } });
      this.io.on("connect", (e: any) => {
        resolve(e);
        if (this.io) {
          this.on("handleChange", (c: any) => {
            this.handle = c.handle;
          });

          this.on("join", (j: any) => {
            this.handle = j.user.handle;
          });
        }
      });
      this.io.on("error", (e: any) => {
        reject(e);
      });
    });
  }

  public join(room: string, user?: object) {
    if (this.io) {
      this.io.emit("room::join", { room, user });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public getIgnoreList(roomName: string) {
    if (this.io) {
      this.io.emit("room::getIgnoreList", { roomName });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public checkYoutube(notify = true) {
    if (this.io) {
      this.io.emit("youtube::checkisplaying", { notify });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public handleChange(handle: string) {
    if (this.io) {
      this.io.emit("room::handleChange", { handle });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public isStillJoined(room: string) {
    if (this.io) {
      this.io.emit("room::isStillJoined", { room });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public message(room: string, message: string) {
    if (this.io) {
      this.io.emit("room::message", { room, message });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public command(room: string, command: string, value?: string) {
    if (this.io) {
      this.io.emit("room::message", { room, message: { command, value } });
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public on(event: string, handler: (data?: any) => void) {
    if (this.io) {
      const prefix = this.getEventPrefix(event);
      if (prefix) {
        this.io.on(`${prefix}::${event}`, handler);
      } else {
        this.io.on(event, handler);
      }
    } else {
      throw new Error("Socket disconnected!");
    }
  }

  public emit(event: string, data?: any) {
    if (this.io) {
      this.io.emit(event, data);
    } else {
      throw new Error("Socket disconnected!");
    }
  }
}

/**
 * Jumpin.chat Events
 *
 * Sent events:
 *
 * "room::setUserIsBroadcasting", {"isBroadcasting":true}
 *
 * "room::getIgnoreList", {"roomName":"room"}
 *
 * "room::command", {"message":{"command":"kick","value":"crispybot"},"room":"room"}
 *
 * "youtube::checkisplaying", {"notify":true}
 *
 * "room::handleChange", {"handle":"crispybot"}
 *
 * "room::isStillJoined", {"room":"room"}
 *
 * "room::message", {"message":"Hello World","room":"room"}
 *
 * "room::join", {
 *   "room":"room",
 *   "user":{
 *     "user_id":"USER_ID",
 *     "username":"username",
 *     "isAdmin":false,
 *     "isSupporter":true,
 *     "isGold":true,
 *     "userIcon":"user-icons/username.gif?t=1546621108180",
 *     "settings":{
 *       "playYtVideos":true,
 *       "allowPrivateMessages":true,
 *       "pushNotificationsEnabled":false,
 *       "receiveUpdates":true,
 *       "receiveMessageNotifications":false,
 *       "darkTheme":true,
 *       "videoQuality":"VIDEO_240",
 *       "userIcon":"user-icons/username.gif?t=1546621108180",
 *       "ignoreList":[{
 *         "expiresAt":"2018-09-10T18:59:41.452Z",
 *         "userListId":"LIST_ID",
 *         "userId":null,
 *         "sessionId":"SESSION_ID",
 *         "_id":"REQUEST_ID",
 *         "id":"EVENT_ID",
 *         "handle":"stopitgetsome",
 *         "timestamp":"2018-09-09T18:59:41.452Z",
 *       }],
 *     },
 *     "videoQuality":{
 *       "id":"VIDEO_240",
 *       "label":"240p",
 *       "dimensions":{
 *         "width":320,
 *         "height":240,
 *       },
 *       "frameRate":15,
 *       "bitRate":128000,
 *     },
 *   },
 * }
 *
 * =========================================================
 *
 * Received events:
 *
 * "client::stillConnected"
 *
 * "client::handleChange", {"handle":"crispybot"}
 *
 * "room::updateIgnore", {"ignoreList":[]}
 *
 * "room::handleChange", {"userId":"USER_ID","handle":"crispybot"}
 *
 * "room::status", {
 *   "notification_type":"room",
 *   "message":"guest narrow_magic has joined the room",
 *   "timestamp":"2019-09-03T22:59:27.361Z",
 *   "id":"733c9ecd-d79b-4964-9e64-75e3fabbb5e0",
 * }
 *
 * "room::message", {
 *   "handle":"crispybot",
 *   "color":"orangealt",
 *   "userId":"USER_ID",
 *   "message":"Hello World",
 *   "timestamp":"2019-09-03T23:11:21.596Z",
 *   "id":"bcc73a79-d469-4e01-b6f9-7395a3ba1980",
 * }
 *
 * "room::disconnect", {
 *   "user": {
 *     "_id":"REQUEST_ID"
 *     "handle":"STONER"
 *     "operator_id":null
 *     "user_id":null
 *     "username":null
 *     "isBroadcasting":true
 *     "assignedBy":null
 *     "isAdmin":false
 *     "isSupporter":false
 *     "userIcon":null
 *     "color":"purplealt"
 *   }
 * }
 *
 * "room::updateUserList", {
 *   "user":{
 *     "_id":"REQUEST_ID",
 *     "handle":"high-pitched_amount",
 *     "operator_id":"OPERATOR_ID",
 *     "user_id":"USER_ID",
 *     "username":"username",
 *     "isBroadcasting":false,
 *     "assignedBy":null,
 *     "isAdmin":false,
 *     "isSupporter":true,
 *     "userIcon":"user-icons/username.gif?t=1546621108180",
 *     "color":"redalt",
 *   }
 * }
 *
 * "room::updateUser", {
 *   "user":{
 *     "_id":"REQUEST_ID",
 *     "handle":"STONER",
 *     "operator_id":null,
 *     "user_id":null,
 *     "username":null,
 *     "isBroadcasting":true,
 *     "assignedBy":null,
 *     "isAdmin":false,
 *     "isSupporter":false,
 *     "userIcon":null,
 *     "color":"purplealt",
 *   },
 * }
 *
 * "self::join", {
 *   "user":{
 *     "user_id":"USER_ID",
 *     "operator_id":"OPERATOR_ID",
 *     "assignedBy":null,
 *     "username":"username",
 *     "isBroadcasting":false,
 *     "isAdmin":false,
 *     "isSupporter":true,
 *     "userIcon":"user-icons/username.gif?t=1546621108180",
 *     "_id":"REQUEST_ID",
 *     "handle":"high-pitched_amount",
 *     "color":"redalt",
 *     "createdAt":"2019-09-04T01:10:03.701Z",
 *     "joinTime":"2019-09-04T01:10:03.701Z",
 *     "operatorPermissions":{
 *       "ban":true,
 *       "close_cam":true,
 *       "mute_user_audio":true,
 *       "mute_user_chat":true,
 *       "mute_room_chat":false,
 *       "mute_room_audio":false,
 *       "apply_password":false,
 *       "assign_operator":true,
 *       "play_youtube":true,
 *     }
 *   }
 * }
 *
 * "youtube::play", {"videoId":"w0c_dv0TUmU","title":"Alborosie - Kingston Town"}
 *
 * "youtube::playlistUpdate", [
 *   {
 *     "startTime":null,
 *     "endTime":null,
 *     "description":null,
 *     "channelId":"UChf0Knt-e9Pw8VywfuTZCjA",
 *     "pausedAt":null,
 *     "_id":"REQUEST_ID",
 *     "mediaId":"Nco_kh8xJDs",
 *     "title":"Alice In Chains - Would? (Official Video)",
 *     "link":"https://youtu.be/Nco_kh8xJDs",
 *     "duration":208,
 *     "thumb":"https://i.ytimg.com/vi/Nco_kh8xJDs/default.jpg",
 *     "mediaType":"TYPE_YOUTUBE",
 *     "startedBy":"5b3d6ca49215550007bcefe2",
 *     "createdAt":"2019-09-04T01:13:27.136Z",
 *   },
 * ]
 *
 * "youtube::playvideo", {
 *   "startTime":"2019-09-04T01:13:27.239Z",
 *   "endTime":"2019-09-04T01:16:55.239Z",
 *   "description":null,
 *   "channelId":"UChf0Knt-e9Pw8VywfuTZCjA",
 *   "pausedAt":null,
 *   "createdAt":"2019-09-04T01:13:27.136Z",
 *   "_id":"REQUEST_ID",
 *   "mediaId":"Nco_kh8xJDs",
 *   "title":"Alice In Chains - Would? (Official Video)",
 *   "link":"https://youtu.be/Nco_kh8xJDs",
 *   "duration":208,
 *   "thumb":"https://i.ytimg.com/vi/Nco_kh8xJDs/default.jpg",
 *   "mediaType":"TYPE_YOUTUBE",
 *   "startedBy":{
 *     "profile":{
 *       "pic":"user-avatar/avatar-blank.png"
 *     }
 *     "_id":"REQUEST_ID"
 *     "username":"leafs"
 *   }
 *   "startAt":0
 * }
 */
