const curry = require('ramda/src/curry')
const m = require('mithril/render/hyperscript')
const {extend} = require('../utils/common')
const {compose} = require('../control/combinator')

const isValidString = param => typeof param === 'string' && param.length > 0
const startsWith = (string, start) => string[0] === start
const isSelector = param => isValidString(param) && (startsWith(param, '.') || startsWith(param, '#'))
var isArray = Array.isArray || function(a) { return 'length' in a; };

function mapAttribute(attr) {
  return attr.reduce((prev, current) => {
    var key = current[0], value = current[1]
    prev[key] = value
    return prev
  }, {})
}

function addMethod(vdom) {
  return extend(vdom, {
    map: map(vdom)
  })
}

const map = curry(function(html, parentAction) {
  var childAction = html.__action__, action = parentAction
  if (childAction) {
    action = compose(parentAction, childAction)
  }
  return extend(html, {__action__: action})
})

function _hyperscript(tag) {
  return function (first, attributes, ...rest) {
    if (isSelector(first)) {
      return addMethod(m(tag + first, mapAttribute(attributes), ...rest))
    }
    if (typeof first === 'undefined') {
      return addMethod(m(tag))
    }
    var args = isArray(attributes) ? attributes : [attributes].concat(rest)
    return addMethod(m(tag, mapAttribute(first), ...args))
  }
}

const hyperscript = curry(_hyperscript)

const TAG_NAMES = [
  'a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base',
  'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption',
  'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'dfn', 'dir', 'div', 'dl',
  'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html',
  'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend',
  'li', 'link', 'main', 'map', 'mark', 'menu', 'meta', 'nav', 'noscript',
  'object', 'ol', 'optgroup', 'option', 'p', 'param', 'pre', 'q', 'rp', 'rt',
  'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span',
  'strong', 'style', 'sub', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot',
  'th', 'thead', 'title', 'tr', 'u', 'ul', 'video'
]

module.exports = (function () {
  var modules = {}
  return TAG_NAMES.reduce(function(prev, current) {
    prev[current] = hyperscript(current)
    return prev
  }, modules)
})()