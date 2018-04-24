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
    : `Delete ${ins.key}`;
}

function instructionGen<V>(arb: jsv.Arbitrary<V>): (n: number) => Instruction<V> {
  return (size: number) => {
    let k = jsv.integer.generator(size);
    let v = arb.generator(size);
    return size % 2 === 0
      ? { tag: InstructionType.INSERT, key: k, value: v }
      : { tag: InstructionType.DELETE, key: k };
  };
}

function instructionArb<V>(arb: jsv.Arbitrary<V>): jsv.Arbitrary<Instruction<V>> {
  return jsv.bless({
    generator: jsv.generator.bless(instructionGen(arb)),
    show: instructionShow(arb.show)
  });
}

function intMapGen<V>(arb: jsv.Arbitrary<V>): (n: number) => IM.IntMap<V> {
  return function (n: number) {
    let arbs = jsv.array(instructionArb(arb));
    let instruct = arbs.generator(n);
    return runInstruction(instruct, IM.empty);
  };
}

function intMapArb<V>(arb: jsv.Arbitrary<V>): jsv.Arbitrary<IM.IntMap<V>> {
  return jsv.bless({
    generator: jsv.generator.bless(intMapGen(arb))
  });
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
  jsv.property('can inserting into empty intmap', jsv.integer, jsv.number, (k, v) =>
    P.maybe(false, v2 => v === v2, IM.lookup(k, IM.insert(k, v, IM.empty)))
  );

  jsv.property('inserting value with same key keep the last one', jsv.integer, jsv.number,
               jsv.number, (k, v1, v2) =>
    P.maybe(false, v3 => v2 === v3, IM.lookup(k, IM.insert(k, v2, IM.insert(k, v1, IM.empty))))
  );

  jsv.property('removing after inserting', jsv.integer, jsv.number, (k, v) =>
    IM.isEmpty(IM.remove(k, IM.insert(k, v, IM.empty)))
  );

  jsv.property('random lookup', intMapArb(jsv.number), jsv.integer, jsv.number, (im, k, v) =>
    P.maybe(false, v1 => v === v1, IM.lookup(k, IM.insert(k, v, im)))
  );

  jsv.property('remove then lookup misses', intMapArb(jsv.number), jsv.integer, (im, k) =>
    P.isNothing(IM.lookup(k, IM.remove(k, im)))
  );

  jsv.property('alter can be used for insert', intMapArb(jsv.number), jsv.integer, jsv.number, (im, k, v) =>
    P.maybe(
      false,
      v2 => v === v2,
      IM.lookup(
        k,
        IM.alter(m => P.altMaybe(m, P.just(v)), k, IM.remove(k, im))
      )
    )
  );

  jsv.property('alter can be used for deleting', intMapArb(jsv.number), jsv.integer, jsv.number, (im, k, v) =>
    P.isNothing(IM.lookup(k, IM.alter(() => P.nothing, k, IM.insert(k, v, im))))
  );

  jsv.property('alter can be used for updating', intMapArb(jsv.number), jsv.integer,
               jsv.number, jsv.number, (im, k, v1, v2) =>
    P.maybe(
      false,
      v3 => v3 === (v1 + v2),
      IM.lookup(
        k,
        IM.alter(mv => P.just(P.maybe(v2, v3 => v3 + v2, mv)), k, IM.insert(k, v1, im))))
  );

  jsv.property('filter drop all', intMapArb(jsv.number), im =>
    IM.isEmpty(IM.filter(() => false, im))
  );

  jsv.property('filter keep all', intMapArb(jsv.number), im =>
    P.deepEq(im, IM.filter(() => true, im))
  );

  jsv.property('difference with itself is empty', intMapArb(jsv.nat), t =>
    IM.isEmpty(IM.difference(t, t))
  );
});
