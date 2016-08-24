import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  entry: 'spec/index.js',
  plugins: [
    babel(babelrc()),
    nodeResolve({
      jsnext: true,
      main: true
    }),
    commonjs({
      // if true then uses of `global` won't be dealt with by this plugin
      ignoreGlobal: false,  // Default: false

      // if false then skip sourceMap generation for CommonJS modules
      sourceMap: false,  // Default: true
    })
  ],
  targets: [
    {
      dest: 'jonggrang-test.js',
      format: 'umd',
      moduleName: 'jonggrang',
      sourceMap: false
    }
  ]
};
