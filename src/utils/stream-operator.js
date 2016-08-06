const stream = require('mithril/util/stream')

function reduce(f, acc, s) {
  var current = stream.combine(function (s) {
    acc = f(current() || acc, s())
    return acc
  }, [s])
  return current
}

function merge() {
  var s = stream.stream(), i, len
  for(i = 0, len = arguments.length; i < len; i++) {
    arguments[i].map(s)
  }
  return s
}

module.exports =
  { reduce
  , merge }
