'use strict';
const Task = require('../lib').Task;
const noop = () => {};
function printStatus(fn) {
  switch(%GetOptimizationStatus(fn)) {
    case 1: console.log('Function is optimized'); break;
    case 2: console.log('Function is not optimized'); break;
    case 3: console.log('Function is always optimized'); break;
    case 4: console.log('Function is never optimized'); break;
    case 6: console.log('Function is maybe deoptimized'); break;
    case 7: console.log('Function is optimized by TurboFan'); break;
    default: console.log('Unknown optimization status'); break;
  }
}

function defer(v) {
  return new Task(function (_, resolve) {
    process.nextTick(function () {
      resolve(v + 1)
    })
  })
}

const m = Task.of(1);

let ex = Task.of(1)
  .map(x => x + 1)
  .chain(defer)
  .ap(Task.of(x => x + 1))
  .fork(noop, noop);

%OptimizeFunctionOnNextCall(Task.of);
%OptimizeFunctionOnNextCall(m.map);
%OptimizeFunctionOnNextCall(m.chain);
%OptimizeFunctionOnNextCall(m.ap);
%OptimizeFunctionOnNextCall(m.fork);

printStatus(Task.of);
printStatus(m.map);
printStatus(m.chain);
printStatus(m.ap);
printStatus(m.fork);

Task.of(1)
  .map(x => x + 1)
  .chain(defer)
  .ap(Task.of(x => x + 1))
  .fork(noop, noop)

printStatus(Task.of);
printStatus(m.map);
printStatus(m.chain);
printStatus(m.ap);
printStatus(m.fork)
