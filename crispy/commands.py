
def save_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    crispy.answer_to('save')
    crispy.force_save()

def target_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.answer_to(' '.join(args))
      crispy.add_target(args)

def untarget_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.answer_to(' '.join(args))
      crispy.del_target(args)

def wipe_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    crispy.answer_to('wipe')
    crispy.force_wipe()

def crispy_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.answer_to(' '.join(args))

def forget_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.answer_to('forget')
      crispy.forget(' '.join(args))
