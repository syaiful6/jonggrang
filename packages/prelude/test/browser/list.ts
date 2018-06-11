import * as assert from 'assert';

import { just, nothing, fromMaybe, mapMaybe, Maybe } from '../../src/maybe';
import { left, right, Either } from '../../src/either';
import { deepEq } from '../../src/eq';
import * as L from '../../src/list';


function toString(x: any): string {
  return typeof x.toString === 'function' ? x.toString() : Object.prototype.toString.call(x);
}

function odd(x: number): boolean {
  return (x % 2) !== 0;
}

describe('Prelude list', () => {
  it('singleton should construct an list with a single value', () => {
    assert.deepEqual(L.singleton(1), L.list(1));
    assert.deepEqual(L.singleton('foo'), L.list('foo'));
  });

  it('range should create an inclusive list of integers for the specified start and end', () => {
    assert.deepEqual(L.range(0, 5), L.list(0, 1, 2, 3, 4, 5));
    assert.deepEqual(L.range(2, -3), L.list(2, 1, 0, -1, -2, -3));
    assert.deepEqual(L.range(0, 0), L.singleton(0));
  });

  it('isEmpty should return false for non-empty lists', () => {
    assert.equal(L.isEmpty(L.singleton(0)), false);
    assert.equal(L.isEmpty(L.list(0, 1, 2, 3)), false);
  });

  it('isEmpty should return true for empty list', () => {
    assert.ok(L.isEmpty(L.nil));
  });

  it('length should return the number of items in an list', () => {
    assert.equal(L.length(L.nil), 0);
    assert.equal(L.length(L.singleton(0)), 1);
    assert.equal(L.length(L.list(1, 2, 3, 4, 5)), 5);
  });

  it('length should be stack safe', () => {
    L.length(L.range(1, 100000));
  });

  it('snoc should add an item to the end of an list', () => {
    assert.deepEqual(L.snoc(L.list(1, 2, 3), 4), L.list(1, 2, 3, 4));
  });

  it('head should return Just head for non empty list', () => {
    assert.deepEqual(L.head(L.list(0, 1, 2, 3)), just(0));
  });

  it('head should return Nothing for an empty list', () => {
    assert.deepEqual(L.head(L.nil), nothing);
  });

  it('tail should return Just tails of list', () => {
    assert.deepEqual(L.tail(L.list(0, 1, 2, 3)), just(L.list(1, 2, 3)));
  });

  it('tail should return Nothing for an empty list', () => {
    assert.deepEqual(L.tail(L.nil), nothing);
  });

  it('last should take last element in a list', () => {
    assert.deepEqual(L.last(L.list(1, 2, 3)), just(3));
  });

  it('last should return nothing when given empty list', () => {
    assert.deepEqual(L.last(L.nil), nothing);
  });

  it('init should return a Just init list (exluding the last element)', () => {
    assert.deepEqual(L.init(L.list(1, 2, 3)), just(L.list(1, 2)));
  });

  it('init should return Nothing for an empty list', () => {
    assert.deepEqual(L.init(L.nil), nothing);
  });

  it('uncons should return nothing when used on an empty list', () => {
    assert.deepEqual(L.uncons(L.nil), nothing);
  });

  it('uncons should split an list into a head and tail record when there is at least one item', () => {
    const t = L.uncons(L.list(0, 1, 2, 3, 4, 5));
    assert.equal(fromMaybe(false, mapMaybe(t, x => x.head === 0)), true);
    assert.equal(fromMaybe(false, mapMaybe(t, xs => deepEq(xs.tail, L.list(1, 2, 3, 4, 5)))), true);
  });

  it('unsnoc should return nothing when used on an empty list', () => {
    assert.deepEqual(L.unsnoc(L.nil), nothing);
  });

  it('unsnoc should split an list into an init and last record when there is at least one item', () => {
    const t1 = L.unsnoc(L.singleton(1));
    assert.equal(fromMaybe(false, mapMaybe(t1, x => x.last === 1)), true);
    assert.equal(fromMaybe(false, mapMaybe(t1, x => deepEq(x.init, L.nil))), true);

    const t2 = L.unsnoc(L.list(1, 2, 3));
    assert.ok(fromMaybe(false, mapMaybe(t2, x => x.last === 3)));
    assert.ok(fromMaybe(false, mapMaybe(t2, x => deepEq(x.init, L.list(1, 2)))));
  });

  it('reverse can reverse list', () => {
    assert.deepEqual(L.reverse(L.list(0, 1, 2, 3)), L.list(3, 2, 1, 0));
    assert.deepEqual(L.reverse(L.nil), L.nil);
  });

  it('joinWith return joined string mapped by passed function', () => {
    assert.equal(L.joinWith(L.list(0, 1, 2, 3), toString), '0123');
    assert.equal(L.joinWith(L.nil, toString), '');
  });

  it('join return joined string', () => {
    assert.equal(L.join(L.list('a', 'b', 'c', 'd'), ''), ['a', 'b', 'c', 'd'].join(''));
    assert.equal(L.join(L.list('a', 'b', 'c', 'd'), ','), ['a', 'b', 'c', 'd'].join(','));
    assert.equal(L.join(L.fromArray([]), ','), [].join(''));
  });

  it('index should return Just x when the index is within the bounds of the list', () => {
    assert.deepEqual(L.index(L.list(1, 2, 3), 0), just(1));
    assert.deepEqual(L.index(L.list(1, 2, 3), 1), just(2));
    assert.deepEqual(L.index(L.list(1, 2, 3), 2), just(3));
  });

  it('index should return Nothing when the index is outside of the bounds of the list', () => {
    assert.deepEqual(L.index(L.list(1, 2, 3), 6), nothing);
    assert.deepEqual(L.index(L.list(1, 2, 3), -1), nothing);
  });

  it('findIndex should return index for which a predicate holds.', () => {
    assert.deepEqual(L.findIndex(x => x > 3,  L.list(1, 2, 3, 4, 5, 6)), just(3));
  });

  it('findIndex should return Nothing if the predicate never return true', () => {
    assert.deepEqual(L.findIndex(x => x === 21, L.list(1, 2, 3, 4)), nothing);
    assert.deepEqual(L.findIndex(x => x > 3, L.nil), nothing);
  });

  it('findLastIndex return last index for which a predicate holds', () => {
    assert.deepEqual(L.findLastIndex(x => x > 3, L.list(1, 2, 3, 4, 5, 2, 1)), just(4));
  });

  it('insertAt should add an item at the specified index', () => {
    assert.deepEqual(L.insertAt(0, 1, L.list(2, 3)), just(L.list(1, 2, 3)));
    assert.deepEqual(L.insertAt(1, 1, L.list(2, 3)), just(L.list(2, 1, 3)));
    assert.deepEqual(L.insertAt(2, 1, L.list(2, 3)), just(L.list(2, 3, 1)));
  });

  it('insertAt should return Nothing if the index is out of range', () => {
    assert.deepEqual(L.insertAt(2, 1, L.nil), nothing);
  });

  it('deleteAt should remove an item at the specified index', () => {
    assert.deepEqual(L.deleteAt(0, L.list(1, 2, 3)), just(L.list(2, 3)));
    assert.deepEqual(L.deleteAt(1, L.list(1, 2, 3)), just(L.list(1, 3)));
  });

  it('deleteAt should return Nothing if the index is out of range', () => {
    assert.deepEqual(L.deleteAt(1, L.nil), nothing);
  });

  it('updateAt should replace an item at the specified index', () => {
    assert.deepEqual(L.updateAt(0, 9, L.list(1, 2, 3)), just(L.list(9, 2, 3)));
    assert.deepEqual(L.updateAt(1, 9, L.list(1, 2, 3)), just(L.list(1, 9, 3)));
  });

  it('updateAt should return Nothing if the index is out of range', () => {
    assert.deepEqual(L.updateAt(1, 9, L.nil), nothing);
  });

  it('modifyAt should update an item at the specified index', () => {
    assert.deepEqual(L.modifiAt(0, x => x + 1, L.list(1, 2, 3)), just(L.list(2, 2, 3)));
    assert.deepEqual(L.modifiAt(1, x => x + 1, L.list(1, 2, 3)), just(L.list(1, 3, 3)));
  });

  it('modifyAt should return Nothing if the index is out of range', () => {
    assert.deepEqual(L.modifiAt(1, x => x + 1, L.nil), nothing);
  });

  it('alterAt should update an item at the specified index when the function returns Just', () => {
    function splat(x: number): Maybe<number> {
      return just(x + 1);
    }
    assert.deepEqual(L.alterAt(0, splat, L.list(1, 2, 3)), just(L.list(2, 2, 3)));
    assert.deepEqual(L.alterAt(2, splat, L.list(1, 2, 3)), just(L.list(1, 2, 4)));
  });

  it('alterAt should drop an item at the specified index when the function returns Nothing', () => {
    function splatDel(x: number): Maybe<number> {
      return nothing;
    }
    assert.deepEqual(L.alterAt(0, splatDel, L.list(1, 2, 3)), just(L.list(2, 3)));
    assert.deepEqual(L.alterAt(1, splatDel, L.list(1, 2, 3)), just(L.list(1, 3)));
  });

  it('alterAt should return Nothing if the index is out of range', () => {
    function splat(x: number): Maybe<number> {
      return just(x + 1);
    }
    assert.deepEqual(L.alterAt(1, splat, L.nil), nothing);
  });

  it('append should concatenate two list', () => {
    assert.deepEqual(L.append(L.list(1, 2, 3), L.list(4, 5, 6)), L.list(1, 2, 3, 4, 5, 6));
  });

  it('map transform each element in list', () => {
    assert.deepEqual(L.map(x => x + 1, L.list(1, 2, 3)), L.list(2, 3, 4));
    assert.deepEqual(L.map(x => x + 1, L.nil), L.nil);
  });

  it('concatMap should be equivalent to (concat <<< map)', () => {
    function doubleAndOrig(x: number): L.List<number> {
      return L.cons(x * 2, L.singleton(x));
    }
    const xs = L.list(1, 2, 3, 4);
    assert.deepEqual(L.concatMap(doubleAndOrig, xs), L.concat(L.map(doubleAndOrig, xs)));
  });

  it('zipWith should use the specified function to zip two lists together', () => {
    let xs = L.zipWith((x: number, y: string) => [toString(x), y] as [string, string],
                       L.list(1, 2, 3), L.list('a', 'b', 'c'));
    assert.deepEqual(xs, L.list(['1', 'a'], ['2', 'b'], ['3', 'c']));

    // truncate to minimum length
    let ys = L.zipWith((x: number, y: string) => [toString(x), y] as [string, string],
                       L.list(1, 2, 3), L.list('a', 'b', 'c', 'd', 'e'));
    assert.deepEqual(ys, L.list(['1', 'a'], ['2', 'b'], ['3', 'c']));
  });

  it('zip should combine two list', () => {
    let xs = L.zip(L.list(1, 2, 3), L.list('a', 'b', 'c'));
    assert.deepEqual(xs, L.list([1, 'a'], [2, 'b'], [3, 'c']));
  });

  it('filterMap should transform every item in an list, throwing out Nothing values', () => {
    function transform(x: number): Maybe<string> {
      return x !== 0 ? just(x.toString()) : nothing;
    }
    assert.deepEqual(L.filterMap(transform, L.list(0, 1, 0, 0, 2, 3)), L.list('1', '2', '3'));
  });

  it('filter should remove items that don\'t match a predicate', () => {
    assert.deepEqual(L.filter(odd, L.range(0, 10)), L.list(1, 3, 5, 7, 9));
  });

  it('partitionMap should partition a list when function return left or right', () => {
    function oddPar(x: number): Either<number, number> {
      return odd(x) ? left(x) : right(x);
    }
    assert.deepEqual(L.partitionMap(oddPar, L.range(0, 10)), {
      left: L.list(1, 3, 5, 7, 9),
      right: L.list(0, 2, 4, 6, 8, 10)
    });
  });

  it('fromArray and toArray should isomorphic', () => {
    let xs = [1, 2, 3, 4, 5];
    assert.deepEqual(L.toArray(L.fromArray(xs)), xs);
  });
});
