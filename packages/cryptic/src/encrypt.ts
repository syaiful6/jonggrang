import { createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from 'crypto';
import { Either, left, right } from '@jonggrang/prelude';
import { Task } from '@jonggrang/task';
import B from 'base64url';

import { Options } from './types';
import { randomBytes } from './random';



export const ENCRYPTION_ALGORITHMS = {
  aes128: 16, // implicit CBC mode
  aes192: 24,
  aes256: 32
};

const DEFAULT_ENCRYPTION_ALGO = 'aes256';

/* map from hmac algorithm to _minimum_ key byte length */
export const SIGNATURE_ALGORITHMS = {
  'sha256': 32,
  'sha384': 48,
  'sha512': 64
};

const DEFAULT_SIGNATURE_ALGO = 'sha256';

enum DeriveKey {
  ENCRYPT = 'cryptic:encrypt',
  MAC = 'cryptic:mac'
}

function forceBuffer(binaryOrBuffer: Buffer | string) {
  if (Buffer.isBuffer(binaryOrBuffer)) {
    return binaryOrBuffer;
  } else {
    return Buffer.from(binaryOrBuffer, 'binary');
  }
}

function deriveKey(master: Buffer | string, type: Buffer | string): Buffer {
  // eventually we want to use HKDF. For now we'll do something simpler.
  var hmac = createHmac('sha256', master);
  hmac.update(type);
  return forceBuffer(hmac.digest());
}

function setupKeys(opts: Options) {
  // derive two keys, one for signing one for encrypting, from the secret.
  if (!opts.encryptionKey) {
    opts.encryptionKey = deriveKey(opts.key, DeriveKey.ENCRYPT);
  }

  if (!opts.signatureKey) {
    opts.signatureKey = deriveKey(opts.macKey, DeriveKey.MAC);
  }

  if (!opts.signatureAlgorithm) {
    opts.signatureAlgorithm = DEFAULT_SIGNATURE_ALGO;
  }

  if (!opts.encryptionAlgorithm) {
    opts.encryptionAlgorithm = DEFAULT_ENCRYPTION_ALGO;
  }
}

/**
 * Encrypt the given text
 *
 * @param text Text to encrypt
 * @param opts Options to encrypt the text
 * @return Task
 */
export function encrypt(text: string, opts: Options): Task<string> {
  return randomBytes(16).map(iv => encryptWithIV(text, iv, opts));
}

function encryptWithIV(text: string, iv: Buffer, opts: Options): string {
  setupKeys(opts);

  const cipher = createCipheriv(
    opts.encryptionAlgorithm as string,
    opts.encryptionKey,
    iv
  );

  const plaintext = Buffer.from(text, 'utf8');
  const ciphertextStart = forceBuffer(cipher.update(plaintext));
  zeroBuffer(plaintext);

  const ciphertextEnd = forceBuffer(cipher.final());
  const ciphertext = Buffer.concat([ciphertextStart, ciphertextEnd]);
  zeroBuffer(ciphertextStart);
  zeroBuffer(ciphertextEnd);

  const mac = computeHmac(iv, ciphertext, opts);

  const result = [
    B.encode(iv),
    B.encode(ciphertext),
    B.encode(mac),
  ].join('.');

  zeroBuffer(iv);
  zeroBuffer(ciphertext);
  zeroBuffer(mac);

  return result;
}

/**
 * Decrypt an encrypted text.
 *
 * @param encrypted The encrypted text to decrypt
 * @param opts Options
 */
export function decrypt(encrypted: string, opts: Options): Either<string, string> {
  const components = encrypted.split('.');
  if (components.length !== 3) return left('Invalid payload');

  setupKeys(opts);

  const iv: Buffer = B.toBuffer(components[0]);
  const ciphertext = B.toBuffer(components[1]);
  const hmac = B.toBuffer(components[2]);

  function cleanup() {
    if (iv) zeroBuffer(iv);

    if (ciphertext) zeroBuffer(ciphertext);

    if (hmac) zeroBuffer(hmac);

    if (expectedHmac) zeroBuffer(expectedHmac);
  }

  // make sure IV is right length
  if (iv.length !== 16) {
    cleanup();
    return left('invalid iv length');
  }

  const expectedHmac = computeHmac(iv, ciphertext, opts);
  if (!timingSafeEqual(hmac, expectedHmac)) {
    cleanup();
    return left('invalid signature');
  }

  const decipher = createDecipheriv(
    opts.encryptionAlgorithm as string,
    opts.encryptionKey,
    iv
  );
  let plaintext = decipher.update(ciphertext, 'binary', 'utf8');
  plaintext += decipher.final('utf8');

  cleanup();
  return right(plaintext);
}

function computeHmac(iv: Buffer, ciphertext: Buffer, opts: Options) {
  const hmac = createHmac(opts.signatureAlgorithm as string, opts.signatureKey as Buffer);
  hmac.update(iv);
  hmac.update(ciphertext);

  return forceBuffer(hmac.digest());
}

function zeroBuffer(buf: Buffer) {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 0;
  }
  return buf;
}
