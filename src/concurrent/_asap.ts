let len: number = 0
let scheduleFlush: () => void
let queue: any[] = Array(1000)

let browserMutationObserver = typeof MutationObserver !== 'undefined' ? MutationObserver : undefined
let isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]'

function useMutationObserver() {
  if (!browserMutationObserver) {
    throw new Error('mutation observer is not available')
  }
  let iterations = 0
  let observer = new browserMutationObserver(flush)
  let node = document.createTextNode('')
  observer.observe(node, { characterData: true })

  return function() {
    node.data = (iterations = ++iterations % 2).toString()
  }
}

function useSetTimeout() {
  return () => {
    setTimeout(flush, 1);
  }
}

function useSetImmediate() {
  return () => {
    setImmediate(flush)
  }
}

function useNextTick() {
  return () => {
    process.nextTick(flush)
  }
}

if (isNode) {
  scheduleFlush = useNextTick()
} else if (browserMutationObserver) {
  scheduleFlush = useMutationObserver()
} else if (typeof setImmediate !== 'undefined') {
  scheduleFlush = useSetImmediate()
} else {
  scheduleFlush = useSetTimeout()
}

export function asap(callback: any, arg?: any) {
  queue[len] = callback
  queue[len + 1] = arg
  len += 2
  if (len === 2) {
    scheduleFlush()
  }
}

function flush() {
  for (let i = 0; i < len; i += 2) {
    let callback = queue[i]
    let arg = queue[i + 1]

    callback(arg)

    queue[i] = undefined
    queue[i+1] = undefined
  }
  len = 0
}
