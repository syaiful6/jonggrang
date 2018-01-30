import { Task, runTask } from '@jonggrang/task';
import { VNode } from './vnode';
import * as R from './render';

export interface Transition<S, A> {
  model: S;
  effects: Task<A>[];
}

export interface App<S, A> {
  render: (model: S) => VNode<A>;
  update: (model: S, action: A) => Transition<S, A>;
  subs: (model: S) => Task<A>[];
  init: () => Transition<S, A>;
}

function emptySubs(): Task<any>[] {
  return []
}

export function simpleApp<S, A>(
  render: (model: S) => VNode<A>,
  update: (model: S, action: A) => Transition<S, A>,
  init: () => Transition<S, A>
): App<S, A> {
  return {
    render,
    update,
    init,
    subs: emptySubs
  }
}

const enum RenderStep {
  NOREQUEST,
  PENDINGREQUEST,
  EXTRAREQUEST
};

function renderStep<A, S>(
  patch: (old: VNode<A> | Element, vnode: VNode<A>) => VNode<A>,
  render: (s: S) => VNode<A>,
  root: Element
) {
  let old: VNode<A> | Element = root;
  let state: RenderStep = RenderStep.NOREQUEST;
  let nextModel: S;
  function update() {
    switch (state) {
      case RenderStep.NOREQUEST:
        throw new Error('Unexpected draw callback.\n');

      case RenderStep.PENDINGREQUEST:
        requestAnimationFrame(update);
        state = RenderStep.EXTRAREQUEST;
        old = patch(old, render(nextModel));
        break;

      case RenderStep.EXTRAREQUEST:
        state = RenderStep.NOREQUEST;
        break;
    }
  }

  return function step(s: S) {
    if (state === RenderStep.NOREQUEST) {
      requestAnimationFrame(update);
    }
    state = RenderStep.PENDINGREQUEST;
    nextModel = s;
  }
}

export function runApp<S, A>(app: App<S, A>, node: Element) {
  let tinit = app.init(),
    model = tinit.model,
    patch = R.init(emit),
    step  = renderStep(patch, app.render, node);

  function handleTask(err: Error | null | undefined, a?: A) {
    if (err) {
      throw err;
    }
    if (a) {
      emit(a);
    }
  }

  function emit(a: A) {
    let trans = app.update(model, a);
    model = trans.model;
    step(model);
    let subs = app.subs(model);
    let allEffs = trans.effects.concat(subs);
    allEffs.forEach(t => runTask(handleTask, t))
  }

  tinit.effects.concat(app.subs(model)).forEach(t => runTask(handleTask, t));
  step(model);

  return emit;
}

export function noEffect<S>(s: S): Transition<S, any> {
  return {
    model: s,
    effects: []
  }
}

export function mapEffect<S, A, B>(t: Transition<S, A>, f: (_: A) => B): Transition<S, B> {
  return {
    model: t.model,
    effects: t.effects.map(ts => ts.map(f))
  };
}

export function bimapTransition<S, T, A, B>(t: Transition<S, A>, f: (_: S) => T, g: (_: A) => B): Transition<T, B> {
  return {
    model: f(t.model),
    effects: t.effects.map(ts => ts.map(g))
  }
}
