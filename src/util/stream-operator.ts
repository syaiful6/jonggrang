import {Stream, immediate, combine, endsOn} from 'flyd'

export function mergeAll<T>(streams: Stream<T>[]): Stream<T> {
  let s: Stream<T> = immediate(combine<T, T>((...args) => {
    let changed = args[args.length - 1]
    if (Array.isArray(changed)) {
      let depChanged = changed[0]
      return depChanged()
    }
    let deps = args.slice(0, args.length - 2) as Array<Stream<T>>
    let t: Stream<T> = args[args.length - 2] as Stream<T>
    for (let i = 0; i < deps.length; ++i) {
      t = deps[i] as Stream<T>
      if (!Array.isArray(t) && t.hasVal) {
        return t()
      }
    }
    return t()
  }, streams))
  endsOn(combine(() => true, streams.map(sm => sm.end)), s)
  return s
}
