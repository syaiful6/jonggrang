import R from 'ioredis';
import { identity } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import {
  Session, createSession, AuthId, SessionAlreadyExists, nextExpires, SessionDoesNotExist,
  Storage, StorageTxConstructor
} from '@jonggrang/sersan';


export class RedisStorage implements Storage {
  readonly tx: StorageTxConstructor;
  constructor(
    readonly redis: R.Redis,
    readonly idleTimeout: number | null,
    readonly absoluteTimeout: number | null
  ) {
    this.tx = {
      of: T.pure,
      liftTask: identity
    };
  }

  runTransaction<A>(t: T.Task<A>): T.Task<A> {
    return t;
  }

  get(sessId: string): T.Task<Session | null> {
    return getSessionImpl(this, sessId);
  }

  destroy(sessId: string): T.Task<void> {
    return destroySessionImpl(this, sessId);
  }

  destroyAllOfAuthId(authId: string): T.Task<void> {
    return destroyAllOfAuthIdImpl(this, authId);
  }

  insert(sess: Session) {
    return insertSessionImpl(this, sess);
  }

  replace(sess: Session): T.Task<void> {
    return replaceSessionImpl(this, sess);
  }
}

function getSessionImpl(storage: RedisStorage, sessId: string): T.Task<Session | null> {
  const redis = storage.redis;
  return T.node(redis, rSessionKey(sessId), redis.hgetall)
    .map((x: string[]) => parseSession(sessId, x));
}

function destroySessionImpl(storage: RedisStorage, sid: string): T.Task<void> {
  return getSessionImpl(storage, sid)
    .chain(sess => {
      if (sess == null) return T.pure(void 0);
      let commands = [['del', rSessionKey(sid)]];
      if (sess.authId != null)
        commands.push(['srem', rAuthKey(sess.authId), rSessionKey(sess.id)]);
      return transaction(commands, storage.redis).map(absurd);
    });
}

function destroyAllOfAuthIdImpl(storage: RedisStorage, authId: AuthId): T.Task<void> {
  const redis = storage.redis;
  return T.node(redis, rAuthKey(authId), redis.smembers)
    .map((refs: string[]) => {
      redis.del(...[authId].concat(refs));
    });
}

function insertSessionImpl(storage: RedisStorage, sess: Session): T.Task<void> {
  return getSessionImpl(storage, sess.id).chain(oldSess => {
    if (oldSess) return T.raise(new SessionAlreadyExists(oldSess, sess));
    const sk = rSessionKey(sess.id);
    let commands: string[][] = [['hmset', sk].concat(printSession(sess))];
    // ttl
    let ttl = expireSession(sess, storage);
    if (ttl !== null) commands.push(ttl);

    // auth
    if (sess.authId)
      commands.push(['sadd', rAuthKey(sess.authId), sk]);

    return transaction(commands, storage.redis).map(absurd);
  });
}

function replaceSessionImpl(storage: RedisStorage, sess: Session): T.Task<void> {
  return getSessionImpl(storage, sess.id).chain(oldSess => {
    if (oldSess == null) return T.raise(new SessionDoesNotExist(sess));
    const sk = rSessionKey(sess.id);
    // delete old session and set new one
    let commands = [
      ['del', sk],
      ['hmset', sk].concat(printSession(sess))
    ];
    let ttl = expireSession(sess, storage);
    if (ttl !== null) commands.push(ttl);

    // Remove the old auth ID from the map if it has changed.
    if (sess.authId !== oldSess.authId) {
      if (oldSess.authId != null) {
        commands.push(['srem', rAuthKey(oldSess.authId), sk]);
      }
      if (sess.authId != null) {
        commands.push(['sadd', rAuthKey(sess.authId), sk]);
      }
    }

    return transaction(commands, storage.redis).map(absurd);
  });
}

function transaction(commands: string[][], redis: R.Redis): T.Task<any> {
  return T.makeTask_(cb => {
    redis.multi(commands).exec(cb);
  });
}

function expireSession(sess: Session, storage: RedisStorage) {
  const n = nextExpires(storage as any, sess);
  if (n == null) return null;
  return ['expireat', rSessionKey(sess.id), '' + n];
}

export function printSession(sess: Session): string[] {
  let ret: string[] = [];
  if (sess.authId) ret.push('authId', sess.authId);
  ret.push(
    'createdAt', sess.createdAt as any,
    'accessedAt', sess.accessedAt as any,
    'data', JSON.stringify(sess.data)
  );
  return ret;
}

export function parseSession(sid: string, hash: any): Session | null {
  const result = SessParse(null, null, null);

  if (hash.authId) result.authId = hash.authId;
  if (hash.data) result.data = parseJsonOrNull(hash.data);
  if (hash.accessedAt != null && typeof hash.accessedAt !== 'number')
    result.accessedAt = parseInt(hash.accessedAt, 10);
  if (hash.createdAt != null && typeof hash.createdAt !== 'number')
    result.createdAt = parseInt(hash.accessedAt, 10);

  if (result.createdAt == null || result.accessedAt == null || result.data == null) {
    return null;
  }

  return createSession(sid, result.authId, result.data, result.createdAt, result.accessedAt);
}

export function rSessionKey(id: string): string {
  return `sersan:session:${id}`;
}

export function rAuthKey(authId: string): string {
  return `sersan:authId:${authId}`;
}

function parseJsonOrNull(data: string): any {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function SessParse(createdAt: null | number, accessedAt: null | number, data: any) {
  return { createdAt, accessedAt, data, authId: null };
}

function absurd() {}
