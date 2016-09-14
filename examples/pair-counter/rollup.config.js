import buble from 'rollup-plugin-buble'
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

let pkg = require('./package.json');
let external = Object.keys(pkg.dependencies);

export default {
  entry: './tmp/examples/pair-counter/src/main.js',
  plugins: [
    buble(),
    nodeResolve({
      jsnext: true,
      main: true,
      browser: true,
      preferBuiltins: false,
    }),
    commonjs({
      include: './../../node_modules/**',
      namedExports: { './../../node_modules/flyd/lib/index.js': ['merge', 'map', 'stream', 'on', 'scan', 'combine', 'immediate', 'endsOn' ] }
    })
  ],
  targets: [
    {
      dest: './dist/main.js',
      format: 'umd',
      moduleName: 'jonggrang',
      sourceMap: false
    }
  ]
};
