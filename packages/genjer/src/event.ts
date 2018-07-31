/**
 * DOM event listener utility
 */
import { HandlerFnOrObject, pipeEvHandler, runEvHandler } from './vnode';

export {
  HandlerFnOrObject,
  pipeEvHandler as pipe,
  runEvHandler as run
} from './vnode';

export function always<A>(value: A): HandlerFnOrObject<any, A> {
  return new Constant(value);
}

export function onValueInput<A>(f: HandlerFnOrObject<string, A>): HandlerFnOrObject<Event, A> {
  return pipeEvHandler(valueInputReader, f);
}

export function onChecked<A>(f: HandlerFnOrObject<boolean, A>): HandlerFnOrObject<Event, A> {
  return pipeEvHandler(checkedReader, f);
}

export function onKey<T extends string, A>(
  predicate: (k: string) => k is T,
  action: HandlerFnOrObject<T, A>
): HandlerFnOrObject<Event, A> {
  return new KeyOn(predicate, action);
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
    let v: any = (ev.currentTarget as any).checked;
    if (typeof v === 'boolean') {
      return v;
    }
  }
}

class Constant<A> {
  constructor(readonly value: A) {
  }

  handleEvent() {
    return this.value;
  }
}

class KeyOn<T extends string, A> {
  constructor(
    readonly predicate: (k: string) => k is T,
    readonly action: HandlerFnOrObject<T, A>
  ) {
  }

  handleEvent(ev: KeyboardEvent): A | void {
    const { predicate, action } = this;
    return predicate(ev.key) ? runEvHandler(action, ev.key) : (void 0);
  }
}
