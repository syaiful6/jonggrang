import { VnodeData, Vnode, blueprint } from '../src'

describe('blueprint', () => {
  describe('dynamic tag', () => {
    let tpl: (...args: any[]) => Vnode
    beforeEach(() => {
      tpl = blueprint({
        tag: { index: 0 }
        , data: { className: 'hey' }
      })
    })
    it('can create dynamic tag', () => {
      let div = tpl('div')
      expect(div.tag).toEqual('div')
      expect((div.data as VnodeData).className).toEqual('hey')
    })
    it('can create dynamic tag with selector', () => {
      let div = tpl('div#hello.world')
      expect(div.tag).toEqual('div')
      expect((div.data as VnodeData).id).toEqual('hello')
      expect((div.data as VnodeData).className).toEqual('world hey')
    })
  })
})