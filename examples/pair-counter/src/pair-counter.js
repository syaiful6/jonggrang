const Type = require('union-type')
const always = require('ramda/src/always')
const merge = require('ramda/src/merge')
const Counter = require('./counter')
const {div, button} = require('jonggrang/vdom/h')
const {onClick} = require('jonggrang/vdom/event')
const forwardTo = require('flyd/module/forwardto')

var Action = Type({
  Top: [Counter.Action]
  , Bottom: [Counter.Action]
  , Reset: []
})

var initialState =
  { top: Counter.initialState
  , bottom: Counter.initialState }

var update = Action.caseOn({
  Top: (action, model) => merge(model, {top: Counter.update(action, model.top)})
  , Bottom: (action, model) => merge(model, {bottom: Counter.update(action, model.bottom)})
  , Reset: always(initialState)
})

function view(domSignal, model) {
  return div([],
    Counter.view(forwardTo(domSignal, Action.Top), model.top)
    , Counter.view(forwardTo(domSignal, Action.Bottom), model.bottom)
    , div([], button([onClick(domSignal, always(Action.Reset()))], 'Reset'))
  )
}

module.exports =
  { update: update
  , view: view
  , Action: Action
  , initialState }
