const Type = require('union-type')
const Counter = require('./counter')
const {map} = require('./control/pointfree')
const {div, button} = require('./core/h')
const {onClick} = require('./core/event')
const {constant} = require('./control/combinator')
const {extend} = require('./utils/common')

const Action = Type({
  Top: [Counter.Action]
  , Bottom: [Counter.Action]
  , Reset: []
})

const initialState = constant({
  top: Counter.initialState()
  , bottom: Counter.initialState()
})

const update = Action.caseOn({
  Top: (action, model) => extend(model, {top: Counter.update(action, model.top)})
  , Bottom: (action, model) => extend(model, {bottom: Counter.update(action, model.bottom)})
  , Reset: initialState
})

function view(model) {
  return div([],
    map(Action.Top, Counter.view(model.top))
    , map(Action.Bottom, Counter.view(model.bottom))
    , button([onClick(constant(Action.Reset()))], 'Reset')
  )
}

module.exports =
  { update: update
  , view
  , Action
  , initialState }
