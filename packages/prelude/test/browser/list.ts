import 'mocha';
import { expect } from 'chai';

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
    expect(L.singleton(1)).to.deep.equals(L.list(1));
    expect(L.singleton('foo')).to.deep.equals(L.list('foo'));
  });

  it('range should create an inclusive list of integers for the specified start and end', () => {
    expect(L.range(0, 5)).to.deep.equals(L.list(0, 1, 2, 3, 4, 5));
    expect(L.range(2, -3)).to.deep.equals(L.list(2, 1, 0, -1, -2, -3));
    expect(L.range(0, 0)).to.deep.equals(L.singleton(0));
  });

  it('isEmpty should return false for non-empty lists', () => {
    expect(L.isEmpty(L.singleton(0))).to.equals(false);
    expect(L.isEmpty(L.list(0, 1, 2, 3))).to.equals(false);
  });

  it('isEmpty should return true for empty list', () => {
    expect(L.isEmpty(L.nil)).to.equals(true);
  });

  it('length should return the number of items in an list', () => {
    expect(L.length(L.nil)).to.be.equals(0);
    expect(L.length(L.singleton(0))).to.be.equals(1);
    expect(L.length(L.list(1, 2, 3, 4, 5))).to.be.equals(5);
  });

  it('length should be stack safe', () => {
    L.length(L.range(1, 100000));
  });

  it('snoc should add an item to the end of an list', () => {
    expect(L.snoc(L.list(1, 2, 3), 4)).to.deep.equals(L.list(1, 2, 3, 4));
  });

  it('head should return Just head for non empty list', () => {
    expect(L.head(L.list(0, 1, 2, 3))).to.deep.equals(just(0));
  });

  it('head should return Nothing for an empty list', () => {
    expect(L.head(L.nil)).to.be.deep.equals(nothing);
  });

  it('tail should return Just tails of list', () => {
    expect(L.tail(L.list(0, 1, 2, 3))).to.deep.equals(just(L.list(1, 2, 3)));
  });

  it('tail should return Nothing for an empty list', () => {
    expect(L.tail(L.nil)).to.deep.equals(nothing);
  });

  it('last should take last element in a list', () => {
    expect(L.last(L.list(1, 2, 3))).to.deep.equals(just(3));
  });

  it('last should return nothing when given empty list', () => {
    expect(L.last(L.nil)).to.deep.equals(nothing);
  });

  it('init should return a Just init list (exluding the last element)', () => {
    expect(L.init(L.list(1, 2, 3))).to.deep.equals(just(L.list(1, 2)));
  });

  it('init should return Nothing for an empty list', () => {
    expect(L.init(L.nil)).to.deep.equals(nothing);
  });

  it('uncons should return nothing when used on an empty list', () => {
    expect(L.uncons(L.nil)).to.deep.equals(nothing);
  });

  it('uncons should split an list into a head and tail record when there is at least one item', () => {
    const t = L.uncons(L.list(0, 1, 2, 3, 4, 5));
    expect(fromMaybe(false, mapMaybe(t, x => x.head === 0))).to.equal(true);
    expect(fromMaybe(false, mapMaybe(t, xs => deepEq(xs.tail, L.list(1, 2, 3, 4, 5))))).to.equals(true);
  });

  it('unsnoc should return nothing when used on an empty list', () => {
    expect(L.unsnoc(L.nil)).to.be.deep.equals(nothing);
  });

  it('unsnoc should split an list into an init and last record when there is at least one item', () => {
    const t1 = L.unsnoc(L.singleton(1));
    expect(fromMaybe(false, mapMaybe(t1, x => x.last === 1))).to.equals(true);
    expect(fromMaybe(false, mapMaybe(t1, x => deepEq(x.init, L.nil)))).to.equals(true);

    const t2 = L.unsnoc(L.list(1, 2, 3));
    /* tslint:disable */
    expect(fromMaybe(false, mapMaybe(t2, x => x.last === 3))).to.be.true;
    expect(fromMaybe(false, mapMaybe(t2, x => deepEq(x.init, L.list(1, 2))))).to.be.true;
     /* tslint:enable */
  });

  it('reverse can reverse list', () => {
    expect(L.reverse(L.list(0, 1, 2, 3))).to.deep.equals(L.list(3, 2, 1, 0));
    expect(L.reverse(L.nil)).to.deep.equals(L.nil);
  });

  it('joinWith return joined string mapped by passed function', () => {
    expect(L.joinWith(L.list(0, 1, 2, 3), toString)).to.equals('0123');
    expect(L.joinWith(L.nil, toString)).to.equal('');
  });

  it('index should return Just x when the index is within the bounds of the list', () => {
    expect(L.index(L.list(1, 2, 3), 0)).to.deep.equal(just(1));
    expect(L.index(L.list(1, 2, 3), 1)).to.deep.equal(just(2));
    expect(L.index(L.list(1, 2, 3), 2)).to.deep.equal(just(3));
  });

  it('index should return Nothing when the index is outside of the bounds of the list', () => {
    expect(L.index(L.list(1, 2, 3), 6)).to.deep.equals(nothing);
    expect(L.index(L.list(1, 2, 3), -1)).to.deep.equals(nothing);
  });

  it('findIndex should return index for which a predicate holds.', () => {
    expect(L.findIndex(x => x > 3,  L.list(1, 2, 3, 4, 5, 6))).to.deep.equal(just(3));
  });

  it('findIndex should return Nothing if the predicate never return true', () => {
    expect(L.findIndex(x => x === 21, L.list(1, 2, 3, 4))).to.deep.equals(nothing);
    expect(L.findIndex(x => x > 3, L.nil)).to.deep.equals(nothing);
  });

  it('findLastIndex return last index for which a predicate holds', () => {
    expect(L.findLastIndex(x => x > 3, L.list(1, 2, 3, 4, 5, 2, 1))).to.deep.equals(just(4));
  });

  it('insertAt should add an item at the specified index', () => {
    expect(L.insertAt(0, 1, L.list(2, 3))).to.deep.equals(just(L.list(1, 2, 3)));
    expect(L.insertAt(1, 1, L.list(2, 3))).to.deep.equals(just(L.list(2, 1, 3)));
    expect(L.insertAt(2, 1, L.list(2, 3))).to.deep.equals(just(L.list(2, 3, 1)));
  });

  it('insertAt should return Nothing if the index is out of range', () => {
    expect(L.insertAt(2, 1, L.nil)).to.deep.equals(nothing);
  });

  it('deleteAt should remove an item at the specified index', () => {
    expect(L.deleteAt(0, L.list(1, 2, 3))).to.deep.equals(just(L.list(2, 3)));
    expect(L.deleteAt(1, L.list(1, 2, 3))).to.deep.equals(just(L.list(1, 3)));
  });

  it('deleteAt should return Nothing if the index is out of range', () => {
    expect(L.deleteAt(1, L.nil)).to.deep.equals(nothing);
  });

  it('updateAt should replace an item at the specified index', () => {
    expect(L.updateAt(0, 9, L.list(1, 2, 3))).to.deep.equals(just(L.list(9, 2, 3)));
    expect(L.updateAt(1, 9, L.list(1, 2, 3))).to.deep.equals(just(L.list(1, 9, 3)));
  });

  it('updateAt should return Nothing if the index is out of range', () => {
    expect(L.updateAt(1, 9, L.nil)).to.deep.equals(nothing);
  });

  it('modifyAt should update an item at the specified index', () => {
    expect(L.modifiAt(0, x => x + 1, L.list(1, 2, 3))).to.deep.equals(just(L.list(2, 2, 3)));
    expect(L.modifiAt(1, x => x + 1, L.list(1, 2, 3))).to.deep.equals(just(L.list(1, 3, 3)));
  });

  it('modifyAt should return Nothing if the index is out of range', () => {
    expect(L.modifiAt(1, x => x + 1, L.nil)).to.deep.equals(nothing);
  });

  it('alterAt should update an item at the specified index when the function returns Just', () => {
    function splat(x: number): Maybe<number> {
      return just(x + 1);
    }
    expect(L.alterAt(0, splat, L.list(1, 2, 3))).to.deep.equals(just(L.list(2, 2, 3)));
    expect(L.alterAt(2, splat, L.list(1, 2, 3))).to.deep.equals(just(L.list(1, 2, 4)));
  });

  it('alterAt should drop an item at the specified index when the function returns Nothing', () => {
    function splatDel(x: number): Maybe<number> {
      return nothing;
    }
    expect(L.alterAt(0, splatDel, L.list(1, 2, 3))).to.deep.equals(just(L.list(2, 3)));
    expect(L.alterAt(1, splatDel, L.list(1, 2, 3))).to.deep.equals(just(L.list(1, 3)));
  });

  it('alterAt should return Nothing if the index is out of range', () => {
    function splat(x: number): Maybe<number> {
      return just(x + 1);
    }
    expect(L.alterAt(1, splat, L.nil)).to.deep.equals(nothing);
  });

  it('append should concatenate two list', () => {
    expect(L.append(L.list(1, 2, 3), L.list(4, 5, 6))).to.deep.equals(L.list(1, 2, 3, 4, 5, 6));
  });

  it('map transform each element in list', () => {
    expect(L.map(x => x + 1, L.list(1, 2, 3))).to.deep.equals(L.list(2, 3, 4));
    expect(L.map(x => x + 1, L.nil)).to.deep.equals(L.nil);
  });

  it('concatMap should be equivalent to (concat <<< map)', () => {
    function doubleAndOrig(x: number): L.List<number> {
      return L.cons(x * 2, L.singleton(x));
    }
    const xs = L.list(1, 2, 3, 4);
    expect(L.concatMap(doubleAndOrig, xs)).to.deep.equals(L.concat(L.map(doubleAndOrig, xs)));
  });

  it('zipWith should use the specified function to zip two lists together', () => {
    let xs = L.zipWith((x: number, y: string) => [toString(x), y] as [string, string],
                       L.list(1, 2, 3), L.list('a', 'b', 'c'));
    expect(xs).to.deep.equals(L.list(['1', 'a'], ['2', 'b'], ['3', 'c']));

    // truncate to minimum length
    let ys = L.zipWith((x: number, y: string) => [toString(x), y] as [string, string],
                       L.list(1, 2, 3), L.list('a', 'b', 'c', 'd', 'e'));
    expect(ys).to.deep.equals(L.list(['1', 'a'], ['2', 'b'], ['3', 'c']));
  });

  it('zip should combine two list', () => {
    let xs = L.zip(L.list(1, 2, 3), L.list('a', 'b', 'c'));
    expect(xs).to.deep.equals(L.list([1, 'a'], [2, 'b'], [3, 'c']));
  });

  it('filterMap should transform every item in an list, throwing out Nothing values', () => {
    function transform(x: number): Maybe<string> {
      return x !== 0 ? just(x.toString()) : nothing;
    }
    expect(L.filterMap(transform, L.list(0, 1, 0, 0, 2, 3))).to.deep.equals(L.list('1', '2', '3'));
  });

  it('filter should remove items that don\'t match a predicate', () => {
    expect(L.filter(odd, L.range(0, 10))).to.deep.equals(L.list(1, 3, 5, 7, 9));
  });

  it('partitionMap should partition a list when function return left or right', () => {
    function oddPar(x: number): Either<number, number> {
      return odd(x) ? left(x) : right(x);
    }
    expect(L.partitionMap(oddPar, L.range(0, 10))).to.deep.equals({
      left: L.list(1, 3, 5, 7, 9),
      right: L.list(0, 2, 4, 6, 8, 10)
    });
  });

  it('fromArray and toArray should isomorphic', () => {
    let xs = [1, 2, 3, 4, 5];
    expect(L.toArray(L.fromArray(xs))).to.deep.equals(xs);
  });
});
