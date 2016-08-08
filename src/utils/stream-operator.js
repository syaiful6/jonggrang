const stream = require('mithril/util/stream')

function reduce(f, acc, s) {
  var scan = stream.stream()
  s.map(function (v) {
    acc = f(scan() || acc, v)
    scan(acc)
  })
  return scan
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