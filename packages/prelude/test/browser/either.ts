import 'mocha';
import { expect } from 'chai';
import * as jsv from 'jsverify';

import * as E from '../../src/either';
import { deepEq } from '../../src/eq';
import { id } from './utils';


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
    jsv.property('functor identity', eitherArb(jsv.nat, jsv.string), t =>
      deepEq(t, E.mapEither(t, id))
    );

    jsv.property('functor compose', eitherArb(jsv.nat, jsv.string), jsv.fn(jsv.nat),
                 jsv.fn(jsv.nat), (t, f, g) =>
      deepEq(E.mapEither(t, x => f(g(x))), E.mapEither(E.mapEither(t, g), f))
    );

    it('Left value is untouched', () =>
      jsv.assert(
        jsv.forall(
          leftArb(jsv.json),
          jsv.fn(jsv.json),
          (a, f) => deepEq(E.mapEither(a, f), a)
        )
      )
    );
  });

  describe('bimapEither', () => {
    jsv.property('maps the first function over the left value', leftArb(jsv.nat), jsv.fn(jsv.nat),
                 jsv.fn(jsv.nat), (t, f, g) => deepEq(E.bimapEither(t, f, g).value, f(t.value)));

    jsv.property('maps the second function over the right value', rightArb(jsv.nat), jsv.fn(jsv.nat),
                 jsv.fn(jsv.nat), (t, f, g) => deepEq(E.bimapEither(t, g, g), E.mapEither(t, g)));
  });

  describe('lmapEither', () => {
    jsv.property('map the content of Left', leftArb(jsv.nat), jsv.fn(jsv.nat), (a, f) =>
      deepEq(E.lmapEither(a, f), E.left(f(a.value)))
    );

    jsv.property('Right value is untouched', rightArb(jsv.nat), jsv.fn(jsv.nat), (a, f) =>
      deepEq(E.lmapEither(a, f), a)
    );
  });

  describe('either', () => {
    jsv.property('returns the value of a Left after applying the first function arg',
                 leftArb(jsv.nat), jsv.fn(jsv.nat), jsv.fn(jsv.nat), (t, f, g) =>
      deepEq(E.either(f, g, t), f(t.value))
    );

    jsv.property('returns the value of a Right after applying the second function arg',
                 rightArb(jsv.nat), jsv.fn(jsv.nat), jsv.fn(jsv.nat), (t, f, g) =>
      deepEq(E.either(f, g, t), g(t.value))
    );
  });

  describe('altEither choose the right value', () => {
    expect(E.altEither(E.right(0), E.left(1))).to.deep.equals(E.right(0));
    expect(E.altEither(E.left(0), E.right(1))).to.deep.equals(E.right(1));
    expect(E.altEither(E.left(0), E.left(1))).to.deep.equals(E.left(1));
  });

  describe('inspect Either constructor', () => {
    jsv.property('isRight return false if given left', leftArb(jsv.nat), t => E.isRight(t) === false);

    jsv.property('isRight return true if passed right', rightArb(jsv.nat), t => E.isRight(t) === true);

    jsv.property('isLeft return false if given right', rightArb(jsv.nat), t => E.isLeft(t) === false);

    jsv.property('isLeft return true if passed left', leftArb(jsv.nat), t => E.isLeft(t) === true);
  });

  describe('chainEither', () => {
    it('does not call functions if the either is Left', () => {
      let ix = 0;
      function transform(a: string) {
        ix++;
        return E.right('fail');
      }
      let e = E.chainEither(E.left('error'), transform);
      expect(ix).to.be.equals(0);
      expect(e).to.be.deep.equals({ tag: E.EitherType.LEFT, value: 'error' });
    });

    it('sequencing of `Either` values and functions that return Either', () => {
      function transform(a: string) {
        return E.right(a + 'sequencing');
      }
      let t = E.chainEither(E.right('value'), transform);
      expect(t.tag).to.be.equals(E.EitherType.RIGHT);
      expect(t.value).to.be.equals('valuesequencing');
    });
  });
});
