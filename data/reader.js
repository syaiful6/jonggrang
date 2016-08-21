var always = require('ramda/src/always'),
  identity = require('rambda/src/identity')

function Reader(run) {
  if (!(this instanceof Reader)) {
    return new Reader(run)
  }
  this.run = run
}

Reader.of = function _of(a) {
  return Reader(always(a))
}

Reader.ask = Reader(identity)

Reader.prototype.chain = chain
function chain(fun) {
  var self = this
  return Reader(function (e) {
    return fun(self.run(e)).run(e)
  })
}

Reader.prototype.map = map
function map(fun) {
  return this.chain(function (a) {
    return Reader.of(fun(a))
  })
}

Reader.prototype.ap = ap
function ap(a) {
  return this.chain(function (f) {
    return a.map(f)
  })
}

Reader.ReaderT = function (M) {
  function ReaderT(run) {
    if (!(this instanceof ReaderT)) {
      return new ReaderT(run)
    }
    this.run = run
  }

  ReaderT.lift = function (m) {
    return ReaderT(always(m))
  }

  ReaderT.of = function (a) {
    return ReaderT(function (e) {
      return M.of(a)
    })
  }

  ReaderT.ask = ReaderT(function (e) {
    return M.of(e)
  })

  ReaderT.prototype.chain = function (fun) {
    var self = this
    return ReaderT(function (e) {
      return self.run(e).chain(function (a) {
        return fun(a).run(e)
      })
    })
  }

  return ReaderT
}

module.exports = Reader
