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

    it('handle escaped values', () => {
      const parsed = parseQuery('?%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23=%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23');
      expect(parsed).to.be.deep.equals({ ";:@&=+$,/?%#": ";:@&=+$,/?%#" });
    });

    it('handles escaped slashes followed by a number', () => {
      const parsed = parseQuery('?hello=%2Fen%2F1');
      expect(parsed.hello).to.be.equals('/en/1');
    });

    it('handle escaped square brackets', () => {
      expect(parseQuery('?a%5B%5D=b')).to.be.deep.equals({ 'a': ['b'] });
    });

    it('handles escaped unicode', () => {
      const parsed = parseQuery('?%C3%B6=%C3%B6');
      expect(parsed).to.be.deep.equals({ 'ö': 'ö' });
    });

    it('handles unicode', () => {
      const parsed = parseQuery('?ö=ö');
      expect(parsed).to.be.deep.equals({ 'ö': 'ö' });
    });

    it('parse without question mark', () => {
      const parsed = parseQuery('test=ok');
      expect(parsed).to.be.deep.equals({ test: 'ok' });
    });

    it('parse nested object', () => {
      const parsed = parseQuery('a[b]=x&a[c]=y');
      expect(parsed).to.be.deep.equals({ a: { b: 'x', c: 'y' } });
    });

    it('parse nested deep object', () => {
      const parsed = parseQuery('a[b][c]=x&a[b][d]=y');
      expect(parsed).to.be.deep.equals({ a: { b: { c: 'x', d: 'y' } } });
    });

    it('parse nested array', () => {
      const parsed = parseQuery('a[0]=x&a[1]=y');
      expect(parsed).to.be.deep.equals({ a: ['x', 'y'] });
    });

    it('parses deep nested array', () => {
      const parsed = parseQuery('a[0][0]=x&a[0][1]=y');
      expect(parsed).to.be.deep.equals({ a: [['x', 'y']]})
    });

    it('parses deep nested object in array', () => {
      const parsed = parseQuery('a[0][c]=x&a[0][d]=y');
      expect(parsed).to.be.deep.equals({ a: [{ c: 'x', d: 'y' }]});
    });

    it('parses deep nested array in object', () => {
      const parsed = parseQuery('a[b][0]=x&a[b][1]=y');
      expect(parsed).to.be.deep.equals({ a: { b: ['x', 'y'] }});
    });

    it('parses array without index', () => {
      const parsed = parseQuery('a[]=x&a[]=y&b[]=m&b[]=n');
      expect(parsed).to.be.deep.equals({ a: ['x', 'y'], b: ['m', 'n'] });
    });

    it('cast to boolean', () => {
      const parsed = parseQuery('a[]=true&a[]=false');
      expect(parsed).to.be.deep.equals({ a: [true, false]});
    });

    it('doesn\'t cast number, NaN and date', () => {
      const parsed = parseQuery('a=1&b=NaN&c=1970-01-01');
      expect(parsed).to.be.deep.equals({ a: '1', b: 'NaN', c: '1970-01-01' });
    })
  });

  describe('renderQuery', () => {
    it('render query object', () => {
      const qs = renderQuery({ test: 'ok', js: 'yes' });
      expect(qs).to.be.equals('test=ok&js=yes');
    });

    it('handles escaped object', () => {
      const qs = renderQuery({";:@&=+$,/?%#": ";:@&=+$,/?%#"});
      expect(qs).to.be.equals('%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23=%3B%3A%40%26%3D%2B%24%2C%2F%3F%25%23');
    });

    it('handles unicode', () => {
      const qs = renderQuery({ 'ö': 'ö' });
      expect(qs).to.be.equals('%C3%B6=%C3%B6');
    });

    it('handles nested object', () => {
      const qs = renderQuery({a: {b: 1, c: 2}});
      expect(qs).to.be.equals('a%5Bb%5D=1&a%5Bc%5D=2');
    });

    it('handles deep nested object', () => {
      const qs = renderQuery({ a: { b: { c: 1, d: 2 }}});
      expect(qs).to.be.equals('a%5Bb%5D%5Bc%5D=1&a%5Bb%5D%5Bd%5D=2');
    });

    it('handles nested array', () => {
      const qs = renderQuery({ a: ['x', 'y']});
      expect(qs).to.be.equals('a%5B0%5D=x&a%5B1%5D=y');
    });

    it('handles array w/ dupe values', () => {
      const qs = renderQuery({a: ['x', 'x']});
      expect(qs).to.be.equals('a%5B0%5D=x&a%5B1%5D=x');
    });

    it('handles deep nested array', () => {
      const qs = renderQuery({ a: [['x', 'y']]});
      expect(qs).to.be.equals('a%5B0%5D%5B0%5D=x&a%5B0%5D%5B1%5D=y');
    });

    it('handles deep nested array in object', () => {
      const qs = renderQuery({ a: { b: ['x', 'y']}});
      expect(qs).to.be.equals('a%5Bb%5D%5B0%5D=x&a%5Bb%5D%5B1%5D=y');
    });

    it('handles deep nested object in array', () => {
      const qs = renderQuery({ a: [{b: 1, c: 2}]});
      expect(qs).to.be.equals('a%5B0%5D%5Bb%5D=1&a%5B0%5D%5Bc%5D=2');
    });

    it('handles date', () => {
      const qs = renderQuery({ a: new Date(0) });
      expect(qs).to.be.equals('a=' + encodeURIComponent(new Date(0).toString()));
    });
  });
});
