var Vnode = require('../vdom/vnode'),
  {div, input} = require('../vdom/h'),
  renderService = require('../vdom/render')

function noop() {}

describe('virtual dom', () => {
  describe('dom attribute', () => {
    var parent, render
    beforeEach(() => {
      parent = document.createElement('div')
      render = renderService(noop)
    })
    it('when input readonly is true, attribute is present', () => {
      var vnode = input('.input', {readonly: true})
      render(parent, vnode)
      expect(vnode.dom.attributes["readonly"].nodeValue).toEqual('')
    })
    it('when input readonly is false, attribute not present', () => {
      var vnode = input('.input', {readonly: false})
      render(parent, vnode)
      expect(vnode.dom.attributes["readonly"]).toBeUndefined()
    })
    it('when input checked is true, attribute is not present', () => {
      var vnode = input('.input', {checked: true})
      render(parent, vnode)
      expect(vnode.dom.checked).toEqual(true)
      expect(vnode.dom.attributes['checked']).toBeUndefined()
    })
    it('when input checked is false, attribute is not present', () => {
      var vnode = input('.input', {checked: false})
      render(parent, vnode)
      expect(vnode.dom.checked).toEqual(false)
      expect(vnode.dom.attributes['checked']).toBeUndefined()
    })
  })
})
