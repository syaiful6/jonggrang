import { VDom, VElem, Prop } from '../types';
import * as V from '../core';

export function a<A>(childs: VDom<A>[]): VElem<A>;
export function a<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function a<A>(attr: any, childs?: any): VElem<A> {
  return V.h('a', attr, childs);
}

export function abbr<A>(childs: VDom<A>[]): VElem<A>;
export function abbr<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function abbr<A>(attr: any, childs?: any): VElem<A> {
  return V.h('abbr', attr, childs);
}

export function address<A>(childs: VDom<A>[]): VElem<A>;
export function address<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function address<A>(attr: any, childs?: any): VElem<A> {
  return V.h('address', attr, childs);
}

export function area<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('area', attr, [])
}

export function article<A>(childs: VDom<A>[]): VElem<A>;
export function article<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function article<A>(attr: any, childs?: any): VElem<A> {
  return V.h('article', attr, childs);
}

export function aside<A>(childs: VDom<A>[]): VElem<A>;
export function aside<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function aside<A>(attr: any, childs?: any): VElem<A> {
  return V.h('aside', attr, childs);
}

export function audio<A>(childs: VDom<A>[]): VElem<A>;
export function audio<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function audio<A>(attr: any, childs?: any): VElem<A> {
  return V.h('audio', attr, childs);
}

export function b<A>(childs: VDom<A>[]): VElem<A>;
export function b<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function b<A>(attr: any, childs?: any): VElem<A> {
  return V.h('b', attr, childs);
}

export function base<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('base', attr, [])
}

export function bdi<A>(childs: VDom<A>[]): VElem<A>;
export function bdi<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function bdi<A>(attr: any, childs?: any): VElem<A> {
  return V.h('bdi', attr, childs);
}

export function bdo<A>(childs: VDom<A>[]): VElem<A>;
export function bdo<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function bdo<A>(attr: any, childs?: any): VElem<A> {
  return V.h('bdo', attr, childs);
}

export function blockquote<A>(childs: VDom<A>[]): VElem<A>;
export function blockquote<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function blockquote<A>(attr: any, childs?: any): VElem<A> {
  return V.h('blockquote', attr, childs);
}

export function body<A>(childs: VDom<A>[]): VElem<A>;
export function body<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function body<A>(attr: any, childs?: any): VElem<A> {
  return V.h('body', attr, childs);
}

export function br<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('br', attr, [])
}

export function button<A>(childs: VDom<A>[]): VElem<A>;
export function button<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function button<A>(attr: any, childs?: any): VElem<A> {
  return V.h('button', attr, childs);
}

export function canvas<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('canvas', attr, [])
}

export function cite<A>(childs: VDom<A>[]): VElem<A>;
export function cite<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function cite<A>(attr: any, childs?: any): VElem<A> {
  return V.h('cite', attr, childs);
}

export function code<A>(childs: VDom<A>[]): VElem<A>;
export function code<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function code<A>(attr: any, childs?: any): VElem<A> {
  return V.h('code', attr, childs);
}

export function col<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('col', attr, [])
}

export function colgroup<A>(childs: VDom<A>[]): VElem<A>;
export function colgroup<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function colgroup<A>(attr: any, childs?: any): VElem<A> {
  return V.h('colgroup', attr, childs);
}

export function command<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('command', attr, [])
}

export function datalist<A>(childs: VDom<A>[]): VElem<A>;
export function datalist<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function datalist<A>(attr: any, childs?: any): VElem<A> {
  return V.h('datalist', attr, childs);
}

export function dd<A>(childs: VDom<A>[]): VElem<A>;
export function dd<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function dd<A>(attr: any, childs?: any): VElem<A> {
  return V.h('dd', attr, childs);
}

export function del<A>(childs: VDom<A>[]): VElem<A>;
export function del<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function del<A>(attr: any, childs?: any): VElem<A> {
  return V.h('del', attr, childs);
}

export function detail<A>(childs: VDom<A>[]): VElem<A>;
export function detail<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function detail<A>(attr: any, childs?: any): VElem<A> {
  return V.h('detail', attr, childs);
}

export function dfn<A>(childs: VDom<A>[]): VElem<A>;
export function dfn<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function dfn<A>(attr: any, childs?: any): VElem<A> {
  return V.h('dfn', attr, childs);
}

export function dialog<A>(childs: VDom<A>[]): VElem<A>;
export function dialog<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function dialog<A>(attr: any, childs?: any): VElem<A> {
  return V.h('dialog', attr, childs);
}

export function div<A>(childs: VDom<A>[]): VElem<A>;
export function div<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function div<A>(attr: any, childs?: any): VElem<A> {
  return V.h('div', attr, childs);
}

export function dl<A>(childs: VDom<A>[]): VElem<A>;
export function dl<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function dl<A>(attr: any, childs?: any): VElem<A> {
  return V.h('dl', attr, childs);
}

export function dt<A>(childs: VDom<A>[]): VElem<A>;
export function dt<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function dt<A>(attr: any, childs?: any): VElem<A> {
  return V.h('dt', attr, childs);
}

export function em<A>(childs: VDom<A>[]): VElem<A>;
export function em<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function em<A>(attr: any, childs?: any): VElem<A> {
  return V.h('em', attr, childs);
}

export function embed<A>(childs: VDom<A>[]): VElem<A>;
export function embed<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function embed<A>(attr: any, childs?: any): VElem<A> {
  return V.h('embed', attr, childs);
}

export function fieldset<A>(childs: VDom<A>[]): VElem<A>;
export function fieldset<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function fieldset<A>(attr: any, childs?: any): VElem<A> {
  return V.h('fieldset', attr, childs);
}

export function figcaption<A>(childs: VDom<A>[]): VElem<A>;
export function figcaption<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function figcaption<A>(attr: any, childs?: any): VElem<A> {
  return V.h('figcaption', attr, childs);
}

export function figure<A>(childs: VDom<A>[]): VElem<A>;
export function figure<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function figure<A>(attr: any, childs?: any): VElem<A> {
  return V.h('figure', attr, childs);
}

export function footer<A>(childs: VDom<A>[]): VElem<A>;
export function footer<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function footer<A>(attr: any, childs?: any): VElem<A> {
  return V.h('footer', attr, childs);
}

export function form<A>(childs: VDom<A>[]): VElem<A>;
export function form<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function form<A>(attr: any, childs?: any): VElem<A> {
  return V.h('form', attr, childs);
}

export function h1<A>(childs: VDom<A>[]): VElem<A>;
export function h1<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function h1<A>(attr: any, childs?: any): VElem<A> {
  return V.h('h1', attr, childs);
}

export function h2<A>(childs: VDom<A>[]): VElem<A>;
export function h2<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function h2<A>(attr: any, childs?: any): VElem<A> {
  return V.h('h2', attr, childs);
}

export function h3<A>(childs: VDom<A>[]): VElem<A>;
export function h3<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function h3<A>(attr: any, childs?: any): VElem<A> {
  return V.h('h3', attr, childs);
}

export function h4<A>(childs: VDom<A>[]): VElem<A>;
export function h4<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function h4<A>(attr: any, childs?: any): VElem<A> {
  return V.h('h4', attr, childs);
}

export function h5<A>(childs: VDom<A>[]): VElem<A>;
export function h5<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function h5<A>(attr: any, childs?: any): VElem<A> {
  return V.h('h5', attr, childs);
}

export function h6<A>(childs: VDom<A>[]): VElem<A>;
export function h6<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function h6<A>(attr: any, childs?: any): VElem<A> {
  return V.h('h6', attr, childs);
}

export function head<A>(childs: VDom<A>[]): VElem<A>;
export function head<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function head<A>(attr: any, childs?: any): VElem<A> {
  return V.h('head', attr, childs);
}

export function header<A>(childs: VDom<A>[]): VElem<A>;
export function header<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function header<A>(attr: any, childs?: any): VElem<A> {
  return V.h('header', attr, childs);
}

export function hr<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('hr', attr, [])
}

export function html<A>(childs: VDom<A>[]): VElem<A>;
export function html<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function html<A>(attr: any, childs?: any): VElem<A> {
  return V.h('html', attr, childs);
}

export function i<A>(childs: VDom<A>[]): VElem<A>;
export function i<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function i<A>(attr: any, childs?: any): VElem<A> {
  return V.h('i', attr, childs);
}

export function iframe<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('iframe', attr, [])
}

export function img<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('img', attr, [])
}

export function input<A>(attr: Prop<A>[]): VElem<A> {
  return V.h('input', attr, [])
}

export function ins<A>(childs: VDom<A>[]): VElem<A>;
export function ins<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function ins<A>(attr: any, childs?: any): VElem<A> {
  return V.h('ins', attr, childs);
}

export function kbd<A>(childs: VDom<A>[]): VElem<A>;
export function kbd<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function kbd<A>(attr: any, childs?: any): VElem<A> {
  return V.h('kbd', attr, childs);
}

export function label<A>(childs: VDom<A>[]): VElem<A>;
export function label<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function label<A>(attr: any, childs?: any): VElem<A> {
  return V.h('label', attr, childs);
}

export function li<A>(childs: VDom<A>[]): VElem<A>;
export function li<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function li<A>(attr: any, childs?: any): VElem<A> {
  return V.h('li', attr, childs);
}

export function link<A>(attr: Prop<A>[]): VElem<A>{
  return V.h('link', attr, []);
}

export function main<A>(childs: VDom<A>[]): VElem<A>;
export function main<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function main<A>(attr: any, childs?: any): VElem<A> {
  return V.h('main', attr, childs);
}

export function map<A>(childs: VDom<A>[]): VElem<A>;
export function map<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function map<A>(attr: any, childs?: any): VElem<A> {
  return V.h('map', attr, childs);
}

export function mark<A>(childs: VDom<A>[]): VElem<A>;
export function mark<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function mark<A>(attr: any, childs?: any): VElem<A> {
  return V.h('mark', attr, childs);
}

export function menu<A>(childs: VDom<A>[]): VElem<A>;
export function menu<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function menu<A>(attr: any, childs?: any): VElem<A> {
  return V.h('menu', attr, childs);
}

export function menuitem<A>(childs: VDom<A>[]): VElem<A>;
export function menuitem<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function menuitem<A>(attr: any, childs?: any): VElem<A> {
  return V.h('menuitem', attr, childs);
}

export function meta<A>(attr: Prop<A>[]): VElem<A>{
  return V.h('meta', attr, []);
}

export function meter<A>(childs: VDom<A>[]): VElem<A>;
export function meter<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function meter<A>(attr: any, childs?: any): VElem<A> {
  return V.h('meter', attr, childs);
}

export function nav<A>(childs: VDom<A>[]): VElem<A>;
export function nav<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function nav<A>(attr: any, childs?: any): VElem<A> {
  return V.h('nav', attr, childs);
}

export function noscript<A>(childs: VDom<A>[]): VElem<A>;
export function noscript<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function noscript<A>(attr: any, childs?: any): VElem<A> {
  return V.h('noscript', attr, childs);
}

export function object<A>(childs: VDom<A>[]): VElem<A>;
export function object<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function object<A>(attr: any, childs?: any): VElem<A> {
  return V.h('object', attr, childs);
}

export function ol<A>(childs: VDom<A>[]): VElem<A>;
export function ol<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function ol<A>(attr: any, childs?: any): VElem<A> {
  return V.h('ol', attr, childs);
}

export function optgroup<A>(childs: VDom<A>[]): VElem<A>;
export function optgroup<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function optgroup<A>(attr: any, childs?: any): VElem<A> {
  return V.h('optgroup', attr, childs);
}

export function option<A>(childs: VDom<A>[]): VElem<A>;
export function option<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function option<A>(attr: any, childs?: any): VElem<A> {
  return V.h('option', attr, childs);
}

export function output<A>(childs: VDom<A>[]): VElem<A>;
export function output<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function output<A>(attr: any, childs?: any): VElem<A> {
  return V.h('output', attr, childs);
}

export function p<A>(childs: VDom<A>[]): VElem<A>;
export function p<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function p<A>(attr: any, childs?: any): VElem<A> {
  return V.h('p', attr, childs);
}

export function param<A>(attr: Prop<A>[]): VElem<A>{
  return V.h('param', attr, []);
}

export function pre<A>(childs: VDom<A>[]): VElem<A>;
export function pre<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function pre<A>(attr: any, childs?: any): VElem<A> {
  return V.h('pre', attr, childs);
}

export function progress<A>(childs: VDom<A>[]): VElem<A>;
export function progress<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function progress<A>(attr: any, childs?: any): VElem<A> {
  return V.h('progress', attr, childs);
}

export function q<A>(childs: VDom<A>[]): VElem<A>;
export function q<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function q<A>(attr: any, childs?: any): VElem<A> {
  return V.h('q', attr, childs);
}

export function rp<A>(childs: VDom<A>[]): VElem<A>;
export function rp<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function rp<A>(attr: any, childs?: any): VElem<A> {
  return V.h('rp', attr, childs);
}

export function rt<A>(childs: VDom<A>[]): VElem<A>;
export function rt<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function rt<A>(attr: any, childs?: any): VElem<A> {
  return V.h('rt', attr, childs);
}

export function ruby<A>(childs: VDom<A>[]): VElem<A>;
export function ruby<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function ruby<A>(attr: any, childs?: any): VElem<A> {
  return V.h('ruby', attr, childs);
}

export function samp<A>(childs: VDom<A>[]): VElem<A>;
export function samp<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function samp<A>(attr: any, childs?: any): VElem<A> {
  return V.h('samp', attr, childs);
}

export function script<A>(childs: VDom<A>[]): VElem<A>;
export function script<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function script<A>(attr: any, childs?: any): VElem<A> {
  return V.h('script', attr, childs);
}

export function section<A>(childs: VDom<A>[]): VElem<A>;
export function section<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function section<A>(attr: any, childs?: any): VElem<A> {
  return V.h('section', attr, childs);
}

export function select<A>(childs: VDom<A>[]): VElem<A>;
export function select<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function select<A>(attr: any, childs?: any): VElem<A> {
  return V.h('select', attr, childs);
}

export function small<A>(childs: VDom<A>[]): VElem<A>;
export function small<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function small<A>(attr: any, childs?: any): VElem<A> {
  return V.h('small', attr, childs);
}

export function source<A>(attr: Prop<A>[]): VElem<A>{
  return V.h('source', attr, []);
}

export function span<A>(childs: VDom<A>[]): VElem<A>;
export function span<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function span<A>(attr: any, childs?: any): VElem<A> {
  return V.h('span', attr, childs);
}

export function strong<A>(childs: VDom<A>[]): VElem<A>;
export function strong<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function strong<A>(attr: any, childs?: any): VElem<A> {
  return V.h('strong', attr, childs);
}

export function style<A>(childs: VDom<A>[]): VElem<A>;
export function style<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function style<A>(attr: any, childs?: any): VElem<A> {
  return V.h('style', attr, childs);
}

export function sub<A>(childs: VDom<A>[]): VElem<A>;
export function sub<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function sub<A>(attr: any, childs?: any): VElem<A> {
  return V.h('sub', attr, childs);
}

export function summary<A>(childs: VDom<A>[]): VElem<A>;
export function summary<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function summary<A>(attr: any, childs?: any): VElem<A> {
  return V.h('summary', attr, childs);
}

export function sup<A>(childs: VDom<A>[]): VElem<A>;
export function sup<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function sup<A>(attr: any, childs?: any): VElem<A> {
  return V.h('sup', attr, childs);
}

export function table<A>(childs: VDom<A>[]): VElem<A>;
export function table<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function table<A>(attr: any, childs?: any): VElem<A> {
  return V.h('table', attr, childs);
}

export function tbody<A>(childs: VDom<A>[]): VElem<A>;
export function tbody<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function tbody<A>(attr: any, childs?: any): VElem<A> {
  return V.h('tbody', attr, childs);
}

export function td<A>(childs: VDom<A>[]): VElem<A>;
export function td<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function td<A>(attr: any, childs?: any): VElem<A> {
  return V.h('td', attr, childs);
}

export function textarea<A>(attr: Prop<A>[]): VElem<A>{
  return V.h('textarea', attr, []);
}

export function tfoot<A>(childs: VDom<A>[]): VElem<A>;
export function tfoot<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function tfoot<A>(attr: any, childs?: any): VElem<A> {
  return V.h('tfoot', attr, childs);
}

export function th<A>(childs: VDom<A>[]): VElem<A>;
export function th<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function th<A>(attr: any, childs?: any): VElem<A> {
  return V.h('th', attr, childs);
}

export function thead<A>(childs: VDom<A>[]): VElem<A>;
export function thead<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function thead<A>(attr: any, childs?: any): VElem<A> {
  return V.h('thead', attr, childs);
}

export function time<A>(childs: VDom<A>[]): VElem<A>;
export function time<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function time<A>(attr: any, childs?: any): VElem<A> {
  return V.h('time', attr, childs);
}

export function title<A>(childs: VDom<A>[]): VElem<A>;
export function title<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function title<A>(attr: any, childs?: any): VElem<A> {
  return V.h('title', attr, childs);
}

export function tr<A>(childs: VDom<A>[]): VElem<A>;
export function tr<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function tr<A>(attr: any, childs?: any): VElem<A> {
  return V.h('tr', attr, childs);
}

export function track<A>(childs: VDom<A>[]): VElem<A>;
export function track<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function track<A>(attr: any, childs?: any): VElem<A> {
  return V.h('track', attr, childs);
}

export function u<A>(childs: VDom<A>[]): VElem<A>;
export function u<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function u<A>(attr: any, childs?: any): VElem<A> {
  return V.h('u', attr, childs);
}

export function ul<A>(childs: VDom<A>[]): VElem<A>;
export function ul<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function ul<A>(attr: any, childs?: any): VElem<A> {
  return V.h('ul', attr, childs);
}

export function var_<A>(childs: VDom<A>[]): VElem<A>;
export function var_<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function var_<A>(attr: any, childs?: any): VElem<A> {
  return V.h('var', attr, childs);
}

export function video<A>(childs: VDom<A>[]): VElem<A>;
export function video<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function video<A>(attr: any, childs?: any): VElem<A> {
  return V.h('video', attr, childs);
}

export function wbr<A>(childs: VDom<A>[]): VElem<A>;
export function wbr<A>(attr: Prop<A>[], childs: VDom<A>[]): VElem<A>;
export function wbr<A>(attr: any, childs?: any): VElem<A> {
  return V.h('wbr', attr, childs);
}
