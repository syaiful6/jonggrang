var element = require('jonggrang/src/html/element'),
  event = require('jonggrang/src/html/event'),
  always = require('ramda/src/always'),
  add = require('ramda/src/add'),
  Type = require('union-type')

var div = element.div,
  button = element.button,
  onClick = event.onClick

// our Action
var Action = Type({
  Increment: []
  , Decrement: []
})

// state
var initialState = always(0)

// update: action -> state -> state
var update = Action.caseOn(
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
