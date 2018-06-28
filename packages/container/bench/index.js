'use strict';

const { intmap } = require('../lib');
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
  intmap.fromAssocArray(shortPair);
});

console.log('from assoc (long pair)');
benchWith(100, () => {
  intmap.fromAssocArray(natStr);
});

const imShort = intmap.fromAssocArray(shortPair);
console.log('look up (short)')
benchWith(100, () => {
  intmap.lookup(102, imShort);
});

const imLong = intmap.fromAssocArray(natStr);
console.log('look up (long)')
benchWith(100, () => {
  intmap.lookup(103, imLong);
});
