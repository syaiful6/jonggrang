import { h } from '../src/vdom/h'
import { Vnode, VnodeData } from '../src/vdom/vnode'

function getChild(vnode: Vnode, index: number) {
  if (typeof vnode === 'string') {
    return h('div#error')
  }
  return vnode
    && vnode.children
    && vnode.children.length >= index + 1
    && vnode.children[index] as Vnode
    || h('div#error')
}

describe('hyperscript', () => {
  it('can create vnode with proper tag', () => {
    let vnode = h('button')
    expect(vnode.tag).toEqual('button')
  })
  it('can create vnode with selector', () => {
    let vnode = h('button#btn.primary')
    expect(vnode.tag).toEqual('button')
    expect((vnode.data as VnodeData).className).toEqual('primary')
    expect((vnode.data as VnodeData).id).toEqual('btn')
  })
  it('can create vnode with children', () => {
    let vnode = h('div', [h('span#hello'), h('b.world')])
    expect(vnode.tag).toEqual('div')
    expect(getChild(vnode, 0).tag).toEqual('span')
    expect(getChild(vnode, 1).tag).toEqual('b')
  })
  it('handle single string children', () => {
    let vnode = h('div', ['foo'])
    expect(vnode.text).toEqual('foo')
  })
  it('handle single numeric children', () => {
    let vnode = h('div', 1)
    expect(vnode.text).toEqual('1')
  })
})