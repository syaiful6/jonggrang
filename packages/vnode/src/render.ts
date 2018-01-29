import * as V from './vnode';
import { DOMAPI } from './dom-util';

type NodeEx = Node & {
  vnodes: V.VNode<any>[] | null;
}

const NAMESPACE = {
  svg: "http://www.w3.org/2000/svg",
  math: "http://www.w3.org/1998/Math/MathML"
}

export function unsafeEqThunk<A>(t1: V.Thunk<A>, t2: V.Thunk<A>): boolean {
  return t1.eq === t2.eq && unsafeEqThunkId(t1.id, t2.id) && t2.eq(t1.state, t2.state);
}

export function unsafeEqThunkId(a: any, b: any): boolean {
  return typeof a === typeof b && a === b;
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
  ): Node {
    if (vnode.text != undefined) {
      return createText(parent, vnode, nextSibling);
    }
    let tag = vnode.tag;
    if (typeof tag === 'string') {
      return createElement(parent, vnode, nextSibling, ns);
    } else if (V.isThunk(tag)) {
      vnode.instance = V.runThunk(tag);
      vnode.dom = createNode(parent, vnode.instance, nextSibling, ns);
      insertNode(parent, vnode.dom, nextSibling);
      return vnode.dom;
    } else {
      return createNode(parent, V.runGraft(tag), nextSibling, ns);
    }
  }

  function createText(parent: Node, vnode: V.VNode<A>, nextSibling: Node | null): Node {
    vnode.dom = api.createTextNode(vnode.text as string);
    insertNode(parent, vnode.dom, nextSibling);
    return vnode.dom;
  }

  function createElement(parent: Node, vnode: V.VNode<A>,
    nextSibling: Node | null, ns: string | undefined | null
  ): Node {
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
    return elm;
  }

  function insertNode(parent: Node, dom: Node, nextSibling: Node | null) {
    if (nextSibling) {
      api.insertBefore(parent, dom, nextSibling);
    } else {
      api.appendChild(parent, dom);
    }
  }

  function updateNodes(
    parent: Node, old: V.VNode<A>[] | null, vnodes: V.VNode<A>[],
    nextSibling: Node | null, ns: string | undefined | null
  ) {
    if (old === vnodes) {
      return;
    } else if (old == null) {
      createNodes(parent, vnodes, 0, vnodes.length, nextSibling, ns);
    } else {
      let start = 0, commonLength = Math.min(old.length, vnodes.length), originalOldLength = old.length;
      let isUnkeyed = false;
      for (; start < commonLength; start++) {
        if (old[start] != null && vnodes[start] != null) {
          if (old[start].key == null && vnodes[start].key == null) {
            isUnkeyed = true;
          }
          break;
        }
      }
      if (isUnkeyed && originalOldLength === vnodes.length) {
        for (start = 0; start < originalOldLength; start++) {
          if (old[start] === vnodes[start] || old[start] == null && vnodes[start] == null) continue;
          else if (old[start] == null) createNode(parent, vnodes[start], getNextSibling(old, start + 1, originalOldLength, nextSibling), ns)
          else if (vnodes[start] == null) removeNodes(old, start, start + 1);
          else updateNode(parent, old[start], vnodes[start], getNextSibling(old, start + 1, originalOldLength, nextSibling), ns)
        }
        return;
      }
    }
  }

  function updateNode(
    parent: Node, old: V.VNode<A>, vnode: V.VNode<A>,
    nextSibling: Node | null, ns: string | undefined | null
  ): void {
    let oldtag = old.tag, tag = vnode.tag;
    if (V.isGraft(oldtag)) {
      return updateNode(parent, V.runGraft(oldtag), vnode, nextSibling, ns);
    }
    if (V.isGraft(tag)) {
      return updateNode(parent, old, V.runGraft(tag), nextSibling, ns);
    }
    if (V.isThunk(oldtag) && V.isThunk(tag)) {
      if (unsafeEqThunk(oldtag, tag)) {
        return;
      }
      return updateNode(parent, old.instance as V.VNode<A>, V.runThunk(tag), nextSibling, ns);
    } else if (V.isThunk(oldtag)) {
      removeNode(old.instance as V.VNode<A>);
      createNode(parent, vnode, nextSibling, ns);
    } else if (V.isThunk(tag)) {
      removeNode(old);
      createNode(parent, vnode, nextSibling, ns);
    } else if (oldtag === tag) {
      vnode.events = old.events;
      const elm = vnode.dom = (old.dom as Node);
      let oldCh = old.children;
      let ch = vnode.children;
      updateVNodeData(vnode, old.data, vnode.data, ns);
      if (vnode.text == null) {
        if (oldCh != null && ch != null) {
          if (oldCh !== ch) updateNodes(elm, oldCh as V.VNode<A>[], ch as V.VNode<A>[], null, ns);
        } else if (ch != null) {
          if (old.text != null) api.setTextContent(elm, '');
          createNodes(elm, ch as V.VNode<A>[], 0, ch.length, null, ns);
        } else if (oldCh != null) {
          removeNodes(oldCh as V.VNode<A>[], 0, oldCh.length);
        } else if (old.text != null) {
          api.setTextContent(elm, '');
        }
      } else if (old.text !== vnode.text) {
        api.setTextContent(elm, vnode.text as string);
      }
    }
  }

  function removeNodes(vnodes: V.VNode<A>[], start: number, end: number) {
    let vnode: V.VNode<A>;
    for (var i = start; i < end; i++) {
      vnode = vnodes[i];
      if (vnode != null) {
        removeNode(vnode);
      }
    }
  }

  function removeNode(vnode: V.VNode<A>) {
    const data = vnode.data;
    if (data.ref != null) {
      let t = V.runEvHandler(data.ref, { tag: 'removed', value: vnode.dom as Node });
      if (t != null) {
        emit(t);
      }
    }
    removeNodeFromDom(vnode.dom as Node);
  }

  function removeNodeFromDom(node: Node) {
    let parent = api.parentNode(node);
    if (parent != null) api.removeChild(parent, node);
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

  function updateVNodeData(
    vnode: V.VNode<A>,
    old: V.VNodeData<A> | undefined,
    data: V.VNodeData<A> | undefined,
    ns: string | undefined | null
  ) {
    if (old == null) {
      return setVNodeData(vnode, data || {}, ns);
    }
    if (data == null && old != null) {
      return removeVNodeData(vnode, old, ns);
    }
    if (data && data.on != null) {
      for (let key in data.on) {
        updateEventListener(vnode, key, data.on[key]);
      }
    }
    if (data && data.props != null) {

    }
  }

  function removeVNodeData(vnode: V.VNode<A>, old: V.VNodeData<A>, ns: string | null | undefined) {
    let key: any;
    let elm = vnode.dom;
    if (old.on != null) {
      for (let key in old.on) {
        updateEventListener(vnode, key, null);
      }
    }
    if (old.props != null) {
      for (key in old.props) {
        if (typeof (elm as any)[key] === 'string') {
          (elm as any)[key] = '';
        } else {
          (elm as any)[key] = undefined;
        }
      }
    }
    if (old.attrs != null) {
      for (key in old.attrs) {
        if (ns != null) {
          (elm as Element).removeAttributeNS(ns, key);
        } else {
          (elm as Element).removeAttribute(key);
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
        }
        vnode.events[key] = lis;
      } else {
        if (vnode.events[key] != null) {
          (vnode.dom as Node).removeEventListener(key, vnode.events, false);
        }
        (vnode.events as any)[key] = undefined
      }
    } else if (lis != null && (typeof lis === "function" || typeof lis === "object")) {
      vnode.events = new V.EventDict(emit);
      (vnode.dom as Node).addEventListener(key, vnode.events, false);
      vnode.events[key] = lis;
    }
  }

  function getNextSibling(
    vnodes: V.VNode<A>[], i: number, limit: number,
    nextSibling: Node | null
  ): Node | null {
    for (; i < limit; i++) {
      if (vnodes[i] != null && vnodes[i].dom != null) return vnodes[i].dom as Node;
    }
    return nextSibling;
  }

  return function patch(dom: Node, vnodes: V.VNode<A> | V.VNode<A>[]) {
    if ((dom as NodeEx).vnodes == null) dom.textContent = "";
    if (!Array.isArray(vnodes)) vnodes = [vnodes];
    const namespace = dom.namespaceURI;
    updateNodes(dom, (dom as NodeEx).vnodes, vnodes, null, namespace === "http://www.w3.org/1999/xhtml" ? undefined : namespace);
    (dom as NodeEx).vnodes = vnodes;
  }
}
