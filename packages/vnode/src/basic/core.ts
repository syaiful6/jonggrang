import { VTree, VText, VDomType, VWidget } from '../types';
import { VDom, Thunk, VElem, VElemKeyed, Prop, KeyVDom } from './types';
import { thunk1, thunk2, thunk3 } from './thunk';
import {
  VProp, PropType, Property, Attribute, Handler, Ref, HandlerFnOrObject, LifeCycleCB
} from '../dom/prop';

/**
 * A short way to create element VNode that doesn't have namespace.
 */
export function h<A>(tag: string): VElem<A>;
export function h<A>(tag: string, children: VDom<A>[]): VElem<A>;
export function h<A>(tag: string, attr: Prop<A>[], children: VDom<A>[]): VElem<A>;
export function h<A>(tag: string, attr?: any, children?: any): VElem<A> {
  if (attr === undefined && children == undefined) {
    return VTree(VDomType.VELEM, tag, undefined, [], []);
  } else if (attr != null && children == undefined) {
    return VTree(VDomType.VELEM, tag, undefined, [], attr);
  } else {
    return VTree(VDomType.VELEM, tag, undefined, attr, children);
  }
}

/**
 * A smart constructor to create keyed element
 * @param tag
 */
export function k<A>(tag: string): VElemKeyed<A>;
export function k<A>(tag: string, childs: KeyVDom<A>[]): VElemKeyed<A>;
export function k<A>(tag: string, attrs: Prop<A>[], childs: KeyVDom<A>[]): VElemKeyed<A>;
export function k<A>(tag: string, attrs?: any, childs?: any): VElemKeyed<A> {
  if (attrs === undefined && childs === undefined) {
    return VTree(VDomType.VELEMKEYED, tag, undefined, [], []);
  } else if (attrs != null && childs === undefined) {
    return VTree(VDomType.VELEMKEYED, tag, undefined, [], childs);
  } else {
    return VTree(VDomType.VELEMKEYED, tag, undefined, attrs, childs);
  }
}

/**
 * Construct a text VDom
 * @param t string
 */
export function text(t: string): VText {
  return VTree(VDomType.VTEXT, t);
}

/**
 * Create a Property
 * @param k
 * @param v
 */
export function prop(k: string, v: any): Property {
  return VProp(PropType.PROPERTY, k, v);
}

export function attr(k: string, v: string): Attribute {
  return VProp(PropType.ATTRIBUTE, undefined, k, v);
}

/**
 * Attach a listener, it support EventHandler interface (object with handEvent function).
 * `Handler` here mean to not perform side effect, instead it take something from Event and
 * return it, this value will be passed to an emitter effect you are specify when we ready
 * to build DOM Node.
 * @param eventType
 * @param f
 */
export function on<A>(eventType: string, f: HandlerFnOrObject<A>): Handler<A> {
  return VProp(PropType.HANDLER, eventType, f);
}

/**
 * Similiar to `on` function, `ref` is `VDom`'s event, or other lib called this as `Hook`.
 * It allow you to be notified when the actual DOM Node was created or removed.
 * @param cb
 */
export function ref<A>(cb: LifeCycleCB<A>): Ref<A> {
  return VProp(PropType.REF, cb);
}

export function lazy<A, B>(a: A, render: (a: A) => VDom<B>): VWidget<Thunk<B>> {
  return VTree(VDomType.VWIDGET, thunk1(a, render));
}

export function lazy2<A, B, I>(a: A, b: B, render: (a: A, b: B) => VDom<I>): VWidget<Thunk<I>> {
  return VTree(VDomType.VWIDGET, thunk2(a, b, render));
}

export function lazy3<A, B, C, I>(a: A, b: B, c: C, render: (a: A, b: B, c: C) => VDom<I>): VWidget<Thunk<I>> {
  return VTree(VDomType.VWIDGET, thunk3(a, b, c, render));
}
