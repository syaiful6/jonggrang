const curry = require('ramda/src/curry')
const {extend} = require('../utils/common')
const {compose} = require('../control/combinator')

const handler = curry(function(key, action) {
  // the parent action and input will set when we render the virtual dom, for detail
  // look at render.js file and app.js
  return [key, function(parentAction, input) {
    return function (ev) {
      if ((key === 'onSubmit')
        || (key === 'onClick' && ev.currentTarget.nodeName.toLowerCase() === 'a')) {
          ev.preventDefault();
        }
      input(parentAction(action(ev)))
    }
  }]
})

const onClick = handler('onclick')
const onDoubleClick = handler('ondbclick')
const onInput = handler('oninput')
const onChange = handler('onchange')

module.exports =
  { onClick
  , onDoubleClick
  , onInput
  , onChange }
