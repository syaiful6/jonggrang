#!/usr/bin/env bash

set -euo pipefail

# get NPM binaries
NPM_BIN=$(readlink -f "./node_modules/.bin")

# expose NPM bin
export PATH=$NPM_BIN:$PATH

# test [package] - test the given package or test all if not given
function test() {
  if [ $# -eq 0 ]; then
    echo "Test all packages in packages folder"
    TESTFILES=$(find packages/*/test/ -name 'index.ts')
    mocha $TESTFILES --require ts-node/register --opts test/mocha.opts
  else
    PACKAGE=$1;
    if [ -f "packages/$PACKAGE/test/index.ts" ]; then
      mocha "packages/$PACKAGE/test/index.ts" --require ts-node/register --opts test/mocha.opts
    else
      echo "packages/$PACKAGE/test/index.ts not exists"
    fi
  fi
}

function test-browser() {
  karma start
}

function clean-build() {
  rm -r -f packages/*/lib && rm -r -f packages/*/es6
}

function build() {
  node bin/build.js
}

function release-next() {
  node bin/build.js && lerna publish --exact --canary=next --npm-tag=next -- --access=public
}

function release() {
  node bin/build.js && lerna publish --exact -- --access=public
}

# Run a function name in the context of this script
eval "$@"
