"""Per-account metadata persistence (first_setup_done, schedule)."""

import json
import os

from ..config import account_dir, account_meta_path

DEFAULT_ACCOUNT_SCHEDULE = {
    # Master toggle for this account's scheduled headless run.
    "enabled": False,
    # False = single burst when the headless runner fires.
    # True  = drip-feed the total across runDuration at queriesPerHour.
    "advancedScheduling": False,
    "runDuration": 3,  # hours, 1..24
    "queriesPerHour": 10,  # 1..99
    "queries_pc": 15,  # 0..130
    "queries_mobile": 15,  # 0..99
    "last_triggered_date": None,
    # Wall-clock time at which the OS-level scheduled task fires for this
    # account (24h "HH:MM"). Each account gets its own scheduled task so
    # users can stagger runs (e.g. Alice 09:00, Bob 10:30).
    "run_time": "09:00",
}

# Which Microsoft Rewards dashboard this account uses. Microsoft is rolling out
# a new React/Next.js dashboard that has a completely different DOM from the
# legacy `mee-rewards-*` one; the Daily Set automation must branch on it.
#   "auto"   -> detect at runtime which dashboard rendered (default)
#   "legacy" -> force the historical mee-rewards-* dashboard
#   "new"    -> force the new Next.js dashboard
DASHBOARD_VARIANTS = ("auto", "legacy", "new")
DEFAULT_DASHBOARD_VARIANT = "auto"


def default_account_schedule():
    """Return a fresh copy of the default per-account schedule."""
    return dict(DEFAULT_ACCOUNT_SCHEDULE)


def _read_json(path, default):
    """Read a JSON file. On any parse/IO failure, back it up as .backup and return default."""
    if not os.path.exists(path):
        return default

    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
            return data
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError, OSError):
        backup_path = path + ".backup"
        if os.path.exists(backup_path):
            try:
                os.remove(backup_path)
            except OSError:
                pass
        try:
            os.replace(path, backup_path)
        except OSError:
            pass
        return default


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
            os.replace(temp_path, path)
            return
        except PermissionError as e:
            last_err = e
            _time.sleep(0.15 * (attempt + 1))
        except OSError as e:
            last_err = e
            _time.sleep(0.1)
    raise last_err if last_err else OSError(f"Could not write {path}")


class AccountMetaManager:
    """
    Per-account metadata (currently just first_setup_done).
    Stored at accounts/<account_id>/meta.json.
    """

    def __init__(self, account_id):
        """
        Args:
            account_id: the ID of the account this manager handles (string)
        """
        self.account_id = account_id
        self.path = account_meta_path(account_id)

    def get_meta(self):
        """Return per-account meta merged with defaults."""
        defaults = {"first_setup_done": False}

        if not os.path.exists(account_dir(self.account_id)):
            try:
                os.makedirs(account_dir(self.account_id), exist_ok=True)
            except OSError:
                pass

        if not os.path.exists(self.path):
            try:
                self.save_meta(defaults)
            except OSError:
                pass
            return defaults

        meta = _read_json(self.path, None)
        if not isinstance(meta, dict):
            try:
                self.save_meta(defaults)
            except OSError:
                pass
            return defaults

        return {**defaults, **meta}

    def save_meta(self, meta):
        """Persist per-account meta to disk."""
        _write_json(self.path, meta)

    def is_first_setup_done(self):
        """Return True if first setup is marked complete."""
        return bool(self.get_meta().get("first_setup_done"))

    def mark_up_as_done(self):
        """Mark first setup as completed."""
        meta = self.get_meta()
        meta["first_setup_done"] = True
        self.save_meta(meta)

    def get_schedule(self):
        """Return this account's schedule, with defaults for missing keys."""
        meta = self.get_meta()
        sched = meta.get("schedule") if isinstance(meta, dict) else None
        merged = default_account_schedule()
        if isinstance(sched, dict):
            merged.update({k: sched.get(k, v) for k, v in merged.items()})
        return merged

    def set_schedule(self, sched):
        """
        Persist this account's schedule. `sched` should be a dict.

        Args:
            sched: dict with keys matching default_account_schedule.
                Missing keys will fall back to default values.
                Example: {"enabled": True, "queriesPerHour": 15}
        """
        meta = self.get_meta()
        meta["schedule"] = sched
        self.save_meta(meta)

    def get_dashboard_variant(self):
        """
        Return this account's Rewards dashboard variant.

        Returns one of DASHBOARD_VARIANTS, defaulting to DEFAULT_DASHBOARD_VARIANT
        when unset or invalid (backward compatible: pre-existing meta.json files
        simply resolve to "auto").
        """
        variant = self.get_meta().get("dashboard_variant")
        if variant in DASHBOARD_VARIANTS:
            return variant
        return DEFAULT_DASHBOARD_VARIANT

    def get_rewards_profile(self):
        """Return the last safely-detected Rewards account profile."""
        profile = self.get_meta().get("rewards_profile")
        return dict(profile) if isinstance(profile, dict) else {}

    def set_rewards_profile(self, profile):
        """Persist non-sensitive Rewards account metadata detected from the dashboard."""
        meta = self.get_meta()
        meta["rewards_profile"] = dict(profile) if isinstance(profile, dict) else {}
        self.save_meta(meta)

    def set_dashboard_variant(self, variant):
        """
        Persist this account's Rewards dashboard variant.

        Args:
            variant: one of DASHBOARD_VARIANTS ("auto", "legacy", "new").

        Returns:
            bool: True if persisted, False if the value was rejected.
        """
        if variant not in DASHBOARD_VARIANTS:
            return False
        meta = self.get_meta()
        meta["dashboard_variant"] = variant
        self.save_meta(meta)
        return True

    def get_live_manual_tasks(self):
        tasks = self.get_meta().get("manual_live")
        return list(tasks) if isinstance(tasks, list) else []

    def set_live_manual_tasks(self, tasks):
        meta = self.get_meta()
        meta["manual_live"] = list(tasks) if isinstance(tasks, list) else []
        self.save_meta(meta)

    def get_manual_prefs(self):
        meta = self.get_meta()
        ignored = meta.get("manual_ignored") if isinstance(meta, dict) else None
        removed = meta.get("manual_removed") if isinstance(meta, dict) else None
        return {
            "ignored": [str(x) for x in ignored] if isinstance(ignored, list) else [],
            "removed": [str(x) for x in removed] if isinstance(removed, list) else [],
        }

    def set_manual_pref(self, task_id, action):
        """action: ignore, unignore, remove, restore."""
        task_id = str(task_id or "").strip()
        if not task_id:
            return self.get_manual_prefs()
        meta = self.get_meta()
        ignored = [str(x) for x in (meta.get("manual_ignored") or [])]
        removed = [str(x) for x in (meta.get("manual_removed") or [])]
        if action == "ignore":
            if task_id not in ignored:
                ignored.append(task_id)
        elif action == "unignore":
            ignored = [x for x in ignored if x != task_id]
        elif action == "remove":
            if task_id not in removed:
                removed.append(task_id)
            ignored = [x for x in ignored if x != task_id]
        elif action == "restore":
            removed = [x for x in removed if x != task_id]
            ignored = [x for x in ignored if x != task_id]
        meta["manual_ignored"] = ignored
        meta["manual_removed"] = removed
        self.save_meta(meta)
        return self.get_manual_prefs()

    def get_phones(self):
        """Phones paired to this Microsoft account (LAN companion APK)."""
        phones = self.get_meta().get("phones")
        if not isinstance(phones, list):
            return []
        out = []
        for item in phones:
            if isinstance(item, dict) and item.get("id") and item.get("token"):
                out.append(dict(item))
        return out

    def upsert_phone(self, phone):
        """Insert or update a paired phone on this account."""
        if not isinstance(phone, dict) or not phone.get("id"):
            return
        meta = self.get_meta()
        phones = [dict(p) for p in (meta.get("phones") or []) if isinstance(p, dict)]
        pid = str(phone.get("id"))
        found = False
        for i, existing in enumerate(phones):
            if str(existing.get("id")) == pid:
                merged = dict(existing)
                merged.update(phone)
                phones[i] = merged
                found = True
                break
        if not found:
            phones.append(dict(phone))
        meta["phones"] = phones
        self.save_meta(meta)

    def remove_phone(self, phone_id):
        """Unlink a phone from this Microsoft account."""
        pid = str(phone_id or "").strip()
        if not pid:
            return False
        meta = self.get_meta()
        phones = [p for p in (meta.get("phones") or []) if isinstance(p, dict)]
        kept = [p for p in phones if str(p.get("id")) != pid]
        if len(kept) == len(phones):
            return False
        meta["phones"] = kept
        self.save_meta(meta)
        return True
