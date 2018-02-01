import { Transition, Batch, Functor } from './types';

export function transition<M, S, A>(model: S, effects: Batch<M, A>): Transition<M, S, A> {
  return { model, effects };
}

export function purely<M, S>(model: S): Transition<M, S, any> {
  return transition(model, []);
}

export function mapEffect<M, S, A, B>(f: (_: A) => B, t: Transition<M, S, A>): Transition<M, S, B> {
  return transition(t.model, t.effects.map(v => v.map(f) as M & Functor<B>)) // ugly
}

export function bimapTransition<M, S, T, A, B>(
  f: (s: S) => T,
  g: (a: A) => B,
  t: Transition<M, S, A>
): Transition<M, T, B> {
  return transition(f(t.model), t.effects.map(v => v.map(g) as M & Functor<B>))
}
