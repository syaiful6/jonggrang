var Type = require('union-type'),
  Counter = require('./counter'),
  map = require('jonggrang/src/util/map'),
  element = require('jonggrang/src/html/element'),
  event = require('jonggrang/src/html/event'),
  always = require('ramda/src/always'),
  merge = require('ramda/src/merge')

var div = element.div,
  button = element.button,
  onClick = event.onClick

var Action = Type({
  Top: [Counter.Action]
  , Bottom: [Counter.Action]
  , Reset: []
})

var initialState = always({
  top: Counter.initialState()
  , bottom: Counter.initialState()
})

var update = Action.caseOn({
  Top: (action, model) => merge(model, {top: Counter.update(action, model.top)})
  , Bottom: (action, model) => merge(model, {bottom: Counter.update(action, model.bottom)})
  , Reset: initialState
})

function view(model) {
  return div([],
    map(Action.Top, Counter.view(model.top))
    , map(Action.Bottom, Counter.view(model.bottom))
    , div([], button([onClick(always(Action.Reset()))], 'Reset'))
  )
}

module.exports =
  { update: update
  , view: view
  , Action: Action
  , initialState }
