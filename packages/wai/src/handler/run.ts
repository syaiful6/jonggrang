import * as FS from 'fs';
import { IncomingMessage, ServerResponse, Server } from 'http';
import { Server as HServer } from 'https';
import { Readable } from 'stream';
import { Socket } from 'net';

import * as T from '@jonggrang/task';
import * as H from '@jonggrang/http-types';
import * as P from '@jonggrang/prelude';

import { withFileInfoCache, getFileInfo } from './file-info';
import { withFdCache } from './fd-cache';
import { sendResponse } from './response';
import * as SF from './send-stream';
import * as Z from './types';
import { writeSock, endSock, identity } from './utils';
import * as W from '../type';


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
): T.Task<void> {
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
  );
}

function shutdownServer(
  state: ServerState
): T.Task<void> {
  return T.mergePar([
    T.liftEff(null, state.connections, destroAllConnections),
    closeServer(state.server)
  ]).chain(() => T.liftEff(process, 0, process.exit));
}

function registerRequestHandler(state: ServerState): void {
  const server = state.server as Server | HServer;
  server.on('request', state.listener);
  server.on('connection', listenConnectionSocket(state));
}

function listenConnection(
  state: ServerState,
  sett: Z.Settings
): T.Task<void> {
  const listenOpts = sett.listenOpts;
  const server = state.server as Server | HServer;
  if (listenOpts.path) {
    return bindConnectionUnix(listenOpts.path, listenOpts.permission || '660', listenOpts, server);
  }
  return T.liftEff(server, listenOpts, server.listen as any);
}

function bindConnectionUnix(
  path: string,
  permission: number | string,
  listenOpts: Z.ListenOpts,
  server: Server | HServer
): T.Task<void> {
  return T.apathize(T.node(null, path, FS.unlink))
    .chain(() =>
      T.liftEff(server, listenOpts, server.listen as any)
    ).chain(() =>
      T.forkTask(T.node(null, path, permission, FS.chmod))
    ) as T.Task<any>;
}

function waitListening(state: ServerState, cb: (err: Error | null, b: void) => void) {
  const server = state.server as Server | HServer;
  server.on('error', (err: Error) => {
    cb(err, void 0);
  });
  server.on('listening', () => {
    console.log('...started');
    cb(null, void 0);
  });
}

function connectAndTrapSignal(
  state: ServerState,
  settings: Z.Settings
): T.Task<void> {
  return T.mergePar([
    T.liftEff(null, state, registerRequestHandler),
    listenConnection(state, settings),
    T.node(null, state, waitListening)
  ]).chain(() => {
    return T.race([waitSigInt(), waitSigTerm()]);
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
    );
  };
}

function waitSigInt(): T.Task<void> {
  return T.makeTask(cb => {
    function handler() {
      cb(null, void 0);
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
      cb(null, void 0);
    }
    process.removeAllListeners('SIGTERM').on('SIGTERM', handler);
    return T.thunkCanceller(() => {
      process.removeListener('SIGTERM', handler);
    });
  });
}

function handleRequest(
  settings: Z.Settings,
  app: W.Application,
  ii: Z.InternalInfo,
  request: IncomingMessage,
  response: ServerResponse
) {
  const conn = httpConnection(response);
  return T.ensure(conn.close, serveConnection(request, conn, ii, settings, app));
}

function serveConnection(
  request: W.Request, conn: Z.Connection, ii: Z.InternalInfo,
  settings: Z.Settings, app: W.Application
): T.Task<void> {
  return T.rescue(
    app(W.createHttpContext(request), response =>
      sendResponse(settings, conn, ii, request, response)
    ),
    err =>
      sendResponse(settings, conn, ii, request, settings.onExceptionResponse(err))
  );
}

export function httpConnection(
  response: ServerResponse
): Z.Connection {
  return new Conn(response);
}

function destroAllConnections(sockets: Record<string, Socket>): void {
  Object.keys(sockets).forEach(key => {
    const sock = sockets[key];
    if (sock) {
      sock.destroy();
    }
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
  };
}

class Conn {
  constructor(private response: ServerResponse) {
  }

  sendAll(buf: Buffer): T.Task<void> {
    return writeSock(this.response, buf);
  }

  sendMany(bs: Buffer[]): T.Task<void> {
    return T.forIn_(bs, buf => writeSock(this.response, buf));
  }

  sendStream(stream: Readable): T.Task<void> {
    return SF.sendStream(this.response, stream);
  }

  writeHead(st: H.Status, headers: H.ResponseHeaders): T.Task<void> {
    return T.liftEff(this.response, st, headers, this.response.writeHead);
  }

  sendFile(fid: Z.FileId, start: number, end: number, hook: T.Task<void>): T.Task<void> {
    return SF.sendFile(this.response, fid, start, end, hook);
  }

  get close(): T.Task<void> {
    return endSock(this.response);
  }
}
