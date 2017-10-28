#!/bin/sh

for pkg in packages/*; do
  if [ -f "$pkg/test/index.ts" ]; then
    cd $pkg
    node ../../node_modules/mocha/bin/_mocha "test/index.ts" --require ts-node/register --opts test/mocha.opts
    cd ../..
  fi
done
