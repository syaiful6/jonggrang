import * as path from 'path';
import * as fs from 'fs';
import { getType } from 'mime';
import * as W from '@jonggrang/wai';
import {
  isLeft, left, right, Maybe, nothing, just, isJust, catMaybes, Either
} from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import {
  Piece, File, mkFile, LookupResult, LookupResultType, mkLookupResult,
  StaticSettings, MaxAgeType
} from '../types';
import { defaultMkRedirect } from '../helper';
import { defaultListing } from '../listing';



export function defaultWebAppSettings(dir: string, weakEtag?: boolean): StaticSettings {
  const weakEtags = weakEtag === undefined ? true : weakEtag;
  return {
    lookupFile(pieces: Piece[]) {
      return webAppLookup(defaultEtag, dir, pieces, this.weakEtags);
    },
    getMimeType(file: File) {
      return T.pure(getType(file.name) || 'application/octet-stream');
    },
    indices: [],
    listing: nothing,
    maxAge: { tag: MaxAgeType.MaxAgeForever },
    mkRedirect: defaultMkRedirect,
    redirectToIndex: false,
    useHash: true,
    weakEtags: weakEtags,
    addTrailingSlash: false,
    notFoundHandler: nothing
  };
}

export function defaultFileServerSettings(dir: string): StaticSettings {
  return {
    lookupFile(pieces: Piece[]) {
      return fileSystemLookup(defaultEtag, dir, pieces, false);
    },
    getMimeType(file: File) {
      return T.pure(getType(file.name) || 'application/octet-stream');
    },
    indices: ['index.html', 'index.htm'],
    listing: just(defaultListing),
    maxAge: { tag: MaxAgeType.NoMaxAge },
    mkRedirect: defaultMkRedirect,
    redirectToIndex: false,
    useHash: false,
    weakEtags: false,
    addTrailingSlash: false,
    notFoundHandler: nothing
  };
}

export function pathFromPieces(fp: string, pieces: Piece[]): string {
  return path.join(fp, ...pieces);
}

export interface EtagLookup {
  (fp: fs.Stats, weak: boolean): T.Task<Maybe<string>>;
}

export function fileHelperLR(
  a: EtagLookup,
  b: string,
  c: Piece,
  d: boolean
): T.Task<LookupResult> {
  return fileHelper(a, b, c, d).map(mfile =>
    isJust(mfile)
    ? mkLookupResult(LookupResultType.LRFILE, mfile.value)
    : { tag: LookupResultType.LRNOTFOUND } as LookupResult
  );
}

export function fileHelper(
  hashFn: EtagLookup,
  fp: string,
  name: Piece,
  weakEtags: boolean
): T.Task<Maybe<File>> {
  return T.attempt(T.node(null, fp, fs.stat))
    .map(mstate => {
      if (isLeft(mstate)) return nothing;
      const stat = mstate.value;
      // check if this is regular file
      if (stat.isFile()) {
        return just(mkFile(
          stat.size,
          (s, h) => W.responseFile(s, h, fp),
          name,
          hashFn(stat, weakEtags),
          just(stat.mtime)
        ));
      }
      return nothing;
    });
}

function webAppLookup(
  etagFn: EtagLookup,
  prefix: string,
  pieces: Piece[],
  weakEtags: boolean
): T.Task<LookupResult> {
  const lastPiece = pieces.length === 0 ? '' : pieces[pieces.length - 1];
  const fp = pathFromPieces(prefix, pieces);
  return fileHelperLR(etagFn, fp, lastPiece, weakEtags);
}

export function fileSystemLookup(
  etagFn: EtagLookup,
  prefix: string,
  pieces: Piece[],
  weakEtags: boolean
): T.Task<LookupResult> {
  const fp = pathFromPieces(prefix, pieces);
  return T.attempt(T.node(null, fp, fs.stat))
    .chain(estat => {
      if (isLeft(estat))
        return T.pure({ tag: LookupResultType.LRNOTFOUND } as LookupResult);

      const { value: stat } = estat;
      if (stat.isFile()) {
        return T.pure(mkLookupResult(LookupResultType.LRFILE, mkFile(
          stat.size,
          (s, h) => W.responseFile(s, h, fp),
          pieces.length === 0 ? '' : pieces[pieces.length - 1],
          etagFn(stat, weakEtags),
          just(stat.mtime)
        )));
      }

      return T.node(null, fp, fs.readdir)
        .chain(entries_ => {
          const entries = entries_.filter(isVisible);
          return T.forIn(entries, frel => {
            const fpAbs = path.join(fp, frel);
            return T.attempt(T.node(null, fpAbs, fs.stat))
              .map(estate => {
                if (isLeft(estate)) {
                  return nothing as Maybe<Either<string, File>>;
                }
                const stat = estate.value;
                if (stat.isDirectory()) {
                  return just(left(frel)) as Maybe<Either<string, File>>;
                }

                // file
                return just(right(mkFile(
                  stat.size,
                  (s, h) => W.responseFile(s, h, fpAbs),
                  frel,
                  etagFn(stat, weakEtags),
                  just(stat.mtime)
                ))) as Maybe<Either<string, File>>;
              });
          }).map(xs => mkLookupResult(LookupResultType.LRFOLDER, catMaybes(xs)));
        });
    });
}

export function defaultEtag(stat: fs.Stats, weakEtag: boolean): T.Task<Maybe<string>> {
  return T.liftEff(null, stat, weakEtag, defaultEtagEff).map(just);
}

export function isVisible(fs: string): boolean {
  if (fs.length === 0) return false;
  if (fs.charAt(0) === '.') return false;
  return true;
}

function defaultEtagEff(stat: fs.Stats, weakEtag: boolean): string {
  const mtime = stat.mtime.getTime().toString(16);
  const size = stat.size.toString(16);
  const etag = `"${size}-${stat.ino}-${mtime}"`;

  return weakEtag ? `W/${etag}` : etag;
}
