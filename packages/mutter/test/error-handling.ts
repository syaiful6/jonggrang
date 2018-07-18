import * as assert from 'assert';

import FormData from 'form-data';
import { isLeft } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import { submitForm, file } from './utils';
import { mutter } from '../src';


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
});
