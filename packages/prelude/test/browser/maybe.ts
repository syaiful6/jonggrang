import 'mocha';
import * as jsv from 'jsverify';

import * as M from '../../src/maybe';
import { deepEq } from '../../src/eq';
import { id } from './utils';

function maybeShow<A>(a: jsv.Show<A> | undefined): (m: M.Maybe<A>) => string {
  return m => M.isJust(m) ? `Just(${a == null ? 'unknown' : a(m.value)})` : 'Nothing';
}

function maybeGen<A>(arb: jsv.Arbitrary<A>): (n: number) => M.Maybe<A> {
  return n => n % 2 === 0 ? M.just(arb.generator(n)) : M.nothing;
}

function maybeShrink<A>(arb: jsv.Arbitrary<A>): (m: M.Maybe<A>) => M.Maybe<A>[] {
  return m =>
    M.isJust(m) && arb.shrink != null
      ? [M.nothing as M.Maybe<A>].concat(arb.shrink(m.value).map(M.just))
      : [];
}

function maybeArb<A>(arb: jsv.Arbitrary<A>): jsv.Arbitrary<M.Maybe<A>> {
  return jsv.bless({
    generator: jsv.generator.bless(maybeGen(arb)),
    show: maybeShow(arb.show),
    shrink: jsv.shrink.bless(maybeShrink(arb))
  });
}

describe('Prelude Maybe', () => {
  describe('fromMaybe', () => {
    it('return the default value if Nothing passed', () =>
      jsv.assert(
        jsv.forall(
          jsv.json,
          a => M.fromMaybe(a, M.nothing) === a
        )
      )
    );

    it('return the value inside Just', () =>
      jsv.assert(
        jsv.forall(
          jsv.json,
          jsv.json,
          (a, b) => M.fromMaybe(a, M.just(b)) === b
        )
      )
    );
  });

  describe('mapMaybe', () => {
    it('functor identity', () =>
      jsv.assert(
        jsv.forall(
          maybeArb(jsv.nat),
          t => deepEq(t, M.mapMaybe(t, id))
        )
      )
    );

    it('functor compose', () => {
      jsv.assert(
        jsv.forall(
          maybeArb(jsv.nat),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(M.mapMaybe(t, x => f(g(x))), M.mapMaybe(M.mapMaybe(t, g), f))
        )
      );
    });
  });

  describe('altMaybe', () => {
    it('associativity', () =>
      jsv.assert(
        jsv.forall(
          maybeArb(jsv.nat),
          maybeArb(jsv.nat),
          maybeArb(jsv.nat),
          (a, b, c) => deepEq(M.altMaybe(M.altMaybe(a, b), c), M.altMaybe(a, M.altMaybe(b, c)))
        )
      )
    );

    it('distributivity', () =>
      jsv.assert(
        jsv.forall(
          maybeArb(jsv.nat),
          maybeArb(jsv.nat),
          jsv.fn(jsv.nat),
          (a, b, f) => deepEq(M.mapMaybe(M.altMaybe(a, b), f), M.altMaybe(M.mapMaybe(a, f), M.mapMaybe(b, f)))
        )
      )
    );
  });

  describe('maybe', () => {
    it('returns default value if the Maybe is Nothing', () =>
      jsv.assert(
        jsv.forall(
          jsv.nat,
          jsv.fn(jsv.nat),
          (a, f) => deepEq(M.maybe(a, f, M.nothing), a)
        )
      )
    );

    it('apply function to value inside Just', () =>
      jsv.assert(
        jsv.forall(
          jsv.nat,
          jsv.nat,
          jsv.fn(jsv.nat),
          (a, b, f) => deepEq(M.maybe(a, f, M.just(b)), f(b))
        )
      )
    );
  });
});
