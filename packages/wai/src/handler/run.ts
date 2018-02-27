import { IncomingMessage, ServerResponse, Server } from 'http';
import { Server as HServer } from 'https';
import { Buffer } from 'buffer';

import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';
import * as P from '@jonggrang/prelude';

import { withFileInfoCache, getFileInfo } from './file-info';
import { withFdCache } from './fd-cache';
import { recvStream } from './recv';
import { sendResponse } from './response'
import * as SF from './send-file';
import * as Z from './types';
import { writeSock, endSock, identity } from './utils';
import * as W from '../index';
import * as FT from './fs-task';
import { Socket } from 'net';


/**
 * Run app with default settings
 */
export function run(server: Server | HServer, app: W.Application): T.Task<void> {
  return runWith(server, app, identity);
}

/**
 * Run app with provided server, function that take default settings and return
 * new settings to use.
 */
export function runWith(
  server: Server | HServer,
  app: W.Application,
  modifier: (d: Z.Settings) => Z.Settings
): T.Task<void> {
  return runSettingsServer(modifier(Z.defaultSettings), server, app);
}

/**
 * Like runSettingsServer, but instead take a Task that return `W.Application`
 */
export function withApplicationSettings(
  server: Server | HServer,
  createApp: T.Task<W.Application>,
  modifier: (d: Z.Settings) => Z.Settings
): T.Task<void> {
  return createApp.chain(app => runSettingsServer(modifier(Z.defaultSettings), server, app));
}

/**
 * A variant of `withApplicationSettings` that use defaultSetting
 */
export function withApplication(
  server: Server | HServer,
  createApp: T.Task<W.Application>
) {
  return withApplicationSettings(server, createApp, identity);
}

/**
 * This install shutdown handle for the given server and handle
 * the request with provided `application`. When server close
 * all live connections are gracefully shut down.
 */
export function runSettingsServer(
  settings: Z.Settings,
  server: Server | HServer,
  app: W.Application
): T.Task<void> {
  return withFdCache(settings.fdCacheDuration * 1000, getFd =>
    withFileInfoCache(settings.finfoCacheDuration * 1000, getFinfo =>
      runServer(settings, server, app, Z.internalInfo(getFileInfo, getFd))
    )
  );
}

/**
 * This convert `application` to `RequestHandler` that can be used
 * as request handler of HTTP Server.
 */
export function withRequestHandler<A>(
  settings: Z.Settings,
  app: W.Application,
  action: (handler: RequestHandler) => T.Task<A>
): T.Task<A> {
  return withFdCache(settings.fdCacheDuration * 1000, getFd =>
    withFileInfoCache(settings.finfoCacheDuration * 1000, getFinfo =>
      action(createRequestHandler(settings, app, Z.internalInfo(getFileInfo, getFd)))
    )
  );
}

/**
 * The request handler function
 */
export interface RequestHandler {
  (req: IncomingMessage, res: ServerResponse): void;
}

/**
 * Internal state structure when running application with `runServer`
 * or `runSettingsServer`
 */
interface ServerState {
  listener: RequestHandler;
  server: Server | HServer | null;
  connectionId: number;
  connections: Record<string, Socket>;
}

export function runServer(
  settings: Z.Settings,
  server: Server | HServer,
  app: W.Application,
  ii: Z.InternalInfo
): T.Task<void> {
  return T.bracket(
    T.pure(createServerState(settings, app, ii, server)),
    shutdownServer,
    state => connectAndTrapSignal(state, settings)
  )
}

function shutdownServer(
  state: ServerState
): T.Task<void> {
  return T.mergePar([
    destroAllConnections(state.connections),
    closeServer(state.server)
  ]).then(exitProcess());
}

function registerRequestHandler(
  state: ServerState
): T.Task<void> {
  return T.liftEff(() => {
    const server = state.server as Server | HServer;;
    server.on('request', state.listener);
    server.on('connection', listenConnectionSocket(state))
  });
}

function listenConnection(
  state: ServerState,
  sett: Z.Settings
) {
  const listenOpts = sett.listenOpts;
  const server = state.server as Server | HServer;
  if (listenOpts.path) {
    return bindConnectionUnix(listenOpts.path, listenOpts.permission || '660', listenOpts, server);
  }
  return T.liftEff(() => {
    server.listen(listenOpts);
  });
}

function bindConnectionUnix(
  path: string,
  permission: number | string,
  listenOpts: Z.ListenOpts,
  server: Server | HServer
): T.Task<void> {
  return T.apathize(FT.unlink(path))
    .chain(() => {
      return T.liftEff(() => {
        server.listen(listenOpts);
      })
    }).chain(() => {
      return T.forkTask(FT.chmod(path, permission))
    }).map(() => {});
}

function waitListening(state: ServerState): T.Task<void> {
  return T.makeTask(cb => {
    const server = state.server as Server | HServer;
    server.on('error', (err: Error) => {
      cb(err, void 0);
    });
    server.on('listening', () => {
      console.log('...started');
      cb(null, void 0);
    });
    return T.nonCanceler;
  });
}

function connectAndTrapSignal(
  state: ServerState,
  settings: Z.Settings
): T.Task<void> {
  return T.mergePar([
    registerRequestHandler(state),
    listenConnection(state, settings),
    waitListening(state)
  ]).chain(() => {
    return T.race([waitSigInt(), waitSigTerm()])
  });
}

function createServerState(
  settings: Z.Settings,
  app: W.Application,
  ii: Z.InternalInfo,
  server: Server | HServer,
): ServerState {
  return { server, listener: createRequestHandler(settings, app, ii), connectionId: 0, connections: {} };
}

function createRequestHandler(
  settings: Z.Settings,
  app: W.Application,
  ii: Z.InternalInfo
): RequestHandler {
  return function requestHandler(req: IncomingMessage, resp: ServerResponse) {
    T.launchTask(
      T.rescue(
        handleRequest(settings, app, ii, req, resp),
        err =>
          settings.onException(P.nothing, err)
      )
    )
  }
}

function waitSigInt(): T.Task<void> {
  return T.makeTask(cb => {
    function handler() {
      cb(null, void 0)
    }
    process.removeAllListeners('SIGINT').on('SIGINT', handler);
    return T.thunkCanceller(() => {
      process.removeListener('SIGINT', handler);
    });
  });
}

function waitSigTerm(): T.Task<void> {
  return T.makeTask(cb => {
    function handler() {
      cb(null, void 0)
    }
    process.removeAllListeners('SIGTERM').on('SIGTERM', handler);
    return T.thunkCanceller(() => {
      process.removeListener('SIGTERM', handler);
    })
  })
}

function handleRequest(
  settings: Z.Settings,
  app: W.Application,
  ii: Z.InternalInfo,
  request: IncomingMessage,
  response: ServerResponse
) {
  return T.bracket(
    T.pure(httpConnection(request, response)),
    conn => conn.close,
    conn => serveConnection(recvRequest(request, conn.recv), conn, ii, settings, app)
  )
}

function serveConnection(
  request: W.Request, conn: Z.Connection, ii: Z.InternalInfo,
  settings: Z.Settings, app: W.Application
): T.Task<void> {
  return T.rescue(
    app(request, response =>
      sendResponse(settings, conn, ii, request, conn.recv, response)
    ),
    err =>
      sendResponse(settings, conn, ii, W.defaultRequest,
        T.pure(Buffer.allocUnsafe(0)), settings.onExceptionResponse(err))
  );
}

export function httpConnection(
  req: IncomingMessage,
  response: ServerResponse
): Z.Connection {
  return new Conn(req, response);
}

export function recvRequest(req: IncomingMessage, recv: Z.Recv): W.Request {
  return new WaiRequest(req, recv);
}

function destroAllConnections(sockets: Record<string, Socket>): T.Task<void> {
  return T.liftEff(() => {
    Object.keys(sockets).forEach(key => {
      const sock = sockets[key];
      if (sock) {
        sock.destroy();
      }
    })
  });
}

function closeServer(server: Server | HServer | null): T.Task<void> {
  return T.makeTask(cb => {
    if (server == null) {
      process.nextTick(() => cb(null, void 0));
      return T.nonCanceler;
    }
    server.close(() => {
      cb(null, void 0);
    });
    return T.nonCanceler;
  })
}

function exitProcess() {
  return T.liftEff(() => {
    process.exit(0);
  });
}

function listenConnectionSocket(state: ServerState) {
  return function listener(socket: Socket) {
    state.connectionId += 1;
    (socket as any).__waiConId__ = state.connectionId;
    socket.once('close', () => {
      delete state.connections[(socket as any).__waiConId__];
    });
    state.connections[(socket as any).__waiConId__] = socket;
  }
}

class Conn {
  constructor(private req: IncomingMessage, private response: ServerResponse) {
  }

  sendAll(buf: Buffer) {
    return writeSock(this.response, buf);
  }

  sendMany(bs: Buffer[]) {
    return T.forIn(bs, buf => writeSock(this.response, buf)).map(() => {})
  }

  writeHead(st: H.Status, headers: H.ResponseHeaders) {
    return T.liftEff(() => {
      this.response.writeHead(st, headers);
    });
  }

  sendFile(fid: Z.FileId, start: number, end: number, hook: T.Task<void>) {
    return SF.sendFile(this.response, fid, start, end, hook);
  }

  get recv() {
    return recvStream(this.req, 16384);
  }

  get close() {
    return endSock(this.response);
  }
}

class WaiRequest implements W.Request {
  private _ver: H.HttpVersion | null;
  private _query: H.Query | null;
  private _pathInfo: string[] | null;
  readonly rawPathInfo: string;
  readonly rawQueryString: string;
  readonly vault: Record<string, any>;
  constructor(private req: IncomingMessage, readonly body: Z.Recv) {
    this._ver = null;
    this._query = null;
    const url = req.url as string;
    const idxParam = url.indexOf('?');
    this.rawPathInfo = url;
    this.rawQueryString = url.substring(idxParam + 1);
    this.vault = {};
  }

  get protocol() {
    if ((this.req.socket as any).encrypted) {
      return 'https';
    }
    const proto = this.headers['X-Forwarded-Proto'] || 'http';
    return (proto as string).split(/\s*,\s*/)[0];
  }

  get isSecure() {
    return this.protocol === 'https';
  }

  get headers() {
    return this.req.headers;
  }

  get query() {
    if (this._query == null) {
      this._query = H.parseQuery(this.rawQueryString);
      return this._query;
    }
    return this._query;
  }

  get pathInfo() {
    if (this._pathInfo == null) {
      this._pathInfo = H.pathSegments(this.rawPathInfo);
      return this._pathInfo;
    }
    return this._pathInfo;
  }

  get method() {
    return this.req.method as H.HttpMethod;
  }

  get httpVersion() {
    if (this._ver == null) {
      this._ver = H.httpVersion(this.req.httpVersionMajor, this.req.httpVersionMinor);
      return this._ver;
    }
    return this._ver;
  }
}
