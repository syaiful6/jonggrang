import { expect } from 'chai'
import { Task, Handler } from '../../lib/core'

export function failRes(x: any) {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
}

export function failRej(x: any) {
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

export function assertEqual(a: Task<any, any>, b: Task<any, any>) {
  return new Promise(done => {
    const task = a.and(b)
    task.fork(failRej, v => {
      expect(v[0]).to.equal(v[1])
      done(true)
    })
  })
}

export function lift<T, R>(f: (v: T) => R) {
  return function (a: T) {
    return Task.of(f(a))
  }
}

export function rejectOf<T>(a: T) {
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

export const MAX_STACK = computeCallStack()

export function identity<T>(t: T) {
  return t
}
