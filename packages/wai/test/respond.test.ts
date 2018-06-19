import request from 'supertest';
import * as W from '../src';
import * as T from '@jonggrang/task';

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
});
