export function createDocumentFragment(): DocumentFragment {
  return document.createDocumentFragment()
}

export function createTextNode(text: string): Text {
  return document.createTextNode(text)
}

export function createElement(tag: string): Element {
  return document.createElement(tag)
}

export function createElementNS(namespaceURI: string, qualifiedName: string): Element {
  return document.createElementNS(namespaceURI, qualifiedName)
}

export function activeElement(): Element {
  return document.activeElement
}
