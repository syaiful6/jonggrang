/**
 * DOM event listener utility
 */
import { HandlerFnOrObject, pipeEvHandler } from './vnode';

export { HandlerFnOrObject, pipeEvHandler, runEvHandler } from './vnode';

export function input<E, A>(action: (_: E) => A): HandlerFnOrObject<E, A> {
  return new Input(action);
}

export function always<A>(value: A): HandlerFnOrObject<any, A> {
  return new Constant(value);
}

export function onValueInput<A>(f: HandlerFnOrObject<string, A>): HandlerFnOrObject<Event, A> {
  return pipeEvHandler(valueInputReader, f);
}

export function onValueChange<A>(f: HandlerFnOrObject<string, A>): HandlerFnOrObject<Event, A> {
  return pipeEvHandler(valueInputReader, f);
}

export function onChecked<A>(f: HandlerFnOrObject<boolean, A>): HandlerFnOrObject<Event, A> {
  return pipeEvHandler(checkedReader, f);
}

function valueInputReader(ev: Event): string | void {
  if (ev.currentTarget) {
    let v: any = (ev.currentTarget as any).value;
    if (typeof v === 'string') {
      return v;
    }
  }
}

function checkedReader(ev: Event): boolean | void {
  if (ev.currentTarget) {
    let v: any = (ev.currentTarget as any).value;
    if (typeof v === 'boolean') {
      return v;
    }
  }
}

class Input<E, I> {
  constructor(readonly action: (_: E) => I) {
  }

  handleEvent(e: E): I {
    return this.action(e);
  }
}

class Constant<A> {
  constructor(readonly value: A) {
  }

  handleEvent() {
    return this.value;
  }
}
