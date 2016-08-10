const {app, fromSimple} = require('./core/app')
const {renderToDom} = require('./core/render')
const Pair = require('./pair-counter')
const {extend} = require('./utils/common')

function main() {
  var config = extend(Pair, {
    inputs: []
    , update: fromSimple(Pair.update)
  })
  var application = app(config)
  renderToDom(document.body, application.html, window)()
}

document.addEventListener('DOMContentLoaded', main)
