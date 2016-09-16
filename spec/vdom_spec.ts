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
  describe('create element', () => {
    let parent: Element
    let render: any
    beforeEach(() => {
      parent = document.createElement('div')
      render = renderService({ tagger: noop, parent: null })
    })
    it('has tag', () => {
      let vnode = h('div')
      render(parent, [vnode]);
      expect((vnode.dom as HTMLElement).tagName).toEqual('DIV')
    })
    it('has id', () => {
      let vnode = h('span#identity')
      render(parent, [vnode]);
      expect((vnode.dom as HTMLElement).tagName).toEqual('SPAN')
      expect((vnode.dom as HTMLElement).id).toEqual('identity')
    })
    it('create style', () => {
      let vnode = h('div', { style: { backgroundColor: "red" } })
      render(parent, [vnode]);
      expect((vnode.dom as HTMLElement).nodeName).toEqual('DIV')
      expect((vnode.dom as HTMLElement).style.backgroundColor).toEqual('red')
    })
    it('create children', () => {
      let vnode = h('div', [h('header'), h('article')])
      render(parent, [vnode]);
      let dom = vnode.dom as HTMLElement
      expect(dom.nodeName).toEqual('DIV')
      expect(dom.childNodes.length).toEqual(2)
      expect(dom.childNodes[0].nodeName).toEqual('HEADER')
      expect(dom.childNodes[1].nodeName).toEqual('ARTICLE')
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
    it('handle transitionend event', () => {
      let vnode = h('div', { ontransitionend: clickHandler })
      let event = document.createEvent('HTMLEvents')
      event.initEvent('transitionend', true, true)
      render(parent, [vnode]);
      (vnode.dom as HTMLElement).dispatchEvent(event)
      expect(clickHandler.calls.count()).toEqual(1)
      expect(clickHandler).toHaveBeenCalledWith(event)
      expect(tagger.tagger).toHaveBeenCalledWith('msg')
    })
    it('handle tagger vnode event', () => {
      let tag = jasmine.createSpy('tag').and.returnValue('tagmsg')
      let vnode = h('div', { onclick: clickHandler }).map(tag)
      let event = document.createEvent("MouseEvents")
      event.initEvent('click', true, true)
      render(parent, [vnode]);
      (vnode.dom as HTMLElement).dispatchEvent(event)
      expect(clickHandler).toHaveBeenCalledWith(event)
      expect(clickHandler.calls.count()).toEqual(1)
      expect(tag).toHaveBeenCalledWith('msg')
      expect(tag.calls.count()).toEqual(1)
      expect(tagger.tagger).toHaveBeenCalledWith('tagmsg')
      expect(tagger.tagger.calls.count()).toEqual(1)
    })
  })
})
