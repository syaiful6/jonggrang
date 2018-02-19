'use strict';

const { IntMap } = require('../lib');
const { benchWith } = require('./minibench');

const natStr = (function () {
  let result = [];
  for (let i = 0; i < 99999; i++) {
    result.push([i, i.toString()])
  }
  return result;
})();

const shortPair = (function () {
  let result = [];
  for (let i = 0; i < 10000; i++) {
    result.push([i, i.toString()])
  }
  return result;
})();

console.log('from Assoc (short pair)');
benchWith(100, () => {
  IntMap.fromAssocArray(shortPair);
});

console.log('from assoc (long pair)');
benchWith(100, () => {
  IntMap.fromAssocArray(natStr);
});

const imShort = IntMap.fromAssocArray(shortPair);
console.log('look up (short)')
benchWith(100, () => {
  IntMap.lookup(102, imShort);
});

const imLong = IntMap.fromAssocArray(natStr);
console.log('look up (long)')
benchWith(100, () => {
  IntMap.lookup(103, imLong);
});
