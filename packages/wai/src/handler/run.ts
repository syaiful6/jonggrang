import { IncomingMessage, ServerResponse, Server } from 'http';
import { Server as HServer } from 'https';
import { Buffer } from 'buffer';

import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';
import * as RV from '@jonggrang/ref';
import * as P from '@jonggrang/prelude';

import { withFileInfoCache, getFileInfo } from './file-info';
import { withFdCache } from './fd-cache';
import { recvStream } from './recv';
import { sendResponse } from './response'
import { createSendFile } from './send-file';
import * as Z from './types';
import { writeSock, endSock } from './utils';
import * as W from '../index';
import * as FT from './fs-task';
import { Socket } from 'net';


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

interface RequestHandler {
  (req: IncomingMessage, res: ServerResponse): void;
}

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
  function listener(req: IncomingMessage, resp: ServerResponse) {
    T.launchTask(
      T.attempt(handleRequest(settings, app, ii, req, resp))
        .chain(result => {
          if (P.isLeft(result)) {
            return settings.onException(P.nothing, result.value);
          }
          return T.pure(void 0)
        })
    )
  }
  return { listener, server, connectionId: 0, connections: {} };
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
  return RV.newRef(false)
    .chain(ref =>
      T.bracket(
        T.pure(httpConnection(request, response)),
        conn => cleanupConn(ref, conn, ii),
        conn => serveConnection(recvRequest(request, conn.recv), conn, ii, settings, app)
      )
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

function cleanupConn(ref: RV.Ref<boolean>, conn: Z.Connection, ii: Z.InternalInfo): T.Task<void> {
  return RV.modifyRef_(ref, x => [true, x])
    .chain(isClosed => isClosed === false ? conn.close : T.pure(void 0))
}

export function httpConnection(
  req: IncomingMessage,
  response: ServerResponse
): Z.Connection {
  const sendMany = (bs: Buffer[]) => T.forIn(bs, buf => writeSock(response, buf)).map(() => {});
  const sendAll = (buf: Buffer) => writeSock(response, buf);
  const writeHead: Z.WriteHead = (st: H.Status, headers: H.ResponseHeaders) => {
    return T.liftEff(() => {
      response.writeHead(st, headers);
    });
  };
  return {
    sendMany,
    sendAll,
    writeHead,
    close: endSock(response),
    sendFile: createSendFile(response),
    recv: recvStream(req, 16384)
  };
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
