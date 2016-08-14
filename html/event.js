var curryN = require('ramda/src/curryN'),
  isArray = require('../util/is-array')

function arrInvoker(input, arr) {
  return function eventHandler() {
    if (!arr.length) return
    var msg = arr.length === 2 ? arr[0].call(this, arr[1]) : arr[0].apply(this, arr.slice(1))
    input(msg)
  }
}

function fnInvoker(input, fn) {
  return function eventHandler(ev) {
    return input(fn.call(this, ev))
  }
}

function eventHandler(key, input, action) {
  return [key, isArray(action) ? arrInvoker(input, action) : fnInvoker(input, action)]
}

function onKeyHandler(keyName, input, action) {
  return ['onkeyup', function keyUpHandler(ev) {
    if (ev.key.toLowerCase() === keyName.toLowerCase()) {
      input(action.call(this, ev))
    }
  }]
}

var handler = curryN(3, eventHandler)
var onKey = curryN(3, onKeyHandler)

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
