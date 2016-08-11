var curryN = require('ramda/src/curryN'),
  camelize = require('../util/camelize')

function eventHandler(key, action) {
  return [key, function (input, parentAction) {
    return function (ev) {
      if ((key === 'onsubmit')
        || (key === 'onclick' && ev.currentTarget.nodeName.toLowerCase() === 'a')) {
          ev.preventDefault();
        }
      input(parentAction(action(ev)))
    }
  }]
}

function onKeyHandler(keyName, action) {
  return [key, function (input, parentAction) {
    return function (ev) {
      if (ev.key.toLowerCase() === keyName.toLowerCase()) {
        input(parentAction(action(ev)))
      }
    }
  }]
}

var handler = curryN(2, eventHandler)
var onKey = curryN(2, onKeyHandler)

var eventNames = [
  'click', 'copy', 'cut', 'paste', 'composition end', 'composition start',
  'composition update', 'keydown', 'key press', 'key up', 'focus', 'blur',
  'change', 'input', 'submit', 'click', 'context menu', 'dbl click', 'drag',
  'drag end', 'drag enter', 'drag exit', 'drag leave', 'drag over', 'drag start',
  'drop', 'mouse down', 'mouse enter', 'mouse leave', 'mouse move', 'mouse out',
  'mouse over', 'mouse up', 'select', 'touch cancel', 'touch end', 'touch move',
  'touch start', 'scroll', 'wheel', 'abort', 'can play', 'can play through',
  'duration change', 'emptied', 'encrypted', 'ended', 'error', 'load', 'loaded data',
  'pause', 'play', 'playing', 'progress', 'rate change', 'seeked', 'seeking', 'stalled',
  'suspend', 'time update', 'volume change', 'waiting'
]

module.exports = (function () {
  var exported =
    { handler: handler
    , onKey: onKey }

  return eventNames.reduce(function (mod, item) {
    var name = 'on ' + item
    mod[camelize(name)] = handler(name.replace(' ', ''))
    return mod
  }, exported)
})()
