const Type = require('union-type')
const curry = require('ramda/src/curry')
const {constant, compose} = require('../control/combinator')

const Either = Type({
  Left: [constant(true)]
  , Right: [constant(true)]
})

Either.of = Either.Right
Either.prototype.of = Either.Right

Either.either = curry(either)
function either(onLeft, onRight, either) {
  return Either.case({
    Left: onLeft
    , Right: onRight
  }, either)
}

Either.isLeft = Either.either(constant(true), constant(false))
Either.isRight = Either.either(constant(false), constant(true))

Either.prototype.map = map
function map(fn) {
  return Either.case({
    Left: Either.Left
    , Right: compose(Either.Right, fn)
  }, this)
}

Either.prototype.chain = chain
function chain(fun) {
  return Either.case({
    Left: Either.Left
    , Right: fun
  }, this)
}

Either.prototype.ap = ap
function ap(b) {
  return Either.case({
    Left: Either.Left
    , Right: function (a) {
      return b.map(a)
    }
  }, this)
}

Either.prototype.fold = fold
function fold(f, g) {
  return Either.either(f, g, this)
}

Either.prototype.toString = toString
function toString() {
  return Either.case({
    Left: function(v) {
      return `Either.Left(${v})`
    },
    Right: function(v) {
      return `Either.Right(${v})`
    }
  }, this)
}

module.exports = Either
