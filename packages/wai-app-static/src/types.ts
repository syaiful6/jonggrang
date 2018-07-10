import { Either, Maybe, just, nothing, traverseMaybe } from '@jonggrang/prelude';
import { Task } from '@jonggrang/task';
import { Application, Response } from '@jonggrang/wai';
import { ResponseHeaders, Status } from '@jonggrang/http-types';


export type Piece = string;

/**
 * Smart constructor for a `Piece`. Won\'t allow unsafe components, such as
 * pieces beginning with a period or containing a slash. This `will`, however,
 * allow null pieces.
 * @param t string
 */
export function toPiece(t: string): Maybe<Piece> {
  if (t.length === 0) return just(t);
  if (t.charAt(0) === '.') return nothing;
  for (let i = 0, len = t.length; i < len; i++) {
    if (t.charAt(i) === '/') return nothing;
  }
  return just(t);
}

export function toPieces(t: string[]): Maybe<Piece[]> {
  return traverseMaybe(t, toPiece);
}

export const enum MaxAgeType {
  NoMaxAge,
  MaxAgeSeconds,
  MaxAgeForever
}

// Values for the max-age component of the cache-control response header.
export type MaxAge
  = { tag: MaxAgeType.NoMaxAge }
  | { tag: MaxAgeType.MaxAgeSeconds; seconds: number; }
  | { tag: MaxAgeType.MaxAgeForever };

// Just the name of a folder.
export type FolderName = Piece;

export type Folder = Array<Either<FolderName, File>>;

export interface File {
  // Size of file in bytes
  size: number;
  // How to construct a WAI response for this file. Some files are stored
  // on the filesystem and can use `ResponseFile`, while others are stored
  // in memory and should use `ResponseBuilder`.
  toResponse(st: Status, headers: ResponseHeaders): Response;
  // Last component of the filename
  name: Piece;
  // Calculate a hash of the contents of this file, such as for etag.
  getHash: Task<Maybe<string>>;
  // Last modified time, used for both display in listings and if-modified-since.
  getModified: Maybe<Date>;
}

export function mkFile(
  size: number, toResponse: (st: Status, h: ResponseHeaders) => Response,
  name: Piece, getHash: Task<Maybe<string>>, getModified: Maybe<Date>
): File {
  return { size, toResponse, name, getHash, getModified };
}

export const enum LookupResultType {
  LRFILE,
  LRFOLDER,
  LRNOTFOUND
}

/**
 * Result of looking up a file in some storage backend.
 * The lookup is either a file or folder, or does not exist.
 */
export type LookupResult
  = { tag: LookupResultType.LRFILE; file: File }
  | { tag: LookupResultType.LRFOLDER; folder: Folder }
  | { tag: LookupResultType.LRNOTFOUND };

export function mkLookupResult(tag: LookupResultType.LRFILE, file: File): LookupResult;
export function mkLookupResult(tag: LookupResultType.LRFOLDER, folder: Folder): LookupResult;
export function mkLookupResult(tag: any, f: any): any {
  let file, folder;
  if (tag === LookupResultType.LRFILE) {
    file = f;
  }
  if (tag === LookupResultType.LRFOLDER) {
    folder = f;
  }
  return { tag, file, folder };
}

/**
 * How to construct a directory listing page for the given request path and
 * the resulting folder.
 */
export interface Listing {
  (pieces: Piece[], folder: Folder): string;
}

export interface StaticSettings {
  /**
   * Lookup a single file or folder. This is how you can control storage
   * backend (filesystem, embedded, etc) and where to lookup.
   */
  lookupFile(pieces: Piece[]): Task<LookupResult>;

  /**
   * Determine the mime type of the given file. Note that this function
   * lives in `Task` in case you want to perform more complicated mimetype
   * analysis, such as via the `file` utility.
   */
  getMimeType(file: File): Task<string>;

  /**
   * Ordered list of filenames to be used for indices. If the user
   * requests a folder, and a file with the given name is found in that
   * folder, that file is served. This supercedes any directory listing.
   */
  indices: Piece[];

  /**
   * How to perform a directory listing. Optional. Will be used when the
   * user requested a folder.
   */
  listing: Maybe<Listing>;

  /**
   * Value to provide for max age in the cache-control.
   */
  maxAge: MaxAge;

  /**
   * Given a requested path and a new destination, construct a string
   * that will go there. Default implementation will use relative paths.
   */
  mkRedirect(pieces: Piece[], bs: string): string;

  /**
   * If `true`, send a redirect to the user when a folder is requested
   * and an index page should be displayed. When `false`, display the
   * content immediately.
   */
  redirectToIndex: boolean;

  /**
   * Prefer usage of etag caching to last-modified caching.
   */
  useHash: boolean;

  /**
   * Using weak etags and comparison
   */
  weakEtags: boolean;

  /**
   * Force a trailing slash at the end of directories
   */
  addTrailingSlash: boolean;

  /**
   * Optional `Application` to be used in case of 404 errors
   */
  notFoundHandler: Maybe<Application>;
}
