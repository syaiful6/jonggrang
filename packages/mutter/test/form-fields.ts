import * as assert from 'assert';
import { PassThrough } from 'stream';
import { createGzip, createDeflate } from 'zlib';

import FormData from 'form-data';
import * as T from '@jonggrang/task';
import * as W from '@jonggrang/wai';

import { mutter } from '../src';
import { submitForm, simpleApp } from './utils';

describe('mutter: form fields', function () {
  let middleware: W.Middleware;

  beforeEach(() => {
    middleware = mutter();
  });

  it('should process multiple fields', async function () {
    const form = new FormData();

    form.append('name', 'foo');
    form.append('key', 'value');
    form.append('abc', 'xyz');

    const { state }: W.HttpContext = await T.toPromise(submitForm(middleware, form));
    assert.deepEqual(state.body, {
      name: 'foo',
      key: 'value',
      abc: 'xyz'
    });
  });

  it('should process empty fields', async function () {
    const form = new FormData();

    form.append('name', 'foo');
    form.append('key', '');
    form.append('abc', '');
    form.append('checkboxfull', 'cb1');
    form.append('checkboxfull', 'cb2');
    form.append('checkboxhalfempty', 'cb1');
    form.append('checkboxhalfempty', '');
    form.append('checkboxempty', '');
    form.append('checkboxempty', '');

    const { state }: W.HttpContext = await T.toPromise(submitForm(middleware, form));
    assert.deepEqual(state.body, {
      name: 'foo',
      key: '',
      abc: '',
      checkboxfull: ['cb1', 'cb2'],
      checkboxhalfempty: ['cb1', ''],
      checkboxempty: ['', '']
    });
  });

  it('should process x-www-form-urlencoded', async function () {
    const req = new PassThrough();
    req.end('name=foo&key=value&abc=xyz');
    (req as any).headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': 26
    };
    (req as any).method = 'GET';
    (req as any).url = '/upload';
    const ctx = W.createHttpContext(req as any);
    await T.toPromise(middleware(simpleApp)(ctx, T.pure));
    assert.deepEqual(ctx.state.body, {
      name: 'foo',
      key: 'value',
      abc: 'xyz'
    });
  });

  it('should process x-www-form-urlencoded with deflate encoding', async function () {
    const req = new PassThrough();
    const stream = req.pipe(createDeflate());
    (stream as any).headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-encoding': 'deflate',
      'content-length': 29
    };
    (stream as any).method = 'GET';
    (stream as any).url = '/upload';
    req.end('name=thatiq&key=value&abc=xyz');
    const ctx = W.createHttpContext(stream as any);
    await T.toPromise(middleware(simpleApp)(ctx, T.pure));
    assert.deepEqual(ctx.state.body, {
      name: 'thatiq',
      key: 'value',
      abc: 'xyz'
    });
  });

  it('should process x-www-form-urlencoded with gzip encoding', async function () {
    const req = new PassThrough();
    const stream = req.pipe(createGzip());
    (stream as any).headers = {
      'content-type': 'application/x-www-form-urlencoded',
      'content-encoding': 'gzip',
      'content-length': 29
    };
    (stream as any).method = 'GET';
    (stream as any).url = '/upload';
    req.end('name=thatiq&key=value&abc=xyz');
    const ctx = W.createHttpContext(stream as any);
    await T.toPromise(middleware(simpleApp)(ctx, T.pure));
    assert.deepEqual(ctx.state.body, {
      name: 'thatiq',
      key: 'value',
      abc: 'xyz'
    });
  });
});
