#!/usr/bin/env sh
# Build standalone bee binaries (no Node needed to run them) and package release archives.
#
#   sh scripts/package-release.sh                 # all platforms
#   sh scripts/package-release.sh darwin-arm64    # just one
#
# Output in release/: bee-<os>-<arch>.tar.gz (bee-windows-x64.zip) + SHA256SUMS.
# Each archive holds bee-<os>-<arch>/{bin/bee, skills/, agents/, registry.json, package.json};
# the binary finds its library one level above bin/, which is how the installer lays out ~/.bee.
set -eu
cd "$(dirname "$0")/.."

BUN="${BUN:-bun}"
OUT=release
TARGETS="${*:-darwin-arm64 darwin-x64 linux-x64 linux-arm64 windows-x64}"

rm -rf "$OUT"
mkdir -p "$OUT/stage"
for t in $TARGETS; do
  name="bee-$t"
  stage="$OUT/stage/$name"
  exe=bee
  case "$t" in windows-*) exe=bee.exe ;; esac
  mkdir -p "$stage/bin"
  "$BUN" build src/cli.ts --compile --minify --target="bun-$t" --outfile "$stage/bin/$exe" >/dev/null
  cp -R skills agents registry.json package.json "$stage/"
  find "$stage" \( -name '__pycache__' -o -name '.DS_Store' \) -prune -exec rm -rf {} +
  case "$t" in
    windows-*) (cd "$OUT/stage" && zip -qr "../$name.zip" "$name") ;;
    *) tar -C "$OUT/stage" -czf "$OUT/$name.tar.gz" "$name" ;;
  esac
  echo "built $OUT/$name"
done
rm -rf "$OUT/stage"

cd "$OUT"
if command -v sha256sum >/dev/null 2>&1; then sha256sum bee-* > SHA256SUMS; else shasum -a 256 bee-* > SHA256SUMS; fi
echo "wrote $OUT/SHA256SUMS"
