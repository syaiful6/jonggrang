const Type = require('union-type')
const always = require('ramda/src/always')
const merge = require('ramda/src/merge')
const Counter = require('./counter')
const map = require('jonggrang/util/map')
const {div, button} = require('jonggrang/html/element')
const {onClick} = require('jonggrang/html/event')

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
