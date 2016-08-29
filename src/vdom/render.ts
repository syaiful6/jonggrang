import {Vnode, VnodeData, Thunk} from './vnode'
import * as DOM from './dom'

export type EventNode = {
  tagger: Function | Function[]
  parent: EventNode | null
}

export type NS = "http://www.w3.org/1998/Math/MathML" | "http://www.w3.org/2000/svg"

export interface VnodeElement extends Element {
  vnodes: Array<Vnode | null> | null
}

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
      case "#": return createText(vnode)
      case "<": return createHTML(vnode)
      case "[": return createFragment(vnode, eventNode, ns)
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
    let match = vnode.children.match(/^\s*?<(\w+)/im) || []
    let parent: string = {caption: "table", thead: "table", tbody: "table", tfoot: "table", tr: "tbody", th: "tr", td: "tr", colgroup: "table", col: "colgroup"}[match[1]] || "div"
    let temp = DOM.createElement(parent)

    temp.innerHTML = vnode.children
    vnode.dom = temp.firstChild
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
  vnode.dom = fragment.firstChild
  vnode.domSize = fragment.childNodes.length
  return fragment
}

function createElement(vnode: Vnode, eventNode: EventNode, ns: NS | undefined): Element {
  let tag = vnode.tag as string
  let data = vnode.data
  switch (tag) {
    case "svg": ns = "http://www.w3.org/2000/svg"; break
    case "math": ns = "http://www.w3.org/1998/Math/MathML"; break
  }

  let element = ns ? DOM.createElementNS(ns, tag) : DOM.createElement(tag)

  vnode.dom = element
  if (data != null) {
    setAttrs(vnode, eventNode, data, ns)
  }
  if (vnode.text != null) {
    if (vnode.text !== '') element.textContent = vnode.text
    else vnode.children = [new Vnode("#", undefined, undefined, vnode.text, undefined, undefined)]
  }

  if (vnode.children != null) {
    let children = vnode.children
    createNodes(element, children as Vnode[], 0, children.length, eventNode, null, ns)
    setLateAttrs(vnode)
  }
  return element
}

function createThunk(thunk: Thunk, eventNode: EventNode, ns: NS | undefined): Element | Text | DocumentFragment {
  let data = thunk.data
  let vnode = Vnode.normalize(data.fn())
  let elm: Element | Text | DocumentFragment = createNode(vnode, eventNode, ns)
  thunk.dom = vnode.dom
  thunk.domSize = vnode.domSize
  return elm
}

function createTagger(vnode: Vnode, eventNode: EventNode, ns: NS | undefined): Element | Text | DocumentFragment {
  if (Array.isArray(vnode.children)) {
    let tagger = [vnode.tagger as Function]
    let children = vnode.children[0] as Vnode
    while (children != null && typeof children.tagger === 'function') {
      tagger = [children.tagger].concat(tagger)
      if (Array.isArray(children.children) && children.children[0] != null) {
        children = children.children[0] as Vnode
      } else {
        break
      }
    }
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

function updateNodes(parent: Element | DocumentFragment, old: Array<Vnode | null> | null, vnodes: Array<Vnode | null> | null,
                    eventNode: EventNode, nextSibling: Node | null, ns: NS | undefined) {
  if (old === vnodes || old == null && vnodes == null) return
  else if (old == null && Array.isArray(vnodes)) createNodes(parent, vnodes, 0, vnodes.length, eventNode, nextSibling, undefined)
  else if (vnodes == null && Array.isArray(old)) removeNodes(parent, old, 0, old.length)
  else if(Array.isArray(old) && Array.isArray(vnodes)) {
    if (old.length === vnodes.length && vnodeHasKey(vnodes[0])) {
      for (let i = 0; i < old.length; i++) {
        if (old[i] === vnodes[i] || old[i] == null && vnodes[i] == null) continue
        else if (old[i] == null) insertNode(parent, createNode(vnodes[i] as Vnode, eventNode, ns), getNextSibling(old, i + 1, nextSibling))
        else if (vnodes[i] == null) removeNodes(parent, old, i, i + 1)
      }
    }
  }
}

function insertNode(parent: Element | DocumentFragment, node: Element | DocumentFragment | Text, nextSibling: Node | null) {
  if (nextSibling && nextSibling.parentNode) parent.insertBefore(node, nextSibling)
  else parent.appendChild(node)
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
    if (dom.parentNode != null) parent.removeChild(dom)
  }
}

function setAttrs(vnode: Vnode, eventNode: EventNode, data: VnodeData, ns: NS | undefined): void {

}

function setLateAttrs(vnode: Vnode): void {

}

function getNextSibling(vnodes: Array<Vnode | null>, i: number, nextSibling: Node | null) {
  let vnode: Vnode | null
  for (; i < vnodes.length; i++) {
    vnode = vnodes[i]
    if (vnode != null && vnode.dom != null) return vnode.dom as Node
  }
  return nextSibling
}

export function render(eventNode: EventNode) {
  return function (dom: VnodeElement, vnodes: Vnode | null | Array<Vnode | null>): void {
    let active = DOM.activeElement()
    if (dom.vnodes == null) dom.textContent = ''
    if (!Array.isArray(vnodes)) vnodes = [vnodes]
    updateNodes(dom, dom.vnodes, Vnode.normalizeChildren(vnodes), eventNode, null, undefined)
    dom.vnodes = vnodes
    if (DOM.activeElement() !== active) {
      (active as HTMLElement).focus()
    }
  }
}
