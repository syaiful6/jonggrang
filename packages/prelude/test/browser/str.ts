import 'mocha';
import { expect } from 'chai';

import * as S from '../../src/str';
import { just, nothing } from '../../src/maybe';

describe('Prelude Str', () => {
  describe('isEmpty', () => {
    it('Return true if passed empty string', () => {
      /* tslint:disable */
      expect(S.isEmpty('')).to.be.true;
      /* tslint:enable */
    });

    it('Return false is passed non empty string', () => {
      /* tslint:disable */
      expect(S.isEmpty('ab')).to.be.false;
      /* tslint:enable */
    });
  });

  describe('drop', () => {
    it('return same string if pass 0 or less', () => {
      expect(S.drop(0, 'ab')).to.be.equals('ab');
      expect(S.drop(-1, 'ab')).to.be.equals('ab');
    });

    it('drop n character', () => {
      expect(S.drop(1, 'ab')).to.be.equals('b');
    });

    it('drop same length of string or greater return empty string', () => {
      expect(S.drop(2, 'ab')).to.be.equals('');
      expect(S.drop(3, 'ab')).to.equals('');
    });
  });

  describe('take', () => {
    it('return empty string if passed 0 or less', () => {
      expect(S.take(0, 'ab')).to.be.equals('');
      expect(S.take(-1, 'abc')).to.be.equals('');
    });

    it('take n character of string', () => {
      expect(S.take(2, 'abcd')).to.be.equals('ab');
    });

    it('return whole string if pass same length or greater than length of string', () => {
      expect(S.take(2, 'ab')).to.be.equals('ab');
      expect(S.take(3, 'ab')).to.be.equals('ab');
    });
  });

  describe('indexOf', () => {
    it('return 0 if pattern same as string or pass empty string as pattern', () => {
      expect(S.indexOf('', '')).to.be.deep.equals(just(0));
      expect(S.indexOf('', 'abc')).to.be.deep.equals(just(0));
    });

    it('return Returns the index of the first occurrence of the pattern', () => {
      expect(S.indexOf('ab', 'cabab')).to.be.deep.equals(just(1));
    });

    it('Return nothing if the pattern didn\'t occur in given string', () => {
      expect(S.indexOf('cb', 'abcd')).to.be.deep.equals(nothing);
    });
  });

  describe('count', () => {
    it('work with empty string and return zero', () => {
      expect(S.count(x => x === 'a', '')).to.be.equals(0);
      expect(S.count(() => true, '')).to.be.equals(0);
    });

    it('return the number of contiguous characters at the beginning that predicate hold', () => {
      expect(S.count(a => a === 'a', 'ab')).to.be.equals(1);
      expect(S.count(a => a === 'a', 'aaab')).to.be.equals(3);
      expect(S.count(a => a === 'a', 'aabaaa')).to.be.equals(2);
    });
  });

  describe('takeWhile', () => {
    it('return whole string if predicate always return true', () => {
      expect(S.takeWhile(() => true, 'abc')).to.be.equals('abc');
    });

    it('return empty string if predicate always return false', () => {
      expect(S.takeWhile(() => false, 'abc')).to.be.equals('');
    });

    it('returns the longest prefix that satisfy predicate', () => {
      expect(S.takeWhile(a => a !== 'b', 'aabbaa')).to.be.equals('aa');
    });
  });
});
