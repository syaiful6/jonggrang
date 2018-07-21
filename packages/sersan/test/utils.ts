import { identity, list as L } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as RV from '@jonggrang/ref';
import * as SO from '@jonggrang/object';
import * as SS from '../src';


// A storage that explodes if it's used.  Useful for checking
// that the storage is irrelevant on a code path.
export class TNTStorage implements SS.Storage {
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

export type MockOperation
  = { tag: 'get'; id: string; }
  | { tag: 'destroy'; id: string; }
  | { tag: 'destroyAllOfAuthId'; authId: string; }
  | { tag: 'insert'; session: SS.Session; }
  | { tag: 'replace'; session: SS.Session; };

export class MockStorage implements SS.Storage {
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
      yield RV.modifyRef(self.sessions, sess => filterSM(sess, s => s.authId !== authId));
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

export const emptyMockStorage: T.Task<MockStorage> = T.co(function* () {
  const sess: RV.Ref<Record<string, SS.Session>> = yield RV.newRef({});
  const op: RV.Ref<L.List<MockOperation>> = yield RV.newRef(L.nil);

  return T.pure(new MockStorage(sess, op));
});

export function prepareMockStorage(sessions: SS.Session[]): T.Task<MockStorage> {
  return emptyMockStorage.chain(storage =>
    RV.modifyRef(storage.sessions, records => {
      const nsess = sessions.map(sess => [sess.id, sess] as [string, SS.Session]);
      return SO.union(records, SO.fromPairs(nsess));
    }).map(() => storage)
  );
}

export function getMockOperation(storage: MockStorage): Promise<L.List<MockOperation>> {
  return T.toPromise(RV.modifyRef_(storage.operations, xs => [L.nil, L.reverse(xs)]));
}
