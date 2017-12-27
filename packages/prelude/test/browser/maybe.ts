import 'mocha';
import * as jsv from 'jsverify';

import * as M from '../../src/maybe';
import { deepEq } from '../../src/eq';
import { id } from './utils';

function maybeShow<A>(a: jsv.Show<A> | undefined): (m: M.Maybe<A>) => string {
  return m => M.isJust(m) ? `Just(${a == null ? 'unknown' : a(m.value)})` : 'Nothing'
}

function maybeGen<A>(arb: jsv.Arbitrary<A>): (n: number) => M.Maybe<A> {
  return n => n % 2 === 0 ? M.just(arb.generator(n)) : M.nothing;
}

function maybeShrink<A>(arb: jsv.Arbitrary<A>): (m: M.Maybe<A>) => M.Maybe<A>[] {
  return m =>
    M.isJust(m) && arb.shrink != null
      ? [M.nothing as M.Maybe<A>].concat(arb.shrink(m.value).map(M.just))
      : []
}

function maybeArb<A>(arb: jsv.Arbitrary<A>): jsv.Arbitrary<M.Maybe<A>> {
  return jsv.bless({
    generator: jsv.generator.bless(maybeGen(arb)),
    show: maybeShow(arb.show),
    shrink: jsv.shrink.bless(maybeShrink(arb))
  })
}

describe('Prelude Maybe', () => {
  describe('mapMaybe', () => {
    it('functor identity', () =>
      jsv.assert(
        jsv.forall(
          maybeArb(jsv.nat),
          t => deepEq(t, M.mapMaybe(id, t))
        )
      )
    );

    it('functor compose', () => {
      jsv.assert(
        jsv.forall(
          maybeArb(jsv.nat),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(M.mapMaybe(x => f(g(x)), t), M.mapMaybe(f, M.mapMaybe(g, t)))
        )
      )
    });
  });
});
