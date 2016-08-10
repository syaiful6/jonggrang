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
  var s = stream()
  s.map(compose(target, fn))
  return s
}

const dropRepeatsWith = curry(dropRepeatsWithRaw)
function dropRepeatsWithRaw(eq, s) {
  var val = s(), out = stream()
  if (typeof val !== 'undefined') out(val)
  s.map(function(newVal) {
    if (!eq(newVal, val)) {
      val = newVal
      out(val)
    }
  })
  return out
}

const strictCompare = (a, b) => a === b
const dropRepeats = dropRepeatsWith(strictCompare)

module.exports =
  { reduce: curry(reduce)
  , dropRepeatsWith
  , dropRepeats
  , forwardTo: curry(forwardTo)
  , merge }
