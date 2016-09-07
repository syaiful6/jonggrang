import { render as renderService } from '../src/vdom/render'
import { h } from '../src/vdom/h'

function noop() {}

describe('virtual dom', () => {
  describe('dom attribute', () => {
    let parent: Element
    let render: any
    beforeEach(() => {
      parent = document.createElement('div')
      render = renderService({ tagger: noop, parent: null })
    })
    it('when input readonly is true, attribute is present', () => {
      let vnode = h('input.input', {readonly: true})
      render(parent, vnode)
      expect((vnode.dom as any).attributes["readonly"].nodeValue).toEqual('')
    })
    it('when input readonly is false, attribute not present', () => {
      let vnode = h('input.input', {readonly: false})
      render(parent, vnode)
      expect((vnode.dom as any).attributes["readonly"]).toBeUndefined()
    })
    it('when input checked is true, attribute is not present', () => {
      let vnode = h('input.input', {checked: true})
      render(parent, vnode)
      expect((vnode.dom as any).checked).toEqual(true)
      expect((vnode.dom as any).attributes['checked']).toBeUndefined()
    })
    it('when input checked is false, attribute is not present', () => {
      let vnode = h('input.input', {checked: false})
      render(parent, vnode)
      expect((vnode.dom as any).checked).toEqual(false)
      expect((vnode.dom as any).attributes['checked']).toBeUndefined()
    })
  })
})
