const curry = require('../utils/curry')
const {constant, compose} = require('../utils/combinators')
const Type = require('./type')

const Maybe = Type({
  Nothing: []
  , Just: [constant(true)]
})

function notThere(val) {
  return (val === undefined || val === null);
}

Maybe.of = tryValue
Maybe.prototype.of = of
function of(val) {
  return Maybe.case({
    Nothing: Maybe.Nothing
    , Just: Maybe.Just
  }, this)
}

Maybe.maybe = curry(maybeFun)
function maybeFun(def, fun, maybe) {
  return Maybe.case({
    Nothing: function() {
      return def
    }
    , Just: fun
  }, maybe)
}

Maybe.tryValue = tryValue
function tryValue(v) {
  return notThere(v) ? Maybe.Nothing() : Maybe.Just(v)
}

Maybe.prototype.map = map
function map(fn) {
  return Maybe.case({
    Nothing: Maybe.Nothing
    , Just: compose(Maybe.Just, fn)
  }, this)
}

Maybe.prototype.chain = chain
function chain(fun) {
  return Maybe.case({
    Nothing: Maybe.Nothing
    , Just: fun
  }, this)
}

Maybe.prototype.ap = ap
function ap(b) {
  return Maybe.case({
    Nothing: Maybe.Nothing
    , Just: function(a) {
      b.map(a)
    }
  }, this)
}

Maybe.prototype.concat = concat
function concat(b) {
  return Maybe.case({
    Nothing: Maybe.Nothing
    , Just: function(a) {
      return notThere(b[0]) ? a : tryValue(a.concat(b[0]))
    }
  }, this)
}

Maybe.prototype.traverse = traverse
function traverse(f, point) {
  return Maybe.case({
    Nothing: function() {
      return point(Maybe.Nothing())
    },
    Just: function(v) {
      return f(v).map(Maybe.Just)
    }
  }, this)
}

Maybe.prototype.reduce = reduce
function reduce(f, acc) {
  return Maybe.case({
    Nothing: function() {
      return f(null)
    }
    , Just: function(v) {
      return f(acc, v)
    }
  }, this)
}

Maybe.prototype.empty = Maybe.Nothing

module.exports = Maybe
