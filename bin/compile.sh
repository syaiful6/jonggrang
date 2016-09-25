#!/bin/sh

for f in packages/*; do
  if [ -f "$f/tsconfig.json" ]; then
    node_modules/typescript/bin/tsc -p $f
  fi
  if [ -f "$f/scripts/tsconfig.json" ]; then
    node_modules/typescript/bin/tsc -p $f/scripts
  fi
done