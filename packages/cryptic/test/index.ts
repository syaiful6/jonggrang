import * as assert from 'assert';
import * as T from '@jonggrang/task';
import * as Crypt from '../src';


function shouldBe<A>(a: A, b: T.Task<A>): Promise<void> {
  return T.toPromise(b.chain(x =>
    T.liftEff(null, () => {
      assert.deepEqual(x, a);
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
      const allKey: string = yield Crypt.randomString(32 + 64);
      const key = allKey.slice(0, 32);
      const macKey = allKey.slice(32, 96);

      const opts: Crypt.Options = {
        key,
        macKey,
        signatureAlgorithm: 'sha256',
        encryptionAlgorithm: 'aes256'
      };

      const encrypted = yield Crypt.encrypt('foobarbaz', opts);
      const decrypted = Crypt.decrypt(encrypted, opts);

      return T.pure(decrypted.value);
    }))
  );
});
