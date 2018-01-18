/**
 * The core virtual-dom tree type, where `A` is the type of attributes, and `w`
 * is the type of "widgets". Widgets are machines that have complete control over
 * the lifecycle of some `DOM.Node`.
 */
export type VDom<A, W>
  = VText
  | VElem<A, W>
  | VElemKeyed<A, W>
  | VWidget<W>
  | Graft<A, W>;

/**
 * enum for VDom
 */
export const enum VDomType {
  VTEXT,
  VELEM,
  VELEMKEYED,
  VWIDGET,
  VGRAFT
}

export interface ElemSpec<A> {
  ns: string | undefined;
  tag: string;
  attrs: A;
}

export type KeyVDom<A, W> = {
  key: string,
  vdom: VDom<A, W>
};

export interface VText {
  tag: VDomType.VTEXT;
  text: string;
}

export interface VWidget<W> {
  tag: VDomType.VWIDGET;
  widget: W;
}

export interface Graft<A, W> {
  tag: VDomType.VGRAFT;
  f(x: any): A;
  g(x: any): W;
  vdom: VDom<any, any>;
}

export interface VElem<A, W>  {
  tag: VDomType.VELEM;
  elem: ElemSpec<A>;
  childs: VDom<A, W>[];
}

export interface VElemKeyed<A, W> {
  tag: VDomType.VELEMKEYED;
  elem: ElemSpec<A>;
  childs: KeyVDom<A, W>[];
}

export function getKeyVdom(b: KeyVDom<any, any>): string {
  return b.key;
}

export function VElement<A>(ns: string | undefined, tag: string, attrs: A): ElemSpec<A> {
  return { ns, tag, attrs }
}

export function VTree(
  tag: VDomType.VTEXT, text: string
): VText;
export function VTree<W>(
  tag: VDomType.VWIDGET, widget: W
): VWidget<W>;
export function VTree<A, W>(
  tag: VDomType.VGRAFT, f: (_: any) => A, g: (_: any) => W, vdom: VDom<any, any>
): Graft<A, W>;
export function VTree<A, W>(
  tag: VDomType.VELEM, eltag: string, ns: string | undefined, attrs: A, childs: VDom<A, W>[]
): VElem<A, W>;
export function VTree<A, W>(
  tag: VDomType.VELEMKEYED, eltag: string, ns: string | undefined, attrs: A, childs: KeyVDom<A, W>[]
): VElemKeyed<A, W>;
export function VTree(
  tag: VDomType, eltag: any, ns?: any, attrs?: any, childs?: any
): any {
  let text: any, widget: any, f: any, g: any, vdom: any, elem: any, children: any;
  if (tag === VDomType.VTEXT) {
    text = eltag;
  } else if (tag === VDomType.VWIDGET) {
    widget = eltag;
  } else if (tag === VDomType.VGRAFT) {
    f = eltag;
    g = ns;
    vdom = attrs;
  } else {
    elem = VElement(ns, eltag, attrs);
    children = childs;
  }
  return {
    tag,
    elem,
    childs: children,
    text,
    widget,
    f,
    g,
    vdom
  };
}

export function mapVDom<A, W, R>(g: (_: W) => R, vdom: VDom<A, W>): VDom<A, R> {
  switch (vdom.tag) {
    case VDomType.VTEXT:
      return vdom;

    case VDomType.VGRAFT:
      return mapGraft(g, vdom);

    default:
      return VTree(VDomType.VGRAFT, id, g, vdom);
  }
}

export function bimapVDom<A, W, B, R>(f: (x: A) => B, g: (x: W) => R, vdom: VDom<A, W>): VDom<B, R> {
  switch (vdom.tag) {
    case VDomType.VTEXT:
      return vdom;

    case VDomType.VGRAFT:
      return bimapGraft(f, g, vdom);

    default:
      return VTree(VDomType.VGRAFT, f, g, vdom);
  }
}

export function mapGraft<A, W, R>(f: (x: W) => R, gr: Graft<A, W>): Graft<A, R> {
  return VTree(VDomType.VGRAFT, gr.f, o(f, gr.g), gr.vdom);
}

export function bimapGraft<A, W, B, R>(f: (x: A) => B, g: (x: W) => R, gr: Graft<A, W>): Graft<B, R> {
  return VTree(VDomType.VGRAFT, o(f, gr.f), o(g, gr.g), gr.vdom);
}

export function runGraft<A, W>(graft: Graft<A, W>): VDom<A, W> {
  function go(vdom: VDom<A, W>): VDom<A, W> {
    switch (vdom.tag) {
      case VDomType.VELEM:
        return VTree(vdom.tag, vdom.elem.tag, vdom.elem.ns, graft.f(vdom.elem.attrs),
                vdom.childs.map(go));

      case VDomType.VELEMKEYED:
        return VTree(vdom.tag, vdom.elem.tag, vdom.elem.ns, graft.f(vdom.elem.attrs),
                vdom.childs.map(keyed => ({ key: keyed.key, vdom: go(keyed.vdom) })));

      case VDomType.VWIDGET:
        return VTree(VDomType.VWIDGET, graft.g(vdom.widget));

      case VDomType.VTEXT:
        return vdom;

      case VDomType.VGRAFT:
        return bimapGraft(graft.f, graft.g, vdom);

      default:
        throw new Error('Invalid VDom Tree detected: ' + JSON.stringify(vdom));
    }
  }
  return go(graft.vdom);
}

export function id<A>(a: A): A {
  return a;
}

export function o<A, B, C>(f: (_: B) => C, g: (_: A) => B) {
  return (x: A) => f(g(x));
}

export interface Halt {
  (): void;
}

export interface Machine<A, B> {
  readonly result: B;
  step(a: A): Machine<A, B>;
  halt: Halt;
}

export interface StrMap<A> {
  [key: string]: A;
}

export function emptyStrMap<A>(): StrMap<A> {
  let obj: StrMap<A> = Object.create(null);
  return obj;
}
