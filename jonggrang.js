var curryN = require('ramda/src/curryN'),
  prop = require('ramda/src/prop'),
  identity = require('ramda/src/identity'),
  compose = require('ramda/src/compose'),
  map = require('./util/map'),
  isArray = require('./util/is-array'),
  renderService = require("./html/render"),
  flyd = require('flyd'),
  mergeAll = require('flyd/module/mergeall'),
  dropRepeats = require('flyd/module/droprepeats').dropRepeats

// this function return an object that has key html, state. html stream have value virtual dom,
// take a look on renderToDom on html.render file
// app -> {view: (domSignal, state -> vnodes), update: (action -> state), initialState: state, inputs: [stream(action)]} -> stream
function app(config) {
  var actionStream = flyd.stream(),
    input = map(transformToArray, mergeAll([actionStream].concat(config.inputs))),
    effModelSignal = flyd.scan(foldActions, noEffects(config.initialState), input),
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

  effModelSignal(noEffects(config.initialState))

  var htmlSignal = map(config.view, stateSignal)

  function renderer(self) {
    return renderService(self)(actionStream)
  }

  return {
    html: htmlSignal
    , state: stateSignal
    , renderer: renderer
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

function renderToDom(container, application, self) {
  return function () {
    var renderer = application.renderer(self)
    flyd.scan(renderer, container, application.html)
  }
}

module.exports =
  { app: app
  , noEffects: noEffects
  , fromSimple: curryN(3, fromSimple)
  , renderToDom: curryN(3, renderToDom) }
