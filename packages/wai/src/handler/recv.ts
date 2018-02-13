import { Readable } from 'stream';
import { Buffer } from 'buffer';

import * as T from '@jonggrang/task';


export function recvStream<T extends Readable>(stream: T, size: number): T.Task<Buffer> {
  return T.makeTask(cb =>
    T.thunkCanceller(readStream(stream, size, cb))
  )
}

type Listener<A> = (a: A) => void;

interface RecvState {
  data: Buffer[];
  len: number;
  resolved: boolean;
  onReadable: Listener<void> | null;
  onError: Listener<Error> | null;
  onEnd: Listener<void> | null;
}

function readStream<T extends Readable>(stream: T, size: number, cb: T.NodeCallback<Buffer, void>): () => void {
  if ((stream as any).__ended__) {
    process.nextTick(() => {
      cb(null, Buffer.allocUnsafe(0));
    });
    return doNothing;
  }
  let state: RecvState = {
    data: [],
    len: 0,
    onReadable: null,
    onEnd: null,
    onError: null,
    resolved: false
  };
  state.onReadable = onReadable.bind(null, stream, state, size, cb);
  state.onEnd = onEnd.bind(null, stream, state, cb);
  state.onError = onError.bind(null, stream, state, cb);

  // add listener
  stream.on('readable', state.onReadable as Listener<void>);
  stream.on('error', state.onError as Listener<Error>);
  stream.on('end', state.onEnd as Listener<void>);
  return cleanUpRecv.bind(null, state, stream);
}

function onReadable<T extends Readable>(stream: T, state: RecvState, size: number, cb: T.NodeCallback<Buffer, void>) {
  let chunk: null | Buffer = null;
  while (null !== (chunk = stream.read()) && size > state.len) {
    state.data.push(chunk);
    state.len += chunk.length;
  }
  if (state.len >= size && !state.resolved) {
    resolveRecv(stream, state, cb);
  }
}

function onError<T extends Readable>(stream: T, state: RecvState, cb: T.NodeCallback<Buffer, void>, err: Error) {
  if (!state.resolved) {
    rejectRecv(stream, state, cb, err)
  }
}

function onEnd<T extends Readable>(stream: T, state: RecvState, cb: T.NodeCallback<Buffer, void>) {
  (stream as any).__ended__ = true;
  if (!state.resolved) {
    resolveRecv(stream, state, cb)
  }
}

function resolveRecv<T extends Readable>(stream: T, state: RecvState, cb: T.NodeCallback<Buffer, void>) {
  cb(null, Buffer.concat(state.data, state.len));
  cleanUpRecv(state, stream);
}

function rejectRecv<T extends Readable>(stream: T, state: RecvState, cb: T.NodeCallback<Buffer, void>, err: Error) {
  cb(err);
  cleanUpRecv(state, stream);
}

function cleanUpRecv<T extends Readable>(state: RecvState, stream: T) {
  if (state.resolved) return;
  stream.removeListener('readable', state.onReadable as any)
  stream.removeListener('error', state.onError as any)
  stream.removeListener('end', state.onEnd as any)
  state.data = []
  state.onReadable = null;
  state.onError = null;
  state.onEnd = null;
  state.len = 0;
  state.resolved = true;
}

function doNothing() {}
