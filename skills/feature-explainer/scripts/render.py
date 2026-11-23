#!/usr/bin/env python3
"""Render explainer.json into a self-contained interactive explainer.html.

Usage: python3 render.py path/to/explainer.json [-o out.html]
Stdlib only.
"""
import argparse
import json
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "explainer.html"
PLACEHOLDER = "/*__EXPLAINER_DATA__*/null"

LIST_FIELDS = ["features", "beforeAfter", "diagrams", "walkthrough", "files",
               "tryIt", "glossary", "quiz", "limitations", "nextSteps", "links", "stats",
               "specs", "decisions"]


def validate(data):
    problems = []
    if not isinstance(data, dict):
        return ["top level must be an object"]
    if not data.get("title"):
        problems.append("'title' is required")
    for f in LIST_FIELDS:
        if f in data and not isinstance(data[f], list):
            problems.append(f"'{f}' must be a list")
    for i, q in enumerate(data.get("quiz", []) or []):
        opts = q.get("options") or []
        a = q.get("answer")
        if not isinstance(a, int) or not (0 <= a < len(opts)):
            problems.append(f"quiz[{i}].answer must be a valid index into options")
    for i, w in enumerate(data.get("walkthrough", []) or []):
        if not w.get("title"):
            problems.append(f"walkthrough[{i}] needs a title")
    return problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()

    src = Path(args.json_path)
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"Invalid JSON in {src}: {e}")

    problems = validate(data)
    if problems:
        sys.exit("explainer.json problems:\n  - " + "\n  - ".join(problems))

    # Safe to embed inside <script>: block "</script" and HTML comment openers.
    payload = (json.dumps(data, ensure_ascii=False)
               .replace("</", "<\\/").replace("<!--", "<\\!--"))
    html = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in html:
        sys.exit("Template placeholder missing; the template was modified incorrectly.")
    html = html.replace(PLACEHOLDER, payload, 1)

    out = Path(args.out) if args.out else src.with_suffix(".html")
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
