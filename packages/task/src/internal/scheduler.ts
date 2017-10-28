import {
  Fiber, Eff, IntMap, NodeCallback, createCoreTask, Canceler, Supervisor
} from './types';
import { thrower } from './utils';

export class Scheduler {
  private _size: number;

  private _count: number;

  private _ix: number;

  private _draining: boolean;

  private _queue: (Eff<void> | void)[];

  constructor(private _limit: number) {
    this._size  = 0;
    this._count = 0;
    this._ix    = 0;
    this._draining = false;
    this._queue = new Array(_limit);
  }

  private _drain() {
    let thunk: Eff<any> | void;
    this._draining = true;
    while (this._size !== 0) {
      this._size--;
      thunk = this._queue[this._ix];
      this._queue[this._ix] = void 0;
      this._ix = (this._ix + 1) % this._limit;
      if (thunk != null) {
        thunk();
      }
    }
    this._draining = false;
  }

  enqueue(thunk: Eff<any>) {
    let tmp: boolean;
    if (this._size === this._limit) {
      tmp = this._draining;
      this._drain();
      this._draining = tmp;
    }

    this._queue[(this._ix + this._size) % this._limit] = thunk;
    this._size++;
    if (!this._draining) {
      this._drain();
    }
  }

  isDraining() {
    return this._draining;
  }
}

export class SimpleSupervisor implements Supervisor {
  private _fiberId: number;
  private _count: number;
  private _fibers: IntMap<Fiber<any>>;

  constructor() {
    this._fiberId = 0;
    this._count = 0;
    this._fibers = Object.create(null);
  }

  register(fiber: Fiber<any>) {
    let fiberId = this._fiberId++;
    fiber.onComplete({
      rethrow: true,
      handler: () => {
        this._count--;
        delete this._fibers[fiberId];
      }
    });
    this._fibers[fiberId] = fiber;
    this._count++;
  }

  killAll(error: Error, cb: NodeCallback<any, any>): Canceler {
    let killCount = 0;
    let kills: IntMap<Eff<void>> = Object.create(null);

    function kill(fid: string, fiber: Fiber<any>) {
      kills[fid] = fiber.kill(error, (err) => {
        delete kills[fid];
        killCount--;
        if (err) {
          thrower(err);
        }
        if (killCount === 0) {
          cb(null);
        }
      });
    }
    if (this._count === 0) {
      cb(null);
    } else {
      for (let fk in this._fibers) {
        killCount++;
        kill(fk, this._fibers[fk]);
      }
    }
    this._count = 0;
    this._fiberId = 0;
    this._fibers = Object.create(null);
    return (killErr: Error) => {
      return createCoreTask('SYNC', function () {
        for (let k in kills) {
          kills[k]();
        }
      });
    };
  }

  isEmpty() {
    return this._count === 0;
  }
}

export const scheduler = function () {
  let sc = new Scheduler(1024);
  return {
    enqueue: (th: Eff<any>) => sc.enqueue(th),
    isDraining: () => sc.isDraining()
  };
}();
