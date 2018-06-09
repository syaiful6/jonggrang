import {
  Fiber, Eff, IntMap, NodeCallback, createCoreTask, Canceler, Supervisor
} from './types';
import { thrower, doNothing } from './utils';

declare var importScripts: any;

const browserWindow = (typeof window !== 'undefined') ? window : undefined;
const browserGlobal: any = browserWindow || {};
const BrowserMutationObserver: any = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
const isNode = typeof self === 'undefined' &&
  typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

// test for web worker but not in IE10
const isWorker = typeof Uint8ClampedArray !== 'undefined' &&
  typeof importScripts !== 'undefined' &&
  typeof MessageChannel !== 'undefined';

function arrayMove(src: Scheduler, srcIndex: number, dst: Scheduler, dstIndex: number, len: number) {
  for (let j = 0; j < len; ++j) {
    dst[j + dstIndex] = src[j + srcIndex];
    src[j + srcIndex] = void 0;
  }
}

export class Scheduler {
  private _length: number;

  private _front: number;

  private _bitField: number;

  private _flusFn: Eff<void> | undefined;

  [key: string]: any;

  constructor(private _capacity: number) {
    this._length = 0;
    this._front = 0;
    this._bitField = 0;
    this._flusFn = void 0;
  }

  _isOverCapacity(size: number) {
    return this._capacity < size;
  }

  _pushOne(item: any) {
    const length = this.length();
    this._checkCapacity(length + 1);
    const i = (this._front + length) & (this._capacity - 1);
    this[i] = item;
    this._length = length + 1;
  }

  length() {
    return this._length;
  }

  _checkCapacity(size: number) {
    if (this._capacity < size) {
      this._resizeTo(this._capacity << 1);
    }
  }

  _resizeTo(capacity: number) {
    let oldCapacity = this._capacity;
    this._capacity = capacity;
    let front = this._front;
    let length = this._length;
    let moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
  }

  push(fn: Function, ctx: any, arg: any) {
    const length = this.length() + 3;
    if (!this._isRequestedDrain()) {
      this._requestdrain();
      this._setIsRequestedDrain();
    }
    if (this._isOverCapacity(length)) {
      this._pushOne(fn);
      this._pushOne(ctx);
      this._pushOne(arg);
      return;
    }
    const j = this._front + length - 3;
    this._checkCapacity(length);
    const wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = ctx;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
  }

  shift() {
    let front = this._front;
    let ret = this[front];
    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
  }

  private _drain() {
    let thunk: Function, ctx: any, arg: any;
    this._setIsDraining();
    while (this._length > 0) {
      thunk = this.shift();
      if (typeof thunk !== 'function') {
        throw new Error('Invalid scheduler state');
      }
      ctx = this.shift();
      arg = this.shift();
      thunk.call(ctx, arg);
    }
    this._bitField = 0;
  }

  enqueue(thunk: Function) {
    this.push(thunk, null, void 0);
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
      } else if (BrowserMutationObserver && !(browserGlobal.navigator &&
                  (browserGlobal.navigator.standalone || browserGlobal.cordova))) {
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
    // Using 2 mutation observers to batch multiple updates into one.
    let div = document.createElement('div');
    let opts = { attributes: true };
    let toggleScheduled = false;
    let div2 = document.createElement('div');
    let o2 = new BrowserMutationObserver(() => {
      div.classList.toggle('foo');
      toggleScheduled = false;
    });
    o2.observe(div2, opts);

    function scheduleToggle() {
      if (toggleScheduled) return;
      toggleScheduled = true;
      div2.classList.toggle('foo');
    }

    return () => {
      let o = new BrowserMutationObserver(() => {
        o.disconnect();
        this._drain();
      });
      o.observe(div, opts);
      scheduleToggle();
    };
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

  killAll(error: Error, cb: NodeCallback<any>): Canceler {
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
    enqueue: (th: Function) => sc.enqueue(th),
    push: (fn: Function, ctx: any, arg: any) => sc.push(fn, ctx, arg),
    isDraining: () => sc.isDraining()
  };
}();
