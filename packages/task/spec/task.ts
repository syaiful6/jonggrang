import { expect } from 'chai'
import { property } from 'jsverify'
import { Task, Handler } from '../lib/core'
import { assertEqual, identity, lift, MAX_STACK } from './helpers/util'

describe('Task', () => {
  let taskC: Task<any, number> = Task.of(1)
  describe('Functor', () => {
    it('implement functor interface', () => {
      ['map', 'fantasy-land/map'].forEach(m => {
        expect(typeof taskC[m]).to.be.equal('function')
      })
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
      ['map', 'fantasy-land/map', 'ap', 'fantasy-land/ap'].forEach(m => {
        expect(typeof taskC[m]).to.be.equal('function')
      })
    })
    property(
      'compose',
      'nat',
      'nat -> nat',
      'nat -> nat',
      (v: number, a: (v: number) => number, u: (v: number) => number) => {
        let vt = Task.of(v)
        let ut = Task.of(u)
        let at = Task.of(a)
        return assertEqual(
          vt.ap(ut).ap(at),
          vt.ap(ut.ap(at.map(f => g => x => f(g(x)))))
        )
      }
    )
  })
  describe('Applicative', () => {
    it('implement apply interface', () => {
      ['map', 'fantasy-land/map', 'ap', 'fantasy-land/ap', 'of', 'fantasy-land/of'].forEach(m => {
          expect(typeof taskC[m]).to.be.equal('function')
      })
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
    it('implement Chain interface', () => {
      ['map', 'fantasy-land/map', 'ap', 'fantasy-land/ap', 'chain', 'fantasy-land/chain'].forEach(m => {
        expect(typeof taskC[m]).to.be.equal('function')
      })
    })
    property('associative', 'json', 'json -> json', (a: any, f: (v: any) => any) => {
      return assertEqual(Task.of(a).chain(lift(f)), lift(f)(a))
    })
  })
  describe('Chainrec', () => {
    it('implement Chainrec interface', () => {
      [
        'map', 'fantasy-land/map', 'ap', 'fantasy-land/ap', 'chain', 'fantasy-land/chain',
        'fantasy-land/chainRec'
      ].forEach(m => {
          expect(typeof taskC[m]).to.be.equal('function')
      })
    })
    property('equivalence', 'nat', (v: number) => {
      let initial: number[] = [v]
      let p = (a: number[]) => a.length > 5
      let d = Task.of
      let n = (a: number[]) => Task.of(a.concat([v]))
      let left = Task.chainRec((next, done, v) => {
        return p(v) ? d(v).map(done) : n(v).map(next)
      }, initial)
      function step(v: number[]): Task<never, number[]> {
        return p(v) ? d(v) : n(v).chain(step)
      }
      return assertEqual(left, step(initial))
    })
    it('should safe with a lot sync task', () => {
      const step = (next, done, v) => v < 0 ? Task.of(done(v)) : Task.of(next(v - 1))
      return assertEqual(Task.chainRec(step, MAX_STACK + 2), Task.of(-1))
    })
  })
})
