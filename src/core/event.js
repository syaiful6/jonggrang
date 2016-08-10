const curry = require('ramda/src/curry')
const {extend} = require('../utils/common')
const {compose} = require('../control/combinator')

const handler = curry(function(key, action) {
  // the parent action and input will set when we render the virtual dom, for detail
  // look at render.js file and app.js
  return [key, function(parentAction, input) {
    return function (ev) {
      if ((key === 'onsubmit')
        || (key === 'onclick' && ev.currentTarget.nodeName.toLowerCase() === 'a')) {
          ev.preventDefault();
        }
      input(parentAction(action(ev)))
    }
  }]
})

const lifecylce = curry(function (key, action) {
  return [key, function (parentAction, input) {
    return function (...args) {
      if (key === 'onbeforeupdate') {
        return action(...args) // onbeforeupdate
      } else {
        input(parentAction(action(...args)))
      }
    }
  }]
})

const onClick = handler('onclick')
const onDoubleClick = handler('ondbclick')
const onInput = handler('oninput')
const onChange = handler('onchange')

// lifecycle method
const onInit = lifecylce('oninit')
const onCreate = lifecylce('oncreate')
const onBeforeUpdate = lifecylce('onbeforeupdate')
const onUpdate = lifecylce('onupdate')
const onBeforeRemove = lifecylce('onbeforeremove')
const onRemove = lifecylce('onremove')

module.exports =
  { onClick
  , onDoubleClick
  , onInput
  , onChange
  , onInit
  , onCreate
  , onBeforeUpdate
  , onUpdate
  , onBeforeRemove
  , onRemove }
