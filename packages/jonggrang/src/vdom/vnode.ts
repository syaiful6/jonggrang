import { isArray } from '../util/is'

export type ChildVnode = Array<Vnode | null> | string | undefined

export interface EventData {
  oncopy?: (e: ClipboardEvent) => any
  oncut?: (e: ClipboardEvent) => any
  onpaste?: (e: ClipboardEvent) => any
  oncompositionend?: (e: CompositionEvent) => any
  oncompositionstart?: (e: CompositionEvent) => any
  oncompositionupdate?: (e: CompositionEvent) => any
  onkeydown?: (e: KeyboardEvent) => any
  onkeyup?: (e: KeyboardEvent) => any
  onkeypress?: (e: KeyboardEvent) => any
  onfocus?: (e: FocusEvent) => any
  onblur?: (e: FocusEvent) => any
  onchange?: (e: Event) => any
  onsubmit?: (e: Event) => any
  onclick?: (e: MouseEvent) => any
  oncontextmenu?: (e: MouseEvent) => any
  ondblclick?: (e: MouseEvent) => any
  ondrag?: (e: MouseEvent) => any
  ondragstart?: (e: MouseEvent) => any
  ondragend?: (e: MouseEvent) => any
  ondragenter?: (e: MouseEvent) => any
  ondragexit?: (e: MouseEvent) => any
  ondragleave?: (e: MouseEvent) => any
  ondragover?: (e: MouseEvent) => any
  ondrop?: (e: MouseEvent) => any
  onmousedown?: (e: MouseEvent) => any
  onmouseenter?: (e: MouseEvent) => any
  onmouseleave?: (e: MouseEvent) => any
  onmousemove?: (e: MouseEvent) => any
  onmouseout?: (e: MouseEvent) => any
  onselect?: (e: UIEvent | Event) => any
  ontouchcancel?: (e: TouchEvent) => any
  ontouchend?: (e: TouchEvent) => any
  ontouchmove?: (e: TouchEvent) => any
  ontouchstart?: (e: TouchEvent) => any
  onscroll?: (e: UIEvent) => any
  onwheel?: (e: WheelEvent) => any
  onabort?: (e: UIEvent | Event) => any
  ontransitionend?: (e: TransitionEvent) => any
}

export interface VnodeAttr {
  readonly?: boolean
  value?: any
  selectedIndex?: any
  checked?: boolean
  selected?: boolean
  title?: string
  style?: any
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
  [key: string]: any
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

export interface Blueprint {
  tag?: string | { index: number }
  key?: string | number | { index: number }
  children?: ChildVnode | { index: number }
  data?: VnodeData | { index: number }
  tagger?: Function
}
