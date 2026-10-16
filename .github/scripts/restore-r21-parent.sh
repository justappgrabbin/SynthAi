#!/bin/sh
set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
parts_dir="$repo_root/.github/recovery/r21.22-overlay.parts"
target="$repo_root/computer/donors/recovered/synthai-r21.22-self-cultivation-graph-integrated"
archive=$(mktemp "${TMPDIR:-/tmp}/synthia-r21.22-overlay.XXXXXX.zip")
trap 'rm -f "$archive"' EXIT HUP INT TERM

cat "$parts_dir"/part-* > "$archive"
actual=$(sha256sum "$archive" | awk '{print $1}')
expected=dd140f99d5c65ec4529059fa965e47fb84c634ebb514a0d7e15e0c1897664928
if [ "$actual" != "$expected" ]; then
  echo "r21.22 recovery overlay checksum mismatch: expected $expected, received $actual" >&2
  exit 1
fi

unzip -oq "$archive" -d "$target"
(
  cd "$target"
  sha256sum -c "$parts_dir/overlay-files.sha256"
)

test -f "$target/knowledge/biverse/references/index.json"
test -f "$target/knowledge/biverse/runtimes/isohuman/dist/index.js"
test -f "$target/knowledge/books/sources/Yijing1+2.pdf"
test "$(find "$target/assets/sprites" -type f -name '*.png' | wc -l)" -eq 64

echo "Restored 346 preserved r21.22 files from the verified overlay."
