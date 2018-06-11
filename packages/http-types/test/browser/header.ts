import * as assert from 'assert';

import * as M from '@jonggrang/prelude/lib/maybe';
import * as H from '../../src/header';

describe('HTTP Header', () => {
  describe('ByteRanges', () => {
    describe('Construct ByteRange', () => {
      it('byteRange can create range suffix', () => {
        const br = H.byteRange(H.ByteRangeType.RANGESUFFIX, 10);
        assert.equal(br.tag, H.ByteRangeType.RANGESUFFIX);
        assert.equal(br.suffix, 10);
      });

      it('Can create range from', () => {
        const bf = H.byteRange(H.ByteRangeType.RANGEFROM, 0);
        assert.equal(bf.tag, H.ByteRangeType.RANGEFROM);
        assert.equal(bf.from, 0);
      });

      it('Can create range from to', () => {
        const bft = H.byteRange(H.ByteRangeType.RANGEFROMTO, 10, 55);
        assert.equal(bft.tag, H.ByteRangeType.RANGEFROMTO);
        assert.equal(bft.from, 10);
        assert.equal(bft.to, 55);
      });
    });

    describe('parseByteRanges', () => {
      it('should return nothing for invalid string', () => {
        assert.deepEqual(H.parseByteRanges('malformed'), M.nothing);
      });

      it('should parse string', () => {
        const parsed = H.parseByteRanges('bytes=0-555');
        assert.ok(M.isJust(parsed));
        assert.ok(M.maybe(
          false,
          (ranges) =>
            ranges.length === 1 &&
            ranges[0].tag === H.ByteRangeType.RANGEFROMTO &&
            (ranges[0] as any).from === 0 &&
            (ranges[0] as any).to === 555, parsed));
      });

      it('should parse range suffix', () => {
        const parsed = H.parseByteRanges('bytes=-500');
        assert.ok(M.isJust(parsed));
        assert.ok(M.maybe(
          false,
          (ranges) =>
            ranges.length === 1 &&
            ranges[0].tag === H.ByteRangeType.RANGESUFFIX &&
            (ranges[0] as H.ByteRangeSuffix).suffix === 500,
            parsed));
      });
    });
  });
});
