import * as assert from 'assert';

import FormData from 'form-data';
import { isLeft } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as W from '@jonggrang/wai';

import * as Z from '../src';
import { submitForm, file } from './utils';


function withFilter(fileFilter: Z.FileFilter): W.Middleware {
  return Z.mutter({ fileFilter });
}

function skipFileName(ctx: W.HttpContext, file: Z.FileUpload): T.Task<boolean> {
  return T.pure(file.fieldname !== 'notme');
}

function skipFileError(): T.Task<boolean> {
  return T.raise(new Error('Fake error'));
}

describe('Mutter: File Filter', function () {
  it('should skip some files', async function () {
    const form = new FormData();
    const upload = withFilter(skipFileName);

    form.append('notme', file('tiny0.json'));
    form.append('butme', file('tiny1.json'));
    const { state }: W.HttpContext = await T.toPromise(submitForm(upload, form));
    assert.equal(state.files['notme'], undefined);
    assert.equal(state.files['butme'][0].fieldname, 'butme');
    assert.equal(state.files['butme'][0].originalname, 'tiny1.json');
  });

  it('should report errors from fileFilter', async function () {
    const form = new FormData();
    const upload = withFilter(skipFileError);

    form.append('notme', file('tiny0.json'));

    const ectx = await T.toPromise(T.attempt(submitForm(upload, form)));
    assert.equal(isLeft(ectx), true);
    assert.equal((ectx.value as Error).message, 'file filter notme: Fake error');
  });
});
