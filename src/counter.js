const {div, button} = require('./core/h')
const {onClick, onBeforeUpdate} = require('./core/event')
const {constant} = require('./control/combinator')
const Type = require('union-type')

const Action = Type({
  Increment: []
  , Decrement: []
})

const initialState = constant(0)

const update = Action.caseOn(
  { Increment: model => model + 1
  , Decrement: model => model - 1 }
)

function view(model) {
  return div([],
    button([onClick(constant(Action.Increment()))], '+')
    , div([], model.toString())
    , button([onClick(constant(Action.Decrement()))], '-')
  )
}

module.exports =
  { update: update
  , view
  , Action
  , initialState }
