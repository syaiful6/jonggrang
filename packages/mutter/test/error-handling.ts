import * as assert from 'assert';

import FormData from 'form-data';
import { isLeft } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import { submitForm, file } from './utils';
import { mutter, FileInfo } from '../src';


describe('mutter error handling', function () {
  it('should respect parts limit', async function () {
    const middleware = mutter({ limits: { parts: 1 } });
    const form = new FormData();

    form.append('foo', 'bar');
    form.append('small', file('tiny0.json'));

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_PART_COUNT');
  });

  it('should respects filesize limit', async function () {
    const middleware = mutter({ limits: { fileSize: 1000 } });
    const form = new FormData();

    form.append('small0', file('small0.txt'));
    form.append('small1', file('small1.txt'));

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_FILE_SIZE');
  });

  it('should respect files count limit', async function () {
    const middleware = mutter({ limits: { files: 1 } });
    const form = new FormData();

    form.append('tiny0', file('tiny0.json'));
    form.append('tiny1', file('tiny1.json'));

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_FILE_COUNT');
  });

  it('should respect file key limit', async function () {
    const middleware = mutter({ limits: { fieldNameSize: 4 } });
    const form = new FormData();

    form.append('small0', file('small0.txt'));

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_FIELD_KEY');
  });

  it('should respect field key limit', async function () {
    const middleware = mutter({ limits: { fieldNameSize: 4 } });
    const form = new FormData();

    form.append('ok', 'Good');
    form.append('notok', 'Bad');

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_FIELD_KEY');
  });

  it('should respect field value limit', async function () {
    const middleware = mutter({ limits: { fieldSize: 16 } });
    const form = new FormData();

    form.append('title', 'hello world');
    form.append('description', 'most application framework hello world');

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_FIELD_VALUE');
    assert.equal((result.value as any).field, 'description');
  });

  it('should respect field count limit', async function () {
    const middleware = mutter({ limits: { fields: 1 } });
    const form = new FormData();

    form.append('title', 'hello');
    form.append('desc', 'hello world');

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).code, 'LIMIT_FIELD_COUNT');
  });

  it('should report error from storage', async function () {
    const middleware = mutter({ getStorage: getTntStorage });
    const form = new FormData();

    form.append('small', file('small0.txt'));

    const result = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(result));
    assert.equal((result.value as any).message, 'tnt storage handleFile');
  });
});

function getTntStorage() {
  // always return TntStorage
  return new TntStorage();
}

class TntStorage {
  handleFile(): T.Task<FileInfo> {
    return T.raise(new Error('tnt storage handleFile'));
  }

  removeFile(): T.Task<void> {
    return T.raise(new Error('tnt storage removeFile'));
  }
}
