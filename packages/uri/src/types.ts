import { Maybe } from '@jonggrang/prelude';

/**
 * Represents a general universal resource identifier using its component parts.
 * For example, for the URI:
 * foo://anonymous@www.haskell.org:42/ghc?query#frag
 */
export interface URI {
  scheme: string; // foo:
  auth: Maybe<URIAuth>; // //anonymous@www.haskell.org:42
  path: string; // /ghc
  query: string; // ?query
  fragment: string; // #frag
}

// Type for authority value within a URI
export interface URIAuth {
  userInfo: string; // anonymous@
  port: string; // :42
  regName: string; // www.haskell.org
}

class Uri {
  constructor(
    readonly scheme: string,
    readonly auth: Maybe<URIAuth>,
    readonly path: string,
    readonly query: string,
    readonly fragment: string
  ) {
  }
}

class UriAuth {
  constructor(
    readonly userInfo: string,
    readonly port: string,
    readonly regName: string
  ) {
  }
}

export function mkURI(scheme: string, auth: Maybe<URIAuth>, path: string, query: string, fragment: string): URI {
  return new Uri(scheme, auth, path, query, fragment);
}

export function mkURIAuth(userInfo: string, regName: string, port: string): URIAuth {
  return new UriAuth(userInfo, port, regName);
}
