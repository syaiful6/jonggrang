import 'mocha';
import * as jsv from 'jsverify';
import * as P from '@jonggrang/prelude';

import { IntMap as IM } from '../../src';

const enum InstructionType {
  INSERT,
  DELETE
}

type Instruction<V>
  = { tag: InstructionType.INSERT; key: number; value: V; }
  | { tag: InstructionType.DELETE; key: number; };

function instructionShow<V>(
  show: jsv.Show<V> | undefined
): (ins: Instruction<V>) => string {
  return ins => ins.tag === InstructionType.INSERT
    ? `Insert ${ins.key} ${show == null ? 'unknown' : show(ins.value)}`
    : `Delete ${ins.key};`
}

function instructionGen<V>(arb: jsv.Arbitrary<V>): (n: number) => Instruction<V> {
  return (size: number) => {
    let k = jsv.integer.generator(size);
    let v = arb.generator(size);
    return size % 2 === 0
      ? { tag: InstructionType.INSERT, key: k, value: v }
      : { tag: InstructionType.DELETE, key: k }
  }
}

function instructionArb<V>(arb: jsv.Arbitrary<V>): jsv.Arbitrary<Instruction<V>> {
  return jsv.bless({
    generator: jsv.generator.bless(instructionGen(arb)),
    show: instructionShow(arb.show)
  })
}

function runInstruction<V>(
  xs: Instruction<V>[],
  m: IM.IntMap<V>
): IM.IntMap<V> {
  return xs.reduce(stepIns, m);
}

function stepIns<V>(
  m: IM.IntMap<V>,
  ins: Instruction<V>
) {
  return ins.tag === InstructionType.INSERT ? IM.insert(ins.key, ins.value, m) : IM.remove(ins.key, m);
}

describe('Container IntMap', () => {
  it('can inserting into empty intmap', () =>
    jsv.assert(
      jsv.forall(jsv.integer, jsv.number, (k, v) =>
        P.maybe(
          false,
          v1 => v === v1,
          IM.lookup(k, IM.insert(k, v, IM.empty))
        )
      )
    )
  );

  it('inserting value with same key keep the last one', () =>
    jsv.assert(
      jsv.forall(jsv.integer, jsv.number, jsv.number, (k, v1, v2) =>
        P.maybe(
          false,
          v3 => v2 === v3,
          IM.lookup(k, IM.insert(k, v2, IM.insert(k, v1, IM.empty)))
        )
      )
    )
  );

  it('removing after inserting', () =>
    jsv.assert(
      jsv.forall(jsv.integer, jsv.number, (k, v) =>
        IM.isEmpty(IM.remove(k, IM.insert(k, v, IM.empty)))
      )
    )
  );

  it('can random lookup', () =>
    jsv.assert(
      jsv.forall(jsv.array(instructionArb(jsv.number)), jsv.integer, jsv.number, (insts, k, v) => {
        const t = IM.insert(k, v, runInstruction(insts, IM.empty));
        return P.maybe(false, v1 => v === v1, IM.lookup(k, t));
      })
    )
  );
})
