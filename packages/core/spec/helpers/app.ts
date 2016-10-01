import { Task } from 'jonggrang.task'
import { noEffects, EffModel } from '../../lib'

interface Pattern<T> {
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

function update(action: Action, state: State): EffModel<State, Action> {
  return noEffects(action.matchWith({
    Increment() {
      return state + 1
    }
    , Decrement() {
      return state - 1
    }
  }))
}

function subscriptions(state: State): Array<Task<Action, Action>> {
  return []
}

export const config = {
  init: 0,
  update: update,
  subscriptions: subscriptions
}