export interface Functor<A> {
  map<B>(f: (_: A) => B): Functor<B>;
}

export type Batch<F, A> = Array<F & Functor<A>>;

export type Transition<M, S, A> = {
  model: S;
  effects: Batch<M, A>;
};

export type Ref<A> = {
  ref: A;
};
