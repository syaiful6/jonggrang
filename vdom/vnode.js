var isArray = require('../util/is-array')

function Vnode(tag, key, attrs, children, text, dom) {
  return {
    tag: tag
    , key: key
    , attrs: attrs
    , children: children
    , text: text
    , dom: dom
    , domSize: undefined
    , instance: undefined
    , events: undefined
    , tagger: undefined
    , map: map
  }
}

Vnode.normalize = function(node) {
  if (isArray(node)) return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
  else if (node != null && typeof node !== "object") return Vnode("#", undefined, undefined, node, undefined, undefined)
  return node
}

Vnode.normalizeChildren = function normalizeChildren(children) {
  for (var i = 0; i < children.length; i++) {
    children[i] = Vnode.normalize(children[i])
  }
  return children
}

Vnode.isThunk = function isThunk(vnode) {
  if (!vnode) return false
  var tag = vnode.tag
  return typeof tag === 'object' && typeof tag.func === 'function' && typeof tag.thunk === 'function'
}

function map(tagger) {
  if (!isArray(tagger)) tagger = [tagger]
  var vnode = Vnode('<$>', undefined, undefined, [this], undefined, undefined)
  vnode.tagger = tagger
  return vnode
}

module.exports = Vnode
