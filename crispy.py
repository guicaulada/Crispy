from splinter import Browser
import markovify
import time

with open('sherlock.txt') as f:
  sherlock = f.read()
  sherlock_vocabulary = markovify.Text(sherlock)

with open('biglebowski.txt') as f:
  biglebowski = f.read()
  biglebowski_vocabulary = markovify.Text(biglebowski)

with open('custom.txt') as f:
  training = f.read()
  custom_vocabulary = markovify.NewlineText(training)

cache = []
vocabulary = custom_vocabulary
admins = ['sig','darth','cheach','evil_phil']
target = 'crispy'
bot = 'Crispy_Fuck'

with Browser('chrome', headless=True) as browser:
    # Visit URL
    url = "https://jumpin.chat/420greenroom"
    browser.visit(url)
    time.sleep(0.25)
    browser.find_by_css('.form__Input-inline').fill(bot)
    time.sleep(0.25)
    browser.find_by_text('Go').click()
    time.sleep(0.25)
    browser.find_by_css('.fa-gear').click()
    time.sleep(0.25)
    browser.find_by_id('enableyoutubevideos').click()
    time.sleep(0.25)
    browser.find_by_css('.fa-gear').click()
    time.sleep(0.25)
    browser.find_by_id('enabledarktheme').click()
    time.sleep(0.25)
    browser.find_by_css('.chat__HeaderOption-streamVolume').click()
    time.sleep(0.25)
    browser.find_by_css('.chat__HeaderOption-sounds').click()
    time.sleep(0.25)
    browser.find_by_text('Close cams').click()

    i = 0
    while True:
      if (browser.is_element_present_by_css('.chat__MessageHandle')):
        last_usr = browser.find_by_css('.chat__MessageHandle').last
        last_msg = browser.find_by_css('.chat__MessageBody').last
        if target.lower() in last_usr.text.lower() and last_usr.text.lower() != bot.lower() and len(cache) > 0:
          browser.find_by_css('.chat__Input').fill(cache.pop(0))
          browser.find_by_css('.chat__InputSubmit').click()
        elif last_usr.text.lower() in admins:
          if last_msg.text == '!sherlock':
            browser.find_by_css('.chat__Input').fill('Now using Sherlock Holmes vocabulary!')
            browser.find_by_css('.chat__InputSubmit').click()
            vocabulary = sherlock_vocabulary
            cache = []
            time.sleep(0.25)
          elif last_msg.text == '!biglebowski':
            browser.find_by_css('.chat__Input').fill('Now using Big Lebowski vocabulary!')
            browser.find_by_css('.chat__InputSubmit').click()
            vocabulary = biglebowski_vocabulary
            cache = []
            time.sleep(0.25)
          elif last_msg.text == '!custom':
            browser.find_by_css('.chat__Input').fill('Now using custom vocabulary!')
            browser.find_by_css('.chat__InputSubmit').click()
            vocabulary = custom_vocabulary
            cache = []
            time.sleep(0.25)
        if 'http' not in last_msg.text.lower() and last_usr.text.lower() != bot.lower() and last_msg.text not in training and len(last_msg.text) > 10:
          training = training + '\n' + last_msg.text
          custom_vocabulary = markovify.NewlineText(training)
          time.sleep(0.25)
      if (len(cache) < 100):
        text = vocabulary.make_short_sentence(60)
        if text:
          cache.append(text)
      if (i > 600*4):
        i = 0
        cache = []
        with open('custom.txt', '+w') as f:
          f.write(training)
        time.sleep(0.25)
      i = i + 1


