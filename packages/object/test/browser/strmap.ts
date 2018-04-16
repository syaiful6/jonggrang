import 'mocha';
import * as jsv from 'jsverify';
import * as M from '../../src/strmap';
import * as P from '@jonggrang/prelude';


const enum InstructionType {
  INSERT,
  DELETE
}

type Instruction<V>
  = { tag: InstructionType.INSERT; key: string; value: V; }
  | { tag: InstructionType.DELETE; key: string; };

function instructionShow<V>(
  show: jsv.Show<V> | undefined
): (ins: Instruction<V>) => string {
  return ins => ins.tag === InstructionType.INSERT
    ? `Insert ${ins.key} ${show == null ? 'unknown' : show(ins.value)}`
    : `Delete ${ins.key};`;
}

function instructionGen<V>(arb: jsv.Arbitrary<V>): (n: number) => Instruction<V> {
  return (size: number) => {
    let k = jsv.string.generator(size);
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

function strMapGen<A>(arb: jsv.Arbitrary<A>): (n: number) => M.StrMap<string, A> {
  return function (n: number) {
    let arbs = jsv.array(instructionArb(arb));
    let instruct = arbs.generator(n);
    return runInstruction(instruct, {});
  };
}

function strMapArb<A>(arb: jsv.Arbitrary<A>): jsv.Arbitrary<M.StrMap<string, A>> {
  return jsv.bless({
    generator: jsv.generator.bless(strMapGen(arb))
  });
}

function runInstruction<V>(
  xs: Instruction<V>[],
  m: M.StrMap<string, V>
): M.StrMap<string, V> {
  return xs.reduce(stepIns, m);
}

function stepIns<V>(
  m: M.StrMap<string, V>,
  ins: Instruction<V>
) {
  return ins.tag === InstructionType.INSERT ? M.insert(ins.key, ins.value, m) : M.remove(ins.key, m);
}

describe('StrMap', () => {
  jsv.property('can inserting into empty tree', jsv.string, jsv.number, (k, v) =>
    P.maybe(
      false,
      v2 => v === v2,
      M.lookup(k, M.insert(k, v, {} as M.StrMap<string, number>))
    )
  );

  jsv.property('inserting value with same key keep the last one', jsv.asciistring,
               jsv.number, jsv.number, (k, v1, v2) =>
    P.maybe(
      false,
      mv => mv === v2,
      M.lookup(k, M.insert(k, v2, M.insert(k, v1, {})))
    )
  );

  jsv.property('removing after inserting', jsv.asciistring, jsv.number, (k, v) =>
    M.isEmpty(M.remove(k, M.insert(k, v, {})))
  );

  jsv.property('pop after inserting', jsv.asciistring, jsv.nat, (k, v) =>
    P.deepEq(M.pop(k, M.insert(k, v, {})), P.just([v, {}]))
  );

  jsv.property('pop non-existent key return Nothing', jsv.asciistring, jsv.asciistring,
               jsv.number, (k1, k2, v) =>
    k1 === k2 || P.deepEq(M.pop(k2, M.insert(k1, v, {})), P.nothing)
  );

  jsv.property('can random lookup', strMapArb(jsv.nat), jsv.string, jsv.number, (sm, k, v) =>
    P.maybe(false, v2 => v === v2, M.lookup(k, M.insert(k, v, sm)))
  );

  jsv.property('lookup from union', strMapArb(jsv.number), strMapArb(jsv.number),
               jsv.asciistring, (m1, m2, k) => {
    const mv = M.lookup(k, m1);
    return P.deepEq(M.lookup(k, M.union(m1, m2)), P.isNothing(mv) ? M.lookup(k, m2) : mv);
  });

  jsv.property('lookup from emptry strMap return Nothing', jsv.string, k =>
    P.isNothing(M.lookup(k, {}))
  );

  jsv.property('Union is idempotent', strMapArb(jsv.number), strMapArb(jsv.number), (m1, m2) =>
    P.deepEq(M.union(m1, m2), M.union(M.union(m1, m2), m2))
  );
});
