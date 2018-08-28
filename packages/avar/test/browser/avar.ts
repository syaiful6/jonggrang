import { MaybeType } from '@jonggrang/prelude';

import * as T from '@jonggrang/task';
import * as Q from './utils';
import * as AV from '../../src';


describe('AVar', () => {
  it('try read full AVar return Just<A>', () =>
    Q.assertTask(
      AV.newAVar('foo')
        .chain(avar => AV.tryReadAVar(avar)
          .chain(val1 => AV.tryReadAVar(avar)
            .map(val2 =>
                  val1.tag === MaybeType.JUST
              && val2.tag === MaybeType.JUST
              && val1.value == val2.value)))
    )
  );

  it('try read empty AVar return Nothing', () =>
    Q.assertTask(
      AV.newEmptyAVar
        .chain(av =>
          AV.tryReadAVar(av)
            .map(v => v.tag === MaybeType.NOTHING))
    )
  );

  it('try put value in an empty AVar return true', () =>
    Q.shouldBe(
      true,
      AV.newEmptyAVar
        .chain(av =>
          AV.tryPutAVar(av, 'bar'))
    )
  );

  it('try put value in a full AVar return false', () =>
    Q.shouldBe(
      false,
      AV.newAVar('foo')
        .chain(av =>
          AV.tryPutAVar(av, 'bar'))
    )
  );

  it('try takeVar, leave the full AVar empty when success', () =>
    Q.assertTask(
      AV.newAVar('foo')
        .chain(av =>
          AV.tryTakeAVar(av).chain(() => AV.isEmptyAVar(av)))
    )
  );

  it('try takeAvar return Nothing when AVar empty', () =>
    Q.assertTask(
      AV.newEmptyAVar
        .chain(av =>
          AV.tryTakeAVar(av)
          .map(opt => opt.tag === MaybeType.NOTHING))
    )
  );

  it('take AVar, take value from AVar', () =>
    Q.shouldBe(
      'foo',
      AV.newEmptyAVar.chain(avar =>
        AV.putAVar(avar, 'foo').chain(() => AV.takeAVar(avar))
      )
    )
  );

  it('take AVar wait AVar to be full and then leave it empty', () =>
    Q.shouldBe(
      1,
      AV.newEmptyAVar.chain(avar =>
        T.forkTask(T.delay(15).chain(() => AV.putAVar(avar, 1)))
          .chain(() => AV.takeAVar(avar))
      )
    )
  );

  it('readAVar not leave AVar empty', () =>
    Q.assertTask(
      AV.newAVar('foo')
        .chain(avar =>
          AV.readAVar(avar)
            .chain(val1 =>
              AV.takeAVar(avar)
                .map(val2 => val1 === val2)
          )
      )
    )
  );

  it('swap AVar return the value taken', () =>
    Q.shouldBe(
      'foo',
      AV.newAVar('foo')
        .chain(av =>
          AV.swapAVar(av, 'bar')))
  );

  it('swap AVar put a value to the avar', () =>
    Q.shouldBe(
      'bar',
      AV.newAVar('foo')
        .chain(av =>
          AV.swapAVar(av, 'bar')
            .chain(() => AV.takeAVar(av)))
    )
  );

  it('withAVar not leave AVar empty even if it killed', () =>
    Q.shouldBe(
      'foo',
      AV.newAVar('foo')
        .chain(av =>
          T.forkTask(
            AV.withAVar(av, () => T.delay(100)))
          .chain(fib =>
            T.killFiber(new Error('kill withAVar action'), fib))
          .chain(() => AV.takeAVar(av)))
    )
  );

  it('modifiAVar can modify AVar content', () =>
    Q.shouldBe(
      'foobaz',
      AV.newAVar('foo')
        .chain(av =>
          AV.modifyAVar(av, s => T.pure(s + 'baz'))
            .chain(() => AV.readAVar(av))
      )
    )
  );
});
