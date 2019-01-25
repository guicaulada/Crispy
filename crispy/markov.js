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
    super(kwargs)
    if (kwargs.json) {
      this.json = true
      this.user_model = {}
      this.mixed_corpus = []
      this.user_corpus = JSON.parse(kwargs.json)
      for (let user in this.user_corpus) {
        kwargs.corpus = this.user_corpus[user]
        this.user_model[user] = new MarkovText(kwargs)
        this.mixed_corpus.push(...this.user_corpus[user])
      }
      kwargs.corpus = this.mixed_corpus
      this.mixedModel = new MarkovText(kwargs)
    }
    this.file = kwargs.file
    this.training = kwargs.training
  }

  make_sentence_from(message, max_chars, min_chars=0, kwargs) {
    let tries = kwargs['tries', 10]
    let case_sensitive = kwargs['case_sensitive'] != null ? kwargs['case_sensitive'] : true
    let similarity = kwargs['similarity', 0.5]
    let filter = kwargs['filter'] || []
    let words = new pos.Lexer().lex(message)
    let tags = new pos.Tagger().tag(words)
    keywords = () => {
      let k = []
      if (case_sensitive) for (let t of tags) if (t[1][0] == 'N' || t[1][0] == 'R' || t[1][0] == 'V') k.push(t[0])
      else for (let t of tags) if (t[1][0] == 'N' || t[1][0] == 'R' || t[1][0] == 'V') k.push(t[0].toLowerCase())
      return k
    }
    let sentences = this.predict({
      init_state: null,
      max_chars: max_chars,
      numberOfSentences: tries,
      popularFirstWord: true
    })
    for (let sentence in sentences) {
      if (!(sentence in filter)) {
        let s_words = new pos.Lexer().lex(message)
        var s_tags = new pos.Tagger().tag(words)
        keywords = () => {
          let k = []
          if (case_sensitive) for (let t of s_tags) if (t[0] in keywords()) k.push(t[0])
          else for (let t of s_tags) if (t[0] in keywords()) k.push(t[0].toLowerCase())
          return k
        }
        if (sm.sequenceMatcher(keywords, s_keywords) > similarity) {
          return sentence
        }
      }
    }
  }

  add_text(text, kwargs) {
    if (!this.has_text(text, kwargs)) {
      if (this.json) {
        this.mixedModel.corpus.push(text)
        this.mixedModel = new MarkovText(this.mixedModel)
        if (kwargs.username) {
          this.user_corpus[kwargs.username].push(text)
          this.user_model[kwargs.username].corpus.push(text)
          this.user_model[kwargs.username] = new MarkovText(this.user_model[kwargs.username])
        }
      } else {
        this.corpus.push(text+'\n')
        this.constructor(this)
      }
    }
  }

  has_text(text, kwargs) {
    if (this.json) {
      if (kwargs.username) {
        return text in this.user_model[kwargs.username].corpus
      } else {
        return text in this.mixedModel.corpus
      }
    } else {
      return text in this.corpus
    }
  }

  del_text(text, kwargs) {
    if (this.json) {
      this.mixedModel.corpus = this.mixedModel.corpus.filter(word => word != text)
      this.mixedModel = new MarkovText(this.mixedModel)
      if (kwargs.username) {
        this.user_model[kwargs.username].corpus = this.user_model[kwargs.username].corpus.filter(word => word != text)
        this.user_model[kwargs.username] = new MarkovText(this.user_model[kwargs.username])
      }
    } else {
      this.corpus = this.corpus.filter(word => word != text)
      this.constructor(this)
    }
  }

  get_text() {
    if (this.json) return JSON.stringify(this.user_corpus, null, 2)
    else return this.corpus.join('\n')
  }
}

module.exports=MarkovText