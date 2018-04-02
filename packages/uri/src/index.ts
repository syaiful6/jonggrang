import * as P from '@jonggrang/prelude';
import * as PS from '@jonggrang/parsing';

import { URI, URIAuth, mkURI } from './types';
import {
  absoluteURI, uri, uriReference, relativeRef, isSchemeChar, isHexDigitAt, isUnreserved, isReserved
} from './internal/parsing';


export { URI, URIAuth, mkURI, mkURIAuth } from './types';


/**
 * Turn a string containing a URI into a 'URI'. Returns 'Nothing' if the string
 * is not a valid URI. (an absolute URI with optional fragment identifier).
 * @param str The URI string to parse
 * @return Just<URI> if it value URI, otherwise return Nothing
 */
export function parseURI(str: string): P.Maybe<URI> {
  return parseURIAny(uri, str);
}

/**
 * Parse a URI reference to a 'URI' value. Returns 'Nothing' if the string is
 * not a valid URI reference.
 * @param str The URI reference string to parse
 */
export function parseURIReference(str: string): P.Maybe<URI> {
  return parseURIAny(uriReference, str);
}

/**
 * Parse a relative URI to a 'URI' value.
 * @param str
 * @returns 'Nothing' if the string is not a valid relative URI.
 */
export function parseRelativeReference(str: string): P.Maybe<URI> {
  return parseURIAny(relativeRef, str);
}

/**
 * Parse an absolute URI to a 'URI' value.
 * @param str The absolute URI string to parse
 * @return 'Nothing' if the string is not a valid absolute URI.
 */
export function parseAbsoluteURI(str: string): P.Maybe<URI> {
  return parseURIAny(absoluteURI, str);
}

function parseURIAny(p: PS.Parser<URI>, str: string): P.Maybe<URI> {
  const ret = PS.runParser(parseEof(p), str);
  if (P.isRight(ret)) return P.just(ret.value);
  return P.nothing;
}

function parseEof<A>(p: PS.Parser<A>): PS.Parser<A> {
  return p.chain(x => PS.eof.map(() => x));
}

/**
 * Test if string contains a valid URI
 * @param str The string to test
 * @return true if the string is valid URI, false otherwise
 */
export function isURI(str: string): boolean {
  return isValidParse(uri, str);
}

/**
 * Test if string contains a valid URI reference
 * @param str The string to test
 * @return true if the string is valid URI reference, false otherwise
 */
export function isURIReference(str: string): boolean {
  return isValidParse(uriReference, str);
}

/**
 * Test if the string contains a valid relative URI
 * @param str The string to test
 * @return true if the string is valid relative URI, false otherwise
 */
export function isRelativeReference(str: string): boolean {
  return isValidParse(relativeRef, str);
}

/**
 * Test if the string contains a valid absolute URI
 * @param str The string to test
 * @return true if the string is valid absolute URI, false otherwise
 */
export function isAbsoluteURI(str: string): boolean {
  return isValidParse(absoluteURI, str);
}

function isValidParse<A>(p: PS.Parser<A>, str: string): boolean {
  const ret = PS.runParser(parseEof(p), str);
  if (P.isRight(ret)) return true;
  return false;
}

// Predicates

export function uriIsAbsolute(uri: URI): boolean {
  return uri.scheme !== '';
}

export function uriIsRelative(uri: URI): boolean {
  return !uriIsAbsolute(uri);
}

// Reconstruct a URI string

/**
 * Turn a 'URI' into a string.
 * @param fn function to map the userinfo part of the URI.
 * @param uri The URI to stringify
 * @return string
 */
export function uriToString(fn: (s: string) => string, uri: URI): string {
  return uri.scheme + uriAuthToString(fn, uri.auth) + uri.path + uri.query + uri.fragment;
}

/**
 * Turn a `URIAuth` into a string
 */
export function uriAuthToString(fn: (s: string) => string, auth: P.Maybe<URIAuth>): string {
  if (P.isNothing(auth)) return '';

  const uriAuth = auth.value;
  return `//${uriAuth.userInfo.length === 0 ? '' : fn(uriAuth.userInfo)}${uriAuth.regName}${uriAuth.port}`;
}

/**
 * Show an URI. Note that for security reasons, the default  behaviour is to suppress
 * any userinfo field (see RFC3986, section 7.5). This can be overridden by using
 * uriToString directly with first argument `identity` function.
 */
export function showURI(uri: URI): string {
  return uriToString(defaultUserInfoMap, uri);
}

function defaultUserInfoMap(s: string): string {
  let ix = s.indexOf(':');
  if (ix === -1) return s;
  let user = s.slice(0, ix);
  let pass = s.slice(ix, s.length);

  return pass.length === 0 || pass === '@' || pass === ':@' ? `${user}${pass}` : `${user}:...@`;
}

// Character classes

/**
 * Returns 'True' if the character is allowed in a URI.
 * @param char The char to test, this should be a char
 * @return boolean
 */
export function isAllowedInURI(char: string): boolean {
  return isReserved(char) || isUnreserved(char) || char == '%';
}

/**
 * Returns 'True' if the character is allowed unescaped in a URI
 * @param char The char to test, this should be a char
 * @return boolean
 */
export function isUnescapedInURI(char: string): boolean {
  return isReserved(char) || isUnreserved(char);
}

/**
 * Returns 'True' if the character is allowed unescaped in a URI component.
 * @param char The char to test, this should be a char
 * @return boolean
 */
export function isUnescapedInURIComponent(char: string): boolean {
  return !(isReserved(char) || !isUnescapedInURI(char));
}

// Resolving a relative URI relative to a base URI

/**
 * Returns a new 'URI' which represents the relative location of the first 'URI'
 * with respect to the second 'URI'. Thus, the values supplied are expected to be
 * absolute URIs, and the result returned may be a relative URI.
 * Example:
 * ```javascript
 * > relativeFrom('http://example.com/Root/sub1/name2#frag', 'http://example.com/Root/sub2/name2#frag');
 * '../sub1/name2#frag'
 * ```
 */
export function relativeFrom(uabs: URI, base: URI): URI {
  if (uabs.scheme !== base.scheme)
    return uabs;

  if (!uriAuthEquals(uabs.auth, base.auth))
    return mkURI('', uabs.auth, uabs.path, uabs.query, uabs.fragment);

  if (uabs.path !== base.path) {
    return mkURI(
      '',
      P.nothing,
      relPathFrom(removeBodyDotSegments(uabs.path), removeBodyDotSegments(base.path)),
      uabs.query,
      uabs.fragment
    );
  }

  if (uabs.query !== base.query)
    return mkURI('', P.nothing, '', uabs.query, uabs.fragment);

  return mkURI('', P.nothing, '', '', uabs.fragment);
}

/**
 * Returns a new 'URI' which represents the value of the first 'URI' interpreted
 * as relative to the second 'URI'.
 * @param ref the relative URI
 * @param base the absolute URI
 * @return new URI
 */
export function nonStrictRelativeTo(ref: URI, base: URI): URI {
  const newRef = ref.scheme === base.scheme
               ? mkURI('', ref.auth, ref.path, ref.query, ref.fragment)
               : ref;
  return relativeTo(newRef, base);
}

/**
 * Returns a new 'URI' which represents the value of the first 'URI' interpreted as
 * relative to the second 'URI'. Algorithm from RFC3986 [3], section 5.2
 * @param ref the relative URI
 * @param base the absolute URI
 * @return new URI
 */
export function relativeTo(ref: URI, base: URI): URI {
  if (ref.scheme !== '') {
    return justSegments(ref);
  }

  if (P.isJust(ref.auth)) {
    return justSegments(mkURI(base.scheme, ref.auth, ref.path, ref.query, ref.fragment));
  }

  if (ref.path !== '') {
    if (ref.path.charAt(0) === '/') {
      return justSegments(mkURI(base.scheme, base.auth, ref.path, ref.query, ref.fragment));
    }

    return justSegments(mkURI(base.scheme, base.auth, mergePaths(base, ref), ref.query, ref.fragment));
  }

  if (ref.query !== '') {
    return justSegments(mkURI(base.scheme, base.auth, base.path, ref.query, ref.fragment));
  }

  return justSegments(mkURI(base.scheme, base.auth, base.path, base.query, ref.fragment));
}

// Other normalization functions

/**
 * Case normalization; cf. RFC3986 section 6.2.2.1
 * @param uriStr URI string to normalize
 * @return Normalized URI string
 */
export function normalizeCase(uriStr: string): string {
  let out = '';
  let ix = 0;
  let cs = uriStr;
  while (ix < cs.length) {
    if (cs.charCodeAt(ix) === 58) {
      return `${out}:${_ncEscape(cs.slice(ix + 1, cs.length))}`;
    } else if (isSchemeChar(cs.charAt(ix))) {
      out += cs.charAt(ix).toLowerCase();
      ix++;
    } else {
      return _ncEscape(uriStr);
    }
  }
  return _ncEscape(uriStr);
}

/**
 * Encoding normalization; cf. RFC3986 section 6.2.2.2
 */
export function normalizeEscape(s: string): string {
  let out = '';
  let ix = 0;
  while (ix < s.length) {
    if ((s.length - ix) >= 3 && s.charCodeAt(ix) === 37 && isHexDigitAt(s, ix + 1) && isHexDigitAt(s, ix + 2)) {
      let ecval = String.fromCharCode(parseInt(s.charAt(ix + 1), 16) * 16 + parseInt(s.charAt(ix + 2), 16));
      if (isUnreserved(ecval)) {
        out += ecval;
        ix += 3;
        continue;
      }
    }
    out += s.charAt(ix);
    ix++;
  }
  return out;
}

/**
 * Path segment normalization; cf. RFC3986 section 6.2.2.3
 */
export function normalizePathSegments(uriStr: string): string {
  let juri = parseURI(uriStr);
  if (P.isNothing(juri)) return uriStr;
  const uriV = juri.value;
  let normUri = mkURI(uriV.scheme, uriV.auth, removeDotSegments(uriV.path), uriV.query,
                      uriV.fragment);
  return uriToString(ident, normUri);
}

function _ncEscape(s: string): string {
  let out = '';
  while (s.length > 0) {
    if (s.length >= 3 && s.charCodeAt(0) === 37) {
      out += '%' + s.slice(1, 3).toUpperCase();
      s = s.slice(3, s.length);
      continue;
    }
    out += s.charAt(0);
    s = s.slice(1, s.length);
  }
  return out;
}

/**
 * Removes dot segments in given path component, as described in RFC 3986, section 5.2.4.
 * @param path A non-empty path component
 * @return Path component with removed dot segments.
 */
export function removeDotSegments(path: string): string {
  if (path == '..' || path == '.') {

    return '';
  } else if (path.indexOf('./') === -1 && path.indexOf('/.') === -1) {

    return path;
  } else {
    let leadingSlash = path.indexOf('/') === 0;
    let segments = path.split('/');
    let out = [];

    for (let pos = 0; pos < segments.length;) {
      let segment = segments[pos++];

      if (segment == '.') {
        if (leadingSlash && pos == segments.length) {
          out.push('');
        }
      } else if (segment == '..') {
        if (out.length > 1 || out.length == 1 && out[0] != '') {
          out.pop();
        }
        if (leadingSlash && pos == segments.length) {
          out.push('');
        }
      } else {
        out.push(segment);
        leadingSlash = true;
      }
    }

    return out.join('/');
  }
}

function removeBodyDotSegments(p: string): string {
  const [p1, p2] = splitLast(p);
  return removeDotSegments(p1) + p2;
}

function mergePaths(b: URI, r: URI): string {
  if (P.isJust(b.auth) && b.path.length === 0) {
    return '/' + r.path;
  }
  return splitLast(b.path)[0] + r.path;
}

function relPathFrom(pabs: string, base: string): string {
  if (pabs.length === 0) return '/';
  if (base.length === 0) return pabs;
  const [sa1, ra1] = nextSegment(pabs);
  const [sb1, rb1] = nextSegment(base);

  if (sa1 === sb1) {
    if (sa1 === '/') {
      const [sa2, ra2] = nextSegment(ra1);
      const [sb2, rb2] = nextSegment(rb1);
      if (sa2 === sb2)
        return relPathFrom1(ra2, rb2);
      else
        return pabs;
    } else {
      return relPathFrom1(ra1, rb1);
    }
  } else {
    return pabs;
  }
}

function relPathFrom1(pabs: string, base: string): string {
  const [sa, na] = splitLast(pabs);
  const [sb, nb] = splitLast(base);
  const rp = relSegsFrom(sa, sb);

  return rp.length === 0
    ? (na === nb ? '' : (na.length === 0 || na.indexOf(':') !== -1 ? `./${na}` : na))
    : (rp + na);
}

function relSegsFrom(sabs: string, base: string): string {
  while (true) {
    if (sabs.length === 0 && base.length === 0)
      return '';
    let [sa1, ra1] = nextSegment(sabs);
    let [sb1, ra2] = nextSegment(base);
    if (sa1 === sb1) {
      sabs = ra1;
      base = ra2;
      continue;
    } else {
      return difSegsFrom(sabs, base);
    }
  }
}

function difSegsFrom(sabs: string, base: string): string {
  while (true) {
    if (base === '') return sabs;

    sabs = `../${sabs}`;
    base = nextSegment(base)[1];
  }
}

function justSegments(b: URI): URI {
  return mkURI(b.scheme, b.auth, removeDotSegments(b.path), b.query, b.fragment);
}

function nextSegment(s: string): [string, string] {
  let ix = s.indexOf('/');
  let first = s.slice(0, ix);
  let second = s.slice(ix, s.length);

  if (second.charAt(0) === '/') {
    return [first + '/', second.slice(1)];
  }
  return [first, second];
}

function splitLast(p: string): [string, string] {
  let ix = p.lastIndexOf('/');
  let first = p.slice(0, ix + 1);
  let last = p.slice(ix + 1, p.length);
  return [first, last];
}

function uriAuthEquals(s: P.Maybe<URIAuth>, d: P.Maybe<URIAuth>): boolean {
  if (P.isNothing(s) && P.isNothing(d)) return true;
  if (P.isJust(s) && P.isJust(d)) {
    const sa = s.value;
    const da = d.value;
    const uriAuth: (keyof URIAuth)[] = ['userInfo', 'port', 'regName'];
    return uriAuth.every(x => sa[x] === da[x]);
  }
  return false;
}

function ident<A>(a: A): A {
  return a;
}
