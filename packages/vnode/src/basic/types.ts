import * as T from '../types';
import { Prop, mapProp } from '../dom/prop';

export type VDom<A> = T.VDom<Prop<A>[], Thunk<A>>;
export type KeyVDom<A> = T.KeyVDom<Prop<A>[], Thunk<A>>;
export type VElem<A> = T.VElem<Prop<A>[], Thunk<A>>;
export type VElemKeyed<A> = T.VElemKeyed<Prop<A>[], Thunk<A>>;

export { Prop } from '../dom/prop';

export interface Thunk<A> {
  mapk: (i: any) => A;
  eq: (a: any, b: any) => boolean;
  id: any;
  state: any;
  render: (state: any) => VDom<any>;
}

export function createThunk<A, B>(
  ident: any,
  eq: (a: A, b: A) => boolean,
  render: (a: A) => VDom<B>,
  state: A,
  mapk: (i: any) => A
): Thunk<A> {
  return {
    mapk: mapk
    , id: ident
    , eq
    , state
    , render
  };
}

export function mapVDom<A, B>(f: (a: A) => B, vnode: VDom<A>): VDom<B> {
  return T.bimapVDom(x => x.map(p => mapProp(f, p)), w => mapThunk(f, w), vnode);
}

export function mapThunk<A, B>(f: (a: A) => B, thunk: Thunk<A>): Thunk<B> {
  return createThunk(thunk.id, thunk.eq, thunk.render, thunk.state, T.o(f, thunk.mapk));
}

export function runThunk<A>(thunk: Thunk<A>): VDom<A> {
  return mapVDom(thunk.mapk, thunk.render(thunk.state));
}
