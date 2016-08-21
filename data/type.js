var selfCurry = require('../util/self-curry')

var isString = function(s) { return typeof s === 'string'; };
var isNumber = function(n) { return typeof n === 'number'; };
var isBoolean = function(b) { return typeof b === 'boolean'; };
var isObject = function(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
};
var isFunction = function(f) { return typeof f === 'function'; };
var isArray = Array.isArray || function(a) { return 'length' in a; };
// our is just accept one arity, so Immutable.is and Object.is will never pass this
// test
function isAlias(v) {
  return typeof v.is === 'function' && v.is.length === 1
}

var mapConstrToFn = function(constr) {
  return constr === String    ? isString
       : constr === Number    ? isNumber
       : constr === Boolean   ? isBoolean
       : constr === Object    ? isObject
       : constr === Array     ? isArray
       : constr === Function  ? isFunction
       : isAlias(constr) ? constr.is
       : constr
}

var numToStr = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

function validate(keys, validators, args, name) {
  var i, v, validator
  if (keys.length !== args.length) {
    throw new Error('invalid arguments supplied to ' + name + ' type alias constructor. Expected ' +
      + keys.length + ', but got ' + args.length
    )
  }
  for (i = 0; i < args.length; i++) {
    v = args[i]
    validator = mapConstrToFn(validators[i])
    if (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v) &&
        (typeof validator !== 'function' || !validator(v))) {
      var strVal = typeof v === 'string' ? "'" + v + "'" : v
      throw new TypeError('bad value ' + strVal + ' passed as ' + numToStr[i] + ' argument to type alias constructor ' + name)
    }
  }
}

function check(keys, validators, args) {
  var i, v, validator
  if (keys.length !== args.length) {
    return false
  }
  for (i = 0; i < args.length; i++) {
    v = args[i]
    validator = mapConstrToFn(validators[i])
    if (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v) &&
        (typeof validator !== 'function' || !validator(v))) {
      return false
    }
  }
  return true
}

function extractValues(keys, obj) {
  var arr = [], i;
  for (i = 0; i < keys.length; ++i) arr[i] = obj[keys[i]];
  return arr;
}

function Alias(name, descriptions) {
  if (arguments.length < 2) return selfCurry(Alias, arguments)
  var primitive = typeof descriptions === 'function',
    keys = !primitive ? Object.keys(descriptions) : [descriptions],
    validators = isArray(descriptions) ? descriptions
                : primitive ? [descriptions]
                : extractValues(keys, descriptions)
  function Construct() {
    if (arguments.length < keys.length) return selfCurry(Construct, arguments)
    var args = [].slice.call(arguments), i
    if (Alias.check === true) {
      validate(keys, validators, args, name)
    }
    if (primitive) return descriptions.apply(null, args)
    var ret = isArray(descriptions) ? [] : {}
    for (i = 0; i < args.length; i++) {
      ret[keys[i]] = args[i]
    }
    return ret
  }
  function read(obj) {
    if (arguments.length < 1) return read
    return Construct.apply(null, primitive ? [obj] : extractValues(keys, obj))
  }
  function is(obj) {
    if (arguments.length < 1) return is
    return check(keys, validators, primitive ? [obj] : extractValues(keys, obj))
  }
  Construct.is = is
  Construct.read = read
  Construct.from = read
  Construct._name = name
  Construct._length = keys.length

  return Construct
}

Alias.check = true

module.exports = Alias
