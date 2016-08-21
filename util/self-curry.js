module.exports = function selfCurry(fun, args, context) {
  return fun.bind.apply(fun, [context || this].concat([].slice.call(args)))
}
