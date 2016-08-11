const {div, button} = require('jonggrang/html/element')
const {onClick} = require('jonggrang/html/event')
const  always = require('ramda/src/always')
const  add = require('ramda/src/add')
const  Type = require('union-type')

// our Action
const Action = Type({
  Increment: []
  , Decrement: []
})

// state
const initialState = always(0)

// update: action -> state -> state
const update = Action.caseOn(
  { Increment: add(1)
  , Decrement: add(-1) }
)

// counter view
function view(state) {
  return div([],
    button([onClick(always(Action.Increment()))], '+')
    , div([], state)
    , button([onClick(always(Action.Decrement()))], '-')
  )
}

module.exports =
  { update: update
  , view: view
  , Action: Action
  , initialState }
