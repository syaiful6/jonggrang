import 'mocha';
import { expect } from 'chai';
import * as path from 'path';
import * as fs from 'fs';

import { isLeft } from '@jonggrang/prelude';
import * as T from '@jonggrang/task';
import * as R from '@jonggrang/ref';

import { withFdCache } from '../src/handler/fd-cache';


describe('Fd Cache', () => {
  it('withFdCache clean up fd', done => {
    T.runTask(
      done,
      T.co(function* () {
        let fdRef: R.Ref<number> = yield R.newRef(-1);
        yield withFdCache(3000, getFd =>
          getFd(path.join(__dirname, '..', 'package.json')).chain(fd =>
            R.writeRef(fdRef, (fd[0] as any).value))
        );
        let fd: number = yield R.readRef(fdRef);
        return T.attempt(T.node(null, fd, fs.readFile)).chain(mcont => {
          /*tslint:disable */
          expect(isLeft(mcont)).to.be.true;
          /*tslint:enable */
          return T.pure(void 0);
        });
      })
    );
  });
});
