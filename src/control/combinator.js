const curry = require('../utils/curry')

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

const compose = toAssociativeCommaInfix(_compose)

const id = x => x
const constant = function(x) {
  return function() {
    return x
  }
}

const flip = curry((f, a, b) => f(b(a)))

const map = curry(function(f, u) {
  return u.fmap ? u.fmap(f)
       : u.map  ? u.map(f)
                : chain(compose(of(u), f), u)
})

const ap = curry(function(a1, a2) {
  return a1.ap ? a1.ap(a2) : chain(flip(map, a2), a1)
})

const liftA2 = curry(function(f, x, y) {
  return map(f,x).ap(y)
})

const liftA3 = curry(function(f, x, y, z) {
  return map(f, x).ap(y).ap(z)
});

const chain = curry(function(f, mv) {
  return mv.chain ? mv.chain(f) : mv.then(f)
})

const mjoin = chain(id)

const concat = curry(function(x, y) {
  return x.concat(y);
})

function mconcat(xs, empty) {
  return xs.length ? xs.reduce(concat) : empty()
}

const of = x => x.of

module.exports =
  { identity: id
  , constant: constant
  , compose: compose
  , of: of
  , map: map
  , chain: chain
  , ap: ap
  , flip: flip
  , liftA2: liftA2
  , liftA3: liftA3 }