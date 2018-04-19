import { VNode, VNodeData, thunk } from './vnode';
import * as H from 'snabbdom/h';

export { VNode } from './vnode';
export type VNodes<A> = Array<VNode<A>>;
export type VNodeChildElement<A> = VNode<A> | string | number | undefined | null;
export type ArrayOrElement<T> = T | T[];
export type VNodeChildren<A> = ArrayOrElement<VNodeChildElement<A>>;

export function h<A>(sel: string): VNode<A>;
export function h<A>(sel: string, data: VNodeData<A>): VNode<A>;
export function h<A>(sel: string, children: VNodeChildren<A>): VNode<A>;
export function h<A>(sel: string, data: VNodeData<A>, children: VNodeChildren<A>): VNode<A>;
export function h<A>(sel: any, b?: any, c?: any): VNode<A> {
  return H.h(sel, b, c) as VNode<A>;
}

export function lazy<S, A>(
  sel: string, st: S, fn: (_: S) => VNode<A>, key?: string | undefined
): VNode<A> {
  return thunk(sel, key, fn, [st]);
}

export function lazy2<S, T, A>(
  sel: string, a: S, b: T,
  fn: (a: S, b: T) => VNode<A>, key?: string | undefined
): VNode<A> {
  return thunk(sel, key, fn, [a, b]);
}

export function lazy3<S, T, U, A>(
  sel: string, a: S, b: T, c: U,
  fn: (a: S, b: T, c: U) => VNode<A>, key?: string | undefined
): VNode<A> {
  return thunk(sel, key, fn, [a, b, c]);
}

export function lazy4<S, T, U, V, A>(
  sel: string, a: S, b: T, c: U, d: V,
  fn: (a: S, b: T, c: U, d: V) => VNode<A>, key?: string | undefined
): VNode<A> {
  return thunk(sel, key, fn, [a, b, c, d]);
}
