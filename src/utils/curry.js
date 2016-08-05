const slice = Array.prototype.slice
const trimArrLength = (arr, len) => arr.length > len ? arr.slice(0, len) : arr

function toArray(a) {
  return slice.call(a)
}

function tail(a) {
  return slice.call(a, 1)
}

function concatArgs(a, b) {
  return a.concat(toArray(b))
}

function createFn(fn, args, totalArity) {
  let remainingArity = totalArity - args.length
  switch (remainingArity) {
    case 0:
      return function () {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 1:
      return function (a) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 2:
      return function (a, b) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 3:
      return function (a, b, c) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 4:
      return function (a, b, c, d) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 5:
      return function (a, b, c, d, e) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 6:
      return function (a, b, c, d, e, f) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 7:
      return function (a, b, c, d, e, f, g) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 8:
      return function (a, b, c, d, e, f, g, h) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 9:
      return function (a, b, c, d, e, f, g, h, i) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    case 10:
      return function (a, b, c, d, e, f, g, h, i, k) {
        return processInvocation(fn, concatArgs(args, arguments), totalArity)
      }
    default:
      return createEvalFn(fn, args, remainingArity)
  }
}

function makeArgList(len) {
  var container = [],
    i

  for (i = 0; i < len; i++) {
    container.push('a' + i)
  }
  return container.join(', ')
}

function createEvalFn(fn, args, arity) {
  var argList = makeArgList(arity),
    fnStr = 'false||' + 'function(' + argList + '){ return processInvocation(fn, concatArgs(args, arguments), arity); }'

  return eval(fnStr)
}

function processInvocation(fn, argsArr, totalArity) {
  var args = trimArrLength(argsArr, totalArity)
  return args.length === totalArity
    ? fn.apply(null, argsArr)
    : createFn(fn, argsArr, totalArity)
}

function curry(fn) {
  return createFn(fn, [], fn.length)
}

curry.to = curry(curryTo)

function curryTo(arity, fn) {
  return createEvalFn(fn, [], arity)
}

curry.adaptTo = curry(adaptTo)

function adaptTo(num, fn) {
  return curryTo(num, function (context) {
    const args = tail(arguments).concat(context)
    return fn.apply(this, args)
  })
}

module.exports = curry
