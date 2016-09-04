import { Vnode, VnodeData, Thunk } from './vnode'
import * as DOM from './dom'

export type EventNode = {
  tagger: Function | Function[]
  parent: EventNode | null
}

type NS = 'http://www.w3.org/1998/Math/MathML' | 'http://www.w3.org/2000/svg'

function createNodes(parent: Element | DocumentFragment, vnodes: Array<Vnode | null>, start: number, end: number,
                     eventNode: EventNode, nextSibling: Node | null, ns: NS | undefined) {
  let vnode: Vnode | null
  for (let i = start; i < end; i++) {
    vnode = vnodes[i]
    if (vnode != null) {
      insertNode(parent, createNode(vnode, eventNode, ns), nextSibling)
    }
  }
}

function createNode(vnode: Vnode, eventNode: EventNode, ns: NS | undefined): Element | Text | DocumentFragment {
  let tag = vnode.tag
  if (typeof tag === 'string') {
    switch (tag) {
      case '#': return createText(vnode)
      case '<': return createHTML(vnode)
      case '[': return createFragment(vnode, eventNode, ns)
      default:
        return createElement(vnode, eventNode, ns)
    }
  }
  if (vnode.data != null && typeof vnode.data.fn === 'function') {
    return createThunk(vnode as Thunk, eventNode, ns)
  }
  if (typeof vnode.tagger === 'function') {
    return createTagger(vnode, eventNode, ns)
  }
  throw new Error('invalid virtual node received')
}

function createText(vnode: Vnode): Text {
  if (typeof vnode.children === 'string') {
    return vnode.dom = DOM.createTextNode(vnode.children)
  }
  throw new Error('trying to create vnode text with invalid vnode type')
}

function createHTML(vnode: Vnode): DocumentFragment {
  if (typeof vnode.children === 'string') {
    let match: string[] = vnode.children.match(/^\s*?<(\w+)/im) || []
    let table: any = {
      caption: 'table',
      thead: 'table',
      tbody: 'table',
      tfoot: 'table',
      tr: 'tbody',
      th: 'tr',
      td: 'tr',
      colgroup: 'table',
      col: 'colgroup'
    }
    let parent: any = table[match[1]] || 'div'
    let temp = DOM.createElement(String(parent))

    temp.innerHTML = vnode.children
    vnode.dom = temp.firstChild as Element
    vnode.domSize = temp.childNodes.length
    let fragment = DOM.createDocumentFragment()
    let child: Node
    while (child = temp.firstChild) {
      fragment.appendChild(child)
    }
    return fragment
  }
  throw new Error('trying to create vnode HTML with invalid vnode type')
}

function createFragment(vnode: Vnode, eventNode: EventNode, ns: NS | undefined): DocumentFragment {
  let fragment = DOM.createDocumentFragment()
  if (vnode.children != null && Array.isArray(vnode.children)) {
    let children = vnode.children
    createNodes(fragment, children as Vnode[], 0, children.length, eventNode, null, ns)
  }
  vnode.dom = fragment.firstChild as Element
  vnode.domSize = fragment.childNodes.length
  return fragment
}

function createElement(vnode: Vnode, eventNode: EventNode, ns: NS | undefined): Element {
  let tag = vnode.tag as string
  let data = vnode.data
  switch (tag) {
    case 'svg':
      ns = 'http://www.w3.org/2000/svg';
      break
    case 'math':
      ns = 'http://www.w3.org/1998/Math/MathML';
      break
  }
  let hashIdx = tag.indexOf('#')
  let dotIdx = tag.indexOf('.', hashIdx)
  let hash = hashIdx > 0 ? hashIdx : tag.length
  let dot = dotIdx > 0 ? dotIdx : tag.length
  let sel = hashIdx !== -1 || dotIdx !== -1 ? tag.slice(0, Math.min(hash, dot)) : tag
  let element = ns ? DOM.createElementNS(ns, sel) : DOM.createElement(sel)

  vnode.dom = element
  if (data != null) {
    setAttrs(vnode, eventNode, data, ns)
  }
  if (vnode.text != null) {
    if (vnode.text !== '') element.textContent = vnode.text
    else vnode.children = [new Vnode('#', undefined, undefined, vnode.text, undefined, undefined)]
  }

  if (vnode.children != null) {
    let children = vnode.children
    createNodes(element, children as Vnode[], 0, children.length, eventNode, null, ns)
    setLateAttrs(vnode, eventNode)
  }
  return element
}

function createThunk(thunk: Thunk, eventNode: EventNode, ns: NS | undefined): Element | Text | DocumentFragment {
  let data = thunk.data
  let vnode = Vnode.normalize(data.fn())
  let elm: Element | Text | DocumentFragment = createNode(vnode, eventNode, ns)
  thunk.node = vnode
  thunk.dom = vnode.dom
  thunk.domSize = vnode.domSize
  return elm
}

function createTagger(vnode: Vnode, eventNode: EventNode, ns: NS | undefined): Element | Text | DocumentFragment {
  if (Array.isArray(vnode.children)) {
    let {tagger, children} = getVnodeTagger(vnode)
    let subNode: EventNode = {
      tagger: tagger,
      parent: eventNode
    }
    children = Vnode.normalize(children)
    let elm: Element | Text | DocumentFragment = createNode(children, subNode, ns)
    vnode.dom = children.dom
    vnode.domSize = children.domSize
    return elm
  }
  throw new Error('invalid vnode tagger given')
}

function vnodeHasKey(vnode: Vnode | null) {
  return vnode != null && vnode.key != null
}

function updateNodes(parent: Element | DocumentFragment, old: Array<Vnode | null> | null,
                     vnodes: Array<Vnode | null> | null, eventNode: EventNode,
                     nextSibling: Node | null, ns: NS | undefined): void {
  if (old === vnodes || old == null && vnodes == null) return
  else if (old == null && Array.isArray(vnodes)) createNodes(parent, vnodes, 0, vnodes.length, eventNode, nextSibling, undefined)
  else if (vnodes == null && Array.isArray(old)) removeNodes(parent, old, 0, old.length)
  else if (Array.isArray(old) && Array.isArray(vnodes)) {
    if (old.length === vnodes.length && vnodeHasKey(vnodes[0])) {
      for (let i = 0; i < old.length; i++) {
        if (old[i] === vnodes[i] || old[i] == null && vnodes[i] == null) continue
        else if (old[i] == null) insertNode(parent, createNode(vnodes[i] as Vnode, eventNode, ns), getNextSibling(old, i + 1, nextSibling))
        else if (vnodes[i] == null) removeNodes(parent, old, i, i + 1)
        else updateNode(parent, old[i] as Vnode, vnodes[i] as Vnode, eventNode, getNextSibling(old, i + 1, nextSibling), ns)
      }
    } else {
      let oldStart = 0
      let start = 0
      let oldEnd = old.length - 1
      let end = vnodes.length - 1
      let map: any
      while (oldEnd >= oldStart && end >= start) {
        let o = old[oldStart]
        let v = vnodes[start]
        if (o === v) {
          oldStart++
          start++
        } else if (o != null && v != null && o.key === v.key) {
          oldStart++
          start++
          updateNode(parent, o, v, eventNode, getNextSibling(old, oldStart, nextSibling), ns)
        }
        else {
          let o = old[oldEnd]
          if (o === v) {
            oldEnd--
            start++
          } else if (o != null && v != null && o.key === v.key) {
            updateNode(parent, o, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), ns)
            if (start < end) insertNode(parent, toFragment(o), getNextSibling(old, oldStart, nextSibling))
            oldEnd--
            start++
          } else {
            break
          }
        }
      }
      while (oldEnd >= oldStart && end >= start) {
        let o = old[oldEnd], v = vnodes[end]
        if (o === v) {
          oldEnd--
          end--
        } else if (o != null && v != null && o.key === v.key) {
          updateNode(parent, o, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), ns)
          if (o.dom != null) {
            nextSibling = o.dom as Node
          }
          oldEnd--
          end--
        }
        else {
          if (!map) map = getKeyMap(old, oldEnd)
          if (v != null) {
            let oldIndex: number = map[v.key as string]
            if (oldIndex != null) {
              let movable = old[oldIndex] as Vnode
              updateNode(parent, movable, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), ns)
              insertNode(parent, toFragment(movable), nextSibling)
              (old as Vnode[])[oldIndex].skip = true
              if (movable.dom != null) {
                nextSibling = movable.dom as Node
              }
            }
            else {
              let dom = createNode(v, eventNode, undefined)
              insertNode(parent, dom, nextSibling)
              nextSibling = dom as Node
            }
          }
          end--
        }
        if (end < start) break
      }
      createNodes(parent, vnodes, start, end + 1, eventNode, nextSibling, ns)
      removeNodes(parent, old, oldStart, oldEnd + 1)
    }
  }
}

function updateNode(parent: Element | DocumentFragment, old: Vnode, vnode: Vnode,
                    eventNode: EventNode, nextSibling: Node | null, ns: NS | undefined) {
  let oldTag = old.tag
  let tag = vnode.tag
  if (oldTag === tag && typeof oldTag === 'string') {
    vnode.events = old.events
    switch (tag) {
      case '#': updateText(old, vnode); break
      case '<': updateHTML(parent, old, vnode, nextSibling); break
      case '[': updateFragment(parent, old, vnode, eventNode, nextSibling, ns); break
      default: updateElement(old, vnode, eventNode, ns)
    }
  } else if (old.data != null && typeof old.data.fn === 'function'
            && vnode.data != null && typeof vnode.data.fn === 'function') {
    updateThunk(parent, old as Thunk, vnode as Thunk, eventNode, nextSibling)
  } else if (typeof vnode.tagger === 'function' && typeof old.tagger === 'function') {
    updateTagger(parent, old, vnode, eventNode, nextSibling)
  } else {
    removeNode(parent, old)
    insertNode(parent, createNode(vnode, eventNode, undefined), nextSibling)
  }
}

function updateText(old: Vnode, vnode: Vnode) {
  if ((old.children as string).toString() !== (vnode.children as string).toString()) {
    (old.dom as Text).nodeValue = vnode.children as string
  }
  vnode.dom = old.dom
}

function updateHTML(parent: Element | DocumentFragment, old: Vnode, vnode: Vnode, nextSibling: Node | null) {
  if (old.children !== vnode.children) {
    toFragment(old)
    insertNode(parent, createHTML(vnode), nextSibling)
  }
  else {
    vnode.dom = old.dom
    vnode.domSize = old.domSize
  }
}

function updateFragment(parent: Element | DocumentFragment, old: Vnode, vnode: Vnode,
                        eventNode: EventNode, nextSibling: Node | null, ns: NS | undefined) {
  updateNodes(parent, old.children as Vnode[], vnode.children as Vnode[], eventNode, nextSibling, ns)
  let domSize = 0
  let children = vnode.children
  vnode.dom = undefined
  if (children != null) {
    for (let i = 0; i < children.length; ++i) {
      let child = children[i] as Vnode
      if (child != null && child.dom != null) {
        if (vnode.dom == null) vnode.dom = child.dom
        domSize += child.domSize || 1
      }
    }
    if (domSize !== 1) vnode.domSize = domSize
  }
}

function updateElement(old: Vnode, vnode: Vnode, eventNode: EventNode, ns: NS | undefined) {
  let element = vnode.dom = old.dom
  switch (vnode.tag) {
    case 'svg': ns = 'http://www.w3.org/2000/svg'; break
    case 'math': ns = 'http://www.w3.org/1998/Math/MathML'; break
  }
  if (vnode.tag === 'textarea') {
    if (vnode.data == null) vnode.data = {}
    if (vnode.text != null) vnode.data.value = vnode.text //FIXME handle multiple children
  }
  updateAttrs(vnode, eventNode, old.data, vnode.data, ns)
  if (old.text != null && vnode.text != null && vnode.text !== '') {
    if (old.text.toString() !== vnode.text.toString()) (old.dom as Text).firstChild.nodeValue = vnode.text
  }
  else {
    if (old.text != null) old.children = [new Vnode('#', undefined, undefined, old.text, undefined, (old.dom as Text).firstChild as Text)]
    if (vnode.text != null) vnode.children = [new Vnode('#', undefined, undefined, vnode.text, undefined, undefined)]
    updateNodes(element as Element, old.children as Vnode[], vnode.children as Vnode[], eventNode, null, ns)
  }
}

function updateThunk(parent: Element | DocumentFragment, old: Thunk, vnode: Thunk, eventNode: EventNode, nextSibling: Node | null) {
  let data = vnode.data
  let oldData = old.data
  let i = data.args.length
  let same = data.args === oldData.args && data.fn === oldData.fn
  while (same && i--) {
    same = data.args[i] === oldData.args[i]
  }
  if (same) {
    vnode.node = old.node
    return
  }
  // thunk args or the fn has beed changed
  let node = Vnode.normalize(data.fn())
  updateNode(parent, old.node as Vnode, node, eventNode, nextSibling, undefined)
  vnode.node = node
  vnode.dom = node.dom
  vnode.domSize = node.domSize
}

function updateTagger(parent: Element | DocumentFragment, old: Vnode, vnode: Vnode, eventNode: EventNode, nextSibling: Node | null) {
  let {tagger, children} = getVnodeTagger(vnode)
  let oldInfo = getVnodeTagger(old)
  let nesting = tagger.length > 1 || oldInfo.tagger.length > 1
  if (nesting && oldInfo.tagger.length !== tagger.length) {
    removeNode(parent, old)
    insertNode(parent, createNode(vnode, eventNode, undefined), nextSibling)
    return
  }
  let subEventNode: EventNode = {
    tagger: tagger,
    parent: eventNode
  }
  children = Vnode.normalize(children)
  updateNode(parent, oldInfo.children, children, subEventNode, nextSibling, undefined)
  vnode.dom = children.dom
  vnode.domSize = children.domSize
}

function insertNode(parent: Element | DocumentFragment | Text, node: Element | DocumentFragment | Text, nextSibling: Node | null) {
  if (nextSibling && nextSibling.parentNode) {
    parent.insertBefore(node as Node, nextSibling)
  } else {
    parent.appendChild(node as Node)
  }
}

function removeNodes(parent: Element | DocumentFragment, vnodes: Array<Vnode | null>, start: number, end: number) {
  let vnode: Vnode | null
  let i: number
  for (i = start; i < end; i++) {
    vnode = vnodes[i]
    if (vnode != null) {
      if (vnode.skip) vnode.skip = undefined
      removeNode(parent, vnode)
    }
  }
}

function removeNode(parent: Element | DocumentFragment, vnode: Vnode) {
  let count: number
  let dom = vnode.dom
  if (dom) {
    count = vnode.domSize || 1
    if (count > 1) {
      while (--count) {
        parent.removeChild(dom.nextSibling)
      }
    }
    if (dom.parentNode != null) parent.removeChild(dom as Node)
  }
}

function getKeyMap(vnodes: Array<Vnode | null>, end: number): any {
  let map: any = {}
  let vnode: Vnode | null
  let key: number | string | undefined
  let i = 0
  for (i = 0; i < end; i++) {
    vnode = vnodes[i]
    if (vnode != null) {
      key = vnode.key as string
      if (key != null) map[key] = i
    }
  }
  return map
}

function getVnodeTagger(vnode: Vnode) {
  if (typeof vnode.tagger === 'function') {
    let tagger: Function[] = [vnode.tagger]
    let current = (vnode.children as Vnode[])[0]
    while (typeof current.tagger === 'function') {
      tagger = [current.tagger].concat(tagger)
      if (Array.isArray(current.children) && current.children[0] != null) {
        current = current.children[0] as Vnode
      } else {
        break
      }
    }
    return {
      tagger: tagger,
      children: current
    }
  } else {
    throw new Error('invalid vnode passed')
  }
}

function setAttrs(vnode: Vnode, eventNode: EventNode, data: any, ns: NS | undefined): void {
  for (let key in data) {
    setAttr(vnode, eventNode, key, null, data[key], ns)
  }
}

function updateAttrs(vnode: Vnode, eventNode: EventNode, old: any, data: any, ns: NS | undefined) {
  let key: any
  if (data != null) {
    for (key in (data as any)) {
      setAttr(vnode, eventNode, key, old && old[key], data[key], ns)
    }
  }
  if (old != null) {
    for (key in old) {
      if (data == null || !(key in (data as VnodeData))) {
        if (key[0] === 'o' && key[1] === 'n') updateEvent(vnode, eventNode, key as string, undefined)
        else if (key !== 'key') (vnode.dom as Element).removeAttribute(key)
      }
    }
  }
}

function setAttr(vnode: Vnode, eventNode: EventNode, key: string, old: any, value: any, ns: NS | undefined) {
  let element = vnode.dom as any
  if (key === 'key' || (old === value && !isFormAttribute(vnode, key))
    && typeof value !== 'object' || typeof value === 'undefined') {
      return
    }
  let nsLastIndex = key.indexOf(':')
  if (nsLastIndex > -1 && key.substr(0, nsLastIndex) === 'xlink') {
    element.setAttributeNS('http://www.w3.org/1999/xlink', key.slice(nsLastIndex + 1), value)
  }
  else if (key[0] === 'o' && key[1] === 'n' && typeof value === 'function' || Array.isArray(value)) updateEvent(vnode, eventNode, key, value)
  else if (key === 'style') updateStyle(element as HTMLElement, old, value)
  else if (key in element && !isAttribute(key) && ns === undefined) {
    //setting input[value] to same value by typing on focused element moves cursor to end in Chrome
    if (vnode.tag === 'input' && key === 'value' && (element as HTMLInputElement).value === value && vnode.dom === DOM.activeElement()) return
    element[key] = value
  }
  else {
    if (typeof value === 'boolean') {
      if (value) element.setAttribute(key, '')
      else element.removeAttribute(key)
    }
    else element.setAttribute(key === 'className' ? 'class' : key, value)
  }
}

function setLateAttrs(vnode: Vnode, eventNode: EventNode): void {
  let data = vnode.data
  if (typeof vnode.tag === 'string' && vnode.tag === 'select' && data != null) {
    if ('value' in data) setAttr(vnode, eventNode, 'value', null, data.value, undefined)
    if ('selectedIndex' in data) setAttr(vnode, eventNode, 'selectedIndex', null, data.selectedIndex, undefined)
  }
}

function isFormAttribute(vnode: Vnode, attr: string): boolean {
  return attr === 'value' || attr === 'checked' || attr === 'selectedIndex' || attr === 'selected' && vnode.dom === DOM.activeElement()
}
function isAttribute(attr: string): boolean {
  return attr === 'href' || attr === 'list' || attr === 'form'// || attr === 'type' || attr === 'width' || attr === 'height'
}

function toFragment(vnode: Vnode): DocumentFragment | Element  {
  let count = vnode.domSize
  if (count != null || vnode.dom == null) {
    let fragment = DOM.createDocumentFragment()
    if (count > 0) {
      let dom = vnode.dom as Node
      while (--count) fragment.appendChild(dom.nextSibling)
      fragment.insertBefore(dom, fragment.firstChild)
    }
    return fragment
  }
  else return vnode.dom as Element
}

function getNextSibling(vnodes: Array<Vnode | null>, i: number, nextSibling: Node | null) {
  let vnode: Vnode | null
  for (; i < vnodes.length; i++) {
    vnode = vnodes[i]
    if (vnode != null && vnode.dom != null) return vnode.dom as Node
  }
  return nextSibling
}

//style
function updateStyle(element: HTMLElement, old: any, style: any) {
  if (old === style) {
    element.style.cssText = ''
    old = null
  } if (style == null) {
    element.style.cssText = ''
  } else if (typeof style === 'string') {
    element.style.cssText = style
  } else {
    if (typeof old === 'string') element.style.cssText = ''
    for (let key in style) {
      (element.style as any)[key] = style[key]
    }
    if (old != null && typeof old !== 'string') {
      for (let key in old) {
        if (!(key in style)) (element.style as any)[key] = ''
      }
    }
  }
}

function invokeArrayHandler(handler: any[], dom: Element, event: Event) {
  return handler.length === 2
    ? handler[0].call(dom, handler[1], event)
    : handler[0].apply(dom, handler.slice(1).concat(event))
}

function sendHtmlSignal(msg: any, eventNode: EventNode) {
  let currentEventNode: EventNode = eventNode
  let tagger: Function | Function[]
  while (currentEventNode) {
    tagger = currentEventNode.tagger
    if (Array.isArray(tagger)) {
      for (let i = tagger.length; i--; ) {
        msg = tagger[i](msg)
      }
    } else {
      msg = tagger(msg)
    }
    if (currentEventNode.parent != null) currentEventNode = currentEventNode.parent
    else break
  }
  return msg
}

//event
function updateEvent(vnode: Vnode, eventNode: EventNode, key: string, value: any) {
  let element = vnode.dom as Element
  function listener(event: Event) {
    let msg = Array.isArray(value) ? invokeArrayHandler(value, element, event) : value.call(element, value)
    sendHtmlSignal(msg, eventNode)
  }
  if (key in element && typeof value === 'function' && Array.isArray(value)) (element as any)[key] = listener
  else {
    let eventName = key.slice(2)
    if (vnode.events != null) vnode.events = {}
    if (vnode.events[eventName] != null) element.removeEventListener(eventName, vnode.events[key], false)
    else if (typeof value === 'function' && Array.isArray(value)) {
      vnode.events[eventName] = listener
      element.addEventListener(eventName, vnode.events[key], false)
    }
  }
}

export function render(eventNode: EventNode) {
  return function (dom: HTMLElement, vnodes: Vnode | null | Array<Vnode | null>): void {
    let active = DOM.activeElement()
    if ((dom as any).vnodes == null) (dom as Element).textContent = ''
    if (!Array.isArray(vnodes)) vnodes = [vnodes]
    updateNodes(dom, (dom as any).vnodes as Array<Vnode | null>, Vnode.normalizeChildren(vnodes), eventNode, null, undefined);
    (dom as any).vnodes = vnodes
    if (DOM.activeElement() !== active) {
      (active as HTMLElement).focus()
    }
  }
}
