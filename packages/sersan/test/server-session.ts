import * as assert from 'assert';
import 'mocha';

import { list as L } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as SO from '@jonggrang/object';

import * as SS from '../src';
import {
  getMockOperation, TNTStorage, emptyMockStorage, prepareMockStorage, MockStorage
} from './utils';


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
      const sessId = '123456789-123456789-123456789-12';
      const session = SS.createSession(sessId, 'auth-id', { a: 'b', c: 'd' }, now, now);
      const storage = await T.toPromise(prepareMockStorage([session]));
      const state = SS.createServerSessionState(storage);
      const [sessMap, token] = await T.toPromise(SS.loadSession(state, sessId));

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

    it('saveSession can create new session', async function () {
      const storage = await T.toPromise(emptyMockStorage);
      const state = SS.createServerSessionState(storage);

      const m1 = { a: 'b' };
      const session = await T.toPromise(SS.saveSession(state, { sess: null, now: fakenow }, m1));
      assert.ok(session != null);
      assert.equal((session as any).authId, null);
      assert.deepEqual((session as any).data, m1);

      const op = await getMockOperation(storage);
      assert.deepEqual(op, L.singleton({ session, tag: 'insert' }));
    });

    it('saveSession can updating session auth key', async function () {
      const storage = await T.toPromise(emptyMockStorage);
      const state = SS.createServerSessionState(storage);

      const m1 = { a: 'b' };
      const sess1 = await T.toPromise(SS.saveSession(state, { sess: null, now: fakenow }, m1));

      const m2 = SO.insert(state.authKey, 'John', m1);
      const sess2 = await T.toPromise(SS.saveSession(state, { sess: sess1, now: fakenow }, m2));

      assert.equal((sess2 as any).authId, 'John');
      assert.deepEqual((sess2 as any).data, m1);
      assert.equal((sess1 as any).authId === (sess2 as any).authId, false);

      const op = await getMockOperation(storage);
      assert.deepEqual(op, L.fromArray([
        { tag: 'insert', session: sess1 },
        { tag: 'destroy', id: (sess1 as SS.Session).id },
        { tag: 'insert', session: sess2 }
      ]));
    });

    it('saveSession can handle force invalidating all session of authId', async function () {
      const storage = await T.toPromise(emptyMockStorage);
      const state = SS.createServerSessionState(storage);

      const m1 = { a: 'b' };
      const sess1 = await T.toPromise(SS.saveSession(state, { sess: null, now: fakenow }, m1));

      const m2 = SO.insert(state.authKey, 'John', m1);
      const sess2 = await T.toPromise(SS.saveSession(state, { sess: sess1, now: fakenow }, m2));
      // clear all operation
      await getMockOperation(storage);

      const m3 = SO.insert(SS.forceInvalidateKey, SS.ForceInvalidate.ALL_SESSION_IDS_OF_LOGGED_USER, m2 as any);
      const sess3 = await T.toPromise(SS.saveSession(state, { sess: sess2, now: fakenow }, m3));
      assert.deepEqual(sess3, SO.assign({}, sess2, { id: (sess3 as any).id }));

      const op = await getMockOperation(storage);
      assert.deepEqual(op, L.fromArray([
        { tag: 'destroy', id: (sess2 as SS.Session).id },
        { tag: 'destroyAllOfAuthId', authId: 'John' },
        { tag: 'insert', session: sess3 }
      ]));
    });

    it('saveSession can replace old session with new one', async function () {
      const storage = await T.toPromise(emptyMockStorage);

      const state = SS.createServerSessionState(storage);

      const m1 = { a: 'b' };
      const sess1 = await T.toPromise(SS.saveSession(state, { sess: null, now: fakenow }, m1));

      const m2 = SO.insert(state.authKey, 'John', m1);
      const sess2 = await T.toPromise(SS.saveSession(state, { sess: sess1, now: fakenow }, m2));

      const m3 = SO.insert(SS.forceInvalidateKey, SS.ForceInvalidate.ALL_SESSION_IDS_OF_LOGGED_USER, m2 as any);
      const sess3 = await T.toPromise(SS.saveSession(state, { sess: sess2, now: fakenow }, m3));

      await getMockOperation(storage);

      const m4 = SO.insert('x', 'y', m2);
      const sess4 = await T.toPromise(SS.saveSession(state, { sess: sess3, now: fakenow }, m4));
      assert.deepEqual(sess4, SO.assign({}, sess3, { data: SO.remove(state.authKey, m4) }));

      const op = await getMockOperation(storage);
      assert.deepEqual(op, L.fromArray([
        { tag: 'replace', session: sess4 }
      ]));
    });
  });

  describe('All storage test', function () {
    const storage = new MockStorage({ value: {} }, { value: L.nil });
    SS.allStorageTest(storage, it);
  });
});

function checkEmpty([data, token]: [SS.SessionData, SS.SaveSessionToken]): void {
  const now = Date.now();
  assert.equal((token.now - now) < 2000, true);
  assert.equal(token.sess, null);
  assert.equal(SO.isEmpty(data), true);
}
