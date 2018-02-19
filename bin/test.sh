#!/usr/bin/env bash

set -euo pipefail

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
