import {selfCurry} from '../util/function'
import {assign} from '../util/object'
import {isArray, isString, isNumber, isBoolean, isFunction, isObject} from '../util/is'

const keys = Object.keys
const values = object => keys(object).map(key => object[key])
/* global Symbol */
export const TYPE = typeof Symbol === 'function' ? Symbol('__type__') : '__type__'
export const TAG = typeof Symbol === 'function' ? Symbol('__type.tag__') : '__type.tag__'
export const SLOTS = typeof Symbol === 'function' ? Symbol('__slot__') : '__slot__'

const numToStr = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']

function mapObject(object, transform) {
  return keys(object).reduce((result, key) => {
    result[key] = transform(key, object[key])
    return result
  }, {})
}

const extractValues = (keys, obj) => keys.map(key => obj[key])
const isSameType = namespace => v => !!v && v[TYPE] === namespace[TYPE]
const isSameTag = (namespace, variant) => v => !!v && isSameType(namespace)(v) && variant[TAG] === v[TAG]

function mapConstrToFn(namespace, constr) {
  return constr === String           ? isString
         : constr === Number         ? isNumber
         : constr === Boolean        ? isBoolean
         : constr === Array          ? isArray
         : constr === Function       ? isFunction
         : constr === Object         ? isObject
         : constr === undefined      ? isSameType(namespace)
         : constr[TAG] !== undefined ? isSameTag(namespace, constr)
         : /* otherwise */            constr
}

function validate(namespace, validators, variant, args) {
  var validator, v, i
  if (validators.length !== args.length) {
    throw new TypeError('too many arguments supplied to constructor ' + variant
      + ' (expected ' + validators.length + ' but got ' + args.length + ')')
  }
  for (i = 0; i < validators.length; ++i) {
    v = args[i]
    validator = mapConstrToFn(namespace, validators[i])
    if (validator.prototype === undefined || !validator.prototype.isPrototypeOf(v) &&
      (typeof validator !== 'function' || !validator(v))) {
        var strVal = typeof v === 'string' ? "'" + v + "'" : v; // put the value in quotes if it's a string
        throw new TypeError('bad value ' + strVal + ' passed as ' + numToStr[i] + ' argument to constructor ' + variant)
      }
  }
}

function rawMatch(arity) {
  return function innerMatch(type, cases, variant, arg) {
    if (arguments.length < arity) return selfCurry(innerMatch, arguments)
    var wildcard = false, handler = cases[variant.tag]
    if (handler === undefined) {
      handler = cases['_']
      wildcard = true
    }
    if (variant[TYPE] !== type) throw new Error('wrong type passed to match')
    if (handler === undefined) throw new Error('non-exhaustive patterns in a function')
    var args = wildcard === true  ? [arg]
              : arg !== undefined ? extractValues(variant[SLOTS], variant).concat(arg)
              /* otherwise */     : extractValues(variant[SLOTS], variant)
    return handler(...args)
  }
}

const match3 = rawMatch(3)
const match4 = rawMatch(4)

function defineVariants(name, patterns, namespace) {
  return mapObject(patterns, (variant, desc) => {
    var fields = keys(desc),
      validators = isArray(desc) ? desc : extractValues(fields, desc)

    function VariantMeta(...args) {
      for (var i = 0; i < args.length; ++i) {
        this[fields[i]] = args[i]
      }
    }
    VariantMeta.prototype = Object.create(namespace)
    VariantMeta.prototype.constructor = VariantMeta
    VariantMeta.prototype[TAG] = variant
    VariantMeta.prototype[SLOTS] = fields
    assign(VariantMeta.prototype, {
      [`is${variant}`]: true
      // patterns matching
      , match(cases) {
        return match3(name, cases, this)
      }
      , matchWith(cases) {
        return match4(name, cases, this)
      }
    })

    function Variant(...args) {
      if (args.length < fields.length) return selfCurry(Variant, args)
      if (!(this instanceof VariantMeta)) return new Variant(...args)
      if (data.check === true) {
        validate(namespace, validators, variant, args)
      }
      VariantMeta.apply(this, args)
    }
    if (fields !== undefined) {
      Variant[`${variant}Of`] = function (obj) {
        return Variant.apply(undefined, extractValues(fields, obj))
      }
    }
    Variant.prototype = Object.create(VariantMeta.prototype)
    Variant.prototype.constructor = Variant
    assign(Variant.prototype, {
      tag: variant
      , type: name
    })

    return Variant
  })
}

export function data(name, patterns) {
  if (arguments.length < 2) return selfCurry(data, arguments)
  const metaClass = patterns['__meta__'] != null ? patterns['__meta__'] : ADTMeta
  function ADT() {
    this[TYPE] = name
    this.match = match3(name)
    this.matchWith = match(name)
  }
  ADT.prototype = new metaClass(name, patterns)
  ADT.prototype.constructor = ADT
  const namespace = new ADT()
  const variants = defineVariants(name, patterns, namespace)
  assign(namespace, variants, {
    variants: keys(variants)
  })

  return namespace
}
data.check = true

export class ADTMeta {
  derive(...derivations) {
    derivations.forEach(derivation => {
      this.variants.forEach(variant => derivation(this[variant], this))
    })
    return this
  }
}
