import * as assert from 'assert';

import * as D from '../../src/decimal';

describe('num decimal', () => {
  describe('create/construct decimal', () => {
    it('can create decimal correctly', () => {
      const d = D.fromInteger(1, -1);
      assert.equal(D.showFixed(d), '0.1');
    });

    it('can show decimal representation in scientific notation', () => {
      const d = D.fromInteger(1, -1);
      assert.equal(D.showExp(d), '1e-1');
    });

    it('can create decimal from js number', () => {
      const d = D.fromDouble(1.1);
      assert.equal(D.show(d), '1.100000000000000088817841970012523233890533447265625');
    });
  });

  describe('parsing a decimal string', () => {
    it('can parse a decimal', () => {
      const md = D.parseDecimal('0.12');
      if (md == null) {
        assert.fail('failed to parse decimal');
        return;
      }
      assert.equal(D.show(md), '0.12');
    });
  });

  describe('show a decimal representation', () => {
    it('can show a decimal in fixed-point notation', () => {
      const d = D.fromDouble(0.1);
      assert.equal(D.showFixed(d, 20), '0.10000000000000000555');
    });

    it('can show a decimal in scientific notation', () => {
      const d = D.fromDouble(0.125);
      assert.equal(D.showExp(d, -20), '1.25e-1');
    });
  });

  describe('mathematic operation', () => {
    it('correctly add two decimal', () => {
      // 0.1 + 0.2 = 0.3
      const d = D.add(D.fromInteger(1, -1), D.fromInteger(2, -1));
      assert.equal(D.show(d), '0.3');
    });

    it('correctly substract two decimal', () => {
      // 0.3 - 0.1 = 0.2
      const d = D.substract(D.fromInteger(3, -1), D.fromInteger(1, -1));
      assert.equal(D.show(d), '0.2');
    });

    it('correctly carries over into arithmatic', () => {
      // 0.1 * 3 - 0.3
      // in double: 5.5511151231257827e-017
      // this should zero in Decimal
      const a = D.fromInteger(1, -1); // 0.1
      const b = D.fromInteger(3, -1); // 0.3
      const c = D.fromInteger(3); // 3.0

      const ret = D.substract(D.multiply(a, c), b);
      assert.ok(D.isZero(ret));
      assert.equal(D.show(ret), '0e-7');
    });

    it('correctly divide two decimal', () => {
      const a = D.fromInteger(2);
      const b = D.fromInteger(3);
      // default precision is 15
      assert.equal(D.show(D.divide(a, b)), '0.666666666666666');
      // pass the minimum precision
      assert.equal(D.show(D.divide(a, b, 1)), '0.6');
    });

    it('min return the minimum of two decimal', () => {
      const a = D.fromInteger(5, -1); // 0.5
      const b = D.fromInteger(25, -2); // 0.25

      const c = D.min(a, b);
      assert.equal(D.show(c), '0.25');
    });
  });
});
