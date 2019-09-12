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

crispy.on("message", async (data: any) => {
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

crispy.addCommand("nick", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.set("handle", args[0]).write();
      crispy.handleChange(args[0]);
    }
  }
});

crispy.addCommand("admin", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.addAdmin(args[0]);
    }
  }
});

crispy.addCommand("target", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.addTarget(args[0]);
    }
  }
});

crispy.addCommand("trigger", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.addTrigger(args.join(" "));
    }
  }
});

crispy.addCommand("ban", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.command("ban", args[0]);
      crispy.addBannedUser(args[0]);
    }
  }
});

crispy.addCommand("mban", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.addBannedMessage(args.join(" "));
    }
  }
});

crispy.addCommand("block", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.addBlocked(args[0]);
    }
  }
});

crispy.addCommand("ignore", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.addIgnored(args[0]);
    }
  }
});
