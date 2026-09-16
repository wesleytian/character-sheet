#!/bin/sh
# JSX text nodes and double-quoted JSX attributes print \uXXXX literally;
# escapes inside JS string literals ('...' / `...`) are fine.
bad=$(grep -rn '\\u[0-9a-fA-F]\{4\}' src/*.tsx 2>/dev/null \
  | grep -v "'" | grep -v '`')
if [ -n "$bad" ]; then
  echo "FAIL: literal unicode escapes in JSX:"; echo "$bad"; exit 1
fi
echo "OK: no literal unicode escapes in JSX"
