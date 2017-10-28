import 'mocha';
import { expect } from 'chai';
import * as E from '../../src/basic/event';
import { ref } from '../../src/basic/core';
import { mapProp, ElemRef } from '../../src/dom/prop';
import { buildProp } from '../../src';

type TestEvent<A> = {
  tag: string;
  value: A;
};

describe('event Listener', () => {
  let elem: Element;
  let results: TestEvent<string>[] = [];
  function emit(e: TestEvent<string>) {
    results.push(e);
  };
  beforeEach(() => {
    elem = document.createElement('div');
    results = [];
  });

  it('attach listener', () => {
    function handleClick(ev: MouseEvent): TestEvent<string> {
      return {
        tag: 'click',
        value: 'clicked'
      }
    };
    const build = buildProp(emit);
    const evProp = E.onClick(handleClick);
    build(elem, [evProp]);
    (elem as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0].tag).to.be.equals('click');
    expect(results[0].value).to.be.equals('clicked');
  });

  it('work with event handler interface', () => {
    // event handler interface is just object with handleEvent method
    const eventHandler = {
      handleEvent(ev: MouseEvent) {
        return {
          tag: 'click',
          value: 'clicked'
        };
      }
    };
    const build = buildProp(emit);
    const evProp = E.onClick(eventHandler);
    build(elem, [evProp]);
    (elem as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0].tag).to.be.equals('click');
    expect(results[0].value).to.be.equals('clicked');
  });

  it('mapProp work', () => {
    function handleClick(ev: MouseEvent): TestEvent<string> {
      return {
        tag: 'click',
        value: 'clicked'
      }
    };
    const build = buildProp(emit);
    const evProp = E.onClick(handleClick);
    let mapped = mapProp(x => {
      return {
        tag: x.tag + '-mapped',
        value: x.value + '-mapped'
      }
    }, evProp);
    build(elem, [mapped]);
    (elem as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0].tag).to.be.equals('click-mapped');
    expect(results[0].value).to.be.equals('clicked-mapped');
  });

  it('doesnt emit if event handler return void or null', () => {
    function handleClick(ev: MouseEvent): TestEvent<string> | void{
    };
    const build = buildProp(emit);
    const evProp = E.onClick(handleClick);
    build(elem, [evProp]);
    (elem as any).click();
    expect(results.length).to.be.equals(0);
  });

  it('update event listener correctly', () => {
    function handleClick0(ev: MouseEvent): TestEvent<string> | void {
      return {
        tag: 'click0',
        value: 'clicked0'
      }
    };

    function handleClick1(ev: MouseEvent): TestEvent<string> | void {
      return {
        tag: 'click1',
        value: 'clicked1'
      }
    };
    const build = buildProp(emit);
    const evProp = E.onClick(handleClick0);
    const machine = build(elem, [evProp]);
    (elem as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0].tag).to.be.equals('click0');
    expect(results[0].value).to.be.equals('clicked0');
    machine.step([E.onClick(handleClick1)]);
    (elem as any).click();
    expect(results.length).to.be.equals(2);
    expect(results[1].tag).to.be.equals('click1');
    expect(results[1].value).to.be.equals('clicked1');
  });

  describe('Hook events', () => {
    it('call ref on created', () => {
      function refElem(rf: ElemRef<Element>) {
        return {
          tag: rf.kind,
          value: rf.value.tagName
        };
      }
      const build = buildProp(emit);
      const refProp = ref(refElem);
      build(elem, [refProp]);
      expect(results.length).to.be.equals(1);
      expect(results[0].tag).to.be.equals('created');
      expect(results[0].value).to.be.equals('DIV');
    });

    it('call ref on removed', () => {
      function refElem(rf: ElemRef<Element>) {
        return {
          tag: rf.kind,
          value: rf.value.tagName
        };
      }
      const build = buildProp(emit);
      const refProp = ref(refElem);
      const machine = build(elem, [refProp]);
      expect(results.length).to.be.equals(1);
      expect(results[0].tag).to.be.equals('created');
      expect(results[0].value).to.be.equals('DIV');
      machine.halt();
      expect(results.length).to.be.equals(2);
      expect(results[1].tag).to.be.equals('removed');
      expect(results[1].value).to.be.equals('DIV');
    });

    it('didn\'t emit if ref hook return void', () => {
      function refElem(rf: ElemRef<Element>): TestEvent<string> | void {
        if (rf.kind === 'removed') {
          return {
            tag: rf.kind,
            value: rf.value.tagName
          };
        }
      }
      const build = buildProp(emit);
      const refProp = ref(refElem);
      const machine = build(elem, [refProp]);
      expect(results.length).to.be.equals(0);
      machine.halt();
      expect(results.length).to.be.equals(1);
      expect(results[0].tag).to.be.equals('removed');
      expect(results[0].value).to.be.equals('DIV');
    });

    it('work correctly when remove the hook', () => {
      function refElem(rf: ElemRef<Element>) {
        return {
          tag: rf.kind,
          value: rf.value.tagName
        };
      }
      const build = buildProp(emit);
      const refProp = ref(refElem);
      let machine = build(elem, [refProp]);
      expect(results.length).to.be.equals(1);
      expect(results[0].tag).to.be.equals('created');
      expect(results[0].value).to.be.equals('DIV');
      machine = machine.step([]);
      machine.halt();
      expect(results.length).to.be.equals(1);
      expect(results[0].tag).to.be.equals('created');
      expect(results[0].value).to.be.equals('DIV');
    });

    it('mapProp work with ref', () => {
      function refElem(rf: ElemRef<Element>): TestEvent<string> {
        return {
          tag: rf.kind,
          value: rf.value.tagName
        }
      }
      function transformRefElem(t: TestEvent<string>): TestEvent<string> {
        return {
          tag: t.tag + '-mapped',
          value: t.value.toLowerCase()
        };
      }
      const build = buildProp(emit);
      const refProp = ref(refElem);
      const mappedRef = mapProp(transformRefElem, refProp);
      build(elem, [mappedRef]);
      expect(results.length).to.be.equals(1);
      expect(results[0].tag).to.be.equals('created-mapped');
      expect(results[0].value).to.be.equals('div');
    });
  });
});
