#!/bin/sh

for f in packages/*; do
  if [ -f "$f/tsconfig.json" ]; then
    node_modules/.bin/tsc -p $f --outDir $f/es6 --module es6 --moduleResolution node
    node_modules/.bin/tsc -p $f --outDir $f/lib
  fi
done
