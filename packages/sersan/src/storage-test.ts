import * as assert from 'assert';

import { nothing, just, Maybe, Either, isLeft } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import { randomString } from '@jonggrang/cryptic';
import { fromPairs } from '@jonggrang/object';

import {
  Session, Storage, generateSessionId, createSession, SessionAlreadyExists, SessionDoesNotExist
} from './session';


export const enum HasAuthId {
  HAS_AUTH_ID,
  NO_AUTH_ID
}

export interface ItFn {
  (desc: string, fn: () => Promise<any>): void;
}

/**
 * Generate random auth for our test
 */
const generateAuthId = randomString(16);

export function allStorageTest(storage: Storage, _it: ItFn) {
  const run = storage.runTransaction;

  function it(des: string, fn: () => Iterator<T.Task<any>>): void {
    _it(des, () => T.toPromise(T.co(fn)));
  }

  it('runTransaction should be sane', function* () {
    const ret: number = yield run(T.pure(42));
    assert.equal(ret, 42);
    return T.pure(true);
  });

  it('storage.get should return null for inexisten key', function* () {
    return replicateA_(100, generateSessionId.chain(id => run(storage.get(id))));
  });

  it('storage.destroy should not fail for inexistent sessions', function* () {
    return replicateA_(100, generateSessionId.chain(x => run(storage.destroy(x))));
  });

  it('storage.destroy session should destroy sessions', function* () {
    return replicateA_(20, T.co(function* () {
      const s: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);

      const s1: Session | null = yield run(storage.get(s.id));
      assert.ok(!s1);

      yield run(storage.insert(s));
      const s2: Session | null = yield run(storage.get(s.id));
      assert.deepEqual(s2, s);

      yield run(storage.destroy(s.id));
      const s3: Session | null = yield run(storage.get(s.id));
      assert.ok(!s3);

      return T.pure(true);
    }));
  });

  it('storage.destroyAllOfAuthId should not fail for inexisten Auth ID', function* () {
    return replicateA_(100, generateAuthId.chain(id => run(storage.destroyAllOfAuthId(id))));
  });

  it('storage.destroyAllOfAuthId should only delete relevant Auth Id', function* () {
    const master: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);
    const authId = master.authId as string;

    const preslaves: Session[] = yield (replicateA(20, generateSession(HasAuthId.HAS_AUTH_ID))
      .concat(replicateA(20, generateSession(HasAuthId.NO_AUTH_ID)))
    );
    const slaves = preslaves.map(x => createSession(x.id, authId, x.data, x.createdAt, x.accessedAt));

    const others: Session[] = yield (replicateA(20, generateSession(HasAuthId.HAS_AUTH_ID))
      .concat(replicateA(20, generateSession(HasAuthId.NO_AUTH_ID)))
    );
    const allS = [master].concat(slaves, others);

    // insert session
    yield T.forInPar_([master].concat(preslaves, others), x => run(storage.insert(x)));
    yield T.forInPar_(slaves, x => run(storage.replace(x)));

    const xs: (Session | null)[] = yield T.forInPar(allS, x => run(storage.get(x.id)));
    assert.deepEqual(xs, allS);
    yield run(storage.destroyAllOfAuthId(authId));
    const ys: (Session | null)[] = yield T.forInPar(allS, x => run(storage.get(x.id)));
    const xxs = new Array(slaves.length + 1).fill(null);
    assert.deepEqual(ys, xxs.concat(others as any));
    return T.pure(true);
  });

  it('storage.get should return the contents of insertSession', function* () {
    return replicateA_(5, T.co(function* () {
      const s: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);
      const exist: Session | null = yield run(storage.get(s.id));
      assert.ok(!exist);
      yield run(storage.insert(s));
      const s2 = yield run(storage.get(s.id));
      assert.deepEqual(s2, s);
      return T.pure(true);
    }));
  });

  it('storage.insert throws an exception if a session already exists', function* () {
    return replicateA_(5, T.co(function* () {
      const s1: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);
      const s2: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);
      const s3 = createSession(s1.id, s2.authId, s2.data, s2.createdAt, s2.accessedAt);

      const exi: Session | null = yield run(storage.get(s1.id));
      assert.ok(!exi);
      // insert s1
      yield run(storage.insert(s1));
      const there: Session | null = yield run(storage.get(s1.id));
      assert.deepEqual(there, s1);

      const ret: Either<SessionAlreadyExists, void> = yield T.attemptJust(
        run(storage.insert(s3)), selectSessionExist);
      assert.ok(isLeft(ret));
      const error = (ret as any).value as SessionAlreadyExists;
      assert.deepEqual(error.oldSession, s1);
      assert.deepEqual(error.newSession, s3);
      return T.pure(true);
    }));
  });

  it('storage.get should return the contens of storage.replace', function* () {
    return replicateA_(10, T.co(function* () {
      const s1: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);
      const sxs: Session[] = yield replicateA(10, generateSession(HasAuthId.HAS_AUTH_ID));
      const sid = s1.id;
      const sys: Session[] = sxs.map(x => createSession(sid, x.authId, x.data, x.createdAt, x.accessedAt));

      const exi: Session | null = yield run(storage.get(sid));
      assert.ok(!exi);
      yield run(storage.insert(s1));
      return T.forIn(zip([s1].concat(sys), sys), ([before, after]) => T.co(function* () {
        const ex = yield run(storage.get(sid));
        assert.deepEqual(ex, before);
        yield run(storage.replace(after));
        const ex2 = yield run(storage.get(sid));
        assert.deepEqual(ex2, after);
        return T.pure(void 0);
      }));
    }));
  });

  it('storage.replace should throws an exception if a session doesnt exist', function* () {
    return replicateA_(10, T.co(function* () {
      const s: Session = yield generateSession(HasAuthId.HAS_AUTH_ID);
      const sid = s.id;
      const exi: Session | null = yield run(storage.get(sid));
      assert.ok(!exi);
      const ret: Either<SessionDoesNotExist, void> = yield T.attemptJust(
        run(storage.replace(s)), selectSessionNotExis);
      assert.ok(isLeft(ret));
      assert.deepEqual((ret.value as SessionDoesNotExist).newSession, s);
      // test that session not saved
      const exi2: Session | null = yield run(storage.get(sid));
      assert.ok(!exi2);

      yield run(storage.insert(s));
      const s2: Session | null = yield run(storage.get(sid));
      assert.deepEqual(s2, s);

      const s3 = createSession(sid, null, s.data, s.createdAt, s.accessedAt);
      yield run(storage.replace(s3));
      const s4: Session | null = yield run(storage.get(sid));
      assert.deepEqual(s4, s3);
      return T.pure(true);
    }));
  });
}

function selectSessionExist(err: Error): Maybe<SessionAlreadyExists> {
  return (err as any).code === 'ESESSIONEXISTS' ? just(err as any) : nothing;
}

function selectSessionNotExis(err: any): Maybe<SessionDoesNotExist> {
  return err.code == 'ESESSIONNOTEXISTS' ? just(err) : nothing;
}

function replicateA<A>(n: number, t: T.Task<A>): T.Task<A[]> {
  return T.sequencePar(replicateArr(n, t));
}

function replicateA_<A>(n: number, t: T.Task<A>): T.Task<void> {
  return T.sequencePar_(replicateArr(n, t));
}

/**
 * Generate random session
 */
function generateSession(auth: HasAuthId): T.Task<Session> {
  return T.co(function* () {
    const id: string = yield generateSessionId;

    const authId: null | string = yield (
      auth === HasAuthId.HAS_AUTH_ID ? generateSessionId
        : T.pure(null));

    const keys: string[] = yield T.sequencePar(replicateArr(20, randomString(8)));
    const values: string[] = yield T.sequencePar(replicateArr(20, randomString(16)));
    const data = fromPairs(zip(keys, values));

    const now = Date.now();

    return T.pure(createSession(id, authId, data, now - 1000, now));
  });
}

function zip<A, B>(xs: A[], ys: B[]): [A, B][] {
  let len = Math.min(xs.length, ys.length);
  let result: [A, B][] = new Array(len);
  for (let i = 0; i < len; i++) {
    result[i] = [xs[i], ys[i]];
  }
  return result;
}

function replicateArr<A>(n: number, x: A): A[] {
  let result: A[] = new Array(n);
  for (let i = 0; i < n; i++) {
    result[i] = x;
  }
  return result;
}
