import 'mocha';
import { expect } from 'chai';

import { parseQuery, renderQuery } from '../../src/uri';

describe('HTTP URI', () => {
  describe('parseQuery', () => {
    it('parse query string', () => {
      const parsed = parseQuery('?test=ok');
      expect(parsed).to.be.deep.equals({ test: 'ok' });
    });

    it('parse empty string return empty object', () => {
      expect(parseQuery('')).to.be.deep.equals({});
    });

    it('parse flat query string', () => {
      const parsed = parseQuery('a=b&c=d');
      expect(parsed).to.be.deep.equals({ a: 'b', c: 'd' });
    });

    it('handle escaped values', () => {
      const parsed = parseQuery('%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23=%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23');
      expect(parsed).to.be.deep.equals({ ';:@&=+$,/?%#': ';:@&=+$,/?%#' });
    });

    it('handles escaped slashes followed by a number', () => {
      const parsed = parseQuery('hello=%2Fen%2F1');
      expect(parsed.hello).to.be.equals('/en/1');
    });

    it('handle escaped square brackets', () => {
      expect(parseQuery('a%5B%5D=b')).to.be.deep.equals({ 'a[]': 'b' });
    });

    it('handles escaped unicode', () => {
      const parsed = parseQuery('%C3%B6=%C3%B6');
      expect(parsed).to.be.deep.equals({ 'ö': 'ö' });
    });
  });

  describe('renderQuery', () => {
    it('render query object', () => {
      const qs = renderQuery({ test: 'ok', js: 'yes' });
      expect(qs).to.be.equals('test=ok&js=yes');
    });

    it('handles escaped object', () => {
      const qs = renderQuery({';:@&=+$,/?%#': ';:@&=+$,/?%#'});
      expect(qs).to.be.equals('%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23=%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23');
    });

    it('handles unicode', () => {
      const qs = renderQuery({ 'ö': 'ö' });
      expect(qs).to.be.equals('%C3%B6=%C3%B6');
    });
  });
});
