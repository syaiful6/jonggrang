/**
 * DOM event listener utility
 */
import { HandlerFnOrObject, pipeEvHandler, runEvHandler } from './vnode';

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

export function onKeydown<A>(
  predicate: (k: string) => boolean,
  action: HandlerFnOrObject<string, A>
): HandlerFnOrObject<Event, A> {
  return new KeyDownOn(predicate, action);
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

class KeyDownOn<A> {
  constructor(
    readonly predicate: (_: string) => boolean,
    readonly action: HandlerFnOrObject<string, A>
  ) {
  }

  handleEvent(ev: KeyboardEvent): A | void {
    const { predicate, action } = this;
    return predicate(ev.key) ? runEvHandler(action, ev.key) : (void 0);
  }
}
