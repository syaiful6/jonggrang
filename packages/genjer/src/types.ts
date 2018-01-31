export interface Functor<A> {
  map<B>(f: (_: A) => B): Functor<A>;
}

export type Batch<F extends Functor<A>, A> = Array<F>;

export type Transition<M extends Functor<A>, S, A> = {
  model: S;
  effects: Batch<M, A>;
}
