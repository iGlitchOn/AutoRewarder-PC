"""App-wide global settings persistence."""

import json
import os

from ..config import APP_DIR, GLOBAL_SETTINGS_PATH

SCHEMA_VERSION = 3
UNREADABLE = object()


def _load_json_dict(path):
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError, OSError):
        return None


def _stash_file(path, suffix):
    dest = path + suffix
    try:
        if os.path.isfile(dest):
            os.remove(dest)
        os.replace(path, dest)
    except OSError:
        pass


def _read_json(path, default):
    """Read JSON without replacing a file that is only temporarily locked."""
    if not os.path.exists(path):
        return default

    import time as _time

    for attempt in range(4):
        try:
            with open(path, "r", encoding="utf-8") as file:
                data = json.load(file)
            if isinstance(data, dict):
                return data
            raise ValueError("settings must be an object")
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            recovered = _load_json_dict(path + ".backup")
            if recovered is not None:
                _stash_file(path, ".corrupt")
                try:
                    _write_json(path, recovered)
                except OSError:
                    pass
                return recovered
            _stash_file(path, ".backup")
            return default
        except OSError:
            _time.sleep(0.15 * (attempt + 1))

    return UNREADABLE


def _write_json(path, data):
    """
    Atomically write JSON via a temp file rename, with a retry loop that
    tolerates transient Windows locks (Defender, indexer, another instance
    briefly holding the file). A stale `.tmp` from a previous crashed write
    is removed before the write so its file attributes don't block us.

    Args:
        path: target file path to write
        data: JSON-serializable data to write

    Raises:
        OSError: If the file cannot be written.
    """
    import time as _time

    os.makedirs(os.path.dirname(path), exist_ok=True)
    temp_path = path + ".tmp"

    if os.path.exists(temp_path):
        try:
            os.remove(temp_path)
        except OSError:
            pass

    last_err = None
    for attempt in range(4):
        try:
            with open(temp_path, "w", encoding="utf-8") as file:
                json.dump(data, file, indent=4)
                file.flush()
                os.fsync(file.fileno())
            os.replace(temp_path, path)
            return
        except PermissionError as e:
            last_err = e
            _time.sleep(0.15 * (attempt + 1))
        except OSError as e:
            last_err = e
            _time.sleep(0.1)
    raise last_err if last_err else OSError(f"Could not write {path}")


class GlobalSettingsManager:
    """
    Manages app-wide (account-agnostic) settings.
    Keys: hide_browser, current_account_id, schema_version.
    """

    def __init__(self):
        self.path = GLOBAL_SETTINGS_PATH
        self._last_good = None
        self._read_ok = True

    def get_settings(self):
        """Return settings merged with defaults."""
        defaults = {
            "hide_browser": False,
            "current_account_id": None,
            "schema_version": SCHEMA_VERSION,
            # OS-level autostart master switch. When True, the app syncs
            # per-account daily scheduled tasks (Windows Task Scheduler /
            # systemd user timers); each account's schedule.run_time
            # decides when its own task fires.
            "autoStartUp": False,
            # When True, Windows sign-in launches AutoRewarder with --from-login:
            # leftover searches/tasks run automatically, then the app closes if
            # nothing is left. Separate from autoStartUp (scheduled daily run).
            "launch_on_login": False,
            # When True, clicking the window X hides the app to the system
            # tray instead of quitting. Default True preserves the behavior
            # introduced in v3.3; users who prefer the standard X = quit
            # can flip it off in Settings. Read once at app startup.
            "close_to_tray": True,
            # "Run it anyway" overrides. status.json remembers what already
            # ran today so a second run of the day skips it; these let the
            # user re-run a task whose saved status they don't trust (e.g. a
            # Daily Set card that stayed uncredited, or a visual search that
            # failed after being marked as done).
            "force_daily_tasks": False,
            "force_visual_search": False,
            # Default query counts.
            "queries_pc": 15,
            "queries_mobile": 15,
            # LLM-generated search terms (bring-your-own-key). When enabled and
            # a key is present, each phase asks the chosen provider for fresh
            # queries in the user's language; any failure falls back to the
            # static assets/queries.json. The key is stored in plain text here,
            # consistent with the rest of settings.json.
            "use_llm_queries": False,
            "llm_provider": "openai",  # openai | anthropic | gemini
            "llm_model": "",  # blank = provider default
            "llm_api_key": "",
            # Language of generated queries. "auto" resolves from
            # detected_locale (navigator.language) or OS detection.
            "search_locale": "auto",
            "detected_locale": "",  # filled by the GUI from navigator.language
            # UI language: "auto" follows Windows / region, else "en" or "es".
            "ui_language": "auto",
        }

        if APP_DIR and not os.path.exists(APP_DIR):
            try:
                os.makedirs(APP_DIR)
            except OSError:
                pass

        if not os.path.exists(self.path):
            recovered = _load_json_dict(self.path + ".backup")
            if recovered is not None:
                merged = {**defaults, **recovered}
                try:
                    self.save_settings(merged)
                except OSError:
                    pass
                self._last_good = dict(merged)
                self._read_ok = True
                return merged
            # First-launch init. If we can't write (locked/denied), still
            # return defaults so reads don't blow up — the next successful
            # write (via save_settings from a user action) will create it.
            try:
                self.save_settings(defaults)
            except OSError:
                pass
            return defaults

        settings = _read_json(self.path, None)
        if settings is UNREADABLE:
            self._read_ok = False
            return dict(self._last_good) if self._last_good else defaults

        if not isinstance(settings, dict):
            # Recovery path: recreate defaults. If the write fails (e.g.
            # transient Windows lock), don't crash the read — caller still
            # gets a valid default dict.
            try:
                self.save_settings(defaults)
            except OSError:
                pass
            return defaults

        # Fill missing defaults without clobbering existing keys. Persist the
        # merge so a newer build's extra keys survive the next update without
        # resetting the user's saved values.
        merged = {**defaults, **settings}
        self._last_good = dict(merged)
        self._read_ok = True
        if any(key not in settings for key in defaults):
            try:
                self.save_settings(merged)
            except OSError:
                pass
        return merged

    def save_settings(self, settings):
        """Persist settings to disk."""
        _write_json(self.path, settings)
        self._last_good = dict(settings)
        self._read_ok = True

    def settings_for_update(self):
        """Return settings only when the on-disk file was read authoritatively."""
        settings = self.get_settings()
        if not self._read_ok:
            raise OSError(
                f"{self.path} is locked; refusing to overwrite stale settings"
            )
        return settings

    def set_hide_browser(self, is_hide):
        """Update the hide_browser flag in settings."""
        settings = self.settings_for_update()
        settings["hide_browser"] = bool(is_hide)
        self.save_settings(settings)

    def set_close_to_tray(self, value):
        """Update the close_to_tray flag in settings."""
        settings = self.settings_for_update()
        settings["close_to_tray"] = bool(value)
        self.save_settings(settings)

    def get_current_account_id(self):
        """Return the current account id from settings."""
        return self.get_settings().get("current_account_id")

    def set_current_account_id(self, account_id):
        """Persist the current account id in settings."""
        settings = self.settings_for_update()
        settings["current_account_id"] = account_id
        self.save_settings(settings)

    def get_force_tasks(self):
        """Return the force flags for the daily tasks and the visual search."""
        settings = self.settings_for_update()
        return {
            "force_daily_tasks": bool(settings.get("force_daily_tasks", False)),
            "force_visual_search": bool(settings.get("force_visual_search", False)),
        }

    def set_force_tasks(self, force_daily_tasks, force_visual_search):
        """
        Persist the force flags.

        Args:
            force_daily_tasks (bool): Run the Daily Set even when today is
                already marked as done.
            force_visual_search (bool): Run the visual search even when today
                is already marked as done.
        """
        settings = self.settings_for_update()
        settings["force_daily_tasks"] = bool(force_daily_tasks)
        settings["force_visual_search"] = bool(force_visual_search)
        self.save_settings(settings)

    def get_queries_pc(self):
        """Return the saved PC queries count from settings."""
        return self.get_settings().get("queries_pc", 15)

    def set_queries_pc(self, count):
        """Persist the PC queries count in settings."""
        settings = self.settings_for_update()
        settings["queries_pc"] = max(0, min(130, int(count)))
        self.save_settings(settings)

    def get_queries_mobile(self):
        """Return the saved mobile queries count from settings."""
        return self.get_settings().get("queries_mobile", 15)

    def set_queries_mobile(self, count):
        """Persist the mobile queries count in settings."""
        settings = self.settings_for_update()
        settings["queries_mobile"] = max(0, min(99, int(count)))
        self.save_settings(settings)

    # ------------------------------------------------------------------
    # LLM-generated search terms + locale
    # ------------------------------------------------------------------

    def get_llm_config(self):
        """Return the LLM query-generation config from settings."""
        s = self.get_settings()
        return {
            "use_llm_queries": bool(s.get("use_llm_queries", False)),
            "llm_provider": s.get("llm_provider", "openai"),
            "llm_model": s.get("llm_model", ""),
            "llm_api_key": s.get("llm_api_key", ""),
            "search_locale": s.get("search_locale", "auto"),
            "detected_locale": s.get("detected_locale", ""),
        }

    def set_llm_config(
        self, use_llm_queries, provider, model, api_key, search_locale="auto"
    ):
        """Persist the LLM query-generation config.

        Unknown providers fall back to "openai"; an empty locale becomes
        "auto". The API key is stored as plain text alongside the other
        settings. A blank or whitespace-only key leaves the stored key as-is.
        """
        from ..search.llm import SUPPORTED_PROVIDERS

        provider = str(provider or "openai").strip().lower()
        if provider not in SUPPORTED_PROVIDERS:
            provider = "openai"

        locale = str(search_locale or "").strip() or "auto"

        settings = self.settings_for_update()
        settings["use_llm_queries"] = bool(use_llm_queries)
        settings["llm_provider"] = provider
        settings["llm_model"] = str(model or "").strip()
        incoming_key = str(api_key or "").strip()
        if incoming_key:
            settings["llm_api_key"] = incoming_key
        settings["search_locale"] = locale
        self.save_settings(settings)

    def set_detected_locale(self, locale):
        """Persist the locale reported by the GUI (navigator.language)."""
        settings = self.settings_for_update()
        settings["detected_locale"] = str(locale or "").strip()
        self.save_settings(settings)

    def get_effective_locale(self):
        """Return the locale that query generation will actually use."""
        from ..search.locale import resolve_search_locale

        return resolve_search_locale(self.get_settings())
