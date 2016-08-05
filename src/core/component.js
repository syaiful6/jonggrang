const curry = require('../utils/curry')
const {extend} = require('../utils/common')
const {flip, map} = require('../control/combinator')
const m = require('mithril')

function component(streamView) {
  var vnode = {}
  vnode.oninit = function(vnode) {
    vnode.state.onupdate = m.prop()
    vnode.state.view = streamView
  }
  vnode.view = function (vnode) {
    return vnode.state.view()
  }
  vnode.onupdate = function (vnode) {
    return vnode.state.onupdate(vnode)
  }
  vnode.onbeforeupdate = function (vnode, old) {
    return old.instance != vnode.state.view()
  }
  return vnode
}

function render(input, parentAction, html) {
  if (typeof html === 'string') {
    html = m('div', html)
  }
  function composeAction(parentAction, html) {
    var childAction = html.attrs && html.attrs.__action__, action = parentAction
    if (childAction) {
      action = function (a) {
        return parentAction(childAction(a))
      };
    }
    return action
  }
  function doRender(input, parentAction, html) {
    var props = html.attrs
    var newProps = {}

    for (var key in props) {
      if (key !== '__action__' && typeof props[key] === 'function') {
        newProps[key] = props[key](input, parentAction)
      } else {
        newProps[key] = props[key]
      }
    }
    var newChildren = (html.children && html.children.length > 0)
      ? html.children.map(function (child) {
          return typeof child === 'string' ? child : doRender(input, composeAction(parentAction, child), child)
        })
      : child
    return extend(html, {children: newChildren, attrs: attrs})
  }
  return doRender(input, composeAction(parentAction, html), html)
}
// reduce stream s
function reduce(f, acc, s) {
  var current = m.prop.combine(function (s) {
    acc = f(current() || acc, s())
    return acc
  }, [s])
  return current
}

function start(config) {
  var actions = m.prop(),
    inputs = m.prop.merge([actions].concat(config.inputs)),
    state = reduce(flip(config.update), config.initialState, inputs)
    html = render(inputs, )
}