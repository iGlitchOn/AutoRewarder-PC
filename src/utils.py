"""Shared utility helpers for AutoRewarder."""

import re
import time
import random
import requests

from .config import GITHUB_VERSION, REPO


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
    """Return the latest public GitHub release metadata for ``repo``."""
    try:
        response = requests.get(
            f"https://api.github.com/repos/{repo}/releases/latest",
            headers={
                "User-Agent": "AutoRewarder-App",
                "Accept": "application/vnd.github+json",
            },
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

    Args:
        logger (callable, optional): A function to log messages. Defaults to None.

    Returns:
        tuple: (is_update_available (bool), latest_version (str or None))
    """
    try:
        headers = {"User-Agent": "AutoRewarder-App"}

        response = requests.get(
            f"https://api.github.com/repos/{REPO}/releases/latest",
            headers=headers,
            timeout=5,
        )
        if response.status_code == 200:
            latest = response.json().get("tag_name")
            if latest:
                return _github_is_newer(latest, GITHUB_VERSION), latest
        elif response.status_code == 429:
            if logger:
                logger("[WARNING] GitHub API rate limit reached (429).")
                logger("Try again later or check manually for updates.")
        elif response.status_code == 403:

            is_rate_limit = response.headers.get("X-Ratelimit-Remaining") == "0"

            if logger:
                if is_rate_limit:
                    logger(
                        "[WARNING] GitHub API rate limit exceeded (403). Try again later."
                    )
                else:
                    logger(
                        "[WARNING] GitHub access forbidden (403). Check your VPN or connection."
                    )
        else:
            if logger:
                logger(
                    f"[WARNING] GitHub update check failed. Status: {response.status_code}"
                )

    except requests.exceptions.RequestException as e:
        if logger:
            logger(f"[WARNING] Network error while checking for updates: {e}")
    except Exception as e:
        if logger:
            logger(f"[ERROR] Unexpected error while checking for updates: {e}")

    return False, None
