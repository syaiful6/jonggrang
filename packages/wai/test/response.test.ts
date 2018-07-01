import * as assert from 'assert';

import * as H from '@jonggrang/http-types';
import * as T from '@jonggrang/task';

import * as W from '../src';


describe('Response', function () {
  const TEST_RESPONSE = W.responseUtf8(200, { 'Content-Type': 'text/plain' }, '');
  it('#responseStatus get status of response', function () {
    const st = W.responseStatus(TEST_RESPONSE);
    assert.equal(st, 200);
  });

  it('#responseHeaders get header of response', function () {
    const headers = W.responseHeaders(TEST_RESPONSE);
    assert.deepEqual(headers, { 'Content-Type': 'text/plain' });
  });

  it('#mapResponseHeaders can modify headers of response', function () {
    const modified =  W.mapResponseHeaders(TEST_RESPONSE, addVaryHeaders);
    assert.deepEqual(modified.headers, {
      'Content-Type': 'text/plain',
      'Vary': 'Cookie'
    });
    assert.equal(modified.status, 200);
  });

  it('#mapResponseStatus can modify status of response', function () {
    const modified = W.mapResponseStatus(W.redirect('/login', 301), () => 302);
    assert.equal(modified.status, 302);
  });

  it('#modifyResponse apply function Response -> Response as middleware', async function () {
    const middleware = W.modifyResponse(response => W.mapResponseHeaders(response, addVaryHeaders));
    const simpleApp: W.Application = (ctx, send) =>
      send(W.responseUtf8(200, { 'Content-Type': 'text/plain' }, 'text body'));

    const response = await T.toPromise(middleware(simpleApp)({} as any, T.pure));
    assert.equal(response.status, 200);
    assert.deepEqual(response.headers, {
      'Content-Type': 'text/plain',
      'Vary': 'Cookie'
    });
  });

  it('#ifRequest only apply middleware if satisfy predicate', async function () {
    const middleware = W.modifyResponse(response => W.mapResponseHeaders(response, addVaryHeaders));
    function whenPathLogin(ctx: W.HttpContext): boolean {
      return ctx.request.url === '/login';
    }
    const simpleApp: W.Application = (ctx, send) =>
      send(W.responseUtf8(200, { 'Content-Type': 'text/plain' }, 'text body'));
    const app = W.ifRequest(whenPathLogin, middleware)(simpleApp);

    // predicate hold
    const response1 = await T.toPromise(app({
      request: {
        url: '/login',
        headers: {}
      },
      state: {}
    } as any, T.pure));
    assert.deepEqual(response1.headers, {
      'Content-Type': 'text/plain',
      'Vary': 'Cookie'
    });

    // predicate not hold
    const response2 = await T.toPromise(app({
      request: {
        url: '/dashboard',
        headers: {}
      },
      state: {}
    } as any, T.pure));
    assert.deepEqual(response2.headers, { 'Content-Type': 'text/plain' });
  });
});

function addVaryHeaders(headers: H.ResponseHeaders): H.ResponseHeaders {
  return Object.assign({}, headers, {
    'Vary': 'Cookie'
  });
}
