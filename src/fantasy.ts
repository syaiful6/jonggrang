export interface Unary<T, U> {
  (input: T): U
}

export interface Functor<T> {
  map<U>(func: Unary<T, U>): Functor<U>
}

export interface Apply<T> extends Functor<T> {
  ap<U>(other: Apply<Unary<T, U>>): Apply<U>
}

export interface Applicative<T> extends Apply<T> {
  of<U>(value: U): Applicative<U>
}

export interface Monad<T> extends Apply<T> {
  chain<U>(func: Unary<T, Monad<U>>): Monad<U>
}

export function map<T, U>(func: Unary<T, U>) {
  return function (functor: Functor<T>): Functor<U> {
    return functor.map(func)
  }
}

export function ap<T, U>(a1: Apply<Unary<T, U>>) {
  return function (a2: Apply<T>): Apply<U> {
    return a2.ap(a1)
  }
}

export function chain<T, U>(func: Unary<T, Monad<U>>) {
  return function (monad: Monad<T>): Monad<U> {
    return monad.chain(func)
  }
}

export function liftA2<T1, T2, U>(func: Unary<T1, Unary<T2, U>>) {
  return function (x: Apply<T1>) {
    return function (y: Apply<T2>) {
      return y.ap(x.map(func) as Apply<Unary<T2, U>>)
    }
  }
}

export function liftA3<T1, T2, T3, U>(func: Unary<T1, Unary<T2, Unary<T3, U>>>) {
  return function (x: Apply<T1>) {
    return function (y: Apply<T2>) {
      return function (z: Apply<T3>) {
        return z.ap(liftA2(func)(x)(y))
      }
    }
  }
}
