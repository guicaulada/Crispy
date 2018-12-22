# Crispy
An annoying bot.

This bot is being developed for personal use in my community's chatroom on https://jumpin.chat.

### Inspiration

I have this friend called Crispy and he talks a lot on chat, much faster than any of us can answer,
he didn't seen to care when we stopped trying to answer him too... he would just keep talking to himself... so I decided
to make a bot to keep up with him.

### History
- **Initial version**: The bot would send messages from Ipsum Lorem everytime the real Crispy talked.
- **English version**: A friend asked me to make it talk english, so I did with markovian chains.
- **Nov 18, 2018 - First commit**: After implementing some sort of machine learning I decided it should be on GitHub.
- **Nov 19~Dec 5, 2018**: Lots of improvements to code, speech, detection of messages, plus fixes and new commands.
- **Dec 6~12, 2018**: Added bot account that can be modded and profile validation for admin commands.
- **Dec 13~16, 2018**: Fixed login issues and other errors and improves ban function.
- **Dec 21~22, 2018**: Prepared for public release, removed personal files, made improvements and lots of refactoring.

## Requirements
This project uses [Selenium](https://github.com/SeleniumHQ/selenium),
[Markovify](https://github.com/jsvine/markovify), [Difflib](https://github.com/enthought/Python-2.7.3/blob/master/Lib/difflib.py)
and [NLTK](https://github.com/nltk/nltk), those can be installed with `pip` following the installation instructions.  
Selenium is using [Chromedriver](https://sites.google.com/a/chromium.org/chromedriver/downloads),
so you will need to install that on your machine aswell.  
This project was made using **Python 3.6**, it was **not tested** for any other versions.

## Installation
- Clone this repository with `git clone git@github.com:Sighmir/Crispy.git`
- Go to the repository folder with `cd Crispy`
- Install needed libraries with `pip install -r requirments`
- Execute the project with `python main.py`

## Vocabulary
Vocabulary files should be located inside the folder *models*.
#### Types
- **text**: Default text model from normal text files like books and movie scripts.
- **line**: File with each phrase on a new line, can be used for training based on chat messages.
- **json**: File storing each message by source, can be used for training based on chat messages.

#### Parameters
- **file**: Vocabulary file.
- **type**: Vocabulary type.
- **state_size**: Markovian state size.
- **training**: If True bot will add chat messages to it's vocabulary (can only be used for type *line* and *json*).

## Commands
Default prefix for commands is *!*. More commands can be created with custom functions.
- **save**: Saves training data and cleans cached messages.
- **ban** *&lt;users|words>* *&lt;targets>*: Add users or words to the banned list.
  - **ban** *&lt;users>*: Make the bot ban every user named exctly like *&lt;targets>*.
  - **ban** *&lt;words>*: Make the bot ban every user, by message or username, containing *&lt;targets>*.
- **unban** *&lt;users|words>* *&lt;targets>*: Remove users or words from the banned list.
- **close** *&lt;usernames>*: Add users to the closed list, the bot will close his cam automatically.
- **unclose** *&lt;usernames>*: Remove users from the closed list.
- **refresh**: Make the bot refresh the page.
- **target** *&lt;usernames>*: Add users to the targets list, the bot will answer those users.
- **untarget** *&lt;usernames>*: Remove users from the targets list.
- **admin** *&lt;usernames>*: Add users to the admins list, the bot will accept commands from those users.
- **unadmin** *&lt;usernames>*: Remove users from the admins list.
- **trigger** *&lt;words>*: Add words to the triggers list, the bot will answer to those words.
- **untrigger** *&lt;words>*: Remove words from the triggers list.
- **filter** *&lt;phrase>*: Add a phrase to the filters list, the bot won't process messages containing that phrase.
- **unfilter** *&lt;phrase>*: Remove a phrase from the filters list.
- **wipe**: Wipe sent messages cache.
- **crispy** *&lt;phrase>*: Make the bot answer to a phrase without being targeted.
- **forget** *&lt;phrase>*: Make the bot forget phrases from training data containg *&lt;phrase>*.
- **vocabulary** *&lt;name>*: Set the bot vocabulary.
- **config** *&lt;key>* *&lt;value>*: Set config variable.

## Configuration
The configuration variables can be set in config.json. The default file has the most important variables.
- **username**: The bot account username, can be set with environment variable CRISPY_USERNAME. *(Default: None)*
- **password**: The bot account password, can be set with environment variable CRISPY_PASSWORD. *(Default: None)*
- **bot**: The bot username. *(Default: Crispybot)*
- **room**: Which room the bot should enter. *(Default: crispybot)*
- **url**: The room url, it's also generated automatically by the room variable. *(Default: https://jumpin.chat/crispybot)*
- **login_url**: The login page url. *(Default: https://jumpin.chat/login)*
- **max_tries**: Max tries to make a phrase based on input form chat. *(Default: 10)*
- **max_len**: Max length of generated phrases. *(Default: 60)*
- **min_len**: Minimum length of generated phrases. *(Default: 10)*
- **max_cache**: Maximum cache size for generated messages. To generate every message from chat use default. *(Default: 0)*
- **refresh_interval**: Interval in minutes between each refresh. *(Default: 10)*
- **sleep_interval**: Sleep interval used in most actions of the bot, change global speed. *(Default: 0.1)*
- **wipe_interval**: Interval in minutes between each sent messages cache wipe. *(Default: 10)*
- **save_interval**: Interval in minutes between each save and cache cleanup for vocabulary data. *(Default: 10)*
- **similarity_score**: Similarity score necessary between generated message and last message to be accepted. *(Default: 0.5)*
- **triggers**: List of words that will trigger answers from the bot even for non-targeted users. *(Default: [])*
- **closed_users**: List of usernames that should be closed automatically after camming up. *(Default: [])*
- **banned_users**: List of usernames that should be banned automatically when joining the room. *(Default: [])*
- **banned_words**: List of banned words, the bot will ban every user, by message or username with those words. *(Default: [])*
- **targets**: List of targeted users that will always have your messages answered by the bot. *(Default: [])*
- **name_change**: Name change message sent by the website. *(Default: changed their name to)*
- **filter**: Messages containing phrases from this list won't be processed by the bot answering mechanism. *(Default: [])*
- **deny_message**: Message sent by the bot when denying a command. *(Default: /shrug)*
- **ban_command**: Ban command used on the website. *(Default: /ban)*
- **ban_message**: Message sent after banning an user. *(Default: /shrug)*
- **unban_command**: Unban command used on the website. *(Default: /unban)*
- **unban_message**: Message sent after unbanning someone. *(Default: /shrug)*
- **close_command**: Close command used on the website. *(Default: /close)*
- **close_message**: Message sent after closing someone. *(Default: /shrug)*
- **trigger_sensitivity**: Sensitivity of the trigger words detection. *(Default: 0.0)*
- **target_sensitivity**: Sensitivity of the target dectection. *(Default: 0.5)*
- **admins**: List of bot admin accounts that have access to commands. *(Default: [])*
- **prefix**: Prefix for bot commands. *(Default: !)*
- **debug**: If set to True the bot will run on a visible chrome window. *(Default: False)*

## Contact

Please if you find any bugs let me know by creating an issue on GitHub.  
The bot is still under development so some of it's features are not fully tested and need improvements.

## License

```
Crispy - An annoying bot.
Copyright (C) 2018  Guilherme Caulada (Sighmir)

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
