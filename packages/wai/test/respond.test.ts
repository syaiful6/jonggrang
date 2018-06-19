import request from 'supertest';
import * as W from '../src';
import * as T from '@jonggrang/task';

function replicateA_<A>(i: number, task: T.Parallel<A>): T.Parallel<void>;
function replicateA_<A>(i: number, task: T.Task<A>): T.Task<void>;
function replicateA_<A>(i: number, task: any): any {
  function go(x: number): T.Task<void> {
    return x <= 0 ? T.pure(void 0) : T.apSecond(task, go(x - 1));
  }
  return go(i);
}

describe('wai respond', function () {
  it('can send response buffer', function () {
    const app: W.Application = (ctx, send) =>
      send(W.responseBuffer(200, {
        'Content-Type': 'text/plain'
      }, Buffer.from('hello')));

    return T.toPromise(W.withRequestHandler(W.defaultSettings, app, handler =>
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

    return T.toPromise(W.withRequestHandler(W.defaultSettings, app, handler =>
      T.makeTask(cb => {
        request(handler)
          .get('/')
          .expect(200)
          .expect('HelloHelloHelloHello', cb);
        return T.nonCanceler;
      })
    ));
  });
});
