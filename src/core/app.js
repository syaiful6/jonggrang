const curry = require('../utils/curry')
const {extend} = require('../utils/common')
const m = require('mithril/render/hyperscript')
const component = require('./component')
const {merge, reduce} = require('../utils/stream-operator')
const {map, identity, constant, compose} = require('../control/combinator')
const {stream} = require('mithril/util/stream')

function composeAction(parentAction, html) {
  let childAction = html.__action__, action = parentAction
  if (childAction) {
    action = compose(parentAction, childAction)
  }
  return action
}

function doRender(input, parentAction, html) {
  let atrrs = html.attrs
  let newAttrs = {}
  let newChildren
  for (let key in atrrs) {
    if (isEventAction(key)) {
      console.log(parentAction('hii'))
      newAttrs[takeEventKey(key)] = atrrs[key](input, parentAction)
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

function isEventAction(v) {
  return v.substr(0, 10) === '__events__'
}

function takeEventKey(v) {
  return v.slice(10, v.length)
}

function _render(input, parentAction, html) {
  if (typeof html === 'string') {
    html = m('div', {}, html)
  }
  return doRender(input, composeAction(parentAction, html), html)
}

const render = curry(_render)

function app(config) {
  var inputs = stream(),
    state = reduce(config.update, config.initialState(), inputs),
    renderer = render(inputs, identity),
    streamView = map(compose(renderer, config.view), state)
  state(config.initialState())
  //streamView.map(console.log.bind(console))
  return component(streamView)
}

module.exports = app
