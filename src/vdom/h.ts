import { Vnode, VnodeData, ChildVnode } from './vnode'
import { isPrimitive, isDef, isUndef } from '../util/is'

export type ChildrenVnode = string | number | boolean | null

export interface HyperscriptFn {
  (tag: string): Vnode
  (tag: string, data: VnodeData): Vnode
  (tag: string, children: ChildrenVnode | Array<ChildrenVnode>): Vnode
  (tag: string, data: VnodeData, children: ChildrenVnode | Array<ChildrenVnode>): Vnode
}

export const h = <HyperscriptFn>function (tag: string, b?: any, c?: any): Vnode {
  let data: VnodeData = {}
  let children: Array<Vnode | string | number | boolean | null> | undefined
  let childlist: ChildVnode
  let text: string | undefined
  if (arguments.length === 3) {
    data = b
    if (Array.isArray(c)) {
      children = c
    } else if (isPrimitive(c)) {
      children = [c]
    } else {
      data = b
    }
  } else if (arguments.length === 2) {
    if (Array.isArray(b)) {
      children = b
    } else if (isPrimitive(b)) {
      children = [b]
    } else {
      data = b
    }
  }
  if (Array.isArray(children)) {
    childlist = Vnode.normalizeChildren(children)
  }
  if (Array.isArray(childlist) && childlist.length === 1 && childlist[0] != null) {
    let textNode = childlist[0]
    if (textNode instanceof Vnode && textNode.tag === '#' && typeof textNode.children === 'string') {
      text = textNode.children
      childlist = undefined
    }
  }
  let hashIdx = tag.indexOf('#')
  let dotIdx = tag.indexOf('.', hashIdx)
  let hash = hashIdx > 0 ? hashIdx : tag.length
  let dot = dotIdx > 0 ? dotIdx : tag.length
  let sel = hashIdx !== -1 || dotIdx !== -1 ? tag.slice(0, Math.min(hash, dot)) : tag
  let className = data.class || data.className
  if (dotIdx > 0 && isUndef(className)) {
    data.className = tag.slice(dot + 1).replace(/\./g, ' ')
  }
  if (hash < dot) {
    data.id = tag.slice(hash + 1, dot)
  }
  if (isDef(className)) {
    if (isDef(data.class)) {
      data.class = undefined
      data.className = className
    }
    if (dotIdx > 0) {
      data.className = tag.slice(dot + 1).replace(/\./g, ' ') + ' ' + className
    }
  }
  return new Vnode(sel, data && data.key, data, childlist, text, undefined)
}