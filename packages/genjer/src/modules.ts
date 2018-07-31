import { Module } from 'snabbdom/modules/module';
import { VNode, VNodeData } from 'snabbdom/vnode';
import { HandlerFnOrObject, runEvHandler } from './vnode';

export function createModuleListener<A>(emit: (_: A) => void): Module {
  function updateEventListener(old: VNode, vnode?: VNode) {
    let on: HandlerFnOrObject<Event, A> | undefined = vnode && vnode.data ? (vnode.data as VNodeData).events : undefined,
      oldOn: HandlerFnOrObject<Event, A> | undefined = old.data ? (old.data as VNodeData).events : undefined,
      oldListener: EventDict | undefined = (old as any).listener,
      oldElm: Element = old.elm as Element,
      elm: Element = (vnode && vnode.elm) as Element,
      name: string;
    if (oldOn === on) return;

    // remove existing listeners which no longer used
    if (oldOn && oldListener) {
      if (!on) {
        for (name in oldOn) {
          // remove listener if element was changed or existing listeners removed
          oldElm.removeEventListener(name, oldListener, false);
          (oldListener as any)[name] = undefined;
        }
      } else {
        for (name in oldOn) {
          if (!(on as any)[name]) {
            if (oldListener[name] != null) oldElm.removeEventListener(name, oldListener, false);
            (oldListener as any)[name] = undefined;
          }
        }
      }
    }

    if (on) {
      let listener: EventDict = (vnode as any).listener = (old as any).listener || new EventDict(emit);
      if (!oldOn) {
        for (name in on) {
          (listener as any)[name] = (on as any)[name];
          elm.addEventListener(name, listener, false);
        }
      } else {
        for (name in on) {
          if (!(listener as any)[name]) {
            elm.addEventListener(name, listener, false);
          }
          (listener as any)[name] = (on as any)[name];
        }
      }
    }
  }

  return {
    create: updateEventListener,
    update: updateEventListener,
    destroy: updateEventListener
  } as Module;
}

class EventDict {
  [key: string]: HandlerFnOrObject<Event, any>

  constructor(public emit: (a: any) => void) {
  }

  handleEvent(ev: Event) {
    let handler = this[ev.type];
    let me = runEvHandler(handler, ev);
    if (me != null) {
      this.emit(me);
    }
  }
}
