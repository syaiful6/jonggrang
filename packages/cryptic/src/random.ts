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
  randomBits((length + 1) * 6, (err, buff) => {
    if (err) return cb(err);
    const v = (buff as Buffer).toString('base64').replace(/[=\+\/]/g, '');
    cb(null, v.slice(0, length));
  });
}

function randomBits(len: number, cb: NodeCallback<Buffer>) {
  return nodeRandomBytes(Math.ceil(len / 8), cb);
}
