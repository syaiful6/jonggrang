const curry = require('ramda/src/curry')
const {extend} = require('../utils/common')
const m = require('mithril/render/hyperscript')
const {compose} = require('../control/combinator')
const {map} = require('../control/pointfree')

// not really render anything to dom, this is just a wrapper around mithril rendering
// engine, right now we just need to finalize the event handler, and give it where the
// action should be routed.

function composeAction(parentAction, html) {
  let childAction = html.__action__, action = parentAction
  if (childAction) {
    action = compose(parentAction, childAction)
  }
  return action
}

// parameter 1, input is a stream
function doRender(input, parentAction, html) {
  let atrrs = html.attrs
  let newAttrs = {}
  let newChildren
  for (let key in atrrs) {
    if (typeof atrrs[key] === 'function') {
      newAttrs[key] = atrrs[key](parentAction, input)
    } else {
      newAttrs[key] = atrrs[key]
    }
  }
  if (Array.isArray(html.children)) {
    newChildren = map(function (child) {
      return typeof child === 'string' ? child : doRender(input, composeAction(parentAction, child), child)
    }, html.children || [])
  }
  return extend(html, {attrs: newAttrs, children: newChildren})
}

function _render(input, parentAction, html) {
  if (typeof html === 'string') {
    html = m('div', {}, html)
  }
  return doRender(input, composeAction(parentAction, html), html)
}

module.exports = curry(_render)