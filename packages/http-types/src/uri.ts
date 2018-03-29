/**
 * Represents a general universal resource identifier using its component parts.
 * For example, for the URI:
 * foo://anonymous@www.haskell.org:42/ghc?query#frag
 */
export interface URI {
  scheme: string; // foo:
  auth?: URIAuth; // //anonymous@www.haskell.org:42
  path: string; // /ghc
  query: string; // ?query
  fragment: string; // #frag
}

export interface URIAuth {
  userInfo: string; // anonymous@
  port: string; // :42
  regName: string; // www.haskell.org
}

function ensurePrefix(p: string, s: string): string {
  const ix = p.length > s.length ? -1 : s.indexOf(p);
  return ix === 0 ? s : p + s;
}

export function uriIsAbsolute(uri: URI): boolean {
  return uri.scheme !== '';
}

export function uriIsRelative(uri: URI): boolean {
  return !uriIsAbsolute(uri);
}
