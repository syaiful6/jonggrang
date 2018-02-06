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
    : `Delete ${ins.key};`
}

function instructionGen<V>(arb: jsv.Arbitrary<V>): (n: number) => Instruction<V> {
  return (size: number) => {
    let k = jsv.string.generator(size);
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
  it('can inserting into empty tree', () =>
    jsv.assert(
      jsv.forall(jsv.string, jsv.number, (k, v) =>
        P.maybe(
          false,
          vm => vm === v,
          M.lookup(k, M.insert(k, v, {} as M.StrMap<string, number>))
        )
      )
    )
  );

  it('inserting value with same key keep the last one', () =>
    jsv.assert(
      jsv.forall(jsv.asciistring, jsv.number, jsv.number, (k, v1, v2) =>
        P.maybe(
          false,
          mv => mv === v2,
          M.lookup(k, M.insert(k, v2, M.insert(k, v1, {})))
        )
      )
    )
  );

  it('removing after inserting', () =>
    jsv.assert(
      jsv.forall(jsv.asciistring, jsv.number, (k, v) =>
        M.isEmpty(M.remove(k, M.insert(k, v, {})))
      )
    )
  );

  it('pop after insertiong', () =>
    jsv.assert(
      jsv.forall(
        jsv.asciistring,
        jsv.nat,
        (k, v) =>
          P.deepEq(
            M.pop(k, M.insert(k, v, {})),
            P.just([v, {}])
          )
      )
    )
  );

  it('Pop non-existent key returns Nothing', () =>
    jsv.assert(
      jsv.forall(
        jsv.asciistring,
        jsv.asciistring,
        jsv.number,
        (k1, k2, v) =>
          k1 == k2 || P.deepEq(M.pop(k2, M.insert(k1, v, {})), P.nothing)
      )
    )
  );

  it('can random lookup', () =>
    jsv.assert(
      jsv.forall(
        jsv.array(instructionArb(jsv.number)),
        jsv.string,
        jsv.number,
        (instr, k, v) => {
          let tree = M.insert(k, v, runInstruction(instr, {}));
          return P.maybe(false, vm => vm === v, M.lookup(k, tree));
        }
      )
    )
  );

  it('lookup from union', () =>
    jsv.assert(
      jsv.forall(
        jsv.dict(jsv.number),
        jsv.dict(jsv.number),
        jsv.asciistring,
        (m1, m2, k) => {
          let mv = M.lookup(k, m1);
          return P.deepEq(
            M.lookup(k, M.union(m1, m2)),
            P.isNothing(mv) ? M.lookup(k, m2) : mv
          )
        }
      )
    )
  );

  it('lookup from empty strMap return Nothing', () =>
    jsv.assert(
      jsv.forall(
        jsv.asciistring,
        k => P.isNothing(M.lookup(k, {}))
      )
    )
  );

  it('Union is idempotent', () =>
    jsv.assert(
      jsv.forall(
        jsv.dict(jsv.number),
        jsv.dict(jsv.number),
        (m1, m2) =>
          P.deepEq(
            M.union(m1, m2),
            M.union(M.union(m1, m2), m2)
          )
      )
    )
  );
})
