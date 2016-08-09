const {app, renderToDom, fromSimple} = require('./core/app')
const Pair = require('./pair-counter')
const {extend} = require('./utils/common')

function main() {
  var config = extend(Pair, {
    inputs: []
    , update: fromSimple(Pair.update)
  })
  renderToDom(document.body, app(config))()
}

document.addEventListener('DOMContentLoaded', main)
