var jsverify = require('jsverify')
var _        = require('../lib/task').Task
var assert   = require('assert')
var property = jsverify.property
var forall   = jsverify.forall

function failRes(x) {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
}

function failRej(x) {
  throw new Error(`Invalidly entered rejection branch with value ${x}`);
}

function assertEqual(a, b) {
  return new Promise(function (done) {
    var exec = a.and(b).run()
    exec.listen({
      resolved: (v) => {
        assert.equal(v[0], v[1])
        done(true)
      },
      rejected: failRej
    })
  })
}

function lift(f) {
  return function (a) {
    return _.of(f(a))
  }
}

describe('Task', function () {
  describe('Functor', function () {
    property('map', 'json', 'json -> json', function (a, f) {
      return assertEqual(_.of(f(a)), _.of(a).map(f))
    });
  })
  describe('Applicative', function () {
    property('of', 'json', 'json', function (a, b) {
      return assertEqual(_.of(a === b), _.of(b === a))
    })
    property('ap', 'json', 'json -> json', function (a, f) {
      // our ap now use reversed version of FL according to FL v1
      return assertEqual(_.of(a).ap(_.of(f)), _.of(f(a)))
    })
  })
  describe('Chain', function () {
    property('chain', 'json', 'json -> json', function(a, f) {
      return assertEqual(_.of(a).chain(lift(f)), lift(f)(a))
    });
  })
})