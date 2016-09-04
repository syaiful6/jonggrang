import { Vnode, VnodeData, ChildVnode } from './vnode'
import { isPrimitive } from '../util/is'

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

  return new Vnode(tag, data && data.key, data, childlist, text, undefined)
}
