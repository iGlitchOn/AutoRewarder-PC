"""Shared utility helpers for AutoRewarder."""

import os
import re
import time
import random
import requests

from .config import APP_DIR, GITHUB_VERSION, REPO


def _gui_lock_path():
    return os.path.join(APP_DIR, "gui.lock")


def write_gui_lock():
    path = _gui_lock_path()
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(str(os.getpid()))


def clear_gui_lock():
    try:
        os.remove(_gui_lock_path())
    except OSError:
        pass


class HeadlessRunLock:
    """One headless AutoRewarder at a time so schtasks cannot share Edge."""

    def __init__(self, path=None):
        self.path = path or os.path.join(APP_DIR, "headless.run.lock")
        self._fh = None

    def acquire(self, wait_s=0):
        os.makedirs(os.path.dirname(self.path) or ".", exist_ok=True)
        deadline = time.time() + max(0, float(wait_s or 0))
        while True:
            fh = open(self.path, "a+b")
            try:
                fh.seek(0)
                if os.name == "nt":
                    import msvcrt

                    msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
                else:
                    import fcntl

                    fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                fh.seek(0)
                fh.truncate()
                fh.write(str(os.getpid()).encode("ascii"))
                fh.flush()
                self._fh = fh
                return True
            except OSError:
                try:
                    fh.close()
                except Exception:
                    pass
                if time.time() >= deadline:
                    return False
                time.sleep(5)

    def release(self):
        fh = self._fh
        self._fh = None
        if fh is None:
            return
        try:
            fh.seek(0)
            if os.name == "nt":
                import msvcrt

                msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl

                fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        except Exception:
            pass
        try:
            fh.close()
        except Exception:
            pass


def gui_instance_running():
    path = _gui_lock_path()
    if not os.path.isfile(path):
        return False
    try:
        pid = int(open(path, encoding="utf-8").read().strip())
    except (OSError, ValueError):
        return False
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _github_is_newer(latest, current):
    """
    True when the GitHub release tag is a newer *release* than this build.

    Local builds use 4.2.<time> (e.g. 4.2.9:58PM) while GitHub tags are v4.2.
    Compare only major.minor so a custom 4.2.x build does not nag about v4.2.
    """

    def _pair(value):
        text = str(value or "").strip().lstrip("vV")
        match = re.match(r"(\d+)\.(\d+)", text)
        if not match:
            return (0, 0)
        return (int(match.group(1)), int(match.group(2)))

    return _pair(latest) > _pair(current)


def release_is_newer(latest, current):
    """Compare major, minor, and patch numbers from release tags."""

    def _version(value):
        numbers = re.findall(r"\d+", str(value or ""))
        return tuple(int(item) for item in numbers[:3]) + (0,) * (3 - len(numbers[:3]))

    return _version(latest) > _version(current)


def github_latest_release(repo, logger=None):
    """Return the latest GitHub release metadata for ``repo``.

    Uses ``GITHUB_TOKEN`` / ``GH_TOKEN`` when set so private repos (and the
    GUI Check updates button) match ``apk_update.fetch_github``.
    """
    try:
        headers = {
            "User-Agent": "AutoRewarder-App",
            "Accept": "application/vnd.github+json",
        }
        token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
        if token:
            headers["Authorization"] = "Bearer " + token
        response = requests.get(
            f"https://api.github.com/repos/{repo}/releases/latest",
            headers=headers,
            timeout=8,
        )
        if response.status_code != 200:
            if logger:
                logger(
                    f"[WARNING] GitHub update check failed for {repo}: {response.status_code}"
                )
            return {"ok": False, "error": f"http_{response.status_code}", "repo": repo}
        data = response.json()
        tag = str(data.get("tag_name") or "").strip()
        if not tag:
            return {"ok": False, "error": "no_tag", "repo": repo}
        assets = data.get("assets") or []
        asset = next(
            (
                item
                for item in assets
                if str(item.get("name") or "")
                .lower()
                .endswith((".exe", ".msi", ".zip", ".apk"))
            ),
            None,
        )
        file_url = str((asset or {}).get("browser_download_url") or "")
        return {
            "ok": True,
            "repo": repo,
            "tag": tag,
            "name": data.get("name") or tag,
            "url": data.get("html_url") or f"https://github.com/{repo}/releases/latest",
            "download_url": file_url,
            "asset_name": (asset or {}).get("name") or "",
        }
    except Exception as exc:
        if logger:
            logger(f"[WARNING] Could not check GitHub release {repo}: {exc}")
        return {"ok": False, "error": "network", "repo": repo}


def wait_or_stop(seconds, stop_event=None):
    """
    Sleep up to `seconds`. Return True immediately if Stop was requested.

    threading.Event.wait is used so a Stop click never sits behind a coffee
    break, news dwell, or Edge-streak interval.
    """
    try:
        seconds = float(seconds)
    except (TypeError, ValueError):
        seconds = 0.0
    if seconds < 0:
        seconds = 0.0
    if stop_event is None:
        if seconds:
            time.sleep(seconds)
        return False
    try:
        if stop_event.is_set():
            return True
        if seconds <= 0:
            return False
        return bool(stop_event.wait(timeout=seconds))
    except Exception:
        if seconds:
            time.sleep(seconds)
        return bool(stop_event.is_set())


def human_typing(element, text, stop_event=None):
    """
    Simulate human-like typing by sending keys to a web element with random delays.

    Args:
        element: The web element to send keys to.
        text: The text to type into the element.
        stop_event: Optional Event; typing aborts as soon as Stop is set.
    """

    for char in text:
        if stop_event is not None and stop_event.is_set():
            return
        element.send_keys(char)
        if wait_or_stop(random.uniform(0.05, 0.18), stop_event):
            return


def humanize_queries(queries):
    """
    Substitute character by keyboard distance to simulate human typing errors.

    Args:
        queries (list): A list of query strings.
    Returns:
        humanized_queries (list): Modified query strings with simulated typing errors.
    """
    import nlpaug.augmenter.char as nac  # type: ignore

    mod = nac.KeyboardAug(
        # 100% probability because the 20% overall chance
        # handled outside by the `random` module
        aug_char_p=1.0,
        aug_word_p=1.0,
        # Only one typo per query
        aug_char_max=1,
        aug_word_max=1,
        # Ignore short words
        min_char=4,
        include_upper_case=False,
        include_special_char=False,
        include_numeric=True,
    )

    humanized_queries = []

    for query in queries:
        if random.random() < 0.2:
            modified_query = mod.augment(query)
            typo_query = (
                modified_query[0]
                if isinstance(modified_query, list)
                else modified_query
            )
            humanized_queries.append(typo_query)
        else:
            humanized_queries.append(query)

    return humanized_queries


def check_for_updates(logger=None):
    """
    Check GitHub API for the latest release and compare it to the current version.

    Same timeout, headers, and optional token as ``github_latest_release``.

    Args:
        logger (callable, optional): A function to log messages. Defaults to None.

    Returns:
        tuple: (is_update_available (bool), latest_version (str or None))
    """
    try:
        release = github_latest_release(REPO, logger=logger)
        if not release or not release.get("ok"):
            return False, None
        latest = release.get("tag")
        if not latest:
            return False, None
        return _github_is_newer(latest, GITHUB_VERSION), latest
    except requests.exceptions.RequestException as e:
        if logger:
            logger(f"[WARNING] Network error while checking for updates: {e}")
    except Exception as e:
        if logger:
            logger(f"[ERROR] Unexpected error while checking for updates: {e}")

    return False, None
