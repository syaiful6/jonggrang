const curry = require('../utils/curry')

function _hyperscript(h, tag, attrs, children) {
  if (Array.isArray(children[0])) children = children[0]
  var attributes = attrs.reduce(function(prev, current) {
    var key = current[0], value = current[1]
    prev[key] = value
    return prev
  }, {})
  return h.apply(h, [tag, attributes].concat(children))
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

module.exports = function (h) {
  var h = hyperscript(h),
    modules =
      { TAG_NAMES
      , h }
  return TAG_NAMES.reduce(function(prev, current) {
    prev[current] = h(current)
    return prev
  }, modules)
}
