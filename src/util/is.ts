export let isArray = Array.isArray

export let isPrimitive = function (x: any) {
  return typeof x === 'string' || typeof x === 'number'
}
