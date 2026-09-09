"""Edge WebDriver setup for per-account profiles."""

import os
import platform
import socket
import subprocess
import time

from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.edge.service import Service

from ..config import APP_DIR


class DriverManager:
    """
    Manages the Selenium WebDriver for MS Edge.

    Each DriverManager instance is bound to a specific Edge --user-data-dir
    (i.e. one account). Switching account = rebuilding this manager with a
    different profile_path.
    """

    def __init__(self, profile_path=None, hide_browser=False):
        """
        Args:
            profile_path (str | None): Absolute path to the Selenium --user-data-dir
                directory. None when no account is selected (empty state). In that
                case setup_driver will raise, since there is nothing to launch.
            hide_browser (bool): Whether to run the browser in headless mode.
        """
        self.profile_path = profile_path
        self.hide_browser = hide_browser
        self._native_pids = []

    @staticmethod
    def _edge_version():
        """Installed Edge version folder, e.g. 152.0.4191.66."""
        binary = DriverManager.edge_binary()
        parent = os.path.dirname(binary) if binary else ""
        if not parent or not os.path.isdir(parent):
            return ""
        versions = []
        try:
            for name in os.listdir(parent):
                if (
                    name
                    and name[0].isdigit()
                    and os.path.isdir(os.path.join(parent, name))
                ):
                    versions.append(name)
        except OSError:
            return ""
        versions.sort()
        return versions[-1] if versions else ""

    def _msedgedriver_path(self):
        """Prefer the cached msedgedriver that matches this Edge build."""
        cache = os.path.join(
            os.path.expanduser("~"), ".cache", "selenium", "msedgedriver", "win64"
        )
        ver = self._edge_version()
        if ver:
            exact = os.path.join(cache, ver, "msedgedriver.exe")
            if os.path.isfile(exact):
                return exact
            prefix = ".".join(ver.split(".")[:3])
            try:
                names = sorted(n for n in os.listdir(cache) if n.startswith(prefix))
            except OSError:
                names = []
            for name in reversed(names):
                path = os.path.join(cache, name, "msedgedriver.exe")
                if os.path.isfile(path):
                    return path
        return None

    def _edge_service(self, verbose=False):
        kwargs = {}
        path = self._msedgedriver_path()
        if path:
            kwargs["executable_path"] = path
        if verbose:
            try:
                kwargs["log_output"] = os.path.join(APP_DIR, "msedgedriver.log")
                kwargs["service_args"] = ["--verbose"]
            except Exception:
                pass
        return Service(**kwargs)

    @staticmethod
    def _session_died(err):
        msg = str(err).lower()
        return any(
            needle in msg
            for needle in (
                "chrome instance exited",
                "devtoolsactiveport",
                "user data directory is already in use",
                "microsoft edge failed to start",
                "msedge failed to start",
                "exited normally",
                "chrome not reachable",
            )
        )

    @staticmethod
    def _wait_debug_port(port, timeout=10):
        deadline = time.time() + timeout
        while time.time() < deadline:
            sock = socket.socket()
            sock.settimeout(0.3)
            try:
                sock.connect(("127.0.0.1", int(port)))
                return True
            except OSError:
                time.sleep(0.2)
            finally:
                try:
                    sock.close()
                except OSError:
                    pass
        return False

    def _attach_fallback(self, hide=False):
        """Launch a real Edge with a debug port and attach Selenium to it."""
        port = self.debug_port()
        _proc, port = self.start_native_edge("about:blank", port=port, hide=hide)
        if not self._wait_debug_port(port, timeout=12):
            raise RuntimeError(
                f"Edge opened but debug port {port} never accepted connections"
            )
        return self.attach_to_edge(port)

    # Realistic iPhone UA so Microsoft Rewards credits the searches as mobile.
    MOBILE_USER_AGENT = (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 "
        "Mobile/15E148 Safari/604.1"
    )
    # Bing iOS app UA. Check-in and read-to-earn news only credit when the
    # request looks like the BingSapphire client, not Safari.
    BING_APP_USER_AGENT = (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) "
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 "
        "BingSapphire/1.0.410309301"
    )
    MOBILE_WINDOW_SIZE = "412,915"
    DESKTOP_WINDOW_SIZE = "1920,1080"

    def setup_driver(
        self, headless=None, disable_identity=False, mobile=False, bing_app=False
    ):
        """
        Set up the Selenium WebDriver for MS Edge using this manager's profile.

        Args:
            headless: Headless override. Falls back to self.hide_browser.
            disable_identity: When True, add Edge/Chromium flags that disable
                the Windows-account-based auto sign-in. Used during First
                Setup so a second MSA can actually log in.
            mobile: When True, launch Edge with an iPhone user agent and a
                mobile-sized viewport so Rewards credits the searches as
                mobile. When False, use the desktop viewport.
            bing_app: When True, use the Bing iOS app (BingSapphire) user
                agent instead of Safari. Required for mobile check-in and
                read-to-earn news. Implies mobile=True.

        Returns:
            webdriver.Edge: The configured WebDriver instance.

        Raises:
            RuntimeError: If profile_path is None (no account selected).
        """
        if not self.profile_path:
            raise RuntimeError(
                "No account selected: cannot start the browser. "
                "Create or select an account first."
            )

        if headless is None:
            headless = self.hide_browser

        os.makedirs(self.profile_path, exist_ok=True)
        # A forced app close can leave msedge.exe alive with this account's
        # profile. Chromium rejects a second process using the same profile,
        # then Selenium reports the misleading DevToolsActivePort error.
        # Edge 133+ also relaunches itself (compat layer): the first process
        # exits, a second window stays open, and Selenium reports
        # "session not created: Chrome instance exited".
        self.close_running_edge()
        self._clear_profile_locks()
        time.sleep(0.8)

        def build_options(recovery_mode=False):
            options = Options()
            binary = self.edge_binary()
            if binary and os.path.isfile(binary):
                options.binary_location = binary
            options.add_argument(f"--user-data-dir={self.profile_path}")
            options.add_argument("--profile-directory=Default")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.add_argument("--no-default-browser-check")
            options.add_argument("--no-first-run")
            options.add_argument("--disable-extensions")
            options.add_argument("--remote-allow-origins=*")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            # Stop Edge from spawning a second process and exiting the first.
            options.add_argument("--edge-skip-compat-layer-relaunch")
            options.add_argument(
                "--disable-features=msEdgeStartupBoost,msEdgeSleepingTabs"
            )
            options.add_experimental_option("excludeSwitches", ["enable-automation"])

            use_mobile = bool(mobile or bing_app)
            mobile_ua = self.BING_APP_USER_AGENT if bing_app else self.MOBILE_USER_AGENT
            if use_mobile:
                options.add_argument(f"--user-agent={mobile_ua}")
                window_size = self.MOBILE_WINDOW_SIZE
            else:
                window_size = self.DESKTOP_WINDOW_SIZE
            options.add_argument(f"--window-size={window_size}")

            if disable_identity:
                options.add_argument(
                    "--disable-features=msImplicitSignin,AadSsoUrlInterceptionEnabled,"
                    "WebOtpBackendAuto,IdentityConsistency,msIdentityWebSignIn,"
                    "msEdgeIdentitySyncInterception"
                )
                options.add_argument("--disable-sync")

            if headless:
                # Off-screen window, not --headless=new. Chromium headless
                # often skips painting the Next.js /earn cards, so quizzes
                # and puzzles never appear. An off-screen GPU window still
                # hydrates and can credit Rewards.
                options.add_argument("--window-position=-32000,-32000")

            if recovery_mode:
                options.add_argument("--disable-gpu")
                options.add_argument("--disable-software-rasterizer")
            return options

        last_err = None
        _driver = None
        for attempt in range(3):
            try:
                _driver = webdriver.Edge(
                    service=self._edge_service(verbose=attempt == 2),
                    options=build_options(recovery_mode=attempt > 0),
                )
                last_err = None
                break
            except Exception as err:
                last_err = err
                self.close_running_edge()
                self._clear_profile_locks()
                if self._session_died(err):
                    try:
                        _driver = self._attach_fallback(hide=headless)
                        last_err = None
                        break
                    except Exception as attach_err:
                        last_err = attach_err
                        self.close_running_edge()
                        self._clear_profile_locks()
                time.sleep(1.2 + attempt)
        if _driver is None:
            raise last_err

        use_mobile = bool(mobile or bing_app)
        mobile_ua = self.BING_APP_USER_AGENT if bing_app else self.MOBILE_USER_AGENT
        if use_mobile:
            # Turn the session into a genuine mobile one at the engine level.
            # Beyond the UA string, this makes `navigator.maxTouchPoints > 0`,
            # `window.matchMedia("(pointer: coarse)")` true, the viewport match
            # iPhone metrics, and touch events fire for real — so sites that
            # fingerprint using the DOM/CSS touch surface see a real mobile.
            try:
                _driver.execute_cdp_cmd(
                    "Emulation.setTouchEmulationEnabled",
                    {"enabled": True, "maxTouchPoints": 5},
                )
                _driver.execute_cdp_cmd(
                    "Emulation.setEmitTouchEventsForMouse",
                    {"enabled": True, "configuration": "mobile"},
                )
                _driver.execute_cdp_cmd(
                    "Emulation.setDeviceMetricsOverride",
                    {
                        "width": 412,
                        "height": 915,
                        "deviceScaleFactor": 3,
                        "mobile": True,
                    },
                )
                _driver.execute_cdp_cmd(
                    "Emulation.setUserAgentOverride",
                    {
                        "userAgent": mobile_ua,
                        "platform": "iPhone",
                        "userAgentMetadata": {
                            "platform": "iOS",
                            "platformVersion": "17.2.1",
                            "architecture": "",
                            "model": "iPhone",
                            "mobile": True,
                        },
                    },
                )
            except Exception:
                # CDP is best-effort; fall back to the UA+window-size flags.
                pass
            if bing_app:
                # Phone Bing app in Colombia: news / check-in / read-to-earn
                # are served for es-CO, not the US desktop dashboard.
                try:
                    _driver.execute_cdp_cmd(
                        "Emulation.setLocaleOverride", {"locale": "es-CO"}
                    )
                    _driver.execute_cdp_cmd(
                        "Emulation.setTimezoneOverride",
                        {"timezoneId": "America/Bogota"},
                    )
                    _driver.execute_cdp_cmd(
                        "Emulation.setGeolocationOverride",
                        {
                            "latitude": 4.711,
                            "longitude": -74.0721,
                            "accuracy": 100,
                        },
                    )
                except Exception:
                    pass

        try:
            _driver.set_page_load_timeout(20)
            _driver.set_script_timeout(20)
        except Exception:
            pass
        return _driver

    def _clear_profile_locks(self):
        """Drop Chromium singleton lock files left by a killed Edge process."""
        if not self.profile_path:
            return
        for name in (
            "SingletonLock",
            "SingletonSocket",
            "SingletonCookie",
            "DevToolsActivePort",
        ):
            path = os.path.join(self.profile_path, name)
            try:
                os.remove(path)
            except OSError:
                pass

    # CREATE_NO_WINDOW | CREATE_BREAKAWAY_FROM_JOB | CREATE_NEW_PROCESS_GROUP
    # Breakaway matters: if AutoRewarder exits, the killer must outlive it.
    _KILL_FLAGS = 0x08000000 | 0x01000000 | 0x00000200

    @staticmethod
    def _edge_kill_powershell(profile=None, all_accounts=False):
        needles = [
            "--test-type=webdriver",
            "AutoRewarder\\accounts",
            "AutoRewarder/accounts",
        ]
        if profile:
            needles.insert(0, profile)
        if all_accounts:
            needles.append("EdgeProfile")
        lines = [
            "$needles = @("
            + ", ".join("'" + n.replace("'", "''") + "'" for n in needles)
            + ")",
            "Get-Process msedgedriver -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
            "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" -ErrorAction SilentlyContinue |",
            "  Where-Object {",
            "    $cl = $_.CommandLine; if (-not $cl) { return $false }",
            "    foreach ($n in $needles) { if ($cl -like ('*' + $n + '*')) { return $true } }",
            "    return $false",
            "  } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
        ]
        return "\n".join(lines)

    def _run_kill(self, args, wait):
        flags = self._KILL_FLAGS
        try:
            if wait:
                subprocess.run(
                    args,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=8,
                    creationflags=flags,
                )
            else:
                subprocess.Popen(
                    args,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=flags,
                )
        except Exception:
            pass

    def kill_now(self, wait=False):
        """
        Kill WebDriver and this profile's Edge, including the real foreground
        Edge used for the 30-minute streak.

        wait=True on app shutdown so the killer finishes before this process
        dies. wait=False on Stop so the UI returns immediately; the killer
        is launched breakaway so it still completes if the window then closes.
        """
        if platform.system() == "Windows":
            for pid in list(getattr(self, "_native_pids", []) or []):
                self._run_kill(["taskkill", "/F", "/PID", str(pid), "/T"], wait)
            self._native_pids = []
            self._run_kill(["taskkill", "/F", "/IM", "msedgedriver.exe", "/T"], wait)
            profile = ""
            if self.profile_path:
                profile = os.path.abspath(self.profile_path)
            command = self._edge_kill_powershell(profile=profile)
            self._run_kill(
                [
                    "powershell.exe",
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    command,
                ],
                wait,
            )
        self._clear_profile_locks()

    @classmethod
    def kill_all_autorewarder_edge(cls, wait=False):
        """Kill every Edge bound to AutoRewarder account profiles."""
        if platform.system() != "Windows":
            return
        flags = cls._KILL_FLAGS
        args_list = [
            ["taskkill", "/F", "/IM", "msedgedriver.exe", "/T"],
            [
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                cls._edge_kill_powershell(all_accounts=True),
            ],
        ]
        for args in args_list:
            try:
                if wait:
                    subprocess.run(
                        args,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        timeout=8,
                        creationflags=flags,
                    )
                else:
                    subprocess.Popen(
                        args,
                        stdout=subprocess.DEVNULL,
                        stderr=subprocess.DEVNULL,
                        creationflags=flags,
                    )
            except Exception:
                pass

    def close_running_edge(self, settle=True):
        """Close orphaned Edge / WebDriver processes for this account."""
        if platform.system() != "Windows":
            return 0

        flags = 0x08000000
        try:
            subprocess.run(
                ["taskkill", "/F", "/IM", "msedgedriver.exe", "/T"],
                capture_output=True,
                timeout=3,
                creationflags=flags,
            )
        except Exception:
            pass

        if self.profile_path:
            profile = os.path.abspath(self.profile_path).replace("'", "''")
            # Kill: (1) Edge bound to this account profile, (2) any Selenium-
            # launched Edge (compat-relaunch orphans often drop --user-data-dir
            # from the command line).
            command = (
                f"$profile = '{profile}'; "
                "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" "
                "-ErrorAction SilentlyContinue | "
                "Where-Object { "
                '$_.CommandLine -like "*$profile*" -or '
                "$_.CommandLine -like '*--test-type=webdriver*' -or "
                "$_.CommandLine -like '*--edge-skip-compat-layer-relaunch*' "
                "} | "
                "ForEach-Object { Stop-Process -Id $_.ProcessId -Force "
                "-ErrorAction SilentlyContinue }"
            )
            try:
                subprocess.run(
                    [
                        "powershell.exe",
                        "-NoProfile",
                        "-NonInteractive",
                        "-Command",
                        command,
                    ],
                    capture_output=True,
                    text=True,
                    timeout=4,
                    creationflags=flags,
                )
            except Exception:
                pass
        self._clear_profile_locks()
        if settle:
            time.sleep(0.35)
        return 0

    @staticmethod
    def edge_binary():
        for path in (
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
        ):
            if os.path.isfile(path):
                return path
        return "msedge"

    def debug_port(self):
        seed = os.path.abspath(self.profile_path or "edge")
        return 19222 + (abs(hash(seed)) % 700)

    def start_native_edge(self, url, port=None, stop_event=None, hide=False):
        """
        Launch a real (non-WebDriver) Edge on this account profile with a
        debug port so we can attach. Rewards' 30-minute Edge streak only
        credits a normal foreground Edge process.
        """
        from ..utils import wait_or_stop

        if not self.profile_path:
            raise RuntimeError("No account selected: cannot start Edge.")
        port = int(port or self.debug_port())
        self.close_running_edge()
        self._clear_profile_locks()
        if wait_or_stop(0.4, stop_event):
            raise RuntimeError("stopped")
        os.makedirs(self.profile_path, exist_ok=True)
        args = [
            self.edge_binary(),
            f"--user-data-dir={self.profile_path}",
            "--profile-directory=Default",
            "--no-first-run",
            "--no-default-browser-check",
            "--edge-skip-compat-layer-relaunch",
            "--disable-features=msEdgeStartupBoost,msEdgeSleepingTabs",
            "--disable-background-mode",
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            "--start-maximized",
            url or "https://www.bing.com/?form=EDGNTC",
        ]
        if hide:
            args.insert(-1, "--window-position=-32000,-32000")
        creationflags = (
            0x00000010 if platform.system() == "Windows" else 0
        )  # CREATE_NEW_CONSOLE off; use DETACHED
        # DETACHED_PROCESS (0x00000008) + CREATE_NEW_PROCESS_GROUP
        if platform.system() == "Windows":
            creationflags = 0x00000200  # CREATE_NEW_PROCESS_GROUP
        proc = subprocess.Popen(
            args,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags,
        )
        try:
            self._native_pids.append(proc.pid)
        except Exception:
            pass
        if wait_or_stop(1.5, stop_event):
            try:
                proc.kill()
            except Exception:
                pass
            raise RuntimeError("stopped")
        return proc, port

    def attach_to_edge(self, port):
        """Attach Selenium to an already-running native Edge debug port."""
        options = Options()
        binary = self.edge_binary()
        if binary and os.path.isfile(binary):
            options.binary_location = binary
        options.add_experimental_option("debuggerAddress", f"127.0.0.1:{int(port)}")
        options.add_argument("--edge-skip-compat-layer-relaunch")
        return webdriver.Edge(service=self._edge_service(), options=options)

    @staticmethod
    def focus_edge_window():
        """Bring Edge to the foreground so Rewards counts browsing time."""
        if platform.system() != "Windows":
            return
        command = (
            "$w = New-Object -ComObject WScript.Shell; "
            "@('Microsoft Edge','Edge','Bing','MSN') | ForEach-Object { "
            "[void]$w.AppActivate($_) }"
        )
        try:
            subprocess.run(
                [
                    "powershell.exe",
                    "-NoProfile",
                    "-NonInteractive",
                    "-Command",
                    command,
                ],
                capture_output=True,
                timeout=2,
                creationflags=0x08000000,
            )
        except Exception:
            pass
