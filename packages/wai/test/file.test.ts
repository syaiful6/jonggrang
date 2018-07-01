import * as assert from 'assert';
import * as path from 'path';

import * as jsv from 'jsverify';

import { isLeft } from '@jonggrang/prelude';
import { RequestHeaders, fromDate, formatHttpDate,  } from '@jonggrang/http-types';
import * as T from '@jonggrang/task';
import * as S from '@jonggrang/object';

import { getFileInfo, FileInfo } from '../src/handler/file-info';
import {
  RspFileInfoWithBody, rspFileInfo, RspFileInfoType, conditionalRequest
} from '../src/handler/file';


function testRunner(headers: RequestHeaders, fp: string, rsp: RspFileInfoWithBody) {
  return T.attempt(getFileInfo(fp))
    .chain(efinfo => {
      if (isLeft(efinfo)) {
        assert.equal(true, false);
        return T.pure(false);
      }
      const { value: finfo } = efinfo;
      let hs = S.assign({}, rsp.header, {
        'Last-Modified': finfo.date
      });

      let rsp2 = rspFileInfo(RspFileInfoType.WITHBODY, rsp.status, hs, rsp.offset, rsp.length);
      assert.deepEqual(conditionalRequest(finfo, {}, headers), rsp2);
      return T.pure(false);
    });
}

function testFileRange(desc: string, headers: RequestHeaders, fp: string, rsp: RspFileInfoWithBody) {
  it(desc, done => {
    T.runTask(testRunner(headers, fp, rsp), done);
  });
}

function createFileInfo(name: string, size: number, dt: Date) {
  const time = fromDate(dt);
  const date = formatHttpDate(time);
  return new FileInfo(name, size, time, date);
}

const fileInfoArb = jsv.tuple([jsv.string, jsv.number, jsv.datetime])
  .smap<FileInfo>(
    ([name, size, dt]: any[]) => createFileInfo(name, size, dt),
    (finfo: FileInfo) => [finfo.name, finfo.size, new Date(Date.parse(finfo.date))],
    (finfo: FileInfo) => `<FileInfo ${finfo.name}>`
  );

describe('File spec', () => {
  const FILEPATH = path.join(__dirname, '..', 'attic', 'hex');

  describe('FileInfo property', function () {
    jsv.property('Setoid reflection', fileInfoArb, (finfo) => finfo.equals(finfo) );

    jsv.property('Setoid reflection 2', fileInfoArb, fileInfoArb, (a, b) =>
      a.equals(b) === b.equals(a)
    );
  });

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
