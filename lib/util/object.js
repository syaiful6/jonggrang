var keys = Object.keys
var symbolKeys = Object.getOwnPropertySymbols
var defineProperties = Object.defineProperties
var propertyDescriptor = Object.getOwnPropertyDescriptor
// variant of Object.assign but this will copy the descriptor
export function assign(target, ...sources) {
  sources.forEach(source => {
    var keysAndSymbols = keys(source).concat(symbolKeys(source))
    defineProperties(target, keysAndSymbols.reduce((descriptors, key) => {
      descriptors[key] = propertyDescriptor(source, key);
      return descriptors;
    }, {}));
  });
  return target;
}
