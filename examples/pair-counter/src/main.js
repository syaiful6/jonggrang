const {app, fromSimple, renderToDom} = require('jonggrang')
const Pair = require('./pair-counter')
const merge = require('ramda/src/merge')

function main() {
  var config = merge(Pair, {
    inputs: []
    , update: fromSimple(Pair.update)
  })
  var application = app(config)
  renderToDom(document.getElementById('app'), application.html, window)()
}

document.addEventListener('DOMContentLoaded', main)
