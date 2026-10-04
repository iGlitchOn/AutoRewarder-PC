"""External updater process for AutoRewarder.

This executable is intentionally separate from the main application. It keeps
the update screen alive while the old process exits, replaces files in the
existing installation, and starts the same executable again when finished.
"""

import argparse
import ctypes
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

import webview

from src.config import GUI_DIR
from src.utils import (
    download_release_asset,
    extract_release_package,
    find_release_file,
)


def _process_is_running(pid):
    if pid <= 0:
        return False
    if os.name != "nt":
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False
    handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
    if not handle:
        return False
    try:
        exit_code = ctypes.c_ulong()
        if not ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code)):
            return False
        return exit_code.value == 259  # STILL_ACTIVE
    finally:
        ctypes.windll.kernel32.CloseHandle(handle)


class UpdaterAPI:
    def __init__(self, args):
        self.args = args
        self.window = None
        self.started = False

    def get_settings(self):
        return {"ui_locale": self.args.language or "en"}

    def start_update(self):
        if self.started:
            return {"ok": True}
        self.started = True
        threading.Thread(target=self._run, daemon=True, name="update-worker").start()
        return {"ok": True}

    def _progress(self, stage, value=None, detail=None):
        if not self.window:
            return
        try:
            self.window.evaluate_js(
                "update_progress(%r, %r, %r)"
                % (stage, value, detail)
            )
        except Exception:
            pass

    def _run(self):
        package = ""
        root = ""
        try:
            self._progress("closing", 0.02)
            deadline = time.time() + 30
            while _process_is_running(self.args.parent_pid) and time.time() < deadline:
                time.sleep(0.15)

            self._progress("downloading", 0.0)
            package = download_release_asset(
                self.args.url,
                self.args.asset,
                progress=lambda done, total: self._progress(
                    "downloading", (done / total) if total else None
                ),
            )
            root = extract_release_package(package)
            self._progress("installing", 0.2)

            target = os.path.abspath(self.args.target)
            target_dir = os.path.dirname(target)
            target_name = os.path.basename(target)
            if target_name.lower() == "autorewarder-portable.exe":
                source = find_release_file(root, "AutoRewarder-Portable.exe")
                if not source:
                    raise ValueError("The portable package does not contain AutoRewarder-Portable.exe.")
                self._progress("replacing", 0.55)
                shutil.copy2(source, target)
            else:
                source = find_release_file(root, "AutoRewarder.exe")
                if not source:
                    raise ValueError("The package does not contain AutoRewarder.exe.")
                self._progress("replacing", 0.55)
                source_dir = os.path.dirname(source)
                shutil.copytree(
                    source_dir,
                    target_dir,
                    dirs_exist_ok=True,
                    ignore=lambda current, names: {
                        "AutoRewarder-Updater.exe"
                    } if os.path.abspath(current) == os.path.abspath(source_dir) else set(),
                )

            self._progress("cleaning", 0.86)
            time.sleep(0.35)
            self._progress("finished", 1.0)
            time.sleep(0.65)
            subprocess.Popen([target], cwd=target_dir, close_fds=True)
            self.window.destroy()
        except Exception as exc:
            self._progress("error", 0, str(exc))
            return
        finally:
            for path in (package, root):
                if not path:
                    continue
                try:
                    if os.path.isdir(path):
                        shutil.rmtree(path, ignore_errors=True)
                    elif os.path.isfile(path):
                        os.remove(path)
                except OSError:
                    pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--asset", required=True)
    parser.add_argument("--parent-pid", type=int, required=True)
    parser.add_argument("--language", default="en")
    parser.add_argument("--target", required=True)
    args = parser.parse_args()
    api = UpdaterAPI(args)
    window = webview.create_window(
        "",
        os.path.join(GUI_DIR, "updater.html"),
        js_api=api,
        width=440,
        height=380,
        resizable=False,
        frameless=True,
        easy_drag=False,
        on_top=True,
        shadow=False,
        transparent=True,
        background_color="#0b0d12",
    )
    api.window = window
    window.events.closing += lambda *_args: False
    webview.start()


if __name__ == "__main__":
    main()
