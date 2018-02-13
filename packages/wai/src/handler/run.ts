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

function runServer(
  settings: Z.Settings,
  server: Server | HServer,
  app: W.Application,
  ii: Z.InternalInfo
): T.Task<void> {
  return T.bracket(
    T.pure(createServerListener(settings, app, ii)),
    listener => removeListenerCb(server, listener),
    listener => connectAndTrapSignal(server, listener)
  )
}

function removeListenerCb(
  server: Server | HServer,
  cb: (request: IncomingMessage, response: ServerResponse) => void
): T.Task<void> {
  return T.liftEff(() => {
    server.removeListener('request', cb);
  })
}

function listenConnection(
  server: Server | HServer,
  cb: (request: IncomingMessage, response: ServerResponse) => void
): T.Task<void> {
  return T.liftEff(() => {
    server.on('request', cb);
  });
}

function connectAndTrapSignal(
  server: Server | HServer,
  cb: (request: IncomingMessage, response: ServerResponse) => void
): T.Task<void> {
  return listenConnection(server, cb)
}

function createServerListener(
  settings: Z.Settings,
  app: W.Application,
  ii: Z.InternalInfo
): (request: IncomingMessage, response: ServerResponse) => void {
  return function listener(req, resp) {
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
      settings.onExceptionResponse(err)
        .chain(res => sendResponse(settings, conn, ii, W.defaultRequest, T.pure(Buffer.allocUnsafe(0)), res))
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
      response.writeHead(st.code, st.reasonPhrase, headers);
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
