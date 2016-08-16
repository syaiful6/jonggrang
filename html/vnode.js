function Vnode(tag, key, attrs, children, text, dom) {
  return {
    tag: tag
    , key: key
    , attrs: attrs
    , children: children
    , text: text
    , dom: dom
    , domSize: undefined
    , events: undefined
    , instance: undefined
    , evroot: undefined
    , map: map
  }
}

Vnode.normalize = function(node) {
  if (node instanceof Array) return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
  else if (node != null && typeof node !== "object") return Vnode("#", undefined, undefined, node, undefined, undefined)
  return node
}

Vnode.normalizeChildren = function normalizeChildren(children) {
  for (var i = 0; i < children.length; i++) {
    children[i] = Vnode.normalize(children[i])
  }
  return children
}

Vnode.isTagger = function isTagger(vnode) {
  if (!vnode) return false
  var tag = vnode.tag
  return typeof tag === 'object' && tag.tagger != null && tag.vnode != null
}

Vnode.isThunk = function isThunk(vnode) {
  if (!vnode) return false
  var tag = vnode.tag
  return typeof tag === 'object' && typeof tag.func === 'function' && typeof tag.thunk === 'function'
}

function map(tagger) {
  var subnode = this, subnodeTag
  if (!(tagger instanceof Array)) tagger = [tagger]
  while (Vnode.isTagger(subnode)) {
    subnodeTag = subnodeTag
    tagger = subnodeTag.tagger.concat(tagger)
    subnode = subnodeTag.vnode
  }
  var tag =
    { tagger: tagger
    , vnode: subnode }
  return Vnode(tag, undefined, undefined, undefined, undefined, undefined)
}

module.exports = Vnode
