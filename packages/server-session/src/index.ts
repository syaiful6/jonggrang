import { deepEq } from '@jonggrang/prelude';
import { drop, insert, isEmpty } from '@jonggrang/object';
import * as T from '@jonggrang/task';
import { randomString } from '@jonggrang/cryptic';


/**
 * The Id of a session
 */
export type SessionId = string;

// Securely generate a new SessionId.
export const generateSessionId: T.Task<SessionId> = randomString(32);

// Value of the `authKey' in session
export type AuthId = string;

// Session data are simple JS object
export type SessionData = Record<string, any>;

/**
 * Representation of a saved session.
 */
export interface Session {
  /**
   * session's id, primary key
   */
  id: SessionId;

  /**
   * Value of `authId`, separate from rest
   */
  authId: null | AuthId;

  /**
   * rest of session data
   */
  data: SessionData;

  /**
   * When this session was created, it's unix timestampt value
   */
  createdAt: number;

  /**
   * When this session was last accessed.
   */
  accessedAt: number;
}

// Session, to use
class StdSession implements Session {
  constructor(
    readonly id: SessionId,
    readonly authId: null | AuthId,
    readonly data: SessionData,
    readonly createdAt: number,
    readonly accessedAt: number) {
  }

  toString() {
    return `<session ${this.id}>`;
  }
}

/**
 * Create a session
 */
export function createSession(
  id: SessionId,
  authId: null | AuthId,
  data: SessionData,
  createdAt: number,
  accessedAt: number
): Session {
  return new StdSession(id, authId, data, createdAt, accessedAt);
}

export interface DecomposedSession {
  authId: null | AuthId;
  force: ForceInvalidate;
  decomposed: SessionData;
}

/**
 * Force invalidation
 */
export const enum ForceInvalidate {
  CURRENT_SESSION_ID,
  ALL_SESSION_IDS_OF_LOGGED_USER,
  DONOT_FORCE_INVALIDATE
}

/**
 */
export const forceInvalidateKey: string = '_serversession_force_invalidate';

/**
 * Decompose session data into:
 *
 * - authId: The auth ID of the logged in user.
 * - force: If the session is being forced to be invalidated.
 * - decomposed: The rest of session data.
 */
function decomposeSession(authKey: string, sess: SessionData): DecomposedSession {
  const authId: string | null = authKey in sess ? sess[authKey] : null;
  const force: any = forceInvalidateKey in sess ? sess[forceInvalidateKey]
    : ForceInvalidate.DONOT_FORCE_INVALIDATE;
  const sess2 = drop([authKey, forceInvalidateKey], sess);
  return {
    authId,
    force: typeof force !== 'number' ? ForceInvalidate.DONOT_FORCE_INVALIDATE : force,
    decomposed: sess2
  };
}

/**
 * Recompose a decomposed session again
 */
function recomposeSession(authKey: string, authId: string | null, sess: SessionData): SessionData {
  return authId == null ? sess : insert(authKey, authId, sess);
}

// Monad where transactions happen for a backend. Each Storage
// can have their own monad.
export interface StorageTx<A> {
  map<B>(f: (_: A) => B): StorageTx<B>;
  chain<B>(f: (_: A) => StorageTx<B>): StorageTx<B>;
}

/**
 * Static method of Monad `StorageTx<A>` with the addition
 * ability to lift a Task to `StorageTx<A>`
 */
export interface StorageTxConstructor {
  of<A>(a: A): StorageTx<A>;
  liftTask<A>(a: T.Task<A>): StorageTx<A>;
}

/**
 * A storage backend, for server-side sessions.
 */
export interface Storage {
  /**
   * Static method needed for `TransactionTx` monad of storage
   */
  tx: StorageTxConstructor;

  /**
   * Run a transaction on the `Task` monad.
   */
  runTransaction<A>(tx: StorageTx<A>): T.Task<A>;

  /**
   * Get the session for the given session ID. Returns
   * null if if the session is not found.
   */
  get(sessId: SessionId): StorageTx<Session | null>;

  /**
   * Delete the session with given session ID. Does not do
   * anything if the session is not found.
   */
  destroy(sessId: SessionId): StorageTx<void>;

  /**
   * Delete all sessions of the given auth ID. Does not do
   * anything if there are no sessions of the given auth ID.
   */
  destroyAllOfAuthId(authId: AuthId): StorageTx<void>;

  /**
   * Insert a new session. Raise 'SessionAlreadyExists' if
   * there already exists a session with the same session ID
   * (we only call this method after generating a fresh session ID)
   */
  insert(sess: Session): StorageTx<void>;

  /**
   * Replace the contents of a session. Raise 'SessionDoesNotExist' if
   * there is no session with the given  session ID (we only call this method
   * when updating a session that is known to exist)
   *
   * It is possible to have concurrent requests using the same
   * session ID such that:
   *
   * request 1: loadSession
   *                        request 2: loadSession
   *                        request 2: forceInvalidate
   *                        request 2: saveSession
   * request 1: saveSession
   *
   * The request 2's call to 'saveSession' will have called 'destroy' as invalidation
   * was forced. However, request 1 has no idea and will try to `replace`. The
   * following behaviors are possible:
   *
   * 1. Make `replace` insert the session again. However, this will undo the
   * invalidation of request 2. As invalidations are done for security reasons,
   * this is a bad idea.
   *
   * 2. Make `replace` silently discard the session. The reasoning is that, as the
   * session was going to be invalidated if request 2 came after request 1, we can
   * discard its contents. However, we can't be sure that request 2 would have had
   * the same effect if it had seen the session changes made by request 1 (and vice versa).
   *
   * 3. Make `replace` throw an error. This error is going to be unrecoverable since
   * usually the session processing is done at the end of the request processing by
   * the web framework, thus leading to a 500 Internal Server Error.  However, this
   * signals to the caller that something went wrong, which is correct.
   *
   * Most of the time this discussion does not matter. Invalidations usually occur
   * at times where only one request is flying.
   */
  replace(sess: Session): StorageTx<void>;
}

/**
 * Common exceptions that may be thrown by any storage
 */
export type StorageError = SessionAlreadyExists | SessionDoesNotExist;

export class SessionAlreadyExists extends Error {
  readonly code: string;
  constructor(readonly oldSession: Session, readonly newSession: Session) {
    super('There is already exists a session with the same session ID');
    this.code = 'ESESSIONEXISTS';
  }
}

export class SessionDoesNotExist extends Error {
  readonly code: string;
  constructor(readonly newSession: Session) {
    super('There is no session with the given session ID');
    this.code = 'ESESSIONNOTEXISTS';
  }
}

/**
 * The server-side session backend needs to maintain some state
 * in order to work. This interface hold all info needed.
 */
export interface ServerSessionState {
  storage: Storage;
  cookieName: string;
  authKey: string;
  idleTimeout: number | null;
  absoluteTimeout: number | null;
  timeoutResolution: number | null;
  persistenCookies: boolean;
  httpOnlyCookies: boolean;
  secureCookies: boolean;
}

/**
 * Opaque token containing the necessary information for
 * 'saveSession' to save the session.
 */
export interface SaveSessionToken {
  sess: Session | null;
  now: number;
}

/**
 * Create a new 'ServerSessionState' for the server-side session backend
 * using the given storage backend.
 * @param storage The storage backend
 */
export function createServerSessionState(storage: Storage): ServerSessionState {
  return {
    storage,
    cookieName: 'jonggrang:session',
    authKey: '_authId',
    idleTimeout: 604800, // 7 days
    absoluteTimeout: 5184000, // 60 days
    timeoutResolution: 600, // 10 minutes
    persistenCookies: true,
    httpOnlyCookies: true,
    secureCookies: false
  };
}

/**
 * Load the session map from the storage backend. The value of
 * the session cookie should be given as argument if present.
 * the return value are tuple of
 * - The session data to be used by the frontend as the current session's value.
 * - Information to be passed back to 'saveSession' on the end f the request in
 * order to save the session.
 */
export function loadSession(
  state: ServerSessionState,
  cookie: string | null
): T.Task<[SessionData, SaveSessionToken]> {
  const now = Date.now();
  const storage = state.storage;
  const get: T.Task<Session | null> | null = cookie == null ? null
    : checkSessionId(cookie) ? storage.runTransaction(storage.get(cookie))
      : null;
  const checkedGet = get == null ? null
    : get.map(msess => msess == null ? null : checkExpired(now, state, msess));
  const maybeInput = checkedGet == null ? T.pure(null) : checkedGet;

  return maybeInput.map(sess => {
    if (sess == null) return [{}, { sess, now }] as [SessionData, SaveSessionToken];

    const inputData = recomposeSession(state.authKey, sess.authId, sess.data);

    return [inputData, { sess, now }] as [SessionData, SaveSessionToken];
  });
}

/**
 * Check if a session `s` has expired.  Returns the `s` if not expired, otherwise
 * return `null`.
 * @param now
 * @param state
 * @param session
 */
export function checkExpired(now: number, state: ServerSessionState, session: Session): Session | null {
  const ne = nextExpires(state, session);
  return ne === null ? null : ne > now ? session : null;
}

/**
 * Calculate the next point in time where the given session will expire assuming
 * that it sees no activity until then. Returns `null` if the state does not have
 * any expirations.
 * @param state
 * @param session
 */
export function nextExpires(state: ServerSessionState, session: Session): number | null {
  const idle = state.idleTimeout == null ? null : session.accessedAt + (state.idleTimeout * 1000);
  const absolute = state.absoluteTimeout == null ? null : session.createdAt + (state.absoluteTimeout * 1000);
  const xs = [idle, absolute].filter(notNull) as number[];
  return xs.length === 0 ? null : Math.min(...xs);
}

/**
 * Save the session on the storage backend. A 'SaveSessionToken' given by
 * 'loadSession' is expected besides the new contents of the session.
 * Returns `null` if the session was empty and didn't need to be saved.
 * Note that this does *not* necessarily means that nothing was done.
 * If you ask for a session to be invalidated and clear every other sesssion
 * variable, then 'saveSession' will invalidate the older session but will
 * avoid creating a new, empty one.
 * @param state
 * @param token
 * @param data
 */
export function saveSession(
  state: ServerSessionState,
  token: SaveSessionToken,
  data: SessionData
): T.Task<Session | null> {
  const outputDecomp = decomposeSession(state.authKey, data);
  const storage = state.storage;
  return storage.runTransaction(
    invalidateIfNeeded(state, token.sess, outputDecomp)
      .chain(newMaybeInput => saveSessionOnDb(state, token.now, newMaybeInput, outputDecomp))
  );
}

/**
 * Invalidates an old session ID if needed. Returns the 'Session' that
 * should be replaced when saving the session, if any.
 *
 * Currently we invalidate whenever the auth ID has changed
 * (login, logout, different user) in order to prevent session
 * fixation attacks.  We also invalidate when asked to via
 * `forceInvalidate`
 * @param state
 * @param maybeInput
 * @param decomposed
 */
export function invalidateIfNeeded(
  state: ServerSessionState,
  maybeInput: Session | null,
  decomposed: DecomposedSession
): StorageTx<Session | null> {
  const storage = state.storage;
  const inputAuthId = maybeInput == null ? null : maybeInput.authId;
  const invalidateCurrent = decomposed.force !== ForceInvalidate.DONOT_FORCE_INVALIDATE || inputAuthId !== decomposed.authId;
  const invalidateOthers = decomposed.force === ForceInvalidate.ALL_SESSION_IDS_OF_LOGGED_USER && decomposed.authId !== null;
  return whenNullable(storage.tx, invalidateCurrent, maybeInput, sess => storage.destroy(sess.id))
    .chain(() =>
      whenNullable(storage.tx, invalidateOthers, decomposed.authId, authId => storage.destroyAllOfAuthId(authId)))
    .map(() => invalidateCurrent ? null : maybeInput);
}

/**
 * Save a session on the database. If an old session is supplied,
 * it is replaced, otherwise a new session is generated.
 * If the session is empty, it is not saved and `null` is returned.
 * If the timeout resolution optimization is applied, the old session is
 * returned and no update is made.
 * @param state
 * @param now
 * @param msess
 * @param dec
 */
export function saveSessionOnDb(
  state: ServerSessionState,
  now: number,
  msess: Session | null,
  dec: DecomposedSession
): StorageTx<Session | null> {
  const storage = state.storage;
  const ctx = storage.tx;
  if (msess == null && dec.authId == null && isEmpty(dec.decomposed)) return ctx.of(null);

  if (msess != null && state.timeoutResolution !== null && msess.authId === dec.authId && deepEq(msess.data, dec.decomposed)
      && Math.abs(msess.accessedAt - now) < (state.timeoutResolution * 1000)) {
    return ctx.of(msess);
  }

  if (msess == null) {
    return ctx.liftTask(generateSessionId)
      .chain(id => {
        const sess = createSession(id, dec.authId, dec.decomposed, now, now);
        return storage.insert(sess).map(() => sess);
      });
  }
  const sess = createSession(msess.id, dec.authId, dec.decomposed, msess.createdAt, now);
  return storage.replace(sess).map(() => sess);
}

function whenNullable<A>(
  ctx: StorageTxConstructor,
  b: boolean,
  m: A | null,
  f: (_: A) => StorageTx<void>
): StorageTx<void> {
  return b === false || m == null ? ctx.of(void 0) : f(m);
}

function checkSessionId(str: string): boolean {
  return str.length === 32;
}

function notNull<A>(x: A | null): x is A {
  return x != null;
}
