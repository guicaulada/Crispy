
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

def close_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.add_closed(args)
      crispy.send_message('User(s) {} have been added to the closed list!'.format(', '.join(args[1:])))

def unclose_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.del_closed(args)
      crispy.send_message('User(s) {} have been removed from the closed list!'.format(', '.join(args[1:])))

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
      value = None
      try:
        value = float(args[1])
      except ValueError:
        value = ' '.join(args[1:])
      if value:
        crispy.update_config({args[0]: value})
        crispy.send_message('Updated config variable: {} = {}'.format(args[0], str(value)))
