import * as assert from 'assert';
import * as jsv from 'jsverify';
import { deepEq } from '@jonggrang/prelude';
import { decodePathSegments, encodePathSegments } from '../../src/uri';

describe('URI', () => {
  it('#decodePathSegments percent encoding', () => {
    const segments = decodePathSegments('/foo/baz%20bar');
    assert.deepEqual(segments, ['foo', 'baz bar']);
  });

  jsv.property('is inverse to encodePathSegments', jsv.array(jsv.string), segments =>
    segments.length === 1 && segments[0] === '' ? true
      : deepEq(decodePathSegments(encodePathSegments(segments)), segments)
  );
});
