var Vnode = require('../vdom/vnode'),
  {div, input} = require('../vdom/h'),
  {readonly, checked} = require('../vdom/attribute'),
  event = require('../vdom/event'),
  renderService = require('../vdom/render')

function noop() {}

describe('virtual dom', () => {
  describe('dom attribute', () => {
    var $window, $parent, render
    beforeEach(() => {
      $window = window
      $parent = $window.document.createElement('div')
      render = renderService($window)(noop)
    })
    it('when input readonly is true, attribute is present', () => {
      var vnode = input('.input', [readonly(true)])
      render($parent, vnode)
      expect(vnode.dom.attributes["readonly"].nodeValue).toEqual('')
    })
    it('when input readonly is false, attribute not present', () => {
      var vnode = input('.input', [readonly(false)])
      render($parent, vnode)
      expect(vnode.dom.attributes["readonly"]).toBeUndefined()
    })
    it('when input checked is true, attribute is not present', () => {
      var vnode = input('.input', [checked(true)])
      render($parent, vnode)
      expect(vnode.dom.checked).toEqual(true)
      expect(vnode.dom.attributes['checked']).toBeUndefined()
    })
    it('when input checked is false, attribute is not present', () => {
      var vnode = input('.input', [checked(false)])
      render($parent, vnode)
      expect(vnode.dom.checked).toEqual(false)
      expect(vnode.dom.attributes['checked']).toBeUndefined()
    })
  })
})
