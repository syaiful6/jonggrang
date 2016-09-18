import { Stream, immediate, combine, endsOn } from 'flyd'

export function mergeAll<T>(streams: Stream<T>[]): Stream<T> {
  let s: Stream<T> = immediate(combine<T, T>((...args) => {
    let changed = args[args.length - 1]
    if (Array.isArray(changed) && changed.length > 0) {
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

export function foldr<A, B>(func: (a: A, b: B) => B, acc: B, stream: Stream<A>): Stream<B> {
  let cur = acc
  let out: Stream<B> = combine((s: Stream<A>) => {
    cur = func(s.val, cur)
    return cur
  }, [stream])
  if (!stream.hasVal) out(cur)
  return out
}