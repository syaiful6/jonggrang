import * as assert from 'assert';
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
    jsv.property('return the default value if Nothing passed', jsv.json, a =>
      M.fromMaybe(a, M.nothing) === a
    );

    jsv.property('return the value inside Just', jsv.json, jsv.json, (a, b) =>
      M.fromMaybe(a, M.just(b)) === b
    );
  });

  describe('fromMaybe_', () => {
    jsv.property('should call the thunk if Nothing passed', jsv.fn(jsv.nat), f =>
      M.fromMaybe_(f as any, M.nothing) === f(void 0)
    );

    jsv.property('should return the value inside just', jsv.nat, jsv.fn(jsv.nat), (a, f) =>
      deepEq(M.fromMaybe_(f as any, M.just(a)), a)
    );
  });

  describe('mapMaybe', () => {
    jsv.property('functor identity', maybeArb(jsv.nat), t => deepEq(t, M.mapMaybe(t, id)));

    jsv.property('functor compose', maybeArb(jsv.nat), jsv.fn(jsv.nat), jsv.fn(jsv.nat), (t, f, g) =>
      deepEq(M.mapMaybe(t, x => f(g(x))), M.mapMaybe(M.mapMaybe(t, g), f))
    );
  });

  describe('altMaybe', () => {
    jsv.property('associativity', maybeArb(jsv.nat), maybeArb(jsv.nat), maybeArb(jsv.nat), (a, b, c) =>
      deepEq(M.altMaybe(M.altMaybe(a, b), c), M.altMaybe(a, M.altMaybe(b, c)))
    );

    jsv.property('distributivity', maybeArb(jsv.nat), maybeArb(jsv.nat), jsv.fn(jsv.nat), (a, b, f) =>
      deepEq(M.mapMaybe(M.altMaybe(a, b), f), M.altMaybe(M.mapMaybe(a, f), M.mapMaybe(b, f)))
    );
  });

  describe('maybe', () => {
    jsv.property('returns default value if the Maybe is Nothing', jsv.nat, jsv.fn(jsv.nat), (a, f) =>
      deepEq(M.maybe(a, f, M.nothing), a)
    );

    jsv.property('apply function to value inside Just', jsv.nat, jsv.nat, jsv.fn(jsv.nat), (a, b, f) =>
      deepEq(M.maybe(a, f, M.just(b)), f(b))
    );
  });

  describe('maybe_', () => {
    jsv.property('call the thunk if the Maybe is Nothing', jsv.fn(jsv.nat), jsv.fn(jsv.nat), (f, g) =>
      deepEq(M.maybe_(f as any, g, M.nothing), f(void 0))
    );

    jsv.property('apply function to value inside Just', jsv.nat, jsv.fn(jsv.nat), jsv.fn(jsv.nat), (a, f, g) =>
      deepEq(M.maybe_(f as any, g, M.just(a)), g(a))
    );
  });

  describe('chainMaybe', () => {
    it('does not call functions if the maybe is Nothing', () => {
      let ix = 0;
      function transform(a: string) {
        ix++;
        return M.just('fail');
      }
      let e = M.chainMaybe(M.nothing, transform);
      assert.equal(ix, 0);
      assert.deepEqual(e, { tag: M.MaybeType.NOTHING });
    });

    it('sequencing of `maybe` values and functions that return maybe', () => {
      function transform(a: string) {
        return M.just(a + 'sequencing');
      }
      let t = M.chainMaybe(M.just('value'), transform);
      assert.equal(t.tag, M.MaybeType.JUST);
      assert.equal((t as any).value, 'valuesequencing');
    });
  });
});
