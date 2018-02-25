import * as P from '@jonggrang/prelude';
import * as H from '@jonggrang/http-types';
import * as T from '@jonggrang/task';
import * as SM from '@jonggrang/object';

import { Request, Response, FilePart, StreamingBody, ContentType, HttpContent } from '../index';
import { addContentHeadersForFilePart, conditionalRequest, RspFileInfoType } from './file';
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
      resp.headers, rspFromResponse(resp.content, req.method, req.headers)
    ).chain(([st, mlen]) =>
      P.isNothing(st) ? T.pure(void 0) : settings.logger(req, st.value, mlen)
    );
  }
  return sendRsp(conn, ii, req.httpVersion, resp.status, resp.headers, { tag: RspType.RSPNOBODY })
    .chain(() => settings.logger(req, resp.status, P.nothing))
}

const enum RspType {
  RSPNOBODY,
  RSPFILE,
  RSPBUFFER,
  RSPSTREAM
}

type Rsp
  = { tag: RspType.RSPNOBODY }
  | { tag: RspType.RSPFILE; path: string; part?: FilePart; header: H.RequestHeaders; isHead: boolean; }
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
  switch (rsp.tag) {
    case RspType.RSPNOBODY:
      return conn.writeHead(status, headers)
        .then(T.pure([P.just(status), P.nothing] as [P.Maybe<H.Status>, P.Maybe<number>]));

    case RspType.RSPBUFFER:
      return conn.writeHead(status, headers)
        .chain(() => conn.sendAll(rsp.buffer))
        .then(T.pure([P.just(status), P.nothing] as [P.Maybe<H.Status>, P.Maybe<number>]));

    case RspType.RSPSTREAM:
      return conn.writeHead(status, headers)
        .chain(_ => rsp.body(conn.sendAll, conn.sendAll(Buffer.from([]))))
        .map(_ => [P.just(status), P.nothing] as [P.Maybe<H.Status>, P.Maybe<number>]);

    case RspType.RSPFILE:
      if (rsp.part != null) {
        const part = rsp.part;
        return sendRspFile2XX(conn, ii, ver, status, addContentHeadersForFilePart(headers, part),
          rsp.path, part.offset, part.byteCount, rsp.isHead);
      }
      return T.attempt(ii.getFinfo(rsp.path))
        .chain(efinfo => {
          if (P.isLeft(efinfo)) {
            return sendRspFile404(conn, ii, ver, headers)
          }
          const rspFile = conditionalRequest(efinfo.value, headers, rsp.header);
          switch (rspFile.tag) {
            case  RspFileInfoType.WITHBODY:
              return sendRspFile2XX(conn, ii, ver, rspFile.status, rspFile.header, rsp.path,
                rspFile.offset, rspFile.length, rsp.isHead);

            case RspFileInfoType.WITHOUTBODY:
              return sendRsp(conn, ii, ver, rspFile.status, headers, { tag: RspType.RSPNOBODY });
          }
        });

    default:
      throw new TypeError('last argument to sendRsp must be Rsp');
  }
}

function sendRspFile2XX(
  conn: Z.Connection,
  ii: Z.InternalInfo,
  ver: H.HttpVersion,
  status: H.Status,
  headers: H.ResponseHeaders,
  path: string,
  beg: number,
  len: number,
  isHead: boolean
): T.Task<[P.Maybe<H.Status>, P.Maybe<number>]> {
  if (isHead) {
    return sendRsp(conn, ii, ver, status, headers, { tag: RspType.RSPNOBODY });
  }
  return ii.getFd(path)
    .chain(([mfd, fresher]) => {
      const fid = Z.fileId(path, mfd);
      return conn.writeHead(status, headers)
        .chain(() => conn.sendFile(fid, beg, len, fresher))
        .chain(() => T.pure([P.just(status), P.just(len)] as [P.Maybe<H.Status>, P.Maybe<number>]))
    });
}

function sendRspFile404(
  conn: Z.Connection,
  ii: Z.InternalInfo,
  ver: H.HttpVersion,
  h: H.ResponseHeaders
): T.Task<[P.Maybe<H.Status>, P.Maybe<number>]> {
  const buffer = Buffer.from('File not found', 'utf8');
  const headers = SM.set('Content-Type', 'text/plain; charset=utf-8', h as any);
  return sendRsp(conn, ii, ver, 404, headers, { buffer, tag: RspType.RSPBUFFER })
}

function hasBody(code: H.Status): boolean {
  return code !== 204 && code !== 304 && code >= 200;
}

function rspFromResponse(body: HttpContent, method: H.HttpMethod, header: H.RequestHeaders): Rsp {
  const isHead = method === 'HEAD';
  switch (body.tag) {
    case ContentType.FILE:
      return {
        isHead,
        header,
        tag: RspType.RSPFILE,
        path: body.path,
        part: body.part
      } as Rsp;

    case ContentType.BUFFER:
      if (isHead) {
        return { tag: RspType.RSPNOBODY };
      }
      return {
        tag: RspType.RSPBUFFER,
        buffer: body.buffer
      };

    case ContentType.STREAM:
      if (isHead) {
        return { tag: RspType.RSPNOBODY };
      }
      return {
        tag: RspType.RSPSTREAM,
        body: body.stream
      }

    default:
      throw new TypeError('argument 1 to rspFromResponse must be a Response');
  }
}
