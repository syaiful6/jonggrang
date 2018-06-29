import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as assert from 'assert';
import request from 'supertest';
import * as W from '../src';
import * as T from '@jonggrang/task';
import { decodePathSegments } from '@jonggrang/http-types';

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
});
