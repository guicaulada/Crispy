'''
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
'''

print('''
Crispy - An annoying bot.  Copyright (C) 2018  Guilherme Caulada (Sighmir)
This is free software, and you are welcome to redistribute it under certain conditions;
This program comes with ABSOLUTELY NO WARRANTY;''')

from crispy.commands import *
from crispy import Crispy
import os
import json

config = {}
with open('config.json', 'r', encoding='utf8') as f:
  config = json.loads(f.read())

crispy = Crispy(**config)

crispy.username = config.get('username', os.environ.get('CRISPY_USERNAME'))
crispy.password = config.get('password', os.environ.get('CRISPY_PASSWORD'))

crispy.add_vocabulary('sherlock', file='models/sherlock.txt', type='text', state_size=3)
crispy.add_vocabulary('biglebowski', file='models/biglebowski.txt', type='text', state_size=3)
crispy.add_vocabulary('mixed', file='models/mixed.txt', type='line', state_size=3, training=True)
crispy.add_vocabulary('parrot', file='models/parrot.json', type='json', state_size=3, training=True)

crispy.set_vocabulary('parrot')

crispy.set_command('help', help_command, 'help [<command>] - Private message the list of commands or specific help about a command.')
crispy.set_command('save', save_command, 'save - Saves training data and cleans cached messages.')
crispy.set_command('ban', ban_command, 'ban <users|words> <targets> - Add users or words to the banned list.')
crispy.set_command('unban', unban_command, 'unban <users|words> <targets> - Remove users or words from the banned list.')
crispy.set_command('clear', clear_command, 'clear <users|words> <targets> - Add users or words to the cleared list.')
crispy.set_command('unclear', unclear_command, 'unclear <users|words> <targets> - Remove users or words from the cleared list.')
crispy.set_command('silence', silence_command, 'silence <users|words> <targets> - Add users or words to the silenced list.')
crispy.set_command('unsilence', unsilence_command, 'unsilence <users|words> <targets> - Remove users or words from the silenced list.')
crispy.set_command('close', close_command, 'close <usernames> - Add users to the closed list, the bot will close his cam automatically.')
crispy.set_command('unclose', unclose_command, 'unclose <usernames> - Remove users from the closed list.')
crispy.set_command('refresh', refresh_command, 'refresh - Make the bot refresh the page.')
crispy.set_command('target', target_command, 'target <usernames> - Add users to the targets list, the bot will answer those users.')
crispy.set_command('untarget', untarget_command, 'untarget <usernames> - Remove users from the targets list.')
crispy.set_command('admin', admin_command, 'admin <usernames> - Add users to the admins list, the bot will accept commands from those users.')
crispy.set_command('unadmin', unadmin_command, 'unadmin <usernames> - Remove users from the admins list.')
crispy.set_command('trigger', trigger_command, 'trigger <words> - Add words to the triggers list, the bot will answer to those words.')
crispy.set_command('untrigger', untrigger_command, 'untrigger <words> - Remove words from the triggers list.')
crispy.set_command('filter', filter_command, 'filter <phrase> - Add a phrase to the filters list, the bot won\'t process messages containing that phrase.')
crispy.set_command('unfilter', unfilter_command, 'unfilter <phrase> - Remove a phrase from the filters list.')
crispy.set_command('wipe', wipe_command, 'wipe - Wipe sent messages cache.')
crispy.set_command('crispy', crispy_command, 'crispy <phrase> - Make the bot answer to a phrase without being targeted.')
crispy.set_command('forget', forget_command, 'forget <phrase> - Make the bot forget phrases from training data containg <phrase>.')
crispy.set_command('vocabulary', vocabulary_command, 'vocabulary <name> - Set the bot vocabulary.')
crispy.set_command('config', config_command, 'config <key> <value> - Set config variable.')
crispy.set_command('nick', nick_command, 'nick <name> - Set the bot nickname.')
crispy.set_command('color', color_command, 'color - Changes the bot chat color.')
crispy.set_command('closed', closed_command, 'closed - Private messages the closed users list.')
crispy.set_command('banned', banned_command, 'banned <users|words> - Private messages the banned users/words list.')
crispy.set_command('cleared', cleared_command, 'cleared <users|words> - Private messages the cleared users/words list.')
crispy.set_command('silenced', silenced_command, 'silenced <users|words> - Private messages the silenced users/words list.')
crispy.set_command('targets', targets_command, 'targets - Private messages the target users list.')
crispy.set_command('triggers', triggers_command, 'triggers - Private messages the trigger words list.')
crispy.set_command('admins', admins_command, 'admins - Private messages the admin users list.')

crispy.scan()
