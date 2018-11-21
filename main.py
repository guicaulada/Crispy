
from config import *
from crispy import Crispy

crispy = Crispy(
  bot=bot, room=room, targets=targets,
  admins=admins, save_interval=save_interval,
  state_size=state_size, tries=tries, sensitivity=sensitivity,
  similarity=similarity, wipe_interval=wipe_interval
)

from commands import *

crispy.add_vocabulary('sherlock', 'sherlock.txt')
crispy.add_vocabulary('biglebowski', 'biglebowski.txt')
crispy.add_vocabulary('custom', 'custom.txt', newline_text=True, training=True, filter=filtr)

crispy.set_vocabulary('custom')

crispy.add_command('save', save_command)
crispy.add_command('target', target_command)
crispy.add_command('untarget', untarget_command)

crispy.scan()
