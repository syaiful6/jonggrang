import { assign } from './utils';

export interface VNodeData<A> {
  on?: { [k: string]: HandlerFnOrObject<Event, A> };
  ref?: HandlerFnOrObject<ElemRef<Element>, A>;
  props?: Record<string, any>;
  attrs?: Record<string, string | number | boolean>;
  ns?: string;
}

export interface HandlerFn<E, A> {
  (e: E): A | void;
}

export interface HandlerObject<E, A> {
  handleEvent(e: E): A | void;
}

export type HandlerFnOrObject<E, A> = HandlerFn<E, A> | HandlerObject<E, A>;

export interface ElemRef<A> {
  tag: 'created' | 'removed';
  value: A;
}

export class EventDict {
  [key: string]: HandlerFnOrObject<Event, any>

  constructor(public emit: (a: any) => void) {
  }

  handleEvent(ev: Event) {
    let handler = this[ev.type];
    let me = runEvHandler(handler, ev);
    if (me != null) {
      this.emit(me);
    }
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

export interface VNode<A> {
  tag: Thunk<A> | Graft<A> | string;
  key: string | number | undefined;
  text: string | undefined;
  dom: Node | undefined;
  events: EventDict | undefined;
  children: Array<VNode<A> | string> | undefined;
  data: VNodeData<A>;
}

export interface Thunk<A> {
  mapk: (i: any) => A;
  eq: (a: any, b: any) => boolean;
  id: any;
  state: any;
  render: (state: any) => VNode<any>;
}

export interface Graft<A> {
  f(x: any): A;
  vnode: VNode<any>;
}

export function vnode<A>(
  tag: Thunk<A> | Graft<A> | string,
  key: string | number | undefined,
  data: any | undefined,
  children: Array<VNode<A> | string> | undefined,
  text: string | undefined,
  dom: Element | Text | undefined
): VNode<A> {
  return { tag, key, data, children, text, dom, events: undefined };
}

export function runEvHandler<E, A>(handler: HandlerFnOrObject<E, A>, event: E): A | void {
  if (typeof handler === 'function') {
    return handler(event);
  } else if (handler && typeof handler.handleEvent === 'function') {
    return handler.handleEvent(event);
  }
}

export function mapVnode<A, B>(f: (_: A) => B, v: VNode<A>): VNode<B> {
  if (typeof v.tag === 'string' || isThunk(v.tag)) {
    return vnode({ f, vnode: v }, undefined, undefined, undefined, undefined, undefined);
  } else {
    return vnode({ f: o(f, v.tag.f), vnode: v.tag.vnode }, undefined, undefined, undefined, undefined, undefined)
  }
}

export function runGraft<A>(graft: Graft<A>): VNode<A> {
  function go(v: VNode<A>): VNode<A> {
    if (typeof v.tag === 'string') {
      return vnode(v.tag, v.key, mapVNodeData(graft.f, v.data),
        v.children != null ? v.children.map(go) : undefined, v.text, v.dom as Element);
    } else if (isThunk(v.tag)) {
      return vnode(
        mapThunk(graft.f, v.tag), v.key, v.data,
        v.children != null ? v.children.map(go) : undefined,
        v.text, v.dom as Element
      );
    }
    return vnode({ f: o(graft.f, v.tag.f), vnode: v.tag.vnode }, undefined, undefined, undefined, undefined, undefined)
  }
  return go(graft.vnode);
}

export function mapVNodeData<A, B>(f: (_: A) => B, data: VNodeData<A>) {
  const args: any = assign({}, data);
  if (args.on != null) {
    let on: { [k: string]: HandlerFnOrObject<Event, B> } = {};
    for (let key in args.on) {
      on[key] = pipeEvHandler(args.on[key], f);
    }
    args.on = on;
  }
  if (args.ref != null) {
    args.ref = pipeEvHandler(args.ref, f);
  }
  return args;
}

export function createThunk<A, B>(
  ident: any,
  state: A,
  eq: (a: A, b: A) => boolean,
  render: (a: A) => VNode<B>,
  mapk: (i: any) => A
): Thunk<A> {
  return {
    eq,
    state,
    render,
    mapk: mapk,
    id: ident,
  };
}

export function mapThunk<A, B>(f: (a: A) => B, thunk: Thunk<A>): Thunk<B> {
  return createThunk(thunk.id, thunk.state, thunk.eq, thunk.render, o(f, thunk.mapk));
}

export function runThunk<A>(thunk: Thunk<A>): VNode<A> {
  return mapVnode(thunk.mapk, thunk.render(thunk.state));
}

export function isThunk<A>(v: Thunk<A> | Graft<A> | string): v is Thunk<A> {
  return typeof v !== 'string' && typeof (v as any).render === 'function';
}

export function o<A, B, C>(f: (_: B) => C, g: (_: A) => B) {
  return (x: A) => f(g(x));
}
