import 'mocha';
import { expect } from 'chai';
import * as path from 'path';

import { isLeft } from '@jonggrang/prelude';
import { RequestHeaders } from '@jonggrang/http-types';
import * as T from '@jonggrang/task';
import * as S from '@jonggrang/object';

import { getFileInfo } from '../src/handler/file-info';
import {
  RspFileInfoWithBody, rspFileInfo, RspFileInfoType, conditionalRequest
} from '../src/handler/file';


function testRunner(headers: RequestHeaders, fp: string, rsp: RspFileInfoWithBody) {
  return T.attempt(getFileInfo(fp))
    .chain(efinfo => {
      if (isLeft(efinfo)) {
        /*tslint:disable */
        expect(true).to.be.false;
        /*tslint:enable */
        return T.pure(false);
      }
      const { value: finfo } = efinfo;
      let hs = S.assign({}, rsp.header, {
        'Last-Modified': finfo.date
      });

      let rsp2 = rspFileInfo(RspFileInfoType.WITHBODY, rsp.status, hs, rsp.offset, rsp.length);
      expect(conditionalRequest(finfo, {}, headers)).to.deep.equals(rsp2);
      return T.pure(false);
    });
}

function testFileRange(desc: string, headers: RequestHeaders, fp: string, rsp: RspFileInfoWithBody) {
  it(desc, done => {
    T.runTask(done, testRunner(headers, fp, rsp));
  });
}

describe('File spec', () => {
  const FILEPATH = path.join(__dirname, '..', 'attic', 'hex');

  testFileRange(
    'gets a file size from file system', {}, FILEPATH,
    rspFileInfo(RspFileInfoType.WITHBODY, 200,
                { 'Content-Length': 17, 'Accept-Ranges': 'bytes'}, 0, 17));

  testFileRange(
    'gets a file size from file system and handles Range and returns Partial Content',
    { range: 'bytes=2-14' }, FILEPATH,
    rspFileInfo(RspFileInfoType.WITHBODY, 206,
                { 'Content-Ranges': 'bytes 2-14/17', 'Content-Length': 13, 'Accept-Ranges': 'bytes' },
                2, 13));

  testFileRange(
    'truncates end point of range to file size',
    { range: 'bytes=10-20' }, FILEPATH,
    rspFileInfo(RspFileInfoType.WITHBODY, 206,
                { 'Content-Ranges': 'bytes 10-16/17', 'Content-Length': 7, 'Accept-Ranges': 'bytes' },
                10, 7));

  testFileRange(
    'gets a file size from file system and handles Range and returns OK if Range means the entire',
    { range: 'bytes=0-16' }, FILEPATH,
    rspFileInfo(RspFileInfoType.WITHBODY, 200,
                { 'Content-Length': 17, 'Accept-Ranges': 'bytes' }, 0, 17));
});
