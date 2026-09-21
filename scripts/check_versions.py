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
    html_needles = {
        "gui/index.html": f"PC control · {version}",
        "gui/phone.html": f"Mobile companion · {version}",
    }
    for rel, needle in html_needles.items():
        text = (ROOT / rel).read_text(encoding="utf-8")
        if needle not in text:
            mismatches.append(f"{rel} missing {needle}")
    phone_js = (ROOT / "gui" / "phone.js").read_text(encoding="utf-8")
    if f'"{version}"' not in phone_js:
        mismatches.append(f"gui/phone.js missing fallback {version}")
    ref = os.environ.get("GITHUB_REF") or ""
    if ref.startswith("refs/tags/v"):
        tag = ref[len("refs/tags/v") :]
        if tag != version:
            mismatches.append(f"git tag {tag}")
    for name in ("LICENSE", "NOTICE"):
        path = ROOT / name
        if not path.is_file():
            mismatches.append(f"missing {name}")
    license_text = (ROOT / "LICENSE").read_text(encoding="utf-8") if (ROOT / "LICENSE").is_file() else ""
    if "safarsin" not in license_text or "iGlitchOn" not in license_text:
        mismatches.append("LICENSE missing dual copyright")
    if mismatches:
        print("CURRENT_VERSION", version)
        print("mismatch:", "; ".join(mismatches))
        return 1
    print("version ok", version)
    return 0


if __name__ == "__main__":
    sys.exit(main())
