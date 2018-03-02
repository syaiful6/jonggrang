import * as T from '@jonggrang/task';
import { readRef, writeRef, newRef, modifyRef } from '@jonggrang/ref';
import * as E from '@jonggrang/prelude';
import { Loop, EvQueue, withAccum, fix } from './event-queue';
import { Transition, Batch } from './types';
import { VNode } from './vnode';
import * as R from './render';
import * as S from './utils';

export interface App<F, G, S, A> {
  render: (model: S) => VNode<A>;
  update: (model: S, action: A) => Transition<F, S, A>;
  subs: (model: S) => Batch<G, A>;
  init: Transition<F, S, A>;
}

export interface AppInstance<S, A> {
  push: (a: A) => T.Task<void>;
  run: T.Task<void>;
  snapshot: T.Task<S>;
  restore: (s: S) => T.Task<void>;
  subscribe: (f: (_: AppChange<S, A>) => T.Task<void>) => T.Task<T.Task<void>>;
}

export interface AppChange<S, A> {
  old: S;
  action: A;
  model: S;
}

export const enum AppActionType {
  RESTORE,
  ACTION,
  INTERPRET
}

export type AppAction<M, Q, S, I>
  = { tag: AppActionType.RESTORE; payload: S }
  | { tag: AppActionType.ACTION; payload: I }
  | { tag: AppActionType.INTERPRET; payload: E.Either<M, Q> };

type AppState<M, Q, S> = {
  model: S;
  needsRender: boolean;
  interpret: Loop<E.Either<M, Q>>;
  snabbdom: (s: S) => void;
};

export function makeAppQueue<M, Q, S, I>(
  onChange: (c: AppChange<S, I>) => T.Task<void>,
  interpreter: EvQueue<E.Either<M, Q>, I>,
  app: App<M, Q, S, I>,
  el: Element
): EvQueue<AppAction<M, Q, S, I>, AppAction<M, Q, S, I>> {
  return withAccum(self => {
    function pushAction(a: I) {
      return self.push({ tag: AppActionType.ACTION, payload: a });
    }
    function pushEffect(ef: M) {
      return self.push({ tag: AppActionType.INTERPRET, payload: E.left(ef) });
    }
    function runSubs(int: Loop<E.Either<M, Q>>, subs: Q[]) {
      return newRef(int).chain(ref => {
        return T.forInPar(subs, q => {
          return readRef(ref)
            .chain(k => k.loop(E.right(q)))
            .chain(nq => writeRef(ref, nq))
        }).then(readRef(ref));
      });
    }
    function update(
      state: AppState<M, Q, S>,
      action: AppAction<M, Q, S, I>
    ): T.Task<AppState<M, Q, S>> {
      let next: Transition<M, S, I>,
        needsRender: boolean,
        nextState: AppState<M, Q, S>,
        appChange: AppChange<S, I>;
      switch (action.tag) {
        case AppActionType.INTERPRET:
          return state.interpret.loop(action.payload)
            .chain(ni => {
              return T.pure(S.assign({}, state, {
                interpret: ni
              }))
            })

        case AppActionType.ACTION:
          next = app.update(state.model, action.payload);
          needsRender = state.needsRender || state.model !== next.model;
          nextState = S.assign({}, state, {
            needsRender,
            model: next.model
          });
          appChange = { old: state.model, action: action.payload, model: nextState.model };
          return onChange(appChange).then(T.forInPar(next.effects, pushEffect)).map(() => nextState)

        case AppActionType.RESTORE:
          needsRender = state.needsRender || state.model !== action.payload;
          nextState = S.assign({}, state, { needsRender, model: action.payload });
          return T.pure(nextState);
      }
    }
    function commit(state: AppState<M, Q, S>): T.Task<AppState<M, Q, S>> {
      return T.liftEff(null, state, commitRender)
        .then(runSubs(state.interpret, app.subs(state.model))
        .chain(tickInterpret =>
          tickInterpret.tick()
            .map(nextInterpret =>
              ({ snabbdom: state.snabbdom
              , model: state.model
              , interpret: nextInterpret
              , needsRender: false})))
        )
    }
    function emit(a: I) {
      T.launchTask(pushAction(a).then(self.run))
    }
    return T.liftEff(null, emit, app.render, app.init.model, el, snabbdomStep)
      .chain(snabbdom =>
        interpreter(
        S.assign({}, self, { push: (e: I) => self.push({ tag: AppActionType.ACTION, payload: e })})
      ).chain(it2 => {
        return T.forInPar(app.init.effects, pushEffect)
          .chain(() => {
            let st: AppState<M, Q, S> =
              { snabbdom
              , interpret: it2
              , needsRender: false
              , model: app.init.model };
            return T.pure({ update, commit, init: st})
          })
      })
    )
  })
}

function commitRender<M, Q, S>(state: AppState<M, Q, S>) {
  if (state.needsRender) {
    state.snabbdom(state.model)
  }
}

function snabbdomStep<I, S>(
  emit: (_: I) => void, render: (_: S) => VNode<I>,
  init: S, el: Element
): (_: S) => void {
  let snab = renderStep(R.init(emit), render, el);
  snab(init);
  return snab;
}

interface SubscriptionState<S, I> {
  fresh: number;
  cbs: Record<string, (_: AppChange<S, I>) => T.Task<void>>;
}

export function make<M, Q, S, I>(
  interpreter: EvQueue<E.Either<M, Q>, I>,
  app: App<M, Q, S, I>,
  el: Element
): T.Task<AppInstance<S, I>> {
  return newRef<SubscriptionState<S, I>>({ fresh: 0, cbs: {} })
    .chain(subsRef =>
      newRef<S>(app.init.model).chain(stateRef => {
        function handleChange(ac: AppChange<S, I>): T.Task<void> {
          return writeRef(stateRef, ac.model)
            .then(readRef(subsRef))
            .chain(sbs => T.forInPar(S.recordValues(sbs.cbs), cb => cb(ac)))
            .then(T.pure(void 0))
        }
        function subscribe_(cb: (_: AppChange<S, I>) => T.Task<void>): T.Task<T.Task<void>> {
          return readRef(subsRef)
            .chain(sbs => {
              let nkey = sbs.fresh.toString();
              return writeRef(subsRef, S.assign({}, sbs, {
                fresh: sbs.fresh + 1,
                sbs: S.assign({}, sbs.cbs, {
                  [nkey]: cb
                })
              })).map(v => remove(nkey))
            })
        }
        function remove(key: string): T.Task<void> {
          return modifyRef(subsRef, sbs => {
            let nbs = S.assign({}, sbs);
            delete nbs.cbs[key];
            return nbs
          })
        }
        return fix(makeAppQueue(handleChange, interpreter, app, el))
          .map(queue =>
            ({ push: (i: I) => queue.push({ tag: AppActionType.ACTION, payload: i }),
              snapshot: readRef(stateRef),
              restore: (s: S) => queue.push({ tag: AppActionType.RESTORE, payload: s }),
              subscribe: subscribe_,
              run: queue.run
            })
          );
      })
    )
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
