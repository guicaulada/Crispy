/**
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
*/

(async () => {

console.log(`
Crispy - An annoying bot.  Copyright (C) 2018  Guilherme Caulada (Sighmir)
This is free software, and you are welcome to redistribute it under certain conditions;
This program comes with ABSOLUTELY NO WARRANTY;
`)

let Crispy = require('..')

const fs = require('fs')
let config = fs.readFileSync('./example/config.json', 'utf8')

let crispy = await new Crispy(JSON.parse(config))

crispy.username = config.username || process.env['CRISPY_USERNAME']
crispy.password = config.password || process.env['CRISPY_PASSWORD']

console.log()
crispy.add_vocabulary('sherlock', {file: './example/models/sherlock.txt', state_size: 3})
crispy.add_vocabulary('biglebowski', { file: './example/models/biglebowski.txt', state_size: 3})
crispy.add_vocabulary('mixed', { file: './example/models/mixed.txt', state_size: 3, training: true})
crispy.add_vocabulary('parrot', { file: './example/models/parrot.json', state_size: 3, training: true})
console.log()

crispy.set_vocabulary('parrot')

let cmds = crispy.default_commands()
crispy.set_command('help', cmds.help_command, 'help [<command>] - Private message the list of commands or specific help about a command.')
crispy.set_command('save', cmds.save_command, 'save - Saves training data and cleans cached messages.')
crispy.set_command('ban', cmds.ban_command, 'ban <users|words> <targets> - Add users or words to the banned list.')
crispy.set_command('unban', cmds.unban_command, 'unban <users|words> <targets> - Remove users or words from the banned list.')
crispy.set_command('clear', cmds.clear_command, 'clear <users|words> <targets> - Add users or words to the cleared list.')
crispy.set_command('unclear', cmds.unclear_command, 'unclear <users|words> <targets> - Remove users or words from the cleared list.')
crispy.set_command('silence', cmds.silence_command, 'silence <users|words> <targets> - Add users or words to the silenced list.')
crispy.set_command('unsilence', cmds.unsilence_command, 'unsilence <users|words> <targets> - Remove users or words from the silenced list.')
crispy.set_command('close', cmds.close_command, 'close <usernames> - Add users to the closed list, the bot will close his cam automatically.')
crispy.set_command('unclose', cmds.unclose_command, 'unclose <usernames> - Remove users from the closed list.') // This feature makes the bot slow
crispy.set_command('refresh', cmds.refresh_command, 'refresh - Make the bot refresh the page.')
crispy.set_command('target', cmds.target_command, 'target <usernames> - Add users to the targets list, the bot will answer those users.')
crispy.set_command('untarget', cmds.untarget_command, 'untarget <usernames> - Remove users from the targets list.')
crispy.set_command('admin', cmds.admin_command, 'admin <usernames> - Add users to the admins list, the bot will accept commands from those users.')
crispy.set_command('unadmin', cmds.unadmin_command, 'unadmin <usernames> - Remove users from the admins list.')
crispy.set_command('trigger', cmds.trigger_command, 'trigger <words> - Add words to the triggers list, the bot will answer to those words.')
crispy.set_command('untrigger', cmds.untrigger_command, 'untrigger <words> - Remove words from the triggers list.')
crispy.set_command('filter', cmds.filter_command, 'filter <phrase> - Add a phrase to the filters list, the bot won\'t process messages containing that phrase.')
crispy.set_command('unfilter', cmds.unfilter_command, 'unfilter <phrase> - Remove a phrase from the filters list.')
crispy.set_command('wipe', cmds.wipe_command, 'wipe - Wipe sent messages cache.')
crispy.set_command('crispy', cmds.crispy_command, 'crispy <phrase> - Make the bot answer to a phrase without being targeted.')
crispy.set_command('forget', cmds.forget_command, 'forget <phrase> - Make the bot forget phrases from training data containg <phrase>.')
crispy.set_command('vocabulary', cmds.vocabulary_command, 'vocabulary <name> - Set the bot vocabulary.')
crispy.set_command('config', cmds.config_command, 'config <key> <value> - Set config variable.')
crispy.set_command('nick', cmds.nick_command, 'nick <name> - Set the bot nickname.')
crispy.set_command('color', cmds.color_command, 'color - Changes the bot chat color.')
crispy.set_command('closed', cmds.closed_command, 'closed - Private messages the closed users list.')
crispy.set_command('banned', cmds.banned_command, 'banned <users|words> - Private messages the banned users/words list.')
crispy.set_command('cleared', cmds.cleared_command, 'cleared <users|words> - Private messages the cleared users/words list.')
crispy.set_command('silenced', cmds.silenced_command, 'silenced <users|words> - Private messages the silenced users/words list.')
crispy.set_command('targets', cmds.targets_command, 'targets - Private messages the target users list.')
crispy.set_command('triggers', cmds.triggers_command, 'triggers - Private messages the trigger words list.')
crispy.set_command('admins', cmds.admins_command, 'admins - Private messages the admin users list.')

await crispy.scan()

})()