declare module 'data.task' {

  interface TaskInterface<A, B> {
    fork(reject: (a: A) => void, resolve: (b: B) => void): any
    cleanup(resource: any): void

    of<F, R>(t: R): TaskInterface<F, R>

    map<T>(fn: (b: B) => T): TaskInterface<A, T>

    chain<T>(fn: (b: B) => TaskInterface<A, T>): TaskInterface<A, T>

    // hopely we never use this operation
    ap<R>(other: TaskInterface<A, R>): TaskInterface<A, B | R>
  }

  function Task<A, B>(computation: (reject: (a: A) => void, resolve: (b: A) => void) => any, cleanup: (c: any) => void) : TaskInterface<A, B>

  export = Task
}
