"""Fail CI when packaged version strings disagree (not a test suite)."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _search(path: Path, pattern: str) -> str:
    text = path.read_text(encoding="utf-8")
    match = re.search(pattern, text)
    if not match:
        raise SystemExit(f"{path.name}: no match for {pattern}")
    return match.group(1)


def main() -> int:
    version = _search(ROOT / "src" / "config.py", r'CURRENT_VERSION = "([^"]+)"')
    iss = _search(ROOT / "AutoRewarder.iss", r"AppVersion=([0-9.]+)")
    readme = _search(ROOT / "README.md", r"Versión documentada: \*\*([0-9.]+)\*\*")
    guide = _search(ROOT / "USER_GUIDE.md", r"\*\*Version\*\*: ([0-9.]+)")
    mismatches = []
    if iss != version:
        mismatches.append(f"AutoRewarder.iss AppVersion={iss}")
    if readme != version:
        mismatches.append(f"README.md {readme}")
    if guide != version:
        mismatches.append(f"USER_GUIDE.md {guide}")
    ref = os.environ.get("GITHUB_REF") or ""
    if ref.startswith("refs/tags/v"):
        tag = ref[len("refs/tags/v") :]
        if tag != version:
            mismatches.append(f"git tag {tag}")
    if mismatches:
        print("CURRENT_VERSION", version)
        print("mismatch:", "; ".join(mismatches))
        return 1
    print("version ok", version)
    return 0


if __name__ == "__main__":
    sys.exit(main())
