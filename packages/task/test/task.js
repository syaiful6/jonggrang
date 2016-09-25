"use strict";

const jsverify = require('jsverify')
const _        = require('../lib/core').Task
const assert   = require('assert')
const property = jsverify.property
const forall   = jsverify.forall

function failRes(x) {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
}

function failRej(x) {
  throw new Error(`Invalidly entered rejection branch with value ${x}`);
}
// because we run this test on node, process.nextTick is safe to simulate async task
function onNextTick(v) {
  return new _((rej, resolve) => {
    process.nextTick(() => resolve(v))
  })
}

function assertEqual(a, b) {
  return new Promise(done => {
    const task = a.and(b)
    task.fork(failRej, v => {
      assert.equal(v[0], v[1])
      done(true)
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

function computeCallStack() {
  try {
    return 1 + computeCallStack()
  } catch (_) {
    return 1
  }
}
const MAX_STACK = computeCallStack()

describe('Task', () => {
  describe('Functor', () => {
    property('map', 'json', 'json -> json', (a, f) => {
      return assertEqual(_.of(f(a)), _.of(a).map(f))
    })
  })
  describe('Applicative', () => {
    property('of', 'json', 'json', (a, b) => {
      return assertEqual(_.of(a === b), _.of(b === a))
    })
    property('ap', 'json', 'json -> json', (a, f) => {
      // our ap now use reversed version of FL according to FL v1
      return assertEqual(_.of(a).ap(_.of(f)), _.of(f(a)))
    })
  })
  describe('Chain', () => {
    property('chain', 'json', 'json -> json', (a, f) => {
      return assertEqual(_.of(a).chain(lift(f)), lift(f)(a))
    })
  })
  describe('Chainrec', () => {
    const step = (next, done, v) => v < 0 ? _.of(done(v)) : _.of(next(v - 1))
    const step2 = (next, done, v) => v < 0 ? _.of(v).map(done) : _.of(v - 1).map(next)
    const stepAsync = (next, done, v) => v < 0 ? onNextTick(v).map(done) : onNextTick(v - 1).map(next)
    property('chainrec equality (all sync)', 'nat', a => {
      return assertEqual(_.chainRec(step, a), _.chainRec(step2, a))
    })
    property('chainrec equality (one sync)', 'nat', a => {
      return assertEqual(_.chainRec(step, a), _.chainRec(stepAsync, a))
    })
    it('should safe with a lot sync task', (done) => {
      const task = _.chainRec(step, MAX_STACK + 2)
      task.fork(failRej, v => {
        assert.equal(v, -1)
        done()
      })
    })
    it('should safe with a lot async task', (done) => {
      const task = _.chainRec(stepAsync, MAX_STACK + 2)
      task.fork(failRej, v => {
        assert.equal(v, -1)
        done()
      })
    })
  })
  describe('Task.do', () => {
    property('quick return success', 'json', (a) => {
      return assertEqual(_.do(function* () {
        return _.of(a)
      }), _.of(a))
    })
    it('it correctly handle rejected task', (done) => {
      let task = _.do(function* () {
        let i = yield rejectOf(2)
        failRej(i)
        return _.of(9)
      })
      task.fork(v => {
        assert.equal(v, 2)
        done()
      }, failRes)
    })
  })
})
