import * as assert from 'assert';

import { FileUpload, Files } from '../src/types';
import { insertPlaceholder, removePlaceholder } from '../src/file-appender';


describe('mutter: file appender', function () {
  let files: Files;

  beforeEach(() => {
    files = Object.create(null);
  });

  it('insertPlaceholder create a field', function () {
    const finfo: FileUpload = {
      fieldname: 'foo',
      originalname: 'foobar.jpg',
      encoding: '7bit',
      mimeType: 'image/jpeg'
    };
    const placeholder = insertPlaceholder(files, finfo);
    assert.equal(placeholder.fieldname, 'foo');
    assert.ok(Array.isArray(files['foo']));
  });

  it('insertPlaceholder with same fieldname', function () {
    const finfo1: FileUpload = {
      fieldname: 'foo',
      originalname: 'foobar.jpg',
      encoding: '7bit',
      mimeType: 'image/jped'
    };
    const finfo2: FileUpload = {
      fieldname: 'foo',
      originalname: 'barsoda.jpg',
      encoding: '7bit',
      mimeType: 'image/jpeg'
    };
    insertPlaceholder(files, finfo1);
    insertPlaceholder(files, finfo2);
    assert.ok(Array.isArray(files['foo']));
    assert.equal(files['foo'].length, 2);
  });

  it('removePlaceholder can correctly remove a placeholder', function () {
    const finfo: FileUpload = {
      fieldname: 'foo',
      originalname: 'foobar.jpg',
      encoding: '7bit',
      mimeType: 'image/jpeg'
    };
    const placeholder = insertPlaceholder(files, finfo);
    removePlaceholder(files, placeholder);
    assert.ok(!files['foo']);
  });

  it('removePlaceholder can removePlaceholder in an array', function () {
    const finfo1: FileUpload = {
      fieldname: 'foo',
      originalname: 'foobar.jpg',
      encoding: '7bit',
      mimeType: 'image/jped'
    };
    const finfo2: FileUpload = {
      fieldname: 'foo',
      originalname: 'barsoda.jpg',
      encoding: '7bit',
      mimeType: 'image/jpeg'
    };
    insertPlaceholder(files, finfo1);
    const placeholder = insertPlaceholder(files, finfo2);
    removePlaceholder(files, placeholder);
    assert.ok(Array.isArray(files['foo']));
    assert.equal(files['foo'].length, 1);
  });
});
