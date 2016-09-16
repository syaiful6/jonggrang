interface Action {
  type: string
  payload?: any
  error?: boolean
  meta?: any
}

interface DefineActionProperty {
  payload?: (...args: any[]) => any
  meta?: (...args: any[]) => any
}

function identity<T>(a: T): T {
  return a
}

function defineAction(type: string, config?: DefineActionProperty) {
  let final = config && typeof config.payload === 'function' ? config.payload : identity
  return (...args: any[]): Action => {
    const hasError = args[0] instanceof Error
    let action: Action = {
      type: type
    }
    const payload = hasError ? args[0] : final(...args)
    if (!(payload === null || payload === undefined)) action.payload = payload
    if (hasError) action.error = true
    if (config && typeof config.meta === 'function') {
      action.meta = config.meta(...args)
    }
    return action
  }
}
