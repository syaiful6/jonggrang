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

export interface OldSemigroup<A> {
  concat(a: A): A;
}

export interface Semigroup<A> {
  'fantasy-land/concat'(a: A): A;
}

export interface IntMap<A> {
  [key: string]: A;
}

export function createCoreTask<A>(tag: 'PURE', _1: A): Task<A>;
export function createCoreTask(tag: 'THROW', _1: Error): Task<any>;
export function createCoreTask<A>(tag: 'SEQUENTIAL', _1: ParTask<A>): Task<A>;
export function createCoreTask<A>(tag: 'SYNC', _1: (...args: any[]) => A, _2: any[], _3: any): Task<A>;
export function createCoreTask<A>(tag: 'ASYNC', _1: Fn1<NodeCallback<A, void>, Canceler> | Computation<A>): Task<A>;
export function createCoreTask<A>(tag: 'EXCEPT', _1: CoreTask<A>, _2: Fn1<Error, CoreTask<A>>): Task<A>;
export function createCoreTask(tag: 'FORK', _1: boolean, _2: CoreTask<any>, _3?: Supervisor): Task<any>;
export function createCoreTask<A, B>(tag: 'BIND', _1: CoreTask<A>, _2: Fn1<A, CoreTask<B>>): Task<B>;
export function createCoreTask<A, B>(tag: 'BRACKET', _1: CoreTask<A>, _2: GeneralBracket<A, B>, _3: Fn1<A, CoreTask<B>>): Task<B>;
export function createCoreTask(tag: any, _1: any, _2?: any, _3?: any): any {
  return new Task(tag, _1, _2, _3);
}

export function createParTask<A>(tag: 'PURE', _1: A): Parallel<A>;
export function createParTask(tag: 'THROW', _1: Error): Parallel<any>;
export function createParTask<A, B>(tag: 'PAR_MAP', _1: Fn1<A, B>, _2: ParTask<A>): Parallel<B>;
export function createParTask<A, B>(tag: 'PAR_APPLY', _1: ParTask<Fn1<A, B>>, _2: ParTask<A>): Parallel<B>;
export function createParTask<A>(tag: 'PAR_ALT', _1: ParTask<A>, _2: ParTask<A>): Parallel<A>;
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
      return new Task('PURE', f(this._1));
    }

    return new Task('BIND', this as Task<A>, (a: A) => {
      return new Task('PURE', f(a));
    });
  }

  ['fantasy-land/map']<B>(f: Fn1<A, B>): Task<B> {
    return this.map(f);
  }

  static of<B>(b: B): Task<B> {
    return new Task('PURE', b);
  }

  static ['fantasy-land/of']<B>(b: B): Task<B> {
    return new Task('PURE', b);
  }

  of<B>(b: B): Task<B> {
    return new Task('PURE', b);
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
    return new Task('BIND', other, (f: Fn1<A, B>) => this.map(f));
  }

  chain<B>(f: Fn1<A, Task<B>>): Task<B> {
    return new Task('BIND', this as Task<A>, f);
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
    return new Task('THROW', e);
  }

  catchError(k: (_: Error) => Task<A>): Task<A> {
    return new Task('EXCEPT', this as Task<A>, k);
  }

  static zero(): Task<any> {
    return new Task('THROW', new Error('Always fails'));
  }

  static ['fantasy-land/zero'](): Task<any> {
    return new Task('THROW', new Error('Always fails'));
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

  concat<B extends OldSemigroup<B>>(this: Task<B>, other: Task<B>): Task<B> {
    return this.chain(a => other.map(b => a.concat(b)));
  }

  'fantasy-land/concat'<B extends Semigroup<B>>(this: Task<B>, other: Task<B>): Task<B> {
    return this.chain(a => other.map(b => a['fantasy-land/concat'](b)));
  }

  static defer<B>(fn: () => Task<B>): Task<B> {
    return new Task('BIND', Task.of(null), fn);
  }
}

export class Parallel<A> {

  constructor(readonly tag: any, readonly _1: any, readonly _2?: any, readonly _3?: any) {
  }

  static of<B>(a: B): Parallel<B> {
    return new Parallel('PURE', a);
  }

  static ['fantasy-land/of']<B>(b: B): Parallel<B> {
    return Parallel.of(b);
  }

  map<B>(f: Fn1<A, B>): Parallel<B> {
    return new Parallel('PAR_MAP', f, this);
  }

  ['fantasy-land/map']<B>(f: Fn1<A, B>) {
    return this.map(f);
  }

  apply<B, C>(this: Parallel<Fn1<B, C>>, other: Parallel<B>): Parallel<C> {
    return new Parallel('PAR_APPLY', this, other);
  }

  ap<B, C>(this: Parallel<Fn1<B, C>>, other: Parallel<B>): Parallel<C> {
    return this.apply(other);
  }

  ['fantasy-land/ap']<B>(o: Parallel<Fn1<A, B>>): Parallel<B> {
    return new Parallel('PAR_APPLY', o, this);
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
    return new Task('SEQUENTIAL', this);
  }
}
