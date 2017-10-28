import {
  VDom, Machine, ElemSpec, StrMap, KeyVDom, getKeyVdom, VDomType,
  runGraft, emptyStrMap
} from './types';
import { DocumentSpec } from './dom-util';

/**
 * reexport
 */
export { DocumentSpec, createDocumentSpec } from './dom-util';

/**
 * Widget machines recursively reference the configured spec to potentially
 * enable recursive trees of Widgets.
 */
export interface VDomSpec<A, W> {
  document: DocumentSpec;
  buildWidget(spec: VDomSpec<A, W>, attr: W): Machine<W, Node>;
  buildAttributes(elem: Element, a: A): Machine<A, void>;
}

/**
 * Start an initial `VDom` machine by providing a `VDomSpec` and `VDom`
 * ```
 *  let machine1 = buildVDom(vdomspec, vdomtree1)
 *  let machine2 = machine1.step(vdomtree2)
 * ```
 */
export function buildVDom<A, W>(
  spec: VDomSpec<A, W>, vnode: VDom<A, W>
): Machine<VDom<A, W>, Node> {
  switch (vnode.tag) {
    case VDomType.VTEXT:
      return buildText(spec, vnode.text);

    case VDomType.VELEM:
      return buildElem(spec, vnode.elem, vnode.childs);

    case VDomType.VELEMKEYED:
      return buildKeyed(spec, vnode.elem, vnode.childs);

    case VDomType.VGRAFT:
      return buildVDom(spec, runGraft(vnode));

    case VDomType.VWIDGET:
      return buildWidget(spec, vnode.widget);

    default:
      throw new Error('Invalid VDom Tree detected: ' + JSON.stringify(vnode));
  }
}

class TextMachine<A, W> implements Machine<VDom<A, W>, Node> {
  constructor(
    readonly result: Node,
    private spec: VDomSpec<A, W>,
    private text: string
  ) {
  }

  step(vnode: VDom<A, W>): Machine<VDom<A, W>, Node> {
    if (vnode.tag === VDomType.VGRAFT) {
      return this.step(runGraft(vnode));
    } else if (vnode.tag === VDomType.VTEXT) {
      let res = new TextMachine(this.result, this.spec, vnode.text);
      if (this.text === vnode.text) {
          return res;
      } else {
        setTextContent(this.result, vnode.text, this.spec.document);
        return res;
      }
    } else {
      this.halt();
      return buildVDom(this.spec, vnode);
    }
  }

  halt() {
    removeChild(this.result, parentNode(this.result, this.spec.document), this.spec.document);
  }
}

export function buildText<A, W>(spec: VDomSpec<A, W>, text: string): Machine<VDom<A, W>, Node> {
  let node = createTextNode(text, spec.document);
  return new TextMachine(node, spec, text);
}

class ElementMachine<A, W> implements Machine<VDom<A, W>, Node> {
  constructor(
    readonly result: Node,
    private spec: VDomSpec<A, W>,
    private attr: Machine<A, void>,
    private elem: ElemSpec<A>,
    private steps: Machine<VDom<A, W>, Node>[]
    ) {
  }

  step(vnode: VDom<A, W>): Machine<VDom<A, W>, Node> {
    if (vnode.tag === VDomType.VGRAFT) {
      return this.step(runGraft(vnode));
    } else if (vnode.tag === VDomType.VELEM && eqElemSpec(this.elem, vnode.elem)) {
      if (this.steps.length === 0 && vnode.childs.length === 0) {
        let attr_ = this.attr.step(vnode.elem.attrs);
        return new ElementMachine(
          this.result,
          this.spec,
          attr_,
          vnode.elem,
          this.steps
        );
      } else {
        let nsteps: Array<Machine<VDom<A, W>, Node>> = [];
        let l1 = this.steps.length;
        let l2 = vnode.childs.length;
        let i = 0;

        while (true) {
          if (i < l1) {
            if (i < l2) {
              let st = this.steps[i].step(vnode.childs[i]);
              insertChildIx(i, st.result, this.result, this.spec.document);
              nsteps.push(st);
            } else {
              this.steps[i].halt();
            }
          } else if (i < l2) {
            let st = buildVDom(this.spec, vnode.childs[i]);
            insertChildIx(i, st.result, this.result, this.spec.document);
            nsteps.push(st);
          } else {
            break;
          }
          i++;
        }

        let nattr = this.attr.step(vnode.elem.attrs);
        return new ElementMachine(
          this.result,
          this.spec,
          nattr,
          vnode.elem,
          nsteps
        );
      }
    } else {
      this.halt();
      return buildVDom(this.spec, vnode);
    }
  }

  halt() {
    removeChild(this.result, parentNode(this.result, this.spec.document), this.spec.document);
    for (let i = 0, len = this.steps.length; i < len; i++) {
      this.steps[i].halt();
    }

    this.attr.halt();
  }
}

export function buildElem<A, W>(
  spec: VDomSpec<A, W>,
  elem: ElemSpec<A>,
  ch1: VDom<A, W>[]
): Machine<VDom<A, W>, Node> {
  let node = createElement(elem.ns, elem.tag, spec.document) as Node;
  let steps = ch1.map((vdom, ix) => {
    let step = buildVDom(spec, vdom);
    insertChildIx(ix, step.result, node, spec.document);
    return step;
  });
  let attrs = spec.buildAttributes(node as Element, elem.attrs);

  return new ElementMachine(node, spec, attrs, elem, steps);
}

class KeyElementMachine<A, W> implements Machine<VDom<A, W>, Node> {
  constructor(
    readonly result: Node,
    private spec: VDomSpec<A, W>,
    private attr: Machine<A, void>,
    private elem: ElemSpec<A>,
    private steps: StrMap<Machine<VDom<A, W>, Node>>,
    private len: number
  ) {
  }

  step(vnode: VDom<A, W>): Machine<VDom<A, W>, Node> {
    if (vnode.tag === VDomType.VGRAFT) {
      return this.step(runGraft(vnode));
    } else if (vnode.tag === VDomType.VELEMKEYED && eqElemSpec(this.elem, vnode.elem)) {
      let len2 = vnode.childs.length;
      if (this.len === 0 && len2 === 0) {
        let nattrs = this.attr.step(vnode.elem.attrs);
        return new KeyElementMachine(
          this.result,
          this.spec,
          nattrs,
          vnode.elem,
          this.steps,
          0
        );
      } else {
        let sm2:  StrMap<Machine<VDom<A, W>, Node>> = emptyStrMap();
        for (let i = 0, len = vnode.childs.length; i < len; i++) {
          let a = vnode.childs[i];
          let k = a.key;
          if (this.steps[k] != null) {
            let st = this.steps[k].step(a.vdom);
            this.spec.document.insertChildIx(i, st.result, this.result);
            sm2[k] = st;
          } else {
            let st = buildVDom(this.spec, a.vdom);
            this.spec.document.insertChildIx(i, st.result, this.result);
            sm2[k] = st;
          }
        }
        for (let k2 in this.steps) {
          if (k2 in sm2) continue;
          this.steps[k2].halt();
        }
        let nattr = this.attr.step(vnode.elem.attrs);
        return new KeyElementMachine(
          this.result,
          this.spec,
          nattr,
          vnode.elem,
          sm2,
          len2
        );
      }
    } else {
      this.halt();
      return buildVDom(this.spec, vnode);
    }
  }

  halt() {
    removeChild(this.result, parentNode(this.result, this.spec.document), this.spec.document);
    let ks = Object.keys(this.steps);
    for (let i = 0, len = ks.length; i < len; i++) {
      this.steps[ks[i]].halt();
    }
    this.attr.halt();
  }
}

export function buildKeyed<A, W>(
  spec: VDomSpec<A, W>,
  elem: ElemSpec<A>,
  ch1: KeyVDom<A, W>[]
): Machine<VDom<A, W>, Node> {
  let node = createElement(elem.ns, elem.tag, spec.document) as Node;
  let steps: StrMap<Machine<VDom<A, W>, Node>> = strMapWithIx(ch1, getKeyVdom, onChild, { spec, node });
  let attrs = spec.buildAttributes(node as Element, elem.attrs);
  return new KeyElementMachine(
    node as Node,
    spec,
    attrs,
    elem,
    steps,
    ch1.length
  );
}

class WidgetMachine<A, W> implements Machine<VDom<A, W>, Node> {
  constructor(
    readonly result: Node,
    private spec: VDomSpec<A, W>,
    private prev: Machine<W, Node>) {
  }

  step(vnode: VDom<A, W>): Machine<VDom<A, W>, Node> {
    if (vnode.tag === VDomType.VGRAFT) {
      return this.step(runGraft(vnode));
    } else if (vnode.tag === VDomType.VWIDGET) {
      let next = this.prev.step(vnode.widget);
      return new WidgetMachine(next.result, this.spec, next);
    } else {
      this.halt();
      return buildVDom(this.spec, vnode);
    }
  }

  halt() {
    this.prev.halt();
  }
}

export function buildWidget<A, W>(spec: VDomSpec<A, W>, w: W): Machine<VDom<A, W>, Node> {
  let res = spec.buildWidget(spec, w);
  return new WidgetMachine(res.result, spec, res);
}

function createTextNode(s: string, doc: DocumentSpec): Node {
  return doc.createTextNode(s);
}

function parentNode(node: Node, doc: DocumentSpec): Node | null {
  return doc.parentNode(node);
}

function setTextContent(node: Node, text: string, doc: DocumentSpec): void {
  doc.setTextContent(node, text);
}

function createElement(ns: string | undefined, name: string, doc: DocumentSpec): Element {
  const hashIdx = name.indexOf('#');
  const dotIdx = name.indexOf('.', hashIdx);
  const hash = hashIdx > 0 ? hashIdx : name.length;
  const dot = dotIdx > 0 ? dotIdx : name.length;
  const tag = hashIdx !== -1 || dotIdx !== -1 ? name.slice(0, Math.min(hash, dot)) : name;
  const elem = doc.createElement(ns, tag);

  if (hash < dot) elem.setAttribute('id', name.slice(hash + 1, dot));
  if (dotIdx > 0) elem.setAttribute('class', name.slice(dot + 1).replace(/\./g, ' '));

  return elem;
}

function insertChildIx(ix: number, child: Node, parent: Node, doc: DocumentSpec) {
  return doc.insertChildIx(ix, child, parent);
}

function removeChild(child: Node, parent: Node | null, doc: DocumentSpec) {
  doc.removeChild(child, parent);
}

function eqElemSpec<A>(a: ElemSpec<A>, b: ElemSpec<A>) {
  return a.tag === b.tag && a.ns === b.ns;
}

function strMapWithIx<A, B, C>(
  xs: A[],
  f: (a: A) => string,
  g: (this: C, s: string, ix: number, el: A) => B,
  ctx?: C
): StrMap<B> {
  let sm: StrMap<B> = emptyStrMap();
  for (let i = 0, len = xs.length; i < len; i++) {
    let a = xs[i];
    let k = f(a);
    sm[k] = g.call(ctx, k, i, a);
  }

  return sm;
}

function onChild<A, W>(
  this: { node: Node, spec: VDomSpec<A, W> },
  k: string,
  ix: number,
  kd: KeyVDom<A, W>
) {
  let res = buildVDom(this.spec, kd.vdom);
  insertChildIx(ix, res.result, this.node, this.spec.document);
  return res;
}
