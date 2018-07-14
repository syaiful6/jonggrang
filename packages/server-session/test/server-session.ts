import * as assert from 'assert';
import 'mocha';

import { list as L, identity } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as RV from '@jonggrang/ref';
import * as SO from '@jonggrang/object';

import * as SS from '../src';


describe('Server session', function () {
  const fakenow = Date.parse('2015-05-27 17:55:41 UTC');

  describe('loadSession', function () {
    it('return empty session & token when the session ID cookie is not present', async function () {
      const sttnt = SS.createServerSessionState(new TNTStorage());
      const ret = await T.toPromise(SS.loadSession(sttnt, null));
      checkEmpty(ret);
    });

    it('doest not need the storage if session session ID cookie invalid', async function () {
      const sttnt = SS.createServerSessionState(new TNTStorage());
      const ret = await T.toPromise(SS.loadSession(sttnt, '123456789-123456789-123'));
      checkEmpty(ret);
    });

    it('return empty session and token when the session ID nonexists', async function () {
      const storage = await T.toPromise(emptyMockStorage);
      const state = SS.createServerSessionState(storage);
      const ret = await T.toPromise(SS.loadSession(state, '123456789-123456789-123456789-12'));
      checkEmpty(ret);
    });

    it('return the session from storage when the session ID exists', async function () {
      const now = Date.now();
      const session: SS.Session = {
        id: '123456789-123456789-123456789-12',
        authId: 'auth-id',
        data: { a: 'b', c: 'd' },
        createdAt: now,
        accessedAt: now
      };
      const storage = await T.toPromise(prepareMockStorage([session]));
      const state = SS.createServerSessionState(storage);
      const [sessMap, token] = await T.toPromise(SS.loadSession(state, '123456789-123456789-123456789-12'));

      assert.deepEqual(sessMap, SO.insert(state.authKey, session.authId, session.data));
      assert.deepEqual(token.sess, session);
    });
  });

  describe('nextExpires', function () {
    it('look sane', function () {
      const sttnt = SS.createServerSessionState(new TNTStorage());
      function st(i: number | null, a: number | null): SS.ServerSessionState {
        return SO.assign({}, sttnt, {
          idleTimeout: i == null ? i : i * 60,
          absoluteTimeout: a == null ? a : a * 60
        });
      }
      function add(x: number) {
        return (x * 60000) + fakenow;
      }
      function session(a: number, c: number): SS.Session {
        let sess: any = {};
        sess.createdAt = c;
        sess.accessedAt = a;
        function throwIfAccessed() {
          throw new Error('this property is irrelevant');
        }
        Object.defineProperties(sess, {
          id: {
            get: throwIfAccessed
          },
          authId: {
            get: throwIfAccessed
          },
          data: {
            get: throwIfAccessed
          }
        });

        return sess;
      }

      assert.equal(SS.nextExpires(st(null, null), session(0, 0)), null);
      assert.equal(SS.nextExpires(st(1, null), session(fakenow, 0)), add(1));
      assert.equal(SS.nextExpires(st(null, 1), session(0, fakenow)), add(1));
      assert.equal(SS.nextExpires(st(3, 7), session(fakenow, fakenow)), add(3));
      assert.equal(SS.nextExpires(st(3, 7), session(add(4), fakenow)), add(7));
      assert.equal(SS.nextExpires(st(3, 7), session(add(5), fakenow)), add(7));
    });
  });

  describe('saveSession', function () {
    it('saveSession return null if nothing to save', async function () {
      const storage = await T.toPromise(emptyMockStorage);
      const state = SS.createServerSessionState(storage);
      await T.toPromise(SS.saveSession(state, { sess: null, now: fakenow }, {}));
      const op = await getMockOperation(storage);
      assert.deepEqual(op, L.nil);
    });
  });
});

function checkEmpty([data, token]: [SS.SessionData, SS.SaveSessionToken]): void {
  const now = Date.now();
  assert.equal((token.now - now) < 2000, true);
  assert.equal(token.sess, null);
  assert.equal(SO.isEmpty(data), true);
}

// A storage that explodes if it's used.  Useful for checking
// that the storage is irrelevant on a code path.
class TNTStorage implements SS.Storage {
  readonly tx: SS.StorageTxConstructor;
  constructor() {
    this.tx = {
      of: T.pure,
      liftTask: x => x
    };
  }

  runTransaction<A>(s: T.Task<A>): T.Task<A> {
    return s;
  }

  get(sessId: string) {
    return T.raise(new TNTExplosion('get', { sessId }));
  }

  destroy(sessId: string) {
    return T.raise(new TNTExplosion('destroy', { sessId }));
  }

  destroyAllOfAuthId(authId: SS.AuthId) {
    return T.raise(new TNTExplosion('destroyAllOfAuthId', { authId }));
  }

  insert(session: SS.Session) {
    return T.raise(new TNTExplosion('insert', session));
  }

  replace(session: SS.Session) {
    return T.raise(new TNTExplosion('replace', session));
  }
}

class TNTExplosion extends Error {
  readonly extra: any;
  constructor(msg: string, fun: any) {
    super(msg);
    this.extra = JSON.stringify(fun);
  }
}

type MockOperation
  = { tag: 'get'; id: string; }
  | { tag: 'destroy'; id: string; }
  | { tag: 'destroyAllOfAuthId'; authId: string; }
  | { tag: 'insert'; session: SS.Session; }
  | { tag: 'replace'; session: SS.Session; };

class MockStorage implements SS.Storage {
  readonly tx: SS.StorageTxConstructor;
  constructor(
    readonly sessions: RV.Ref<Record<string, SS.Session>>,
    readonly operations: RV.Ref<L.List<MockOperation>>
  ) {
    this.tx = {
      of: T.pure,
      liftTask: x => x
    };
  }

  runTransaction<A>(s: T.Task<A>): T.Task<A> {
    return s;
  }

  get(sessId: string) {
    const self = this;
    return T.co(function* () {
      yield self.addMockOperation({ tag: 'get', id: sessId });
      return RV.readRef(self.sessions).map(sessions => sessId in sessions ? sessions[sessId] : null);
    });
  }

  destroy(sessId: string) {
    const self = this;
    return T.co(function* () {
      yield RV.modifyRef(self.sessions, sess => SO.remove(sessId, sess) as any);
      return self.addMockOperation({ tag: 'destroy', id: sessId });
    });
  }

  destroyAllOfAuthId(authId: string) {
    const self = this;
    return T.co(function* () {
      yield RV.modifyRef(self.sessions, sess => filterSM(sess, s => s.id !== authId));
      return self.addMockOperation({ authId, tag: 'destroyAllOfAuthId' });
    });
  }

  insert(sess: SS.Session) {
    return RV.modifyRef_(this.sessions, oldMap => {
      if (sess.id in oldMap) return [oldMap, T.raise(new SS.SessionAlreadyExists(oldMap[sess.id], sess))];

      return [SO.insert(sess.id, sess, oldMap), T.pure(void 0)];
    })
      .chain(identity)
      .chain(() => this.addMockOperation({ tag: 'insert', session: sess }));
  }

  replace(sess: SS.Session) {
    return RV.modifyRef_(this.sessions, oldMap => {
      if (sess.id in oldMap) return [SO.insert(sess.id, sess, oldMap), T.pure(void 0)];

      return [oldMap, T.raise(new SS.SessionDoesNotExist(sess))];
    })
      .chain(identity)
      .chain(() => this.addMockOperation({ tag: 'replace', session: sess }));
  }

  private addMockOperation(op: MockOperation) {
    return RV.modifyRef(this.operations, xs => L.cons(op, xs));
  }
}

function filterSM<A>(sm: Record<string, A>, f: (_: A) => boolean): Record<string, A> {
  let result = Object.create(null);
  Object.keys(sm).forEach(k => {
    if (f(sm[k])) result[k] = sm[k];
  });
  return result;
}

const emptyMockStorage: T.Task<MockStorage> = T.co(function* () {
  const sess: RV.Ref<Record<string, SS.Session>> = yield RV.newRef({});
  const op: RV.Ref<L.List<MockOperation>> = yield RV.newRef(L.nil);

  return T.pure(new MockStorage(sess, op));
});

function prepareMockStorage(sessions: SS.Session[]): T.Task<MockStorage> {
  return emptyMockStorage.chain(storage =>
    RV.modifyRef(storage.sessions, records => {
      const nsess = sessions.map(sess => [sess.id, sess] as [string, SS.Session]);
      return SO.union(records, SO.fromPairs(nsess));
    }).map(() => storage)
  );
}

function getMockOperation(storage: MockStorage): Promise<L.List<MockOperation>> {
  return T.toPromise(RV.modifyRef_(storage.operations, xs => [L.nil, L.reverse(xs)]));
}
