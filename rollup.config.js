import tsPlugin from 'rollup-plugin-typescript';
import typescript from 'typescript'

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

export default {
  entry: 'tmp/index.js',
  plugins: [],
  external: external,
  targets: [
    {
      dest: pkg['jsnext:main'],
      format: 'es',
      sourceMap: true
    }
  ]
};
