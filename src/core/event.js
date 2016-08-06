const curry = require('../utils/curry')
const {extend} = require('../utils/common')
const {compose} = require('../control/combinator')
const handler = curry(function(key, action) {
  // need to wrap this, so we can detect this to set parentAction and input
  // when bootstrapping the app.
  var addKey = '__events__' + key
  return [addKey, function(parentAction, input) {
    return function (ev) {
      if ((key === 'onSubmit')
        || (key === 'onClick' && ev.currentTarget.nodeName.toLowerCase() === 'a')) {
          ev.preventDefault();
        }
      input(parentAction(action(ev)))
    }
  }]
})

const forwardTo = curry(function(parentAction, html) {
  var childAction = html.__action__, action = parentAction
  if (childAction) {
    action = compose(parentAction, childAction)
  }
  return extend(html, {__action__: action})
})

const onClick = handler('onclick')
const onDoubleClick = handler('ondbclick')
const onInput = handler('oninput')
const onChange = handler('onchange')

module.exports =
  { onClick
  , onDoubleClick
  , onInput
  , onChange
  , forwardTo }
