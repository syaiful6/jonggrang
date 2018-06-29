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

function randomStringCb(length: number, v: string, cb: NodeCallback<string>) {
  let size = length - v.length;
  randomBits((size + 1) * 6, (err, buff) => {
    if (err) return cb(err);
    v += (buff as Buffer).toString('base64').replace(/[=\+\/]/g, '').substr(0, size);
    if (v.length < length) {
      return randomStringCb(length, v, cb);
    }
    cb(null, v);
  });
}

function randomBits(len: number, cb: NodeCallback<Buffer>) {
  return nodeRandomBytes(Math.ceil(len / 8), cb);
}
