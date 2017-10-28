import { prop, attr } from './core';
import { Property, Attribute } from '../dom/prop'

export function action(s: string): Property {
  return prop('action', s);
}

export function alt(s: string): Property {
  return prop('alt', s);
}

export function autocomplete(b: boolean): Property {
  return prop('autocomplete', b ? 'on' : 'off');
}

export function autofocus(b: boolean): Property {
  return prop('autofocus', b);
}

export function charset(s: string): Attribute {
  return attr('charset', s);
}

export function checked(b: boolean): Property {
  return prop('checked', b);
}

export function className(s: string): Property {
  return prop('className', s)
}

export type ClassFilter = {
  [key: string]: boolean;
};

export function classList(cls: ClassFilter): Property {
  const name = keys(cls).filter(k => cls[k]).join(' ');
  return className(name);
}

export function cols(c: number): Property {
  return prop('cols', c | 0);
}

export function colSpan(c: number): Property {
  return prop('colSpan', c | 0);
}

export function disabled(b: boolean): Property {
  return prop('disabled', b);
}

export function draggable(b: boolean): Property {
  return prop('draggable', b);
}

export function enabled(b: boolean): Property {
  return prop('enabled', b);
}

export function enctype(s: string): Property {
  return prop('enctype', s)
}

export function htmlFor(s: string): Property {
  return prop('htmlFor', s)
}

export function height(s: number): Property {
  return prop('height', s | 0);
}

export function hidden(b: boolean): Property {
  return prop('hidden', b);
}

export function href(s: string): Property {
  return prop('href', s);
}

export function id(s: string): Property {
  return prop('id', s);
}

export function method(m: 'get' | 'post') {
  return prop('method', m)
}

export function multiple(b: boolean): Property {
  return prop('multiple', b);
}

export function name(s: string): Property {
  return prop('name', s);
}

export function noValidate(b: boolean): Property {
  return prop('noValidate', b);
}

export function placeholder(s: string): Property {
  return prop('placeholder', s);
}

export function readOnly(b: boolean): Property {
  return prop('readOnly', b);
}

export function rel(s: string): Property {
  return prop('rel', s);
}

export function required(b: boolean): Property {
  return prop('required', b);
}

export function rows(c: number): Property {
  return prop('rows', c | 0);
}

export function rowSpan(c: number): Property {
  return prop('rowSpan', c | 0);
}

export function spellCheck(b: boolean): Property {
  return prop('spellCheck', b);
}

export function src(b: string): Property {
  return prop('src', b);
}

export function style(s: string): Attribute {
  return attr('style', s);
}

export type Styles = {
  [key: string]: string;
}

export function styles(s: Styles): Attribute {
  const sr = keys(s).map(k => k + ': ' + s[k] + ';').join(' ');
  return style(sr);
}

export function tabIndex(i: number): Property {
  return prop('tabIndex', i);
}

export function target(t: string): Property {
  return prop('target', t);
}

export function title(t: string): Property {
  return prop('title', t);
}

export function type_(t: string): Property {
  return prop('type', t);
}

export function value(t: string): Property {
  return prop('value', t);
}

export function width(n: number): Property {
  return prop('width', n)
}

function keys<T, K extends keyof T>(t: T): K[] {
  return Object.keys(t) as K[];
}
