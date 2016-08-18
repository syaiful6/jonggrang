var curryN = require('ramda/src/curryN'),
  prop = require('ramda/src/prop'),
  identity = require('ramda/src/identity'),
  compose = require('ramda/src/compose'),
  map = require('./util/map'),
  isArray = require('./util/is-array'),
  renderService = require("./vdom/render"),
  requestAnimationFrame = require('./vdom/dom').requestAnimationFrame,
  flyd = require('flyd'),
  mergeAll = require('flyd/module/mergeall'),
  dropRepeats = require('flyd/module/droprepeats').dropRepeats

// this function return an object that has key html, state. html stream have value virtual dom,
// take a look on renderToDom on html.render file
// app -> {view: (domSignal, state -> vnodes), update: (action -> state), initialState: state, inputs: [stream(action)]} -> stream
function app(config) {
  var actionStream = flyd.stream(),
    input = flyd.map(transformToArray, mergeAll([actionStream].concat(config.inputs))),
    effModelSignal = flyd.scan(foldActions, noEffects(config.initialState), input),
    effectsSignal = flyd.map(compose(map(mapAffect), prop('effects')), effModelSignal),
    stateSignal = dropRepeats(map(prop('state'), effModelSignal)),
    htmlSignal = flyd.map(config.view, stateSignal)

  function foldActions(effModel, actions) {
    return actions.reduce(invokeAppUpdate, noEffects(effModel.state))
  }

  function invokeAppUpdate(eff, action) {
    var result = config.update(action, eff.state)
    return result instanceof EffModel ? result : new EffModel(result.state, result.effects)
  }

  function transformToArray(s) {
    return isArray(s) ? s : [s]
  }

  function mapAffect(affect) {
    affect.fork(actionStream, actionStream)
  }

  effModelSignal(noEffects(config.initialState))

  return {
    html: htmlSignal
    , state: stateSignal
    , renderer: renderService(actionStream)
  }
}

function EffModel(state, effects) {
  this.state = state
  this.effects = effects || []
}

//
function mapState(fun, effModel) {
  return new EffModel(fun(effModel.state), effModel.effects)
}

//
function mapEffects(action, effModel) {
  return new EffModel(effModel.state, map(map(action), effModel.effects))
}

// noEffects :: state -> {state: state, effects: []}
function noEffects(state) {
  return new EffModel(state)
}

// fromSimple :: (action -> state -> newState) -> action -> state -> {state: state, effects: []}
function fromSimple(update, action, state) {
  return noEffects(update(action, state))
}

function renderToDom(container, application) {
  var state = 0, nextVnode
  function redraw(vnode) {
    if (state === 0) {
      requestAnimationFrame(runRenderer)
    }
    state = 1
    nextVnode = vnode
  }
  function runRenderer() {
    switch (state) {
      case 0: // no request, this state is invalid here
        throw new Error('invalid state')
      case 1: // pending request, this state indicate new vnode
        requestAnimationFrame(runRenderer)
        state = 2
        application.renderer(container, nextVnode)
        nextVnode = null
        return
      case 2: // extra request
        state = 0
        return
    }
  }
  // listen to virtual node stream
  flyd.map(redraw, application.html)
}

module.exports =
  { app: app
  , noEffects: noEffects
  , fromSimple: curryN(3, fromSimple)
  , renderToDom: curryN(2, renderToDom) }
