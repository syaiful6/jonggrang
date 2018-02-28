import * as P from '@jonggrang/prelude';

export type Fn1<A, B> = {
  (a: A): B
};

export type Fn2<A, B, C> = {
  (a: A, b: B): C
};

export type Eff<A> = {
  (): A
};

/** Node.js style callback, but it only support callback that
 * only take 2 parameters. The first one is Error, if the async
 * operation success, it should set to null or undefined.
 */
export type NodeCallback<A, B> = {
  (error: Error | null | undefined, data?: A): B
};

export interface Pure<A> {
  tag: 'PURE';
  _1: A;
}

export interface Throw {
  tag: 'THROW';
  _1: Error;
}

export interface Except<A> {
  tag: 'EXCEPT';
  _1: CoreTask<A>;
  _2: Fn1<Error, CoreTask<A>>;
}

export interface Sync<A> {
  tag: 'SYNC';
  _1: (...args: any[]) => A;
  _2: any[]; // arguments
  _3: any; // this context
}

export interface Async<A> {
  tag: 'ASYNC';
  _1: Fn1<NodeCallback<A, void>, Canceler> | Computation<A>;
}

export interface Bind<A> {
  tag: 'BIND';
  _1: CoreTask<any>;
  _2: Fn1<any, CoreTask<A>>;
}

export interface Bracket<A> {
  tag: 'BRACKET';
  _1: CoreTask<any>;
  _2: GeneralBracket<any, A>;
  _3: Fn1<any, CoreTask<A>>;
}

export interface Fork {
  tag: 'FORK';
  _1: boolean;
  _2: CoreTask<any>;
  _3?: Supervisor;
}

export interface Sequential<A> {
  tag: 'SEQUENTIAL';
  _1: ParTask<A>;
}

export type CoreTask<A>
  = Pure<A>
  | Throw
  | Except<A>
  | Sync<A>
  | Async<A>
  | Bind<A>
  | Bracket<A>
  | Fork
  | Sequential<A>;

// Canceler
export type Canceler = Fn1<Error, CoreTask<void>>;

export type GeneralBracket<A, B> = {
  killed(e: Error, a: A): CoreTask<void>;
  failed(e: Error, a: A): CoreTask<void>;
  completed(b: B, a: A): CoreTask<void>;
};

/**
 * The computation of async operation.
 */
export interface Computation<A> {
  handle(cb: NodeCallback<A, void>): void;
  cancel(error: Error): CoreTask<void>;
}

// Parallel Task
export interface ParMap<A> {
  tag: 'PAR_MAP';
  _1: Fn1<any, A>;
  _2: ParTask<any>;
}

export interface ParApply<A> {
  tag: 'PAR_APPLY';
  _1: ParTask<Fn1<any, A>>;
  _2: ParTask<any>;
}

export interface ParAlt<A> {
  tag: 'PAR_ALT';
  _1: ParTask<A>;
  _2: ParTask<A>;
}

export type ParTask<A>
  = ParMap<A>
  | ParApply<A>
  | ParAlt<A>
  | CoreTask<A>;

export interface OnComplete<A> {
  rethrow: boolean;
  handler: NodeCallback<A, void>;
}

export interface Fiber<A> {
  run: Eff<void>;
  kill(e: Error, cb: NodeCallback<void, void>): Eff<void>;
  join(a: NodeCallback<A, void>): Eff<void>;
  onComplete(on: OnComplete<A>): Eff<void>;
  isSuspended: Eff<boolean>;
}

export interface Supervisor {
  register(fiber: Fiber<any>): void;
  killAll(err: Error, cb: NodeCallback<any, any>): Canceler;
}

export interface IntMap<A> {
  [key: string]: A;
}

export function createCoreTask<A>(tag: 'PURE', _1: A): PureTask<A>;
export function createCoreTask(tag: 'THROW', _1: Error): ThrowTask;
export function createCoreTask<A>(tag: 'SEQUENTIAL', _1: ParTask<A>): SequentialTask<A>;
export function createCoreTask<A>(tag: 'SYNC', _1: (...args: any[]) => A, _2: any[], _3: any): SyncTask<A>;
export function createCoreTask<A>(tag: 'ASYNC', _1: Fn1<NodeCallback<A, void>, Canceler> | Computation<A>): AsyncTask<A>;
export function createCoreTask<A>(tag: 'EXCEPT', _1: CoreTask<A>, _2: Fn1<Error, CoreTask<A>>): ExceptTask<A>;
export function createCoreTask(tag: 'FORK', _1: boolean, _2: CoreTask<any>, _3?: Supervisor): ForkTask;
export function createCoreTask<A, B>(tag: 'BIND', _1: CoreTask<A>, _2: Fn1<A, CoreTask<B>>): BindTask<B>;
export function createCoreTask<A, B>(tag: 'BRACKET', _1: CoreTask<A>, _2: GeneralBracket<A, B>, _3: Fn1<A, CoreTask<B>>): BracketTask<B>;
export function createCoreTask(tag: any, _1: any, _2?: any, _3?: any): any {
  return new Task(tag, _1, _2, _3);
}

export function createParTask<A>(tag: 'PURE', _1: A): PureTask<A>;
export function createParTask(tag: 'THROW', _1: Error): ThrowTask;
export function createParTask<A, B>(tag: 'PAR_MAP', _1: Fn1<A, B>, _2: ParTask<A>): ParMap<B>;
export function createParTask<A, B>(tag: 'PAR_APPLY', _1: ParTask<Fn1<A, B>>, _2: ParTask<A>): ParApply<B>;
export function createParTask<A>(tag: 'PAR_ALT', _1: ParTask<A>, _2: ParTask<A>): ParAlt<A>;
export function createParTask(tag: any, _1: any, _2?: any, _3?: any): any {
  return new Parallel(tag, 1, _2, _3);
}

export function nonCanceler(e: Error): CoreTask<void> {
  return createCoreTask('PURE', void 0);
}

export interface ChainRecFn<A, B> {
  (n: (_: A) => P.Either<A, B>, d: (_: B) => P.Either<A, B>, v: A): Task<P.Either<A, B>>;
}

export class Task<A> {
  readonly tag: any;
  readonly _1: any;
  readonly _2?: any;
  readonly _3?: any;

  constructor(tag: any, _1: any, _2?: any, _3?: any) {
    this.tag = tag;
    this._1 = _1;
    this._2 = _2;
    this._3 = _3;
  }

  map<B>(f: Fn1<A, B>): Task<B> {
    if (this.tag === 'PURE') {
      return new PureTask(f(this._1));
    }

    return new BindTask(this as Task<A>, (a: A) => {
      return new PureTask(f(a));
    });
  }

  ['fantasy-land/map']<B>(f: Fn1<A, B>): Task<B> {
    return this.map(f);
  }

  static of<B>(b: B): Task<B> {
    return new PureTask(b);
  }

  static ['fantasy-land/of']<B>(b: B): Task<B> {
    return new PureTask(b);
  }

  of<B>(b: B): Task<B> {
    return new PureTask(b);
  }

  ['fantasy-land/of']<B>(b: B): Task<B> {
    return this.of(b);
  }

  apply<B, C>(this: Task<Fn1<B, C>>, other: Task<B>): Task<C> {
    return this.chain(f => other.map(f));
  }

  ap<B, C>(this: Task<Fn1<B, C>>, other: Task<B>): Task<C> {
    return this.chain(f => other.map(f));
  }

  ['fantasy-land/ap']<B>(other: Task<Fn1<A, B>>): Task<B> {
    return new BindTask(other, f => this.map(f));
  }

  chain<B>(f: Fn1<A, Task<B>>): Task<B> {
    return new BindTask(this as Task<A>, f);
  }

  ['fantasy-land/chain']<B>(f: Fn1<A, Task<B>>): Task<B> {
    return this.chain(f);
  }

  then<B>(next: Task<B>): Task<B> {
    return this.chain(_ => next);
  }

  static chainRec<B, C>(fn: ChainRecFn<B, C>, i: B): Task<C> {
    function go(a: B): Task<C> {
      return fn(P.left, P.right, a).chain(res => {
        if (P.isRight(res)) {
          return Task.of(res.value);
        }
        return go(res.value);
      });
    }
    return go(i);
  }

  static ['fantasy-land/chainRec']<B, C>(fn: ChainRecFn<B, C>, i: B): Task<C> {
    return Task.chainRec(fn, i);
  }

  static throwError(e: Error): Task<any> {
    return new ThrowTask(e);
  }

  catchError(k: (_: Error) => Task<A>): Task<A> {
    return new ExceptTask(this as Task<A>, k);
  }

  static zero(): Task<any> {
    return new ThrowTask(new Error('Always fails'));
  }

  static ['fantasy-land/zero'](): Task<any> {
    return new ThrowTask(new Error('Always fails'));
  }

  alt(other: Task<A>): Task<A> {
    return this.catchError(() => other);
  }

  ['fantasy-land/alt'](other: Task<A>): Task<A> {
    return this.alt(other);
  }

  parallel(): Parallel<A> {
    return new Parallel(this.tag, this._1, this._2, this._3);
  }
}

export class PureTask<A> extends Task<A> implements Pure<A> {
  readonly tag: 'PURE';
  constructor(readonly _1: A) {
    super('PURE', _1);
  }
}

export class ThrowTask extends Task<any> implements Throw {
  readonly tag: 'THROW';
  constructor(readonly _1: Error) {
    super('THROW', _1);
  }
}

export class ExceptTask<A> extends Task<A> implements Except<A> {
  readonly tag: 'EXCEPT';
  constructor(readonly _1: CoreTask<A>, readonly _2: Fn1<Error, CoreTask<A>>) {
    super('EXCEPT', _1, _2);
  }
}

export class SyncTask<A> extends Task<A> implements Sync<A> {
  readonly tag: 'SYNC';
  constructor(readonly _1: Eff<A>, readonly _2: any, readonly _3: any) {
    super('SYNC', _1, _2, _3);
  }
}

export class AsyncTask<A> extends Task<A> implements Async<A> {
  readonly tag: 'ASYNC';
  constructor(readonly _1: Fn1<NodeCallback<A, void>, Canceler> | Computation<A>) {
    super('ASYNC', _1);
  }
}

export class BindTask<A> extends Task<A> implements Bind<A> {
  readonly tag: 'BIND';
  constructor(readonly _1: CoreTask<any>, readonly _2: Fn1<any, CoreTask<A>>) {
    super('BIND', _1, _2);
  }
}

export class BracketTask<A> extends Task<A> implements Bracket<A> {
  readonly tag: 'BRACKET';
  constructor(
    readonly _1: CoreTask<any>,
    readonly _2: GeneralBracket<any, A>,
    readonly _3: Fn1<any, CoreTask<A>>
  ) {
      super('BRACKET', _1, _2, _3);
  }
}

export class ForkTask extends Task<any> implements Fork {
  readonly tag: 'FORK';
  constructor(readonly _1: boolean, readonly _2: CoreTask<any>, readonly _3?: Supervisor) {
    super('FORK', _1, _2, _3);
  }
}

export class SequentialTask<A> extends Task<A> implements Sequential<A> {
  readonly tag: 'SEQUENTIAL';
  constructor(readonly _1: ParTask<A>) {
    super('SEQUENTIAL', _1);
  }
}

export class Parallel<A> {

  constructor(readonly tag: any, readonly _1: any, readonly _2?: any, readonly _3?: any) {
  }

  static of<B>(a: B): Parallel<B> {
    return new PureParallel(a);
  }

  static ['fantasy-land/of']<B>(b: B): Parallel<B> {
    return Parallel.of(b);
  }

  map<B>(f: Fn1<A, B>): Parallel<B> {
    return new MapParallel(f, this);
  }

  ['fantasy-land/map']<B>(f: Fn1<A, B>) {
    return this.map(f);
  }

  apply<B, C>(this: Parallel<Fn1<B, C>>, other: Parallel<B>): Parallel<C> {
    return new ApParallel(this, other);
  }

  ap<B, C>(this: Parallel<Fn1<B, C>>, other: Parallel<B>): Parallel<C> {
    return this.apply(other);
  }

  ['fantasy-land/ap']<B>(o: Parallel<Fn1<A, B>>): Parallel<B> {
    return new ApParallel(o, this);
  }

  alt(other: Parallel<A>): Parallel<A> {
    return new Parallel('PAR_ALT', this, other);
  }

  ['fantasy-land/alt'](other: Parallel<A>): Parallel<A> {
    return this.alt(other);
  }

  static zero(): Parallel<any> {
    return new Parallel('THROW', new Error('Always fails'));
  }

  static ['fantasy-land/zero'](): Parallel<any> {
    return Parallel.zero();
  }

  sequential(): Task<A> {
    return new SequentialTask(this);
  }
}

export class PureParallel<A> extends Parallel<A> implements Pure<A> {
  readonly tag: 'PURE';
  constructor(readonly _1: A) {
    super('PURE', _1);
  }
}

export class MapParallel<A> extends Parallel<A> implements ParMap<A> {
  readonly tag: 'PAR_MAP';
  constructor(readonly _1: Fn1<any, A>, readonly _2: ParTask<any>) {
    super('PAR_MAP', _1, _2);
  }
}

export class ApParallel<A> extends Parallel<A> implements ParApply<A> {
  readonly tag: 'PAR_APPLY';
  constructor(readonly _1: ParTask<Fn1<any, A>>, readonly _2: ParTask<any>) {
    super('PAR_APPLY', _1, _2);
  }
}
