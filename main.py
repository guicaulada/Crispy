
from config import *
from crispy.commands import *
from crispy import Crispy

crispy = Crispy(
  bot=bot, room=room, targets=targets, max_len=max_len, filter=filter,
  admins=admins, save_interval=save_interval, min_len=min_len, triggers=triggers,
  state_size=state_size, tries=tries, sensitivity=sensitivity, triggered=triggered,
  similarity=similarity, wipe_interval=wipe_interval, max_cache=max_cache,
  username=username, password=password, banned=banned, deny_message=deny_message,
  refresh_interval=refresh_interval, name_change=name_change
)

crispy.add_vocabulary('sherlock', 'models/sherlock.txt')
crispy.add_vocabulary('biglebowski', 'models/biglebowski.txt')
crispy.add_vocabulary('custom', 'models/custom.txt', newline_text=True, training=True)

crispy.set_vocabulary('custom')

crispy.add_command('save', save_command)
crispy.add_command('wipe', wipe_command)
crispy.add_command('crispy', crispy_command)
crispy.add_command('target', target_command)
crispy.add_command('untarget', untarget_command)
crispy.add_command('forget', forget_command)
crispy.add_command('refresh', refresh_command)
crispy.add_command('ban', ban_command)
crispy.add_command('unban', unban_command)

crispy.scan()
