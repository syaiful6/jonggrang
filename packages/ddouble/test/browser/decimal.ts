import * as assert from 'assert';

import * as D from '../../src/decimal';

describe('num decimal', () => {
  it('can create decimal correctly', () => {
    const d = D.fromInteger(1, -1);
    assert.equal(D.showFixed(d), '0.1');
  });

  it('can show decimal representation in scientific notation', () => {
    const d = D.fromInteger(1, -1);
    assert.equal(D.showExp(d), '1e-1');
  });

  it('can create decimal from js number', () => {
    const d = D.fromNumber(1.1);
    assert.equal(D.show(d), '1.100000000000000088817841970012523233890533447265625');
  })
})
