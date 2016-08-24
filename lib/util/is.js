export var isArray = Array.isArray || function (v) {
  return v != null && Object.prototype.toString.call(v) === '[object Array]'
}

export var isString = v => typeof v === 'string'
export var isNumber = v => typeof v === 'number'
export var isBoolean = v => typeof v === 'boolean'
export var isFunction = v => typeof v === 'function'
export function isObject(v) {
  var type = typeof v
  return !!v && (type == 'object' || type == 'function')
}
