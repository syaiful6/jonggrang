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

module.exports =
  { createDocumentFragment: createDocumentFragment
  , createTextNode: createTextNode
  , createElement: createElement
  , activeElement: activeElement
  , createElementNS: createElementNS }
