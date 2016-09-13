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
  describe('selector', () => {
    it('can create vnode with proper tag', () => {
      let vnode = h('button')
      expect(vnode.tag).toEqual('button')
    })
    it('can create vnode with class in selector', () => {
      let vnode = h('button.primary')
      expect(vnode.tag).toEqual('button')
      expect((vnode.data as VnodeData).className).toEqual('primary')
    })
    it('can create vnode with many classes in selector', () => {
      let vnode = h('button.primary.button.hello')
      expect(vnode.tag).toEqual('button')
      expect((vnode.data as VnodeData).className).toEqual('primary button hello')
    })
    it('can create vnode with id in selector', () => {
      let vnode = h('button#btn')
      expect(vnode.tag).toEqual('button')
      expect((vnode.data as VnodeData).id).toEqual('btn')
    })
    it('can create vnode with mixed selector', () => {
      let vnode = h('button#btn.primary')
      expect(vnode.tag).toEqual('button')
      expect((vnode.data as VnodeData).id).toEqual('btn')
      expect((vnode.data as VnodeData).className).toEqual('primary')
    })
  })
  describe('vnode data', () => {
    it('handles falsy string data', () => {
      let vnode = h('div', { className: '' })
      expect((vnode.data as VnodeData).className).toEqual('')      
    })
    it('handle boolean data', () => {
      let vnode = h('input', { readonly: true })
      expect((vnode.data as VnodeData).readonly).toEqual(true)
    })
    it('handle key in vnode data', () => {
      let vnode = h('li', { key: 1 })
      expect(vnode.key).toEqual(1)
      expect(vnode.tag).toEqual('li')
    })
  })
  describe('children', () => {
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
    it('handle vnode with props and text content in string', () => {
      let vnode = h('div', {}, 'hello')
      expect(vnode.text).toEqual('hello')
    })
  })
})