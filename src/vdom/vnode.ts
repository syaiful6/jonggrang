import {isArray} from '../util/is'

export type ChildVnode = Array<Vnode | string> | string | number | boolean

export type TextVnode = string | number | boolean

export interface EventData {
  oncopy?: <T>(e: ClipboardEvent) => T
  oncut?: <T>(e: ClipboardEvent) => T
  onpaste?: <T>(e: ClipboardEvent) => T
  oncompositionend?: <T>(e: CompositionEvent) => T
  oncompositionstart?: <T>(e: CompositionEvent) => T
  oncompositionupdate?: <T>(e: CompositionEvent) => T
  onkeydown?: <T>(e: KeyboardEvent) => T
  onkeyup?: <T>(e: KeyboardEvent) => T
  onkeypress?: <T>(e: KeyboardEvent) => T
  onfocus?: <T>(e: FocusEvent) => T
  onblur?: <T>(e: FocusEvent) => T
  onchange?: <T>(e: Event) => T
  onsubmit?: <T>(e: Event) => T
  onclick?: <T>(e: MouseEvent) => T
  oncontextmenu?: <T>(e: MouseEvent) => T
  ondblclick?: <T>(e: MouseEvent) => T
  ondrag?: <T>(e: MouseEvent) => T
  ondragstart: <T>(e: MouseEvent) => T
  ondragend?: <T>(e: MouseEvent) => T
  ondragenter?: <T>(e: MouseEvent) => T
  ondragexit?: <T>(e: MouseEvent) => T
  ondragleave?: <T>(e: MouseEvent) => T
  ondragover?: <T>(e: MouseEvent) => T
  ondrop?: <T>(e: MouseEvent) => T
  onmousedown?: <T>(e: MouseEvent) => T
  onmouseenter?: <T>(e: MouseEvent) => T
  onmouseleave?: <T>(e: MouseEvent) => T
  onmousemove?: <T>(e: MouseEvent) => T
  onmouseout?: <T>(e: MouseEvent) => T
  onselect?: <T>(e: UIEvent | Event) => T
  ontouchcancel?: <T>(e: TouchEvent) => T
  ontouchend?: <T>(e: TouchEvent) => T
  ontouchmove?: <T>(e: TouchEvent) => T
  ontouchstart?: <T>(e: TouchEvent) => T
  onscroll?: <T>(e: UIEvent) => T
  onwheel?: <T>(e: WheelEvent) => T
  onabort?: <T>(e: UIEvent | Event) => T
}

export interface VnodeData extends EventData {
  className?: string
  class?: string
  id?: string
  events?: any
  // thunk
  fn?: () => Vnode
  args?: any[]
}

export class Vnode {

  public tag: string | undefined
  public key: string | number | undefined
  public children: ChildVnode | undefined
  public text: TextVnode | undefined
  public dom: HTMLElement | Text | undefined
  public domSize: number | undefined
  public data: VnodeData | undefined
  public tagger: Function | undefined
  constructor(tag: string | undefined, key: string | number | undefined,
              data: VnodeData | undefined, children: ChildVnode | undefined, text: TextVnode | undefined,
              dom: HTMLElement | Text | undefined) {
    this.tag = tag
    this.key = key
    this.data = data
    this.children = children
    this.text = text
    this.dom = dom
  }

  static normalize(node: Array<Vnode>): Vnode;
  static normalize(node: string): Vnode;
  static normalize(node: Vnode): Vnode;
  static normalize(node: any): Vnode {
    if (isArray(node)) {
      return new Vnode('[', undefined, undefined, node, undefined, undefined)
    } else if (typeof node === 'string') {
       return Vnode.createTextVNode(node)
    }
    return node
  }

  map(tagger: Function): Vnode {
    let vnode = new Vnode('<$>', undefined, undefined, [this], undefined, undefined)
    vnode.tagger = tagger
    return vnode
  }

  static createTextVNode(text: string) {
    return new Vnode('#', undefined, undefined, text, undefined, undefined)
  }
}

export interface ThunkData extends VnodeData {
  fn: () => Vnode
  args: any[]
}

export class Thunk extends Vnode {
  public data: ThunkData

  constructor(tag: string | undefined, key: string | number | undefined,
              data: ThunkData, children: ChildVnode, text: TextVnode,
              dom: HTMLElement | Text | undefined) {
    super(tag, key, data, children, text, dom)
  }
}
