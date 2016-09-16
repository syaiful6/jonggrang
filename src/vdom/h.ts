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

export interface Blueprint {
  tag?: string | { index: number }
  key?: string | number | { index: number }
  children?: ChildVnode | { index: number }
  data?: VnodeData | { index: number }
  tagger?: Function
}

export function blueprint(shape: Blueprint) {
  let tag = shape.tag || undefined
  let tagIsDynamic = tag && isDef((tag as any).index) ? true : false

  let key = shape.key || undefined
  let keyIsDynamic = key && isPrimitive(key) ? true : false

  let children = shape.children || undefined
  let childrenIsDynamic = children && !Array.isArray(children) && !isPrimitive(children) ? true : false

  let data = shape.data || undefined
  let dataIsDynamic = data && isDef((data as any).index) ? true : false

  let tagger = shape.tagger || undefined
  let taggerIsDynamic = tagger && isDef((data as any).index) ? true : false

  return (...args: any[]) => {
    let vnode = new Vnode(undefined, undefined, undefined, undefined, undefined, undefined)
    let tagName: string | undefined = tagIsDynamic ? args[(tag as any).index] : tag
    vnode.key = keyIsDynamic ? args[(key as any).index] : key
    vnode.children = childrenIsDynamic ? args[(children as any).index] : children
    vnode.tagger = taggerIsDynamic ? args[(tagger as any).index] : tagger

    let attr: VnodeData = dataIsDynamic ? (args[(data as any).index] || {}) : (isUndef(data) ? {} : data)
    let sel: string | undefined

    if (typeof tagName === 'string') {
      let hashIdx = tagName.indexOf('#')
      let dotIdx = tagName.indexOf('.', hashIdx)
      let hash = hashIdx > 0 ? hashIdx : tagName.length
      let dot = dotIdx > 0 ? dotIdx : tagName.length
      let className = attr.class || attr.className

      sel = hashIdx !== -1 || dotIdx !== -1 ? tagName.slice(0, Math.min(hash, dot)) : tagName
      if (dotIdx > 0 && isUndef(className)) {
        attr.className = tagName.slice(dot + 1).replace(/\./g, ' ')
      }
      if (hash < dot) {
        attr.id = tagName.slice(hash + 1, dot)
      }
      if (isDef(className)) {
        if (isDef(attr.class)) {
          attr.class = undefined
          attr.className = className
        }
        if (dotIdx > 0) {
          attr.className = tagName.slice(dot + 1).replace(/\./g, ' ') + ' ' + className
        }
      }
    }
    vnode.data = attr
    vnode.tag = sel
    return vnode
  }
}