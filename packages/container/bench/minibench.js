'use strict';

function gc() {
  global.gc && global.gc();
}

function toFixed(n) {
  return n.toFixed(2);
}

function withUnits(t) {
  if (t < 1000.0) {
    return toFixed(t) + " ns";
  }
  if (t < 1000000.0) {
    return toFixed(t / 1000000.0) + " \u03bcs";
  }
  if (t < 1.0e9) {
    return toFixed(t / 1.0e9) + " ms";
  }
  return toFixed(t / 1.0e9) + " s";
}

function fromHrTime(v) {
  if (v.length === 2) {
      return v[0] * 1.0e9 + v[1];
  };
  throw new Errot('fromHrTime expect tuple')
}

exports.benchWith = function benchWith(n, f) {
  let v = 0.0;
  let v1 = 0.0;
  let v2 = Infinity;
  let v3 = 0.0;
  for (let i = 0; i < n; i++) {
    let t1 = process.hrtime([0, 0]);
    f();
    let t2 = process.hrtime(t1);
    let ns = fromHrTime(t2);
    let square = ns * ns;
    v += ns;
    v1 += square;
    v2 = Math.min(v2, ns);
    v3 = Math.max(v3, ns);
  }
  let mean = v / n;
  let stdDev = Math.sqrt((v1 - n * mean * mean) / (n - 1.0));
  console.log("mean   = " + withUnits(mean));
  console.log("stddev = " + withUnits(stdDev));
  console.log("min    = " + withUnits(v2));
  console.log("max    = " + withUnits(v3));
}
