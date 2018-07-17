import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import FormData from 'form-data';
import * as temp from 'fs-temp';
import rimraf from 'rimraf';
import * as T from '@jonggrang/task';
import { isLeft } from '@jonggrang/prelude';

import { DiskStorage, FileUpload, Files, mutter } from '../src';
import { submitForm, file } from './utils';


describe('mutter: disk storage', function () {
  let uploadDir: string;

  function getStorage() {
    return new DiskStorage({ dir: uploadDir });
  }

  beforeEach((done) => {
    temp.mkdir((err, path) => {
      if (err) return done(err);

      uploadDir = path;
      done();
    });
  });

  afterEach((done) => {
    rimraf(uploadDir, done);
  });

  it('should process parser/form-data POST request', async function () {
    const middleware = mutter({ getStorage });
    const form = new FormData();

    form.append('name', 'thatiq');
    form.append('tiny0', file('tiny0.json'));

    const { state } = await T.toPromise(submitForm(middleware, form));
    assert.equal(state.body.name, 'thatiq');
    assert.equal(state.files['tiny0'][0].fieldname, 'tiny0');
    assert.equal(state.files['tiny0'][0].originalname, 'tiny0.json');
  });

  it('can move file upload to target dir', async function () {
    const middleware = mutter({ getStorage });
    const form = new FormData();

    form.append('name', 'thatiq');
    form.append('tiny0', file('tiny0.json'));

    const { state } = await T.toPromise(submitForm(middleware, form));
    const dest = await T.toPromise(T.node(null, temp.mkdir));
    const files: Files = state.files;
    const target = path.join(dest, 'tiny-uploaded.json');
    await T.toPromise(files['tiny0'][0].move(target));
    const [targetStat, sourceStat] = await T.toPromise(T.bothPar(
      T.node(null, target, fs.stat),
      T.node(null, path.join(__dirname, 'fixtures', 'tiny0.json'), fs.stat)
    ));
    assert.equal(targetStat.size, sourceStat.size);
    await T.toPromise(T.node(null, dest, rimraf));
  });

  it('should remove uploaded files on error', async function () {
    function onlyTiny0(ctx: any, file: FileUpload): T.Task<boolean> {
      return file.fieldname === 'tiny0' ? T.pure(true) : T.raise(new Error('only tiny0 allowed'));
    }
    const middleware = mutter({ getStorage, fileFilter: onlyTiny0 });
    const form = new FormData();

    form.append('name', 'thatiq');
    form.append('tiny0', file('tiny0.json'));
    form.append('tiny1', file('tiny1.json'));

    const mctx = await T.toPromise(T.attempt(submitForm(middleware, form)));
    assert.ok(isLeft(mctx));
    const err = mctx.value as Error;
    assert.equal(err.message, 'file filter tiny1: only tiny0 allowed');
    const files = await T.toPromise(T.node(null, uploadDir, fs.readdir));
    assert.deepEqual(files, []);
  });
});
