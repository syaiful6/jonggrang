import buble from 'rollup-plugin-buble'

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

export default {
  entry: './tmp/spec/index.js',
  plugins: [buble()],
  external: external,
  targets: [
    {
      dest: './spec-bundle.js',
      format: 'umd',
      moduleName: 'jonggrang',
      sourceMap: true
    }
  ]
};
