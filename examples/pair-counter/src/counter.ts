import { h, EffModel, Vnode } from '../../../src'

export interface Pattern<T> {
  Increment(): T
  Decrement(): T
}

export class Increment {
  matchWith<T>(pattern: Pattern<T>): T {
    return pattern.Increment()
  }
  static create() {
    return new Increment()
  }
}

export class Decrement {
  matchWith<T>(pattern: Pattern<T>): T {
    return pattern.Decrement()
  }
  static create() {
    return new Decrement()
  }
}

export type Action = Increment | Decrement
export type State = number

export function update(action: Action, state: State): State {
  return action.matchWith({
    Increment() {
      return state + 1
    }
    , Decrement() {
      return state - 1
    }
  })
}

export const init: EffModel<State, Action> = {
  state: 0
  , effects: []
}

export function view(state: State): Vnode {
  return h('div', [
    h('button', { onclick: Increment.create }, '+')
    , h('div', state)
    , h('button', { onclick: Decrement.create }, '-')
  ])
}
