export let isArray: (x: any) => x is any[] = Array.isArray || function (x: any) {
  return x instanceof Array
}

export type Primitive = string | number

export function isPrimitive(x: any): x is Primitive {
  return typeof x === 'string' || typeof x === 'number'
}

export function isString(x: any): x is string {
  return typeof x === 'string'
}

export function isNumber(x: any): x is number {
  return typeof x === 'number'
}

export function isDef(x: any) {
  return typeof x !== 'undefined'
}

export function isUndef(x: any) {
  return typeof x === 'undefined'
}
