import 'mocha';
import { expect } from 'chai';
import * as H from '../../src';

type TestEvent<A> = {
  tag: string;
  value: A;
};

interface PatchFn<A> {
  (old: Element | H.VNode<A>, vnode: H.VNode<A>): H.VNode<A>;
}

function mapClicked(ev: TestEvent<number>): TestEvent<string> {
  return { tag: ev.tag + '-mapped', value: ev.value.toString() };
}

describe('Genjer VNode', () => {
  let elm: Element | H.VNode<TestEvent<string>>;
  let results: TestEvent<string>[];
  function emit(e: TestEvent<string>) {
    results.push(e);
  }
  let patch: PatchFn<TestEvent<string>>;
  beforeEach(() => {
    elm = document.createElement('div');
    results = [];
    patch = H.initRenderer(emit);
  });

  it('Listener send event to emitter', () => {
    function handleClick(): TestEvent<string> {
      return {
        tag: 'click',
        value: 'clicked'
      }
    }
    let vnode = H.h('button', { events: { click: handleClick } }, 'btn');
    elm = patch(elm, vnode);
    let dom = elm.elm;
    (dom as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0]).to.be.deep.equals({ tag: 'click', value: 'clicked' });
  });

  it('Can map Vnode', () => {
    function handleClick(): TestEvent<number> {
      return {
        tag: 'click',
        value: 10
      }
    }
    let vnode = H.mapVNode(
      mapClicked,
      H.h('button', { events: { click: handleClick } }, 'btn')
    );
    let dom = patch(elm, vnode).elm;
    (dom as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0]).to.be.deep.equals({ tag: 'click-mapped', value: '10' });
  });

  it('Can map deep vnode', () => {
    function handleClick(): TestEvent<number> {
      return {
        tag: 'click',
        value: 10
      }
    }
    let vnode = H.mapVNode(
      mapClicked,
      H.h('div', [
        H.h('button', { events: { click: handleClick } }, 'btn')
      ])
    );
    let dom = patch(elm, vnode).elm;
    let btn = (dom as Element).querySelector('button');
    (btn as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0]).to.be.deep.equals({ tag: 'click-mapped', value: '10' });
  });

  it('Can map thunk', () => {
    function handleClick(): TestEvent<number> {
      return {
        tag: 'click',
        value: 10
      }
    }
    function renderBtn(num: number) {
      return H.h('button', { events: { click: handleClick } }, 'btn' + num)
    }
    let vnode1 = H.lazy('button', 2, renderBtn);
    let vnode2 = H.mapVNode(mapClicked, vnode1);
    let dom = patch(elm, vnode2).elm;
    (dom as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0]).to.be.deep.equals({ tag: 'click-mapped', value: '10' });
  });

  it('compose map', () => {
    function handleClick(): TestEvent<number> {
      return {
        tag: 'click',
        value: 10
      }
    }
    function addClicked(ev: TestEvent<number>): TestEvent<number> {
      return { tag: ev.tag, value: ev.value + 10 };
    }
    let vnode = H.h('button', { events: { click: handleClick } }, 'btn');
    let vnode2 = H.mapVNode(mapClicked, H.mapVNode(addClicked, vnode));
    let dom = patch(elm, vnode2).elm;
    (dom as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0]).to.be.deep.equals({ tag: 'click-mapped', value: '20' });
  });

  it('compose mapped functions (deep)', () => {
    function handleClick(): TestEvent<number> {
      return { tag: 'click', value: 10 };
    }
    function addClicked(ev: TestEvent<number>): TestEvent<number> {
      return { tag: ev.tag, value: ev.value + 10 };
    }
    let vnode = H.h('button', { events: { click: handleClick } }, 'btn');
    let vnode2 = H.h('div', H.mapVNode(addClicked, vnode));
    let vnode3 = H.mapVNode(mapClicked, vnode2);
    let dom = patch(elm, vnode3).elm;
    let btn = (dom as Element).querySelector('button');
    (btn as any).click();
    expect(results.length).to.be.equals(1);
    expect(results[0]).to.be.deep.equals({ tag: 'click-mapped', value: '20' });
  });
});
