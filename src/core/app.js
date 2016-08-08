const curry = require('ramda/src/curry')
const {merge, reduce} = require('../utils/stream-operator')
const {identity, compose, flip} = require('../control/combinator')
const {map} = require('../control/pointfree')
const {stream} = require('mithril/util/stream')
const render = require('./render')
const renderService = require("mithril/render/render")

function app(config) {
  var inputs = stream(),
    state = reduce(flip(config.update), config.initialState(), inputs)

  state(config.initialState())

  return map(compose(render(inputs, identity), config.view), state)
}

function renderToDom(container, app, self) {
  return function () {
    var _render = renderService(self || window).render,
      mithrilRender = curry(_render)(container)
    map(mithrilRender, app)
  }
}

module.exports = {
  app,
  renderToDom
}
