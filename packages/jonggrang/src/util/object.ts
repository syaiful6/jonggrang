export function ownKeys(obj: any): PropertyKey[] {
  if (typeof Reflect !== 'undefined' && typeof Reflect.ownKeys === 'function') {
    return Reflect.ownKeys(obj)
  }
  let keys: PropertyKey[] = Object.getOwnPropertyNames(obj)
  if (typeof Object.getOwnPropertySymbols !== 'undefined') {
    keys = keys.concat(Object.getOwnPropertySymbols(obj))
  }
  return keys
}

export function pick(fn: (item: any, key: PropertyKey) => boolean, obj: any): any {
  return ownKeys(obj).reduce((result, key) => {
    if (fn(obj[key], key)) {
      result[key] = obj[key]
    }
    return result
  }, {} as any)
}

export function map(fn: (item: any, key: PropertyKey) => any, obj: any): any {
  return ownKeys(obj).reduce((result, key) => {
    result[key] = fn(obj[key], key)
    return result
  }, {} as any)
}