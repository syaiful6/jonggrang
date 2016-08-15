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

function map(tagger) {
  var tag =
    { tagger: tagger
    , vnode: this }
  return Vnode(tag, undefined, undefined, undefined, undefined, undefined)
}

module.exports = Vnode
