import { Stream, stream, map, scan } from 'flyd'
import { dropRepeats } from 'flyd/module/droprepeats'

import { Vnode } from './vdom/vnode'
import { Task } from './concurrent/task'
import { mergeAll } from './util/stream-operator'

export type EffModel<ST, AC> = {
  state: ST
  effects: Task<AC, AC>[]
}

export interface Update<AC, ST> {
  (action: AC, state: ST): EffModel<ST, AC>
}

export type App<ST> = {
  state: Stream<ST>
  vnode: Stream<Vnode>
}

export interface Config<ST, AC> {
  update: Update<AC, ST>
  view: (state: ST) => Vnode
  initialState: ST
  inputs: Stream<AC>[]
}

function toArray<T>(s: T | T[]): T[] {
  return Array.isArray(s) ? s : [s]
}

function getEffState<ST>(eff: EffModel<ST, any>): ST {
  return eff.state
}

function forwardTaskToStream<A>(stream: Stream<A>, task: Task<A, A>) {
  let { future } = task.run()
  future.listen({
    success: stream
    , failure: stream
  })
}

export function app<ST, AC>(config: Config<ST, AC>): App<ST> {
  let actionStream = stream<AC>()
  let input = map<AC, Array<AC>>(toArray, mergeAll([actionStream].concat(config.inputs)))
  let effModelSignal = scan(foldActions, noEffects(config.initialState), input)
  let stateSignal = dropRepeats(map<EffModel<ST, AC>, ST>(getEffState, effModelSignal))
  let vnodeSignal = map(config.view, stateSignal)

  map(mapAffects, effModelSignal)

  function mapAffects(eff: EffModel<ST, AC>) {
    let effects = eff.effects
    for (let i = 0; i < effects.length; i++) {
      forwardTaskToStream(actionStream, effects[i])
    }
  }
  function foldActions(effModel: EffModel<ST, AC>, actions: Array<AC>) {
    return actions.reduce(invokeAppUpdate, noEffects(effModel.state))
  }
  function invokeAppUpdate(eff: EffModel<ST, AC>, action: AC): EffModel<ST, AC> {
    return config.update(action, eff.state)
  }

  effModelSignal(noEffects(config.initialState))

  return {
    state: stateSignal,
    vnode: vnodeSignal
  }
}

export function mapState<T, A, B>(fn: (a: A) => T, eff: EffModel<A, B>): EffModel<T, B> {
  return {
    state: fn(eff.state),
    effects: eff.effects
  }
}

export function noEffects<ST>(state: ST): EffModel<ST, never> {
  return {
    state: state,
    effects: []
  }
}
