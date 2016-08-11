var curryN = require('ramda/src/curryN'),
	rmap = require('ramda/src/map')

var isArray = Array.isArray || function(a) {
  return 'length' in a
}

// look like ramda fail to map a stream, so build it here
module.exports = curryN(2, function map(fun, functor) {
  if (functor.fmap) return functor.fmap(fun)
  if (functor.map && !isArray(functor)) functor.map(fun)
  // otherwise pass to rambda
  return rmap(fun, functor)
})
