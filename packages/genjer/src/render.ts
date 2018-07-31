import ClassModule from 'snabbdom/modules/class';
import PropsModule from 'snabbdom/modules/props';
import AttrsModule from 'snabbdom/modules/attributes';
import StyleModule from 'snabbdom/modules/style';
import DatasetModule from 'snabbdom/modules/dataset';
import { VNode } from './vnode';
import * as S from 'snabbdom';

import { createModuleListener } from './modules';

export function init<A>(emit: (_: A) => void): (old: VNode<A> | Element, vnode: VNode<A>) => VNode<A> {
  return S.init([
    ClassModule,
    PropsModule,
    AttrsModule,
    StyleModule,
    DatasetModule,
    createModuleListener(emit)
  ]) as any;
}
