import 'mocha';
import { expect } from 'chai';

import * as M from '@jonggrang/prelude/lib/maybe';
import * as H from '../../src/header';

describe('HTTP Header', () => {
  describe('ByteRanges', () => {
    describe('Construct ByteRange', () => {
      it('byteRange can create range suffix', () => {
        const br = H.byteRange(H.ByteRangeType.RANGESUFFIX, 10);
        expect(br.tag).to.be.equals(H.ByteRangeType.RANGESUFFIX);
        expect(br.suffix).to.be.equals(10);
      });

      it('Can create range from', () => {
        const bf = H.byteRange(H.ByteRangeType.RANGEFROM, 0);
        expect(bf.tag).to.be.equals(H.ByteRangeType.RANGEFROM);
        expect(bf.from).to.be.equals(0);
      });

      it('Can create range from to', () => {
        const bft = H.byteRange(H.ByteRangeType.RANGEFROMTO, 10, 55);
        expect(bft.tag).to.be.equals(H.ByteRangeType.RANGEFROMTO);
        expect(bft.from).to.be.equals(10);
        expect(bft.to).to.be.equals(55);
      });
    });

    describe('parseByteRanges', () => {
      it('should return nothing for invalid string', () => {
        expect(H.parseByteRanges('malformed')).to.be.deep.equals(M.nothing);
      });

      it('should parse string', () => {
        const parsed = H.parseByteRanges('bytes=0-555');
        /*tslint:disable */
        expect(M.isJust(parsed)).to.be.true;
        expect(M.maybe(
          false,
          (ranges) =>
            ranges.length === 1 &&
            ranges[0].tag === H.ByteRangeType.RANGEFROMTO &&
            (ranges[0] as any).from === 0 &&
            (ranges[0] as any).to === 555, parsed)).to.be.true;
        /*tslint:enable */
      });

      it('should parse range suffix', () => {
        const parsed = H.parseByteRanges('bytes=-500');
        /*tslint:disable */
        expect(M.isJust(parsed)).to.be.true;
        expect(M.maybe(
          false,
          (ranges) =>
            ranges.length === 1 &&
            ranges[0].tag === H.ByteRangeType.RANGESUFFIX &&
            (ranges[0] as H.ByteRangeSuffix).suffix === 500,
            parsed)).to.be.true;
         /*tslint:enable */
      });
    });
  });
});
