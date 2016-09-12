import { render as renderService } from '../src/vdom/render'
import { h } from '../src/vdom/h'
import { Vnode } from '../src/vdom/vnode'

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
  describe('vnode text', () => {
    let parent: Element
    let render: any
    beforeEach(() => {
      parent = document.createElement('div')
      render = renderService({ tagger: noop, parent: null })
    })
    it('can render numeric like string', () => {
      let vnode = new Vnode('#', undefined, undefined, '0', undefined, undefined)
      render(parent, [vnode])
      expect((vnode.dom as Text).nodeName === '#text' && (vnode.dom as Text).nodeValue === '0').toEqual(true)
    })
    it('can render empty string', () => {
      let vnode = new Vnode('#', undefined, undefined, '', undefined, undefined)
      render(parent, [vnode])
      expect((vnode.dom as Text).nodeName === '#text' && (vnode.dom as Text).nodeValue === '').toEqual(true)
    })
    it('can render boolean', () => {
      let vnode = new Vnode('#', undefined, undefined, 'true', undefined, undefined)
      render(parent, [vnode])
      expect((vnode.dom as Text).nodeName === '#text' && (vnode.dom as Text).nodeValue === 'true').toEqual(true)
    })
  })
  describe('vdom event', () => {
    let parent: Element
    let render: any
    let clickHandler: any
    let tagger: any
    beforeEach(() => {
      parent = document.createElement('div')
      tagger = {
        tagger: noop
        , parent: null
      }
      spyOn(tagger, 'tagger')
      render = renderService(tagger)
      clickHandler = jasmine.createSpy('clickHandler').and.returnValue('msg')
    })
    it('handles onclick', () => {
      let vdom = h('button', { onclick: clickHandler })
      let event = document.createEvent("MouseEvents")
      event.initEvent('click', true, true)
      render(parent, [vdom]);
      (vdom.dom as Element).dispatchEvent(event)
      expect(clickHandler).toHaveBeenCalledWith(event)
      expect(tagger.tagger).toHaveBeenCalledWith('msg')
    })
    it('handle remove events', () => {
      let vdom = h('button', { onclick: clickHandler })
      let update = h('button', {})
      let event = document.createEvent("MouseEvents")
      render(parent, [vdom])
      render(parent, [update])
      event.initEvent('click', true, true);
      (vdom.dom as Element).dispatchEvent(event)
      expect(clickHandler.calls.count()).toEqual(0)
      expect(tagger.tagger.calls.count()).toEqual(0)
    })
    it('event handler array', () => {
      let handler = jasmine.createSpy('arrayHandler')
      let vdom = h('button', { onclick: [handler, 'foo'] })
      let event = document.createEvent("MouseEvents")
      render(parent, [vdom])
      event.initEvent('click', true, true);
      (vdom.dom as Element).dispatchEvent(event)
      expect(handler).toHaveBeenCalledWith('foo', event)
      expect(handler.calls.count()).toEqual(1)
    })
  })
})
