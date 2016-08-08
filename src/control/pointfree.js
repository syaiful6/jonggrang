const curry = require('ramda/src/curry')
const {compose, identity, apply, flip} = require('./combinator')
const {isType} = require('../utils/common')

// this modules exists, because ramda fail to "map" our stream, it happen because
// stream also a Function.
const isArray = Array.isArray || isType('Array')

var pointfree = {}

const flatten = xs => xs.reduce((a, b) => a.concat(b), [])

function arrayMap(fun, xs) {
  return xs.map((item) => fun(item))
}

pointfree.map = curry(map)
function map(f, u) {
  if (isArray(u)) return arrayMap(f, u)
  if (u.fmap) return u.fmap(f)
  if (u.map) return u.map(f)
  return chain(compose(of(u), f), u)
}

function arrayChain(f, xs) {
  return flatten(map(f, xs))
}

pointfree.chain = curry(chain)
function chain(f, mv) {
  if (isArray(mv)) return arrayChain(f, mv)
  return mv.chain ? mv.chain(f) : mv.then(f)
}

pointfree.ap = curry(ap)
function ap(a1, a2) {
  if (isArray(a1)) return arrayAp(a1, a2)
  if(a1.ap) return a1.ap(a2)
  return chain(flip(map, a2), a1)
}

function arrayAp(a1, a2) {
  return flatten(map(function(f) {
    return map(apply(f), a2)
  }, a1))
}

pointfree.liftA2 = curry(function(f, x, y) {
  return map(f,x).ap(y)
})

pointfree.liftA3 = curry(function(f, x, y, z) {
  return map(f, x).ap(y).ap(z)
})

pointfree.mjoin = pointfree.chain(identity)

pointfree.of = of
function of(x) {
  if (isArray(x)) return y => [y]
  return x.of
}

module.exports = pointfree