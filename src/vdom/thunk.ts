import { Thunk, ThunkData, ThunkComparator, Vnode } from './vnode'

function defaultComparator(oldData: ThunkData, currentData: ThunkData) {
  let oldArgs = oldData.args
  let currentArgs = currentData.args
  let i: number = oldArgs.length
  let same: boolean = i === currentArgs.length
  while (same && i--) {
    same = oldArgs[i] === currentArgs[i]
  }
  return same
}

export function thunk<T>(render: (state: T[]) => Vnode, state: T[], compare?: ThunkComparator): Thunk {
  let data: ThunkData
  let comparator: ThunkComparator = compare == undefined ? defaultComparator : compare
  let vnode: Thunk
  function thunkFn() {
    return render(state)
  }
  data = {
    fn: thunkFn
    , args: state
  }
  vnode = new Vnode(undefined, undefined, data, undefined, undefined, undefined) as Thunk
  vnode.compare = comparator
  return vnode
}