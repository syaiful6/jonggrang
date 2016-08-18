var map = require('../util/map')

function redrawer(callback) {
  var time = 16, last = 0, pending = null
  var timeout = typeof window.requestAnimationFrame === "function"
                ? window.requestAnimationFrame
                : window.setTimeout
  return function redraw(vnode) {
    var now = Date.now()
    if (last === 0 || now - last >= time) {
      last = now
      callback(vnode)
    } else if (pending === null) {
      pending = timeout(function () {
        pending = null
        callback(vnode)
        last = Date.now()
      }, time - (now - last))
    }
  }
}

function renderToDom(container, application) {
  var renderer = application.renderer(window)
  var run = redrawer(function runner(vnode) {
    renderer(container, vnode)
  })
  map(run, application.html)
}

module.exports = renderToDom
