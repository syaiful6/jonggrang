const curry = require('ramda/src/curry')
const {extend} = require('../utils/common')
const m = require('mithril/render/hyperscript')
const {compose} = require('../control/combinator')
const {map} = require('../control/pointfree')
const renderService = require("mithril/render/render")
const Vnode = require("mithril/render/vnode")

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

function component(htmlSignal) {
  return {
    view: function () {
      return htmlSignal()
    }
    , onbeforeupdate: function (vnode, old) {
      return old.instance != htmlSignal()
    }
  }
}

function renderToDom(container, htmlSignal, self) {
  return function () {
    var dummy = {view: function() {}}
    var mithrilRender = renderService(self).render,
      mithrilComponent = component(htmlSignal)
    function run() {
      mithrilRender(
        container,
        Vnode(mithrilComponent === null ? dummy : mithrilComponent, undefined, undefined, undefined, undefined, undefined)
      )
    }
    htmlSignal.map(run)
  }
}

module.exports = {
  renderToDom: renderToDom,
  render: curry(_render)
}
