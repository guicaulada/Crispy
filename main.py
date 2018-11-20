from config import *
from crispy import Crispy

crispy = Crispy(
  bot=bot, room=room, target=target,
  admins=admins, save_interval=save_interval,
  state_size=state_size, tries=tries,
  similarity=similarity, wipe_interval=wipe_interval
)

crispy.add_vocabulary('sherlock', 'sherlock.txt')
crispy.add_vocabulary('biglebowski', 'biglebowski.txt')
crispy.add_vocabulary('custom', 'custom.txt', newline_text=True, training=True, filter=filtr)

crispy.set_vocabulary('custom')

def save_command():
  crispy.send_message('Saving trained data!')
  crispy.force_save()

crispy.add_command('save', save_command)

crispy.scan()
