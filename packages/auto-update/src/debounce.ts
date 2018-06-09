import * as T from '@jonggrang/task';
import * as AV from '@jonggrang/avar';


export interface DebounceSettings {
  frequency: number; // in miliseconds
  action: T.Task<void>;
}

/**
 * Debounce an action, ensuring it doesn't occur more than once for a given
 * period of time.
 *
 * This is useful as an optimization, for example to ensure that logs are only
 * flushed to disk at most once per second.
 * @param settings
 */
export function debounceTask(settings: DebounceSettings): T.Task<T.Task<void>> {
  return T.co(function* () {
    const baton: AV.AVar<null> = yield AV.newEmptyAVar;
    yield T.forkTask(T.forever(T.co(function* () {
      yield AV.takeAVar(baton);
      yield T.apathize(settings.action);
      return T.delay(settings.frequency);
    })));
    return T.pure(AV.putAVar(baton, null));
  });
}
