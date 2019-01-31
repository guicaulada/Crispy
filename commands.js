/**
Crispy - An annoying bot.
Copyright (C) 2018  Guilherme Caulada (Sighmir)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is let distributed of the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

module.exports = {
  save_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      await crispy.force_save()
      await crispy.send_message('Training data has been saved!')
    }
  },

  ban_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.add_banned({words: args.slice(1)})
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been added to the ban list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.add_banned({users: args.slice(1)})
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been added to the ban list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !ban user crispy')
        }
      }
    }
  },

  unban_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.del_banned({words: args.slice(1)})
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been removed from the ban list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.del_banned({users: args.slice(1)})
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been removed from the ban list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !unban user crispy')
        }
      }
    }
  },

  kick_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.add_kicked({ words: args.slice(1) })
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been added to the kick list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.add_kicked({ users: args.slice(1) })
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been added to the kick list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !kick user crispy')
        }
      }
    }
  },

  unkick_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.del_kicked({ words: args.slice(1) })
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been removed from the kick list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.del_kicked({ users: args.slice(1) })
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been removed from the kick list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !unkick user crispy')
        }
      }
    }
  },

  clear_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.add_cleared({words: args.slice(1)})
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been added to the cleared words list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.add_cleared({users: args.slice(1)})
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been added to the cleared users list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !clear user crispy')
        }
      }
    }
  },

  unclear_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.del_cleared({words: args.slice(1)})
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been removed from the cleared words list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.del_cleared({users: args.slice(1)})
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been removed from the cleared users list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !unclear user crispy')
        }
      }
    }
  },

  silence_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.add_silenced({words: args.slice(1)})
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been added to the silenced words list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.add_silenced({users: args.slice(1)})
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been added to the silenced users list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !silence user crispy')
        }
      }
    }
  },

  unsilence_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (args[0] == 'word' || args[0] == 'words') {
          await crispy.del_silenced({words: args.slice(1)})
          await crispy.send_message(`Word(s) ${args.slice(1).join(', ')} have been removed from the silenced words list!`)
        } else if (args[0] == 'user' || args[0] == 'user') {
          await crispy.del_silenced({users: args.slice(1)})
          await crispy.send_message(`User(s) ${args.slice(1).join(', ')} have been removed from the silenced users list!`)
        } else {
          await crispy.send_message('Please specify "word" or "user" as the second argument!')
          await crispy.send_message('For example: !unsilence user crispy')
        }
      }
    }
  },

  close_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.add_closed(args)
        await crispy.send_message(`User(s) ${args.join(', ')} have been added to the closed list!`)
      }
    }
  },

  unclose_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.del_closed(args)
        await crispy.send_message(`User(s) ${args.join(', ')} have been removed from the closed list!`)
      }
    }
  },

  refresh_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      await crispy.force_refresh()
    }
  },

  target_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.add_target(args)
        await crispy.send_message(`User(s) ${args.join(', ')} have been added to targets!`)
      }
    }
  },

  untarget_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.del_target(args)
        await crispy.send_message(`User(s) ${args.join(', ')} have been removed from targets!`)
      }
    }
  },

  admin_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.add_admin(args)
        await crispy.send_message(`User(s) ${args.join(', ')} have been added to admins!`)
      }
    }
  },

  unadmin_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.del_admin(args)
        await crispy.send_message(`User(s) ${args.join(', ')} have been removed from admins!`)
      }
    }
  },

  trigger_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.add_trigger(args)
        await crispy.send_message(`Word(s) ${args.join(', ')} have been added to triggers!`)
      }
    }
  },

  untrigger_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.del_trigger(args)
        await crispy.send_message(`Word(s) ${args.join(', ')} have been removed from triggers!`)
      }
    }
  },

  filter_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.add_filter(args.join(' '))
        await crispy.send_message(`The phrase "${args.join(' ')}" have been added to filters!`)
      }
    }
  },

  unfilter_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.del_filter(args.join(' '))
        await crispy.send_message(`The phrase "${args.join(' ')}" have been removed from filters!`)
      }
    }
  },

  wipe_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      await crispy.force_wipe()
      await crispy.send_message('Wiped sent messages cache!')
    }
  },

  crispy_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.answer_to(kwargs.message.username, args.join(' '))
      }
    }
  },

  forget_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.forget(args.join(' '))
        await crispy.send_message(`Phrases containing "${args.join(' ')}" have been forgotten!`)
      }
    }
  },

  vocabulary_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (crispy.has_vocabulary(args[0])) {
          await crispy.set_vocabulary(args[0])
          await crispy.send_message(`Now using ${args[0]} vocabulary!`)
        } else {
          await crispy.send_message(`Vocabulary ${args[0]} not found!`)
        }
      }
    }
  },

  config_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        let old_value = crispy[args[0]]
        if (old_value != null) {
          if (args.length > 1) {
            let new_value = args.slice(1).join(' ')
            if (new_value.toLowerCase() == 'true') {
              new_value = true
            } else if (new_value.toLowerCase() == 'false') {
              new_value = false
            }
            try {
              let value = old_value.constructor(new_value)
              if (value) {
                await crispy.update_config({ [args[0]]: value })
                await crispy.send_message(`Updated config variable: ${args[0]} = ${new_value}`)
              }
            } catch {
              await crispy.send_message(`Invalid value type: ${args[0]} = ${old_value}`)
            }
          } else {
            await crispy.send_message(`Config variable: ${args[0]} = ${old_value}`)
          }
        } else {
          await crispy.send_message(`Invalid value key: ${args[0]}`)
        }
      }
    }
  },

  color_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.color(args[0])
      }
    }
  },

  nick_command: async (kwargs) => {
    let crispy = kwargs.crispy
    if (crispy) {
      let args = kwargs.args
      if (args) {
        await crispy.nick(args[0])
      }
    }
  },

  admins_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    let text = 'Admin users:'
    if (crispy) {
      for (let user of crispy.admins) {
        if ((text+user).length < 200) {
          text = `${text} ${user}`
        } else {
          await crispy.msg(username, text, false)
          text = user
        }
      }
      await crispy.msg(username, text)
    }
  },

  targets_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    let text = 'Target users:'
    if (crispy) {
      for (let user of crispy.targets) {
        if ((text+user).length < 200) {
          text = `${text} ${user}`
        } else {
          await crispy.msg(user, text, false)
          text = user
        }
      }
      await crispy.msg(username, text)
    }
  },

  triggers_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    let text = 'Trigger words:'
    if (crispy) {
      for (let word of crispy.triggers) {
        if ((text+word).length < 200) {
          text = `${text} ${word}`
        } else {
          await crispy.msg(user, text, false)
          text = user
        }
      }
      await crispy.msg(username, text)
    }
  },

  closed_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    let text = 'Closed users:'
    if (crispy) {
      for (let user of crispy.closed_users) {
        if ((text+user).length < 200) {
          text = `${text} ${user}`
        } else {
          await crispy.msg(user, text, false)
          text = user
        }
      }
      await crispy.msg(username, text)
    }
  },

  banned_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    if (crispy) {
      let args = kwargs.args
      if (args) {
        let lst = null
        let text = `Banned ${args[0]}:`
        if (args[0] == 'words') {
          lst = crispy.banned_words
        } else if (args[0] == 'users') {
          lst = crispy.banned_users
        }
        if (lst) {
          for (let el of lst) {
            if ((text+el).length < 200) {
              text = `${text} ${el}`
            } else {
              await crispy.msg(username, text, false)
              text = el
            }
          }
          await crispy.msg(username, text)
        } else {
          await crispy.send_message(crispy.deny_message)
        }
      } else {
        await crispy.send_message(crispy.deny_message)
      }
    }
  },

  kicked_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    if (crispy) {
      let args = kwargs.args
      if (args) {
        let lst = null
        let text = `Kicked ${args[0]}:`
        if (args[0] == 'words') {
          lst = crispy.kicked_words
        } else if (args[0] == 'users') {
          lst = crispy.kicked_users
        }
        if (lst) {
          for (let el of lst) {
            if ((text + el).length < 200) {
              text = `${text} ${el}`
            } else {
              await crispy.msg(username, text, false)
              text = el
            }
          }
          await crispy.msg(username, text)
        } else {
          await crispy.send_message(crispy.deny_message)
        }
      } else {
        await crispy.send_message(crispy.deny_message)
      }
    }
  },

  cleared_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    if (crispy) {
      let args = kwargs.args
      if (args) {
        let lst = null
        let text = `Cleared ${args[0]}:`
        if (args[0] == 'words') {
          lst = crispy.cleared_words
        } else if (args[0] == 'users') {
          lst = crispy.cleared_users
        }
        if (lst) {
          for (let el of lst) {
            if ((text+el).length < 200) {
              text = `${text} ${el}`
            } else {
              await crispy.msg(username, text, false)
              text = el
            }
          }
          await crispy.msg(username, text)
        } else {
          await crispy.send_message(crispy.deny_message)
        }
      } else {
        await crispy.send_message(crispy.deny_message)
      }
    }
  },

  silenced_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    if (crispy) {
      let args = kwargs.args
      if (args) {
        let lst = null
        let text = `Silenced ${args[0]}:`
        if (args[0] == 'words') {
          lst = crispy.silenced_words
        } else if (args[0] == 'users') {
          lst = crispy.silenced_users
        }
        if (lst) {
          for (let el of lst) {
            if ((text+el).length < 200) {
              text = `${text} ${el}`
            } else {
              await crispy.msg(username, text, false)
              text = el
            }
          }
          await crispy.msg(username, text)
        } else {
          await crispy.send_message(crispy.deny_message)
        }
      } else {
        await crispy.send_message(crispy.deny_message)
      }
    }
  },

  help_command: async (kwargs) => {
    let crispy = kwargs.crispy
    let username = kwargs.message.username
    if (crispy) {
      let args = kwargs.args
      if (args) {
        if (crispy.is_command(crispy.prefix+args[0])) {
          await crispy.msg(username, crispy.command_help[args[0]])
        } else {
          await crispy.send_message(crispy.deny_message)
        }
      } else {
        let text = 'Commands:'
        for (let command of crispy.commands) {
          if ((text+command).length < 200) {
            text = `${text} ${command}`
          } else {
            await crispy.msg(username, text, false)
            text = command
          }
        }
        await crispy.msg(username, text)
      }
    }
  }
}
