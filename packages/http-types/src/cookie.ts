import * as E from '@jonggrang/prelude';


export type SameSite = 'LAX' | 'STRICT';

/**
 * The cookie data type to hold HTTP cookie information
 */
export interface Cookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: SameSite;
}

/**
 * Create `Cookie` by given all of it's fields
 */
export function createCookie(name: string, value: string, path: string | undefined,
                             domain: string | undefined, secure: boolean, httpOnly: boolean,
                             sameSite: SameSite | undefined): Cookie {
  return { name, value, path, domain, secure, httpOnly, sameSite };
}

/**
 * create `Cookie` with key value pair. Path will be set to `/`, HttpOnly is
 * set to true, and Secure set to false.
 * @param name string The cookie name
 * @param value string The cookie value
 */
export function createCookieKV(name: string, value: string): Cookie {
  return createCookie(name, value, '/', undefined, false, true, undefined);
}

/**
 * render cookie to string, if it success it will return `Right`, `Left` otherwise.
 * @param cookie Cookie to serialize to string
 */
export function renderCookie(mlife: E.Maybe<[number, Date]>, cookie: Cookie): E.Either<string, string> {
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
  if (E.isJust(mlife)) {
    const { value: life } = mlife;
    str += `; Max-Age=${life[0]}`;
    str += `; Expires=${life[1].toUTCString()}`;
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
    cookies.push(createCookieKV(key, tryDecodeUriComponent(val)));
  }
  return cookies;
}

export const enum CookieLifeType {
  SESSION,
  MAXAGE,
  EXPIRES,
  EXPIRED
}

export type CookieLife
  = { tag: CookieLifeType.SESSION } // session cookie - expires when browser is closed
  | { tag: CookieLifeType.MAXAGE; maxAge: number } // life time of cookie in seconds
  | { tag: CookieLifeType.EXPIRES; expires: Date } // cookie expiration date
  | { tag: CookieLifeType.EXPIRED }; // cookie already expired

export const cookieLifeSession = createCookieLife(CookieLifeType.SESSION);

export const cookieLifeExpired = createCookieLife(CookieLifeType.EXPIRED);

export function cookieLifeMaxAge(maxAge: number): CookieLife {
  return createCookieLife(CookieLifeType.MAXAGE, maxAge);
}

export function cookieLifeExpires(expires: Date): CookieLife {
  return createCookieLife(CookieLifeType.EXPIRES, expires);
}

export function createCookieLife(tag: CookieLifeType.SESSION): CookieLife;
export function createCookieLife(tag: CookieLifeType.EXPIRED): CookieLife;
export function createCookieLife(tag: CookieLifeType.MAXAGE, maxAge: number): CookieLife;
export function createCookieLife(tag: CookieLifeType.EXPIRES, expires: Date): CookieLife;
export function createCookieLife(tag: any, a?: any): any {
  let maxAge: any = tag === CookieLifeType.MAXAGE ? a : void 0;
  let expires: any = tag === CookieLifeType.EXPIRES ? a : void 0;
  return { tag, maxAge, expires };
}

export function calculateCookieLife(now: number, clife: CookieLife): E.Maybe<[number, Date]> {
  switch (clife.tag) {
    case CookieLifeType.SESSION:
      return E.nothing;

    case CookieLifeType.MAXAGE:
      return E.just([clife.maxAge, new Date(now + (clife.maxAge * 1000))] as [number, Date]);

    case CookieLifeType.EXPIRES:
      return E.just([ (clife.expires.getTime() - now) / 1000, clife.expires ] as [number, Date]);

    case CookieLifeType.EXPIRED:
      return E.just([ 0, new Date(0) ] as [number, Date]);
  }
}

/**
 * Lookup cookie by name, return `Just<Cookie>` if success
 */
export function lookupCookie(name: string, cookies: Cookie[]): E.Maybe<Cookie> {
  for (let i = 0, len = cookies.length; i < len; i++) {
    if (cookies[i].name === name) {
      return E.just(cookies[i]);
    }
  }
  return E.nothing;
}

export function lookupCookieValue(name: string, cookies: Cookie[]): E.Maybe<string> {
  return E.mapMaybe(lookupCookie(name, cookies), getValue);
}

// utility function for lookupCookieValue
function getValue<T extends { value: string }>(cookie: T): string {
  return cookie.value;
}

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

function tryDecodeUriComponent(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
