import * as assert from 'assert';

import { parseQuery, renderQuery } from '../../src/querystring';

describe('HTTP Querystring', () => {
  describe('parseQuery', () => {
    it('parse query string', () => {
      const parsed = parseQuery('?test=ok');
      assert.deepEqual(parsed, { test: 'ok' });
    });

    it('parse empty string return empty object', () => {
      assert.deepEqual(parseQuery(''), {});
    });

    it('parse flat query string', () => {
      const parsed = parseQuery('a=b&c=d');
      assert.deepEqual(parsed, { a: 'b', c: 'd' });
    });

    it('handle escaped values', () => {
      const parsed = parseQuery('%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23=%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23');
      assert.deepEqual(parsed, { ';:@&=+$,/?%#': ';:@&=+$,/?%#' });
    });

    it('handles escaped slashes followed by a number', () => {
      const parsed = parseQuery('hello=%2Fen%2F1');
      assert.equal(parsed.hello, '/en/1');
    });

    it('handle escaped square brackets', () => {
      assert.deepEqual(parseQuery('a%5B%5D=b'), { 'a[]': 'b' });
    });

    it('handles escaped unicode', () => {
      const parsed = parseQuery('%C3%B6=%C3%B6');
      assert.deepEqual(parsed, { 'ö': 'ö' });
    });
  });

  describe('renderQuery', () => {
    it('render query object', () => {
      const qs = renderQuery({ test: 'ok', js: 'yes' });
      assert.equal(qs, 'test=ok&js=yes');
    });

    it('handles escaped object', () => {
      const qs = renderQuery({';:@&=+$,/?%#': ';:@&=+$,/?%#'});
      assert.equal(qs, '%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23=%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23');
    });

    it('handles unicode', () => {
      const qs = renderQuery({ 'ö': 'ö' });
      assert.equal(qs, '%C3%B6=%C3%B6');
    });
  });
});
