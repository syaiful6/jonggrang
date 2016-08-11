const {app, fromSimple} = require('jonggrang')
const {renderToDom} = require('jonggrang/src/html/render')
const Pair = require('./pair-counter')
const merge = require('ramda/src/merge')

function main() {
  var config = merge(Pair, {
    inputs: []
    , update: fromSimple(Pair.update)
  })
  var application = app(config)
  renderToDom(document.body, application.html, window)()
}

document.addEventListener('DOMContentLoaded', main)
