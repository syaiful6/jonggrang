import { isArray } from '../util/is'

export type ChildVnode = Array<Vnode | null> | string | undefined

export interface EventData {
  oncopy?: (<T>(e: ClipboardEvent) => T) | any[]
  oncut?: (<T>(e: ClipboardEvent) => T) | any[]
  onpaste?: (<T>(e: ClipboardEvent) => T) | any[]
  oncompositionend?: (<T>(e: CompositionEvent) => T) | any[]
  oncompositionstart?: (<T>(e: CompositionEvent) => T) | any[]
  oncompositionupdate?: (<T>(e: CompositionEvent) => T) | any[]
  onkeydown?: (<T>(e: KeyboardEvent) => T) | any[]
  onkeyup?: (<T>(e: KeyboardEvent) => T) | any[]
  onkeypress?: (<T>(e: KeyboardEvent) => T) | any[]
  onfocus?: (<T>(e: FocusEvent) => T) | any[]
  onblur?: (<T>(e: FocusEvent) => T) | any[]
  onchange?: (<T>(e: Event) => T) | any[]
  onsubmit?: (<T>(e: Event) => T) | any[]
  onclick?: (<T>(e: MouseEvent) => T) | any[]
  oncontextmenu?: (<T>(e: MouseEvent) => T) | any[]
  ondblclick?: (<T>(e: MouseEvent) => T) | any[]
  ondrag?: (<T>(e: MouseEvent) => T) | any[]
  ondragstart?: (<T>(e: MouseEvent) => T) | any[]
  ondragend?: (<T>(e: MouseEvent) => T) | any[]
  ondragenter?: (<T>(e: MouseEvent) => T) | any[]
  ondragexit?: (<T>(e: MouseEvent) => T) | any[]
  ondragleave?: (<T>(e: MouseEvent) => T) | any[]
  ondragover?: (<T>(e: MouseEvent) => T) | any[]
  ondrop?: (<T>(e: MouseEvent) => T) | any[]
  onmousedown?: (<T>(e: MouseEvent) => T) | any[]
  onmouseenter?: (<T>(e: MouseEvent) => T) | any[]
  onmouseleave?: (<T>(e: MouseEvent) => T) | any[]
  onmousemove?: (<T>(e: MouseEvent) => T) | any[]
  onmouseout?: (<T>(e: MouseEvent) => T) | any[]
  onselect?: (<T>(e: UIEvent | Event) => T) | any[]
  ontouchcancel?: (<T>(e: TouchEvent) => T) | any[]
  ontouchend?: (<T>(e: TouchEvent) => T) | any[]
  ontouchmove?: (<T>(e: TouchEvent) => T) | any[]
  ontouchstart?: (<T>(e: TouchEvent) => T) | any[]
  onscroll?: (<T>(e: UIEvent) => T) | any[]
  onwheel?: (<T>(e: WheelEvent) => T) | any[]
  onabort?: (<T>(e: UIEvent | Event) => T) | any[]
  ontransitionend?: (<T>(e: TransitionEvent) => T) | any[]
}

export interface VnodeAttr {
  readonly?: boolean
  value?: any
  selectedIndex?: any
  checked?: boolean
  selected?: boolean
}

export interface VnodeData extends VnodeAttr, EventData {
  className?: string
  class?: string
  id?: string
  key?: string | number
  dataset?: any
  // thunk
  fn?: () => Vnode
  args?: any[]
}

export interface ThunkData extends VnodeData {
  fn: () => Vnode
  args: any[]
}

export interface ThunkComparator {
  (oldData: ThunkData, currentData: ThunkData): boolean
}

export class Vnode {
  public tag: string | undefined
  public key: string | number | undefined
  public children: ChildVnode | undefined
  public text: string | undefined
  public dom: HTMLElement | Text | undefined
  public domSize: number | undefined
  public data: VnodeData | undefined
  public tagger: Function | undefined
  public events: any
  public skip: boolean | undefined
  public node: Vnode | undefined
  constructor(tag: string | undefined, key: string | number | undefined,
              data: VnodeData | undefined, children: ChildVnode | undefined, text: string | undefined,
              dom: HTMLElement | Text | undefined) {
    this.tag = tag
    this.key = key
    this.data = data
    this.children = children
    this.text = text
    this.dom = dom
    this.domSize = undefined
    this.events = undefined
    this.tagger = undefined
    this.skip = undefined
    this.node = undefined
  }

  static normalize(node: Vnode | Array<Vnode> | string): Vnode {
    if (isArray(node)) {
      return new Vnode('[', undefined, undefined, node, undefined, undefined)
    } else if (typeof node === 'string') {
       return Vnode.createTextVNode(node)
    }
    return node
  }

  static normalizeChildren(children: Array<Vnode | string | number | boolean | Array<Vnode> | null>): Vnode[] {
    let item: Vnode | string | number | boolean | Array<Vnode> | null
    let normalized: Vnode[] = []
    for (let i = 0; i < children.length; i++) {
      item = children[i]
      if (typeof item === 'boolean' || item == null) {
        continue
      }
      if (typeof item === 'number' || typeof item === 'string') {
        item = String(item)
        normalized[i] = Vnode.normalize(item)
      } else {
        normalized[i] = Vnode.normalize(item)
      }
    }
    return normalized
  }

  map(tagger: Function): Vnode {
    let vnode = new Vnode(undefined, undefined, undefined, [this], undefined, undefined)
    vnode.tagger = tagger
    return vnode
  }

  static createTextVNode(text: string) {
    return new Vnode('#', undefined, undefined, text, undefined, undefined)
  }
}

export interface Thunk extends Vnode {
  data: ThunkData
  // the comparison, return true if the old thunk is considered equals to current
  // thunk. If it return true, we will not update it
  compare: ThunkComparator
}