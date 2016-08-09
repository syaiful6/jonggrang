const curry = require('ramda/src/curry')
const {merge, reduce} = require('../utils/stream-operator')
const {identity, compose, flip} = require('../control/combinator')
const {map} = require('../control/pointfree')
const {stream} = require('mithril/util/stream')
const render = require('./render')
const renderService = require("mithril/render/render")

// this function return a stream with value virtual dom, take a look on renderToDom
// below how to use the stream returned by this function.
// app -> {view: (state -> vnodes), update: (action -> state), initialState: () -> state, inputs: [stream(action)]} -> stream
function app(config) {
  var html = stream(),
    inputs = merge.apply(null, [html].concat(config.inputs)),
    state = reduce(update, config.initialState(), inputs)

  function update(state, action) {
    // config.update return array, first element is new state, the second is an array effects
    // the results of each effect will fetch back to config.update function
    const [newState, effects] = config.update(action, state)
    handleMessage(effects)
    return newState
  }

  function handleMessage(effects) {
    var i, len, task
    for (i = 0, len = effects.length; i < len; i++) {
      task =
        { task: effects[i]
        , input: inputs }
      enqueue(task)
    }
  }

  state(config.initialState())

  return map(compose(render(html, identity), config.view), state)
}

// noEffect :: state -> [state, []]
function noEffect(state) {
  return [state, []]
}

// fromSimple :: (action -> state -> newState) -> action -> state -> [newState, []]
function fromSimple(update, action, state) {
  return noEffect(update(action, state))
}

// mount our app to the provided container, optionally give him a window object--it
// there just for testing purpose
function renderToDom(container, app, self) {
  return function () {
    var _render = renderService(self || window).render,
      mithrilRender = curry(_render)(container)
    map(mithrilRender, app)
  }
}

var working = false, workQueue = []
const MAX_STEPS = 10000

function enqueue(task) {
  workQueue.push(task)
  if (!working) {
    setTimeout(work, 0)
    working = true
  }
}

function work() {
  var step = 0, task = null
  while (step < MAX_STEPS && (task = workQueue.shift())) {
    task.task.fork(task.input, task.input)
    step++
  }
  if (!task) {
    working = false
    return
  }
  setTimeout(work, 0)
}

module.exports = {
  app,
  renderToDom,
  noEffect,
  fromSimple: curry(fromSimple)
}
