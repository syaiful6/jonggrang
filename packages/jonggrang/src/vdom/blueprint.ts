import { Vnode, VnodeData, Blueprint } from './vnode'
import { isPrimitive, isDef, isUndef } from '../util/is'

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