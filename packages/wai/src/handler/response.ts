import * as P from '@jonggrang/prelude';
import * as H from '@jonggrang/http-types';
import * as T from '@jonggrang/task';

import { Request, Response, FilePart, StreamingBody, ResponseType } from '../index';
import * as Z from './types';

export function sendResponse(
  settings: Z.Settings,
  conn: Z.Connection,
  ii: Z.InternalInfo,
  req: Request,
  src: T.Task<Buffer>,
  resp: Response
): T.Task<void> {
  if (hasBody(resp.status)) {
    return sendRsp(conn, ii, req.httpVersion, resp.status,
      resp.headers, rspFromResponse(resp, req.method))
  }
}

const enum RspType {
  RSPNOBODY,
  RSPFILE,
  RSPBUFFER,
  RSPSTREAM
}

type Rsp
  = { tag: RspType.RSPNOBODY }
  | { tag: RspType.RSPFILE; path: string; part: FilePart; header: H.RequestHeaders; isHead: boolean; }
  | { tag: RspType.RSPBUFFER; buffer: Buffer; }
  | { tag: RspType.RSPSTREAM; body: StreamingBody };

function sendRsp(
  conn: Z.Connection,
  ii: Z.InternalInfo,
  ver: H.HttpVersion,
  status: H.Status,
  headers: H.ResponseHeaders,
  rsp: Rsp
): T.Task<[P.Maybe<H.Status>, P.Maybe<number>]> {
  if (rsp.tag === RspType.RSPNOBODY) {
    return conn.writeHead(status, headers)
      .then(T.pure([P.just(status), P.nothing] as [P.Maybe<H.Status>, P.Maybe<number>]))
  }
  if (rsp.tag === RspType.RSPBUFFER) {
    return conn.writeHead(status, headers)
      .chain(_ => conn.sendAll(rsp.buffer))
      .map(_ => [P.just(status), P.nothing] as [P.Maybe<H.Status>, P.Maybe<number>]);
  }
  if (rsp.tag === RspType.RSPSTREAM) {
    return conn.writeHead(status, headers)
      .chain(_ => rsp.body(conn.sendAll, conn.sendAll(Buffer.from([]))))
      .map(_ => [P.just(status), P.nothing] as [P.Maybe<H.Status>, P.Maybe<number>])
  }
}

function hasBody(st: H.Status): boolean {
  const code = st.code;
  return code !== 204 && code !== 304 && code >= 200;
}

function rspFromResponse(resp: Response, method: H.HttpMethod): Rsp {
  const isHead = method === 'HEAD';
  switch (resp.tag) {
    case ResponseType.RESPONSEFILE:
      return {
        tag: RspType.RSPFILE,
        path: resp.path,
        part: resp.part,
        isHead: method === 'HEAD'
      } as Rsp;

    case ResponseType.RESPONSEBUFFER:
      if (isHead) {
        return { tag: RspType.RSPNOBODY };
      }
      return {
        tag: RspType.RSPBUFFER,
        buffer: resp.buffer
      };

    case ResponseType.RESPONSESTREAM:
      if (isHead) {
        return { tag: RspType.RSPNOBODY };
      }
      return {
        tag: RspType.RSPSTREAM,
        body: resp.body
      }
}
