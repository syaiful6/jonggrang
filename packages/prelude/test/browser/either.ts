import 'mocha';
import { expect } from 'chai';
import * as jsv from 'jsverify';

import * as E from '../../src/either';
import { deepEq } from '../../src/eq';
import { id } from './utils';
import { deepEqual } from 'assert';


function leftArb<A>(arb: jsv.Arbitrary<A>): jsv.Arbitrary<E.Either<A, any>> {
  return arb.smap(E.left, l => l.value, l => `Left(${l.value}`);
}

function rightArb<A>(arb: jsv.Arbitrary<A>): jsv.Arbitrary<E.Either<any, A>> {
  return arb.smap(E.right, l => l.value, l => `Right(${l.value}`);
}

function eitherArb<A, B>(
  arb1: jsv.Arbitrary<A>,
  arb2: jsv.Arbitrary<B>
): jsv.Arbitrary<E.Either<A, B>> {
  return jsv.oneof([leftArb(arb1), rightArb(arb2)]);
}

describe('Prelude Either', () => {
  describe('mapEither', () => {
    it('functor identity', () =>
      jsv.assert(
        jsv.forall(
          eitherArb(jsv.nat, jsv.string),
          t => deepEq(t, E.mapEither(id, t))
        )
      )
    );

    it('functor compose', () =>
      jsv.assert(
        jsv.forall(
          eitherArb(jsv.nat, jsv.string),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(E.mapEither(x => f(g(x)), t), E.mapEither(f, E.mapEither(g, t)))
        )
      )
    );

    it('Left value is untouched', () =>
      jsv.assert(
        jsv.forall(
          leftArb(jsv.json),
          jsv.fn(jsv.json),
          (a, f) => deepEq(E.mapEither(f, a), a)
        )
      )
    );
  });

  describe('bimapEither', () => {
    it('maps the first function over the left value', () =>
      jsv.assert(
        jsv.forall(
          leftArb(jsv.nat),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(E.bimapEither(f, g, t).value, f(t.value))
        )
      )
    );

    it('maps the second function over the right value', () =>
      jsv.assert(
        jsv.forall(
          rightArb(jsv.nat),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(E.bimapEither(f, g, t), E.mapEither(g, t))
        )
      )
    )
  });

  describe('lmapEither', () => {
    it('map the content of Left', () =>
      jsv.forall(
        leftArb(jsv.nat),
        jsv.fn(jsv.nat),
        (a, f) => deepEqual(E.lmapEither(f, a), E.left(f(a.value)))
      )
    );

    it('Right value is untouched', () =>
      jsv.forall(
        rightArb(jsv.nat),
        jsv.fn(jsv.nat),
        (a, f) => deepEqual(E.lmapEither(f, a), a)
      )
    );
  });

  describe('either', () => {
    it('returns the value of a Left after applying the first function arg', () =>
      jsv.assert(
        jsv.forall(
          leftArb(jsv.nat),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(E.either(f, g, t), f(t.value))
        )
      )
    );

    it('returns the value of a Right after applying the second function arg', () =>
      jsv.assert(
        jsv.forall(
          rightArb(jsv.nat),
          jsv.fn(jsv.nat),
          jsv.fn(jsv.nat),
          (t, f, g) => deepEq(E.either(f, g, t), g(t.value))
        )
      )
    );
  });

  describe('chainEither', () => {
    it('does not call functions if the either is Left', () => {
      let ix = 0;
      function transform(a: string) {
        ix++;
        return E.right('fail');
      }
      let e = E.chainEither(transform, E.left('error'));
      expect(ix).to.be.equals(0);
      expect(e).to.be.deep.equals({ tag: E.EitherType.LEFT, value: 'error' });
    });

    it('sequencing of `Either` values and functions that return Either', () => {
      function transform(a: string) {
        return E.right(a + 'sequencing');
      }
      let t = E.chainEither(transform, E.right('value'));
      expect(t.tag).to.be.equals(E.EitherType.RIGHT);
      expect(t.value).to.be.equals('valuesequencing');
    });
  });
});
