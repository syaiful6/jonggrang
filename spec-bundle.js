(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.jonggrang = global.jonggrang || {})));
}(this, (function (exports) { 'use strict';

var isArray = Array.isArray;
var isPrimitive = function (x) {
    return typeof x === 'string' || typeof x === 'number';
};

var Vnode = function Vnode(tag, key, data, children, text, dom) {
    this.tag = tag;
    this.key = key;
    this.data = data;
    this.children = children;
    this.text = text;
    this.dom = dom;
    this.domSize = undefined;
    this.events = undefined;
    this.tagger = undefined;
    this.skip = undefined;
    this.node = undefined;
};
Vnode.normalize = function normalize (node) {
    if (isArray(node)) {
        return new Vnode('[', undefined, undefined, node, undefined, undefined);
    }
    else if (typeof node === 'string') {
        return Vnode.createTextVNode(node);
    }
    return node;
};
Vnode.normalizeChildren = function normalizeChildren (children) {
    var item;
    var normalized = [];
    for (var i = 0; i < children.length; i++) {
        item = children[i];
        if (typeof item === 'boolean' || item == null) {
            continue;
        }
        if (typeof item === 'number' || typeof item === 'string') {
            item = String(item);
            normalized[i] = Vnode.normalize(item);
        }
        else {
            normalized[i] = Vnode.normalize(item);
        }
    }
    return normalized;
};
Vnode.prototype.map = function map (tagger) {
    var vnode = new Vnode(undefined, undefined, undefined, [this], undefined, undefined);
    vnode.tagger = tagger;
    return vnode;
};
Vnode.createTextVNode = function createTextVNode (text) {
    return new Vnode('#', undefined, undefined, text, undefined, undefined);
};

var h = function (tag, b, c) {
    var data = {};
    var children;
    var childlist;
    var text;
    if (arguments.length === 3) {
        data = b;
        if (Array.isArray(c)) {
            children = c;
        }
        else if (isPrimitive(c)) {
            children = [c];
        }
        else {
            data = b;
        }
    }
    else if (arguments.length === 2) {
        if (Array.isArray(b)) {
            children = b;
        }
        else if (isPrimitive(b)) {
            children = [b];
        }
        else {
            data = b;
        }
    }
    if (Array.isArray(children)) {
        childlist = Vnode.normalizeChildren(children);
    }
    if (Array.isArray(childlist) && childlist.length === 1 && childlist[0] != null) {
        var textNode = childlist[0];
        if (textNode instanceof Vnode && textNode.tag === '#' && typeof textNode.children === 'string') {
            text = textNode.children;
            childlist = undefined;
        }
    }
    var hashIdx = tag.indexOf('#');
    var dotIdx = tag.indexOf('.', hashIdx);
    var hash = hashIdx > 0 ? hashIdx : tag.length;
    var dot = dotIdx > 0 ? dotIdx : tag.length;
    var sel = hashIdx !== -1 || dotIdx !== -1 ? tag.slice(0, Math.min(hash, dot)) : tag;
    var className = data.class || data.className;
    if (dotIdx > 0 && className === undefined) {
        data.className = tag.slice(dot + 1).replace(/\./g, ' ');
    }
    if (hash < dot) {
        data.id = tag.slice(hash + 1, dot);
    }
    if (className !== undefined) {
        if (data.class !== 'undefined') {
            data.class = undefined;
            data.className = className;
        }
        if (dotIdx > 0) {
            data.className = tag.slice(dot + 1).replace(/\./g, ' ') + className;
        }
    }
    return new Vnode(sel, data && data.key, data, childlist, text, undefined);
};

function getChild(vnode, index) {
    if (typeof vnode === 'string') {
        return h('div#error');
    }
    return vnode
        && vnode.children
        && vnode.children.length >= index + 1
        && vnode.children[index]
        || h('div#error');
}
describe('hyperscript', function () {
    describe('selector', function () {
        it('can create vnode with proper tag', function () {
            var vnode = h('button');
            expect(vnode.tag).toEqual('button');
        });
        it('can create vnode with class in selector', function () {
            var vnode = h('button.primary');
            expect(vnode.tag).toEqual('button');
            expect(vnode.data.className).toEqual('primary');
        });
        it('can create vnode with many classes in selector', function () {
            var vnode = h('button.primary.button.hello');
            expect(vnode.tag).toEqual('button');
            expect(vnode.data.className).toEqual('primary button hello');
        });
        it('can create vnode with id in selector', function () {
            var vnode = h('button#btn');
            expect(vnode.tag).toEqual('button');
            expect(vnode.data.id).toEqual('btn');
        });
        it('can create vnode with mixed selector', function () {
            var vnode = h('button#btn.primary');
            expect(vnode.tag).toEqual('button');
            expect(vnode.data.id).toEqual('btn');
            expect(vnode.data.className).toEqual('primary');
        });
    });
    describe('vnode data', function () {
        it('handles falsy string data', function () {
            var vnode = h('div', { className: '' });
            expect(vnode.data.className).toEqual('');
        });
        it('handle boolean data', function () {
            var vnode = h('input', { readonly: true });
            expect(vnode.data.readonly).toEqual(true);
        });
        it('handle key in vnode data', function () {
            var vnode = h('li', { key: 1 });
            expect(vnode.key).toEqual(1);
            expect(vnode.tag).toEqual('li');
        });
    });
    describe('children', function () {
        it('can create vnode with children', function () {
            var vnode = h('div', [h('span#hello'), h('b.world')]);
            expect(vnode.tag).toEqual('div');
            expect(getChild(vnode, 0).tag).toEqual('span');
            expect(getChild(vnode, 1).tag).toEqual('b');
        });
        it('handle single string children', function () {
            var vnode = h('div', ['foo']);
            expect(vnode.text).toEqual('foo');
        });
        it('handle single numeric children', function () {
            var vnode = h('div', 1);
            expect(vnode.text).toEqual('1');
        });
        it('handle vnode with props and text content in string', function () {
            var vnode = h('div', {}, 'hello');
            expect(vnode.text).toEqual('hello');
        });
    });
});

function createDocumentFragment() {
    return document.createDocumentFragment();
}
function createTextNode(text) {
    return document.createTextNode(text);
}
function createElement$1(tag) {
    return document.createElement(tag);
}
function createElementNS(namespaceURI, qualifiedName) {
    return document.createElementNS(namespaceURI, qualifiedName);
}
function activeElement() {
    return document.activeElement;
}

function createNodes(parent, vnodes, start, end, eventNode, nextSibling, ns) {
    var vnode;
    for (var i = start; i < end; i++) {
        vnode = vnodes[i];
        if (vnode != null) {
            insertNode(parent, createNode(vnode, eventNode, ns), nextSibling);
        }
    }
}
function createNode(vnode, eventNode, ns) {
    var tag = vnode.tag;
    if (typeof tag === 'string') {
        switch (tag) {
            case '#': return createText(vnode);
            case '<': return createHTML(vnode);
            case '[': return createFragment(vnode, eventNode, ns);
            default:
                return createElement(vnode, eventNode, ns);
        }
    }
    if (vnode.data != null && typeof vnode.data.fn === 'function') {
        return createThunk(vnode, eventNode, ns);
    }
    if (typeof vnode.tagger === 'function') {
        return createTagger(vnode, eventNode, ns);
    }
    throw new Error('invalid virtual node received');
}
function createText(vnode) {
    return vnode.dom = createTextNode(vnode.children);
}
function createHTML(vnode) {
    if (typeof vnode.children === 'string') {
        var match = vnode.children.match(/^\s*?<(\w+)/im) || [];
        var table = {
            caption: 'table',
            thead: 'table',
            tbody: 'table',
            tfoot: 'table',
            tr: 'tbody',
            th: 'tr',
            td: 'tr',
            colgroup: 'table',
            col: 'colgroup'
        };
        var parent = table[match[1]] || 'div';
        var temp = createElement$1(String(parent));
        temp.innerHTML = vnode.children;
        vnode.dom = temp.firstChild;
        vnode.domSize = temp.childNodes.length;
        var fragment = createDocumentFragment();
        var child;
        while (child = temp.firstChild) {
            fragment.appendChild(child);
        }
        return fragment;
    }
    throw new Error('trying to create vnode HTML with invalid vnode type');
}
function createFragment(vnode, eventNode, ns) {
    var fragment = createDocumentFragment();
    if (vnode.children != null && Array.isArray(vnode.children)) {
        var children = vnode.children;
        createNodes(fragment, children, 0, children.length, eventNode, null, ns);
    }
    vnode.dom = fragment.firstChild;
    vnode.domSize = fragment.childNodes.length;
    return fragment;
}
function createElement(vnode, eventNode, ns) {
    var tag = vnode.tag;
    var data = vnode.data;
    switch (tag) {
        case 'svg':
            ns = 'http://www.w3.org/2000/svg';
            break;
        case 'math':
            ns = 'http://www.w3.org/1998/Math/MathML';
            break;
    }
    var element = ns ? createElementNS(ns, tag) : createElement$1(tag);
    vnode.dom = element;
    if (data != null) {
        setAttrs(vnode, eventNode, data, ns);
    }
    if (vnode.text != null) {
        if (vnode.text !== '')
            element.textContent = vnode.text;
        else
            vnode.children = [new Vnode('#', undefined, undefined, vnode.text, undefined, undefined)];
    }
    if (vnode.children != null) {
        var children = vnode.children;
        createNodes(element, children, 0, children.length, eventNode, null, ns);
        setLateAttrs(vnode, eventNode);
    }
    return element;
}
function createThunk(thunk, eventNode, ns) {
    var data = thunk.data;
    var vnode = Vnode.normalize(data.fn());
    var elm = createNode(vnode, eventNode, ns);
    thunk.node = vnode;
    thunk.dom = vnode.dom;
    thunk.domSize = vnode.domSize;
    return elm;
}
function createTagger(vnode, eventNode, ns) {
    if (Array.isArray(vnode.children)) {
        var ref = getVnodeTagger(vnode);
        var tagger = ref.tagger;
        var children = ref.children;
        var subNode = {
            tagger: tagger,
            parent: eventNode
        };
        children = Vnode.normalize(children);
        var elm = createNode(children, subNode, ns);
        vnode.node = children;
        vnode.dom = children.dom;
        vnode.domSize = children.domSize;
        return elm;
    }
    throw new Error('invalid vnode tagger given');
}
function vnodeHasKey(vnode) {
    return vnode != null && vnode.key != null;
}
function updateNodes(parent, old, vnodes, eventNode, nextSibling, ns) {
    if (old === vnodes || old == null && vnodes == null)
        return;
    else if (old == null && Array.isArray(vnodes))
        createNodes(parent, vnodes, 0, vnodes.length, eventNode, nextSibling, undefined);
    else if (vnodes == null && Array.isArray(old))
        removeNodes(parent, old, 0, old.length);
    else if (Array.isArray(old) && Array.isArray(vnodes)) {
        if (old.length === vnodes.length && vnodeHasKey(vnodes[0])) {
            for (var i = 0; i < old.length; i++) {
                if (old[i] === vnodes[i] || old[i] == null && vnodes[i] == null)
                    continue;
                else if (old[i] == null)
                    insertNode(parent, createNode(vnodes[i], eventNode, ns), getNextSibling(old, i + 1, nextSibling));
                else if (vnodes[i] == null)
                    removeNodes(parent, old, i, i + 1);
                else
                    updateNode(parent, old[i], vnodes[i], eventNode, getNextSibling(old, i + 1, nextSibling), ns);
            }
        }
        else {
            var oldStart = 0;
            var start = 0;
            var oldEnd = old.length - 1;
            var end = vnodes.length - 1;
            var map;
            while (oldEnd >= oldStart && end >= start) {
                var o = old[oldStart];
                var v = vnodes[start];
                if (o === v) {
                    oldStart++;
                    start++;
                }
                else if (o != null && v != null && o.key === v.key) {
                    oldStart++;
                    start++;
                    updateNode(parent, o, v, eventNode, getNextSibling(old, oldStart, nextSibling), ns);
                }
                else {
                    var o$1 = old[oldEnd];
                    if (o$1 === v) {
                        oldEnd--;
                        start++;
                    }
                    else if (o$1 != null && v != null && o$1.key === v.key) {
                        updateNode(parent, o$1, v, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), ns);
                        if (start < end)
                            insertNode(parent, toFragment(o$1), getNextSibling(old, oldStart, nextSibling));
                        oldEnd--;
                        start++;
                    }
                    else {
                        break;
                    }
                }
            }
            while (oldEnd >= oldStart && end >= start) {
                var o$2 = old[oldEnd], v$1 = vnodes[end];
                if (o$2 === v$1) {
                    oldEnd--;
                    end--;
                }
                else if (o$2 != null && v$1 != null && o$2.key === v$1.key) {
                    updateNode(parent, o$2, v$1, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), ns);
                    if (o$2.dom != null) {
                        nextSibling = o$2.dom;
                    }
                    oldEnd--;
                    end--;
                }
                else {
                    if (!map)
                        map = getKeyMap(old, oldEnd);
                    if (v$1 != null) {
                        var oldIndex = map[v$1.key];
                        if (oldIndex != null) {
                            var movable = old[oldIndex];
                            updateNode(parent, movable, v$1, eventNode, getNextSibling(old, oldEnd + 1, nextSibling), ns);
                            insertNode(parent, toFragment(movable), nextSibling)(old)[oldIndex].skip = true;
                            if (movable.dom != null) {
                                nextSibling = movable.dom;
                            }
                        }
                        else {
                            var dom = createNode(v$1, eventNode, undefined);
                            insertNode(parent, dom, nextSibling);
                            nextSibling = dom;
                        }
                    }
                    end--;
                }
                if (end < start)
                    break;
            }
            createNodes(parent, vnodes, start, end + 1, eventNode, nextSibling, ns);
            removeNodes(parent, old, oldStart, oldEnd + 1);
        }
    }
}
function updateNode(parent, old, vnode, eventNode, nextSibling, ns) {
    var oldTag = old.tag;
    var tag = vnode.tag;
    if (oldTag === tag && typeof oldTag === 'string') {
        vnode.events = old.events;
        switch (tag) {
            case '#':
                updateText(old, vnode);
                break;
            case '<':
                updateHTML(parent, old, vnode, nextSibling);
                break;
            case '[':
                updateFragment(parent, old, vnode, eventNode, nextSibling, ns);
                break;
            default: updateElement(old, vnode, eventNode, ns);
        }
    }
    else if (old.data != null && typeof old.data.fn === 'function'
        && vnode.data != null && typeof vnode.data.fn === 'function') {
        updateThunk(parent, old, vnode, eventNode, nextSibling);
    }
    else if (typeof vnode.tagger === 'function' && typeof old.tagger === 'function') {
        updateTagger(parent, old, vnode, eventNode, nextSibling);
    }
    else {
        removeNode(parent, old);
        insertNode(parent, createNode(vnode, eventNode, undefined), nextSibling);
    }
}
function updateText(old, vnode) {
    if (old.children.toString() !== vnode.children.toString()) {
        old.dom.nodeValue = vnode.children;
    }
    vnode.dom = old.dom;
}
function updateHTML(parent, old, vnode, nextSibling) {
    if (old.children !== vnode.children) {
        toFragment(old);
        insertNode(parent, createHTML(vnode), nextSibling);
    }
    else {
        vnode.dom = old.dom;
        vnode.domSize = old.domSize;
    }
}
function updateFragment(parent, old, vnode, eventNode, nextSibling, ns) {
    updateNodes(parent, old.children, vnode.children, eventNode, nextSibling, ns);
    var domSize = 0;
    var children = vnode.children;
    vnode.dom = undefined;
    if (children != null) {
        for (var i = 0; i < children.length; ++i) {
            var child = children[i];
            if (child != null && child.dom != null) {
                if (vnode.dom == null)
                    vnode.dom = child.dom;
                domSize += child.domSize || 1;
            }
        }
        if (domSize !== 1)
            vnode.domSize = domSize;
    }
}
function updateElement(old, vnode, eventNode, ns) {
    var element = vnode.dom = old.dom;
    switch (vnode.tag) {
        case 'svg':
            ns = 'http://www.w3.org/2000/svg';
            break;
        case 'math':
            ns = 'http://www.w3.org/1998/Math/MathML';
            break;
    }
    if (vnode.tag === 'textarea') {
        if (vnode.data == null)
            vnode.data = {};
        if (vnode.text != null)
            vnode.data.value = vnode.text; //FIXME handle multiple children
    }
    updateAttrs(vnode, eventNode, old.data, vnode.data, ns);
    if (old.text != null && vnode.text != null && vnode.text !== '') {
        if (old.text.toString() !== vnode.text.toString())
            old.dom.firstChild.nodeValue = vnode.text;
    }
    else {
        if (old.text != null)
            old.children = [new Vnode('#', undefined, undefined, old.text, undefined, old.dom.firstChild)];
        if (vnode.text != null)
            vnode.children = [new Vnode('#', undefined, undefined, vnode.text, undefined, undefined)];
        updateNodes(element, old.children, vnode.children, eventNode, null, ns);
    }
}
function updateThunk(parent, old, vnode, eventNode, nextSibling) {
    if (vnode.compare(old.data, vnode.data)) {
        vnode.node = old.node;
        return;
    }
    var data = vnode.data;
    // thunk args or the fn has beed changed
    var node = Vnode.normalize(data.fn());
    updateNode(parent, old.node, node, eventNode, nextSibling, undefined);
    vnode.node = node;
    vnode.dom = node.dom;
    vnode.domSize = node.domSize;
}
function updateTagger(parent, old, vnode, eventNode, nextSibling) {
    var ref = getVnodeTagger(vnode);
    var tagger = ref.tagger;
    var children = ref.children;
    var oldInfo = getVnodeTagger(old);
    var nesting = tagger.length > 1 || oldInfo.tagger.length > 1;
    if (nesting && oldInfo.tagger.length !== tagger.length) {
        removeNode(parent, old);
        insertNode(parent, createNode(vnode, eventNode, undefined), nextSibling);
        return;
    }
    var subEventNode = {
        tagger: tagger,
        parent: eventNode
    };
    children = Vnode.normalize(children);
    updateNode(parent, oldInfo.children, children, subEventNode, nextSibling, undefined);
    vnode.dom = children.dom;
    vnode.domSize = children.domSize;
}
function insertNode(parent, node, nextSibling) {
    if (nextSibling && nextSibling.parentNode) {
        parent.insertBefore(node, nextSibling);
    }
    else {
        parent.appendChild(node);
    }
}
function removeNodes(parent, vnodes, start, end) {
    var vnode;
    var i;
    for (i = start; i < end; i++) {
        vnode = vnodes[i];
        if (vnode != null) {
            if (vnode.skip)
                vnode.skip = undefined;
            removeNode(parent, vnode);
        }
    }
}
function removeNode(parent, vnode) {
    var count;
    var dom = vnode.dom;
    if (dom) {
        count = vnode.domSize || 1;
        if (count > 1) {
            while (--count) {
                parent.removeChild(dom.nextSibling);
            }
        }
        if (dom.parentNode != null)
            parent.removeChild(dom);
    }
}
function getKeyMap(vnodes, end) {
    var map = {};
    var vnode;
    var key;
    var i = 0;
    for (i = 0; i < end; i++) {
        vnode = vnodes[i];
        if (vnode != null) {
            key = vnode.key;
            if (key != null)
                map[key] = i;
        }
    }
    return map;
}
function getVnodeTagger(vnode) {
    if (typeof vnode.tagger === 'function') {
        var tagger = [vnode.tagger];
        var current = vnode.children[0];
        while (typeof current.tagger === 'function') {
            tagger = [current.tagger].concat(tagger);
            if (Array.isArray(current.children) && current.children[0] != null) {
                current = current.children[0];
            }
            else {
                break;
            }
        }
        return {
            tagger: tagger,
            children: current
        };
    }
    else {
        throw new Error('invalid vnode passed');
    }
}
function setAttrs(vnode, eventNode, data, ns) {
    for (var key in data) {
        setAttr(vnode, eventNode, key, null, data[key], ns);
    }
}
function updateAttrs(vnode, eventNode, old, data, ns) {
    var key;
    if (data != null) {
        for (key in data) {
            setAttr(vnode, eventNode, key, old && old[key], data[key], ns);
        }
    }
    if (old != null) {
        for (key in old) {
            if (data == null || !(key in data)) {
                if (key[0] === 'o' && key[1] === 'n')
                    updateEvent(vnode, eventNode, key, undefined);
                else if (key !== 'key')
                    vnode.dom.removeAttribute(key);
            }
        }
    }
}
function setAttr(vnode, eventNode, key, old, value, ns) {
    var element = vnode.dom;
    if (key === 'key' || (old === value && !isFormAttribute(vnode, key))
        && typeof value !== 'object' || typeof value === 'undefined') {
        return;
    }
    var nsLastIndex = key.indexOf(':');
    if (nsLastIndex > -1 && key.substr(0, nsLastIndex) === 'xlink') {
        element.setAttributeNS('http://www.w3.org/1999/xlink', key.slice(nsLastIndex + 1), value);
    }
    else if (key[0] === 'o' && key[1] === 'n' && typeof value === 'function' || Array.isArray(value))
        updateEvent(vnode, eventNode, key, value);
    else if (key === 'style')
        updateStyle(element, old, value);
    else if (key === 'dataset')
        updateDataset(element, old, value);
    else if (key in element && !isAttribute(key) && ns === undefined) {
        //setting input[value] to same value by typing on focused element moves cursor to end in Chrome
        if (vnode.tag === 'input' && key === 'value' && element.value === value && vnode.dom === activeElement())
            return;
        element[key] = value;
    }
    else {
        if (typeof value === 'boolean') {
            if (value)
                element.setAttribute(key, '');
            else
                element.removeAttribute(key);
        }
        else
            element.setAttribute(key === 'className' ? 'class' : key, value);
    }
}
function setLateAttrs(vnode, eventNode) {
    var data = vnode.data;
    if (typeof vnode.tag === 'string' && vnode.tag === 'select' && data != null) {
        if ('value' in data)
            setAttr(vnode, eventNode, 'value', null, data.value, undefined);
        if ('selectedIndex' in data)
            setAttr(vnode, eventNode, 'selectedIndex', null, data.selectedIndex, undefined);
    }
}
function isFormAttribute(vnode, attr) {
    return attr === 'value' || attr === 'checked' || attr === 'selectedIndex' || attr === 'selected' && vnode.dom === activeElement();
}
function isAttribute(attr) {
    return attr === 'href' || attr === 'list' || attr === 'form'; // || attr === 'type' || attr === 'width' || attr === 'height'
}
function toFragment(vnode) {
    var count = vnode.domSize;
    if (count != null || vnode.dom == null) {
        var fragment = createDocumentFragment();
        if (count > 0) {
            var dom = vnode.dom;
            while (--count)
                fragment.appendChild(dom.nextSibling);
            fragment.insertBefore(dom, fragment.firstChild);
        }
        return fragment;
    }
    else
        return vnode.dom;
}
function getNextSibling(vnodes, i, nextSibling) {
    var vnode;
    for (; i < vnodes.length; i++) {
        vnode = vnodes[i];
        if (vnode != null && vnode.dom != null)
            return vnode.dom;
    }
    return nextSibling;
}
//style
function updateStyle(element, old, style) {
    if (old === style) {
        element.style.cssText = '';
        old = null;
    }
    if (style == null) {
        element.style.cssText = '';
    }
    else if (typeof style === 'string') {
        element.style.cssText = style;
    }
    else {
        if (typeof old === 'string')
            element.style.cssText = '';
        for (var key in style) {
            element.style[key] = style[key];
        }
        if (old != null && typeof old !== 'string') {
            for (var key$1 in old) {
                if (!(key$1 in style))
                    element.style[key$1] = '';
            }
        }
    }
}
function updateDataset(element, old, dataset) {
    if (!old && !dataset)
        return;
    var oldDataset = old || {};
    var current = dataset || {};
    var key;
    for (key in oldDataset) {
        if (!current[key]) {
            delete element.dataset[key];
        }
    }
    for (key in current) {
        if (oldDataset[key] !== current[key]) {
            element.dataset[key] = current[key];
        }
    }
}
function invokeArrayHandler(handler, dom, event) {
    return handler.length === 2
        ? handler[0].call(dom, handler[1], event)
        : handler[0].apply(dom, handler.slice(1).concat(event));
}
function sendHtmlSignal(msg, eventNode) {
    var currentEventNode = eventNode;
    var tagger;
    while (currentEventNode) {
        tagger = currentEventNode.tagger;
        if (Array.isArray(tagger)) {
            for (var i = tagger.length; i--;) {
                msg = tagger[i](msg);
            }
        }
        else {
            msg = tagger(msg);
        }
        if (currentEventNode.parent != null)
            currentEventNode = currentEventNode.parent;
        else
            break;
    }
    return msg;
}
//event
function updateEvent(vnode, eventNode, key, value) {
    var element = vnode.dom;
    function listener(event) {
        if (typeof value === 'function' || Array.isArray(value)) {
            var msg = Array.isArray(value) ? invokeArrayHandler(value, element, event) : value.call(element, event);
            sendHtmlSignal(msg, eventNode);
        }
    }
    if (key in element)
        element[key] = listener;
    else {
        var eventName = key.slice(2);
        if (vnode.events === undefined)
            vnode.events = {};
        if (vnode.events[eventName] != null)
            element.removeEventListener(eventName, vnode.events[eventName], false);
        else if (typeof value === 'function' || Array.isArray(value)) {
            vnode.events[eventName] = listener;
            element.addEventListener(eventName, vnode.events[eventName], false);
        }
    }
}
function render(eventNode) {
    return function (dom, vnodes) {
        var active = activeElement();
        if (dom.vnodes == null)
            dom.textContent = '';
        if (!Array.isArray(vnodes))
            vnodes = [vnodes];
        updateNodes(dom, dom.vnodes, Vnode.normalizeChildren(vnodes), eventNode, null, undefined);
        dom.vnodes = vnodes;
        if (activeElement() !== active) {
            active.focus();
        }
    };
}

function noop() { }
describe('virtual dom', function () {
    describe('dom attribute', function () {
        var parent;
        var render$$;
        beforeEach(function () {
            parent = document.createElement('div');
            render$$ = render({ tagger: noop, parent: null });
        });
        it('when input readonly is true, attribute is present', function () {
            var vnode = h('input.input', { readonly: true });
            render$$(parent, vnode);
            expect(vnode.dom.attributes["readonly"].nodeValue).toEqual('');
        });
        it('when input readonly is false, attribute not present', function () {
            var vnode = h('input.input', { readonly: false });
            render$$(parent, vnode);
            expect(vnode.dom.attributes["readonly"]).toBeUndefined();
        });
        it('when input checked is true, attribute is not present', function () {
            var vnode = h('input.input', { checked: true });
            render$$(parent, vnode);
            expect(vnode.dom.checked).toEqual(true);
            expect(vnode.dom.attributes['checked']).toBeUndefined();
        });
        it('when input checked is false, attribute is not present', function () {
            var vnode = h('input.input', { checked: false });
            render$$(parent, vnode);
            expect(vnode.dom.checked).toEqual(false);
            expect(vnode.dom.attributes['checked']).toBeUndefined();
        });
    });
    describe('vnode text', function () {
        var parent;
        var render$$;
        beforeEach(function () {
            parent = document.createElement('div');
            render$$ = render({ tagger: noop, parent: null });
        });
        it('can render numeric like string', function () {
            var vnode = new Vnode('#', undefined, undefined, '0', undefined, undefined);
            render$$(parent, [vnode]);
            expect(vnode.dom.nodeName === '#text' && vnode.dom.nodeValue === '0').toEqual(true);
        });
        it('can render empty string', function () {
            var vnode = new Vnode('#', undefined, undefined, '', undefined, undefined);
            render$$(parent, [vnode]);
            expect(vnode.dom.nodeName === '#text' && vnode.dom.nodeValue === '').toEqual(true);
        });
        it('can render boolean', function () {
            var vnode = new Vnode('#', undefined, undefined, 'true', undefined, undefined);
            render$$(parent, [vnode]);
            expect(vnode.dom.nodeName === '#text' && vnode.dom.nodeValue === 'true').toEqual(true);
        });
    });
    describe('vdom event', function () {
        var parent;
        var render$$;
        var clickHandler;
        var tagger;
        beforeEach(function () {
            parent = document.createElement('div');
            tagger = {
                tagger: noop,
                parent: null
            };
            spyOn(tagger, 'tagger');
            render$$ = render(tagger);
            clickHandler = jasmine.createSpy('clickHandler').and.returnValue('msg');
        });
        it('handles onclick', function () {
            var vdom = h('button', { onclick: clickHandler });
            var event = document.createEvent("MouseEvents");
            event.initEvent('click', true, true);
            render$$(parent, [vdom]);
            vdom.dom.dispatchEvent(event);
            expect(clickHandler).toHaveBeenCalledWith(event);
            expect(tagger.tagger).toHaveBeenCalledWith('msg');
        });
        it('handle remove events', function () {
            var vdom = h('button', { onclick: clickHandler });
            var update = h('button', {});
            var event = document.createEvent("MouseEvents");
            render$$(parent, [vdom]);
            render$$(parent, [update]);
            event.initEvent('click', true, true);
            vdom.dom.dispatchEvent(event);
            expect(clickHandler.calls.count()).toEqual(0);
            expect(tagger.tagger.calls.count()).toEqual(0);
        });
        it('event handler array', function () {
            var handler = jasmine.createSpy('arrayHandler');
            var vdom = h('button', { onclick: [handler, 'foo'] });
            var event = document.createEvent("MouseEvents");
            render$$(parent, [vdom]);
            event.initEvent('click', true, true);
            vdom.dom.dispatchEvent(event);
            expect(handler).toHaveBeenCalledWith('foo', event);
            expect(handler.calls.count()).toEqual(1);
        });
    });
});

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=spec-bundle.js.map
