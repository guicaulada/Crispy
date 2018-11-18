from splinter import Browser
import markovify
import time

with open('sherlock.txt') as f:
  sherlock = f.read()
  sherlock_vocabulary = markovify.Text(sherlock)

with open('biglebowski.txt') as f:
  sherlock = f.read()
  biglebowski_vocabulary = markovify.Text(sherlock)

cache = []
training = 'Cheers!'
custom_vocabulary = markovify.Text(training)
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

    while True:
      if (browser.is_element_present_by_css('.chat__MessageHandle')):
        last_usr = browser.find_by_css('.chat__MessageHandle').last
        last_msg = browser.find_by_css('.chat__MessageBody').last
        if 'http' not in last_msg.text.lower() and last_usr.text.lower() != bot.lower():
          training = training + '\n' + last_msg.text
          custom_vocabulary = markovify.Text(training)
        if target.lower() in last_usr.text.lower() and last_usr.text.lower() != bot.lower():
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
      if (len(cache) < 100):
        text = vocabulary.make_short_sentence(60)
        if text:
          cache.append(text)

