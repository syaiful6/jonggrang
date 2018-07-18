import { Middleware } from '@jonggrang/wai';

import { parseRequestBody } from './parser';
import { MutterOptions } from './types';


export function mutter(opts?: MutterOptions): Middleware {
  return app => function mutterMiddleware(ctx, respond) {
    return parseRequestBody(ctx, opts).chain(([body, files]) => {
      ctx.state.body = body;
      ctx.state.files = files;

      return app(ctx, respond);
    });
  };
}

export { parseRequestBody };
export * from './types';
export * from './storage';
