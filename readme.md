This repo is meant to document and explore the implementation of [Elm architecture](https://github.com/evancz/elm-architecture-tutorial)

Dependency on this repo:
  - [Mithril](https://github.com/lhorie/mithril.js), rendering, virtual DOM and stream.
  - [Rambda](http://ramdajs.com/0.22.1/index.html), currently used to curry our function.
  - [Union Type](https://github.com/paldepind/union-type), Representing actions 

Currently our ```update``` function can't return an effects yet, it still only return new model.
