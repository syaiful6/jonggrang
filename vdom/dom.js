function createDocumentFragment() {
  return document.createDocumentFragment()
}

function createTextNode(text) {
  return document.createTextNode(text)
}

function createElement(tagName) {
  return document.createElement(tagName)
}

function createElementNS(ns, tag) {
  return document.createElementNS(ns, tag)
}

function activeElement() {
  return document.activeElement
}

function naiveAnimationFrame(cb) {
  return setTimeout(cb, 1000 / 60)
}

var rAF = typeof window.requestAnimationFrame !== 'undefined'
  ? window.requestAnimationFrame
  : naiveAnimationFrame

module.exports =
  { createDocumentFragment: createDocumentFragment
  , createTextNode: createTextNode
  , createElement: createElement
  , activeElement: activeElement
  , createElementNS: createElementNS
  , requestAnimationFrame: rAF }
