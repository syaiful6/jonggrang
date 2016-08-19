var isString = function(s) { return typeof s === 'string'; }
var isNumber = function(n) { return typeof n === 'number'; }
var isBoolean = function(b) { return typeof b === 'boolean'; }
var isObject = function(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function')
}
var isFunction = function(f) { return typeof f === 'function'; }
var isArray = Array.isArray || function(a) { return 'length' in a; }

var mapConstrToFn = function(constr) {
  return constr === String    ? isString
       : constr === Number    ? isNumber
       : constr === Boolean   ? isBoolean
       : constr === Object    ? isObject
       : constr === Array     ? isArray
       : constr === Function  ? isFunction
       : constr
}

var numToStr = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

function validate(keys, validators, args, name) {
  var i, v, validator
  if (keys.length !== args.length) {
    throw new Error('invalid arguments supplied to ' + name + ' type. Expected ' +
      + keys.length + ', but got ' + args.length
    )
  }
  for (i = 0; i < args.length; i++) {
    v = args[i]
    validator = mapConstrToFn(validators[i])
    if (typeDef.check === true &&
        (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v)) &&
        (typeof validator !== 'function' || !validator(v))) {
      var strVal = typeof v === 'string' ? "'" + v + "'" : v; // put the value in quotes if it's a string
      throw new TypeError('bad value ' + strVal + ' passed as ' + numToStr[i] + ' argument to constructor ' + name);
    }
  }
}

function toString(name, keys) {
  return function () {
    var i, values = []
    for (i = 0; i < keys.length; i++) {
      values.push(this[keys[i]])
    }
    return name + '(' + values.join(', ') + ')'
  }
}

function typeDef(name, descriptions) {
  var keys = Object.keys(descriptions), validators = extractValues(keys, descriptions)
  function Type() {
    var args = [].slice.call(arguments), i
    if (typeDef.check === true) {
      validate(keys, validators, args, name)
    }
    var self = this instanceof Type ? this : Object.create(Type.prototype)
    for (i = 0; i < args.length; i++) {
      self[keys[i]] = args[i]
    }
    return self
  }

  Type.prototype.toString = toString(name, keys)
  Type._name = name
  Type._length = keys.length

  return Type
}

typeDef.check = true

function extractValues(keys, obj) {
  var arr = [], i;
  for (i = 0; i < keys.length; ++i) arr[i] = obj[keys[i]];
  return arr;
}

module.exports = typeDef
