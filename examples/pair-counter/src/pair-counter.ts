import * as Counter from './counter'
import { h, Vnode } from '../../../src'

export interface Pattern<T> {
  Top(action: Counter.Action): T
  Bottom(action: Counter.Action): T
  Reset(): T
}

export class Top {
  private action: Counter.Action
  constructor(action: Counter.Action) {
    this.action = action
  }
  matchWith<T>(pattern: Pattern<T>): T {
    return pattern.Top(this.action)
  }
  static create(action: Counter.Action) {
    return new Top(action)
  }
}

export class Bottom {
  private action: Counter.Action
  constructor(action: Counter.Action) {
    this.action = action
  }
  matchWith<T>(pattern: Pattern<T>): T {
    return pattern.Bottom(this.action)
  }
  static create(action: Counter.Action) {
    return new Bottom(action)
  }
}

export class Reset {
  matchWith<T>(pattern: Pattern<T>): T {
    return pattern.Reset()
  }
  static create() {
    return new Reset()
  }
}

export type Action = Top | Bottom | Reset
export type State = {
  top: Counter.State
  bottom: Counter.State
}

function extend<A, B>(a: A, b: B): A & B {
  function rec(c: any, d: any) {
    for (let k in d) {
      c[k] = d[k]
    }
    return c
  }
  return rec(rec({}, a), b)
}

export function update(action: Action, state: State): State {
  return action.matchWith({
    Top(counter) {
      return extend(state, { top: Counter.update(counter, state.top)})
    },
    Bottom(counter) {
      return extend(state, { bottom: Counter.update(counter, state.bottom)})
    },
    Reset() {
      return {
        top: 0
        , bottom: 0
      }
    }
  })
}

export const init: State = {
  top: Counter.init,
  bottom: Counter.init
}

export function view(state: State): Vnode {
  return h('div', [
    Counter.view(state.top).map(Top.create)
    , Counter.view(state.bottom).map(Bottom.create)
    , h('button', { onclick: Reset.create }, 'reset')
  ])
}