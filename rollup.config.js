import buble from 'rollup-plugin-buble'

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

export default {
  entry: './tmp/index.js',
  plugins: [buble()],
  external: external,
  targets: [
    {
      dest: pkg['jsnext:main'],
      format: 'es',
      sourceMap: true
    }
  ]
};
