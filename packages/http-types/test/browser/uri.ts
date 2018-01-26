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
      const parsed = parseQuery('?a=b&c=d');
      expect(parsed).to.be.deep.equals({ a: 'b', c: 'd' });
    });
  });

  describe('renderQuery', () => {
    it('render query object', () => {
      const qs = renderQuery({ test: 'ok', js: 'yes' });
      expect(qs).to.be.equals('test=ok&js=yes');
    });
  });
});
