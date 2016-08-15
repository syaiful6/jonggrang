var curryN = require('ramda/src/curryN'),
  isArray = require('../util/is-array')

function arrInvoker(arr) {
  return function eventHandler() {
    if (!arr.length) return
    var msg = arr.length === 2 ? arr[0].call(this, arr[1]) : arr[0].apply(this, arr.slice(1))
  }
}

function fnInvoker(fn) {
  return function eventHandler(ev) {
    return input(fn.call(this, ev))
  }
}

function eventHandler(key, action) {
  return [key, action]
}

function onKeyHandler(keyName, action) {
  return ['onkeyup', function keyUpHandler(ev) {
    if (ev.key.toLowerCase() === keyName.toLowerCase()) {
      return typeof action === 'function' ? action.call(this, ev) : arrInvoker(action)()
    }
  }]
}

var handler = curryN(2, eventHandler)
var onKey = curryN(2, onKeyHandler)

var eventNames = [
  "onClick", "onCopy", "onCut", "onPaste", "onCompositionEnd", "onCompositionStart",
  "onCompositionUpdate", "onKeydown", "onKeyPress", "onKeyUp", "onFocus", "onBlur",
  "onChange", "onInput", "onSubmit", "onClick", "onContextMenu", "onDblClick", "onDrag",
  "onDragEnd", "onDragEnter", "onDragExit", "onDragLeave", "onDragOver", "onDragStart",
  "onDrop", "onMouseDown", "onMouseEnter", "onMouseLeave", "onMouseMove", "onMouseOut",
  "onMouseOver", "onMouseUp", "onSelect", "onTouchCancel", "onTouchEnd", "onTouchMove",
  "onTouchStart", "onScroll", "onWheel", "onAbort", "onCanPlay", "onCanPlayThrough",
  "onDurationChange", "onEmptied", "onEncrypted", "onEnded", "onError", "onLoad",
  "onLoadedData", "onPause", "onPlay", "onPlaying", "onProgress", "onRateChange",
  "onSeeked", "onSeeking", "onStalled", "onSuspend", "onTimeUpdate", "onVolumeChange", "onWaiting"
]

module.exports = (function () {
  var exported =
    { handler: handler
    , onKey: onKey }

  return eventNames.reduce(function (mod, item) {
    mod[item] = handler(item.toLowerCase())
    return mod
  }, exported)
})()
