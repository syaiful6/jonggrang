const {stream} = require('mithril/util/stream')
const curry = require('ramda/src/curry')
const {compose} = require('../control/combinator')

function reduce(f, acc, s) {
  var scan = stream()
  s.map(function (v) {
    acc = f(scan() || acc, v)
    scan(acc)
  })
  return scan
}

function merge() {
  var s = stream(), i, len
  for(i = 0, len = arguments.length; i < len; i++) {
    arguments[i].map(s)
  }
  return s
}

function forwardTo(target, fn) {
  var s = stream.stream()
  s.map(compose(target, fn))
  return s
}

module.exports =
  { reduce: curry(reduce)
  , forwardTo: curry(forwardTo)
  , merge }
