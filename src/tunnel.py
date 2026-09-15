"""Public HTTPS tunnel so the phone APK can reach this PC off the LAN.

Prefers ngrok when an authtoken is available (env NGROK_AUTHTOKEN, or
%LOCALAPPDATA%\\AutoRewarder\\ngrok_token.txt). Otherwise downloads
cloudflared and opens a quick tunnel — no account required.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import time
import urllib.request
import zipfile

from .config import APP_DIR

TOOLS_DIR = os.path.join(APP_DIR, "tools")
NGROK_ZIP = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
CLOUDFLARED = (
    "https://github.com/cloudflare/cloudflared/releases/latest/download/"
    "cloudflared-windows-amd64.exe"
)
_CF_URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com", re.I)
_CREATE_NO_WINDOW = 0x08000000


def _ngrok_token():
    env = (os.environ.get("NGROK_AUTHTOKEN") or "").strip()
    if env:
        return env
    path = os.path.join(APP_DIR, "ngrok_token.txt")
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                token = fh.read().strip()
            if token:
                return token
        except OSError:
            pass
    return ""


def _download(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    req = urllib.request.Request(url, headers={"User-Agent": "AutoRewarder"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as out:
        while True:
            chunk = resp.read(1024 * 64)
            if not chunk:
                break
            out.write(chunk)
    os.replace(tmp, dest)


class PhoneTunnel:
    def __init__(self, port, logger=None):
        self.port = int(port)
        self.public_url = None
        self.provider = None
        self.status = "starting"
        self.error = ""
        self._log = logger or (lambda m: None)
        self._proc = None
        self._stop = threading.Event()

    def start(self):
        threading.Thread(target=self._run, daemon=True, name="phone-tunnel").start()

    def stop(self):
        self._stop.set()
        proc = self._proc
        self._proc = None
        if proc is None:
            return
        try:
            proc.terminate()
        except Exception:
            pass
        try:
            proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

    def _run(self):
        try:
            token = _ngrok_token()
            if token and self._start_ngrok(token):
                return
            if self._start_cloudflared():
                return
            self.status = "error"
            self.error = self.error or "could not start a remote tunnel"
            self._log("[WARNING] Remote phone tunnel failed: " + self.error)
        except Exception as e:
            self.status = "error"
            self.error = str(e)
            self._log(f"[WARNING] Remote phone tunnel failed: {e}")

    def _start_ngrok(self, token):
        exe = os.path.join(TOOLS_DIR, "ngrok.exe")
        if not os.path.isfile(exe):
            self._log("Downloading ngrok…")
            zpath = os.path.join(TOOLS_DIR, "ngrok.zip")
            try:
                _download(NGROK_ZIP, zpath)
                with zipfile.ZipFile(zpath, "r") as zf:
                    zf.extract("ngrok.exe", TOOLS_DIR)
            except Exception as e:
                self.error = f"ngrok download: {e}"
                return False
        try:
            subprocess.run(
                [exe, "config", "add-authtoken", token],
                capture_output=True,
                timeout=20,
                creationflags=_CREATE_NO_WINDOW,
            )
        except Exception:
            pass
        args = [
            exe,
            "http",
            f"127.0.0.1:{self.port}",
            "--log",
            "stdout",
            "--log-format",
            "json",
        ]
        try:
            self._proc = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=_CREATE_NO_WINDOW,
            )
        except Exception as e:
            self.error = f"ngrok start: {e}"
            return False
        deadline = time.time() + 25
        while time.time() < deadline and not self._stop.is_set():
            url = self._ngrok_api_url()
            if url:
                self.public_url = url
                self.provider = "ngrok"
                self.status = "ready"
                self._log(f"Remote phone tunnel (ngrok): {url}")
                return True
            time.sleep(0.6)
        self.error = "ngrok did not publish a URL (check ngrok_token.txt)"
        return False

    def _ngrok_api_url(self):
        try:
            with urllib.request.urlopen(
                "http://127.0.0.1:4040/api/tunnels", timeout=2
            ) as resp:
                data = json.loads(resp.read().decode("utf-8", "replace"))
            for tun in data.get("tunnels") or []:
                pub = str(tun.get("public_url") or "")
                if pub.startswith("https://"):
                    return pub.rstrip("/")
        except Exception:
            return None
        return None

    def _start_cloudflared(self):
        exe = os.path.join(TOOLS_DIR, "cloudflared.exe")
        if not os.path.isfile(exe):
            self._log("Downloading Cloudflare tunnel (no account needed)…")
            try:
                _download(CLOUDFLARED, exe)
            except Exception as e:
                self.error = f"cloudflared download: {e}"
                return False
        args = [
            exe,
            "tunnel",
            "--no-autoupdate",
            "--url",
            f"http://127.0.0.1:{self.port}",
        ]
        try:
            self._proc = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                creationflags=_CREATE_NO_WINDOW,
            )
        except Exception as e:
            self.error = f"cloudflared start: {e}"
            return False
        deadline = time.time() + 40
        buf = ""
        while time.time() < deadline and not self._stop.is_set():
            if self._proc.poll() is not None:
                rest = ""
                try:
                    rest = self._proc.stdout.read().decode("utf-8", "replace")
                except Exception:
                    pass
                self.error = "cloudflared exited: " + (buf + rest)[-400:]
                return False
            try:
                line = self._proc.stdout.readline()
            except Exception:
                line = b""
            if not line:
                time.sleep(0.2)
                continue
            buf += line.decode("utf-8", "replace")
            match = _CF_URL_RE.search(buf)
            if match:
                self.public_url = match.group(0)
                self.provider = "cloudflare"
                self.status = "ready"
                self._log(f"Remote phone tunnel (Cloudflare): {self.public_url}")
                return True
        self.error = "cloudflared did not publish a URL"
        return False
