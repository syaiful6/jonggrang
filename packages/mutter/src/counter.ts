import { EventEmitter } from 'events';


export class Counter extends EventEmitter {
  private counterValue: number;
  constructor() {
    super();
    this.counterValue = 0;
  }

  increment() {
    this.counterValue++;
  }

  decrement() {
    if (--this.counterValue === 0) this.emit('zero');
  }

  isZero() {
    return (this.counterValue === 0);
  }

  onceZero(fn: () => void) {
    if (this.isZero()) return process.nextTick(fn);

    this.once('zero', fn);
  }
}
