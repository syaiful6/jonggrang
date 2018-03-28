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
    for pkg in packages/*; do
      if [ -f "$pkg/test/index.ts" ]; then
        cd $pkg
        node ../../node_modules/mocha/bin/_mocha "test/index.ts" --require ts-node/register --opts test/mocha.opts
        cd ../..
      fi
    done
  else
    PACKAGE=$1;
    if [ -f "packages/$PACKAGE/test/index.ts" ]; then
      cd "packages/$PACKAGE"
      node ../../node_modules/mocha/bin/_mocha "test/index.ts" --require ts-node/register --opts test/mocha.opts
      cd ../..
    else
      echo "packages/$PACKAGE/test/index.ts not exists"
    fi
  fi
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
