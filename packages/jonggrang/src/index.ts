import { Stream, stream, map, scan } from 'flyd'
import { dropRepeats } from 'flyd/module/droprepeats'
import { Task } from 'jonggrang.task'

/**
 * The container type for app state and a collection of task which will resolve
 * with action. This type returned by update function.
 */
export interface EffModel<ST, AC> {
  state: ST
  effects: Array<Task<AC, AC>>
}

/**
 * Interface for an update function, it take an action and current state of app and return
 * EffModel
 */
export interface Update<ST, AC> {
  (action: AC, state: ST): EffModel<ST, AC>
}

/**
 * An app consists of two stream:
 * - state: A stream representing the application's current state.
 * - action: A stream input that can be used to send actions to application
 */
export type App<ST, AC> = {
  state: Stream<ST>
  action: Stream<AC>
}

/**
 * The configuration of an app consists of update and initial state.
 *
 * The `update` function describe how to step the state and view the state.
 *
 * The `subscriptions` function take a state and return an array of Task, the results
 * will be send to update function.
 */
export interface Config<ST, AC> {
  update: Update<ST, AC>
  init: ST
  subscriptions: (st: ST) => Array<Task<AC, AC>>
}

function toArray<T>(s: T | T[]): T[] {
  return Array.isArray(s) ? s : [s]
}

function getEffState<ST>(eff: EffModel<ST, any>): ST {
  return eff.state
}

function forwardTaskToStream<T>(stream: Stream<T>, task: Task<T, T>) {
  return task.fork(stream, stream)
}

export function application<ST, AC>(config: Config<ST, AC>): App<ST, AC> {
  let actionStream = stream<AC>()
  let input = map<AC, Array<AC>>(toArray, actionStream)
  let effModelSignal = scan(foldActions, noEffects(config.init), input)
  let stateSignal = dropRepeats(map<EffModel<ST, AC>, ST>(getEffState, effModelSignal))

  map(mapAffects, effModelSignal)

  function mapAffects(eff: EffModel<ST, AC>) {
    let effects = eff.effects.concat(config.subscriptions(eff.state))
    effects.forEach(eff => {
      forwardTaskToStream(actionStream, eff)
    })
  }
  function foldActions(effModel: EffModel<ST, AC>, actions: Array<AC>) {
    return actions.reduce(invokeAppUpdate, noEffects(effModel.state))
  }
  function invokeAppUpdate(eff: EffModel<ST, AC>, action: AC): EffModel<ST, AC> {
    return config.update(action, eff.state)
  }

  return {
    state: stateSignal,
    action: actionStream
  }
}

export function mapState<T, A, B>(fn: (a: A) => T, eff: EffModel<A, B>): EffModel<T, B> {
  return {
    state: fn(eff.state),
    effects: eff.effects
  }
}

export function mapEffects<T, A, B>(fn: (a: B) => T, eff: EffModel<A, B>): EffModel<A, T> {
  return {
    state: eff.state,
    effects: eff.effects.map(b => b.fold(fn, fn))
  }
}

export function noEffects<ST>(state: ST): EffModel<ST, never> {
  return {
    state: state,
    effects: []
  }
}