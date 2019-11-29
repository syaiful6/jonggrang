import * as assert from 'assert';

import * as S from '../../src/str';
import { just, nothing } from '../../src/maybe';


describe('Prelude Str', () => {
  describe('isEmpty', () => {
    it('Return true if passed empty string', () => {
      assert.ok(S.isEmpty(''));
    });

    it('Return false is passed non empty string', () => {
      assert.equal(S.isEmpty('ab'), false);
    });
  });

  describe('drop', () => {
    it('return same string if pass 0 or less', () => {
      assert.equal(S.drop(0, 'ab'), 'ab');
      assert.equal(S.drop(-1, 'ab'), 'ab');
    });

    it('drop n character', () => {
      assert.equal(S.drop(1, 'ab'), 'b');
    });

    it('drop same length of string or greater return empty string', () => {
      assert.equal(S.drop(2, 'ab'), '');
      assert.equal(S.drop(3, 'ab'), '');
    });
  });

  describe('take', () => {
    it('return empty string if passed 0 or less', () => {
      assert.equal(S.take(0, 'ab'), '');
      assert.equal(S.take(-1, 'abc'), '');
    });

    it('take n character of string', () => {
      assert.equal(S.take(2, 'abcd'), 'ab');
    });

    it('return whole string if pass same length or greater than length of string', () => {
      assert.equal(S.take(2, 'ab'), 'ab');
      assert.equal(S.take(3, 'ab'), 'ab');
    });
  });

  describe('indexOf', () => {
    it('return 0 if pattern same as string or pass empty string as pattern', () => {
      assert.deepEqual(S.indexOf('', ''), just(0));
      assert.deepEqual(S.indexOf('', 'abc'), just(0));
    });

    it('return Returns the index of the first occurrence of the pattern', () => {
      assert.deepEqual(S.indexOf('ab', 'cabab'), just(1));
    });

    it('Return nothing if the pattern didn\'t occur in given string', () => {
      assert.deepEqual(S.indexOf('cb', 'abcd'), nothing);
    });
  });

  describe('count', () => {
    it('work with empty string and return zero', () => {
      assert.equal(S.count('', x => x === 'a'), 0);
      assert.equal(S.count('', () => true), 0);
    });

    it('return the number of contiguous characters at the beginning that predicate hold', () => {
      assert.equal(S.count('ab', a => a === 'a'), 1);
      assert.equal(S.count('aaab', a => a === 'a'), 3);
      assert.equal(S.count('aabaaa', a => a === 'a'), 2);
    });
  });

  describe('takeWhile', () => {
    it('return whole string if predicate always return true', () => {
      assert.equal(S.takeWhile('abc', () => true), 'abc');
    });

    it('return empty string if predicate always return false', () => {
      assert.equal(S.takeWhile('abc', () => false), '');
    });

    it('returns the longest prefix that satisfy predicate', () => {
      assert.equal(S.takeWhile('aabbaa', a => a !== 'b'), 'aa');
    });
  });
});
