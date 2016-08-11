var m = require('mithril/render/hyperscript'),
  merge = require('ramda/src/merge'),
  compose = require('ramda/src/compose')

function isValidString(param) {
  return typeof param === 'string' && param.length > 0
}

function startsWith(string, start) {
  return string[0] === start
}

function isSelector(param) {
  return isValidString(param) && (startsWith(param, '.') || startsWith(param, '#'))
}

function mapAttribute(attr) {
  return attr.reduce(function (prev, current) {
    var key = current[0], value = current[1]
    prev[key] = value
    return prev
  }, {})
}

function addMethod(vdom) {
  return merge(vdom, {
    map: mapVdom(vdom)
  })
}

function mapVdom(html) {
  return function map(parentAction) {
    var childAction = html.__action__, action = parentAction
    if (childAction) {
      action = compose(parentAction, childAction)
    }
    return merge(html, {__action__: action})
  }
}

function hyperscript(tag) {
  return function (first, attributes) {
    var len = arguments.length, rest = Array(len > 2 ? len - 2 : 0), i
    for (i = 2; i < len; i++) {
      rest[i - 2] = arguments[i]
    }

    if (tag === '@@component') {
      return addMethod(m.apply(undefined, [first, mapAttribute(attributes)].concat(rest)))
    }
    if (isSelector(first)) {
      return addMethod(m.apply(undefined, [tag + first, mapAttribute(attributes)].concat(rest)))
    }
    if (typeof first === 'undefined') {
      return addMethod(m(tag))
    }
    var args = [attributes].concat(rest)
    return addMethod(m.apply(undefined, [tag, mapAttribute(first)].concat(args)))
  }
}

var TAG_NAMES = [
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
  var initial = {
    component: hyperscript('@@component')
  }
  return TAG_NAMES.reduce(function (prev, current) {
    prev[current] = hyperscript(current)
    return prev
  }, initial)
})()
