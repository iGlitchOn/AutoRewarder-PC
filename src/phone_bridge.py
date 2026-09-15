"""LAN bridge between AutoRewarder on PC and the phone companion APK.

The phone polls this process. The PC never needs an inbound connection to
the phone. Pairing is a short-lived code; after that the device token in
the account's meta.json is enough.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import socket
import threading
import time
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.error
import urllib.request
from urllib.parse import parse_qs, urlparse

from .config import APP_DIR, CURRENT_VERSION, GUI_DIR

BRIDGE_PORT = 38471
BEACON_PORT = 38472
PROTOCOL_VERSION = 2
PHONE_JOB_KINDS = frozenset(("checkin", "news"))
PHONE_ONLINE_SEC = 900
PC_RUN_MODES = frozenset(("start", "tasks", "edge"))


class _BridgeServer(ThreadingHTTPServer):
    allow_reuse_address = True


def wire_protocol(value):
    """Protocol the peer speaks. Missing/invalid means AR2 (all 4.3.x)."""
    if value is None or value == "":
        return PROTOCOL_VERSION
    try:
        return int(value)
    except (TypeError, ValueError):
        return PROTOCOL_VERSION


def _pair_secret():
    path = os.path.join(APP_DIR, "pair_secret.txt")
    if os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                secret = fh.read().strip()
            if secret:
                return secret
        except OSError:
            pass
    secret = uuid.uuid4().hex + uuid.uuid4().hex
    try:
        os.makedirs(APP_DIR, exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(secret)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp, path)
    except OSError:
        try:
            os.remove(path + ".tmp")
        except OSError:
            pass
    return secret


def _lan_ip():
    ip = "127.0.0.1"
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.settimeout(2)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
    except Exception:
        pass
    finally:
        sock.close()
    return ip


def match_existing_phone(phones, android_id="", name="", model=""):
    """Pick a stored phone. Prefer android_id; never collide two devices by model."""
    android_id = str(android_id or "").strip()
    name = str(name or "").strip()
    model = str(model or "").strip()
    phones = list(phones or [])
    if android_id:
        for phone in phones:
            if str(phone.get("android_id") or "") == android_id:
                return phone
        return None
    for phone in phones:
        if phone.get("android_id"):
            continue
        if name and phone.get("name") == name:
            return phone
        if model and phone.get("model") == model:
            return phone
    return None


def event_completes_job(kind, detail=""):
    """True when a /phone/event should finish a queued PC job."""
    kind = str(kind or "")
    detail_l = str(detail or "").lower()
    if kind not in ("checkin", "news"):
        return False
    if "opened" in detail_l:
        return False
    return True


class PhoneBridge:
    def __init__(self, api):
        self.api = api
        self.port = BRIDGE_PORT
        self._httpd = None
        self._thread = None
        self._peer = None
        self._beacon_stop = threading.Event()
        self._pair_code = None
        self._pair_until = 0.0
        self._jobs = {}  # job_id -> dict
        self._lock = threading.Lock()
        self.tunnel = None
        self._tunnel_timer = None
        self._pair_secret = _pair_secret()
        self._pair_fails = {}
        self._pair_replay = None
        self._valid_codes = []

    # -- lifecycle ----------------------------------------------------------

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._beacon_stop.clear()
        handler = self._make_handler()
        self._httpd = None
        self._peer = None
        for attempt in range(3):
            try:
                self._httpd = _BridgeServer(("0.0.0.0", self.port), handler)
                break
            except OSError as e:
                if self._local_bridge_alive():
                    self._peer = f"http://127.0.0.1:{self.port}"
                    print(
                        f"Phone bridge port {self.port} already in use. "
                        "This process will send phone jobs to the running PC."
                    )
                    return
                print(
                    f"[WARNING] Phone bridge port {self.port} busy "
                    f"(try {attempt + 1}/3): {e}"
                )
                time.sleep(2)
        if self._httpd is None:
            if self._local_bridge_alive():
                self._peer = f"http://127.0.0.1:{self.port}"
                print(
                    f"Phone bridge port {self.port} already in use. "
                    "This process will send phone jobs to the running PC."
                )
                return
            print(
                f"[WARNING] Phone bridge port {self.port} is busy. "
                "LAN pairing needs that port free."
            )
            return
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()
        threading.Thread(target=self._beacon_loop, daemon=True).start()
        threading.Thread(target=self._watch_http, daemon=True).start()
        threading.Thread(target=self._open_firewall, daemon=True).start()
        try:
            from .tunnel import PhoneTunnel

            self.tunnel = PhoneTunnel(self.port, logger=print)
            self._tunnel_timer = threading.Timer(2.0, self.tunnel.start)
            self._tunnel_timer.daemon = True
            self._tunnel_timer.start()
        except Exception as e:
            print(f"[WARNING] Remote tunnel failed to start: {e}")
        try:
            from .apk_update import publish

            threading.Thread(target=publish, daemon=True, name="publish-apk").start()
        except Exception as e:
            print(f"[WARNING] Phone APK publish failed: {e}")
        print(f"Phone bridge listening on http://{_lan_ip()}:{self.port}")

    def stop(self):
        self._beacon_stop.set()
        try:
            timer = getattr(self, "_tunnel_timer", None)
            if timer is not None:
                timer.cancel()
        except Exception:
            pass
        try:
            if self.tunnel is not None:
                self.tunnel.stop()
        except Exception:
            pass
        if self._httpd:
            try:
                self._httpd.shutdown()
            except Exception:
                pass
            try:
                self._httpd.server_close()
            except Exception:
                pass
        if self._thread:
            self._thread.join(timeout=2)
        self._thread = None
        self._httpd = None

    def info(self):
        phones = []
        if self.api.account_meta is not None:
            phones = self.api.account_meta.get_phones()
        now = time.time()
        public = []
        for p in phones:
            seen = p.get("last_seen_ts") or 0
            public.append(
                {
                    "id": p.get("id"),
                    "name": p.get("name") or "Phone",
                    "model": p.get("model") or "",
                    "paired_at": p.get("paired_at"),
                    "last_seen": p.get("last_seen"),
                    "online": (now - float(seen)) < 45,
                }
            )
        public_url = None
        tunnel_status = "off"
        tunnel_error = ""
        if self.tunnel is not None:
            public_url = self.tunnel.public_url
            tunnel_status = self.tunnel.status
            tunnel_error = self.tunnel.error or ""
        lan = f"http://{_lan_ip()}:{self.port}"
        remote = public_url or lan
        pairing = bool(self._pair_code and time.time() < self._pair_until)
        payload = self._pair_payload(remote) if pairing else ""
        qr = ""
        if payload:
            try:
                from .qr_png import qr_data_url

                qr = qr_data_url(payload)
            except Exception:
                qr = ""
        return {
            "ok": True,
            "protocol": PROTOCOL_VERSION,
            "app": CURRENT_VERSION,
            "ip": _lan_ip(),
            "port": self.port,
            "url": remote,
            "lan_url": lan,
            "public_url": public_url,
            "tunnel": tunnel_status,
            "tunnel_error": tunnel_error,
            "pairing": pairing,
            "code": self._pair_code if pairing else None,
            "payload": payload,
            "qr": qr,
            "phones": public,
        }

    def begin_pairing(self):
        import random

        self._pair_fails = {}
        self._pair_code = f"{random.randint(0, 999999):06d}"
        self._pair_until = time.time() + 600
        self._valid_codes.append((self._pair_code, self._pair_until))
        self._valid_codes = self._valid_codes[-8:]
        return self.info()

    def _pair_payload(self, url):
        if not self._pair_code or time.time() > self._pair_until:
            return ""
        url = str(url or "").rstrip("/")
        sig = self._sign(url, self._pair_code, self._pair_until)
        return f"AR2|{url}|{self._pair_code}|{sig}|{int(self._pair_until)}"

    def _sign(self, url, code, until):
        raw = f"{code}|{str(url).rstrip('/')}|{int(until)}"
        return hmac.new(
            self._pair_secret.encode("utf-8"),
            raw.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()[:16]

    def _hmac_ok(self, code, url, sig, until):
        """True when sig is empty (manual 6-digit) or matches a known URL."""
        sig = str(sig or "").strip()
        if not sig:
            return True
        urls = []
        for candidate in (url, f"http://{_lan_ip()}:{self.port}"):
            item = str(candidate or "").rstrip("/")
            if item and item not in urls:
                urls.append(item)
        if self.tunnel is not None:
            pub = str(getattr(self.tunnel, "public_url", None) or "").rstrip("/")
            if pub and pub not in urls:
                urls.append(pub)
        for candidate in urls:
            expected = self._sign(candidate, code, until)
            try:
                if hmac.compare_digest(sig, expected):
                    return True
            except Exception:
                continue
        return False

    def _verify_pair(self, code, url, sig):
        """Accept the 6-digit code if it is the current one or a recent one.

        The phone often retries, and the PC used to throw the code away after
        the first POST — the PC looked linked, the phone saw 'expired'.

        A beacon HMAC is checked when the phone sends `sig`. Manual pairing
        with only the 6-digit code still works (empty sig).
        """
        code = str(code or "").strip()
        now = time.time()
        replay = self._pair_replay
        if (
            replay
            and replay.get("code") == code
            and now < float(replay.get("until") or 0)
        ):
            return "replay"
        if self._pair_code and now <= self._pair_until and code == str(self._pair_code):
            return bool(self._hmac_ok(code, url, sig, self._pair_until))
        for prev, until in self._valid_codes:
            if prev == code and now <= float(until):
                return bool(self._hmac_ok(code, url, sig, until))
        return False

    def cancel_pairing(self):
        self._pair_code = None
        self._pair_until = 0
        self._valid_codes = []
        self._pair_replay = None
        return self.info()

    def _pair_expired(self, code):
        """True when this exact 6-digit code was issued and its TTL lapsed."""
        code = str(code or "").strip()
        if not code:
            return False
        now = time.time()
        if self._pair_code and code == str(self._pair_code) and now > self._pair_until:
            return True
        for prev, until in self._valid_codes:
            if prev == code and now > float(until):
                return True
        replay = self._pair_replay
        if (
            replay
            and replay.get("code") == code
            and now >= float(replay.get("until") or 0)
        ):
            return True
        return False

    def _pair_client_key(self, handler):
        """Rate-limit key. Tunnel traffic arrives as 127.0.0.1 from cloudflared."""
        ip = handler.client_address[0] if handler.client_address else "?"
        if ip in ("127.0.0.1", "::1"):
            headers = getattr(handler, "headers", None)
            fwd = ""
            if headers is not None:
                fwd = (
                    headers.get("CF-Connecting-IP")
                    or headers.get("X-Forwarded-For")
                    or ""
                )
            fwd = str(fwd).split(",")[0].strip()
            return "tun:" + fwd if fwd else "tun:loopback"
        return ip

    def _pair_rate_limited(self, ip):
        now = time.time()
        self._pair_fails = {
            key: val
            for key, val in self._pair_fails.items()
            if now - float(val[1] or 0) < 120
        }
        fails, last = self._pair_fails.get(ip, (0, 0))
        if now - float(last or 0) >= 120:
            self._pair_fails.pop(ip, None)
            return False
        return fails >= 8

    def _watch_http(self):
        if getattr(self, "_peer", None):
            return
        while not self._beacon_stop.wait(5):
            if self._thread and self._thread.is_alive() and self._httpd:
                continue
            print("[WARNING] Phone bridge HTTP down. Restarting.")
            try:
                if self._httpd is None:
                    self._httpd = _BridgeServer(
                        ("0.0.0.0", self.port), self._make_handler()
                    )
                if not self._thread or not self._thread.is_alive():
                    self._thread = threading.Thread(
                        target=self._httpd.serve_forever, daemon=True
                    )
                    self._thread.start()
            except Exception as e:
                self._httpd = None
                print(f"[WARNING] Phone bridge restart failed: {e}")

    def unlink(self, phone_id):
        if self.api.account_meta is None:
            return False
        # Report the actual mutation result.  Returning True for a missing
        # phone made the UI believe the unlink had completed while its state
        # was still stale, which could race the account/start refresh.
        return bool(self.api.account_meta.remove_phone(phone_id))

    def forget_phone(self, android_id="", name="", model=""):
        """Drop a stored phone after uninstall/reinstall (no token left)."""
        if self.api.account_meta is None:
            return ""
        phone = match_existing_phone(
            self.api.account_meta.get_phones(),
            android_id=android_id,
            name=name,
            model=model,
        )
        if not phone:
            return ""
        removed = phone.get("name") or phone.get("id") or "Phone"
        self.api.account_meta.remove_phone(phone.get("id"))
        return removed

    def enqueue(self, kind, detail="", account_id=None):
        """Queue a job for the linked phone. Returns job id or None."""
        kind = str(kind or "")
        if kind not in PHONE_JOB_KINDS:
            return None
        if getattr(self, "_peer", None):
            return self._peer_enqueue(kind, detail)
        self._prune_jobs()
        if account_id:
            candidates = self._phones_for_account(account_id)
        else:
            candidates = self.phones_for_jobs()
        if not candidates:
            return None
        job_id = uuid.uuid4().hex[:12]
        event = threading.Event()
        phones = []
        if isinstance(candidates, (list, tuple)):
            phones = sorted(
                candidates,
                key=lambda p: float((p or {}).get("last_seen_ts") or 0),
                reverse=True,
            )
        job = {
            "id": job_id,
            "kind": kind,
            "detail": detail,
            "status": "queued",
            "ok": None,
            "result": "",
            "created": time.time(),
            "event": event,
            "phone_id": str((phones[0].get("id") if phones else "") or ""),
        }
        with self._lock:
            self._jobs[job_id] = job
        return job_id

    def wait_job(self, job_id, timeout=180):
        if getattr(self, "_peer", None):
            return self._peer_wait(job_id, timeout)
        job = self._jobs.get(job_id)
        if not job:
            return {"ok": False, "detail": "no job"}
        finished = job["event"].wait(timeout=timeout)
        if not finished:
            with self._lock:
                if job.get("status") in ("queued", "sent"):
                    job["status"] = "expired"
                    job["ok"] = False
                    job["result"] = "timeout"
                    job["event"].set()
            self._prune_jobs()
            return {"ok": False, "detail": "timeout", "status": "expired"}
        return {
            "ok": bool(job.get("ok")),
            "detail": job.get("result") or job.get("status"),
            "status": job.get("status"),
        }

    def request_and_wait(self, kind, timeout=180, detail=""):
        job_id = self.enqueue(kind, detail)
        if not job_id:
            return {"ok": False, "detail": "no phone linked or phone offline"}
        self.api._safe_log(
            f"Phone job '{kind}' queued — waiting up to {int(timeout)}s."
        )
        return self.wait_job(job_id, timeout=timeout)

    def _online_phones(self):
        if self.api.account_meta is None:
            return []
        now = time.time()
        return [
            p
            for p in self.api.account_meta.get_phones()
            if (now - float(p.get("last_seen_ts") or 0)) < PHONE_ONLINE_SEC
        ]

    def phones_for_jobs(self):
        """Phones that can still take a job (recent heartbeat, or a stored token)."""
        online = self._online_phones()
        if online:
            return online
        if self.api.account_meta is None:
            return []
        return [p for p in self.api.account_meta.get_phones() if p.get("token")]

    def _prune_jobs(self):
        now = time.time()
        with self._lock:
            dead = [
                job_id
                for job_id, job in self._jobs.items()
                if now - float(job.get("created") or 0) > 600
                or job.get("status") == "expired"
            ]
            for job_id in dead:
                self._jobs.pop(job_id, None)

    # -- internals ----------------------------------------------------------

    def _beacon_loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        sock.settimeout(1)
        while not self._beacon_stop.is_set():
            url = ""
            if self.tunnel and self.tunnel.public_url:
                url = self.tunnel.public_url
            else:
                url = f"http://{_lan_ip()}:{self.port}"
            if self._pair_code and time.time() < self._pair_until:
                msg = self._pair_payload(url).encode("utf-8")
            else:
                msg = f"AR2|{url}|-|reconnect|0".encode("utf-8")
            try:
                sock.sendto(msg, ("255.255.255.255", BEACON_PORT))
            except Exception as e:
                if not getattr(self, "_beacon_warned", False):
                    self._beacon_warned = True
                    print(f"[WARNING] Phone beacon UDP failed: {e}")
            self._beacon_stop.wait(2.0)
        sock.close()

    def _open_firewall(self):
        if os.name != "nt":
            return
        try:
            import subprocess

            subprocess.run(
                [
                    "netsh",
                    "advfirewall",
                    "firewall",
                    "add",
                    "rule",
                    "name=AutoRewarder Phone Bridge",
                    "dir=in",
                    "action=allow",
                    "protocol=TCP",
                    f"localport={self.port}",
                    "profile=private,domain",
                ],
                capture_output=True,
                timeout=8,
                creationflags=0x08000000,
            )
        except Exception:
            pass

    def _current_account_id(self):
        try:
            return (
                self.api.account_manager.current_id()
                if self.api.account_manager
                else None
            )
        except Exception:
            return None

    def _all_phones_for_account(self, account_id):
        if not account_id:
            return []
        try:
            if self._current_account_id() == account_id and self.api.account_meta:
                return self.api.account_meta.get_phones()
            from .accounts.meta import AccountMetaManager

            return AccountMetaManager(account_id).get_phones()
        except Exception:
            return []

    def _phones_for_account(self, account_id):
        phones = self._all_phones_for_account(account_id)
        now = time.time()
        online = [
            p
            for p in phones
            if (now - float(p.get("last_seen_ts") or 0)) < PHONE_ONLINE_SEC
        ]
        if online:
            return online
        return [p for p in phones if p.get("token")]

    def _iter_account_phones(self):
        order = []
        current = self._current_account_id()
        if current:
            order.append(current)
        try:
            for acc in self.api.account_manager.list() or []:
                aid = acc.get("id")
                if aid and aid not in order:
                    order.append(aid)
        except Exception:
            pass
        if not order and self.api.account_meta is not None:
            for phone in self.api.account_meta.get_phones():
                yield current, phone
            return
        for aid in order:
            for phone in self._all_phones_for_account(aid):
                yield aid, phone

    def _upsert_phone_for_account(self, account_id, phone):
        clean = {k: v for k, v in dict(phone).items() if k != "_account_id"}
        try:
            if self._current_account_id() == account_id and self.api.account_meta:
                self.api.account_meta.upsert_phone(clean)
                return
            from .accounts.meta import AccountMetaManager

            AccountMetaManager(account_id).upsert_phone(clean)
        except Exception:
            pass

    def _local_bridge_alive(self):
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{BRIDGE_PORT}/ping", method="GET"
            )
            with urllib.request.urlopen(req, timeout=1) as resp:
                data = json.loads(resp.read().decode() or "{}")
            return bool(data.get("ok") and data.get("protocol") is not None)
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            return False

    def _is_loopback(self, handler):
        ip = handler.client_address[0] if handler.client_address else ""
        return ip in ("127.0.0.1", "::1")

    def _internal_ok(self, handler):
        if not self._is_loopback(handler):
            return False
        got = str(handler.headers.get("X-AR-Internal") or "").strip()
        secret = str(self._pair_secret or "")
        return bool(got) and bool(secret) and hmac.compare_digest(got, secret)

    def _peer_headers(self):
        return {
            "Content-Type": "application/json",
            "X-AR-Internal": str(self._pair_secret or ""),
        }

    def _peer_enqueue(self, kind, detail=""):
        aid = self._current_account_id() or ""
        payload = json.dumps(
            {"kind": kind, "detail": detail, "account_id": aid}
        ).encode()
        try:
            req = urllib.request.Request(
                self._peer + "/internal/job",
                data=payload,
                headers=self._peer_headers(),
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode() or "{}")
            return data.get("id") if data.get("ok") else None
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            return None

    def _peer_wait(self, job_id, timeout=180):
        deadline = time.time() + float(timeout)
        last = {"ok": False, "detail": "timeout", "status": "expired"}
        while time.time() < deadline:
            try:
                req = urllib.request.Request(
                    self._peer + "/internal/job?id=" + str(job_id),
                    headers=self._peer_headers(),
                    method="GET",
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode() or "{}")
                status = str(data.get("status") or "")
                if status and status not in ("queued", "sent"):
                    return {
                        "ok": bool(data.get("ok")),
                        "detail": data.get("detail") or status,
                        "status": status,
                    }
                if data.get("ok") is False and data.get("error") == "no job":
                    return {"ok": False, "detail": "no job"}
                last = {
                    "ok": bool(data.get("ok")),
                    "detail": data.get("detail") or status,
                    "status": status or "queued",
                }
            except (urllib.error.URLError, TimeoutError, OSError, ValueError):
                pass
            time.sleep(0.4)
        try:
            payload = json.dumps({"id": job_id, "expire": True}).encode()
            req = urllib.request.Request(
                self._peer + "/internal/job",
                data=payload,
                headers=self._peer_headers(),
                method="POST",
            )
            urllib.request.urlopen(req, timeout=3).read()
        except (urllib.error.URLError, TimeoutError, OSError, ValueError):
            pass
        return last

    def _internal_job_status(self, job_id):
        job = self._jobs.get(job_id)
        if not job:
            return {"ok": False, "error": "no job"}
        return {
            "ok": True,
            "id": job.get("id"),
            "status": job.get("status"),
            "detail": job.get("result") or job.get("status"),
            "job_ok": job.get("ok"),
        }

    def _internal_expire_job(self, job_id):
        job = self._jobs.get(job_id)
        if not job:
            return False
        with self._lock:
            if job.get("status") in ("queued", "sent"):
                job["status"] = "expired"
                job["ok"] = False
                job["result"] = "timeout"
                try:
                    job["event"].set()
                except Exception:
                    pass
        return True

    def _account(self):
        return self.api.account_manager.get_current() or {}

    def _profile(self):
        if self.api.account_meta is None:
            return {}
        return self.api.account_meta.get_rewards_profile() or {}

    def _auth_phone(self, token):
        if not token:
            return None
        for aid, phone in self._iter_account_phones():
            if phone.get("token") == token:
                found = dict(phone)
                found["_account_id"] = aid
                return found
        return None

    def _touch(self, phone):
        phone["last_seen"] = datetime.now().isoformat(timespec="seconds")
        phone["last_seen_ts"] = time.time()
        aid = phone.get("_account_id") or self._current_account_id()
        if aid:
            self._upsert_phone_for_account(aid, phone)
            return
        if self.api.account_meta is not None:
            clean = {k: v for k, v in phone.items() if k != "_account_id"}
            self.api.account_meta.upsert_phone(clean)

    def _make_handler(self):
        bridge = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, fmt, *args):
                return

            def setup(self):
                super().setup()
                try:
                    self.connection.settimeout(120)
                except Exception:
                    pass

            def _send_apk(self):
                try:
                    from .apk_update import apk_path, publish_local

                    path = apk_path()
                    if not os.path.isfile(path):
                        publish_local()
                    path = apk_path()
                    if not os.path.isfile(path):
                        return self._json(404, {"ok": False, "error": "no_apk"})
                    size = os.path.getsize(path)
                    self.send_response(200)
                    self.send_header(
                        "Content-Type", "application/vnd.android.package-archive"
                    )
                    self.send_header(
                        "Content-Disposition", "attachment; filename=AutoRewarder.apk"
                    )
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(size))
                    self.end_headers()
                    with open(path, "rb") as fh:
                        while True:
                            chunk = fh.read(64 * 1024)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                except Exception as e:
                    try:
                        self._json(500, {"ok": False, "error": str(e)})
                    except Exception:
                        pass

            def _json(self, code, payload):
                raw = json.dumps(payload).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header(
                    "Access-Control-Allow-Headers", "Authorization, Content-Type"
                )
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def _body(self):
                n = int(self.headers.get("Content-Length") or 0)
                if n <= 0:
                    return {}
                try:
                    return json.loads(self.rfile.read(n).decode("utf-8"))
                except Exception:
                    return {}

            def _token(self):
                h = self.headers.get("Authorization") or ""
                if h.lower().startswith("bearer "):
                    return h.split(" ", 1)[1].strip()
                q = urlparse(self.path).query
                for part in q.split("&"):
                    if part.startswith("token="):
                        return part.split("=", 1)[1]
                return ""

            def do_OPTIONS(self):
                self.send_response(204)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header(
                    "Access-Control-Allow-Headers", "Authorization, Content-Type"
                )
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.end_headers()

            def do_GET(self):
                try:
                    self._do_GET()
                except Exception as e:
                    try:
                        self._json(500, {"ok": False, "error": str(e)})
                    except Exception:
                        pass

            def _do_GET(self):
                path = urlparse(self.path).path
                if path == "/ping":
                    return self._json(
                        200,
                        {
                            "ok": True,
                            "version": CURRENT_VERSION,
                            "protocol": PROTOCOL_VERSION,
                            "app": CURRENT_VERSION,
                        },
                    )
                if path == "/internal/job":
                    if not bridge._internal_ok(self):
                        return self._json(403, {"ok": False, "error": "local_only"})
                    job_id = (parse_qs(urlparse(self.path).query).get("id") or [""])[0]
                    return self._json(200, bridge._internal_job_status(job_id))
                if path == "/pair/begin":
                    ip = self.client_address[0] if self.client_address else ""
                    if ip not in ("127.0.0.1", "::1"):
                        return self._json(403, {"ok": False, "error": "local_only"})
                    info = bridge.begin_pairing()
                    info["ok"] = True
                    return self._json(200, info)
                if path == "/discover":
                    return self._json(200, bridge.info())
                if path == "/update":
                    try:
                        from .apk_update import update_payload

                        return self._json(200, update_payload())
                    except Exception as e:
                        return self._json(200, {"ok": False, "error": str(e)})
                if path == "/update/apk":
                    return self._send_apk()
                phone = bridge._auth_phone(self._token())
                if path == "/me":
                    if not phone:
                        return self._json(401, {"ok": False, "error": "auth"})
                    bridge._touch(phone)
                    acc = bridge._account()
                    owner = phone.get("_account_id")
                    if owner and bridge.api.account_manager:
                        try:
                            got = bridge.api.account_manager.get(owner)
                        except Exception:
                            got = None
                        if got:
                            acc = got
                    prof = bridge._profile()
                    return self._json(
                        200,
                        {
                            "ok": True,
                            "account": acc.get("label") or "Account",
                            "membership": prof.get("membership") or "Microsoft Rewards",
                            "phone": phone.get("name") or "Phone",
                            "ready": bool(acc.get("first_setup_done")),
                            "version": CURRENT_VERSION,
                            "protocol": PROTOCOL_VERSION,
                            "app": CURRENT_VERSION,
                            "ui_locale": getattr(
                                bridge.api, "ui_locale", lambda: "en"
                            )(),
                        },
                    )
                if path == "/jobs":
                    if not phone:
                        return self._json(401, {"ok": False, "error": "auth"})
                    bridge._touch(phone)
                    bridge._prune_jobs()
                    pending = []
                    pid = str(phone.get("id") or "")
                    with bridge._lock:
                        for job in list(bridge._jobs.values()):
                            if job["status"] != "queued":
                                continue
                            owner = str(job.get("phone_id") or "")
                            if owner and pid and owner != pid:
                                continue
                            job["status"] = "sent"
                            if pid:
                                job["phone_id"] = pid
                            pending.append(
                                {
                                    "id": job["id"],
                                    "kind": job["kind"],
                                    "detail": job.get("detail") or "",
                                }
                            )
                    return self._json(200, {"ok": True, "jobs": pending})
                if path == "/overview":
                    if not phone:
                        return self._json(401, {"ok": False, "error": "auth"})
                    bridge._touch(phone)
                    try:
                        data = bridge.api.get_rewards_overview() or {}
                    except Exception:
                        data = {}
                    data["ok"] = True
                    data["running"] = bool(bridge.api.is_running())
                    try:
                        stats = bridge.api.get_stats() or {}
                        data["stats"] = stats.get("derived") or {}
                    except Exception:
                        data["stats"] = {}
                    try:
                        gs = bridge.api.global_settings.get_settings()
                        data["queries"] = {
                            "pc": int(gs.get("queries_pc") or 15),
                            "mobile": int(gs.get("queries_mobile") or 15),
                        }
                    except Exception:
                        data["queries"] = {"pc": 15, "mobile": 15}
                    try:
                        data["block"] = bridge.api.start_block_reason()
                    except Exception:
                        data["block"] = None
                    return self._json(200, data)
                served = bridge._static(path)
                if served is not None:
                    body, ctype = served
                    self.send_response(200)
                    self.send_header("Content-Type", ctype)
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                return self._json(404, {"ok": False})

            def do_POST(self):
                try:
                    self._do_POST()
                except Exception as e:
                    try:
                        self._json(500, {"ok": False, "error": str(e)})
                    except Exception:
                        pass

            def _do_POST(self):
                path = urlparse(self.path).path
                body = self._body()
                if path == "/internal/job":
                    if not bridge._internal_ok(self):
                        return self._json(403, {"ok": False, "error": "local_only"})
                    if body.get("expire"):
                        ok = bridge._internal_expire_job(str(body.get("id") or ""))
                        return self._json(200, {"ok": bool(ok)})
                    job_id = bridge.enqueue(
                        str(body.get("kind") or ""),
                        str(body.get("detail") or ""),
                        account_id=str(body.get("account_id") or "") or None,
                    )
                    if not job_id:
                        return self._json(
                            200, {"ok": False, "error": "no phone linked"}
                        )
                    return self._json(200, {"ok": True, "id": job_id})
                if path == "/phone/forget":
                    removed = bridge.forget_phone(
                        str(body.get("android_id") or ""),
                        str(body.get("name") or ""),
                        str(body.get("model") or ""),
                    )
                    if removed:
                        print("Phone forgotten after reinstall/unlink: " + str(removed))
                        threading.Thread(
                            target=bridge._notify_ui,
                            args=("unlinked", True, str(removed)),
                            daemon=True,
                        ).start()
                    return self._json(200, {"ok": True, "removed": bool(removed)})
                if path == "/pair":
                    ip = bridge._pair_client_key(self)
                    if bridge._pair_rate_limited(ip):
                        return self._json(429, {"ok": False, "error": "rate_limit"})
                    fails, last = bridge._pair_fails.get(ip, (0, 0))
                    code = str(body.get("code") or "").strip()
                    sig = str(body.get("sig") or "").strip()
                    url = str(body.get("url") or "").strip()
                    phone_protocol = wire_protocol(body.get("protocol"))
                    if phone_protocol > PROTOCOL_VERSION:
                        return self._json(
                            400,
                            {
                                "ok": False,
                                "error": "protocol",
                                "protocol": PROTOCOL_VERSION,
                                "app": CURRENT_VERSION,
                                "message": "Este celular usa un protocolo más nuevo. Actualiza AutoRewarder en el PC.",
                            },
                        )
                    verdict = bridge._verify_pair(code, url, sig)
                    if verdict == "replay":
                        return self._json(200, bridge._pair_replay["payload"])
                    if not verdict:
                        if last and time.time() - float(last) >= 120:
                            fails = 0
                        bridge._pair_fails[ip] = (fails + 1, time.time())
                        print(
                            f"Pair rejected from {ip}: code={code!r} "
                            f"active={bridge._pair_code!r} "
                            f"until={int(bridge._pair_until)}"
                        )
                        if bridge._pair_expired(code):
                            return self._json(
                                400,
                                {
                                    "ok": False,
                                    "error": "expired",
                                    "message": "Ese código ya caducó. En el PC abre Account → Vincular un celular y usa el código nuevo.",
                                },
                            )
                        return self._json(
                            400,
                            {
                                "ok": False,
                                "error": "bad_code",
                                "message": "Ese código no está activo. En el PC abre Account → Vincular un celular y usa el código nuevo.",
                            },
                        )
                    if bridge.api.account_meta is None:
                        return self._json(
                            400,
                            {
                                "ok": False,
                                "error": "no_microsoft_account",
                                "kind": "microsoft",
                                "message": "No Microsoft account selected.",
                            },
                        )
                    bridge._pair_fails.pop(ip, None)
                    name = str(body.get("name") or "Phone")[:40]
                    model = str(body.get("model") or "")[:40]
                    android_id = str(body.get("android_id") or "").strip()[:64]
                    phone = match_existing_phone(
                        bridge.api.account_meta.get_phones(),
                        android_id=android_id,
                        name=name,
                        model=model,
                    )
                    if phone is None:
                        phone = {
                            "id": uuid.uuid4().hex[:10],
                            "token": uuid.uuid4().hex + uuid.uuid4().hex,
                            "paired_at": datetime.now().isoformat(timespec="seconds"),
                        }
                    phone["name"] = name
                    phone["model"] = model
                    if android_id:
                        phone["android_id"] = android_id
                    phone["last_seen"] = datetime.now().isoformat(timespec="seconds")
                    phone["last_seen_ts"] = time.time()
                    if not phone.get("token"):
                        phone["token"] = uuid.uuid4().hex + uuid.uuid4().hex
                    bridge.api.account_meta.upsert_phone(phone)
                    acc = bridge._account()
                    prof = bridge._profile()
                    info = bridge.info()
                    payload = {
                        "ok": True,
                        "token": phone["token"],
                        "account": acc.get("label") or "Account",
                        "membership": prof.get("membership") or "Microsoft Rewards",
                        "phone": phone["name"],
                        "url": info.get("url"),
                        "lan_url": info.get("lan_url"),
                        "public_url": info.get("public_url"),
                        "ready": bool(acc.get("first_setup_done")),
                        "protocol": PROTOCOL_VERSION,
                        "app": CURRENT_VERSION,
                        "version": CURRENT_VERSION,
                    }
                    bridge._pair_replay = {
                        "code": code,
                        "until": time.time() + 600,
                        "payload": payload,
                    }
                    print(
                        "Phone linked: "
                        + str(phone["name"])
                        + " -> "
                        + str(acc.get("label"))
                        + " code="
                        + str(code)
                    )
                    threading.Thread(
                        target=bridge._notify_ui,
                        args=("paired", True, str(phone.get("name") or "")),
                        daemon=True,
                    ).start()
                    return self._json(200, payload)
                phone = bridge._auth_phone(self._token())
                if not phone:
                    return self._json(401, {"ok": False, "error": "auth"})
                bridge._touch(phone)
                if path.startswith("/jobs/") and path.endswith("/done"):
                    job_id = path.split("/")[2]
                    with bridge._lock:
                        job = bridge._jobs.get(job_id)
                        if not job:
                            return self._json(
                                404, {"ok": False, "error": "unknown_job"}
                            )
                        if job.get("status") == "expired":
                            return self._json(200, {"ok": True, "status": "expired"})
                        job["status"] = "done"
                        job["ok"] = bool(body.get("ok"))
                        job["result"] = str(body.get("detail") or "")
                        job["event"].set()
                    threading.Thread(
                        target=bridge._notify_ui,
                        args=(
                            job.get("kind") if job else "job",
                            bool(body.get("ok")),
                            str(body.get("detail") or ""),
                        ),
                        daemon=True,
                    ).start()
                    return self._json(200, {"ok": True})
                if path == "/pc/run":
                    block = bridge.api.start_block_reason()
                    if block:
                        code = 409 if block.get("error") == "already_running" else 400
                        return self._json(code, block)
                    mode = str(body.get("mode") or "tasks")
                    if mode not in PC_RUN_MODES:
                        return self._json(
                            400,
                            {
                                "ok": False,
                                "error": "unknown_mode",
                                "mode": mode,
                                "message": "Ese modo no existe en este PC.",
                            },
                        )
                    threading.Thread(
                        target=bridge._run_pc, args=(mode,), daemon=True
                    ).start()
                    return self._json(200, {"ok": True, "mode": mode, "started": True})
                if path == "/pc/queries":
                    try:
                        if body.get("pc") is not None:
                            bridge.api.global_settings.set_queries_pc(body.get("pc"))
                        if body.get("mobile") is not None:
                            bridge.api.global_settings.set_queries_mobile(
                                body.get("mobile")
                            )
                    except Exception as e:
                        return self._json(400, {"ok": False, "error": str(e)})
                    threading.Thread(
                        target=bridge._notify_ui,
                        args=("queries", True, ""),
                        daemon=True,
                    ).start()
                    try:
                        pc = int(bridge.api.global_settings.get_queries_pc())
                        mobile = int(bridge.api.global_settings.get_queries_mobile())
                    except Exception:
                        pc, mobile = 15, 15
                    return self._json(200, {"ok": True, "pc": pc, "mobile": mobile})
                if path == "/pc/stop":
                    manual = bool(body.get("manual"))
                    try:
                        bridge.api.stop(manual)
                    except Exception as e:
                        return self._json(500, {"ok": False, "error": str(e)})
                    return self._json(
                        200, {"ok": True, "stopped": True, "manual": manual}
                    )
                if path == "/phone/event":
                    kind = str(body.get("kind") or "")
                    ok = bool(body.get("ok"))
                    detail = str(body.get("detail") or "")
                    print(
                        f"Phone event {phone.get('name')}: {kind} "
                        f"{'ok' if ok else 'fail'} {detail}"
                    )
                    if event_completes_job(kind, detail):
                        pid = str(phone.get("id") or "")
                        with bridge._lock:
                            for job in bridge._jobs.values():
                                if job.get("kind") != kind:
                                    continue
                                if job.get("status") not in ("queued", "sent"):
                                    continue
                                owner = str(job.get("phone_id") or "")
                                if owner and pid and owner != pid:
                                    continue
                                job["status"] = "done"
                                job["ok"] = ok
                                job["result"] = detail or "phone event"
                                job["event"].set()
                                break
                    threading.Thread(
                        target=bridge._notify_ui,
                        args=(kind, ok, detail),
                        daemon=True,
                    ).start()
                    return self._json(200, {"ok": True})
                if path == "/phone/unlink":
                    pid = phone.get("id")
                    name = phone.get("name") or "Phone"
                    bridge.api.account_meta.remove_phone(pid)
                    print("Phone unlinked: " + str(name))
                    threading.Thread(
                        target=bridge._notify_ui,
                        args=("unlinked", True, str(name)),
                        daemon=True,
                    ).start()
                    return self._json(200, {"ok": True})
                return self._json(404, {"ok": False})

        return Handler

    def _static(self, path):
        """Serve the phone companion UI over LAN (APK WebView + browser fallback)."""
        mapping = {
            "/": ("phone.html", "text/html; charset=utf-8"),
            "/app": ("phone.html", "text/html; charset=utf-8"),
            "/index.html": ("phone.html", "text/html; charset=utf-8"),
            "/phone.html": ("phone.html", "text/html; charset=utf-8"),
            "/phone.js": ("phone.js", "application/javascript; charset=utf-8"),
            "/i18n.js": ("i18n.js", "application/javascript; charset=utf-8"),
            "/styles.css": ("styles.css", "text/css; charset=utf-8"),
            "/normalize.css": ("normalize.css", "text/css; charset=utf-8"),
        }
        spec = mapping.get(path)
        if not spec:
            return None
        name, ctype = spec
        file_path = os.path.join(GUI_DIR, name)
        if not os.path.isfile(file_path):
            return None
        with open(file_path, "rb") as fh:
            return fh.read(), ctype

    def _notify_ui(self, kind, ok, detail):
        try:
            window = getattr(self.api, "_webview_window", None)
            if window is not None:
                window.evaluate_js(
                    "typeof refresh_rewards_overview==='function'&&refresh_rewards_overview();"
                    "typeof refresh_phone_ui==='function'&&refresh_phone_ui();"
                )
        except Exception:
            pass
        try:
            if kind in ("checkin", "news", "returned from bing", "paired"):
                self.api._notify_progress()
        except Exception:
            pass

    def _run_pc(self, mode):
        try:
            block = self.api.start_block_reason()
            if block:
                print("Phone run blocked: " + block.get("message", ""))
                return
            if mode == "start":
                settings = self.api.global_settings.get_settings()
                pc = int(settings.get("queries_pc") or 15)
                mobile = int(settings.get("queries_mobile") or 15)
                self.api.main(pc, mobile, False)
            elif mode == "edge":
                self.api._run_edge_browse_if_needed()
            else:
                self.api.main(0, 0, True)
        except Exception as e:
            print(f"[ERROR] Phone-triggered PC run failed: {e}")
            try:
                self.api._safe_log(f"[ERROR] Phone-triggered PC run failed: {e}")
            except Exception:
                pass


_bridge = None


def start_bridge(api):
    global _bridge
    if _bridge is None:
        _bridge = PhoneBridge(api)
    _bridge.start()
    return _bridge


def get_bridge():
    return _bridge
