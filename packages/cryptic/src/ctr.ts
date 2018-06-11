import { createCipheriv, createDecipheriv, createHmac, timingSafeEqual } from 'crypto';
import { Either, left, right, isLeft } from '@jonggrang/prelude';
import { Task } from '@jonggrang/task';
import B from 'base64url';
import { Options } from './types';
import { randomString } from './random';

type Payload = {
  mac: string,
  value: string,
  iv: string
};

export function encryptCTR(text: string, opts: Options): Task<string> {
  return randomString(16).map(iv => encryptCTRWithIV(text, iv, opts));
}

export function encryptCTRWithIV(text: string, iv: string, opts: Options): string {
  const cipher = createCipheriv('aes-256-ctr', opts.key, iv);
  const encrypted = cipher.update(text, 'utf8');
  const value = B.encode(Buffer.concat([encrypted, cipher.final()]));
  const mac = signMac(value, iv, opts.macKey);
  return iv + value + '.' + mac;
}

export function decryptCTR(encrypted: string, opts: Options): Either<string, string> {
  const payload = getPayload(opts.macKey, encrypted);
  if (isLeft(payload)) return payload;
  const { iv, value } = payload.value;
  const decipher = createDecipheriv('aes-256-ctr', opts.key, iv);
  let decrypted = decipher.update(B.toBuffer(value));
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return right(decrypted.toString());
}

function getPayload(key: string, val: string): Either<string, Payload> {
  let ix = val.indexOf('.');
  if (ix === -1) {
    return left('invalid payload');
  }
  const parts = val.split('.', 2);
  if (parts.length !== 2) return left('invalid payload iv');
  let ivval = parts[0];
  let mac = parts[1];
  let iv = ivval.slice(0, 16);
  let plain = ivval.slice(16, ivval.length);
  if (iv.length !== 16) {
    return left('invalid payload iv');
  }
  return verifyMac({ mac, iv, value: plain }, key);
}

function signMac(input: string, iv: string, key: string): string {
  return B.fromBase64(createHmac('sha256', key)
    .update(iv + input)
    .digest('base64'));
}

function verifyMac(payload: Payload, key: string) {
  const mac = signMac(payload.value, payload.iv, key);
  const macBuffer = Buffer.from(mac);
  const valBuffer = Buffer.alloc(macBuffer.length);
  valBuffer.write(payload.mac);
  return timingSafeEqual(macBuffer, valBuffer) ? right(payload) : left('invalid mac');
}
