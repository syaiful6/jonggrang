import { EitherType, Either, Left, Right, left, right } from '@jonggrang/prelude';

import {
  CoreTask, Pure, Throw, Except, Bind, Bracket, Sync, Async, Fork, Sequential,
  ParTask, ParMap, createCoreTask, Task, Supervisor, Computation, Fiber, Canceler,
  Fn1, IntMap, OnComplete, NodeCallback, Eff, nonCanceler
} from './types';
import { scheduler } from './scheduler';
import { thrower } from './utils';


export interface ConsTask {
  tag: 'CONS';
  _1: Fn1<any, CoreTask<any>> | InterpretTask;
  _2: InterpretTask | null;
  _3?: Error | null;
}

export interface ResumeTask {
  tag: 'RESUME';
  _1: Fn1<any, InterpretTask>;
  _2: InterpretTask;
}

export interface ReleaseTask {
  tag: 'RELEASE';
  _1: InterpretTask;
  _2: any;
}

export interface Finalized {
  tag: 'FINALIZED';
  _1: InterpretTask;
}

export interface Finalizer {
  tag: 'FINALIZER';
  _1: InterpretTask;
}

export interface Empty {
  tag: 'EMPTY';
  _1: null;
}

export interface ApMap {
  tag: 'APMAP';
  _1: Fn1<any, any>;
  _2: InterpretTask;
  _3: Empty | Either<Error, any>;
}

export interface ApApply {
  tag: 'APAPPLY';
  _1: InterpretTask;
  _2: InterpretTask;
  _3: Empty | Either<Error, any>;
}

export interface ApAlt {
  tag: 'APALT';
  _1: InterpretTask;
  _2: InterpretTask;
  _3: Empty | Either<Error, any>;
}

export interface Forked {
  tag: 'FORKED';
  _1: number;
  _2: InterpretTask;
  _3: Empty | Either<Error, any>;
}

const TEMPTY: Empty = { tag: 'EMPTY', _1: null };

export type InterpretTask
  = CoreTask<any>
  | ParTask<any>
  | ConsTask
  | ResumeTask
  | ReleaseTask
  | Finalized
  | Finalizer
  | Empty
  | ApMap
  | ApApply
  | ApAlt
  | Forked;

export const enum StateFiber {
  SUSPENDED,
  CONTINUE,
  STEP_BIND,
  STEP_RESULT,
  PENDING,
  RETURN,
  COMPLETED
}

class ParComputation<A> implements Computation<A> {
  private _root: InterpretTask;
  private _fiberId: number;
  private _fibers: IntMap<Fiber<any>>;
  private _killId: number;
  private _kills: IntMap<IntMap<Eff<void>>>;
  private _interupt: Either<Error, any> | null;
  private _callback: NodeCallback<A>;

  constructor(private par: ParTask<A>, private supervisor?: Supervisor) {
    this._fiberId = 0;
    this._fibers = Object.create(null);

    this._killId = 0;
    this._kills = Object.create(null);

    this._interupt = null;
    this._root = TEMPTY;
    this._callback = doNothing;
  }

  cancel(err: Error): Task<void> {
    return createCoreTask('ASYNC', (killCb: NodeCallback<void>) => {
      return this._cancelAll(err, killCb);
    });
  }

  private _cancelAll(error: Error, killCb: NodeCallback<void>): Canceler {
    this._interupt = left(error);
    let table: IntMap<Eff<void>>;
    for (let kid in this._kills) {
      if (Object.hasOwnProperty.call(this._kills, kid)) {
        table = this._kills[kid];
        for (let k in table) {
          if (Object.hasOwnProperty.call(this._kills, kid)) table[k]();
        }
      }
    }
    this._kills = Object.create(null);
    this._killId = 0;
    let newKills = this.kill(error, this._root, killCb);
    return (kerr) => {
      return createCoreTask('SYNC', () => {
        for (let kid in newKills) {
          if (Object.hasOwnProperty.call(newKills, kid)) newKills[kid]();
        }
      }, [], null);
    };
  }

  private resolve(fib: Forked, err: Error | null | undefined, data: any) {
    delete this._fibers[fib._1];
    const result: Either<Error, any> = err != null ? left(err) : right(data);
    fib._3 = result;
    this.join(result, fib._2._1, (fib._2 as any)._2);
  }

  private kill(error: Error, par: InterpretTask, cb: NodeCallback<any>) {
    let step  = par,
      head  = null,
      tail  = null,
      count = 0,
      kills: any = Object.create(null),
      tmp: any, kid: any, len: any;

    function killHelper(s: Fiber<any>) {
      return () => {
        return s.kill(error, (err: any, data: any) => {
          count--;
          if (count === 0) {
            cb(err, data);
          }
        });
      };
    }
    loop: while (true) {
      tmp = null;
      switch (step.tag) {
        case 'FORKED':
          if ((step as Forked)._3 === TEMPTY) {
            tmp = this._fibers[step._1];
            kills[count++] = killHelper(tmp);
          }
          // Terminal case.
          if (head === null) {
            break loop;
          }
          // Go down the right side of the tree.
          step = head._2;
          if (tail === null) {
            head = null;
          } else {
            head = (tail as any)._1;
            tail = (tail as any)._2;
          }
        break;

        case 'APMAP':
          step = step._2;
        break;

        case 'APAPPLY':
        case 'APALT':
          if (head) {
            tail = createInterpret('CONS', head, tail, null);
          }
          head = step;
          step = (step as ApApply | ApAlt)._1;
        break;
      }
    }
    if (count === 0) {
      cb(null, void 0);
    } else {
      kid = 0;
      len = count;
      for (; kid < len; kid++) {
        kills[kid] = kills[kid]();
      }
    }
    return kills;
  }

  private join(result: Either<Error, any>, head: InterpretTask | null, tail: InterpretTask | null) {
    let fail: any, step: any, lhs: any, rhs: any, tmp: any, kid: number | null;
    if (isLeft(result)) {
      fail = result;
      step = null;
    } else {
      step = result;
      fail = null;
    }
    while (true) {
      lhs = null;
      rhs = null;
      tmp = null;
      kid = null;
      // We should never continue if the entire tree has been interrupted.
      if (this._interupt !== null) {
        return;
      }
      // We've made it all the way to the root of the tree, which means
      // the tree has fully evaluated.
      if (head === null) {
        runHandler(this._callback, (fail || step) as Either<Error, any>);
        return;
      }

      if ((head as any)._3 !== TEMPTY) {
        return;
      }

      if (head.tag === 'APMAP') {
        if (fail === null) {
          head._3 = right((head._1 as any)((step as Right<any>).value));
          step = head._3;
        } else {
          head._3 = fail;
        }
      } else if (head.tag === 'APAPPLY') {
        lhs = (head._1 as any)._3;
        rhs = (head._2 as any)._3;
        if (fail) {
          head._3 = fail;
          tmp     = true;
          kid     = this._killId++;
          this._kills[kid] = this.kill(new Error('[Paraller] Early exit'), fail === lhs ? head._2 : head._1, () => {
            delete this._kills[kid as any];
            if (tmp) {
              tmp = false;
            } else if (tail === null) {
              this.join(step, null, null);
            } else {
              this.join(step, tail._1, (tail as any)._2);
            }
          });
          if (tmp) {
            tmp = false;
            return;
          }
        } else if (lhs === TEMPTY || rhs === TEMPTY) {
          return;
        } else {
          step    = right(lhs.value(rhs.value));
          head._3 = step;
        }
      } else if (head.tag === 'APALT') {
        lhs = (head._1 as any)._3;
        rhs = (head._2 as any)._3;
        // We can only proceed if both have resolved or we have a success
        if (lhs === TEMPTY && isLeft(rhs) || rhs === TEMPTY && isLeft(lhs)) {
          return;
        }
        // If both sides resolve with an error, we should continue with the
        // first error
        if (lhs !== TEMPTY && isLeft(lhs) && rhs !== TEMPTY && isLeft(rhs)) {
          fail    = step === lhs ? rhs : lhs;
          step    = null;
          head._3 = fail;
        } else {
          head._3 = step as Right<any>;
          tmp     = true;
          kid     = this._killId++;
          // Once a side has resolved, we need to cancel the side that is still
          // pending before we can continue.
          this._kills[kid] = this.kill(
            new Error('early'),
            step === lhs ? (head as ApAlt)._2 : (head as ApAlt)._1,
            () => {
              delete this._kills[kid as number];
              if (tmp) {
                tmp = false;
              } else if (tail === null) {
                this.join(step, null, null);
              } else {
                this.join(step, tail._1, (tail as any)._2);
              }
          });

          if (tmp) {
            tmp = false;
            return;
          }
        }
      }

      if (tail === null) {
        head = null;
      } else {
        head = (tail as any)._1;
        tail = (tail as any)._2;
      }
    }
  }

  handle(cb: NodeCallback<any>) {
    let status = StateFiber.CONTINUE;
    let step: InterpretTask  = this.par;
    let head   = null;
    let tail   = null;
    let tmp, fid;
    this._callback = cb;
    loop: while (true) {
      tmp = null;
      fid = null;
      switch (status) {
        case StateFiber.CONTINUE:
          switch (step.tag) {
            case 'PAR_MAP':
              if (head) {
                tail = createInterpret('CONS', head, tail, null);
              }
              head = createInterpret('APMAP', (step as ParMap<any>)._1, TEMPTY, TEMPTY);
              step = step._2;
            break;

            case 'PAR_APPLY':
              if (head) {
                tail = createInterpret('CONS', head, tail, null);
              }
              head = createInterpret('APAPPLY', TEMPTY, step._2, TEMPTY);
              step = step._1;
            break;

            case 'PAR_ALT':
              if (head) {
                tail = createInterpret('CONS', head, tail, null);
              }
              head = createInterpret('APALT', TEMPTY, step._2, TEMPTY);
              step = step._1;
              break;

            default:
              fid = this._fiberId++;
              status = StateFiber.RETURN;
              tmp    = step;
              step   = createInterpret('FORKED', fid, createInterpret('CONS', head as any, tail, null), TEMPTY);
              tmp    = new TaskFiber(tmp as CoreTask<A>, this.supervisor);
              tmp.onComplete({
                rethrow: false,
                handler: this.resolve.bind(this, step)
              });
              this._fibers[fid] = tmp;
              if (this.supervisor) {
                this.supervisor.register(tmp);
              }
          }
          break;
        case StateFiber.RETURN:
          if (head === null) {
            break loop;
          }
          if ((head as any)._1 === TEMPTY) {
            (head as any)._1 = step;
            status  = StateFiber.CONTINUE;
            step    = (head as any)._2;
            (head as any)._2 = TEMPTY;
          } else {
            (head as any)._2 = step;
            step    = head as InterpretTask;
            if (tail === null) {
              head  = null;
            } else {
              head  = tail._1;
              tail  = tail._2;
            }
          }
      }
    }
    this._root = step;
    for (fid = 0; fid < this._fiberId; fid++) {
      this._fibers[fid].run();
    }
  }
}

export class TaskFiber<A> implements Fiber<A> {
  _runTick: number;
  _status: StateFiber;
  _supervisor: Supervisor | undefined;
  _bhead: Fn1<any, CoreTask<any>> | null;
  _btail: InterpretTask | null;
  _step: CoreTask<A> | null | Either<Error, A> | Canceler | Computation<A>;
  _fail: Either<Error, any> | null;
  _interrupt: Either<Error, any> | null;
  _bracketCount: number;
  _joinId: number;
  _joins: IntMap<OnComplete<A>> | null;
  _rethrow: boolean;
  _attempts: InterpretTask | null;

  constructor(task: CoreTask<A>, supervisor?: Supervisor) {
    this._runTick = 0;
    this._status = StateFiber.SUSPENDED;
    this._step = task;
    this._supervisor = supervisor;
    this._fail = null;
    this._interrupt = null;
    this._bhead = null;
    this._btail = null;
    this._attempts = null;
    this._bracketCount = 0;
    this._joinId = 0;
    this._joins = null;
    this._rethrow = true;
  }

  onComplete(join: OnComplete<A>): Eff<void> {
    if (this._status === StateFiber.COMPLETED) {
      this._rethrow = this._rethrow && join.rethrow;
      runHandler(join.handler, this._step as Either<any, any>);
      return doNothing;
    }
    let jid          = this._joinId++;
    if (this._joins == null) this._joins = Object.create(null);
    (this._joins as any)[jid] = join;
    return () => {
      if (this._joins !== null)
        delete this._joins[jid];
    };
  }

  kill(e: Error, cb: NodeCallback<void>) {
    if (this._status === StateFiber.COMPLETED) {
      cb(null, void 0);
      return doNothing;
    }
    let canceler = this.onComplete({
      rethrow: false,
      handler: () => {
        cb(null, void 0);
      }
    });
    switch (this._status) {
      case StateFiber.SUSPENDED:
        this._interrupt = left(e);
        this._status = StateFiber.COMPLETED;
        this._step = this._interrupt;
        runFiber(this, this._runTick);
        break;

      case StateFiber.PENDING:
        if (this._interrupt === null) {
          this._interrupt = left(e);
        }
        if (this._bracketCount === 0) {
          let step = this._step as Canceler | Computation<any>;
          this._attempts = createInterpret(
                              'CONS', createInterpret('FINALIZER',
                                isComputation(step) ? step.cancel(e)
                                : typeof step === 'function' ? step(e) : nonCanceler(e)
                                ),
                              this._attempts as InterpretTask, this._interrupt as any
                          );
          this._status   = StateFiber.RETURN;
          this._step     = null;
          this._fail     = null;
          runFiber(this, ++this._runTick);
        }
        break;

      default:
        if (this._interrupt === null) {
          this._interrupt = left(e);
        }
        if (this._bracketCount === 0) {
          this._status   = StateFiber.RETURN;
          this._step     = null;
          this._fail     = null;
        }
    }

    return canceler;
  }

  join(cb: NodeCallback<A>) {
    let canceler = this.onComplete({
      rethrow: false,
      handler: cb
    });
    if (this._status === StateFiber.SUSPENDED) {
      runFiber(this, this._runTick);
    }
    return canceler;
  }

  run() {
    if (this._status === StateFiber.SUSPENDED) {
      if (!scheduler.isDraining()) {
        scheduler.push(scheduleRun, this, this._runTick);
      } else {
        runFiber(this, this._runTick);
      }
    }
  }

  isSuspended() {
    return this._status === StateFiber.SUSPENDED;
  }
}

function scheduleRun(this: TaskFiber<any>, localRunTick: number) {
  runFiber(this, localRunTick);
}

function runFiber(fib: TaskFiber<any>, localRunTick: number) {
  while (fib._status !== StateFiber.COMPLETED && fib._status !== StateFiber.PENDING) {
    switch (fib._status) {
      case StateFiber.CONTINUE:
        if (stepContinueLoop(fib, localRunTick)) return;
        break;
      case StateFiber.STEP_BIND: stepBindLoop(fib); break;
      case StateFiber.STEP_RESULT: stepResultLoop(fib); break;
      case StateFiber.RETURN: stepReturnLoop(fib); break;
      case StateFiber.SUSPENDED:
        fib._status = StateFiber.CONTINUE;
        break;
    }
  }
  if (fib._status === StateFiber.COMPLETED) {
    return stepCompleted(fib);
  }
}

function stepCompleted(fib: TaskFiber<any>) {
  if (fib._joins != null) {
    for (let k in fib._joins) {
      fib._rethrow = fib._rethrow && (fib._joins[k] as OnComplete<any>).rethrow;
      runHandler(fib._joins[k].handler , fib._step as Either<any, any>);
    }
  }
  fib._joins = null;
  // If we have an interrupt and a fail, then the thread threw while
  // running finalizers. This should always rethrow in a fresh stack.
  if (fib._interrupt && fib._fail) {
    thrower(fib._fail.value);
  // If we have an unhandled exception, and no other fiber has joined
  // then we need to throw the exception in a fresh stack.
  } else if (isLeft(fib._step) && fib._rethrow) {
    scheduler.enqueue(() => {
      // Guard on reathrow because a completely synchronous fiber can
      // still have an observer which was added after-the-fact.
      if (fib._rethrow) {
        throw (fib._step as Left<Error>).value;
      }
    });
  }
}

function stepBindLoop(fib: TaskFiber<any>) {
  fib._status = StateFiber.CONTINUE;
  if (fib._bhead === null) {
    throw new Error('Invalid state during execution of task');
  } else {
    fib._step = fib._bhead(fib._step);
  }
  if (fib._btail === null) {
    fib._bhead = null;
  } else {
    fib._bhead = fib._btail._1 as Fn1<any, CoreTask<any>>;
    fib._btail = (fib._btail as any)._2;
  }
}

function stepResultLoop(fib: TaskFiber<any>) {
  if (isLeft(fib._step)) {
    fib._status = StateFiber.RETURN;
    fib._fail = fib._step;
    fib._step = null;
  } else if (fib._bhead === null) {
    fib._status = StateFiber.RETURN;
  } else {
    fib._status = StateFiber.STEP_BIND;
    fib._step   = (fib._step as Right<any>).value;
  }
}

function stepContinueLoop(fib: TaskFiber<any>, localRunTick: number): boolean {
  switch  ((fib._step as CoreTask<any>).tag) {
    case 'BIND':
      stepContinueBind(fib);
      return false;
    case 'PURE':
      stepContinuePure(fib);
      return false;
    case 'THROW':
      stepContinueThrow(fib);
      return false;
    case 'EXCEPT':
      stepContinueExcept(fib);
      return false;
    case 'SYNC':
      stepContinueSync(fib);
      return false;
    case 'ASYNC':
      stepContinueAsyc(fib, localRunTick);
      return true;
    case 'BRACKET':
      stepContinueBracket(fib);
      return false;
    case 'FORK':
      stepContinueFork(fib);
      return false;
    case 'SEQUENTIAL':
      stepContinueSequential(fib);
      return false;
  }
}

function stepReturnLoop(fib: TaskFiber<any>) {
  fib._bhead = null;
  fib._btail = null;
  if (fib._attempts === null) {
    fib._status = StateFiber.COMPLETED;
    fib._step = fib._interrupt !== null ? fib._interrupt
                  : fib._fail !== null ? fib._fail
                    : fib._step;
  } else {
    let tmp: any = (fib._attempts as any)._3;
    let attempt: any  = fib._attempts._1;
    fib._attempts = (fib._attempts as any)._2;
    switch (attempt.tag) {
      case 'EXCEPT': stepReturnExcept(fib, tmp, attempt); break;
      case 'RESUME': stepReturnResume(fib, tmp, attempt); break;
      case 'BRACKET': stepReturnBracket(fib, tmp, attempt); break;
      case 'RELEASE': stepReturnRelease(fib, tmp, attempt); break;
      case 'FINALIZER': stepReturnFinalizer(fib, attempt); break;
      case 'FINALIZED': stepReturnFinalized(fib, attempt); break;
    }
  }
}

function stepContinueBind(fib: TaskFiber<any>) {
  if (fib._bhead !== null) {
    fib._btail = createInterpret('CONS', fib._bhead, fib._btail as InterpretTask, null);
  }
  fib._bhead = (fib._step as Bind<any>)._2;
  fib._status = StateFiber.CONTINUE;
  fib._step = (fib._step as Bind<any>)._1;
}

function stepContinuePure(fib: TaskFiber<any>) {
  if (fib._bhead === null) {
    fib._status = StateFiber.RETURN;
    fib._step = right((fib._step as Pure<any>)._1);
  } else {
    fib._status = StateFiber.STEP_BIND;
    fib._step = (fib._step as Pure<any>)._1;
  }
}

function stepContinueThrow(fib: TaskFiber<any>) {
  fib._status = StateFiber.RETURN;
  fib._fail   = left((fib._step as Throw)._1);
  fib._step   = null;
}

function stepContinueExcept(fib: TaskFiber<any>) {
  if (fib._bhead === null) {
    fib._attempts = createInterpret(
      'CONS', fib._step as InterpretTask, fib._attempts as InterpretTask,
      fib._interrupt as any
    );
  } else {
    fib._attempts = createInterpret(
      'CONS',
      fib._step as Bracket<any>,
      createInterpret('CONS',
        createInterpret(
          'RESUME', fib._bhead, fib._btail as InterpretTask
        ),
        fib._attempts as InterpretTask,
        fib._interrupt as any
      ),
      fib._interrupt as any
    );
  }
  fib._bhead = null;
  fib._btail = null;
  fib._status = StateFiber.CONTINUE;
  fib._step = (fib._step as Except<any>)._1;
}

function stepContinueSync(fib: TaskFiber<any>) {
  fib._status = StateFiber.STEP_RESULT;
  fib._step = runSync((fib._step as Sync<any>)._1, (fib._step as Sync<any>)._2, (fib._step as Sync<any>)._3);
}

function stepContinueAsyc(fib: TaskFiber<any>, localRunTick: number) {
  fib._status = StateFiber.PENDING;
  fib._step = runAsync((fib._step as Async<any>)._1, (er, v) => {
    if (fib._runTick !== localRunTick) {
      return;
    }
    fib._runTick++;
    fib._status = StateFiber.STEP_RESULT;
    fib._step = er != null ? left(er) : right(v);
    runFiber(fib, fib._runTick);
  });
}

function stepContinueBracket(fib: TaskFiber<any>) {
  fib._bracketCount++;
  if (fib._bhead === null) {
    fib._attempts = createInterpret(
                      'CONS', fib._step as Bracket<any>, fib._attempts as InterpretTask, fib._interrupt as any
                    );
  } else {
    fib._attempts = createInterpret(
      'CONS', fib._step as Bracket<any>,
      createInterpret('CONS', createInterpret(
        'RESUME', fib._bhead, fib._btail as InterpretTask), fib._attempts as InterpretTask, fib._interrupt as any
      ),
      fib._interrupt as any
    );
  }
  fib._bhead = null;
  fib._btail = null;
  fib._status = StateFiber.CONTINUE;
  fib._step = (fib._step as Bracket<any>)._1;
}

function stepContinueFork(fib: TaskFiber<any>) {
  fib._status = StateFiber.STEP_RESULT;
  const sup = (fib._step as Fork)._3 != null
            ? ((fib._step as Fork)._3 as Supervisor)
            : fib._supervisor;
  let tmp = new TaskFiber((fib._step as Fork)._2, sup);
  if (sup) {
    sup.register(tmp);
  }
  if ((fib._step as Fork)._1) {
    tmp.run();
  }
  fib._step = right(tmp);
}

function stepContinueSequential(fib: TaskFiber<any>) {
  fib._status = StateFiber.CONTINUE;
  fib._step   = createCoreTask('ASYNC', new ParComputation((fib._step as Sequential<any>)._1, fib._supervisor));
}

function stepReturnExcept(fib: TaskFiber<any>, err: any, attempt: any) {
  if (fib._interrupt && fib._interrupt !== err) {
    fib._status = StateFiber.RETURN;
  } else if (fib._fail) {
    fib._status = StateFiber.CONTINUE;
    fib._step = attempt._2(fib._fail.value);
    fib._fail = null;
  }
}

function stepReturnResume(fib: TaskFiber<any>, err: any, attempt: any) {
  if (fib._interrupt && fib._interrupt !== err || fib._fail) {
    fib._status = StateFiber.RETURN;
  } else {
    fib._bhead  = attempt._1;
    fib._btail  = attempt._2;
    fib._status = StateFiber.STEP_BIND;
    fib._step   = (fib._step as Right<any>).value;
  }
}

function stepReturnBracket(fib: TaskFiber<any>, err: any, attempt: any) {
  fib._bracketCount--;
  if (fib._fail === null) {
    let result   = (fib._step as Right<any>).value;
    // We need to enqueue the Release with the same interrupt
    // status as the Bracket that is initiating it.
    fib._attempts = createInterpret(
        'CONS', createInterpret('RELEASE', attempt._2, result), fib._attempts as InterpretTask, err);
    // We should only coninue as long as the interrupt status has not changed or
    // we are currently within a non-interruptable finalizer.
    if (fib._interrupt === err || fib._bracketCount > 0) {
      fib._status = StateFiber.CONTINUE;
      fib._step   = attempt._3(result);
    }
  }
}

function stepReturnRelease(fib: TaskFiber<any>, err: any, attempt: any) {
  fib._bracketCount++;
  fib._attempts = createInterpret(
    'CONS', createInterpret('FINALIZED', fib._step as InterpretTask), fib._attempts as InterpretTask, fib._interrupt as any);
  fib._status   = StateFiber.CONTINUE;
  // It has only been killed if the interrupt status has changed
  // since we enqueued the item.
  if (fib._interrupt && fib._interrupt !== err) {
    fib._step = attempt._1.killed(fib._interrupt.value, attempt._2);
  } else if (fib._fail) {
    fib._step = attempt._1.failed(fib._fail.value, attempt._2);
  } else {
    fib._step = attempt._1.completed((fib._step as Right<any>).value , attempt._2);
  }
}

function stepReturnFinalizer(fib: TaskFiber<any>, attempt: any) {
  fib._bracketCount++;
  fib._attempts = createInterpret(
    'CONS', createInterpret('FINALIZED', fib._step as InterpretTask), fib._attempts as InterpretTask, fib._interrupt as any);
  fib._status   = StateFiber.CONTINUE;
  fib._step     = attempt._1;
}

function stepReturnFinalized(fib: TaskFiber<any>, attempt: any) {
  fib._bracketCount--;
  fib._status = StateFiber.RETURN;
  fib._step   = attempt._1;
}

function isLeft<A>(b: CoreTask<A> | null | Either<Error, A> | Computation<A> | Canceler): b is Left<Error> {
  if (b == null) return false;
  if (typeof b === 'function') return false;
  if (typeof (b as any).cancel === 'function') {
    return false;
  }
  if ((b as any).tag !== EitherType.LEFT) return false;
  return true;
}

function isComputation<A>(b: any): b is Computation<A> {
  return (
    typeof b === 'object' && b != null && typeof (b as any).cancel === 'function'
      && typeof (b as any).handle === 'function'
  );
}

function runSync<A>(f: (...args: any[]) => A, args: any[], ctx: any): Either<Error, A> {
  try {
    let v = f.apply(ctx, args);
    return right(v);
  } catch (e) {
    return left(e);
  }
}

function runAsync<A>(f: Fn1<NodeCallback<A>, Canceler> | Computation<A>, k: NodeCallback<A>): Computation<A> | Canceler {
  try {
    if (isComputation(f)) {
      f.handle(k);
      return f;
    }
    return f(k);
  } catch (e) {
    k(e);
    return nonCanceler;
  }
}

function runHandler(handler: NodeCallback<any>, r: Either<Error, any>) {
  try {
    if (isLeft(r)) {
      return handler(r.value);
    } else {
      return handler(null, r.value);
    }
  } catch (e) {
    thrower(e);
  }
}

function createInterpret(tag: 'FINALIZER', _1: InterpretTask): Finalizer;
function createInterpret(tag: 'FINALIZED', _1: InterpretTask): Finalized;
function createInterpret(tag: 'RELEASE', _1: any, _2: InterpretTask): ReleaseTask;
function createInterpret(tag: 'RESUME', _1: Fn1<any, InterpretTask>, _2: InterpretTask): ResumeTask;
function createInterpret(tag: 'FORKED', _1: number, _2: InterpretTask, _3: InterpretTask): Forked;
function createInterpret(tag: 'APMAP', _1: Fn1<any, any>, _2: InterpretTask, _3: InterpretTask): ApMap;
function createInterpret(tag: 'APAPPLY', _1: InterpretTask, _2: InterpretTask, _3: InterpretTask): ApApply;
function createInterpret(tag: 'APALT', _1: InterpretTask, _2: InterpretTask, _3: InterpretTask): ApApply;
function createInterpret(tag: 'CONS', _1: Fn1<any, InterpretTask> | InterpretTask, _2: InterpretTask | null, _3: Error | null): ConsTask;
function createInterpret(tag: any, _1: any, _2?: any, _3?: any): any {
  return new Task(tag, _1, _2, _3);
}

function doNothing() {}
