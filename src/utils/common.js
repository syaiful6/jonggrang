const curry = require('./curry')

var counter = 0
const toString = Object.prototype.toString

function guid() {
  return counter++
}

function type(x) {
  return toString.call(x).slice(8, -1)
}

function isType(tp, v) {
  return type(v) === tp
}

function getInstance(self, ctor) {
  return self instanceof ctor ? self : Object.create(ctor.prototype)
}

function singleton(k, v) {
  const obj = {}
  obj[k] = v
  return obj
}

function extend(original, update) {
  function rec(a, b) {
    var k;
    for (k in b) {
      a[k] = b[k]
    }
    return a
  }
  return rec(rec({}, original), update)
}

const prop = (key, obj) => obj[key]

module.exports =
  { guid
  , type
  , isType: curry(isType)
  , getInstance: curry(getInstance)
  , singleton: curry(singleton)
  , extend: curry(extend)
  , prop: curry(prop) }
