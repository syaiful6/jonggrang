#!/bin/sh
set -e

if [ -z "$TEST_GREP" ]; then
   TEST_GREP=""
fi

node node_modules/mocha/bin/_mocha `bin/grep-test.sh` --opts test/mocha.opts --grep "$TEST_GREP"