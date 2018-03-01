import * as T from '@jonggrang/task';

export interface Ref<A> {
  value: A
}

/**
 * Create a new mutable reference containing the specified value.
 */
export function newRef<A>(value: A): T.Task<Ref<A>> {
  return T.pure({ value });
}

/**
 * Read the current value of a mutable reference
 * @param ref The `Ref` to read
 */
export function readRef<A>(ref: Ref<A>): T.Task<A> {
  return T.liftEff(null, ref, _readRef);
}

function _readRef<A>(ref: Ref<A>): A {
  return ref.value;
}

/**
 * Write a value to the mutable reference
 */
export function writeRef<A>(ref: Ref<A>, value: A): T.Task<void> {
  return T.liftEff(null, ref, value, _writeRef);
}

function _writeRef<A>(ref: Ref<A>, value: A) {
  ref.value = value;
}

/**
 * Update the value of a mutable reference by applying a function
 * to the current value.
 * @param ref
 * @param act
 */
export function modifyRef_<A, B>(ref: Ref<A>, act: (_: A) => [A, B]): T.Task<B> {
  return T.liftEff(null, ref, act, _modifyRef);
}

function _modifyRef<A, B>(ref: Ref<A>, act: (_: A) => [A, B]): B {
  const [a, b] = act(ref.value);
  ref.value = a;
  return b;
}

/**
 * like `modifyRef_` but only accept a function that take current value and return
 * the modified value.
 * @param ref
 * @param trans
 */
export function modifyRef<A>(ref: Ref<A>, trans: (_: A) => A): T.Task<void> {
  return T.liftEff(null, ref, trans, __modifyRef);
}

function __modifyRef<A>(ref: Ref<A>, trans: (_: A) => A) {
  ref.value = trans(ref.value);
}
