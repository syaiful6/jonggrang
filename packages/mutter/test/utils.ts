import * as fs from 'fs';
import * as path from 'path';
import { Readable, PassThrough } from 'stream';

import * as T from '@jonggrang/task';
import * as W from '@jonggrang/wai';


export function file(name: string): Readable {
  return fs.createReadStream(path.join(__dirname, 'fixtures', name));
}

export function fileSize(path: string): T.Task<number> {
  return T.node(null, path, fs.stat).map(stat => stat.size);
}

export function simpleApp<A>(ctx: W.HttpContext, respond: (_: W.Response) => T.Task<A>): T.Task<A> {
  const body = Buffer.from('simple app');
  return respond(W.responseBuffer(200, {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(body)
  }, body));
}

export function submitForm<R extends Readable>(mutter: W.Middleware, form: R): T.Task<W.HttpContext> {
  return T.makeTask_(cb => {
    (form as any).getLength((err: Error | null, len: number) => {
      if (err) return cb(err);

      const app = mutter(simpleApp);
      const request = new PassThrough();
      (request as any).complete = false;
      form.once('end', () => {
        (request as any).complete = true;
      });

      form.pipe(request);
      (request as any).headers = {
        'content-type': 'multipart/form-data; boundary=' + (form as any).getBoundary(),
        'content-length': len
      };

      const ctx: W.HttpContext = W.createHttpContext(request as any);

      T.runTask(app(ctx, T.pure), err => {
        if (err) return cb(err);

        cb(null, ctx);
      });
    });
  });
}
