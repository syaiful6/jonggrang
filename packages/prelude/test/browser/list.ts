import 'mocha';
import { expect } from 'chai';

import { just, nothing, fromMaybe, mapMaybe } from '../../src/maybe';
import { deepEq } from '../../src/eq';
import * as L from '../../src/list';

function toString(x: any): string {
  return typeof x.toString === 'function' ? x.toString() : Object.prototype.toString.call(x);
}

describe('Prelude list', () => {
  it('singleton should construct an list with a single value', () => {
    expect(L.singleton(1)).to.deep.equals(L.list(1));
    expect(L.singleton('foo')).to.deep.equals(L.list('foo'));
  });

  it('range should create an inclusive list of integers for the specified start and end', () => {
    expect(L.range(0, 5)).to.deep.equals(L.list(0, 1, 2, 3, 4, 5));
    expect(L.range(2, -3)).to.deep.equals(L.list(2, 1, 0, -1, -2, -3));
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
});
