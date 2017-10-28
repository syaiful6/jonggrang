import { VDom, VElemKeyed, Prop, KeyVDom } from '../types';
import { k } from '../core';

export function withKeys<A, B>(f: (_: A) => string, g: (_: A) => VDom<B>, xs: A[]): KeyVDom<B>[] {
  return xs.map(item => ({ key: f(item), vdom: g(item) }));
}

export function div<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function div<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function div(attrs: any, childs?: any): any {
  return k('div', attrs, childs)
}

export function dl<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function dl<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function dl(attrs: any, childs?: any): any {
  return k('dl', attrs, childs)
}

export function form<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function form<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function form(attrs: any, childs?: any): any {
  return k('form', attrs, childs)
}

export function section<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function section<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function section(attrs: any, childs?: any): any {
  return k('section', attrs, childs)
}

export function table<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function table<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function table(attrs: any, childs?: any): any {
  return k('table', attrs, childs)
}

export function tfoot<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function tfoot<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function tfoot(attrs: any, childs?: any): any {
  return k('tfoot', attrs, childs)
}

export function th<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function th<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function th(attrs: any, childs?: any): any {
  return k('th', attrs, childs)
}

export function thead<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function thead<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function thead(attrs: any, childs?: any): any {
  return k('thead', attrs, childs)
}

export function tr<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function tr<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function tr(attrs: any, childs?: any): any {
  return k('tr', attrs, childs)
}

export function ul<A>(childs: KeyVDom<A>[]): VElemKeyed<A>;
export function ul<A>(attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function ul(attrs: any, childs?: any): any {
  return k('ul', attrs, childs)
}
