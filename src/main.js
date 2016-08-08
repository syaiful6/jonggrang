const {app, renderToDom} = require('./core/app')
const Pair = require('./pair-counter')
const {extend} = require('./utils/common')

function main() {
  var config = extend(Pair, {inputs: []}),
    application = app(config)

  renderToDom(document.body, application)()
}

document.addEventListener('DOMContentLoaded', main)
