import {selfCurry} from '../util/function'
import {assign} from '../util/object'

const keys = Object.keys
const values = object => keys(object).map(key => object[key])
const extractValues = (keys, obj) => keys.map(key => obj[key])

/* global Symbol */
export const TYPE = typeof Symbol === 'function' ? Symbol('__type__') : '__type__'
export const TAG = typeof Symbol === 'function' ? Symbol('__type.tag__') : '__type.tag__'
export const SLOTS = typeof Symbol === 'function' ? Symbol('__slot__') : '__slot__'

function mapObject(object, transform) {
  return keys(object).reduce((result, key) => {
    result[key] = transform(key, object[key])
    return result
  }, {})
}

function rawMatch(arity) {
  return function innerMatch(type, cases, variant, arg) {
    if (arguments.length < arity) return selfCurry(innerMatch, arguments)
    var wildcard = false, handler = cases[variant[TAG]]
    if (handler === undefined) {
      handler = cases['_']
      wildcard = true
    }
    if (variant[TYPE] !== type) {
      throw new Error('wrong type passed to match, expected ADT' + type
        + ', but ' + variant[TYPE] + ' was given instead.')
    }
    if (handler === undefined) {
      var caseName = arg !== undefined ? 'matchWith' : 'matchOn'
      throw new Error('non-exhaustive patterns in a function. You maybe forget' +
        ' to handle ' + variant[TAG] + ' on your ' + caseName + ' branch')
    }
    var args = wildcard === true  ? [arg]
              : arg !== undefined ? extractValues(variant[SLOTS], variant).concat(arg)
              /* otherwise */     : extractValues(variant[SLOTS], variant)
    return handler(...args)
  }
}

const match3 = rawMatch(3)
const match4 = rawMatch(4)

function defineVariants(name, patterns, namespace) {
  return mapObject(patterns, (variant, initializer) => {
    function Variant() {}
    Variant.prototype = Object.create(namespace)
    assign(Variant.prototype, {
      constructor: initializer
      , [TAG]: variant
      // patterns matching
      , case(cases) {
        return match3(name, cases, this)
      }
      , caseOn(cases) {
        return match4(name, cases, this)
      }
    })
    // public constructor
    function VariantCtor(...args) {
      var result = new Variant()
      var fields = initializer(...args)
      assign(result, fields != null ? fields : {})
      Object.defineProperty(result, SLOTS, {
        configurable: false
        , enumerable: false
        , get() {
          return fields != null ? keys(fields) : {}
        }
      })
      return result
    }
    VariantCtor.prototype = Variant.prototype
    VariantCtor.prototype.constructor = initializer
    return VariantCtor
  })
}

export function data(name, patterns) {
  if (arguments.length < 2) return selfCurry(data, arguments)
  const metaClass = patterns['__meta__'] != null ? patterns['__meta__'] : ADT
  const adt = new metaClass(name, patterns)
  const variants = defineVariants(name, patterns, adt)
  Object.defineProperty(adt, TYPE, {
    configurable: false
    , enumerable: false
    , get() {
      return name
    }
  })
  assign(adt, variants, {
    variants: keys(variants)
    , case: match3(name)
    , caseOn: match4(name)
  })
  return adt
}

export class ADT {
  derive(...derivations) {
    derivations.forEach(derivation => {
      this.variants.forEach(variant => derivation(this[variant], this))
    })
    return this
  }
}
