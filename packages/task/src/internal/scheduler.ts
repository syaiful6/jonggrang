import {
  Fiber, Eff, IntMap, NodeCallback, createCoreTask, Canceler, Supervisor
} from './types';
import { thrower, doNothing } from './utils';

declare var importScripts: any;

const browserWindow = (typeof window !== 'undefined') ? window : undefined;
const browserGlobal: any = browserWindow || {};
const BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
const isNode = typeof self === 'undefined' &&
  typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
const isWorker = typeof Uint8ClampedArray !== 'undefined' &&
  typeof importScripts !== 'undefined' &&
  typeof MessageChannel !== 'undefined';

export class Scheduler {
  private _size: number;

  private _ix: number;

  private _bitField: number;

  private _flusFn: Eff<void> | undefined;

  [key: string]: any;

  constructor(private _limit: number) {
    this._size  = 0;
    this._ix    = 0;
    this._bitField = 0;
    this._flusFn = void 0;
  }

  private _drain() {
    let thunk: Eff<any> | void;
    this._setIsDraining();
    while (this._size !== 0) {
      this._size--;
      thunk = this[this._ix];
      this[this._ix] = void 0;
      this._ix = (this._ix + 1) % this._limit;
      if (thunk != null) thunk();
    }
    this._bitField = 0;
  }

  enqueue(thunk: Eff<any>) {
    let tmp: number;
    if (this._size === this._limit) {
      tmp = this._bitField;
      this._drain();
      this._bitField = tmp;
    }

    this[(this._ix + this._size) % this._limit] = thunk;
    this._size++;
    if (!this._isRequestedDrain()) {
      this._requestdrain();
      this._setIsRequestedDrain();
    }
  }

  _setIsDraining() {
    this._bitField = this._bitField | 1;
  }

  _isRequestedDrain() {
    return (this._bitField & 2) !== 0;
  }

  _setIsRequestedDrain() {
    this._bitField = this._bitField | 2;
  }

  _requestdrain() {
    if (typeof this._flusFn === 'function') {
      this._flusFn();
    } else {
      let flushFn: Eff<void> = doNothing;
      if (isNode) {
        flushFn = this._useNextTick();
      } else if (BrowserMutationObserver) {
        flushFn = this._useMutationObserver();
      } else if (isWorker) {
        flushFn = this._useMessageChannel();
      } else {
        flushFn = this._useSetTimeout();
      }
      this._flusFn = flushFn;
      this._flusFn();
    }
  }

  _useNextTick() {
    let nextTick = process.nextTick;
    let version = process.versions.node.match(/^(?:(\d+)\.)?(?:(\d+)\.)?(\*|\d+)$/);
    if (Array.isArray(version) && version[1] === '0' && version[2] === '10') {
      nextTick = setImmediate;
    }
    return () => nextTick(() => this._drain());
  }

  _useMutationObserver() {
    let iterations = 0;
    let observer = new BrowserMutationObserver(() => this._drain());
    let node = document.createTextNode('');
    observer.observe(node, { characterData: true });

    return () => (node as any).data = (iterations = ++iterations % 2);
  }

  _useMessageChannel() {
    let channel = new MessageChannel();
    channel.port1.onmessage = () => this._drain();
    return () => channel.port2.postMessage(0);
  }

  _useSetTimeout() {
    return () => setTimeout(() => this._drain());
  }

  isDraining() {
    return (this._bitField & 1) !== 0;
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
      return createCoreTask('SYNC', this.killAllHelper, [kills], this);
    };
  }

  killAllHelper(kills: IntMap<Eff<void>>) {
    for (let k in kills) {
      kills[k]();
    }
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
