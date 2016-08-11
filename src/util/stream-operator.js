var curryN = require('ramda/src/curryN'),
  Stream = require('mithril/util/stream'),
  compose = require('ramda/src/compose')

function reduce(f, acc, s) {
  var scan = Stream.stream()
  s.map(function (v) {
    acc = f(scan() || acc, v)
    scan(acc)
  })
  return scan
}

function merge() {
  var s = Stream.stream(), i, len
  for(i = 0, len = arguments.length; i < len; i++) {
    arguments[i].map(s)
  }
  return s
}

function forwardTo(target, fn) {
  var s = Stream.stream()
  s.map(compose(target, fn))
  return s
}

var dropRepeatsWith = curryN(2, dropRepeatsWithRaw)
function dropRepeatsWithRaw(eq, s) {
  var val = s(), out = Stream.stream()
  if (typeof val !== 'undefined') out(val)
  s.map(function(newVal) {
    if (!eq(newVal, val)) {
      val = newVal
      out(val)
    }
  })
  return out
}

function strictCompare(a, b) {
  return a === b
}

var dropRepeats = dropRepeatsWith(strictCompare)

module.exports =
  { reduce: curryN(3, reduce)
  , dropRepeatsWith: dropRepeatsWith
  , dropRepeats: dropRepeats
  , forwardTo: curryN(2, forwardTo)
  , merge: merge }
