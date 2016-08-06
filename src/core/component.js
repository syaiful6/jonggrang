const {stream} = require('mithril/util/stream')

module.exports = function component(streamView) {
  var vnode = {}
  vnode.oninit = function(vnode) {
    vnode.state.onupdate = stream()
    vnode.state.view = streamView
  }
  vnode.view = function(vnode) {
    return vnode.state.view()
  }
  vnode.onupdate = function(vnode) {
    return vnode.state.onupdate(vnode)
  }
  vnode.onbeforeupdate = function(vnode, old) {
    return old.instance != vnode.state.view()
  }
  return vnode
}
