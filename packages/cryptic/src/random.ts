import { randomBytes as nodeRandomBytes } from 'crypto';
import { Task, NodeCallback, node as fromNodeBack } from '@jonggrang/task';


/**
 * Generate random bytes
 */
export function randomBytes(len: number): Task<Buffer> {
  return fromNodeBack(null, len, nodeRandomBytes);
}

/**
 * Generate random string
 * @param len
 */
export function randomString(len: number): Task<string> {
  return fromNodeBack(null, len, '', randomStringCb);
}

function randomStringCb(length: number, v: string, cb: NodeCallback<string, void>) {
  let size = length - v.length;
  nodeRandomBytes(Math.max(1, (size / 4 * 3) | 0), (err, buf) => {
    if (err) cb(err);
    v += buf.toString('base64').replace(/[=\+\/]/g, '').substr(0, size);
    if (v.length < length) {
      return randomStringCb(length, v, cb);
    }
    return cb(null, v);
  });
}
