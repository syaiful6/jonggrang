const m = require('mithril/render/hyperscript')
const {div, button} = require('./core/hyperscript')(m)
const {onClick} = require('./core/event')
const {flip, constant} = require('./control/combinator')
const Type = require('./data/type')

const Action = Type({
  Increment: []
  , Decrement: []
})

const Model = Type({
  Counter: [Number]
})

const update = Action.caseOn(
  { Increment: model => model[0] + 1
  , Decrement: model => model[0] - 1 }
)

function view(model) {
  var [count] = model
  return div([],
    [ button([onClick(constant(Action.Increment()))], ['+'])
    , div([], [count.toString()])
    , button([onClick(constant(Action.Decrement()))], ['-'])
    ]
  )
}

const initialState = constant(Model.Counter(0))

module.exports =
  { update: flip(update)
  , Model: Model
  , view
  , Action
  , initialState }
