import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as assert from 'assert';

import request from 'supertest';

import * as T from '@jonggrang/task';
import { decodePathSegments } from '@jonggrang/http-types';

import * as W from '../src';

function replicateA_<A>(i: number, task: T.Parallel<A>): T.Parallel<void>;
function replicateA_<A>(i: number, task: T.Task<A>): T.Task<void>;
function replicateA_<A>(i: number, task: any): any {
  function go(x: number): T.Task<void> {
    return x <= 0 ? T.pure(void 0) : T.apSecond(task, go(x - 1));
  }
  return go(i);
}

const FP_HEAD_APP = path.join(__dirname, '..', 'attic', 'head-response');
function headApp<A>(ctx: W.HttpContext, send: (rsp: W.Response) => T.Task<A>): T.Task<A> {
  const pathInfo = decodePathSegments(ctx.request.url as string);
  const headers = {
    'Content-Type': 'text/plain'
  };
  if (pathInfo.length === 1) {
    if (pathInfo[0] === 'buffer')
      return send(W.responseBuffer(200, headers, Buffer.from('shold not send')));
    else if (pathInfo[0] === 'streaming')
      return send(W.responseStream(200, headers, () => T.raise(new Error('should not evaluated'))));
    else if (pathInfo[0] === 'file')
      return send(W.responseFile(200, headers, FP_HEAD_APP));
    else if (pathInfo[0] === 'readable')
      return send(W.responseReadable(200, headers, new stream.Readable({ read: function () {
        throw new Error('should not called');
      }})));
  }
  return send(W.responseBuffer(404, headers, Buffer.from('invalid path')));
}

function withApp<A>(app: W.Application, action: (handler: W.RequestHandler) => T.Task<A>): T.Task<A> {
  return W.withRequestHandler(W.defaultSettings, app, action);
}

const FP_RANGE_FILE_APP = path.join(__dirname, '..', 'attic', 'hex');
const rangeApp: W.Application = (_, send) =>
  send(W.responseFile(200, { 'Content-Type': 'text/plain' }, FP_RANGE_FILE_APP));

function testRange(range: string, out: string, crange: string | null) {
  return withApp(rangeApp, handler => {
    return T.makeTask_(cb => {
      request(handler)
        .get('/')
        .set('Range', `bytes=${range}`)
        .expect(out)
        .expect((response: request.Response) => {
          assert.equal(response.header['content-length'], out.length.toString());
          if (crange == null) {
            assert.ok(!response.header['content-ranges']);
          } else {
            assert.equal(response.header['content-ranges'], `bytes ${crange}`);
          }
        })
        .end(cb);
    });
  });
}

function testPartial(size: number, offset: number, count: number, out: string) {
  const filePart = { offset, size, byteCount: count };
  const partialApp: W.Application = (_, send) =>
    send(W.responseFile(200, { 'Content-Type': 'text/plain' }, FP_RANGE_FILE_APP, filePart));
  const range = `bytes ${offset}-${offset + count - 1}/${size}`;
  return withApp(partialApp, handler => {
    return T.makeTask_(cb => {
      request(handler)
        .get('/')
        .expect(out)
        .expect((response: request.Response) => {
          assert.equal(response.header['content-length'], out.length.toString());
          assert.equal(response.header['content-ranges'], range);
        })
        .end(cb);
    });
  });
}

describe('wai respond', function () {
  it('can send response buffer', function () {
    const app: W.Application = (ctx, send) =>
      send(W.responseBuffer(200, {
        'Content-Type': 'text/plain'
      }, Buffer.from('hello')));

    return T.toPromise(withApp(app, handler =>
      T.makeTask(cb => {
        request(handler)
          .get('/')
          .expect(200)
          .expect('hello', cb);
        return T.nonCanceler;
      })
    ));
  });

  it('streaming response with length', function () {
    const app: W.Application = (ctx, send) =>
      send(W.responseStream(200, { 'Content-Length': 20 }, (write) =>
        replicateA_(4, write(Buffer.from('Hello')))));

    return T.toPromise(withApp(app, handler =>
      T.makeTask(cb => {
        request(handler)
          .get('/')
          .expect(200)
          .expect('HelloHelloHelloHello', cb);
        return T.nonCanceler;
      })
    ));
  });

  it('correctly send response with no body', function () {
    const app: W.Application = (_, send) =>
      send(W.responseBuffer(304, { 'Content-Length': 300 }, Buffer.from('')));

    return T.toPromise(withApp(app, handler =>
      T.makeTask_(cb => {
        request(handler)
          .get('/')
          .expect(304)
          .end(cb);
      })
    ));
  });

  it('correctly send handle head request', function () {
    return T.toPromise(withApp(headApp, handler =>
      T.forInPar_(['buffer', 'streaming', 'file', 'readable'], p => {
        return T.makeTask(cb => {
          request(handler)
            .head(`/${p}`)
            .expect(200)
            .expect((res: request.Response) => {
              assert.ok(!res.text);
            })
            .end(cb);
          return T.nonCanceler;
        });
      })
    ));
  });

  it('can handle head requests file response, no range', function () {
    return T.toPromise(withApp(headApp, handler =>
      T.makeTask(cb => {
        fs.stat(FP_HEAD_APP, (err, stat) => {
          if (err) return cb(err);
          request(handler)
            .head('/file')
            .expect(200)
            .expect((res: request.Response) => {
              assert.ok(!res.text);
              assert.equal(res.header['content-length'], stat.size.toString());
            })
            .end(cb);
        });
        return T.nonCanceler;
      }))
    );
  });

  it('can handle head request file response, with range', function () {
    return T.toPromise(withApp(headApp, handler =>
      T.makeTask_(cb => {
        request(handler)
          .head('/file')
          .set('Range', 'bytes=0-1')
          .expect(206)
          .expect((res: request.Response) => {
            assert.ok(!res.text);
            assert.equal(res.header['content-length'], '2');
          })
          .end(cb);
      })
    ));
  });

  it('range requests', function () {
    return T.toPromise(T.forInPar_(
      [ ['2-3', '23', '2-3/17']
      , ['5-', '56789abcdef\n', '5-16/17']
      , ['5-8', '5678', '5-8/17']
      , ['-3', 'ef\n', '14-16/17']
      , ['17-', '', '*/17']
      , ['-18', '0123456789abcdef\n', null]
      ] as [string, string, string | null][],
      ([a, b, c]) => testRange(a, b, c)
    ));
  });

  it('partial files', function () {
    return T.toPromise(T.forInPar_(
      [ [17, 2, 2, '23']
      , [17, 0, 2, '01']
      , [17, 3, 8, '3456789a']
      ] as [number, number, number, string][],
      ([a, b, c, d]) => testPartial(a, b, c, d)
    ));
  });
});
