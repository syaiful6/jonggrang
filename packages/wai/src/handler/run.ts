import * as FS from 'fs';
import { IncomingMessage, ServerResponse, Server } from 'http';
import { Server as HServer } from 'https';
import { Socket } from 'net';

import * as T from '@jonggrang/task';
import * as P from '@jonggrang/prelude';

import { withFileInfoCache } from './file-info';
import { withFdCache } from './fd-cache';
import { sendResponse } from './response';
import { defaultSettings } from './settings';
import * as Z from './types';
import * as W from '../type';
import { hashStr } from './utils';


/**
 * Run app with default settings
 */
export function run(server: Server | HServer, app: W.Application): T.Task<void> {
  return runWith(server, app, P.identity);
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
  return runSettingsServer(modifier(defaultSettings), server, app);
}

/**
 * Like runSettingsServer, but instead take a Task that return `W.Application`
 */
export function withApplicationSettings(
  server: Server | HServer,
  createApp: T.Task<W.Application>,
  modifier: (d: Z.Settings) => Z.Settings
): T.Task<void> {
  return createApp.chain(app => runSettingsServer(modifier(defaultSettings), server, app));
}

/**
 * A variant of `withApplicationSettings` that use defaultSetting
 */
export function withApplication(
  server: Server | HServer,
  createApp: T.Task<W.Application>
): T.Task<void> {
  return withApplicationSettings(server, createApp, P.identity);
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
      runServer(settings, server, app, Z.internalInfo1(getFinfo, getFd))
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
      action(createRequestHandler(settings, app, Z.internalInfo1(getFinfo, getFd)))
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
  ii1: Z.InternalInfo1
): T.Task<void> {
  return T.bracket(
    T.pure(createServerState(settings, app, ii1, server)),
    shutdownServer,
    state => connectAndTrapSignal(state, settings)
  );
}

function shutdownServer(
  state: ServerState
): T.Task<void> {
  return T.sequencePar([
    T.liftEff(null, state.connections, destroAllConnections),
    closeServer(state.server)
  ]) as any;
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
  return T.node(server, listenOpts, server.listen);
}

function bindConnectionUnix(
  path: string,
  permission: number | string,
  listenOpts: Z.ListenOpts,
  server: Server | HServer
): T.Task<void> {
  return T.apathize(T.node(null, path, FS.unlink))
    .chain(() =>
      T.node(server, listenOpts, server.listen)
    ).chain(() =>
      T.forkTask(T.node(null, path, permission, FS.chmod))
    ) as T.Task<any>;
}

function connectAndTrapSignal(
  state: ServerState,
  settings: Z.Settings
): T.Task<void> {
  return T.sequencePar([
    T.liftEff(null, state, registerRequestHandler),
    listenConnection(state, settings)
  ]).chain(() => {
    return T.race([
      waitSignal('SIGINT'),
      waitSignal('SIGTERM')
    ]);
  });
}

function createServerState(
  settings: Z.Settings,
  app: W.Application,
  ii1: Z.InternalInfo1,
  server: Server | HServer,
): ServerState {
  return { server, listener: createRequestHandler(settings, app, ii1), connectionId: 0, connections: {} };
}

export function createRequestHandler(
  settings: Z.Settings,
  app: W.Application,
  ii1: Z.InternalInfo1
): RequestHandler {
  return function requestHandler(req: IncomingMessage, resp: ServerResponse) {
    T.launchTask(
      T.rescue(
        waiHandleRequest(settings, app, ii1, req, resp),
        err =>
          settings.onException(P.nothing, err)
      )
    );
  };
}

function waitSignal(signal: string): T.Task<void> {
  return T.makeTask(cb => {
    process.once(signal as any, cb as any);
    return T.thunkCanceller(() => {
      process.removeListener(signal, cb as any);
    });
  });
}

export function waiHandleRequest(
  settings: Z.Settings,
  app: W.Application,
  ii1: Z.InternalInfo1,
  request: IncomingMessage,
  response: ServerResponse
): T.Task<void> {
  const conn = settings.createConnection(response);
  const ii = Z.toInternalInfo(hashStr(request.url as string), ii1);
  return T.ensure(waiServeConnection(request, conn, ii, settings, app), conn.close);
}

export function waiServeConnection(
  request: W.Request, conn: Z.Connection, ii: Z.InternalInfo,
  settings: Z.Settings, app: W.Application
): T.Task<void> {
  return settings.createHttpContext(request)
    .chain(ctx =>
      T.rescue(
        app(ctx, response => sendResponse(settings, conn, ii, request, response)),
        err => sendResponse(settings, conn, ii, request, settings.onExceptionResponse(err))
      )
    );
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
  return T.makeTask_(cb => {
    if (server == null) {
      return process.nextTick(() => cb(null, void 0));
    }
    server.close(() => {
      cb(null, void 0);
    });
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
