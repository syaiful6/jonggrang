const {div, button} = require('jonggrang/html/hyperscript')
const {onClick} = require('jonggrang/html/event')
const always = require('ramda/src/always')
const add = require('ramda/src/add')
const Type = require('union-type')

// our Action
const Action = Type({
  Increment: []
  , Decrement: []
})

// state
const initialState = 0

// update: action -> state -> state
const update = Action.caseOn(
  { Increment: add(1)
  , Decrement: add(-1) }
)

// counter view
function view(domSignal, state) {
  return div([],
    button([onClick(domSignal, always(Action.Increment()))], '+')
    , div([], state)
    , button([onClick(domSignal, always(Action.Decrement()))], '-')
  )
}

module.exports =
  { update: update
  , view: view
  , Action: Action
  , initialState }
