from crispy.commands import *
from crispy import Crispy
import os
import json

config = {}
with open('config.json', 'r', encoding='utf8') as f:
  config = json.loads(f.read())

crispy = Crispy(**config)

crispy.username = os.environ["CRISPY_USERNAME"]
crispy.password = os.environ["CRISPY_PASSWORD"]

crispy.add_vocabulary('sherlock', file='models/sherlock.txt', type='text', state_size=3)
crispy.add_vocabulary('biglebowski', file='models/biglebowski.txt', type='text', state_size=3)
crispy.add_vocabulary('mixed', file='models/mixed.txt', type='line', state_size=3, training=True)
crispy.add_vocabulary('parrot', file='models/parrot.json', type='json', state_size=3, training=True)

crispy.set_vocabulary('parrot')

crispy.set_command('save', save_command)
crispy.set_command('ban', ban_command)
crispy.set_command('unban', unban_command)
crispy.set_command('close', close_command)
crispy.set_command('unclose', unclose_command)
crispy.set_command('refresh', refresh_command)
crispy.set_command('target', target_command)
crispy.set_command('untarget', untarget_command)
crispy.set_command('admin', admin_command)
crispy.set_command('unadmin', unadmin_command)
crispy.set_command('trigger', trigger_command)
crispy.set_command('untrigger', untrigger_command)
crispy.set_command('filter', filter_command)
crispy.set_command('unfilter', unfilter_command)
crispy.set_command('wipe', wipe_command)
crispy.set_command('crispy', crispy_command)
crispy.set_command('forget', forget_command)
crispy.set_command('vocabulary', vocabulary_command)
crispy.set_command('config', config_command)

crispy.scan()
