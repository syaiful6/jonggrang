import { IncomingMessage } from 'http';

import * as P from '@jonggrang/prelude';
import * as T from '@jonggrang/task';

import { responseBuffer, Response, createHttpContext, HttpContext } from '../type';
import { Settings } from './types';
import { createConnection } from './conn';


export const defaultSettings: Settings = {
  createConnection,
  createHttpContext: defaultcreateHttpContext,
  fdCacheDuration: 0,
  finfoCacheDuration: 0,
  logger: () => T.pure(void 0),
  listenOpts: {
    host: '127.0.0.1',
    port: 3000
  },
  onException: defaultOnException,
  onExceptionResponse: onExceptionResponse
};

function defaultcreateHttpContext(req: IncomingMessage): T.Task<HttpContext> {
  return T.pure(createHttpContext(req));
}

function defaultOnException(mreq: P.Maybe<IncomingMessage>, err: Error): T.Task<void> {
  return T.liftEff(null, mreq, err, defaultOnExceptionEff);
}

function defaultOnExceptionEff(mreq: P.Maybe<IncomingMessage>, err: Error) {
  if (P.isJust(mreq)) {
    const req = mreq.value;
    console.error(
      `error when handle request ${req.method} ${req.url} with error message ${err.message}`
    );
  } else {
    console.error(err.message);
  }
}

export function onExceptionResponse(): Response {
  return responseBuffer(
    500,
    { 'Content-Type': 'text/plain; charset=utf-8' },
    Buffer.from('Something went wrong', 'utf8')
  );
}
