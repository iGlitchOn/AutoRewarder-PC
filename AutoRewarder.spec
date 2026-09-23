# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files


a = Analysis(
    ['AutoRewarder.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('gui', 'gui'),
        ('assets/queries.json', 'assets'),
        ('assets/icon.ico', 'assets'),
        ('assets/visual_search_assets', 'assets/visual_search_assets'),
        ('LICENSE', '.'),
        ('NOTICE', '.'),
    ] + collect_data_files('nlpaug'),
    hiddenimports=[
        'selenium.webdriver.edge.webdriver',
        'pystray',
        'pystray._win32',
        'PIL',
        'PIL.Image',
        'src.phone_bridge',
        'src.tunnel',
        'src.qr_png',
        'src.apk_update',
        'src.emulator.virtual_desktop',
        'qrcode',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='AutoRewarder',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets\\icon.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='AutoRewarder',
)
