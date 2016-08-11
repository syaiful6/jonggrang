var curryN = require('ramda/src/curryN'),
  merge = merge = require('ramda/src/merge'),
  m = require('mithril/render/hyperscript'),
  compose = require('ramda/src/compose'),
  map = require('../util/map'),
  renderService = require("mithril/render/render"),
  Vnode = require("mithril/render/vnode")

// not really render anything to dom, this is just a wrapper around mithril rendering
// engine, right now we just need to finalize the event handler, and give it where the
// action should be routed.

var isArray = Array.isArray || function(a) {
  return 'length' in a
}

function composeAction(parentAction, html) {
  var childAction = html.__action__, action = parentAction
  if (childAction) {
    action = compose(parentAction, childAction)
  }
  return action
}

// parameter 1, input is a stream
function composeVnodeEvent(input, parentAction, html) {
  var attrs = html.attrs, newAttrs = {}, newChildren = html.children
  if (!attrs) {
    newAttrs = attrs
  } else {
    var keys = Object.keys(attrs)
    keys.forEach(function (key) {
      newAttrs[key] = typeof attrs[key] === 'function' ? attrs[key](input, parentAction) : attrs[key]
    })
  }
  if (isArray(html.children)) {
    newChildren = map(function (child) {
      return typeof child === 'string' ? child : composeVnodeEvent(input, composeAction(parentAction, child), child)
    }, html.children)
  }
  return merge(html, {attrs: newAttrs, children: newChildren})
}

function composeVnode(input, parentAction, html) {
  if (typeof html === 'string') {
    html = m('div', {}, html)
  }
  return composeVnodeEvent(input, composeAction(parentAction, html), html)
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
    var mithrilRender = renderService(self).render, mithrilComponent = component(htmlSignal)
    function run() {
      mithrilRender(
        container,
        Vnode(mithrilComponent, undefined, undefined, undefined, undefined, undefined)
      )
    }
    map(run, htmlSignal)
  }
}

module.exports = {
  renderToDom: renderToDom,
  composeVnode: curryN(3, composeVnode)
}
