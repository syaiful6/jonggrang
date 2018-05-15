import 'mocha';
import * as jsv from 'jsverify';
import { deepEq } from '@jonggrang/prelude';

import * as T from '../../src';
import * as Q from './utils';

function tEquals<A>(xs: [A, A]) {
  return deepEq(xs[0], xs[1]);
}

const Par = T.Parallel;

describe('Property Test', () => {
  describe('Task Monad', () => {
    describe('Functor instance', () => {
      jsv.property('identity', jsv.nat, a =>
        Q.toPromise(T.bothPar([T.pure(a).map(x => x), T.pure(a) ]).map(tEquals)));

      jsv.property('composition', jsv.nat, jsv.fn(jsv.nat), jsv.fn(jsv.nat), (a, f, g) =>
        Q.toPromise(T.bothPar([
          T.pure(a).map(x => f(g(x))),
          T.pure(a).map(g).map(f)
        ]).map(tEquals))
      );
    });

    describe('Apply instance', () => {
      jsv.property('composition', jsv.nat, jsv.fn(jsv.nat), jsv.fn(jsv.nat), (a, f, g) =>
        Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/ap'](T.pure(g)['fantasy-land/ap'](
            T.pure(f).map(fn => (gn: (_: number) => number) => (x: number) => fn(gn(x))))),
          T.pure(a)['fantasy-land/ap'](T.pure(g))['fantasy-land/ap'](T.pure(f))
        ]).map(tEquals))
      );
    });

    describe('Applicative instance', () => {
      jsv.property('identity', jsv.nat, a =>
        Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/ap'](T.pure((x: any) => x)),
          T.pure(a)
        ]).map(tEquals))
      );

      jsv.property('homomorphism', jsv.nat, jsv.fn(jsv.nat), (a, f) =>
        Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/ap'](T.pure(f)),
          T.pure(f(a))
        ]).map(tEquals))
      );

      jsv.property('interchange', jsv.nat, jsv.fn(jsv.nat), (a, f) =>
        Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/ap'](T.pure(f)),
          T.pure(f)['fantasy-land/ap'](T.pure((g: (_: number) => number) => g(a)))
        ]).map(tEquals))
      );
    });

    describe('Alt instance', () => {
      jsv.property('associativity', jsv.string, jsv.nat, jsv.nat, (m, a, b) =>
        Q.toPromise(T.bothPar([
          T.raise(new Error(m))['fantasy-land/alt'](T.pure(a))['fantasy-land/alt'](T.pure(b)),
          T.raise(new Error(m))['fantasy-land/alt'](T.pure(a)['fantasy-land/alt'](T.pure(b)))
        ]).map(tEquals))
      );

      jsv.property('distributivity', jsv.string, jsv.nat, jsv.fn(jsv.nat), (m, a, f) =>
        Q.toPromise(T.bothPar([
          T.raise(new Error(m))['fantasy-land/alt'](T.pure(a))['fantasy-land/map'](f),
          T.raise(new Error(m))['fantasy-land/map'](f)['fantasy-land/alt'](T.pure(a)['fantasy-land/map'](f))
        ]).map(tEquals))
      );
    });

    describe('Chain instance', () => {
      jsv.property('associativity', jsv.nat, jsv.fn(jsv.nat), jsv.fn(jsv.nat), (a, f, g) => {
        function fn(a: number) {
          return T.pure(f(a));
        }

        function gn(a: number) {
          return T.pure(g(a));
        }

        return Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/chain'](fn)['fantasy-land/chain'](gn),
          T.pure(a)['fantasy-land/chain'](x => fn(x)['fantasy-land/chain'](gn))
        ]).map(tEquals));
      });

      jsv.property('#chain(f) ignore failure', jsv.string, jsv.nat, jsv.fn(jsv.nat), (m, a, f) => {
        function transform(n: number) {
          return T.pure(f(n));
        }
        const err = new Error(m);

        return Q.toPromise(T.bothPar([
          T.attempt(T.raise(err)['fantasy-land/chain'](transform)),
          T.attempt(T.raise(err))
        ]).map(tEquals));
      });
    });

    describe('Monad instance', () => {
      jsv.property('left identity', jsv.nat, jsv.fn(jsv.nat), (a, f) => {
        function fn(x: number) {
          return T.pure(f(x));
        }

        return Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/chain'](fn),
          fn(a)
        ]).map(tEquals));
      });

      jsv.property('right identity', jsv.nat, a =>
        Q.toPromise(T.bothPar([
          T.pure(a)['fantasy-land/chain'](x => T.pure(x)),
          T.pure(a)
        ]).map(tEquals))
      );
    });

    describe('apFirst()', () => {
      jsv.property('keeping only the result of the first', jsv.nat, jsv.nat, (a, b) =>
        Q.toPromise(T.apFirst(T.pure(a), T.pure(b)).map(x => deepEq(a, x)))
      );
    });

    describe('apSecond()', () => {
      jsv.property('keeping only the result of the second', jsv.nat, jsv.nat, (a, b) =>
        Q.toPromise(T.apSecond(T.pure(a), T.pure(b)).map(x => deepEq(b, x)))
      );
    });
  });

  describe('Parallel applicative', () => {
    describe('Functor instance', () => {
      jsv.property('identity', jsv.nat, a =>
        Q.toPromise(T.bothPar([
          Par.of(a).map(x => x).sequential(),
          Par.of(a).sequential()
        ]).map(tEquals)));

      jsv.property('composition', jsv.nat, jsv.fn(jsv.nat), jsv.fn(jsv.nat), (a, f, g) =>
        Q.toPromise(T.bothPar([
          Par.of(a).map(x => f(g(x))).sequential(),
          Par.of(a).map(g).map(f).sequential()
        ]).map(tEquals))
      );
    });

    describe('Apply instance', () => {
      jsv.property('composition', jsv.nat, jsv.fn(jsv.nat), jsv.fn(jsv.nat), (a, f, g) =>
        Q.toPromise(T.bothPar([
          Par.of(a)['fantasy-land/ap'](Par.of(g)['fantasy-land/ap'](
            Par.of(f).map(fn => (gn: (_: number) => number) => (x: number) => fn(gn(x))))).sequential(),
          Par.of(a)['fantasy-land/ap'](Par.of(g))['fantasy-land/ap'](Par.of(f)).sequential()
        ]).map(tEquals))
      );
    });

    describe('Applicative instance', () => {
      jsv.property('identity', jsv.nat, a =>
        Q.toPromise(T.bothPar([
          Par.of(a)['fantasy-land/ap'](Par.of((x: any) => x)).sequential(),
          Par.of(a).sequential()
        ]).map(tEquals))
      );

      jsv.property('homomorphism', jsv.nat, jsv.fn(jsv.nat), (a, f) =>
        Q.toPromise(T.bothPar([
          Par.of(a)['fantasy-land/ap'](Par.of(f)).sequential(),
          Par.of(f(a)).sequential()
        ]).map(tEquals))
      );

      jsv.property('interchange', jsv.nat, jsv.fn(jsv.nat), (a, f) =>
        Q.toPromise(T.bothPar([
          Par.of(a)['fantasy-land/ap'](Par.of(f)).sequential(),
          Par.of(f)['fantasy-land/ap'](Par.of((g: (_: number) => number) => g(a))).sequential()
        ]).map(tEquals))
      );
    });
  });
});
