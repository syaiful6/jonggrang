import 'mocha';
import assert from 'assert';
import * as T from '@jonggrang/task';
import * as Crypt from '../src';


function shouldBe<A>(a: A, b: T.Task<A>): Promise<void> {
  return T.toPromise(b.chain(x =>
    T.liftEff(null, () => {
      expect(x).to.deep.equals(a);
    })
  ));
}

describe('Random', () => {
  it('randomBytes can generate random Buffer', () =>
    shouldBe([32, 22], T.bothPar(
      Crypt.randomBytes(32),
      Crypt.randomBytes(22)
    ).map(xs => xs.map(x => x.length)))
  );

  it('randomString can generate random string', () =>
    shouldBe([32, 22], T.bothPar(
      Crypt.randomString(32),
      Crypt.randomString(22)
    ).map(xs => xs.map(x => x.length)))
  );

  it('can encrypt and decrypt', () =>
    shouldBe('foobarbaz', T.co(function* () {
      const [key, macKey ]: [string, string] = yield T.bothPar(
        Crypt.randomString(32),
        Crypt.randomString(32)
      );
      const encrypted = yield Crypt.encryptCTR('foobarbaz', { key, macKey });
      const decrypted = Crypt.decryptCTR(encrypted, { key, macKey });
      return T.pure(decrypted.value);
    }))
  );
});
