#!/usr/bin/env bash
# bee installer
#
#   curl -fsSL https://raw.githubusercontent.com/Ravindrabisht12/bee/main/install.sh | bash
#
# Installs a standalone bee binary (no Node, Python, or npm needed) into ~/.bee and puts it on PATH.
# If no prebuilt binary exists for this platform, falls back to a source install when Node 18+ is present.
#
# Options (environment variables):
#   BEE_VERSION=v0.3.0        install a specific release (default: latest)
#   BEE_INSTALL_DIR=~/.bee    where to install
#   BEE_NO_MODIFY_PATH=1      don't touch shell profiles
#   BEE_REPO=owner/repo       install from a fork
set -euo pipefail

main() {
  REPO="${BEE_REPO:-Ravindrabisht12/bee}"
  VERSION="${BEE_VERSION:-latest}"
  DIR="${BEE_INSTALL_DIR:-$HOME/.bee}"
  if [ "$VERSION" = latest ]; then
    BASE="${BEE_DOWNLOAD_BASE:-https://github.com/$REPO/releases/latest/download}"
  else
    BASE="${BEE_DOWNLOAD_BASE:-https://github.com/$REPO/releases/download/$VERSION}"
  fi
  GIT_URL="${BEE_GIT_URL:-https://github.com/$REPO.git}"

  need curl; need tar
  detect_platform
  ASSET="bee-$OS-$ARCH.tar.gz"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT

  info "Installing bee ($VERSION) for $OS-$ARCH into $DIR"
  if curl -fsSL "$BASE/$ASSET" -o "$TMP/$ASSET" 2>/dev/null; then
    verify_checksum
    tar -xzf "$TMP/$ASSET" -C "$TMP"
    install_binary "$TMP/bee-$OS-$ARCH"
  elif source_install_possible; then
    warn "No prebuilt release found at $BASE/$ASSET; installing from source with Node $(node --version)."
    install_source
  else
    die "Could not download $BASE/$ASSET.
  Check that $REPO has a published release (https://github.com/$REPO/releases),
  or install Node 18+ and git, then re-run to install from source."
  fi

  "$DIR/bin/bee" --version >/dev/null || die "Installed, but $DIR/bin/bee failed to run."
  setup_path
  command -v python3 >/dev/null 2>&1 || warn "python3 not found: bee works, but some skills (spec, adr, feature-explainer) use small Python scripts."

  ok "bee $("$DIR/bin/bee" --version) installed → $DIR/bin/bee"
  cat <<EOF

  Get started:
    cd your-project
    bee init        # pick the skills this project runs on
    bee install     # (teammates) install what .bees declares

EOF
}

# ---------- helpers ----------
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'; else B= G= Y= R= N=; fi
info() { printf '%s\n' "${B}bee:${N} $*"; }
ok()   { printf '%s\n' "${G}✓${N} $*"; }
warn() { printf '%s\n' "${Y}!${N} $*" >&2; }
die()  { printf '%s\n' "${R}✗${N} $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "'$1' is required."; }

detect_platform() {
  case "$(uname -s)" in
    Darwin) OS=darwin ;;
    Linux) OS=linux ;;
    MINGW* | MSYS* | CYGWIN*) die "On Windows, run this inside WSL, or download bee-windows-x64.zip from the GitHub releases page." ;;
    *) die "Unsupported OS: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) ARCH=x64 ;;
    arm64 | aarch64) ARCH=arm64 ;;
    *) die "Unsupported CPU: $(uname -m)" ;;
  esac
  # An x64 shell under Rosetta on Apple Silicon should still get the native arm64 build.
  if [ "$OS" = darwin ] && [ "$ARCH" = x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = 1 ]; then ARCH=arm64; fi
}

sha256() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }

verify_checksum() {
  curl -fsSL "$BASE/SHA256SUMS" -o "$TMP/SHA256SUMS" 2>/dev/null || die "Release has no SHA256SUMS; refusing to install an unverified binary."
  local expected actual
  expected="$(awk -v f="$ASSET" '$2 == f || $2 == "*"f { print $1 }' "$TMP/SHA256SUMS")"
  actual="$(sha256 "$TMP/$ASSET")"
  [ -n "$expected" ] || die "$ASSET is not listed in SHA256SUMS."
  [ "$expected" = "$actual" ] || die "Checksum mismatch for $ASSET (expected $expected, got $actual)."
  ok "checksum verified"
}

install_binary() {
  local src="$1" item
  mkdir -p "$DIR"
  # Replace the library and binary; keep the git cache (~/.bee/cache).
  for item in bin skills agents registry.json package.json LICENSE src; do rm -rf "${DIR:?}/$item"; done
  for item in bin skills agents registry.json package.json LICENSE; do mv "$src/$item" "$DIR/$item"; done
  chmod +x "$DIR/bin/bee"
  ln -sf bee "$DIR/bin/bees"
}

source_install_possible() {
  command -v node >/dev/null 2>&1 && command -v git >/dev/null 2>&1 || return 1
  [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 18 ]
}

install_source() {
  local item ref=()
  [ "$VERSION" = latest ] || ref=(--branch "$VERSION")
  mkdir -p "$DIR"
  for item in bin skills agents registry.json package.json LICENSE src; do rm -rf "${DIR:?}/$item"; done
  git clone --quiet --depth 1 ${ref[@]+"${ref[@]}"} "$GIT_URL" "$DIR/src"
  mkdir -p "$DIR/bin"
  printf '#!/bin/sh\nexec node "%s/src/dist/bee.mjs" "$@"\n' "$DIR" > "$DIR/bin/bee"
  chmod +x "$DIR/bin/bee"
  ln -sf bee "$DIR/bin/bees"
}

setup_path() {
  case ":$PATH:" in *":$DIR/bin:"*) return ;; esac
  if [ -n "${BEE_NO_MODIFY_PATH:-}" ]; then
    warn "Add bee to your PATH:  export PATH=\"$DIR/bin:\$PATH\""
    return
  fi
  local shell_name rc line
  shell_name="$(basename "${SHELL:-sh}")"
  case "$shell_name" in
    zsh) rc="${ZDOTDIR:-$HOME}/.zshrc"; line="export PATH=\"$DIR/bin:\$PATH\"" ;;
    bash) if [ "$(uname -s)" = Darwin ]; then rc="$HOME/.bash_profile"; else rc="$HOME/.bashrc"; fi; line="export PATH=\"$DIR/bin:\$PATH\"" ;;
    fish) rc="$HOME/.config/fish/config.fish"; line="fish_add_path \"$DIR/bin\"" ;;
    *) rc="$HOME/.profile"; line="export PATH=\"$DIR/bin:\$PATH\"" ;;
  esac
  mkdir -p "$(dirname "$rc")"
  if ! grep -qsF "$DIR/bin" "$rc"; then
    printf '\n# bee\n%s\n' "$line" >> "$rc"
    ok "added $DIR/bin to PATH in $rc"
  fi
  warn "Open a new terminal (or run: $line) to use bee."
}

main "$@"
