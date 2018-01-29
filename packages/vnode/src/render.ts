import * as V from './vnode';
import { DOMAPI } from './dom-util';

type NodeEx = Node & {
  vnodes: V.VNode<any>[] | null;
}

const NAMESPACE = {
  svg: "http://www.w3.org/2000/svg",
  math: "http://www.w3.org/1998/Math/MathML"
}

export function init<A>(api: DOMAPI, emit: (_: A) => void) {
  function getNameSpace(vnode: V.VNode<A>): string | undefined {
    return vnode.data != null && vnode.data.ns || NAMESPACE[vnode.tag as string];
  }

  function createNodes(
    parent: Node, vnodes: V.VNode<A>[],
    start: number, end: number,
    nextSibling: Node | null, ns: string | undefined | null
  ) {
    let vnode: V.VNode<A>;
    for (let i = start; i < end; i++) {
      vnode = vnodes[i];
      if (vnode != null) {
        createNode(parent, vnode, nextSibling, ns);
      }
    }
  }

  function createNode(
    parent: Node, vnode: V.VNode<A>,
    nextSibling: Node | null, ns: string | undefined | null
  ) {
    if (vnode.text != undefined) {
      createText(parent, vnode, nextSibling)
    }
    let tag = vnode.tag;
    if (typeof tag === 'string') {
      createElement(parent, vnode, nextSibling, ns);
    } else if (V.isThunk(tag)) {
      createNode(parent, V.runThunk(tag), nextSibling, ns);
    } else {
      createNode(parent, V.runGraft(tag), nextSibling, ns);
    }
  }

  function createText(parent: Node, vnode: V.VNode<A>, nextSibling: Node | null) {
    vnode.dom = api.createTextNode(vnode.text as string);
    insertNode(parent, vnode.dom, nextSibling);
    return vnode.dom;
  }

  function createElement(parent: Node, vnode: V.VNode<A>,
    nextSibling: Node | null, ns: string | undefined | null
  ) {
    const sel = vnode.tag as string;
    const hashIdx = sel.indexOf('#');
    const dotIdx = sel.indexOf('.', hashIdx);
    const hash = hashIdx > 0 ? hashIdx : sel.length;
    const dot = dotIdx > 0 ? dotIdx : sel.length;
    const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
    ns = getNameSpace(vnode) || ns;
    const elm = ns ? api.createElementNS(ns, tag) : api.createElement(tag);
    if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot));
    if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
    vnode.dom = elm;
    //
    const data = vnode.data;
    if (data != null) {
      setVNodeData(vnode, data, ns);
    }
    insertNode(parent, elm, nextSibling);
    if (Array.isArray(vnode.children)) {
      const children = vnode.children as V.VNode<A>[];
      createNodes(elm, children, 0, children.length, null, ns);
    } else if (vnode.text != null) {
      api.appendChild(elm, api.createTextNode(vnode.text));
    }
    if (data.ref != null) {
      const t = V.runEvHandler(data.ref, { tag: 'created', value: elm });
      if (t != null) {
        emit(t);
      }
    }
  }

  function insertNode(parent: Node, dom: Node, nextSibling: Node | null) {
    if (nextSibling) {
      api.insertBefore(parent, dom, nextSibling);
    } else {
      api.appendChild(parent, dom);
    }
  }

  function updateNodes(parent: Node, old: V.VNode<A>[] | null, vnodes: V.VNode<A>[], nextSibling: Node | null, ns: string | undefined | null) {
    if (old === vnodes) {
      return;
    } else if (old == null) {
      createNodes(parent, vnodes, 0, vnodes.length, nextSibling, ns);
    } else {

    }
  }

  function setVNodeData(vnode: V.VNode<A>, data: V.VNodeData<A>, ns: string | undefined | null) {
    let key: any;
    if (data.on != null) {
      for (key in data.on) {
        updateEventListener(vnode, key, data.on[key]);
      }
    }
    const dom = vnode.dom as Node;
    if (data.props != null) {
      for (key in data.props) {
        (dom as any)[key] = data.props[key];
      }
    }
    if (data.attrs != null) {
      for (key in data.attrs) {
        if (ns != null) {
          (dom as Element).setAttributeNS(ns, key, data.attrs[key] as any);
        } else {
          (dom as Element).setAttribute(key, data.attrs[key] as any);
        }
      }
    }
  }

  function updateEventListener(vnode: V.VNode<A>, key: string, lis: V.HandlerFnOrObject<Event, A> | null) {
    if (vnode.events != null) {
      if (vnode.events[key] === lis) return;
      if (lis != null && (typeof lis === "function" || typeof lis === "object")) {
        if (vnode.events[key] == null) {
          (vnode.dom as Node).addEventListener(key, vnode.events, false);
          vnode.events[key] = lis;
        } else {
          if (vnode.events[key] != null) {
            (vnode.dom as Node).removeEventListener(key, vnode.events, false);
          }
          (vnode.events as any)[key] = undefined
        }
      }
    } else if (lis != null && (typeof lis === "function" || typeof lis === "object")) {
      vnode.events = new V.EventDict(emit);
      (vnode.dom as Node).addEventListener(key, vnode.events, false);
      vnode.events[key] = lis;
    }
  }

  return function patch(dom: Node, vnodes: V.VNode<A> | V.VNode<A>[]) {
    if ((dom as NodeEx).vnodes == null) dom.textContent = "";
    if (!Array.isArray(vnodes)) vnodes = [vnodes];
    const namespace = dom.namespaceURI;
    updateNodes(dom, (dom as NodeEx).vnodes, vnodes, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace);
    (dom as NodeEx).vnodes = vnodes;
  }
}
