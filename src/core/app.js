const curry = require('ramda/src/curry')
const {prop} = require('../utils/common')
const {merge, reduce, dropRepeats} = require('../utils/stream-operator')
const {identity, compose, flip} = require('../control/combinator')
const {map} = require('../control/pointfree')
const {stream} = require('mithril/util/stream')
const {render} = require('./render')

// this function return a stream with value virtual dom, take a look on renderToDom
// below how to use the stream returned by this function.
// app -> {view: (state -> vnodes), update: (action -> state), initialState: () -> state, inputs: [stream(action)]} -> stream
function app(config) {
  var actionStream = stream(),
    input = merge.apply(null, map(s => map(i => [i], s), [actionStream].concat(config.inputs))),
    effModelSignal = reduce(foldActions, noEffects(config.initialState()), input),
    effectsSignal = map(compose(map(mapAffect), prop('effects')), effModelSignal),
    stateSignal = dropRepeats(map(prop('state'), effModelSignal))

  function foldActions(effModel, actions) {
    return actions.reduce((eff, action) => config.update(action, eff.state), noEffects(effModel.state))
  }

  function mapAffect(affect) {
    affect.fork(actionStream, actionStream)
    return affect
  }

  effModelSignal(noEffects(config.initialState()))

  var htmlSignal = map(compose(render(actionStream, identity), config.view), stateSignal)
  return {
    html: htmlSignal
    , state: stateSignal
  }
}

// noEffects :: state -> {state: state, effects: []}
function noEffects(state) {
  return {
    state,
    effects: []
  }
}

// fromSimple :: (action -> state -> newState) -> action -> state -> {state: state, effects: []}
function fromSimple(update, action, state) {
  return noEffects(update(action, state))
}

module.exports = {
  app,
  noEffects,
  fromSimple: curry(fromSimple)
}
