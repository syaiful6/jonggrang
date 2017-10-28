import { NodeCallback } from './internal/types';
import { thrower } from './internal/utils';
import * as T from './index';

export interface MutableQueue<A> {
  head: MutableCell<A> | null;
  last: MutableCell<A> | null;
  size: number;
}

export interface MutableCell<A> {
  queue: MutableQueue<A> | null;
  value: A | null;
  next: MutableCell<A> | null;
  prev: MutableCell<A> | null;
}

/**
 * AVar actions.
 */
export enum AVarAction {
  TAKE,
  PUT,
  READ
}

export interface TakeAVar<A> {
  kind: AVarAction.TAKE;
  cb: NodeCallback<A, void>;
}

export interface PutAVar<A> {
  kind: AVarAction.PUT;
  value: A;
  cb: NodeCallback<void, void>;
}

export interface ReadAVar<A> {
  kind: AVarAction.READ;
  cb: NodeCallback<A, void>;
}

/**
 * AVar status, an AVar can be Empty, Full and Killed.
 */
export enum AVarStatus {
  FULL,
  EMPTY,
  KILLED
};

export interface Full<A> {
  kind: AVarStatus.FULL;
  value: A;
}

export interface Empty {
  kind: AVarStatus.EMPTY;
}

export interface Killed {
  kind: AVarStatus.KILLED;
  error: Error;
}

export type Status<A> = Full<A> | Empty | Killed;

const Sentinel: Empty = {
  kind: AVarStatus.EMPTY
};

/**
 * AVar, asynchronous variable.
 */
export interface AVar<A> {
  draining: boolean;
  status: Status<A>;
  takes: MutableQueue<TakeAVar<A>>;
  reads: MutableQueue<ReadAVar<A>>;
  puts: MutableQueue<PutAVar<A>>;
}

function aVarValue<A>(a: A): Full<A> {
  return {
    kind: AVarStatus.FULL,
    value: a
  };
}

function createAVar<A>(status: Status<A>): AVar<A> {
  return {
    draining: false,
    status,
    takes: mutQueue(),
    reads: mutQueue(),
    puts: mutQueue()
  }
}

function mutQueue<A>(): MutableQueue<A> {
  return {
    head: null,
    last: null,
    size: 0
  };
}

function mutCell<A>(queue: MutableQueue<A>, value: A): MutableCell<A> {
  return {
    queue,
    value,
    next: null,
    prev: null
  };
}

function putLast<A>(queue: MutableQueue<A>, value: A) {
  const cell = mutCell(queue, value);
  switch (queue.size) {
    case 0:
      queue.head = cell;
      break;
    case 1:
      cell.prev = queue.head;
      (queue.head as MutableCell<A>).next = cell;
      queue.last = cell;
      break;
    default:
      cell.prev = queue.last;
      (queue.last as MutableCell<A>).next = cell;
      queue.last = cell;
  }
  queue.size++;
  return cell;
}

function takeLast<A>(queue: MutableQueue<A>): A | null {
  let cell: MutableCell<A> | null;
  switch (queue.size) {
    case 0:
      return null;
    case 1:
      cell = queue.head;
      queue.head = null;
      break;
    case 2:
      cell = queue.last;
      (queue.head as MutableCell<A>).next = null;
      queue.last = null;
      break;
    default:
      cell = queue.last;
      queue.last = (cell as MutableCell<A>).prev;
      (queue.last as MutableCell<A>).next = null;
  }
  if (cell) {
    cell.prev = null;
    cell.queue = null;
  }
  queue.size--;
  return cell != null ? cell.value : null;
}

function takeHead<A>(queue: MutableQueue<A>): A | null {
  let cell: MutableCell<A> | null;
  switch (queue.size) {
    case 0:
      return null;
    case 1:
      cell = queue.head;
      queue.head = null;
      break;
    case 2:
      cell = queue.head;
      (queue.last as MutableCell<A>).prev = null;
      queue.head = queue.last;
      queue.last = null;
      break;
    default:
      cell = queue.head;
      queue.head = (cell as MutableCell<A>).next;
      (queue.head as MutableCell<A>).prev = null;
  }
  if (cell) {
    cell.next = null;
    cell.queue = null;
  }
  queue.size--;
  return cell != null ? cell.value : null;
}

function deleteCell<A>(cell: MutableCell<A>) {
  if (cell.queue === null) {
    return;
  }
  if (cell.queue.last === cell) {
    takeLast(cell.queue);
    return;
  }
  if (cell.queue.head === cell) {
    takeHead(cell.queue);
    return;
  }
  if (cell.prev) {
    cell.prev.next = cell.next;
  }
  if (cell.next) {
    cell.next.prev = cell.prev;
  }
  cell.queue.size--;
  cell.queue = null;
  cell.value = null;
  cell.next  = null;
  cell.prev  = null;
}

function drainAVar<A>(avar: AVar<A>) {
  if (avar.draining) {
    return;
  }
  let ps = avar.puts;
  let ts = avar.takes;
  let rs = avar.reads;
  let p: PutAVar<A> | null;
  let r: ReadAVar<A> | null;
  let t: TakeAVar<A> | null;
  let value: Status<A>;
  let rsize: number;

  avar.draining = true;
  while (true) {
    p = null;
    r = null;
    t = null;
    value = avar.status;
    rsize = rs.size;
    if (value.kind === AVarStatus.KILLED) {
      while (p = takeHead(ps)) {
        runHandler(p.cb, value.error);
      }
      while (r = takeHead(rs)) {
        runHandler(r.cb, value.error);
      }
      while (t = takeHead(ts)) {
        runHandler(t.cb, value.error);
      }
      break;
    }

    if (value.kind === AVarStatus.EMPTY && (p = takeHead(ps))) {
      avar.status = value = aVarValue(p.value);
    }

    if (value.kind !== AVarStatus.EMPTY) {
      // We go ahead and queue up the next take for the same reasons as
      // above. Invoking the read callbacks can affect the mutable queue.
      t = takeHead(ts);
      // We only want to process the reads queued up before running these
      // callbacks so we guard on rsize.
      while (rsize-- && (r = takeHead(rs))) {
        runHandler(r.cb, null, value.value);
      }
      if (t !== null) {
        avar.status = Sentinel;
        runHandler(t.cb, null, value.value);
      }
    }

    if (p !== null) {
      runHandler(p.cb, null, void 0);
    }

    // Callbacks could have queued up more items so we need to guard on the
    // actual mutable properties.
    if (avar.status.kind === AVarStatus.EMPTY && ps.size === 0
        || avar.status.kind !== AVarStatus.EMPTY && ts.size === 0) {
      break;
    }
  }
  avar.draining = false;
}

function runHandler<A, B>(cb: NodeCallback<A, B>, error: null | Error, v?: A) {
  try {
    if (error != null) {
      return cb(error);
    }
    return cb(null, v);
  } catch (e) {
    thrower(e);
  }
}

export const newEmptyAVar: T.Task<AVar<any>> = T.liftEff(() => {
  return createAVar(Sentinel);
});

export function newAVar<A>(a: A): T.Task<AVar<A>> {
  return T.liftEff(() => createAVar(aVarValue(a)));
}

export function putAVar<A>(avar: AVar<A>, value: A): T.Task<void> {
  return T.makeTask(cb => {
    const cell = putLast(avar.puts, createAVarAction(AVarAction.PUT, value, cb));
    drainAVar(avar);
    return T.thunkCanceller(() => deleteCell(cell));
  });
}

export function takeAVar<A>(avar: AVar<A>): T.Task<A> {
  return T.makeTask(cb => {
    const cell = putLast(avar.takes, createAVarAction(AVarAction.TAKE, cb));
    drainAVar(avar);
    return T.thunkCanceller(() => deleteCell(cell));
  });
}

export function readAVar<A>(avar: AVar<A>): T.Task<A> {
  return T.makeTask(cb => {
    const cell = putLast(avar.reads, createAVarAction(AVarAction.READ, cb));
    drainAVar(avar);
    return T.thunkCanceller(() => deleteCell(cell));
  });
}

export function tryPutAVar<A>(avar: AVar<A>, value: A): T.Task<boolean> {
  return T.liftEff(() => {
    if (avar.status.kind === AVarStatus.EMPTY) {
      avar.status = aVarValue(value);
      drainAVar(avar);
      return true;
    } else {
      return false;
    }
  })
}

export function withAVar<A, B>(avar: AVar<A>, act: (_: A) => T.Task<B>): T.Task<B> {
  return T.bracket(takeAVar(avar), v => putAVar(avar, v), act);
}

export function swapAVar<A>(avar: AVar<A>, a: A): T.Task<A> {
  return takeAVar(avar).chain(v => putAVar(avar, a).map(_ => v));
}

export enum OptionType {
  SOME = 'SOME',
  NONE = 'NONE'
};

export interface Some<A> {
  kind: OptionType.SOME;
  value: A;
}

export interface None {
  kind: OptionType.NONE;
}

export type Option<A> = Some<A> | None;

export function tryTakeAVar<A>(avar: AVar<A>): T.Task<Option<A>> {
  return T.liftEff(() => {
    const status = avar.status;
    switch (status.kind) {
      case AVarStatus.EMPTY:
      case AVarStatus.KILLED:
        return { kind: OptionType.NONE } as None;
      case AVarStatus.FULL:
        avar.status = Sentinel;
        drainAVar(avar);
        return { kind: OptionType.SOME, value: status.value } as Some<A>;
    }
  });
}

export function tryReadAVar<A>(avar: AVar<A>): T.Task<Option<A>> {
  return T.liftEff(() => {
    const status = avar.status;
    switch (status.kind) {
      case AVarStatus.FULL:
        return { kind: OptionType.SOME, value: status.value } as Some<A>;
      default:
        return { kind: OptionType.NONE } as None;
    }
  });
}

export function killAVar(error: Error, avar: AVar<any>): T.Task<void> {
  return T.liftEff(() => {
    if (avar.status.kind !== AVarStatus.KILLED) {
      avar.status = { kind: AVarStatus.KILLED, error: error };
      drainAVar(avar);
    }
  })
}

export function isEmptyAVar(avar: AVar<any>): T.Task<boolean> {
  return status(avar).map(_isEmptyStatus);
}

export function status<A>(avar: AVar<A>): T.Task<Status<A>> {
  return T.liftEff(() => avar.status);
}

function _isEmptyStatus(st: Status<any>): st is Empty {
  return st.kind === AVarStatus.EMPTY;
}

function createAVarAction<A>(op: AVarAction.TAKE, cb: NodeCallback<A, void>): TakeAVar<A>;
function createAVarAction<A>(op: AVarAction.READ, cb: NodeCallback<A, void>): ReadAVar<A>;
function createAVarAction<A>(op: AVarAction.PUT, value: A, cb: NodeCallback<void, void>): PutAVar<A>;
function createAVarAction(op: any, value: any, cb?: any): any {
  switch (op) {
    case AVarAction.TAKE:
      return { kind: op, cb: value };
    case AVarAction.READ:
      return { kind: op, cb: value };
    case AVarAction.PUT:
      return { kind: op, value: value, cb: cb }
    default:
      throw new TypeError('Invalid argument for createAVarAction')
  }
}
