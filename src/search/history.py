"""History storage and retrieval for per-account searches."""

import os
import json
from datetime import datetime

# Cap so add_to_history stays O(1) in RAM and writes stay bounded.
HISTORY_MAX = 5000


class HistoryManager:
    """
    Manages the history of search queries for a single account.
    Each instance is bound to a specific history.json file path.
    """

    def __init__(self, history_file, logger=None):
        """
        Args:
            history_file (str): Absolute path to this account's history.json.
            logger (callable, optional): Logging function.
        """

        self.history_file = history_file
        self._logger = logger
        self._cache = None

    def _log(self, message):
        if self._logger:
            self._logger(message)

    def get_history(self):
        """
        Retrieve the search history from the JSON file.
        Returns an empty list if the file is missing or unreadable.
        """

        if self._cache is not None:
            return list(self._cache)

        if (
            not os.path.exists(self.history_file)
            or os.path.getsize(self.history_file) == 0
        ):
            self._cache = []
            return []

        try:
            with open(self.history_file, "r", encoding="utf-8") as file:
                history = json.load(file)

                if not isinstance(history, list):
                    raise ValueError("History data must be a list")

                self._cache = history
                return list(history)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
            self._log(
                "[ERROR] History file was unreadable or damaged. Starting with a fresh one."
            )

            backup_path = self.history_file + ".backup"

            if os.path.exists(backup_path):
                os.remove(backup_path)

            os.replace(self.history_file, backup_path)

            self._cache = []
            with open(self.history_file, "w", encoding="utf-8") as file:
                json.dump([], file)

            return []

    def save_history(self, history_list):
        """
        Save the search history to a JSON file atomically via a temp file.

        Args:
            history_list (list): The list of search records to save.
        """

        if len(history_list) > HISTORY_MAX:
            history_list = history_list[-HISTORY_MAX:]
        self._cache = list(history_list)
        os.makedirs(os.path.dirname(self.history_file), exist_ok=True)

        temp_file = self.history_file + ".tmp"
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass
        try:
            with open(temp_file, "w", encoding="utf-8") as file:
                json.dump(history_list, file)
            os.replace(temp_file, self.history_file)
        except OSError:
            try:
                os.remove(temp_file)
            except OSError:
                pass
            raise

    def add_to_history(self, query_text, status):
        """
        Append a search record with the current date, time, query, and status.

        Args:
            query_text (str): The search query text.
            status (str): The status of the search.
        """

        now = datetime.now()
        current_date = now.strftime("%m-%d-%Y")
        current_time = now.strftime("%H:%M:%S")

        new_record = {
            "date": current_date,
            "time": current_time,
            "query": query_text,
            "status": status,
        }

        history_list = self.get_history()
        history_list.append(new_record)
        if len(history_list) > HISTORY_MAX:
            history_list = history_list[-HISTORY_MAX:]
        self.save_history(history_list)

    def add_activity(self, activity, status):
        """Append a non-search activity to the same per-account history."""
        self.add_to_history(activity, status)
