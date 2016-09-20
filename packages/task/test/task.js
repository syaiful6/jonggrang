"use strict";

const jsverify = require('jsverify')
const _        = require('../lib/task').Task
const assert   = require('assert')
const property = jsverify.property
const forall   = jsverify.forall

function failRes(x) {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
}

function failRej(x) {
  throw new Error(`Invalidly entered rejection branch with value ${x}`);
}

function assertEqual(a, b) {
  return new Promise(function (done) {
    const exec = a.and(b).run()
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

function rejectOf(a) {
  return new _((reject, resolve) => {
    reject(a)
  })
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
  describe('Task.do', function () {
    property('quick return success', 'json', (a) => {
      return assertEqual(_.do(function* () {
        return _.of(a)
      }), _.of(a))
    })
    it('it correctly handle rejected task', () => {
      return new Promise(done => {
        let exec = _.do(function* () {
          let i = yield rejectOf(2)
          failRej(i)
          return _.of(9)
        }).run()
        exec.listen({
          resolved: failRej,
          rejected: (v) => {
            assert.equal(v, 2)
            done()
          }
        })
      })
    })
  })
})