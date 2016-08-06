const app = require('./core/app')
const Pair = require('./pair-counter')
const {extend} = require('./utils/common')
const renderService = require("mithril/render/render")(window)
const redrawService = require("mithril/api/pubsub")()
const mount = require("mithril/api/mount")(renderService, redrawService)

function main() {
  const config = extend(Pair, {inputs: []})
  mount(document.body, app(config))
}

document.addEventListener('DOMContentLoaded', main)
