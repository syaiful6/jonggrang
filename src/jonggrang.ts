import {Stream, stream, map, scan} from 'flyd'
import {dropRepeats} from 'flyd/module/droprepeats'
import {Vnode} from './vdom/vnode'
import {mergeAll} from './util/stream-operator'

export interface Task<A, B> {
  fork(reject: (a: A) => void, resove: (b: B) => void): void
}

export type EffModel<ST, AC> = {
  state: ST
  effects: Task<AC, AC>[]
}

export type Update<AC, ST> = {
  (action: AC, state: ST): EffModel<ST, AC>
}

export type App<ST> = {
  state: Stream<ST>
  vnode: Stream<Vnode>
}

export type Config<ST, AC> = {
  update: Update<AC, ST>
  view: (state: ST) => Vnode
  initialState: ST
  inputs: Stream<AC>[]
}

function toArray<T>(s: T | T[]): T[] {
  return Array.isArray(s) ? s : [s]
}

export function app<ST, AC>(config: Config<ST, AC>): App<ST> {
  let actionStream = stream<AC>()
  let input = map<AC, Array<AC>>(toArray, mergeAll([actionStream].concat(config.inputs)))
  let effModelSignal = scan(foldActions, noEffects(config.initialState), input)
  let stateSignal = dropRepeats(map(getEffState, effModelSignal))
  let vnodeSignal = map(config.view, stateSignal)

  map(mapAffects, effModelSignal)

  function getEffState(eff: EffModel<ST, AC>) {
    return eff.state
  }
  function mapAffects(eff: EffModel<ST, AC>) {
    let effects = eff.effects
    for (let i = 0; i < effects.length; i++) {
      let task = effects[i]
      task.fork(actionStream, actionStream)
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
