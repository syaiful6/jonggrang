import 'mocha';
import { expect } from 'chai';
import { VDomSpec, buildVDom, createDocumentSpec, Prop, buildProp } from '../../src';
import * as H from '../../src/basic';
import * as K from '../../src/basic/element/keyed';
import * as P from '../../src/basic/properties';
import { buildThunk, Thunk } from '../../src/basic/thunk';

function createVDomSpec<A>(emit: (a: A) => void): VDomSpec<Prop<A>[], Thunk<A>> {
  return {
    document: createDocumentSpec(document),
    buildWidget: buildThunk,
    buildAttributes: buildProp(emit)
  };
}

const doNothing = () => ({});

const defaultSpec = createVDomSpec(doNothing);

function iden<A>(a: A): A {
  return a;
}

function shuffleArray<A>(array: A[]) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
}

describe('VNode', () => {
  describe('DSL', () => {
    it('Correctly create vnode', () => {
      const vt = H.h('div');
      expect(vt.elem.tag).to.be.equals('div');
    });

    it('can create vnode with childs', () => {
      const vt = H.h('div', [H.h('span#hello'), H.h('b#world')]);
      expect(vt.elem.tag).to.be.equals('div');
      expect((vt.childs[0] as any).elem.tag).to.be.equal('span#hello');
      expect((vt.childs[1] as any).elem.tag).to.be.equal('b#world');
    });
  });

  describe('created element', () => {
    it('tagName', () => {
      const machine = buildVDom(defaultSpec, H.h('div'));
      expect((machine.result as Element).tagName).to.equals('DIV', 'Node tagName not equals');
    });

    it('has id', () => {
      const machine = buildVDom(defaultSpec, H.h('div', [H.prop('id', 'unique')], []));

      expect((machine.result as Element).id).to.equals('unique');
      expect((machine.result as Element).tagName).to.equals('DIV', 'Node tagName not equals');
    });

    it('can create text element', () => {
      const machine = buildVDom(defaultSpec, H.h('div', [H.text('Hi there')]));

      expect((machine.result as Element).innerHTML).to.equals('Hi there');
    });

    it('can create span and text', () => {
      const machine = buildVDom(
        defaultSpec,
        H.h('div', [
          H.h('span'),
          H.text('hi there')
        ]));

      expect((machine.result as any).childNodes[0].tagName).to.equals('SPAN');
      expect((machine.result as any).childNodes[1].textContent).to.equals('hi there');
    });

    it('receive class in selector', () => {
      const vt = H.h('div', [H.h('i.am.a.class')]);
      const machine = buildVDom(defaultSpec, vt);
      const elem = machine.result;
      expect((elem.firstChild as Element).classList.contains('am')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('a')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('class')).to.be.true;
    });

    it('receives classes in class property', () => {
      const vt = H.h('div', [
        H.h('i', [P.classList({ am: true, a: true, class: true, note: false })], [])
      ]);
      const machine = buildVDom(defaultSpec, vt);
      const elem = machine.result;
      expect((elem.firstChild as Element).classList.contains('am')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('a')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('class')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('note')).to.be.false;
    });

    it('handle both classes in selector and property', () => {
      const vt = H.h('div', [
        H.h('i.am', [P.classList({ classes: true })], [])
      ]);
      const machine = buildVDom(defaultSpec, vt);
      const elem = machine.result;
      expect((elem.firstChild as Element).classList.contains('am')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('classes')).to.be.true;
    });

    it('mapping vnode can rendered', () => {
      const vt = H.mapVDom(iden, H.h('div', [
        H.h('i.am', [P.classList({ classes: true })], [])
      ]));
      const machine = buildVDom(defaultSpec, vt);
      const elem = machine.result;
      expect((elem.firstChild as Element).classList.contains('am')).to.be.true;
      expect((elem.firstChild as Element).classList.contains('classes')).to.be.true;
    });
  });

  describe('text node', () => {
    it('create text node', () => {
      const te = H.text('hii');
      const machine = buildVDom(defaultSpec, te);
      const elem = machine.result;
      expect(elem.nodeName).to.be.equals('#text');
      expect(elem.nodeValue).to.be.equals('hii');
    });

    it('can update text node', () => {
      const vtext0 = H.text('foo');
      const vtext1 = H.text('baz');
      let machine = buildVDom(defaultSpec, vtext0);
      const elem = machine.result;
      expect(elem.nodeName).to.be.equals('#text');
      expect(elem.nodeValue).to.be.equals('foo');
      machine.step(vtext1);
      expect(elem.nodeName).to.be.equals('#text');
      expect(elem.nodeValue).to.be.equals('baz');
    });

    it('work when vnode text is same', () => {
      const te = H.text('hii');
      const machine = buildVDom(defaultSpec, te);
      const elem = machine.result;
      expect(elem.nodeName).to.be.equals('#text');
      expect(elem.nodeValue).to.be.equals('hii');
      machine.step(H.text('hii'));
      expect(elem.nodeName).to.be.equals('#text');
      expect(elem.nodeValue).to.be.equals('hii');
    });

    it('halt machine remove node from parent', () => {
      const te = H.text('hii');
      const machine = buildVDom(defaultSpec, te);
      const elem = machine.result;
      document.body.appendChild(elem);
      machine.halt();
      expect(document.body.lastChild).to.not.equals(elem);
    });

    it('work when updating to different vnode', () => {
      const vtext = H.text('hii');
      const div = H.mapVDom(iden, H.h('div'));
      let machine = buildVDom(defaultSpec, vtext);
      let elem = machine.result;
      expect(elem.nodeName).to.be.equals('#text');
      expect(elem.nodeValue).to.be.equals('hii');
      machine = machine.step(div);
      elem = machine.result;
      expect((elem as any).tagName).to.be.equals('DIV');
    });
  });

  describe('input', () => {
    it('maintain focus', () => {
      const render = (item: { id: string, tag: string }) => {
        return H.h(item.tag, [P.id(item.id)], []);
      }
      const data = [
        { id: 'input-item', tag: 'input' },
        { id: 'a-item', tag: 'a' },
        { id: 'b-item', tag: 'b' }
      ];
      const vnode = K.div([P.className('keyed-element')], K.withKeys(x => x.id, render, data));
      let machine = buildVDom(defaultSpec, vnode);
      let elem = machine.result;
      expect((elem as Element).tagName).to.be.equal('DIV');
      window.document.body.appendChild(elem);
      const input = (elem as Element).querySelector('#input-item');
      expect(input).to.be.not.null;
      (input as any).focus();
      let data2 = data.slice();
      shuffleArray(data2);
      machine = machine.step(K.div([P.className('keyed-element')], K.withKeys(x => x.id, render, data2)));
      elem = machine.result;
      expect(document.activeElement).to.be.equals(input);
      window.document.body.removeChild(elem);
    });

    it('syncs input value if DOM value differs from vdom value', () => {
      function onInput() { }
      let vnode = H.h('input', [P.value('aaa'), H.on('input', onInput)], []);
      let vnode2 = H.h('input', [P.value('aaa'), H.on('input', onInput)], []);
      let machine = buildVDom(defaultSpec, vnode);
      let elem = machine.result;
      window.document.body.appendChild(elem);

      const ev = document.createEvent('KeyboardEvent');
      ev.initEvent('input', true, true);
      (elem as any).focus();
      (elem as any).value += 'a';
      elem.dispatchEvent(ev);

      machine.step(vnode2);
      elem = machine.result;
      expect((elem as any).value).to.be.equals('aaa');
      window.document.body.removeChild(elem);
    });
  });
});
