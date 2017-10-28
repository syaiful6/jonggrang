// Document spec used by this lib
export interface DocumentSpec {
  createElement(ns: string | undefined, tag: string): Element;
  createTextNode(text: string): Node;
  setTextContent(node: Node, text: string): void;
  insertChildIx(ix: number, child: Node, parent: Node): void;
  removeChild(child: Node, parent: Node | null): void;
  parentNode(node: Node): Node | null;
}

export function createDocumentSpec(document: Document): DocumentSpec {
  function createElement(ns: string | undefined, tag: string): Element {
    return ns === undefined ? document.createElement(tag) : document.createElementNS(ns, tag);
  }
  function createTextNode(text: string): Node {
    return document.createTextNode(text);
  }
  return {
    createElement,
    createTextNode,
    setTextContent,
    insertChildIx,
    removeChild,
    parentNode
  };
}

function setTextContent(node: Node, text: string): void {
  node.textContent = text;
}

function insertChildIx(ix: number, child: Node, parent: Node): void {
  let n = parent.childNodes[ix] || null;
  if (n !== child) {
    parent.insertBefore(child, n);
  }
}

function removeChild(child: Node, parent: Node | null): void {
  if (parent && child.parentNode === parent) {
    parent.removeChild(child);
  }
}

function parentNode(node: Node): Node | null {
  return node.parentNode;
}
