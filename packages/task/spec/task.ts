import { expect } from 'chai'
import { property } from 'jsverify'
import { Task, Handler } from '../lib/core'
import { assertEqual, identity, lift } from './helpers/util'

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
      'compose',
      'nat',
      'nat -> nat', 'nat -> nat',
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