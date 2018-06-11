import * as jsv from 'jsverify';

import { httpVersion, HttpVersion } from '../../src/version';

function httpVersionArb() {
  return jsv.tuple([jsv.integer, jsv.integer]).smap<HttpVersion>(
    ([a, b]) => httpVersion(a, b),
    hv => [hv.major, hv.minor],
    v => v.toString()
  );
}

describe('HTTP Version', () => {
  describe('Setoid equals', () => {
    it('reflection', () =>
      jsv.assert(jsv.forall(
        httpVersionArb(),
        v => v.equals(v)
      ))
    );

    it('reflection 2', () =>
      jsv.assert(
        jsv.forall(
          httpVersionArb(),
          httpVersionArb(),
          (a, b) => a.equals(b) === b.equals(a)
        )
      )
    );
  });
});
