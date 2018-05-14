import * as M from '@jonggrang/prelude';

import {
  NodeCallback, Task, makeTask, liftEff,
  bracket, generalBracket, pure, scheduler
} from '@jonggrang/task';

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
export const enum AVarAction {
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
export const enum AVarStatus {
  FULL,
  EMPTY,
  KILLED
}

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
  };
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

/**
 * Create a fresh avar.
 */
export const newEmptyAVar: Task<AVar<any>> = liftEff(null, Sentinel, createAVar);

/**
 * Creates a fresh AVar with an initial value.
 *
 * @param a The avar value
 */
export function newAVar<A>(a: A): Task<AVar<A>> {
  return liftEff(null, aVarValue(a), createAVar);
}

/**
 * Sets the value of the AVar. If the AVar is already filled, it will be
 * queued until the value is emptied. Multiple puts will resolve in order as
 * the AVar becomes available.
 *
 * @param avar AVar<A> The avar target
 * @param value value to put to the avar
 */
export function putAVar<A>(avar: AVar<A>, value: A): Task<void> {
  return makeTask(new AVarPut(avar, value));
}

/**
 * Takes the AVar value, leaving it empty. If the AVar is already empty,
 * the Task will be resolved when the AVar is filled. Multiple takes will
 * resolve in order as the AVar fills.
 *
 * @param avar AVar<A> to take the content
 */
export function takeAVar<A>(avar: AVar<A>): Task<A> {
  return makeTask(new AVarTake(avar));
}

/**
 * Reads the AVar value. Unlike `takeVar`, this will not leave the AVar empty.
 * If the AVar is empty, this will queue until it is filled. Multiple reads
 * will resolve at the same time, as soon as possible.
 *
 * @param avar AVar<A> to read the content
 */
export function readAVar<A>(avar: AVar<A>): Task<A> {
  return makeTask(new AVarRead(avar));
}

/**
 * Attempts to synchronously fill an AVar. If the AVar is already filled,
 * this will do nothing. Returns true or false depending on if it succeeded.
 *
 * @param avar AVar<A>
 * @param value A
 */
export function tryPutAVar<A>(avar: AVar<A>, value: A): Task<boolean> {
  return liftEff(null, avar, value, _tryPutAVar);
}

function _tryPutAVar<A>(avar: AVar<A>, value: A): boolean {
  if (avar.status.kind === AVarStatus.EMPTY) {
    avar.status = aVarValue(value);
    drainAVar(avar);
    return true;
  } else {
    return false;
  }
}

/**
 * `withAVar` is an exception-safe wrapper for operating on the contents of an `AVar`
 * this operation will ensure AVar content is put back even if the action fail or killed.
 * However, it is only atomic if there are no other producers for this AVar.
 * @param avar
 * @param act
 */
export function withAVar<A, B>(avar: AVar<A>, act: (_: A) => Task<B>): Task<B> {
  return bracket(takeAVar(avar), v => putAVar(avar, v), act);
}

/**
 * Take a value from an 'AVar', put a new value into the 'AVar' and
 * return the value taken. This function is atomic only if there are
 * no other producers for this 'AVar'.
 * @param avar
 * @param a
 */
export function swapAVar<A>(avar: AVar<A>, a: A): Task<A> {
  return takeAVar(avar).chain(v => putAVar(avar, a).map(_ => v));
}

/**
 * An exception-safe wrapper for modifying the contents of an 'AVar'.
 * Like 'withAVar', 'modifyAVar' will replace the original contents of
 * the 'AVar' if an exception is raised during the operation. This
 * function is only atomic if there are no other producers for this `AVar`
 *
 * @param avar
 * @param act
 */
export function modifyAVar<A>(avar: AVar<A>, act: (_: A) => Task<A>): Task<void> {
  return generalBracket(takeAVar(avar),
    { killed: (_, a) => putAVar(avar, a)
    , failed: (_, a) => putAVar(avar, a)
    , completed: () => pure(void 0)
    },
    v => act(v).chain(a => putAVar(avar, a))
  );
}

/**
 * A variation of `modifyAVar` that allow the action to choose the return value
 * of Task rather than only returning void.
 * @param avar the AVar to modify the content
 * @param act the action that modify the content of an AVar
 */
export function modifyAVar_<A, B>(avar: AVar<A>, act: (_: A) => Task<[A, B]>): Task<B> {
  return generalBracket(takeAVar(avar),
    { killed: (_, a) => putAVar(avar, a)
    , failed: (_, a) => putAVar(avar, a)
    , completed: () => pure(void 0)
    },
    v => act(v).chain(([a, b]) => putAVar(avar, a).then(pure(b)))
  );
}

/**
 * Attempts to synchronously take an AVar value, leaving it empty. If the
 * AVar is empty, this will return `Nothing`.
 * @param avar
 */
export function tryTakeAVar<A>(avar: AVar<A>): Task<M.Maybe<A>> {
  return liftEff(null, avar, _tryTakeAVar);
}

function _tryTakeAVar<A>(avar: AVar<A>): M.Maybe<A> {
  const status = avar.status;
  switch (status.kind) {
    case AVarStatus.EMPTY:
    case AVarStatus.KILLED:
      return M.nothing;
    case AVarStatus.FULL:
      avar.status = Sentinel;
      drainAVar(avar);
      return M.just(status.value);
  }
}

/**
 * Attempts to synchronously read an AVar. If the AVar is empty, this will
 * return `Nothing`
 * @param avar
 */
export function tryReadAVar<A>(avar: AVar<A>): Task<M.Maybe<A>> {
  return liftEff(null, avar, _tryReadAVar);
}

function _tryReadAVar<A>(avar: AVar<A>): M.Maybe<A> {
  const status = avar.status;
  switch (status.kind) {
    case AVarStatus.FULL:
      return M.just(status.value);
    default:
      return M.nothing;
  }
}

/**
 * Kills the AVar with an exception. All pending and future actions will
 * resolve immediately with the provided exception.
 * @param error
 * @param avar
 */
export function killAVar(error: Error, avar: AVar<any>): Task<void> {
  return liftEff(null, error, avar, _killAVar);
}

function _killAVar(error: Error, avar: AVar<any>) {
  if (avar.status.kind !== AVarStatus.KILLED) {
    avar.status = { error, kind: AVarStatus.KILLED };
    drainAVar(avar);
  }
}

/**
 * Synchronously checks whether an AVar currently is empty.
 * @param avar
 */
export function isEmptyAVar(avar: AVar<any>): Task<boolean> {
  return status(avar).map(_isEmptyStatus);
}

/**
 * Synchronously checks the status of an AVar
 * @param avar
 */
export function status<A>(avar: AVar<A>): Task<Status<A>> {
  return liftEff(null, () => avar.status);
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
      return { kind: op, value: value, cb: cb };
    default:
      throw new TypeError('Invalid argument for createAVarAction');
  }
}

function thrower(e: Error) {
  scheduler.enqueue(() => {
    throw e;
  });
}

class AVarTake<A> {
  private cell: MutableCell<TakeAVar<A>> | undefined;
  constructor(private avar: AVar<A>) {
  }

  handle(cb: NodeCallback<A, void>) {
    this.cell = putLast(this.avar.takes, createAVarAction(AVarAction.TAKE, cb));
    scheduler.push(drainAVar, null, this.avar);
  }

  _cancel() {
    const cell = this.cell;
    if (cell != null) {
      deleteCell(cell);
      this.cell = void 0;
    }
  }

  cancel() {
    return liftEff(this, this._cancel);
  }
}

class AVarRead<A> {
  private cell: MutableCell<ReadAVar<A>> | undefined;
  constructor(private avar: AVar<A>) {
  }

  handle(cb: NodeCallback<A, void>) {
    this.cell = putLast(this.avar.reads, createAVarAction(AVarAction.READ, cb));
    scheduler.push(drainAVar, null, this.avar);
  }

  _cancel() {
    const cell = this.cell;
    if (cell != null) {
      deleteCell(cell);
      this.cell = void 0;
    }
  }

  cancel() {
    return liftEff(this, this._cancel);
  }
}

class AVarPut<A> {
  private cell: MutableCell<PutAVar<A>> | undefined;
  constructor(private avar: AVar<A>, private value: A) {
  }

  handle(cb: NodeCallback<void, void>) {
    this.cell = putLast(this.avar.puts, createAVarAction(AVarAction.PUT, this.value, cb));
    scheduler.push(drainAVar, null, this.avar);
  }

  _cancel() {
    const cell = this.cell;
    if (cell != null) {
      deleteCell(cell);
      this.cell = void 0;
    }
  }

  cancel() {
    return liftEff(this, this._cancel);
  }
}
