#!/usr/bin/env bash
# Install the bee library by SYMLINKING skills/agents into an agent's skill folder.
# Symlinks mean edits in this repo (including ones made by skill-forge) go live immediately.
#
#   ./scripts/link-skills.sh                     # Claude Code, user-wide  (~/.claude/skills, ~/.claude/agents)
#   ./scripts/link-skills.sh --project ~/my-app  # Claude Code, one project (<dir>/.claude/skills, agents)
#   ./scripts/link-skills.sh --hermes            # Hermes Agent            (~/.hermes/skills/bee)
#   ./scripts/link-skills.sh --dir <path>        # any agent that reads SKILL.md folders
#   ./scripts/link-skills.sh --copy ...          # copy instead of symlink
#   ./scripts/link-skills.sh --uninstall ...     # remove links created by this script
set -euo pipefail

LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE=link; ACTION=install; SKILLS_DIR=""; AGENTS_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) SKILLS_DIR="$2/.claude/skills"; AGENTS_DIR="$2/.claude/agents"; shift 2;;
    --hermes)  SKILLS_DIR="$HOME/.hermes/skills/bee"; AGENTS_DIR=""; shift;;
    --dir)     SKILLS_DIR="$2"; AGENTS_DIR=""; shift 2;;
    --copy)    MODE=copy; shift;;
    --uninstall) ACTION=uninstall; shift;;
    -h|--help) sed -n '2,11p' "$0"; exit 0;;
    *) echo "Unknown option: $1" >&2; exit 1;;
  esac
done
SKILLS_DIR="${SKILLS_DIR:-$HOME/.claude/skills}"
if [[ -z "$AGENTS_DIR" && "$SKILLS_DIR" == "$HOME/.claude/skills" ]]; then AGENTS_DIR="$HOME/.claude/agents"; fi

place() { # src dest
  local src="$1" dest="$2"
  if [[ "$ACTION" == uninstall ]]; then
    if [[ -L "$dest" && "$(readlink "$dest")" == "$src" ]]; then rm "$dest"; echo "  removed $dest"; fi
    return
  fi
  if [[ -e "$dest" && ! -L "$dest" ]]; then echo "  skip  $dest (exists, not ours)"; return; fi
  rm -f "$dest"
  if [[ "$MODE" == copy ]]; then cp -R "$src" "$dest"; else ln -s "$src" "$dest"; fi
  echo "  $MODE  $dest"
}

echo "skills → $SKILLS_DIR"
mkdir -p "$SKILLS_DIR"
for s in "$LIB"/skills/*/; do s="${s%/}"; place "$s" "$SKILLS_DIR/$(basename "$s")"; done

if [[ -n "$AGENTS_DIR" ]]; then
  echo "agents → $AGENTS_DIR"
  mkdir -p "$AGENTS_DIR"
  for a in "$LIB"/agents/*.md; do place "$a" "$AGENTS_DIR/$(basename "$a")"; done
fi

[[ "$ACTION" == install ]] && echo "Done. Try: \"Use product-builder to build <idea>\"" || echo "Uninstalled."
