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

  return state.map(compose(render(inputs, identity), config.view))
}

function renderToDom(container, app, self) {
  return function () {
    var _render = renderService(self || window).render,
      mithrilRender = curry(_render)(container)
    app.map(mithrilRender)
  }
}

module.exports = {
  app,
  renderToDom
}
