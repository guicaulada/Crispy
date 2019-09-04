import { Crispy } from "crispybot";

const TOKEN = process.env.JUMPIN_TOKEN || "";
const ROOM = process.env.JUMPIN_ROOM || "Crispybot";
const HANDLE = process.env.JUMPIN_HANDLE || "Crispybot";

const crispy = new Crispy(TOKEN);

crispy.connect().then(() => {
  crispy.on("join", () => {
    crispy.handleChange(HANDLE);
  });
  crispy.on("message", (data: any) => {
    console.log(data);
    if (data.handle !== crispy.handle && data.message.includes("crispy")) {
      crispy.message(ROOM, `Hello ${data.handle}!`);
    }
  });
  crispy.on("status", (data: any) => {
    console.log(data);
  });
  crispy.join(ROOM);
}).catch((err: any) => console.error(err));
