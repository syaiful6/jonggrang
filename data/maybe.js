// The `Maybe` type is used to represent optional values and can be seen as
// something like a type-safe `null`, where `Nothing` is `null` and `Just x`
// is the non-null value `x`.

// helper
function unaryPartial(fun, args, context) {
  return fun.bind.apply(fun, [context || this].concat([].slice.call(args)))
}

function constantTrue() {
  return true;
}

function constantFalse() {
  return false
}

function identity(a) {
  return a
}

function notImplemented(message) {
  return function () {
    throw new Error(message || 'operation not supported')
  }
}

function noop() {
  return this
}

// data Maybe a = Nothing | Just a
function Maybe() {}

function Just(a) {
  if (!(this instanceof Just)) {
    return new Just(a)
  }
  this.value = a
}
Just.prototype = Object.create(Maybe.prototype)
Just.prototype.constructor = Just

function Nothing() {
  if (!(this instanceof Nothing)) {
    return new Nothing()
  }
}
Nothing.prototype = Object.create(Maybe.prototype)
Nothing.prototype.constructor = Nothing

Maybe.Nothing = Nothing
Maybe.Just = Just

// Create a maybe from nullable x, if x is null or undefined, then return Nothing
// otherwise put the value on Just.
Maybe.fromNullable = fromNullable
Maybe.prototype.fromNullable = fromNullable
function fromNullable(x) {
  return x != null ? Just(x) : Nothing()
}

Maybe.maybe = maybe
Maybe.isNothing = maybe(constantTrue, constantFalse)
Maybe.isJust = maybe(constantFalse, constantTrue)

Nothing.prototype.concat = identity
Just.prototype.concat = function (b) {
  if (b.value == null) return this
  return fromNullable(this.value.concat(b.value))
}

Maybe.prototype.empty = function() {
  return Nothing()
}

// functor
Maybe.prototype.map = notImplemented('Maybe type not implement map method, instead use Just a | Nothing')
Nothing.prototype.map = function (fun) {
  return Nothing()
}
Just.prototype.map = function (fun) {
  return Just(fun(this.value))
}

Maybe.of = Just
Maybe.prototype.of = function (x) {
  return Just(x)
}

Nothing.prototype.ap = noop
Just.prototype.ap = function (b) {
  b.map(this.value)
}

Maybe.prototype.chain = notImplemented('Maybe type not implement chain method, instead use Just a | Nothing')
Nothing.prototype.chain = noop
Just.prototype.chain = function (fun) {
  return fun(this.value)
}

Maybe.prototype.traverse = notImplemented('Maybe type not implement traverse method, instead use Just a | Nothing')
Nothing.prototype.traverse = function (fun, point) {
  return point(Nothing())
}
Just.prototype.traverse = function (fun, point) {
  return fun(this.value).map(Just)
}

Nothing.prototype.reduce = function (fun) {
  return fun(null)
}
Just.prototype.reduce = function (fun, acc) {
  return fun(acc, this.value)
}

Nothing.prototype.toString = function () {
  return 'Nothing()'
}
Just.prototype.toString = function () {
  return 'Just(' + this.value + ')'
}

function maybe(whenNothing, whenJust, v) {
  if (arguments.length < 3) return unaryPartial(maybe, arguments)
  if (!(v instanceof Nothing) && !(v instanceof Just)) {
    throw new Error('invalid pattern supplied, maybe expect arguments 3 to be a Maybe')
  }
  return v instanceof Nothing ? whenNothing() : whenJust(v.value)
}

module.exports = Maybe
