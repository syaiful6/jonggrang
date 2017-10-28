import 'mocha';
import { expect } from 'chai';
import * as P from '../../src/basic/properties';
import { buildProp } from '../../src';

const doNothing = () => ({});

describe('VDom Properties', () => {
  describe('VProp combinator', () => {
    it('classList only print key that have value boolean true', () => {
      const c = P.classList({
        disabled: true,
        enabled: false,
        active: true
      });

      expect(c.key).to.be.equals('className');
      expect(c.value).to.be.equals('disabled active');
    });

    it('Styles correctly combined', () => {
      const st = P.styles({
        display: 'block',
        width: '100px',
        position: 'relative'
      });

      expect(st.key).to.be.equals('style');
      expect(st.value).to.be.equals('display: block; width: 100px; position: relative;');
    });

    it('autocomplete correctly rendered', () => {
      const at = P.autocomplete(true);
      expect(at.key).to.be.equals('autocomplete');
      expect(at.value).to.be.equals('on');

      const af = P.autocomplete(false);
      expect(af.value).to.be.equals('off');
    });
  });

  describe('Building property', () => {
    let elem: Element;
    const build = buildProp(doNothing);
    beforeEach(() => {
      elem = document.createElement('div');
    });

    it('set attribute single', () => {
      const cles = P.classList({
        disabled: true,
        enabled: false,
        active: true
      });
      build(elem, [cles]);
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('active')).to.be.true;
    });

    it('set multiple attribute correcly', () => {
      const attr = [
        P.id('test')
        , P.className('foo')
        , P.styles({ color: 'blue' })
      ];
      build(elem, attr);
      expect(elem.id).to.be.equals('test');
      expect(elem.className).to.be.equals('foo');
      expect((elem as any).style.color).to.be.equals('blue');
    });

    it('update attribute correctly', () => {
      const cles = P.classList({
        disabled: true,
        enabled: false,
        active: true
      });
      let machine = build(elem, [cles]);
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('active')).to.be.true;
      expect(elem.classList.contains('enabled')).to.be.false;
      machine.step([
        P.classList({
          disabled: true,
          enabled: false,
          active: false
        })
      ]);
      expect(elem.classList.contains('active')).to.be.false;
    });

    it('update with new attribute', () => {
      const cles = P.classList({
        disabled: true,
        enabled: false
      });
      let machine = build(elem, [cles]);
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('enabled')).to.be.false;
      machine.step([
        P.classList({
          disabled: true,
          enabled: false,
          active: true
        })
      ]);
      expect(elem.classList.contains('active')).to.be.true;
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('enabled')).to.be.false;
    });

    it('perceive memoized class list', () => {
      const clsess = {
        disabled: true,
        enabled: false,
        active: true
      };
      const machine = build(elem, [P.classList(clsess)]);
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('active')).to.be.true;
      expect(elem.classList.contains('enabled')).to.be.false;
      machine.step([
        P.classList(clsess)
      ]);
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('active')).to.be.true;
      expect(elem.classList.contains('enabled')).to.be.false;
    });

    it('can remove class List', () => {
      const clsess = {
        disabled: true,
        enabled: false,
        active: true
      };
      const machine = build(elem, [P.classList(clsess)]);
      expect(elem.classList.contains('disabled')).to.be.true;
      expect(elem.classList.contains('active')).to.be.true;
      expect(elem.classList.contains('enabled')).to.be.false;
      machine.step([]);
      expect(elem.classList.contains('disabled')).to.be.false;
      expect(elem.classList.contains('active')).to.be.false;
      expect(elem.classList.contains('enabled')).to.be.false;
    });

    it('work even if classList empty', () => {
      const cless = {
        disabled: false,
        focus: false
      };
      const machine = build(elem, [P.classList(cless)]);
      expect(elem.classList.contains('disabled')).to.be.false;
      expect(elem.classList.contains('focus')).to.be.false;
      machine.step([
        P.classList({
          disabled: false,
          focus: true
        })
      ]);
      expect(elem.classList.contains('disabled')).to.be.false;
      expect(elem.classList.contains('focus')).to.be.true;
    })
  });
});
