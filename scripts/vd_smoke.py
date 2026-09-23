"""Prove a Task View desktop can be created and removed without dropping the user's.

Not an Edge test. Does not touch an AutoRewarder profile.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "ar_virtual_desktop", ROOT / "src" / "emulator" / "virtual_desktop.py"
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("virtual_desktop.py could not be loaded")
vd = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(vd)


def main() -> int:
    original = vd.current_desktop_id()
    before = {vd._norm(item) for item in vd.list_desktop_ids()}
    print(
        f"build {vd.windows_build()} current {original} count {len(before)}", flush=True
    )
    if vd._norm(original) not in before:
        print("FAILED current desktop missing from the list", flush=True)
        return 1
    new_id = None
    try:
        new_id, fallback = vd.create_desktop()
        print(f"created {new_id} fallback {fallback}", flush=True)
        if not new_id or vd._norm(new_id) == vd._norm(original):
            print(
                "FAILED new desktop id is missing or equal to the current one",
                flush=True,
            )
            return 1
        if vd._norm(fallback) != vd._norm(original):
            print("FAILED fallback is not the desktop that was current", flush=True)
            return 1
        if vd._norm(vd.current_desktop_id()) != vd._norm(original):
            print("FAILED create switched the current desktop", flush=True)
            return 1
        listed = {vd._norm(item) for item in vd.list_desktop_ids()}
        if vd._norm(new_id) not in listed or vd._norm(original) not in listed:
            print("FAILED new or original desktop missing after create", flush=True)
            return 1
        if not vd.remove_desktop(new_id, original):
            print("FAILED remove did not drop the new desktop", flush=True)
            return 1
        removed = new_id
        new_id = None
        after = {vd._norm(item) for item in vd.list_desktop_ids()}
        if vd._norm(original) not in after:
            print("FAILED original desktop was removed", flush=True)
            return 1
        if vd._norm(removed) in after:
            print("FAILED new desktop still exists", flush=True)
            return 1
        if vd._norm(vd.current_desktop_id()) != vd._norm(original):
            print("FAILED current desktop changed", flush=True)
            return 1
        if not before.issubset(after):
            print(f"FAILED lost a desktop: {before - after}", flush=True)
            return 1
        print(f"VD_SMOKE_OK {original} {removed}", flush=True)
        return 0
    finally:
        if new_id:
            try:
                vd.remove_desktop(new_id, original)
            except Exception as exc:
                print(f"cleanup failed: {exc}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
