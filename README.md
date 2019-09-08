# Crispy
An annoying bot.

This bot is being developed for personal use in my community's chatroom on https://jumpin.chat.

## Inspiration
I have this friend called Crispy and he talks a lot on chat, much faster than any of us can answer,
he didn't seen to care when we stopped trying to answer him too... he would just keep talking to himself... so I decided
to make a bot to keep up with him.

## History
- *Initial version*: The bot would send messages from Ipsum Lorem every time the real Crispy talked.
- *English version*: A friend asked me to make it talk english, so I did with markovian chains.
- *Nov 18, 2018 - First commit*: After implementing some sort of machine learning I decided it should be on GitHub.
- *Nov 19 ~ Dec 5, 2018*: Lots of improvements to code, speech, detection of messages, plus fixes and new commands.
- *Dec 6 ~ 12, 2018*: Added bot account that can be modded and profile validation for admin commands.
- *Dec 13 ~ 16, 2018*: Fixed login issues and other errors and improves ban function.
- *Dec 21 ~ 22, 2018*: Prepared for public release, removed personal files, made improvements and lots of refactoring.
- *Jan 24 ~ 26, 2019*: Released it for NodeJS to make the training asynchronous, and other improvements.
- **Sep 4, 2019**: Rewrote it using TypeScript and WebSocket for simpler implementation.

## Requirements
This project uses [lowdb](https://www.npmjs.com/package/lowdb), [markov-strings](https://www.npmjs.com/package/markov-strings), [puppeteer](https://www.npmjs.com/package/puppeteer) and [socket.io-client](https://www.npmjs.com/package/socket.io-client).  
All requirements can be installed with `npm install` following the installation instructions.  
This project was made using **NodeJS v10.3.0**, it was **not tested** for any other versions.

## Documentation
### Getting Started

Install crispybot using npm:
```bash
$ npm install crispybot
```

You can now require and use crispybot like so:

```ts
import { Crispy, IJumpInMessage } from "crispybot";

const TOKEN = process.env.JUMPIN_TOKEN || "";
const ROOM = process.env.JUMPIN_ROOM || "Crispybot";
const HANDLE = process.env.JUMPIN_HANDLE || "Crispybot";
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
  crispy.handleChange(HANDLE);
});

crispy.on("message", async (data: any) => {
  console.log(data);
});

crispy.on("status", (data: any) => {
  console.log(data);
});

crispy.addCommand("nick", async (args: string[], data: IJumpInMessage) => {
  if (args.length) {
    if (await crispy.checkAdmin(data.handle)) {
      crispy.handleChange(args[0]);
    }
  }
});
```

## Contact
Please if you find any bugs let me know by creating an issue on GitHub.  
The bot is still under development and many of it's features are not fully tested and need improvements.

## License
```
Crispy - An annoying bot.
Copyright (C) 2019  Guilherme Caulada (Sighmir)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```
