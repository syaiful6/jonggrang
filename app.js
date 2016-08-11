var curryN = require('ramda/src/curryN'),
  prop = require('ramda/src/prop'),
  identity = require('ramda/src/identity'),
  compose = require('ramda/src/compose'),
  map = require('./util/map'),
  streamOperator = require('./util/stream-operator'),
  Stream = require('mithril/util/stream'),
  composeVnode = require('./html/render').composeVnode

// for easiest access
var merge = streamOperator.merge,
  reduce = streamOperator.reduce,
  dropRepeats = streamOperator.dropRepeats

var isArray = Array.isArray || function(a) {
  return 'length' in a
}

// this function return a object that has key html, state. html stream have value virtual dom,
// take a look on renderToDom on html.render file
// app -> {view: (state -> vnodes), update: (action -> state), initialState: () -> state, inputs: [stream(action)]} -> stream
function app(config) {
  var actionStream = Stream.stream(),
    input = map(transformToArray, merge.apply(null, [actionStream].concat(config.inputs))),
    effModelSignal = reduce(foldActions, noEffects(config.initialState()), input),
    effectsSignal = map(compose(map(mapAffect), prop('effects')), effModelSignal),
    stateSignal = dropRepeats(map(prop('state'), effModelSignal))

  function foldActions(effModel, actions) {
    return actions.reduce(function (eff, action) {
      return config.update(action, eff.state)
    }, noEffects(effModel.state))
  }

  function transformToArray(s) {
    return isArray(s) ? s : [s]
  }

  function mapAffect(affect) {
    affect.fork(actionStream, actionStream)
    return affect
  }

  effModelSignal(noEffects(config.initialState()))

  var htmlSignal = map(compose(composeVnode(actionStream, identity), config.view), stateSignal)

  return {
    html: htmlSignal
    , state: stateSignal
  }
}

// noEffects :: state -> {state: state, effects: []}
function noEffects(state) {
  return {
    state: state,
    effects: []
  }
}

// fromSimple :: (action -> state -> newState) -> action -> state -> {state: state, effects: []}
function fromSimple(update, action, state) {
  return noEffects(update(action, state))
}

module.exports = {
  app: app,
  noEffects: noEffects,
  fromSimple: curryN(3, fromSimple)
}
