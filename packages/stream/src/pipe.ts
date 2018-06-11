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
    const state: PipeState = {
      onError: null,
      onSuccess: null,
      resolved: false
    };
    state.onError = onError.bind(null, state, ws, cb);
    state.onSuccess = onSuccess.bind(null, state, ws, cb);
    ws.once('error', state.onError as any);
    ws.once('finish', state.onSuccess as any);
    return T.thunkCanceller(() => cleanUpListener(state, ws));
  });
}

function onError<W extends Writable>(s: PipeState, st: W, cb: T.NodeCallback<void>, e: Error) {
  process.nextTick(cb, e);
  if (!s.resolved) {
    cleanUpListener(s, st);
  }
}

function onSuccess<W extends Writable>(s: PipeState, st: W, cb: T.NodeCallback<void>) {
  process.nextTick(cb);
  if (!s.resolved) {
    cleanUpListener(s, st);
  }
}

function cleanUpListener<W extends Writable>(s: PipeState, st: W) {
  if (s.resolved) return;
  st.removeListener('error', s.onError as any);
  st.removeListener('finish', s.onSuccess as any);

  s.onError = null;
  s.onSuccess = null;
  s.resolved = true;
}
