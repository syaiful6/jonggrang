import 'mocha';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import {
  createHttpContext, HttpContext, Response, responseBuffer, Application
} from '@jonggrang/wai';
import { HttpMethod, fromDate, formatHttpDate } from '@jonggrang/http-types';

import { defaultEtag } from '../src/storage/fs';
import { staticApp, defaultWebAppSettings, defaultFileServerSettings } from '../src';
import { IncomingMessageMock } from './utils';

function absoluteRedirect(_: string[], path: string) {
  return `http://www.example.com${path.charAt(0) === '/' ? path : ('/' + path)}`;
}

function request(app: Application, req: IncomingMessageMock): T.Task<Response> {
  return app(createHttpContext(req as any), T.pure);
}

describe('StaticApp test', () => {
  const defaultSettings = defaultWebAppSettings(path.join(__dirname, 'fixture'));
  const staticTest = staticApp(defaultSettings);
  const absoluteApp = staticApp(Object.assign({}, defaultSettings, {
    mkRedirect: absoluteRedirect
  }));

  const fileServerSettings = defaultFileServerSettings(path.join(__dirname, 'fixture'));
  const fileServer = staticApp(Object.assign({}, fileServerSettings, {
    addTrailingSlash: true
  }));

  const fileDate = T.node(null, path.join(__dirname, 'fixture', 'attic', 'a'), fs.stat).map(stat => {
    return formatHttpDate(fromDate(stat.mtime));
  });

  it('403 for unsafe paths', () => {
    function sendReq(path: string) {
      const req = new IncomingMessageMock({ url: path });
      return request(staticTest, req).map(resp => {
        assert.equal(resp.status, 403);
      });
    }
    return T.toPromise(T.forInPar_(['/..', '/.'], sendReq));
  });

  it('404 for non-existant files', () => {
    const req = new IncomingMessageMock({ url: '/nonexistentFile.png' });
    return T.toPromise(request(staticTest, req).map(resp => {
      assert.equal(resp.status, 404);
    }));
  });

  it('calling 404 notFoundHandler correctly', () => {
    function notFoundHandler<A>(ctx: HttpContext, respond: (_: Response) => T.Task<A>): T.Task<A> {
      return respond(responseBuffer(404, {
        'Content-Type': 'text/plain',
        'X-Powered-By': 'wai-static'
      }, Buffer.from('This is not a page you are looking for', 'utf8')));
    }
    const app = staticApp(Object.assign({}, defaultSettings, {
      notFoundHandler: P.just(notFoundHandler)
    }));
    // trigget 404
    const req = new IncomingMessageMock({ url: '/nonexistentFile.png' });
    return T.toPromise(request(app, req).map(resp => {
      assert.equal(resp.status, 404);
      assert.equal(resp.headers['X-Powered-By'], 'wai-static');
    }));
  });

  it('405 for methods other than HEAD and GET', () => {
    function sendWith(method: Exclude<HttpMethod, 'GET' | 'HEAD'>) {
      const req = new IncomingMessageMock({
        url: '/attic/a',
        method: method
      });
      return request(staticTest, req).map(resp => {
        assert.equal(resp.status, 405);
      });
    }
    return T.toPromise(T.forInPar_(
      ['POST', 'PUT', 'DELETE', 'TRACE', 'CONNECT', 'OPTIONS', 'PATCH'],
      sendWith
    ));
  });

  it('301 redirect when multiple slashes', () => {
    const req = new IncomingMessageMock({ url: '/a//b/c' });
    return T.toPromise(request(staticTest, req).map(resp => {
      assert.equal(resp.status, 301);
      assert.equal(resp.headers['Location'], '../../a/b/c');
    }));
  });

  it('301 redirect when multiple slashes (absolute)', () => {
    const req = new IncomingMessageMock({ url: '/a//b/c' });
    return T.toPromise(request(absoluteApp, req).map(resp => {
      assert.equal(resp.status, 301);
      assert.equal(resp.headers['Location'], 'http://www.example.com/a/b/c');
    }));
  });

  describe('webApp when requesting a static asset', () => {
    it('200 and etag when no etag query parameters', async () => {
      const stat = await T.toPromise(T.node(null, path.join(__dirname, 'fixture', 'attic', 'a'), fs.stat));
      const extag = await T.toPromise(defaultEtag(stat, true));
      const req = new IncomingMessageMock({ url: '/attic/a' });
      await T.toPromise(request(staticTest, req).map(resp => {
        assert.equal(resp.status, 200);
        assert.equal(resp.headers['ETag'], (extag as any).value);
      }));
    });

    it('200 when invalid in-none-match sent', async () => {
      const stat = await T.toPromise(T.node(null, path.join(__dirname, 'fixture', 'attic', 'a'), fs.stat));
      const extag = await T.toPromise(defaultEtag(stat, true));
      function sendNonMatch(etag: string) {
        const req = new IncomingMessageMock({
          url: '/attic/a',
          headers: {
            'If-None-Match': etag
          }
        });
        return request(staticTest, req).map(resp => {
          assert.equal(resp.status, 200);
          assert.equal(resp.headers['ETag'], (extag as any).value);
        });
      }
      await T.toPromise(T.forInPar_(['', 'cached'], sendNonMatch));
    });

    it('304 when valid if-none-match sent (weak)', async () => {
      const stat = await T.toPromise(T.node(null, path.join(__dirname, 'fixture', 'attic', 'a'), fs.stat));
      const etag = await T.toPromise(defaultEtag(stat, true));
      const req = new IncomingMessageMock({
        url: '/attic/a',
        headers: {
          'If-None-Match': (etag as any).value
        }
      });
      await T.toPromise(request(staticTest, req).map(resp => {
        assert.equal(resp.status, 304);
      }));
    });

    it('304 when valid if-none-match sent (strong)', async () => {
      const app = staticApp(defaultWebAppSettings(path.join(__dirname, 'fixture'), false));
      const req1 = new IncomingMessageMock({
        url: '/attic/a'
      });
      const resp = await T.toPromise(request(app, req1));
      const req2 = new IncomingMessageMock({
        url: '/attic/a',
        headers: {
          'If-None-Match': (resp.headers as any)['ETag']
        }
      });
      const resp2 = await T.toPromise(request(app, req2));
      assert.equal(resp2.status, 304);
    });
  });

  describe('fileServerApp', () => {
    it('directory listing for index', async () => {
      const req = new IncomingMessageMock({
        url: '/attic/'
      });
      const resp = await T.toPromise(request(fileServer, req));
      assert.equal(resp.status, 200);
    });

    it('200 when invalid if-modified-since header', () => {
      function sendIfModifiedSince(date: string) {
        const req = new IncomingMessageMock({
          url: '/attic/a',
          headers: {
            'If-Modified-Since': date
          }
        });
        return T.bothPar(fileDate, request(fileServer, req)).map(([mdate, resp]) => {
          assert.equal(resp.status, 200);
          assert.equal(resp.headers['Last-Modified'], mdate);
        });
      }
      return T.toPromise(T.forInPar_(['', '123'], sendIfModifiedSince));
    });

    it('304 when if-modified-since matches', async () => {
      const req = new IncomingMessageMock({
        url: '/attic/a'
      });
      const resp = await T.toPromise(request(fileServer, req));
      const req2 = new IncomingMessageMock({
        url: '/attic/a',
        headers: {
          'If-Modified-Since': (resp.headers as any)['Last-Modified']
        }
      });
      const resp2 = await T.toPromise(request(fileServer, req2));
      assert.equal(resp2.status, 304);
    });

    describe('301 redirect to add a trailing slash on directories if missing', () => {
      it('works at the root', () => {
        const req = new IncomingMessageMock({
          url: '/attic'
        });
        // we are redirecting if addTrailingSlash set to true
        return T.toPromise(request(fileServer, req).map(resp => {
          assert.equal(resp.status, 301);
          assert.equal(resp.headers['Location'], '/attic/');
        }));
      });

      it('works when an index.html is delivered', () => {
        const req = new IncomingMessageMock({
          url: '/folder'
        });
        return T.toPromise(request(fileServer, req).map(resp => {
          assert.equal(resp.status, 301);
          assert.equal(resp.headers['Location'], '/folder/');
        }));
      });
    });
  });
});
