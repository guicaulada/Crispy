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

def save_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    crispy.force_save()
    crispy.send_message('Training data has been saved!')

def ban_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if args[0] == 'word' or args[0] == 'words':
        crispy.add_banned(words=args[1:])
        crispy.send_message('Word(s) {} have been added to the ban list!'.format(', '.join(args[1:])))
      elif args[0] == 'user' or args[0] == 'user':
        crispy.add_banned(users=args[1:])
        crispy.send_message('User(s) {} have been added to the ban list!'.format(', '.join(args[1:])))
      else:
        crispy.send_message('Please specify "word" or "user" as the second argument!')
        crispy.send_message('For example: !ban user crispy')

def unban_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if args[0] == 'word' or args[0] == 'words':
        crispy.del_banned(words=args[1:])
        crispy.send_message('Word(s) {} have been removed from the ban list!'.format(', '.join(args[1:])))
      elif args[0] == 'user' or args[0] == 'user':
        crispy.del_banned(users=args[1:])
        crispy.send_message('User(s) {} have been removed from the ban list!'.format(', '.join(args[1:])))
      else:
        crispy.send_message('Please specify "word" or "user" as the second argument!')
        crispy.send_message('For example: !unban user crispy')

def clear_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if args[0] == 'word' or args[0] == 'words':
        crispy.add_cleared(words=args[1:])
        crispy.send_message('Word(s) {} have been added to the cleared words list!'.format(', '.join(args[1:])))
      elif args[0] == 'user' or args[0] == 'user':
        crispy.add_cleared(users=args[1:])
        crispy.send_message('User(s) {} have been added to the cleared users list!'.format(', '.join(args[1:])))
      else:
        crispy.send_message('Please specify "word" or "user" as the second argument!')
        crispy.send_message('For example: !clear user crispy')

def unclear_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if args[0] == 'word' or args[0] == 'words':
        crispy.del_cleared(words=args[1:])
        crispy.send_message('Word(s) {} have been removed from the cleared words list!'.format(', '.join(args[1:])))
      elif args[0] == 'user' or args[0] == 'user':
        crispy.del_cleared(users=args[1:])
        crispy.send_message('User(s) {} have been removed from the cleared users list!'.format(', '.join(args[1:])))
      else:
        crispy.send_message('Please specify "word" or "user" as the second argument!')
        crispy.send_message('For example: !unclear user crispy')

def silence_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if args[0] == 'word' or args[0] == 'words':
        crispy.add_silenced(words=args[1:])
        crispy.send_message('Word(s) {} have been added to the silenced words list!'.format(', '.join(args[1:])))
      elif args[0] == 'user' or args[0] == 'user':
        crispy.add_silenced(users=args[1:])
        crispy.send_message('User(s) {} have been added to the silenced users list!'.format(', '.join(args[1:])))
      else:
        crispy.send_message('Please specify "word" or "user" as the second argument!')
        crispy.send_message('For example: !silence user crispy')

def unsilence_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if args[0] == 'word' or args[0] == 'words':
        crispy.del_silenced(words=args[1:])
        crispy.send_message('Word(s) {} have been removed from the silenced words list!'.format(', '.join(args[1:])))
      elif args[0] == 'user' or args[0] == 'user':
        crispy.del_silenced(users=args[1:])
        crispy.send_message('User(s) {} have been removed from the silenced users list!'.format(', '.join(args[1:])))
      else:
        crispy.send_message('Please specify "word" or "user" as the second argument!')
        crispy.send_message('For example: !unsilence user crispy')

def close_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.add_closed(args)
      crispy.send_message('User(s) {} have been added to the closed list!'.format(', '.join(args)))

def unclose_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.del_closed(args)
      crispy.send_message('User(s) {} have been removed from the closed list!'.format(', '.join(args)))

def refresh_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    crispy.force_refresh()

def target_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.add_target(args)
      crispy.send_message('User(s) {} have been added to targets!'.format(', '.join(args)))

def untarget_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.del_target(args)
      crispy.send_message('User(s) {} have been removed from targets!'.format(', '.join(args)))

def admin_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.add_admin(args)
      crispy.send_message('User(s) {} have been added to admins!'.format(', '.join(args)))

def unadmin_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.del_admin(args)
      crispy.send_message('User(s) {} have been removed from admins!'.format(', '.join(args)))

def trigger_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.add_trigger(args)
      crispy.send_message('Word(s) {} have been added to triggers!'.format(', '.join(args)))

def untrigger_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.del_trigger(args)
      crispy.send_message('Word(s) {} have been removed from triggers!'.format(', '.join(args)))

def filter_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.add_filter(' '.join(args))
      crispy.send_message('The phrase "{}" have been added to filters!'.format(' '.join(args)))

def unfilter_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.del_filter(' '.join(args))
      crispy.send_message('The phrase "{}" have been removed from filters!'.format(' '.join(args)))

def wipe_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    crispy.force_wipe()
    crispy.send_message('Wiped sent messages cache!')

def crispy_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.answer_to(kwargs.get('username'), ' '.join(args))

def forget_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.forget(' '.join(args))
      crispy.send_message('Phrases containing "{}" have been forgotten!'.format(' '.join(args)))

def vocabulary_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      if crispy.has_vocabulary(args[0]):
        crispy.set_vocabulary(args[0])
        crispy.send_message('Now using {} vocabulary!'.format(args[0]))
      else:
        crispy.send_message('Vocabulary {} not found!'.format(args[0]))

def config_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      old_value = getattr(crispy, args[0])
      if old_value != None:
        if len(args) > 1:
          new_value = ' '.join(args[1:])
          if new_value.lower() == 'true':
            new_value = True
          elif new_value.lower() == 'false':
            new_value = False
          try:
            value = type(old_value)(new_value)
          except ValueError:
            crispy.send_message('Invalid value type: {} = {}'.format(args[0], str(old_value)))
          else:
            crispy.update_config({args[0]: value})
            crispy.send_message('Updated config variable: {} = {}'.format(args[0], str(new_value)))
        else:
            crispy.send_message('Config variable: {} = {}'.format(args[0], str(old_value)))
      else:
        crispy.send_message('Invalid value key: {}'.format(args[0]))


def color_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.color(args[0])


def nick_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.nick(args[0])

def admins_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  text = 'Admin users:'
  if crispy:
    for user in crispy.admins:
      if len(text+user) < 200:
        text = '{} {}'.format(text, user)
      else:
        crispy.msg(username, text, False)
        text = ''
    crispy.msg(username, text)

def targets_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  text = 'Target users:'
  if crispy:
    for user in crispy.targets:
      if len(text+user) < 200:
        text = '{} {}'.format(text, user)
      else:
        crispy.msg(username, text, False)
        text = ''
    crispy.msg(username, text)

def triggers_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  text = 'Trigger words:'
  if crispy:
    for word in crispy.triggers:
      if len(text+word) < 200:
        text = '{} {}'.format(text, word)
      else:
        crispy.msg(username, text, False)
        text = ''
    crispy.msg(username, text)

def closed_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  text = 'Closed users:'
  if crispy:
    for user in crispy.closed_users:
      if len(text+user) < 200:
        text = '{} {}'.format(text, user)
      else:
        crispy.msg(username, text, False)
        text = ''
    crispy.msg(username, text)

def banned_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  if crispy:
    args = kwargs.get('args')
    if args:
      lst = None
      text = 'Banned {}:'.format(args[0])
      if args[0] == 'words':
        lst = crispy.banned_words
      elif args[0] == 'users':
        lst = crispy.banned_users
      if lst:
        for el in lst:
          if len(text+el) < 200:
            text = '{} {}'.format(text, el)
          else:
            crispy.msg(username, text, False)
            text = ''
        crispy.msg(username, text)
      else:
        crispy.send_message(crispy.deny_message)
    else:
      crispy.send_message(crispy.deny_message)

def cleared_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  if crispy:
    args = kwargs.get('args')
    if args:
      lst = None
      text = 'Cleared {}:'.format(args[0])
      if args[0] == 'words':
        lst = crispy.cleared_words
      elif args[0] == 'users':
        lst = crispy.cleared_users
      if lst:
        for el in lst:
          if len(text+el) < 200:
            text = '{} {}'.format(text, el)
          else:
            crispy.msg(username, text, False)
            text = ''
        crispy.msg(username, text)
      else:
        crispy.send_message(crispy.deny_message)
    else:
      crispy.send_message(crispy.deny_message)

def silenced_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  if crispy:
    args = kwargs.get('args')
    if args:
      lst = None
      text = 'Silenced {}:'.format(args[0])
      if args[0] == 'words':
        lst = crispy.silenced_words
      elif args[0] == 'users':
        lst = crispy.silenced_users
      if lst:
        for el in lst:
          if len(text+el) < 200:
            text = '{} {}'.format(text, el)
          else:
            crispy.msg(username, text, False)
            text = ''
        crispy.msg(username, text)
      else:
        crispy.send_message(crispy.deny_message)
    else:
      crispy.send_message(crispy.deny_message)

def help_command(**kwargs):
  crispy = kwargs.get('crispy')
  username = kwargs.get('username')
  if crispy:
    args = kwargs.get('args')
    if args:
      if crispy.is_command(crispy.prefix+args[0]):
        crispy.msg(username, crispy.command_help[args[0]])
      else:
        crispy.send_message(crispy.deny_message)
    else:
      text = 'Commands:'
      for command in crispy.commands:
        if len(text+command) < 200:
          text = '{} {}'.format(text, command)
        else:
          crispy.msg(username, text, False)
          text = ''
      crispy.msg(username, text)
