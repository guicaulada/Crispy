from config import *
from crispy import Crispy

crispy = Crispy(Bot=Bot, Room=Room, Target=Target, Admins=Admins, SaveInterval=SaveInterval)

crispy.add_vocabulary('sherlock', 'sherlock.txt')
crispy.add_vocabulary('biglebowski', 'biglebowski.txt')
crispy.add_vocabulary('custom', 'custom.txt', NewlineText=True, Training=True, Filter=Filter)

crispy.set_vocabulary('custom')

def save_command():
  crispy.send_message('Saving trained data!')
  crispy.force_save()

crispy.add_command('save', save_command)

crispy.scan()
