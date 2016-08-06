const Type = require('./data/type')
const Counter = require('./counter')
const m = require('mithril/render/hyperscript')
const {div, button} = require('./core/hyperscript')(m)
const {forwardTo, onClick} = require('./core/event')
const {flip, constant} = require('./control/combinator')

const Model = Type({
  Counter: {
    top: Counter.Model
    , bottom: Counter.Model
  }
})

const Action = Type({
  Top: [constant(true)]
  , Bottom: [constant(true)]
  , Reset: []
})

function update(model, action) {
  console.log(action);
  return model;
}

const __update = Action.caseOn({
  Top: model => Model.CounterOf({top: Counter.update(model.top), bottom: model.bottom})
  , Bottom: model => Model.CounterOf({top: model.top, bottom: Counter.update(model.bottom)})
  , Reset: () => Model.CounterOf({top: Counter.initialState(), bottom: Counter.initialState()})
})

function view(model) {
  return div([],
    [ forwardTo(Action.Top, Counter.view(model.top))
    , forwardTo(Action.Bottom, Counter.view(model.bottom))
    , button([onClick(constant(Action.Reset()))], ['Reset'])
    ]
  )
}

const initialState = constant(
  Model.CounterOf({top: Counter.initialState(), bottom: Counter.initialState()})
)

module.exports =
  { update: update
  , Model: Model
  , view
  , Action
  , initialState }
