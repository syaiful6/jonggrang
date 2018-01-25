import { Machine, StrMap, emptyStrMap } from '../types';

export const enum PropType {
  ATTRIBUTE,
  PROPERTY,
  HANDLER,
  REF
}

export interface Attribute {
  tag: PropType.ATTRIBUTE;
  ns: string | undefined;
  key: string;
  value: string;
}

export interface Property {
  tag: PropType.PROPERTY;
  key: string;
  value: any;
}

export interface Handler<A> {
  tag: PropType.HANDLER;
  type: string;
  listener: HandlerFnOrObject<A>;
}

export interface Ref<A> {
  tag: PropType.REF;
  cb: LifeCycleCB<A>;
}

/**
 * Attributes and property of VDom.
 */
export type Prop<A>
  = Attribute
  | Property
  | Handler<A>
  | Ref<A>;

export interface LifeCycleCB<A> {
  (ref: ElemRef<Element>): A | void;
}

export interface HandlerFn<A> {
  (e: Event): A | void;
}

export interface HandlerObject<A> {
  handleEvent(e: Event): A | void;
}

export type HandlerFnOrObject<A> = HandlerFn<A> | HandlerObject<A>;

export interface ElemRef<A> {
  kind: 'created' | 'removed';
  value: A;
}

export function VProp<A>(tag: PropType.REF, cb: LifeCycleCB<A>): Ref<A>;
export function VProp<A>(tag: PropType.HANDLER, type: string, lis: HandlerFnOrObject<A>): Handler<A>;
export function VProp(tag: PropType.PROPERTY, key: string, value: any): Property;
export function VProp(tag: PropType.ATTRIBUTE, ns: string | undefined, key: string, value: string): Attribute;
export function VProp(tag: PropType, ns: any, key?: any, value?: any): any {
  let cb: any, listener: any, type: any, _key: any, _value: any, namespace: any;
  if (tag === PropType.REF) {
    cb = ns;
  } else if (tag === PropType.HANDLER) {
    type = ns;
    listener = key;
  } else if (tag === PropType.PROPERTY) {
    _key = ns;
    _value = key;
  } else {
    namespace = ns;
    _key = key;
    _value = value;
  }
  return {
    tag,
    ns: namespace,
    key: _key,
    value: _value,
    cb,
    type,
    listener
  };
}

export function mapProp<A, B>(f: (a: A) => B, prop: Prop<A>): Prop<B> {
  if (prop.tag === PropType.HANDLER) {
    const nlistener = (e: Event) => {
      let t = runEvHandler(prop.listener, e);
      if (t != null) {
        return f(t);
      }
      return t;
    };
    return VProp(PropType.HANDLER, prop.type, nlistener);
  } else if (prop.tag === PropType.REF) {
    const lcb: LifeCycleCB<B> = (el) => {
      let t = prop.cb(el);
      if (t != null) {
        return f(t);
      }
      return t;
    };
    return VProp(PropType.REF, lcb);
  } else {
    return prop;
  }
}

class PropMachine<A> implements Machine<Prop<A>[], void> {
  readonly result: void;

  constructor(
    private elem: Element,
    private events: EventDict,
    private sm: StrMap<Prop<A>>
  ) {
    this.result = void 0;
  }

  step(prop2: Prop<A>[]) {
    let nsm: StrMap<Prop<A>> = emptyStrMap();
    for (let i = 0, len = prop2.length; i < len; i++) {
      let p = prop2[i];
      let k = propToStr(p);
      if (this.sm[k] != null) {
        nsm[k] = diffProp(this.elem, this.events, this.sm[k], p);
      } else {
        nsm[k] = applyProp(this.elem, this.events.emit, this.events, p);
      }
    }

    for (let k in this.sm) {
      if (k in nsm) continue;
      removeProp(this.elem, this.events, this.sm[k]);
    }
    return new PropMachine(this.elem, this.events, nsm);
  }

  halt() {
    if (this.sm['ref'] != null) {
      let prop = this.sm['ref'];
      if (prop && prop.tag === PropType.REF) {
        let me = prop.cb({ kind: 'removed', value: this.elem });
        if (me != null) {
          this.events.emit(me);
        }
      }
    }
  }
}

export function buildProp<A>(emit: (a: A) => void) {
  return function propertyMachine(elem: Element, props: Prop<A>[]): Machine<Prop<A>[], void> {
    let events = new EventDict(emit);
    let sm: StrMap<Prop<A>> = emptyStrMap();
    for (let i = 0, len = props.length; i < len; i++) {
      let p = props[i];
      let k = propToStr(p);
      sm[k] = applyProp(elem, emit, events, p);
    }

    return new PropMachine(elem, events, sm);
  };
}

function applyProp<A>(
  elem: Element,
  emit: (a: A) => void,
  events: EventDict,
  prop: Prop<A>
) {
  if (prop.tag === PropType.PROPERTY) {
    if (prop.key === 'class' || prop.key === 'className') {
      applyClassName(elem, prop.value);
    } else {
      (elem as any)[prop.key] = prop.value;
    }
    return prop;
  } else if (prop.tag === PropType.ATTRIBUTE) {
    if (typeof prop.ns !== 'undefined') {
      elem.setAttributeNS(prop.ns, prop.key, prop.value);
    } else {
      elem.setAttribute(prop.key, prop.value);
    }
    return prop;
  } else if (prop.tag === PropType.HANDLER) {
    if (events[prop.type] == null) {
      events[prop.type] = prop.listener;
      elem.addEventListener(prop.type, events, false);
    } else {
      events[prop.type] = prop.listener;
    }
    return prop;
  } else if (prop.tag === PropType.REF) {
    let me = prop.cb({ kind: 'created', value: elem });
    if (me != null) {
      emit(me);
    }
    return prop;
  }
  return prop;
}

function applyClassName(elem: Element, cls: string, cls2?: string): void {
  if (cls2 == undefined) {
    const clsNames: string[] = cls === '' ? [] : cls.split(' ');
    for (let i = 0, len = clsNames.length; i < len; i++) {
      elem.classList.add(clsNames[i]);
    }
  } else {
    const clsNames: string[] = cls === '' ? [] : cls.split(' ');
    const clsNames2: string[] = cls2 === '' ? [] : cls2.split(' ');
    const imax = Math.max(clsNames.length, clsNames2.length);
    for (let i = 0; i < imax; i++) {
      if (i < clsNames.length) {
        if (clsNames2.indexOf(clsNames[i]) === -1) {
          elem.classList.remove(clsNames[i]);
        }
      }
      if (i < clsNames2.length) {
        if (clsNames.indexOf(clsNames2[i]) === -1) {
          elem.classList.add(clsNames2[i]);
        }
      }
    }
  }
}

function removeClassName(elem: Element, klass: string) {
  const clsNames: string[] = klass.split(' ');
  for (let i = 0, len = clsNames.length; i < len; i++) {
    elem.classList.remove(clsNames[i]);
  }
}

function diffProp<A>(
  elem: Element,
  events: EventDict,
  v1: Prop<A>,
  v2: Prop<A>
): Prop<A> {
  if (v1.tag === PropType.ATTRIBUTE && v2.tag === PropType.ATTRIBUTE) {
    if (v1.value !== v2.value) {
      if (typeof v2.ns !== 'undefined') {
        elem.setAttributeNS(v2.ns, v2.key, v2.value);
      } else {
        elem.setAttribute(v2.key, v2.value);
      }
      return v2;
    } else {
      return v2;
    }
  } else if (v1.tag === PropType.PROPERTY && v2.tag === PropType.PROPERTY) {
    if (v1.value === v2.value && v2.key !== 'value') {
      return v2;
    } else if (v2.key === 'class' || v1.key === 'className') {
      applyClassName(elem, v1.value, v2.value);
    } else if (v2.key === 'value') {
      let elval = (elem as any)['value'];
      if (elval !== v2.value) {
        (elem as any)[v2.key] = v2.value;
      }
      return v2;
    } else {
      (elem as any)[v2.key] = v2.value;
      return v2;
    }
  } if (v1.tag === PropType.HANDLER && v2.tag === PropType.HANDLER) {
    events[v2.type] = v2.listener;
    return v2;
  } else {

    return v2;
  }
}

function removeProp<A>(
  elem: Element,
  events: EventDict,
  prop: Prop<A>
) {
  if (prop.tag === PropType.ATTRIBUTE) {
    if (typeof prop.ns !== 'undefined') {
      elem.removeAttributeNS(prop.ns, prop.key);
    } else {
      elem.removeAttribute(prop.key);
    }
  } else if (prop.tag === PropType.PROPERTY) {
    if (prop.key === 'class' || prop.key === 'className') {
      removeClassName(elem, prop.value);
    } else if (typeof (elem as any)[prop.key] === 'string') {
      (elem as any)[prop.key] = '';
    } else {
      (elem as any)[prop.key] = undefined;
    }
  } else if (prop.tag === PropType.HANDLER) {
    elem.removeEventListener(prop.type, events, false);
    (events as any)[prop.type] = undefined;
  }
}

function propToStr<A>(prop: Prop<A>): string {
  return prop.tag === PropType.ATTRIBUTE && prop.ns !== undefined ? `attr/${prop.ns}:${prop.key}`
    : prop.tag === PropType.ATTRIBUTE ? `attr/:${prop.key}`
      : prop.tag === PropType.PROPERTY ? `prop/:${prop.key}`
        : prop.tag === PropType.HANDLER ? `handler/:${prop.type}`
          : 'ref';
}

class EventDict {
  [key: string]: HandlerFnOrObject<any>

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

function runEvHandler<A>(handler: HandlerFn<A> | HandlerObject<A> | null, event: Event): A | void {
  if (typeof handler === 'function') {
    return handler(event);
  } else if (handler && typeof handler.handleEvent === 'function') {
    return handler.handleEvent(event);
  }
}
