var curryN = require('ramda/src/curryN')

var attr = curryN(2, function (key, val) {
  return [key, val]
})

var attributeNames = [
  'accept', 'method', 'action', 'alt', 'aria', 'async', 'autofocus', 'capture',
  'checked', 'className', 'src', 'src doc', 'href', 'rel', 'readonly', 'align',
  'autocomplete', 'autoplay', 'bgcolor', 'border', 'buffered', 'challenge', 'cite',
  'code', 'codebase', 'color', 'cols', 'colspan', 'contenteditable', 'contextmenu',
  'controls', 'coords', 'data', 'disabled', 'download', 'draggable', 'dropzone',
  'enctype', 'form', 'formaction', 'headers', 'height', 'hidden', 'hreflang', 'id',
  'ismap', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'min', 'multiple',
  'muted', 'name', 'novalidate', 'open', 'optimum', 'pattern', 'ping', 'placeholder',
  'poster', 'preload', 'required', 'reversed', 'rows', 'rowspan', 'sandbox', 'scope',
  'scoped', 'seamless', 'selected', 'shape', 'size', 'value', 'sized', 'span', 'spellcheck',
  'srclang', 'srcset', 'start', 'step', 'style', 'summary', 'tabindex', 'target', 'title',
  'type', 'usemap', 'width', 'wrap'
]

module.exports = (function () {
  var exported = {
    key: attr('key') // not a dom attribute, but it used by most virtual dom engine
  }
  return attributeNames.reduce(function (mod, item) {
    mod[item] = attr(item)
    return mod
  }, exported)
})()
