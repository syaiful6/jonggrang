import * as E from '@jonggrang/prelude';

export type SameSite = 'LAX' | 'STRICT';

export interface Cookie {
  name: string;
  value: string;
  expires?: number; // number in seconds
  path?: string;
  domain?: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: SameSite;
}

export function createCookie(name: string, value: string,
  expires: number | undefined, path: string | undefined, domain: string | undefined,
  secure: boolean, httpOnly: boolean, sameSite: SameSite | undefined
): Cookie {
  return { name, value, expires, path, domain, secure, httpOnly, sameSite };
}

export function createCookieKV(name: string, value: string): Cookie {
  return createCookie(name, value, undefined, '/', undefined, false, true, undefined);
}

/**
 * render cookie to string, if it success it will return `Right`, `Left` otherwise.
 * @param cookie Cookie to serialize to string
 */
export function renderCookie(cookie: Cookie): E.Either<string, string> {
  if (checkInvalidHeaderChar(cookie.name)) {
    return E.left('Cookie name is invalid');
  }
  let value = encodeURIComponent(cookie.value);
  if (value && checkInvalidHeaderChar(value)) {
    return E.left('Cookie value is invalid');
  }
  let str = `${cookie.name}=${value}`;
  if (cookie.domain != null) {
    if (checkInvalidHeaderChar(cookie.domain)) {
      return E.left('Cookie domain is invalid');
    }
    str += `; Domain=${cookie.domain}`;
  }
  if (cookie.path != null) {
    if (checkInvalidHeaderChar(cookie.path)) {
      return E.left('Cookie path is invalid');
    }
    str += `; Path=${cookie.path}`;
  }
  if (cookie.expires != null) {
    const maxAge = Math.floor(cookie.expires - 0);
    if (isNaN(maxAge)) {
      return E.left('Cookie expires should be a Number');
    }
    str += `; Max-Age=${maxAge}`;
    const expires = new Date(Date.now() + (maxAge * 1000));
    str += `; Expires=${expires.toUTCString()}`;
  }
  if (cookie.httpOnly) {
    str += '; HttpOnly';
  }

  if (cookie.secure) {
    str += '; Secure';
  }
  if (cookie.sameSite != null) {
    str += `; SameSite=${cookie.sameSite}`;
  }
  return E.right(str);
}

const COOKIESPLITRE = /; */;

/**
 * Parse cookie string into an array of Cookie.
 * @param str
 */
export function parseCookies(str: string): Cookie[] {
  const pairs = str.split(COOKIESPLITRE);
  let cookies: Cookie[] = [];
  let pair: string, idx: number, key: string, val: string;
  for (let i = 0, len = pairs.length; i < len; i++) {
    pair = pairs[i];
    idx = pair.indexOf('=');
    if (idx < 0) continue; // or fails instead?
    key = pair.substr(0, idx).trim();
    val = pair.substr(idx + 1, pair.length).trim();
    // 34 is " (quoted)
    if (val.charCodeAt(0) === 34) {
      val = val.slice(1, -1);
    }
    cookies.push(createCookieKV(key, decodeURIComponent(val)));
  }
  return cookies;
}

export const enum CookieLifeType {
  SESSION,
  MAXAGE
}

export type CookieLife
  = { tag: CookieLifeType.SESSION }
  | { tag: CookieLifeType.MAXAGE, maxAge: number };

export const enum CookieErrorType {
  NOCOOKIEFOUND,
  DECRYPTERROR
}

const VALIDHDRCHARS = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, // 0 - 15
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 16 - 31
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 32 - 47
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 48 - 63
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 64 - 79
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 80 - 95
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 96 - 111
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, // 112 - 127
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 128 ...
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1  // ... 255
];

function checkInvalidHeaderChar(val: string): boolean {
  val += '';
  if (val.length < 1)
    return false;
  if (!VALIDHDRCHARS[val.charCodeAt(0)])
    return true;
  if (val.length < 2)
    return false;
  if (!VALIDHDRCHARS[val.charCodeAt(1)])
    return true;
  if (val.length < 3)
    return false;
  if (!VALIDHDRCHARS[val.charCodeAt(2)])
    return true;
  if (val.length < 4)
    return false;
  if (!VALIDHDRCHARS[val.charCodeAt(3)])
    return true;
  for (let i = 4; i < val.length; ++i) {
    if (!VALIDHDRCHARS[val.charCodeAt(i)])
      return true;
  }
  return false;
}
