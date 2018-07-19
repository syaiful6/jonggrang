import * as assert from 'assert';

import Redis from 'ioredis';
import { isRight } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import { generateSessionId, createSession, Session } from '@jonggrang/sersan';
import * as RS from '../src';


function connect(uri: string): T.Task<Redis.Redis> {
  return T.makeTask_(cb => {
    const redis = new Redis(uri);
    redis.on('ready', () => {
      cb(null, redis);
    });
  });
}

function quit(redis: Redis.Redis): T.Task<void> {
  return T.makeTask_(cb => {
    redis.quit(function (err, ok) {
      if (err) return cb(err);
      if (ok === 'OK') cb(null);
      cb(new Error('quit return ' + ok));
    });
  });
}

function withConn<A>(uri: string, t: (r: Redis.Redis) => T.Task<A>): T.Task<A> {
  return T.bracket(connect(uri), quit, t);
}

describe('Redis storage', function () {
  it('getSession should return null for inexistent sessions', async function () {
    const result = await T.toPromise(withConn('//localhost:6379', redis => {
      const storage = new RS.RedisStorage(redis, 600, 36000);
      return generateSessionId.chain(x =>
        storage.runTransaction(storage.get(x)));
    }));

    assert.ok(result == null);
  });

  it('destroy should not fail for inexistent sessions', async function () {
    const ret = await T.toPromise(withConn('//localhost:6379', redis => {
      const storage = new RS.RedisStorage(redis, 600, 36000);
      return T.attempt(generateSessionId.chain(x =>
        storage.runTransaction(storage.destroy(x))));
    }));

    assert.ok(isRight(ret));
  });

  it('destroy should delete the session', async function () {
    const key = await T.toPromise(generateSessionId);
    await T.toPromise(withConn('//localhost:6379', redis => {
      const storage = new RS.RedisStorage(redis, 60, 360000);
      return T.co(function* () {
        const old: Session | null = yield storage.get(key);
        assert.ok(old == null);

        const now = Date.now();
        const sess = createSession(key, 'john', { a: 'b' }, now, now);
        yield storage.insert(sess);
        const sess2: Session | null = yield storage.get(key);
        assert.deepEqual(sess, sess2);
        yield storage.destroy(key);
        const sess3: Session | null = yield storage.get(key);
        assert.ok(sess3 == null);

        return T.pure(void 0);
      });
    }));
  });
});
