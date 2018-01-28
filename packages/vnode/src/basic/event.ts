import { on } from './core';
import {
  Handler, HandlerFnOrObject, pipeEvHandler
} from '../dom/prop';

export function always<A, B>(a: A) {
  return (_: B) => a;
}

export function onAbort<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('abort', hd);
}

export function onBlur<A>(hd: HandlerFnOrObject<FocusEvent, A>): Handler<A> {
  return on('blur', hd);
}

export function onChange<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('change', hd);
}

export function onClick<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('click', hd);
}

export function onContexMenu<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('contextmenu', hd);
}

export function onDoubleClick<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('dblick', hd);
}

export function onDrag<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('drag', hd);
}

export function onDragEnd<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('dragend', hd);
}

export function onDragEnter<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('dragenter', hd);
}

export function onDragExit<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('dragexit', hd);
}

export function onDragLeave<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('dragleave', hd);
}

export function onDragOver<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('dragover', hd);
}

export function onDragStart<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('dragstart', hd);
}

export function onDrop<A>(hd: HandlerFnOrObject<DragEvent, A>): Handler<A> {
  return on('drop', hd);
}

export function onError<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('error', hd);
}

export function onFocus<A>(hd: HandlerFnOrObject<FocusEvent, A>): Handler<A> {
  return on('focus', hd);
}

export function onFocusIn<A>(hd: HandlerFnOrObject<FocusEvent, A>): Handler<A> {
  return on('focusin', hd);
}

export function onFocusOut<A>(hd: HandlerFnOrObject<FocusEvent, A>): Handler<A> {
  return on('focusout', hd);
}

export function onInput<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('input', hd);
}

export function onInvalid<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('invalid', hd);
}

export function onKeyDown<A>(hd: HandlerFnOrObject<KeyboardEvent, A>): Handler<A> {
  return on('keydown', hd)
}

export function onKeyPress<A>(hd: HandlerFnOrObject<KeyboardEvent, A>): Handler<A> {
  return on('keypress', hd)
}

export function onKeyUp<A>(hd: HandlerFnOrObject<KeyboardEvent, A>): Handler<A> {
  return on('keyup', hd)
}

export function onLoad<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('load', hd);
}

export function onMouseDown<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mousedown', hd);
}

export function onMouseEnter<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mouseenter', hd);
}

export function onMouseLeave<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mouseleave', hd);
}

export function onMouseMove<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mousemove', hd);
}

export function onMouseOver<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mouseover', hd);
}

export function onMouseOut<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mouseout', hd);
}

export function onMouseUp<A>(hd: HandlerFnOrObject<MouseEvent, A>): Handler<A> {
  return on('mouseup', hd);
}

export function onReset<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('reset', hd);
}

export function onScroll<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('scroll', hd);
}

export function onSelect<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('select', hd);
}

export function onSubmit<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('submit', hd);
}

export function onTransitionEnd<A>(hd: HandlerFnOrObject<Event, A>): Handler<A> {
  return on('transitionend', hd);
}

export function onValueInput<A>(f: HandlerFnOrObject<string, A>): Handler<A> {
  return onInput(pipeEvHandler(valueInputReader, f));
}

export function onValueChange<A>(f: HandlerFnOrObject<string, A>): Handler<A> {
  return onChange(pipeEvHandler(valueInputReader, f));
}

export function onChecked<A>(f: HandlerFnOrObject<boolean, A>): Handler<A> {
  return onChange(pipeEvHandler(checkedReader, f));
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
