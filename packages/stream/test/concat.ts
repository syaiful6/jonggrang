import * as assert from 'assert';
import { concatStream } from '../src';


describe('concatStream', () => {
  it('buffer stream', done => {
    const concat = concatStream((error, buffer) => {
      assert.equal(error == null, true);
      assert.deepEqual(buffer, Buffer.from('this is a streaming buffers'));
      done();
    });
    concat.write(Buffer.from('this is a '));
    concat.write(Buffer.from('streaming buffers'));
    concat.end();
  });
});
