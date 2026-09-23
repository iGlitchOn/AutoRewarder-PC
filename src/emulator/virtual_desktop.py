"""Task View desktops for a hidden Edge window.

COM layout is Markus Scholtes VirtualDesktop 1.21 (2025-08-11),
VirtualDesktop11-24H2.cs, which matches Win11 24H2/25H2 (build 26100+).
That build inserts SwitchDesktopAndMoveForegroundView before CreateDesktop,
so CreateDesktop is vtable slot 11. The IID is still
{53F5CA0B-158F-4124-900C-057158060B27}.

Creating or removing a desktop never switches the user's current desktop
unless CreateDesktop itself did, in which case we switch straight back.
"""

from __future__ import annotations

import ctypes
import os
import socket
import threading
import time

_COM_LOCK = threading.Lock()

# Immersive shell / virtual desktop (Win11 24H2 and 25H2).
_CLSID_IMMERSIVE_SHELL = "C2F03A33-21F5-47FA-B4BB-156362A2F239"
_CLSID_VIRTUAL_DESKTOP_MANAGER_INTERNAL = "C5E0CDCA-7B6E-41B2-9FC4-D93975CC467B"
_CLSID_VIRTUAL_DESKTOP_MANAGER = "AA509086-5CA9-4C25-8F95-589D3C07B48A"
_IID_ISERVICE_PROVIDER = "6D5140C1-7436-11CE-8034-00AA006009FA"
_IID_IVIRTUAL_DESKTOP = "3F07F4BE-B107-441A-AF0F-39D82529072C"
_IID_IVIRTUAL_DESKTOP_MANAGER_INTERNAL = "53F5CA0B-158F-4124-900C-057158060B27"
_IID_IVIRTUAL_DESKTOP_MANAGER = "A5CD92FF-29BE-454C-8D04-D82879FB3F1B"
_IID_IAPPLICATION_VIEW_COLLECTION = "1841C6D7-4F9D-42C0-AF41-8747538F10E5"

# A window pinned to every desktop reports one of these instead of a desktop id.
_ALL_DESKTOPS = {
    "bb64d5b7-4de3-4ab2-a87c-db7601aea7dc",
    "c2ddea68-66f2-4cf9-8264-1bfd00fbbbac",
}

_CLSCTX_ALL = 23
_COINIT_APARTMENTTHREADED = 2
_RPC_E_CHANGED_MODE = 0x80010106


class VirtualDesktopError(RuntimeError):
    pass


class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", ctypes.c_ulong),
        ("Data2", ctypes.c_ushort),
        ("Data3", ctypes.c_ushort),
        ("Data4", ctypes.c_ubyte * 8),
    ]


def _norm(value):
    return str(value or "").strip().strip("{}").lower()


def _guid(text):
    token = str(text or "").strip()
    if not token.startswith("{"):
        token = "{" + token.strip("{}") + "}"
    handle = GUID()
    hr = _ole32.CLSIDFromString(token, ctypes.byref(handle))
    if hr < 0:
        raise VirtualDesktopError(f"bad guid {token}")
    return handle


def _guid_str(handle):
    data = bytes(handle)
    return (
        f"{int.from_bytes(data[0:4], 'little'):08x}-"
        f"{int.from_bytes(data[4:6], 'little'):04x}-"
        f"{int.from_bytes(data[6:8], 'little'):04x}-"
        f"{data[8]:02x}{data[9]:02x}-"
        f"{data[10]:02x}{data[11]:02x}{data[12]:02x}{data[13]:02x}{data[14]:02x}{data[15]:02x}"
    )


def windows_build():
    try:
        import winreg

        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Windows NT\CurrentVersion",
        ) as key:
            value, _typ = winreg.QueryValueEx(key, "CurrentBuildNumber")
        return int(value)
    except (OSError, ValueError, TypeError):
        return 0


def _slots_for_build(build):
    # 24H2/25H2: slot 10 is SwitchDesktopAndMoveForegroundView.
    if int(build or 0) >= 26100:
        return {"create": 11, "remove": 13, "find": 14}
    return {"create": 10, "remove": 12, "find": 13}


def _vtbl(this, index, argtypes):
    this_i = int(this)
    if not this_i:
        raise VirtualDesktopError("null interface")
    vtbl = ctypes.cast(ctypes.c_void_p(this_i), ctypes.POINTER(ctypes.c_void_p))[0]
    slot = ctypes.cast(vtbl, ctypes.POINTER(ctypes.c_void_p))[index]
    proto = ctypes.WINFUNCTYPE(ctypes.c_long, ctypes.c_void_p, *argtypes)
    return proto(slot)


def _call(this, index, argtypes, *args):
    hr = _vtbl(this, index, argtypes)(ctypes.c_void_p(int(this)), *args)
    if hr < 0:
        raise VirtualDesktopError(f"vtable[{index}] hr=0x{hr & 0xFFFFFFFF:08X}")
    return hr


def _release(this):
    if not this:
        return
    try:
        _vtbl(this, 2, [])(ctypes.c_void_p(int(this)))
    except (VirtualDesktopError, OSError, ctypes.ArgumentError):
        pass


class _Session:
    def __init__(self):
        self._ptrs = []
        self._com_owned = False
        self.provider = None
        self.internal = None
        self.public = None
        self.views = None
        self.slots = _slots_for_build(windows_build())

    def __enter__(self):
        if os.name != "nt":
            raise VirtualDesktopError("virtual desktops require Windows")
        self._init_com()
        self._connect()
        return self

    def __exit__(self, exc_type, exc, tb):
        ptrs = list(self._ptrs)
        self._ptrs.clear()
        self.provider = None
        self.internal = None
        self.public = None
        self.views = None
        for ptr in reversed(ptrs):
            _release(ptr)
        if self._com_owned:
            _ole32.CoUninitialize()
            self._com_owned = False
        return False

    def _keep(self, ptr):
        if ptr and ptr not in self._ptrs:
            self._ptrs.append(ptr)
        return ptr

    def _init_com(self):
        hr = _ole32.CoInitializeEx(None, _COINIT_APARTMENTTHREADED)
        code = hr & 0xFFFFFFFF
        if code == _RPC_E_CHANGED_MODE:
            self._com_owned = False
            return
        if code > 0x7FFFFFFF:
            raise VirtualDesktopError(f"CoInitializeEx 0x{code:08X}")
        self._com_owned = True

    def _connect(self):
        shell = _guid(_CLSID_IMMERSIVE_SHELL)
        service = _guid(_IID_ISERVICE_PROVIDER)
        punk = ctypes.c_void_p()
        hr = _ole32.CoCreateInstance(
            ctypes.byref(shell),
            None,
            _CLSCTX_ALL,
            ctypes.byref(service),
            ctypes.byref(punk),
        )
        if hr < 0 or not punk.value:
            raise VirtualDesktopError(
                f"ImmersiveShell 0x{hr & 0xFFFFFFFF:08X} build={windows_build()}"
            )
        self.provider = self._keep(punk.value)
        try:
            self.internal = self._query(
                _CLSID_VIRTUAL_DESKTOP_MANAGER_INTERNAL,
                _IID_IVIRTUAL_DESKTOP_MANAGER_INTERNAL,
            )
        except VirtualDesktopError as exc:
            raise VirtualDesktopError(
                f"QueryService failed on build {windows_build()}: {exc}"
            ) from exc
        count = self.count()
        if count < 1 or count > 64:
            raise VirtualDesktopError(f"implausible desktop count {count}")

    def _query(self, service, iid):
        out = ctypes.c_void_p()
        service_g = _guid(service)
        iid_g = _guid(iid)
        _call(
            self.provider,
            3,
            [
                ctypes.POINTER(GUID),
                ctypes.POINTER(GUID),
                ctypes.POINTER(ctypes.c_void_p),
            ],
            ctypes.byref(service_g),
            ctypes.byref(iid_g),
            ctypes.byref(out),
        )
        if not out.value:
            raise VirtualDesktopError("QueryService returned null")
        return self._keep(out.value)

    def count(self):
        count = ctypes.c_uint()
        _call(self.internal, 3, [ctypes.POINTER(ctypes.c_uint)], ctypes.byref(count))
        return int(count.value)

    def desktop_id(self, desktop):
        gid = GUID()
        _call(desktop, 4, [ctypes.POINTER(GUID)], ctypes.byref(gid))
        return _guid_str(gid)

    def current(self):
        out = ctypes.c_void_p()
        _call(
            self.internal,
            6,
            [ctypes.POINTER(ctypes.c_void_p)],
            ctypes.byref(out),
        )
        if not out.value:
            raise VirtualDesktopError("GetCurrentDesktop returned null")
        return self._keep(out.value)

    def current_id(self):
        return self.desktop_id(self.current())

    def list_ids(self):
        arr = ctypes.c_void_p()
        _call(
            self.internal,
            7,
            [ctypes.POINTER(ctypes.c_void_p)],
            ctypes.byref(arr),
        )
        if not arr.value:
            raise VirtualDesktopError("GetDesktops returned null")
        self._keep(arr.value)
        count = ctypes.c_uint()
        _call(arr.value, 3, [ctypes.POINTER(ctypes.c_uint)], ctypes.byref(count))
        total = int(count.value)
        if total < 0 or total > 64:
            raise VirtualDesktopError(f"implausible desktop list {total}")
        iid = _guid(_IID_IVIRTUAL_DESKTOP)
        found = []
        for index in range(total):
            obj = ctypes.c_void_p()
            _call(
                arr.value,
                4,
                [
                    ctypes.c_uint,
                    ctypes.POINTER(GUID),
                    ctypes.POINTER(ctypes.c_void_p),
                ],
                index,
                ctypes.byref(iid),
                ctypes.byref(obj),
            )
            if not obj.value:
                continue
            self._keep(obj.value)
            found.append(self.desktop_id(obj.value))
        return found

    def find(self, desktop_id):
        want = _norm(desktop_id)
        if not want:
            return None
        out = ctypes.c_void_p()
        gid = _guid(want)
        _call(
            self.internal,
            self.slots["find"],
            [ctypes.POINTER(GUID), ctypes.POINTER(ctypes.c_void_p)],
            ctypes.byref(gid),
            ctypes.byref(out),
        )
        if not out.value:
            return None
        self._keep(out.value)
        if _norm(self.desktop_id(out.value)) != want:
            return None
        return out.value

    def create(self):
        out = ctypes.c_void_p()
        _call(
            self.internal,
            self.slots["create"],
            [ctypes.POINTER(ctypes.c_void_p)],
            ctypes.byref(out),
        )
        if not out.value:
            raise VirtualDesktopError("CreateDesktop returned null")
        return self._keep(out.value)

    def switch(self, desktop):
        _call(self.internal, 9, [ctypes.c_void_p], desktop)

    def remove(self, target, fallback):
        _call(
            self.internal,
            self.slots["remove"],
            [ctypes.c_void_p, ctypes.c_void_p],
            target,
            fallback,
        )

    def _public(self):
        if self.public:
            return self.public
        clsid = _guid(_CLSID_VIRTUAL_DESKTOP_MANAGER)
        iid = _guid(_IID_IVIRTUAL_DESKTOP_MANAGER)
        punk = ctypes.c_void_p()
        hr = _ole32.CoCreateInstance(
            ctypes.byref(clsid),
            None,
            _CLSCTX_ALL,
            ctypes.byref(iid),
            ctypes.byref(punk),
        )
        if hr < 0 or not punk.value:
            raise VirtualDesktopError(
                f"VirtualDesktopManager 0x{hr & 0xFFFFFFFF:08X}"
            )
        self.public = self._keep(punk.value)
        return self.public

    def window_desktop(self, hwnd):
        gid = GUID()
        _call(
            self._public(),
            4,
            [ctypes.c_void_p, ctypes.POINTER(GUID)],
            ctypes.c_void_p(int(hwnd)),
            ctypes.byref(gid),
        )
        return _guid_str(gid)

    def _on_desktop(self, hwnd, desktop_id):
        found = _norm(self.window_desktop(hwnd))
        if not found or found in _ALL_DESKTOPS:
            return False
        return found == _norm(desktop_id)

    def move_hwnd(self, hwnd, desktop_id):
        gid = _guid(desktop_id)
        try:
            _call(
                self._public(),
                5,
                [ctypes.c_void_p, ctypes.POINTER(GUID)],
                ctypes.c_void_p(int(hwnd)),
                ctypes.byref(gid),
            )
            if self._on_desktop(hwnd, desktop_id):
                return True
        except VirtualDesktopError:
            pass
        if self.views is None:
            self.views = self._query(
                _IID_IAPPLICATION_VIEW_COLLECTION,
                _IID_IAPPLICATION_VIEW_COLLECTION,
            )
        view = ctypes.c_void_p()
        _call(
            self.views,
            6,
            [ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p)],
            ctypes.c_void_p(int(hwnd)),
            ctypes.byref(view),
        )
        if not view.value:
            return False
        self._keep(view.value)
        desktop = self.find(desktop_id)
        if not desktop:
            return False
        _call(
            self.internal,
            4,
            [ctypes.c_void_p, ctypes.c_void_p],
            view.value,
            desktop,
        )
        return self._on_desktop(hwnd, desktop_id)


def current_desktop_id():
    with _COM_LOCK:
        with _Session() as session:
            return session.current_id()


def list_desktop_ids():
    with _COM_LOCK:
        with _Session() as session:
            return session.list_ids()


def desktop_exists(desktop_id):
    """True when desktop_id is in the current Task View list.

    Raises VirtualDesktopError if the shell cannot be queried. Callers must
    not treat that as "missing" — that would create or forget a desktop.
    """
    want = _norm(desktop_id)
    if not want:
        return False
    return want in {_norm(item) for item in list_desktop_ids()}


def create_desktop():
    """Create one desktop and stay on the desktop that was current.

    Returns (new_id, previous_id). Raises VirtualDesktopError on failure
    and does not leave the new desktop as the current one when it can
    switch back or remove it.
    """
    with _COM_LOCK:
        with _Session() as session:
            before_ptr = session.current()
            before = session.desktop_id(before_ptr)
            created = session.create()
            new_id = session.desktop_id(created)
            if _norm(new_id) == _norm(before):
                raise VirtualDesktopError("CreateDesktop returned the current desktop")
            if _norm(session.current_id()) != _norm(before):
                session.switch(before_ptr)
            if _norm(session.current_id()) != _norm(before):
                try:
                    session.remove(created, before_ptr)
                except VirtualDesktopError:
                    pass
                raise VirtualDesktopError("CreateDesktop switched the current desktop")
            if _norm(new_id) not in {_norm(item) for item in session.list_ids()}:
                try:
                    session.remove(created, before_ptr)
                except VirtualDesktopError:
                    pass
                raise VirtualDesktopError("new desktop id was not listed")
            return new_id, before


def remove_desktop(desktop_id, fallback_id):
    """Remove only desktop_id, falling back to fallback_id.

    Missing ids are left alone. Returns True when desktop_id is gone.
    """
    want = _norm(desktop_id)
    fallback = _norm(fallback_id)
    if not want or want == fallback:
        return not want
    with _COM_LOCK:
        with _Session() as session:
            ids = {_norm(item) for item in session.list_ids()}
            if want not in ids:
                return True
            target = session.find(desktop_id)
            if not target:
                return want not in {_norm(item) for item in session.list_ids()}
            fb_ptr = None
            if fallback and fallback in ids and fallback != want:
                fb_ptr = session.find(fallback_id)
            if not fb_ptr:
                current = session.current()
                current_id = _norm(session.desktop_id(current))
                if current_id != want:
                    fb_ptr = current
                else:
                    for other in ids:
                        if other != want:
                            fb_ptr = session.find(other)
                            break
            if not fb_ptr or _norm(session.desktop_id(fb_ptr)) == want:
                return False
            session.remove(target, fb_ptr)
            return want not in {_norm(item) for item in session.list_ids()}


def move_window_to_desktop(hwnd, desktop_id):
    """Move hwnd without switching the current desktop. True on success."""
    if not hwnd or not desktop_id:
        return False
    hwnd = int(hwnd)
    with _COM_LOCK:
        with _Session() as session:
            for _attempt in range(4):
                try:
                    if session.move_hwnd(hwnd, desktop_id):
                        return True
                except VirtualDesktopError:
                    pass
                time.sleep(0.08)
    return False


# --- Edge HWND lookup (same user, no coordinate parking) -----------------

class _PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", ctypes.c_ulong),
        ("cntUsage", ctypes.c_ulong),
        ("th32ProcessID", ctypes.c_ulong),
        ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", ctypes.c_ulong),
        ("cntThreads", ctypes.c_ulong),
        ("th32ParentProcessID", ctypes.c_ulong),
        ("pcPriClassBase", ctypes.c_long),
        ("dwFlags", ctypes.c_ulong),
        ("szExeFile", ctypes.c_wchar * 260),
    ]


class _PBI(ctypes.Structure):
    _fields_ = [
        ("Reserved1", ctypes.c_void_p),
        ("PebBaseAddress", ctypes.c_void_p),
        ("Reserved2", ctypes.c_void_p * 2),
        ("UniqueProcessId", ctypes.c_void_p),
        ("Reserved3", ctypes.c_void_p),
    ]


class _UNICODE_STRING(ctypes.Structure):
    _fields_ = [
        ("Length", ctypes.c_ushort),
        ("MaximumLength", ctypes.c_ushort),
        ("_pad", ctypes.c_ulong),
        ("Buffer", ctypes.c_void_p),
    ]


class _TCPROW(ctypes.Structure):
    _fields_ = [
        ("dwState", ctypes.c_ulong),
        ("dwLocalAddr", ctypes.c_ulong),
        ("dwLocalPort", ctypes.c_ulong),
        ("dwRemoteAddr", ctypes.c_ulong),
        ("dwRemotePort", ctypes.c_ulong),
        ("dwOwningPid", ctypes.c_ulong),
    ]


class _RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


def _read_mem(handle, address, buf, size):
    got = ctypes.c_size_t()
    ok = _kernel32.ReadProcessMemory(
        handle, ctypes.c_void_p(address), buf, size, ctypes.byref(got)
    )
    return bool(ok) and int(got.value) == int(size)


def process_command_line(pid):
    """Full command line of pid, or '' if it cannot be read."""
    if os.name != "nt" or not pid:
        return ""
    handle = _kernel32.OpenProcess(0x0410, False, int(pid))
    if not handle:
        return ""
    try:
        info = _PBI()
        status = _ntdll.NtQueryInformationProcess(
            handle, 0, ctypes.byref(info), ctypes.sizeof(info), None
        )
        if status != 0 or not info.PebBaseAddress:
            return ""
        params = ctypes.c_void_p()
        if not _read_mem(
            handle,
            int(info.PebBaseAddress) + 0x20,
            ctypes.byref(params),
            ctypes.sizeof(params),
        ):
            return ""
        if not params.value or ctypes.sizeof(_UNICODE_STRING) != 16:
            return ""
        command = _UNICODE_STRING()
        if not _read_mem(
            handle,
            int(params.value) + 0x70,
            ctypes.byref(command),
            ctypes.sizeof(command),
        ):
            return ""
        length = int(command.Length)
        if length <= 0 or length > 32768 or not command.Buffer:
            return ""
        raw = ctypes.create_string_buffer(length)
        if not _read_mem(handle, int(command.Buffer), raw, length):
            return ""
        return raw.raw.decode("utf-16-le", errors="ignore")
    finally:
        _kernel32.CloseHandle(handle)


def _msedge_processes():
    snap = _kernel32.CreateToolhelp32Snapshot(0x00000002, 0)
    invalid = ctypes.c_void_p(-1).value
    if not snap or snap == invalid:
        return []
    found = []
    try:
        entry = _PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(entry)
        ok = _kernel32.Process32FirstW(snap, ctypes.byref(entry))
        while ok:
            name = (entry.szExeFile or "").lower()
            if name == "msedge.exe":
                found.append(int(entry.th32ProcessID))
            ok = _kernel32.Process32NextW(snap, ctypes.byref(entry))
    finally:
        _kernel32.CloseHandle(snap)
    return found


def _listener_pid(port):
    try:
        port = int(port)
    except (TypeError, ValueError):
        return 0
    size = ctypes.c_ulong(0)
    _iphlpapi.GetExtendedTcpTable(None, ctypes.byref(size), False, 2, 3, 0)
    if not size.value or size.value > 2 * 1024 * 1024:
        return 0
    buf = ctypes.create_string_buffer(size.value)
    status = _iphlpapi.GetExtendedTcpTable(buf, ctypes.byref(size), False, 2, 3, 0)
    if status != 0:
        return 0
    count = int(ctypes.c_ulong.from_buffer_copy(buf, 0).value)
    if count < 0 or count > 10000:
        return 0
    row_size = ctypes.sizeof(_TCPROW)
    for index in range(count):
        offset = 4 + index * row_size
        if offset + row_size > len(buf):
            break
        row = _TCPROW.from_buffer_copy(buf, offset)
        local = socket.ntohs(int(row.dwLocalPort) & 0xFFFF)
        if local == port:
            return int(row.dwOwningPid)
    return 0


def _cmd_matches(cmd, profile, ports):
    if not cmd or "--type=" in cmd.lower():
        return False
    low = cmd.lower().replace("/", "\\")
    for port in ports:
        if f"--remote-debugging-port={int(port)}" in low:
            return True
    if profile:
        needle = os.path.abspath(profile).lower().replace("/", "\\")
        if needle and needle in low:
            return True
    return False


def edge_hwnds(profile_path, ports):
    """Top-level Edge windows for this profile or debug port."""
    if os.name != "nt":
        return []
    clean_ports = []
    for port in ports or []:
        try:
            clean_ports.append(int(port))
        except (TypeError, ValueError):
            continue
    profile = os.path.abspath(profile_path) if profile_path else ""
    if not profile and not clean_ports:
        return []
    edge_pids = set(_msedge_processes())
    wanted = set()
    for port in clean_ports:
        pid = _listener_pid(port)
        if pid and pid in edge_pids:
            wanted.add(pid)
    for pid in edge_pids:
        if pid in wanted:
            continue
        if _cmd_matches(process_command_line(pid), profile, clean_ports):
            wanted.add(pid)
    return _hwnds_for_pids(wanted)


def _hwnds_for_pids(pids):
    wanted = {int(pid) for pid in pids if pid}
    found = []
    if not wanted:
        return found

    def _cb(hwnd, _lparam):
        try:
            pid = ctypes.c_ulong()
            _user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if int(pid.value) not in wanted or not _user32.IsWindowVisible(hwnd):
                return 1
            name = ctypes.create_unicode_buffer(256)
            _user32.GetClassNameW(hwnd, name, 256)
            if name.value == "Chrome_WidgetWin_1":
                found.append(int(hwnd))
        except (OSError, ctypes.ArgumentError, ValueError, TypeError):
            pass
        return 1

    _user32.EnumWindows(_ENUM_PROC(_cb), 0)
    return found


def restore_normal_position(hwnds):
    """Move a window back on screen only if it is already parked off-screen."""
    if os.name != "nt":
        return
    flags = 0x0004 | 0x0010  # SWP_NOZORDER | SWP_NOACTIVATE
    for hwnd in hwnds or []:
        rect = _RECT()
        if not _user32.GetWindowRect(ctypes.c_void_p(int(hwnd)), ctypes.byref(rect)):
            continue
        if rect.left < -500 or rect.top < -500:
            _user32.SetWindowPos(
                ctypes.c_void_p(int(hwnd)), None, 80, 80, 1280, 800, flags
            )


def _bind_win32():
    global _ole32, _kernel32, _user32, _ntdll, _iphlpapi, _ENUM_PROC
    _ole32 = ctypes.WinDLL("ole32", use_last_error=True)
    _kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    _user32 = ctypes.WinDLL("user32", use_last_error=True)
    _ntdll = ctypes.WinDLL("ntdll", use_last_error=True)
    _iphlpapi = ctypes.WinDLL("iphlpapi", use_last_error=True)

    _ole32.CoInitializeEx.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
    _ole32.CoInitializeEx.restype = ctypes.c_long
    _ole32.CoUninitialize.argtypes = []
    _ole32.CoUninitialize.restype = None
    _ole32.CoCreateInstance.argtypes = [
        ctypes.POINTER(GUID),
        ctypes.c_void_p,
        ctypes.c_ulong,
        ctypes.POINTER(GUID),
        ctypes.POINTER(ctypes.c_void_p),
    ]
    _ole32.CoCreateInstance.restype = ctypes.c_long
    _ole32.CLSIDFromString.argtypes = [ctypes.c_wchar_p, ctypes.POINTER(GUID)]
    _ole32.CLSIDFromString.restype = ctypes.c_long

    _kernel32.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
    _kernel32.OpenProcess.restype = ctypes.c_void_p
    _kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
    _kernel32.CloseHandle.restype = ctypes.c_int
    _kernel32.ReadProcessMemory.argtypes = [
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_size_t,
        ctypes.POINTER(ctypes.c_size_t),
    ]
    _kernel32.ReadProcessMemory.restype = ctypes.c_int
    _kernel32.CreateToolhelp32Snapshot.argtypes = [ctypes.c_ulong, ctypes.c_ulong]
    _kernel32.CreateToolhelp32Snapshot.restype = ctypes.c_void_p
    _kernel32.Process32FirstW.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(_PROCESSENTRY32W),
    ]
    _kernel32.Process32FirstW.restype = ctypes.c_int
    _kernel32.Process32NextW.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(_PROCESSENTRY32W),
    ]
    _kernel32.Process32NextW.restype = ctypes.c_int
    _ntdll.NtQueryInformationProcess.argtypes = [
        ctypes.c_void_p,
        ctypes.c_ulong,
        ctypes.c_void_p,
        ctypes.c_ulong,
        ctypes.c_void_p,
    ]
    _ntdll.NtQueryInformationProcess.restype = ctypes.c_long

    _ENUM_PROC = ctypes.WINFUNCTYPE(ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p)
    _user32.EnumWindows.argtypes = [_ENUM_PROC, ctypes.c_void_p]
    _user32.EnumWindows.restype = ctypes.c_int
    _user32.GetWindowThreadProcessId.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_ulong),
    ]
    _user32.GetWindowThreadProcessId.restype = ctypes.c_ulong
    _user32.IsWindowVisible.argtypes = [ctypes.c_void_p]
    _user32.IsWindowVisible.restype = ctypes.c_int
    _user32.GetClassNameW.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p, ctypes.c_int]
    _user32.GetClassNameW.restype = ctypes.c_int
    _user32.GetWindowRect.argtypes = [ctypes.c_void_p, ctypes.POINTER(_RECT)]
    _user32.GetWindowRect.restype = ctypes.c_int
    _user32.SetWindowPos.argtypes = [
        ctypes.c_void_p,
        ctypes.c_void_p,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_uint,
    ]
    _user32.SetWindowPos.restype = ctypes.c_int

    _iphlpapi.GetExtendedTcpTable.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(ctypes.c_ulong),
        ctypes.c_int,
        ctypes.c_ulong,
        ctypes.c_int,
        ctypes.c_ulong,
    ]
    _iphlpapi.GetExtendedTcpTable.restype = ctypes.c_ulong


if os.name == "nt":
    _bind_win32()
else:
    _ole32 = None
    _kernel32 = None
    _user32 = None
    _ntdll = None
    _iphlpapi = None
    _ENUM_PROC = None
