import { Writable, Readable } from 'readable-stream';
import * as T from '@jonggrang/task';


type PipeState = {
  onError: ((e: Error) => void) | null;
  onSuccess: (() => void) | null;
  resolved: boolean;
};

export function pipeStream<W extends Writable, R extends Readable>(ws: W, rs: R, opts?: { end?: boolean }): T.Task<void> {
  return T.makeTask(cb => {
    rs.pipe(ws, opts);
    const doEnd = (!opts || opts.end !== false) && (ws as any) !== process.stdout && (ws as any) !== process.stderr;
    const state: PipeState = {
      onError: null,
      onSuccess: null,
      resolved: false
    };
    if (doEnd) {
      state.onError = onErrorWS.bind(null, state, ws, cb);
      state.onSuccess = onSuccessWS.bind(null, state, ws, cb);
      ws.once('error', state.onError as any);
      ws.once('finish', state.onSuccess as any);
      return T.thunkCanceller(() => cleanUpListenerWS(state, ws));
    }
    // we not use automatic finish, so attach to readable
    state.onError = onErrorRS.bind(null, state, rs, cb);
    state.onSuccess = onSuccessRS.bind(null, state, rs, cb);
    rs.once('error', state.onError as any);
    rs.once('end', state.onSuccess as any);
    return T.thunkCanceller(() => cleanUpListenerRS(state, rs));
  });
}

function onErrorWS<W extends Writable>(s: PipeState, st: W, cb: T.NodeCallback<void>, e: Error) {
  process.nextTick(cb, e);
  if (!s.resolved) {
    cleanUpListenerWS(s, st);
  }
}

function onErrorRS<T extends Readable>(s: PipeState, st: T, cb: T.NodeCallback<void>, e: Error) {
  process.nextTick(cb, e);
  if (!s.resolved) {
    cleanUpListenerRS(s, st);
  }
}

function onSuccessWS<W extends Writable>(s: PipeState, st: W, cb: T.NodeCallback<void>) {
  process.nextTick(cb);
  if (!s.resolved) {
    cleanUpListenerWS(s, st);
  }
}

function onSuccessRS<R extends Readable>(s: PipeState, st: R, cb: T.NodeCallback<void>) {
  process.nextTick(cb);
  if (!s.resolved) {
    cleanUpListenerRS(s, st);
  }
}

function cleanUpListenerWS<W extends Writable>(s: PipeState, st: W) {
  if (s.resolved) return;
  st.removeListener('error', s.onError as any);
  st.removeListener('finish', s.onSuccess as any);

  s.onError = null;
  s.onSuccess = null;
  s.resolved = true;
}

function cleanUpListenerRS<R extends Readable>(s: PipeState, st: R) {
  if (s.resolved) return;
  st.removeListener('error', s.onError as any);
  st.removeListener('end', s.onSuccess as any);

  s.onError = null;
  s.onSuccess = null;
  s.resolved = true;
}
