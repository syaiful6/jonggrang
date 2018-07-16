import { Readable } from 'stream';
import { createGunzip, createInflate } from 'zlib';

import appendField from 'append-field';
import Busboy from 'busboy';
import { parse as parseContentType } from 'content-type';
import { text as parseBodyText } from 'get-body';
import onFinished from 'on-finished';
import * as qs from 'qs';
import { Maybe, nothing, just, isJust, isNothing } from '@jonggrang/prelude';
import { assign } from '@jonggrang/object';
import { RequestHeaders } from '@jonggrang/http-types';
import { HttpContext, Request } from '@jonggrang/wai';
import * as T from '@jonggrang/task';

import { Counter } from './counter';
import { makeError, errorMessages } from './error';
import { defaultGetStorage } from './storage';
import { insertPlaceholder, removePlaceholder, replacePlaceholder } from './file-appender';
import { MutterOptions, Params, Files, FileInfo, FileUpload, defaultFileFilter } from './types';


/**
 * Request body type we want to parse
 */
export type RequestBodyType
  = { tag: 'urlencoded', charset: string | undefined }
  | { tag: 'multipart', boundary: string };

export function parseRequestBody(ctx: HttpContext, opts?: MutterOptions): T.Task<[Params, Files]> {
  if (!requestHasBody(ctx.request)) return T.pure([{}, {}] as [Params, Files]);

  const mctype = getRequestBodyType(ctx.request);

  if (isNothing(mctype)) return T.pure([{}, {}] as [Params, Files]);

  const { value: ctype } = mctype;

  return ctype.tag === 'urlencoded' ? parseUrlEncodedBody(ctx, opts)
    : ctype.tag === 'multipart' ? parseMultipartBody(ctx, opts)
      : T.pure([{}, {}] as [Params, Files]);
}

function parseUrlEncodedBody(ctx: HttpContext, opts?: MutterOptions): T.Task<[Params, Files]> {
  const req = ctx.request;
  return T.fromPromise(null, req, req.headers, { limit: opts ? opts.sizeLimit as any : undefined }, parseBodyText)
    .map(text => [qs.parse(text), {}] as [Params, Files]);
}

function parseMultipartBody(ctx: HttpContext, opts?: MutterOptions): T.Task<[Params, Files]> {
  return T.makeTask_(cb => {
    const options: MutterOptions = opts || {};
    const req = ctx.request;
    const fileFilter = options.fileFilter || defaultFileFilter;
    const limits = options.limits;
    const storage = options.getStorage ? options.getStorage(ctx) : defaultGetStorage(ctx);

    const params = Object.create(null);
    const files = Object.create(null);

    const busboy = new Busboy({ limits, headers: req.headers, preservePath: options.preservePath });
    const _stream = getContentStream(req, req.headers);
    const stream = isJust(_stream) ? _stream.value : req;
    const pendingWrites = new Counter();
    let isDone = false;
    let readFinished = false;
    let errorOccured = false;
    let uploadedFiles: FileInfo[] = [];

    function done(err?: Error | null) {
      if (isDone) return;
      isDone = true;
      stream.unpipe(busboy);
      drainStream(stream);
      busboy.removeAllListeners();
      onFinished(req, () => {
        if (err) return cb(err);

        cb(null, [params, files]);
      });
    }

    function indicateDone() {
      if (readFinished && pendingWrites.isZero() && !errorOccured) done();
    }

    function abortWithError(uploadError: Error) {
      if (errorOccured) return;
      errorOccured = true;

      T.runTask(T.forInPar_(uploadedFiles, file => storage.removeFile(file)), (err) => {
        if (err) return done(err);

        done(uploadError);
      });
    }

    function abortWithCode(code: keyof (typeof errorMessages), optionalField?: string) {
      abortWithError(makeError(code, optionalField));
    }

    busboy.on('field', (fieldname, value, fieldnameTruncated, valueTruncated) => {
      if (fieldnameTruncated) return abortWithCode('LIMIT_FIELD_KEY');
      if (valueTruncated) return abortWithCode('LIMIT_FIELD_VALUE', fieldname);

      // Work around bug in Busboy (https://github.com/mscdex/busboy/issues/6)
      if (limits && limits.hasOwnProperty('fieldNameSize')) {
        if (fieldname.length > (limits as any).fieldNameSize) return abortWithCode('LIMIT_FIELD_KEY');
      }

      appendField(params, fieldname, value);
    });

    busboy.on('file', (fieldname, filestream, originalname, encoding, mimeType) => {
      if (!fieldname) return filestream.resume();

      // Work around bug in Busboy (https://github.com/mscdex/busboy/issues/6)
      if (limits && limits.hasOwnProperty('fieldNameSize')) {
        if (fieldname.length > (limits as any).fieldNameSize) return abortWithCode('LIMIT_FIELD_KEY');
      }

      const file: FileUpload = {
        fieldname,
        originalname,
        encoding,
        mimeType
      };
      const placeholder = insertPlaceholder(files, file);

      T.runTask(fileFilter(ctx, file), (err, includeFile) => {
        if (err) {
          removePlaceholder(files, placeholder);
          return abortWithError(err);
        }

        if (!includeFile) {
          removePlaceholder(files, placeholder);
          return filestream.resume();
        }

        let aborting = false;
        pendingWrites.increment();

        filestream.on('error', (err) => {
          pendingWrites.decrement();
          abortWithError(err);
        });

        filestream.on('limit', function () {
          aborting = true;
          abortWithCode('LIMIT_FILE_SIZE', fieldname);
        });

        T.runTask(storage.handleFile(file, filestream as any), (err, finfo) => {
          if (aborting) {
            removePlaceholder(files, placeholder);
            uploadedFiles.push(assign(file, finfo || {}) as any);
            return pendingWrites.decrement();
          }
          if (err) {
            removePlaceholder(files, placeholder);
            pendingWrites.decrement();
            return abortWithError(err);
          }

          replacePlaceholder(files, placeholder, finfo as any);
          uploadedFiles.push(finfo as any);
          pendingWrites.decrement();
          indicateDone();
        });
      });
    });

    busboy.on('error', abortWithError);
    busboy.on('partsLimit', () => abortWithCode('LIMIT_PART_COUNT'));
    busboy.on('filesLimit', () => abortWithCode('LIMIT_FILE_COUNT'));
    busboy.on('fieldsLimit', () => abortWithCode('LIMIT_FIELD_COUNT'));
    busboy.on('finish', () => {
      readFinished = true;
      indicateDone();
    });

    stream.pipe(busboy);
  });
}

function getContentStream(stream: Readable, headers: RequestHeaders): Maybe<Readable> {
  const ce = String(headers['content-encoding'] || 'identity').toLowerCase();

  return ce === 'identity' ? just(stream)
    : ce === 'gzip' ? just(stream.pipe(createGunzip()))
      : ce === 'deflate' ? just(stream.pipe(createInflate()))
        : nothing;
}

function requestHasBody(req: Request): boolean {
  return req.headers['transfer-encoding'] != undefined || !isNaN(req.headers['content-length'] as any);
}

export function getRequestBodyType(req: Request): Maybe<RequestBodyType> {
  const parsed = safeParseContentType(req);
  if (isNothing(parsed)) return nothing;

  const { type, parameters } = parsed.value;

  if (type && type.indexOf('multipart') === 0)
    return just({ tag: 'multipart', boundary: parameters.boundary || '' } as RequestBodyType);

  if (type === 'application/x-www-form-urlencoded')
    return just({ tag: 'urlencoded', charset: parameters.charset } as RequestBodyType);

  return nothing;
}

/**
 * wrap parse content type, as it may throw exception
 */
function safeParseContentType(req: Request) {
  try {
    return just(parseContentType(req));
  } catch {
    return nothing;
  }
}

function drainStream(stream: Readable) {
  stream.on('readable', stream.read.bind(stream));
}
