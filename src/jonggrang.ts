import { Stream, stream, map, scan } from 'flyd'
import { dropRepeats } from 'flyd/module/droprepeats'

import { Vnode } from './vdom/vnode'
import { render } from './vdom/render'
import { Task } from './data/task'
import { mergeAll } from './util/stream-operator'

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
export interface Update<AC, ST> {
  (action: AC, state: ST): EffModel<ST, AC>
}

/**
 * An app consists of two stream:
 * - state: A stream representing the application's current state.
 * - action: A stream input that can be used to send actions to application
 *
 * The render method can be used to mount the application to DOM.
 */
export type App<ST, AC> = {
  state: Stream<ST>
  action: Stream<AC>
  render: (dom: HTMLElement) => void
}

/**
 * The configuration of an app consists of update and view functions along with initial
 * EffModel. The initial EffModel will be used to provide initial state of app and kick
 * it's tasks - helpful to perform side effects on page-load.
 *
 * The `update` and `view` functions describe how to step the state and view the state.
 *
 * The `inputs` array is for any external stream you might need. These will be merged into
 * the app's input strean.
 */
export interface Config<ST, AC> {
  update: Update<AC, ST>
  view: (state: ST) => Vnode
  init: EffModel<ST, AC>
  inputs: Array<Stream<AC>>
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

export function app<ST, AC>(config: Config<ST, AC>): App<ST, AC> {
  let actionStream = stream<AC>()
  let input = map<AC, Array<AC>>(toArray, mergeAll([actionStream].concat(config.inputs)))
  let effModelSignal = scan(foldActions, config.init, input)
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
  function renderer(dom: HTMLElement) {
    let renderService = render({ tagger: actionStream, parent: null })
    renderToDom(renderService, dom, vnodeSignal)
  }

  return {
    state: stateSignal,
    action: actionStream,
    render: renderer
  }
}

export function mapState<T, A, B>(fn: (a: A) => T, eff: EffModel<A, B>): EffModel<T, B> {
  return {
    state: fn(eff.state),
    effects: eff.effects
  }
}

export function foldEffModel<SR, EffR, S, Eff>(
  stateFn: (s: S) => SR,
  effFn: (eff: Array<Task<Eff, Eff>>) => Array<Task<EffR, EffR>>,
  effModel: EffModel<S, Eff>
): EffModel<SR, EffR> {
  return {
    state: stateFn(effModel.state),
    effects: effFn(effModel.effects)
  }
}

export function noEffects<ST>(state: ST): EffModel<ST, never> {
  return {
    state: state,
    effects: []
  }
}

enum RENDER {
  NONE,
  PENDING,
  EXTRA
}

function renderToDom(
  renderer: (dom: HTMLElement, vnode: Vnode | null | Array<Vnode | null>) => void,
  dom: HTMLElement,
  vnode: Stream<Vnode>
) {
  let state: RENDER = RENDER.NONE
  let nextVnode: Vnode | null = null
  function redraw(currentVnode: Vnode) {
    if (state === RENDER.NONE) {
      requestAnimationFrame(runRenderer)
    }
    state = RENDER.PENDING
    nextVnode = currentVnode
  }
  function runRenderer() {
    switch (state) {
      case RENDER.NONE:
        throw new Error('invalid renderer state')
      case RENDER.PENDING:
        requestAnimationFrame(runRenderer)
        state = RENDER.EXTRA
        renderer(dom, nextVnode)
        nextVnode = null
        return
      case RENDER.EXTRA:
        state = RENDER.NONE
        return
    }
  }
  map(redraw, vnode)
}