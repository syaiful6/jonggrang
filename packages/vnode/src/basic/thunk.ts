import { id, Machine, } from '../types';
import { VDomSpec, buildVDom } from '../dom';
import { VDom, Thunk, Prop, createThunk, runThunk } from './types';


export { Thunk } from './types';

/**
 * Create a thunk by suplying `identifier`, `equality function`, `render function`
 * and `state`.
 *
 * @param ident
 * @param eq
 * @param render
 * @param state
 */
export function thunk<A, B>(
  ident: any,
  state: A,
  eq: (a: A, b: A) => boolean,
  render: (a: A) => VDom<B>
): Thunk<B> {
  return createThunk(ident, state, eq, render, id);
}

/**
 * Create a Thunk by using render function as `identifier` of Thunk.
 */
export function thunked<A, B>(
  state: A,
  eq: (a: A, b: A) => boolean,
  render: (a: A) => VDom<B>
): Thunk<B> {
  return thunk(render, state, eq, render);
}

/**
 * Create a thunk just by providing render function and state, the eqFn is set to `unsafeERefEq`
 *
 * @param render
 * @param a
 */
export function thunk1<A, B>(a: A, render: (a: A) => VDom<B>): Thunk<B> {
  return thunked(a, unsafeERefEq, render);
}

export function thunk2<A, B, I>(a: A, b: B, render: (a: A, b: B) => VDom<I>): Thunk<I> {
  return thunk(render, {_0: a, _1: b }, unsafeEqThunk2, r => render(r._0, r._1));
}

export function thunk3<A, B, C, I>(a: A, b: B, c: C, render: (a: A, b: B, c: C) => VDom<I>): Thunk<I> {
  return thunk(render, {_0: a, _1: b, _2: c }, unsafeEqThunk3,r => render(r._0, r._1, r._2));
}

class ThunkMachine<A> implements Machine<Thunk<A>, Node> {
  constructor(
    public result: Node,
    private spec: VDomSpec<Prop<A>[], Thunk<A>>,
    private prev: Machine<VDom<A>, Node>,
    private thunk: Thunk<A>
  ) {
  }

  step(thunk: Thunk<A>): Machine<Thunk<A>, Node> {
    if (unsafeEqThunk(this.thunk, thunk)) {
      return new ThunkMachine(this.prev.result, this.spec, this.prev, this.thunk);
    }
    let next = this.prev.step(runThunk(thunk));
    return new ThunkMachine(next.result, this.spec, next, thunk);
  }

  halt() {
    this.prev.halt();
  }
}

/**
 * Start A VNode Machine that build Thunk to VNode.
 * @param spec
 * @param t
 */
export function buildThunk<A>(
  spec: VDomSpec<Prop<A>[], Thunk<A>>,
  t: Thunk<A>
): Machine<Thunk<A>, Node> {
  let res = buildVDom(spec, runThunk(t));
  return new ThunkMachine(res.result, spec, res, t);
}

// -- [ Utility Function for working with Thunk ] ------------------------------

export function unsafeEqThunk<A>(t1: Thunk<A>, t2: Thunk<A>): boolean {
  return t1.eq === t2.eq && unsafeEqThunkId(t1.id, t2.id) && t2.eq(t1.state, t2.state);
}

export function unsafeEqThunkId(a: any, b: any): boolean {
  return typeof a === typeof b && a === b;
}

export function unsafeERefEq(a: any, b: any) {
  return a === b;
}

function unsafeEqThunk2<A, B>(a: { _0: A, _1: B }, b: { _0: A, _1: B }) {
  return a._0 === b._0 && a._1 === b._1;
}

function unsafeEqThunk3<A, B, C>(a: { _0: A, _1: B, _2: C }, b: { _0: A, _1: B, _2: C }) {
  return a._0 === b._0 && a._1 === b._1 && a._2 === b._2;
}
