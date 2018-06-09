import {
  Either, left, right, identity, isLeft, Maybe, maybe, nothing,
  just, isNothing
} from '@jonggrang/prelude';
import { Task, pure, co, delay, forkTask } from '@jonggrang/task';
import { AVar, newEmptyAVar, takeAVar, putAVar, readAVar } from '@jonggrang/avar';
import { Ref, newRef, writeRef, readRef }  from '@jonggrang/ref';


/**
 * Settings to control how values are updated. The first field specify the frequency
 * and the second field is an Aff action to be performed to get the current value.
 */
export interface UpdateSettings<A> {
  delay: number;
  task: Task<A>;
}

/**
 * Generate an action which will either read from an automatically updated value,
 * or run the update action.
 * @param settings
 */
export function mkAutoUpdate<A>(settings: UpdateSettings<A>): Task<Task<A>> {
  return mkAutoUpdateHelper(settings, nothing);
}

/**
 * Generate an action which will either read from an automatically updated value,
 * or run the update action if the first time or the provided modify action after that.
 * @param settings
 * @param action
 */
export function mkAutoUpdateWithModify<A>(
  settings: UpdateSettings<A>,
  action: (_: A) => Task<A>
): Task<Task<A>> {
  return mkAutoUpdateHelper(settings, just(action));
}

export function mkAutoUpdateHelper<A>(
  set: UpdateSettings<A>,
  modify: Maybe<(_: A) => Task<A>>
): Task<Task<A>> {
  return co(function* () {
    let needsRunning: AVar<null> = yield newEmptyAVar;
    let responseVar0: AVar<A> = yield newEmptyAVar;
    let currRef: Ref<Either<AVar<A>, A>> = yield newRef(left(responseVar0));
    function loop(responseVar: AVar<A>, ma: Maybe<A>): Task<void> {
      return co(function* () {
        yield takeAVar(needsRunning);
        const a: A = yield maybe(set.task, identity, applyMaybe(modify, ma)) as Task<A>;
        yield writeRef(currRef, right(a));
        yield putAVar(responseVar, a);
        yield delay(set.delay);
        const responseVar_: AVar<A> = yield newEmptyAVar;
        yield writeRef(currRef, left(responseVar_));
        return loop(responseVar_, just(a));
      });
    }
    yield forkTask(loop(responseVar0, nothing));

    return pure(readRef(currRef).chain(mv => {
      return isLeft(mv)  ? putAVar(needsRunning, null).chain(() => readAVar(mv.value))
        /* otherwise */  : pure(mv.value);
    }));
  });
}

function applyMaybe<A, B>(ma: Maybe<(_: A) => B>, mb: Maybe<A>): Maybe<B> {
  return isNothing(ma) ? nothing : isNothing(mb) ? nothing : just(ma.value(mb.value));
}
