const curry = require('ramda/src/curry')

const _groupsOf = curry(function(n, xs) {
  return !xs.length ? [] : [xs.slice(0, n)].concat(_groupsOf(n, xs.slice(n, xs.length)))
})

const _compose = curry((f, g, x) => f(g(x)))

function toAssociativeCommaInfix(fn) {
  return function() {
    const funs = [].slice.call(arguments)
    return function() {
      return _groupsOf(2, funs).reverse().map(function (g) {
        return (g.length > 1) ? fn.apply(this, g) : g[0]
      }).reduce(function (x, f) {
        return [f.apply(f, x)]
      }, arguments)[0]
    }
  }
}

// compose :: (b → c) → (a → b) → (a → c)
const compose = toAssociativeCommaInfix(_compose)

// id :: a -> a
const identity = x => x

// constant :: a -> * -> a
const constant = function(x) {
  return function() {
    return x
  }
}

// flip :: (a -> b -> c) -> (b -> a -> c)
const flip = (f, a, b) => f(b, a)

// A combinator
// apply :: (a -> b) -> a -> b
const apply = (f, a) => f(a)

//
const thrush = (a, f) => f(a)

// Y combinator
function fix(f) {
  const g = h => x => f(h(h))(x)
  return g(g)
}

// psi combinator
// Applies an unary function to both arguments of a binary function.
// psi :: (b → b → c) → (a → b) → (a → a → c)
const psi = (f, g, a, b) => f(g(a))(g(b))

// substitution ::
const _substitution = (f, g, x) => f(x)(g(x))
const substitution = toAssociativeCommaInfix(_substitution)

module.exports =
  { compose
  , identity
  , constant
  , flip: curry(flip)
  , apply: curry(apply)
  , thrush: curry(thrush)
  , fix
  , psi: curry(psi)
  , substitution: curry(substitution) }