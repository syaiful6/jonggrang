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
    _.parallel([a, b]).fork(failRej, function (resolved) {
      assert.equal(resolved[0], resolved[1])
      done(true)
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
  describe('recovering/rejected', function () {
    property('rejected', 'json', function (a) {
      return new Promise(function (done) {
        _.rejected(a).fork(function (r) {
          assert.equal(a, r)
          done(true)
        }, failRes)
      })
    })
    property('recovering', 'json', 'json', function (a, b) {
      return new Promise(function (done) {
        var recover = _.rejected(a).orElse(function (ae) {
          assert.equal(a, ae)
          return _.of(b)
        })
        recover.fork(failRej, function (be) {
          assert.equal(b, be)
          done(true)
        })
      })
    })
    property('maprejected', 'json', 'json -> json', function (a, f) {
      return new Promise(function (done) {
        return _.rejected(a).rejectedMap(f).fork(function (rejectV) {
          assert.equal(rejectV, f(a))
          done(true)
        }, failRes)
      })
    })
  })
  describe('Promise Conversion', function () {
    property('create promise object', 'json', function (a) {
      var execution = _.of(a).run()
      return typeof execution.promise().then === 'function'
    })
    property('resolved', 'json', function (a) {
      return new Promise(function (done) {
        var execution = _.of(a).run()
        execution.promise().then(function (b) {
          assert.equal(a, b)
          done(true)
        }, failRej)
      })
    })
    property('rejected', 'json', function (a) {
      return new Promise(function (done) {
        var execution = _.rejected(a).run()
        execution.promise().then(failRes, function (e) {
          assert.equal(a, e)
          return done(true)
        })
      })
    })
  })
})