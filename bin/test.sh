#!/bin/sh
set -e

if [ -z "$TEST_GREP" ]; then
   TEST_GREP=""
fi

for f in packages/*; do
  if [ -f "$f/spec/tsconfig.json" ]; then
    node_modules/typescript/bin/tsc -p $f/spec
  fi
done

node node_modules/mocha/bin/_mocha `bin/grep-test.sh` --opts test/mocha.opts --grep "$TEST_GREP"