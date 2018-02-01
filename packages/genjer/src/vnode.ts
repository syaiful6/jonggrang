import * as V from 'snabbdom/vnode';
import * as T from './utils';

export interface VNode<A> extends V.VNode {
  data: VNodeData<A> | undefined;
  children: Array<VNode<A> | string> | undefined;
}

export interface VNodeData<A> extends V.VNodeData {
  events?: ListenerData<A> | undefined;
  cofn?: (_: any) => any; // Coyoneda encoding, use any because we can't properly line up the type
}

/**
 * This is for listener modules, defined here to avoid cyclic deps
 */
export interface HandlerFn<E, A> {
  (e: E): A | void;
}

export interface HandlerObject<E, A> {
  handleEvent(e: E): A | void;
}

export type HandlerFnOrObject<E, A> = HandlerFn<E, A> | HandlerObject<E, A>;

export interface ListenerData<A> {
  [key: string]: HandlerFnOrObject<Event, A>;
}

function isThunk(vnode: VNode<any>): boolean {
  const data = vnode.data;
  return data != null && typeof data.fn === 'function';
}

export function mapVNode<A, B>(f: (_: A) => B, v: VNode<A>): VNode<B> {
  let data = v.data || {};
  if (typeof data.cofn === 'function') {
    return V.vnode(v.sel,
      T.assign({}, data as any, {
        cofn: T.o(f, data.cofn),
        hooks: {
          init: initMapHook,
          prepatch: prepatchMapHook
        }
      }),
      v.children, v.text, v.elm as Element)
  }
  return V.vnode(v.sel,
    T.assign({}, data as any, {
      cofn: f,
      hooks: {
        init: initMapHook,
        prepatch: prepatchMapHook
      }
    }),
    v.children, v.text, v.elm as Element)
}

function initMapHook(vnode: VNode<any>) {
  const cur = vnode.data as VNodeData<any>;
  if (cur.cofn) mutmapVNode(cur.cofn, vnode);
}

function prepatchMapHook(old: VNode<any>, vnode: VNode<any>) {
  initMapHook(vnode);
}

export function mutmapVNode<A, B>(f: (_: A) => B, v: VNode<A>): void {
  let data = v.data || {};
  if (isThunk(v)) {
    v.data = T.set('fn', () => {
      let r:  VNode<A> = (v.data as any).fn.apply(null, (data as any).args);
      mutmapVNode(f, r);
      return r;
    }, data as any);
    return;
  }
  if (typeof data.cofn === 'function') {
    data.cofn = T.o(f, data.cofn);
    return;
  }
  if (data && data.events) {
    let nevents: ListenerData<B> = {};
    for (let key in data.events) {
      nevents[key] = pipeEvHandler(data.events[key], f);
    }
    (v.data as any).events = nevents;
  }
  v.children = v.children != undefined ? v.children.map(c => {
    if (typeof c === 'string') return c;
    mutmapVNode(f, c);
    return c;
  }) : undefined;
}

export function runEvHandler<E, A>(handler: HandlerFnOrObject<E, A>, event: E): A | void {
  if (typeof handler === 'function') {
    return handler(event);
  } else if (handler && typeof handler.handleEvent === 'function') {
    return handler.handleEvent(event);
  }
}

class PipeEventHandler<E, A, B> {
  constructor(
    private listener: HandlerFnOrObject<E, A>,
    private transform: HandlerFnOrObject<A, B>
  ) {
  }

  handleEvent(ev: E): B | void {
    let t = runEvHandler(this.listener, ev);
    if (t != null) {
      return runEvHandler(this.transform, t);
    }
    return t;
  }
}

export function pipeEvHandler<E, A, B>(
  f: HandlerFnOrObject<E, A>,
  g: HandlerFnOrObject<A, B>
): HandlerFnOrObject<E, B> {
  return new PipeEventHandler(f, g);
}
