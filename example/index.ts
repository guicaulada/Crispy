import { Crispy, IJumpInMessage } from ".."; // crispybot

const TOKEN = process.env.JUMPIN_TOKEN || "";
const ROOM = process.env.JUMPIN_ROOM || "Crispybot";
const ADMIN = "Crispybot"

const crispy = new Crispy(TOKEN, {
  cooldown: 5, stateSize: 3,
});

crispy.addAdmin(ADMIN);

crispy.addTarget(ADMIN);

crispy.on("connect", () => {
  crispy.join(ROOM);
});

crispy.on("join", (data: any) => {
  console.log(data);
  crispy.handleChange(crispy.get("handle").value() || "Crispybot");
});

crispy.on("message", (data: any) => {
  console.log(data);
});

crispy.on("status", (data: any) => {
  console.log(data);
});

crispy.addCliCommand("say", (args: string[]) => {
  if (args.length) {
    crispy.message(args.join(" "));
  }
});

crispy.addCommand("nick", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.set("handle", args[0]).write();
      crispy.handleChange(args[0]);
    }
  }
});

crispy.addCommand("admin", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addAdmin(args[0]);
    }
  }
});

crispy.addCommand("target", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addTarget(args[0]);
    }
  }
});

crispy.addCommand("trigger", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addTrigger(args.join(" "));
    }
  }
});

crispy.addCommand("ban", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.command("ban", args[0]);
      crispy.addBannedUser(args[0]);
    }
  }
});

crispy.addCommand("mban", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addBannedMessage(args.join(" "));
    }
  }
});

crispy.addCommand("wban", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addBannedWord(args[0]);
    }
  }
});

crispy.addCommand("block", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addBlocked(args[0]);
    }
  }
});

crispy.addCommand("ignore", (args: string[], data: IJumpInMessage) => {
  if (!data.user || !data.user.username) return;
  if (args.length) {
    if (crispy.isAdmin(data.user.username)) {
      crispy.addIgnored(args[0]);
    }
  }
});
