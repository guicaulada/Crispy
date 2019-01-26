/**
Crispy - An annoying bot.
Copyright (C) 2018  Guilherme Caulada (Sighmir)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const mv = require('node-markovify')
const sm = require('sequencematcher');
const pos = require('pos')

class MarkovText extends mv.markovText {
  constructor(kwargs) {
    super()
    let json = kwargs.json
    let user_model = {}
    let mixed_model = {}
    let mixed_corpus = []
    let json_data = {}
    if (kwargs.json) {
      json_data = JSON.parse(kwargs.json)
      kwargs.json = false
      for (let user in json_data) {
        kwargs.corpus = json_data[user]
        user_model[user] = new MarkovText(kwargs)
        user_model[user].username = user
        mixed_corpus.push(...json_data[user])
      }
      kwargs.corpus = mixed_corpus
      mixed_model = new MarkovText(kwargs)
    }
    if (kwargs.corpus.length > 25) {
      this.init(kwargs)
      this.file = kwargs.file
      this.training = kwargs.training
      this.user_model = user_model
      this.mixed_model = mixed_model
      this.json_data = json_data
      this.json = json
      this.ready = true
    }
  }

  make_sentence_from(message, max_chars, min_chars=0, kwargs) {
    let tries = kwargs.tries != null ? kwargs.tries : 10
    let case_sensitive = kwargs.case_sensitive != null ? kwargs['case_sensitive'] : true
    let similarity = kwargs.similarity != null ? kwargs.similarity : 0.5
    let filter = kwargs.filter || []
    let words = new pos.Lexer().lex(message)
    let tags = new pos.Tagger().tag(words)
    let keywords = (() => {
      let k = []
      if (case_sensitive) for (let t of tags) if (t[1][0] == 'N' || t[1][0] == 'R' || t[1][0] == 'V') k.push(t[0])
      else for (let t of tags) if (t[1][0] == 'N' || t[1][0] == 'R' || t[1][0] == 'V') k.push(t[0].toLowerCase())
      return Array.from(new Set(k))
    })()
    let model = this
    if (model.json) {
      model = this.mixed_model
      if (kwargs.username) {
        if (this.user_model[kwargs.username] && this.user_model[kwargs.username].ready) {
          model = this.user_model[kwargs.username]
          model.username = kwargs.username
        }
      }
    }
    let sentences = new Set(model.predict({
      init_state: null,
      max_chars: max_chars,
      numberOfSentences: tries,
      popularFirstWord: false
    }))
    for (let sentence of sentences) {
      if (!(filter.indexOf(sentence) >= 0)) {
        let s_words = new pos.Lexer().lex(sentence)
        var s_tags = new pos.Tagger().tag(s_words)
        let s_keywords = (() => {
          let k = []
          if (case_sensitive) for (let t of s_tags) if (keywords.indexOf(t[0]) >= 0) k.push(t[0])
          else for (let t of s_tags) if (keywords.indexOf(t[0]) >= 0) k.push(t[0].toLowerCase())
          return Array.from(new Set(k))
        })()
        if (sm.sequenceMatcher(keywords, s_keywords) > similarity) {
          return sentence
        }
      }
    }
    if (model.username) {
      kwargs.username = false
      this.make_sentence_from(message, max_chars, min_chars, kwargs)
    }
  }

  async add_text(text, kwargs) {
    if (!this.has_text(text, kwargs)) {
      if (this.json) {
        this.mixed_model.corpus.push(text)
        this.mixed_model.init(this.mixed_model)
        if (kwargs.username) {
          if (!this.json_data[kwargs.username]) {
            this.json_data[kwargs.username] = []
            this.user_model[kwargs.username] = {text: [], corpus: []}
          }
          this.json_data[kwargs.username].push(text)
          this.user_model[kwargs.username].corpus.push(text)
          this.user_model[kwargs.username].init(this.user_model[kwargs.username])
        }
      } else {
        this.corpus.push(text)
        this.init(this)
      }
    }
  }

   has_text(text, kwargs) {
    if (this.json) {
      if (kwargs.username) {
        if (!this.json_data[kwargs.username]) {
          this.json_data[kwargs.username] = []
          this.user_model[kwargs.username] = {text: [], corpus: []}
        }
        return this.user_model[kwargs.username].corpus.indexOf(text) >= 0
      } else {
        return this.mixed_model.corpus.indexOf(text) >= 0
      }
    } else {
      return this.corpus.indexOf(text) >= 0
    }
  }

  async del_text(text, kwargs) {
    if (this.json) {
      this.mixed_model.corpus = this.mixed_model.corpus.filter(word => word != text)
      this.mixed_model = new MarkovText(this.mixed_model)
      if (kwargs.username) {
        if (!this.json_data[kwargs.username]) {
          this.json_data[kwargs.username] = []
          this.user_model[kwargs.username] = { text: '', corpus: [] }
        }
        this.user_model[kwargs.username].corpus = this.user_model[kwargs.username].corpus.filter(word => word != text)
        this.user_model[kwargs.username] = new MarkovText(this.user_model[kwargs.username])
      }
    } else {
      this.corpus = this.corpus.filter(word => word != text)
      this.init(this)
    }
  }

  get_text() {
    if (this.json) return JSON.stringify(this.json_data, null, 2)
    else return this.corpus.join('\n')
  }
}

module.exports=MarkovText