import buble from 'rollup-plugin-buble'
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

export default {
  entry: './tmp/spec/index.js',
  plugins: [
    buble(),
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true,
      preferBuiltins: false,
    }),
    commonjs({
      include: 'node_modules/**'
    })
  ],
  targets: [
    {
      dest: './spec-bundle.js',
      format: 'umd',
      moduleName: 'jonggrang',
      sourceMap: false
    }
  ]
};
