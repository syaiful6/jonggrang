"use strict"

var Vnode = require('./vnode'),
  isArray = require('../util/is-array')

module.exports = function ($window) {
  var $doc = $window.document,
    $emptyFragment = $doc.createDocumentFragment()

  function createNodes(parent, vnodes, start, end, eventNode, nextSibling, ns) {
    var vnode, i
    for (i = start; i < end; i++) {
      vnode = vnodes[i]
      if (vnode != null) {
        insertNode(parent, createNode(vnode, eventNode, ns), nextSibling)
      }
    }
  }
  function createNode(vnode, eventNode, ns) {
    var tag = vnode.tag
    if (typeof tag === 'string') {
      switch (tag) {
        case '#': return createText(vnode)
        case '<': return createHTML(vnode)
        case '[': return createFragment(vnode, eventNode, ns)
        default: return createElement(vnode, eventNode, ns)
      }
    }
    if (Vnode.isTagger(vnode)) return createTagger(vnode, eventNode, ns)
    return createThunk(vnode, eventNode, ns)
  }
  function createText(vnode) {
    return vnode.dom = $doc.createTextNode(vnode.children)
  }
  function createHTML(vnode) {
    var match = vnode.children.match(/^\s*?<(\w+)/im) || []
    var parent = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"}[match[1]] || "div"
    var temp = $doc.createElement(parent)

    temp.innerHTML = vnode.children
    vnode.dom = temp.firstChild
    vnode.domSize = temp.childNodes.length
    var fragment = $doc.createDocumentFragment()
    var child
    while (child = temp.firstChild) {
      fragment.appendChild(child)
    }
    return fragment
  }
  function createFragment(vnode, eventNode, ns) {
    var fragment = $doc.createDocumentFragment()
    if (vnode.children != null) {
      var children = vnode.children
      createNodes(fragment, children, 0, children.length, eventNode, null, ns)
    }
    vnode.dom = fragment.firstChild
    vnode.domSize = fragment.childNodes.length
    return fragment
  }
  function createElement(vnode, eventNode, ns) {
    var tag = vnode.tag, attrs = vnode.attrs, is = attrs && attrs.is, element, children
    switch (tag) {
      case 'svg': ns = 'http://www.w3.org/2000/svg'; break
      case 'math': ns = 'http://www.w3.org/1998/Math/MathML'; break
    }
    element = ns ?
      is ? $doc.createElementNS(ns, tag, {is: is}) : $doc.createElementNS(ns, tag) :
      is ? $doc.createElement(tag, {is: is}) : $doc.createElement(tag)

    vnode.dom = element

    if (attrs != null) {
      setAttrs(vnode, eventNode, attrs, ns)
    }

    if (vnode.text != null) {
      if (vnode.text !== '') element.textContent = vnode.text
      else vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
    }

    if (vnode.children != null) {
      children = vnode.children
      createNodes(element, children, 0, children.length, eventNode, null, ns)
      setLateAttrs(vnode)
    }
    return element
  }
  function createTagger(vnode, eventNode, ns) {
    var tag = vnode.tag, subEventNode, subNode
    subEventNode =
      { tagger: tag.tagger
      , parent: eventNode }
    subNode = Vnode.normalize(tag.vnode)
    if (subNode != null) {
      var element = createNode(subNode, subEventNode, ns)
      vnode.dom = subNode.dom
      vnode.domSize = vnode.dom != null ? subNode.domSize : 0
      vnode.evroot = subEventNode
      return element
    } else {
      vnode.domSize = 0
      return $emptyFragment
    }
  }
  function createThunk(vnode, eventNode, ns) {
    vnode.instance = Vnode.normalize(vnode.tag.thunk())
    if (vnode.instance != null) {
      var element = createNode(vnode.instance, eventNode, ns)
      vnode.dom = vnode.instance.dom
      vnode.domSize = vnode.dom != null ? vnode.instance.domSize : 0
      return element
    } else {
      vnode.domSize = 0
      return $emptyFragment
    }
  }
  function updateNodes(parent, old, vnodes, eventNode, nextSibling, ns) {
    if (old === vnodes || old == null && vnodes == null) return
    else if (old == null) createNodes(parent, vnodes, 0, vnodes.length, eventNode, nextSibling, undefined)
    else if (vnodes == null) removeNodes(parent, old, 0, old.length, vnodes)
    else {
      var recycling = isRecyclable(old, vnodes)
      if (recycling) old = old.concat(old.pool)

      if (old.length === vnodes.length && vnodes[0] != null && vnodes[0].key == null) {
        for (var i = 0; i < old.length; i++) {
          if (old[i] === vnodes[i] || old[i] == null && vnodes[i] == null) continue
          else if (old[i] == null) insertNode(parent, createNode(vnodes[i], eventNode, ns), getNextSibling(old, i + 1, nextSibling))
          else if (vnodes[i] == null) removeNode(parent, old, i, i + 1, vnodes)
          else updateNode(parent, old[i], vnodes[i], eventNode, getNextSibling(old, i + 1, nextSibling), recycling, ns)
          if (recycling && old[i].tag === vnodes[i].tag) insertNode(parent, toFragment(old[i]), getNextSibling(old, i + 1, nextSibling))
        }
      } else {
        var oldStart = 0, start = 0, oldEnd = old.length - 1, end = vnodes.length - 1, map
        while (oldEnd >= oldStart && end >= start) {
          var o = old[oldStart], v = vnodes[start]
          if (o === v) oldStart++, start++
          else if (o != null && v != null && o.key === v.key) {
            oldStart++, start++
            updateNode(parent, o, v, eventNode, getNextSibling(old, oldStart, nextSibling), recycling, ns)
            if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
          }
          else {
            var o = old[oldEnd]
            if (o === v) oldEnd--, start++
            else if (o != null && v != null && o.key === v.key) {
              updateNode(parent, o, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
              if (start < end) insertNode(parent, toFragment(o), getNextSibling(old, oldStart, nextSibling))
              oldEnd--, start++
            }
            else break
          }
        }
        while (oldEnd >= oldStart && end >= start) {
          var o = old[oldEnd], v = vnodes[end]
          if (o === v) oldEnd--, end--
          else if (o != null && v != null && o.key === v.key) {
            updateNode(parent, o, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
            if (recycling && o.tag === v.tag) insertNode(parent, toFragment(o), nextSibling)
            if (o.dom != null) nextSibling = o.dom
            oldEnd--, end--
          }
          else {
            if (!map) map = getKeyMap(old, oldEnd)
            if (v != null) {
              var oldIndex = map[v.key]
              if (oldIndex != null) {
                var movable = old[oldIndex]
                updateNode(parent, movable, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), recycling, ns)
                insertNode(parent, toFragment(movable), nextSibling)
                old[oldIndex].skip = true
                if (movable.dom != null) nextSibling = movable.dom
              }
              else {
                var dom = createNode(v, eventNode, undefined)
                insertNode(parent, dom, nextSibling)
                nextSibling = dom
              }
            }
            end--
          }
          if (end < start) break
        }
        createNodes(parent, vnodes, start, end + 1, eventNode, nextSibling, ns)
        removeNodes(parent, old, oldStart, oldEnd + 1, vnodes)
      }
    }
  }
  function updateNode(parent, old, vnode, eventNode, nextSibling, recycling, ns) {
    var oldTag = old.tag, tag = vnode.tag
    if (oldTag === tag && typeof oldTag === 'string') {
      vnode.events = old.events
      switch (oldTag) {
        case '#': updateText(old, vnode); break
        case '<': updateHTML(parent, old, vnode, nextSibling); break
        case "[": updateFragment(parent, old, vnode, eventNode, nextSibling, ns); break
        default: updateElement(old, vnode, eventNode, ns)
      }
    }
    else if (Vnode.isTagger(old) && Vnode.isTagger(vnode)) updateTagger(parent, old, vnode, eventNode, nextSibling, recycling, ns)
    else if (Vnode.isThunk(old) && Vnode.isThunk(vnode)) updateThunk(parent, old, vnode, eventNode, nextSibling, recycling, ns)
    else {
      removeNode(parent, old, null, false)
      insertNode(parent, createNode(vnode, eventNode, undefined), nextSibling)
    }
  }
  function updateText(old, vnode) {
    if (old.children.toString() !== vnode.children.toString()) {
      old.dom.nodeValue = vnode.children
    }
    vnode.dom = old.dom
  }
  function updateHTML(parent, old, vnode, nextSibling) {
    if (old.children !== vnode.children) {
      toFragment(old)
      insertNode(parent, createHTML(vnode), nextSibling)
    }
    else vnode.dom = old.dom, vnode.domSize = old.domSize
  }
  function updateFragment(parent, old, vnode, eventNode, nextSibling, ns) {
    updateNodes(parent, old.children, vnode.children, eventNode, nextSibling, ns)
    var domSize = 0, children = vnode.children
    vnode.dom = null
    if (children != null) {
      for (var i = 0; i < children.length; i++) {
        var child = children[i]
        if (child != null && child.dom != null) {
          if (vnode.dom == null) vnode.dom = child.dom
          domSize += child.domSize || 1
        }
      }
      if (domSize !== 1) vnode.domSize = domSize
    }
  }
  function updateElement(old, vnode, eventNode, ns) {
    var element = vnode.dom = old.dom
    switch (vnode.tag) {
      case "svg": ns = "http://www.w3.org/2000/svg"; break
      case "math": ns = "http://www.w3.org/1998/Math/MathML"; break
    }
    if (vnode.tag === "textarea") {
      if (vnode.attrs == null) vnode.attrs = {}
      if (vnode.text != null) vnode.attrs.value = vnode.text //FIXME handle multiple children
    }
    updateAttrs(vnode, eventNode, old.attrs, vnode.attrs, ns)
    if (old.text != null && vnode.text != null && vnode.text !== "") {
      if (old.text.toString() !== vnode.text.toString()) old.dom.firstChild.nodeValue = vnode.text
    }
    else {
      if (old.text != null) old.children = [Vnode("#", undefined, undefined, old.text, undefined, old.dom.firstChild)]
      if (vnode.text != null) vnode.children = [Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
      updateNodes(element, old.children, vnode.children, eventNode, null, ns)
    }
  }
  function updateTagger(parent, old, vnode, eventNode, nextSibling, recycling, ns) {
    var oldTag = old.tag, tag = vnode.tag, nesting = false, subEventNode
    var subNode = tag.vnode, tagger = tag.tagger
    var oldSubNode = oldTag.vnode, oldTagger = old.tagger
    var nesting = tagger.length > 1 || oldTagger > 1
    if (nesting && oldTagger.length !== tagger.length) {
      removeNode(parent, old, null, false)
      insertNode(parent, createNode(vnode, eventNode, undefined), nextSibling)
      return
    }
    subEventNode = old.evroot
    if (nesting ? !pairwiseRefEqual(tagger, oldTagger) : tagger !== oldTagger) {
      subEventNode = {
        tagger: tagger,
        parent: subEventNode.parent
      }
    }
    if (subNode != null) {
      if (oldSubNode == null) insertNode(parent, createNode(subNode, subEventNode, ns), nextSibling)
      else updateNode(parent, oldSubNode, subNode, subEventNode, nextSibling, recycling, ns)
      vnode.dom = subNode.dom
      vnode.domSize = subNode.domSize
      vnode.evroot = subEventNode
    } else if (oldSubNode != null) {
      removeNode(parent, oldSubNode, null)
      vnode.dom = undefined
      vnode.domSize = 0
    } else {
      vnode.dom = old.dom
      vnode.domSize = old.domSize
    }
  }
  function updateThunk(parent, old, vnode, eventNode, nextSibling, recycling, ns) {
    var oldTag = old.tag, tag = vnode.tag, oldArgs = oldTag.args, args = tag.args
    var i = oldArgs.length, same = oldTag.func === tag.func && i === args.length
    while (same && --i) {
      same = oldArgs[i] === args[i]
    }
    if (same) {
      vnode.instance = old.instance
      return
    }
    vnode.instance = Vnode.normalize(tag.thunk())
    if (vnode.instance != null) {
      if (old.instance == null) insertNode(parent, createNode(vnode.instance, eventNode, ns), nextSibling)
      else updateNode(parent, old.instance, vnode.instance, eventNode, nextSibling, recycling, ns)
      vnode.dom = vnode.instance.dom
      vnode.domSize = vnode.instance.domSize
    } else if (old.instance != null) {
      removeNode(parent, old.instance, null, false)
      vnode.dom = undefined
      vnode.domSize = 0
    }
    else {
      vnode.dom = old.dom
      vnode.domSize = old.domSize
    }
  }
  function isRecyclable(old, vnodes) {
    if (old.pool != null && Math.abs(old.pool.length - vnodes.length) <= Math.abs(old.length - vnodes.length)) {
      var oldChildrenLength = old[0] && old[0].children && old[0].children.length || 0
      var poolChildrenLength = old.pool[0] && old.pool[0].children && old.pool[0].children.length || 0
      var vnodesChildrenLength = vnodes[0] && vnodes[0].children && vnodes[0].children.length || 0
      if (Math.abs(poolChildrenLength - vnodesChildrenLength) <= Math.abs(oldChildrenLength - vnodesChildrenLength)) {
        return true
      }
    }
    return false
  }
  function getKeyMap(vnodes, end) {
    var map = {}, i = 0
    for (var i = 0; i < end; i++) {
      var vnode = vnodes[i]
      if (vnode != null) {
        var key = vnode.key
        if (key != null) map[key] = i
      }
    }
    return map
  }
  function toFragment(vnode) {
    var count = vnode.domSize
    if (count != null || vnode.dom == null) {
      var fragment = $doc.createDocumentFragment()
      if (count > 0) {
        var dom = vnode.dom
        while (--count) fragment.appendChild(dom.nextSibling)
        fragment.insertBefore(dom, fragment.firstChild)
      }
      return fragment
    }
    else return vnode.dom
  }
  function getNextSibling(vnodes, i, nextSibling) {
    for (; i < vnodes.length; i++) {
      if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom
    }
    return nextSibling
  }
  function insertNode(parent, dom, nextSibling) {
    if (nextSibling && nextSibling.parentNode) parent.insertBefore(dom, nextSibling)
    else parent.appendChild(dom)
  }
  function removeNodes(parent, vnodes, start, end, context) {
    var i, vnode
    for (i = start; i < end; i++) {
      vnode = vnodes[i]
      if (vnode != null) {
        if (vnode.skip) vnode.skip = undefined
        removeNode(parent, vnode, context)
      }
    }
  }
  function removeNode(parent, vnode, context) {
    var count, dom = vnode.dom
    if (dom) {
      count = vnode.domSize || 1
      if (count > 1) {
        while (--count) {
          parent.removeChild(dom.nextSibling)
        }
      }
      if (dom.parentNode != null) parent.removeChild(dom)
      if (context != null && vnode.domSize == null && typeof vnode.tag === 'string') {
        if (!context.pool) context.pool = [vnode]
        else context.pool.push(vnode)
      }
    }
  }
  function setAttrs(vnode, eventNode, attrs, ns) {
    for (var key in attrs) {
      setAttr(vnode, eventNode, key, null, attrs[key], ns)
    }
  }
  function setAttr(vnode, eventNode, key, old, value, ns) {
    var element = vnode.dom
    if (key === "key" || (old === value && !isFormAttribute(vnode, key))
      && typeof value !== "object" || typeof value === "undefined") {
        return
      }
    var nsLastIndex = key.indexOf(":")
    if (nsLastIndex > -1 && key.substr(0, nsLastIndex) === "xlink") {
      element.setAttributeNS("http://www.w3.org/1999/xlink", key.slice(nsLastIndex + 1), value)
    }
    else if (key[0] === "o" && key[1] === "n" && typeof value === "function" || isArray(value)) updateEvent(vnode, eventNode, key, value)
    else if (key === "style") updateStyle(element, old, value)
    else if (key in element && !isAttribute(key) && ns === undefined) {
      //setting input[value] to same value by typing on focused element moves cursor to end in Chrome
      if (vnode.tag === "input" && key === "value" && vnode.dom.value === value && vnode.dom === $doc.activeElement) return
      element[key] = value
    }
    else {
      if (typeof value === "boolean") {
        if (value) element.setAttribute(key, "")
        else element.removeAttribute(key)
      }
      else element.setAttribute(key === "className" ? "class" : key, value)
    }
  }
  function setLateAttrs(vnode) {
    var attrs = vnode.attrs
    if (vnode.tag === "select" && attrs != null) {
      if ("value" in attrs) setAttr(vnode, null, "value", null, attrs.value, undefined)
      if ("selectedIndex" in attrs) setAttr(vnode, null, "selectedIndex", null, attrs.selectedIndex, undefined)
    }
  }
  function updateAttrs(vnode, eventNode, old, attrs, ns) {
    if (attrs != null) {
      for (var key in attrs) {
        setAttr(vnode, eventNode, key, old && old[key], attrs[key], ns)
      }
    }
    if (old != null) {
      for (var key in old) {
        if (attrs == null || !(key in attrs)) {
          if (key[0] === "o" && key[1] === "n") updateEvent(vnode, key, undefined)
          else if (key !== "key") vnode.dom.removeAttribute(key)
        }
      }
    }
  }
  function isFormAttribute(vnode, attr) {
    return attr === "value" || attr === "checked" || attr === "selectedIndex" || attr === "selected" && vnode.dom === $doc.activeElement
  }
  function isAttribute(attr) {
    return attr === "href" || attr === "list" || attr === "form"// || attr === "type" || attr === "width" || attr === "height"
  }

  //style
  function updateStyle(element, old, style) {
    if (old === style) element.style.cssText = "", old = null
    if (style == null) element.style.cssText = ""
    else if (typeof style === "string") element.style.cssText = style
    else {
      if (typeof old === "string") element.style.cssText = ""
      for (var key in style) {
        element.style[key] = style[key]
      }
      if (old != null && typeof old !== "string") {
        for (var key in old) {
          if (!(key in style)) element.style[key] = ""
        }
      }
    }
  }

  //event
  function updateEvent(vnode, eventNode, key, value) {
    var element = vnode.dom
    function eventHandler(e) {
      var msg, currentEventNode, tagger
      if (typeof value === 'function') {
        msg = value.call(element, e)
      } else {
        msg = value.length === 2
          ? value[0].call(element, value[1], e)
          : value[0].apply(element, value.slice(1).concat([e]))
      }
      currentEventNode = eventNode
      while (currentEventNode) {
        tagger = currentEventNode.tagger
        if (typeof tagger === 'function') {
          msg = tagger(msg)
        } else {
          for (var i = tagger.length; i--;) {
            msg = tagger[i](msg)
          }
        }
        currentEventNode = currentEventNode.parent
      }
    }
    if (key in element) element[key] = eventHandler
    else {
      var eventName = key.slice(2)
      if (vnode.events === undefined) vnode.events = {}
      if (vnode.events[key] != null) element.removeEventListener(eventName, vnode.events[key], false)
      if (typeof value === "function" || (isArray(value) && value.length > 0)) {
        vnode.events[key] = eventHandler
        element.addEventListener(eventName, vnode.events[key], false)
      }
    }
  }
  function pairwiseRefEqual(as, bs) {
     for (var i = 0; i < as.length; i++) {
       if (as[i] !== bs[i]) return false
     }
     return true
  }
  function init(tagger) {
    return function renderer(dom, vnodes) {
      var active = $doc.activeElement,
        eventNode =
          { tagger: tagger
          , parent: undefined }
      // First time rendering into a node clears it out
      if (dom.vnodes == null) dom.textContent = ""
      if (!isArray(vnodes)) vnodes = [vnodes]
      updateNodes(dom, dom.vnodes, Vnode.normalizeChildren(vnodes), eventNode, null, undefined)
      dom.vnodes = vnodes
      if ($doc.activeElement !== active) active.focus()
      return dom
    }
  }
  return init
}
