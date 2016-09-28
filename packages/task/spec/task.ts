import { Task, Handler } from '../lib/core'
import { expect } from 'chai'
import { property } from 'jsverify'

function failRes(x: any) {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
}

function failRej(x: any) {
  throw new Error(`Invalidly entered rejection branch with value ${x}`);
}

const noop = () => {}

// because we run this test on node, process.nextTick is safe to simulate async task
function onNextTick<T>(v: T) {
  return new Task((rej: Handler<any>, resolve: Handler<T>) => {
    process.nextTick(() => resolve(v))
    return noop
  })
}

function assertEqual(a: Task<any, any>, b: Task<any, any>) {
  return new Promise(done => {
    const task = a.and(b)
    task.fork(failRej, v => {
      expect(v[0]).to.equal(v[1])
      done(true)
    })
  })
}

function lift<T, R>(f: (v: T) => R) {
  return function (a: T) {
    return Task.of(f(a))
  }
}

function rejectOf<T>(a: T) {
  return new Task((reject: Handler<any>, resolve: Handler<T>) => {
    reject(a)
    return noop
  })
}

function computeCallStack(): number {
  try {
    return 1 + computeCallStack()
  } catch (_) {
    return 1
  }
}
const MAX_STACK = computeCallStack()
function identity<T>(t: T) {
  return t
}

describe('Task', () => {
  let taskC: Task<any, number>
  beforeEach(() => {
    taskC = Task.of(1)
  })
  describe('Functor', () => {
    it('implement functor interface', () => {
      expect(typeof taskC.map).to.be.equal('function')
    })
    property('map#identity', 'json', (a: any) => {
      return assertEqual(Task.of(a), Task.of(a).map(identity))
    })
    property('map#compose', 'json', 'json -> json', (a: any, f: (v: any) => any) => {
      return assertEqual(Task.of(f(a)), Task.of(a).map(f)) 
    })
  })
  describe('Apply', () => {
    it('implement apply interface', () => {
      expect(typeof taskC.ap).to.be.equal('function')
      expect(typeof taskC.map).to.be.equal('function')
    })
    property(
      'compose', 'nat', 'nat -> nat', 'nat -> nat',
      (v: number, a: (v: number) => number, u: (v: number) => number) => {
        let vt = Task.of(v)
        let ut = Task.of(u)
        let at = Task.of(a)
        return assertEqual(
          vt.ap(ut).ap(at),
          vt.ap(ut.ap(at.map(f => g => x => f(g(x))))))
      }
    )
  })
  describe('Applicative', () => {
    it('implement apply interface', () => {
      expect(typeof taskC.map).to.be.equal('function')
      expect(typeof taskC.ap).to.be.equal('function')
      expect(typeof taskC.of).to.be.equal('function')
    })
    property('identity', 'json', (v: any) => {
      return assertEqual(Task.of(v).ap(Task.of(identity)), Task.of(v))
    })
    property('homomorphism', 'json', 'json -> json', (a: any, f: (v: any) => any) => {
      return assertEqual(Task.of(a).ap(Task.of(f)), Task.of(f(a)))
    })
    property('interchange', 'nat', 'nat', 'nat -> nat', (a: number, x: number, f: (v: number) => number) => {
      let taskA = Task.of(a)
      let taskF = Task.of(f)
      return assertEqual(taskA.of(x).ap(taskF), taskF.ap(taskA.of(f => f(x))))
    })
  })
  describe('Chain', () => {
    it('implement chain interface', () => {
      ['map', 'ap', 'chain'].forEach(m => {
        expect(typeof taskC[m]).to.be.equal('function')
      })
    })
    property('chain', 'json', 'json -> json', (a: any, f: (v: any) => any) => {
      return assertEqual(Task.of(a).chain(lift(f)), lift(f)(a))
    })
  })
})