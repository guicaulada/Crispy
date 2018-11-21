
def save_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    crispy.send_message(crispy.answer_to('save'))
    crispy.force_save()

def target_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.send_message(crispy.answer_to(' '.join(args)))
      crispy.add_target(args)

def untarget_command(**kwargs):
  crispy = kwargs.get('crispy')
  if crispy:
    args = kwargs.get('args')
    if args:
      crispy.send_message(crispy.answer_to(' '.join(args)))
      crispy.del_target(args)