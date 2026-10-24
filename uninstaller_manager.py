# -*- coding: utf-8 -*-
"""
TheCore v3.3.0 — Uninstaller Manager (Clean & Force Removal Engine)
Deep residual scanner, registry cleaner, and safe application uninstaller.
"""

import os
import sys
import re
import json
import shutil
import winreg
import ctypes
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

# System directories that MUST NEVER be deleted under any circumstances
CRITICAL_PROTECTED_PATHS = {
    os.environ.get('SYSTEMROOT', r'C:\Windows').lower(),
    os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'System32').lower(),
    os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'SysWOW64').lower(),
    os.path.join(os.environ.get('SYSTEMROOT', r'C:\Windows'), 'WinSxS').lower(),
    r'c:\windows',
    r'c:\windows\system32',
    r'c:\program files',
    r'c:\program files (x86)',
    r'c:\programdata',
    r'c:\users',
    os.environ.get('USERPROFILE', r'C:\Users\Default').lower(),
}

# Critical registry roots that MUST NEVER be purged
CRITICAL_PROTECTED_REG = {
    r'software\microsoft\windows nt',
    r'software\microsoft\windows\currentversion\explorer',
    r'software\classes',
    r'software\policies',
    r'software\microsoft\windows\currentversion\run',
}


def classify_app_category(name: str, publisher: str, install_loc: str) -> str:
    """Classify application into: 'game', 'junk', 'system', or 'app'."""
    n = (name or "").lower()
    p = (publisher or "").lower()
    loc = (install_loc or "").lower()
    combined = f"{n} {p} {loc}"

    # 1. Junk / Bloatware keywords
    junk_kw = [
        "yandex", "яндекс", "mail.ru", "амиго", "amigo", "спутник", "toolbar", 
        "bytefence", "driver booster", "driver easy", "iobit", "advanced systemcare",
        "ccleaner", "mcafee", "avast", "segurazo", "search protect", "opera gx",
        "web discover", "browser search", "gameloop", "myfreecodec", "guard.mail.ru"
    ]
    if any(k in combined for k in junk_kw):
        return "junk"

    # 2. Games keywords
    game_kw = [
        "gta", "grand theft auto", "steam", "epic games", "rockstar", "riot games", 
        "wargaming", "world of warcraft", "warcraft", "world of tanks", "witcher", 
        "cyberpunk", "counter-strike", "counter strike", "dota", "minecraft", "roblox", 
        "genshin", "valorant", "overwatch", "league of legends", "apex legends", "fallout", 
        "skyrim", "fifa", "assassin", "ubisoft", "ea sports", "call of duty", 
        "battlefield", "repack", "fitgirl", "igruha", "mechanics", "blizzard",
        "battle.net", "forza", "need for speed", "half-life", "sims", "game",
        "split fiction", "librarian"
    ]
    if any(k in combined for k in game_kw):
        return "game"

    # 3. System / Drivers / Hardware keywords
    sys_kw = [
        "nvidia", "amd", "intel", "realtek", "asus", "msi", "gigabyte", "corsair", 
        "razer", "logitech", "steelseries", "directx", "visual c++", "redistributable", 
        ".net", "driver", "chipset", "aura", "armoury", "geforce", "radeon", 
        "synaptics", "bluetooth", "wireless", "runtime", "vulkan", "opencl",
        "physx", "alcor", "ene ", "phison", "patriot", "sound blaster", "host fx"
    ]
    if any(k in combined for k in sys_kw):
        return "system"

    return "app"


def _get_dir_size_mb(path: str) -> float:
    """Calculate directory size in megabytes safely."""
    total_size = 0
    try:
        if not os.path.exists(path) or not os.path.isdir(path):
            return 0.0
        for entry in os.scandir(path):
            try:
                if entry.is_file(follow_symlinks=False):
                    total_size += entry.stat().st_size
                elif entry.is_dir(follow_symlinks=False):
                    total_size += int(_get_dir_size_mb(entry.path) * 1024 * 1024)
            except (PermissionError, OSError):
                continue
    except (PermissionError, OSError):
        return 0.0
    return round(total_size / (1024 * 1024), 1)


def _format_install_date(raw_date: str) -> str:
    """Format registry YYYYMMDD string to human readable DD.MM.YYYY."""
    if not raw_date or len(raw_date) != 8 or not raw_date.isdigit():
        return ""
    year = raw_date[:4]
    month = raw_date[4:6]
    day = raw_date[6:8]
    return f"{day}.{month}.{year}"


class UninstallerManager:
    """Manages program discovery, residual scans, and clean/force removal."""

    REG_UNINSTALL_PATHS = [
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", "HKLM_64", winreg.KEY_WOW64_64KEY),
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall", "HKLM_32", winreg.KEY_WOW64_32KEY),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall", "HKCU", 0),
    ]

    @classmethod
    def get_installed_applications(cls) -> List[Dict[str, Any]]:
        """Collect all installed Win32 and UWP applications."""
        apps: List[Dict[str, Any]] = []
        seen_names = set()

        # 1. Enumerate Win32 Programs from Registry
        for root_key, subkey_path, hive_label, flags in cls.REG_UNINSTALL_PATHS:
            try:
                access = winreg.KEY_READ | flags
                with winreg.OpenKey(root_key, subkey_path, 0, access) as h_key:
                    num_subkeys, _, _ = winreg.QueryInfoKey(h_key)
                    for i in range(num_subkeys):
                        try:
                            key_name = winreg.EnumKey(h_key, i)
                            app_sub_path = f"{subkey_path}\\{key_name}"
                            with winreg.OpenKey(root_key, app_sub_path, 0, access) as app_key:
                                app_info = cls._parse_registry_app(app_key, key_name, root_key, hive_label, app_sub_path)
                                if app_info:
                                    norm_key = (app_info["name"].strip().lower(), app_info.get("version", "").strip().lower())
                                    if norm_key not in seen_names:
                                        seen_names.add(norm_key)
                                        apps.append(app_info)
                        except (PermissionError, OSError):
                            continue
            except (PermissionError, OSError):
                continue

        # 2. Enumerate Windows Store (UWP) apps
        try:
            uwp_apps = cls._get_uwp_applications()
            for u_app in uwp_apps:
                norm_key = (u_app["name"].strip().lower(), u_app.get("version", "").strip().lower())
                if norm_key not in seen_names:
                    seen_names.add(norm_key)
                    apps.append(u_app)
        except Exception as e:
            print(f"[UninstallerManager] UWP scan notice: {e}", file=sys.stderr)

        # Sort primarily by size descending (largest first), then by name
        apps.sort(key=lambda a: (a.get("estimated_size_mb", 0) or 0), reverse=True)
        return apps

    @classmethod
    def _parse_registry_app(cls, app_key, key_name: str, root_key, hive_label: str, app_sub_path: str) -> Optional[Dict[str, Any]]:
        """Extract and validate application data from registry key."""
        def get_val(name: str, default="") -> Any:
            try:
                val, _ = winreg.QueryValueEx(app_key, name)
                return val
            except (FileNotFoundError, OSError):
                return default

        # Filter out system components, updates, and entries with no display name
        display_name = str(get_val("DisplayName", "")).strip()
        if not display_name:
            return None

        # Clean DisplayName for TheCore: keep pure product name without redundant version suffix
        if display_name.lower().startswith("thecore"):
            display_name = "TheCore"

        if get_val("SystemComponent", 0) == 1:
            return None

        # Ignore Windows Updates (KB patches) and language packs
        parent_key = get_val("ParentKeyName", "")
        if parent_key or display_name.startswith("KB") and display_name[2:8].isdigit():
            return None

        uninstall_str = str(get_val("UninstallString", "")).strip()
        quiet_uninstall_str = str(get_val("QuietUninstallString", "")).strip()
        if not uninstall_str and not quiet_uninstall_str:
            return None

        install_loc = str(get_val("InstallLocation", "")).strip().strip('"')

        # Filter out dead ghost/orphaned entries whose files & uninstaller no longer exist on disk (Geek Uninstaller style)
        if install_loc and not os.path.exists(install_loc):
            uninst_candidate = uninstall_str.strip().strip('"')
            uninst_exe = uninst_candidate.split('.exe')[0] + '.exe' if '.exe' in uninst_candidate.lower() else uninst_candidate
            if not uninst_exe or not os.path.exists(uninst_exe):
                return None
        version = str(get_val("DisplayVersion", "")).strip()
        publisher = str(get_val("Publisher", "")).strip()
        raw_date = str(get_val("InstallDate", "")).strip()
        install_date = _format_install_date(raw_date)

        # Estimate size in MB
        size_kb = get_val("EstimatedSize", 0)
        size_mb = 0.0
        if isinstance(size_kb, (int, float)) and size_kb > 0:
            size_mb = round(float(size_kb) / 1024.0, 1)

        # Real disk size check: if size is missing, 0, or unrealistically small (< 100 MB), calculate real directory size
        if (size_mb < 100.0) and install_loc and os.path.isdir(install_loc):
            real_size = _get_dir_size_mb(install_loc)
            if real_size > size_mb:
                size_mb = real_size

        category = classify_app_category(display_name, publisher, install_loc)
        display_icon = str(get_val("DisplayIcon", "")).strip()
        resolved_icon = cls._resolve_app_icon_path(display_name, display_icon, install_loc)

        return {
            "id": f"{hive_label}_{key_name}",
            "name": display_name,
            "version": version or "—",
            "publisher": publisher or "Неизвестный разработчик",
            "install_date": install_date or "—",
            "install_location": install_loc,
            "uninstall_string": uninstall_str,
            "quiet_uninstall_string": quiet_uninstall_str,
            "display_icon": display_icon,
            "resolved_icon_path": resolved_icon,
            "estimated_size_mb": size_mb,
            "category": category,
            "app_type": "win32",
            "hive": "HKLM" if root_key == winreg.HKEY_LOCAL_MACHINE else "HKCU",
            "registry_path": app_sub_path,
            "key_name": key_name
        }

    @classmethod
    def _resolve_app_icon_path(cls, display_name: str, display_icon: str, install_loc: str) -> str:
        """Intelligently resolves the best available icon file (.ico, .exe, .dll, .png, .lnk) for an app."""
        # 1. Try registry DisplayIcon
        if display_icon:
            raw = display_icon.strip().strip('"')
            if ',' in raw:
                raw = raw.split(',')[0].strip().strip('"')
            clean = os.path.expandvars(raw)
            if os.path.isfile(clean):
                return clean

        # 2. Check install_location
        if install_loc and os.path.isdir(install_loc):
            # Look for .ico first
            try:
                ico_files = [f for f in os.listdir(install_loc) if f.lower().endswith('.ico')]
                if ico_files:
                    name_words = [w.lower() for w in display_name.split() if len(w) > 2]
                    for ic in ico_files:
                        if any(w in ic.lower() for w in name_words):
                            return os.path.join(install_loc, ic)
                    return os.path.join(install_loc, ico_files[0])
            except (PermissionError, OSError):
                pass

            # Look for UWP assets or .png logos
            try:
                assets_dir = os.path.join(install_loc, "Assets")
                if os.path.isdir(assets_dir):
                    pngs = [f for f in os.listdir(assets_dir) if f.lower().endswith('.png') and ('logo' in f.lower() or 'app' in f.lower())]
                    if pngs:
                        return os.path.join(assets_dir, pngs[0])
            except (PermissionError, OSError):
                pass

            # Look for candidate .exe
            try:
                exe_files = [f for f in os.listdir(install_loc) if f.lower().endswith('.exe')]
                bad_prefixes = ('unins', 'setup', 'install', 'crash', 'update', 'vcredist', 'dxsetup', 'helper')
                candidates = [f for f in exe_files if not any(f.lower().startswith(bp) for bp in bad_prefixes)]
                if candidates:
                    name_words = [w.lower() for w in display_name.split() if len(w) > 2]
                    for c in candidates:
                        c_low = c.lower()
                        if any(w in c_low for w in name_words):
                            return os.path.join(install_loc, c)
                    return os.path.join(install_loc, candidates[0])
            except (PermissionError, OSError):
                pass

        # 3. Check Desktop and Start Menu shortcuts
        try:
            shortcut_dirs = [
                os.path.join(os.environ.get('PUBLIC', r'C:\Users\Public'), 'Desktop'),
                os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop'),
                os.path.join(os.environ.get('PROGRAMDATA', r'C:\ProgramData'), r'Microsoft\Windows\Start Menu\Programs'),
                os.path.join(os.environ.get('APPDATA', ''), r'Microsoft\Windows\Start Menu\Programs'),
            ]
            name_words = [w.lower() for w in display_name.split() if len(w) > 2]
            for s_dir in shortcut_dirs:
                if not os.path.isdir(s_dir):
                    continue
                for root, _, files in os.walk(s_dir):
                    for fn in files:
                        if fn.lower().endswith('.lnk'):
                            fn_low = fn.lower()
                            if any(w in fn_low for w in name_words):
                                return os.path.join(root, fn)
                    if root != s_dir:
                        break
        except Exception:
            pass

        return ""

    UWP_IGNORED_PREFIXES = (
        "microsoft.microsoftedge",
        "microsoftcorporationii.winappruntime",
        "microsoft.languageexperiencepack",
        "microsoft.vclibs",
        "microsoft.net.",
        "microsoft.ui.xaml",
        "microsoft.winget",
        "microsoft.storepurchaseapp",
        "microsoft.widgetsplatformruntime",
        "microsoft.startexperiencesapp",
        "microsoftwindows.client.webexperience",
        "microsoftwindows.crossdevice",
        "microsoft.ink.",
        "microsoft.windows.oobe",
        "microsoft.bioenrollment",
        "microsoft.cred",
        "windows.print",
        "windows.cbs",
        "ncsiuwpapp",
        "microsoft.win32webviewhost",
        "microsoft.windows.calling",
        "microsoft.windows.capture",
        "microsoft.windows.assignedaccess",
        "microsoft.windows.narratorquickstart",
        "microsoftwindows.undockeddevkit",
        "microsoft.windows.apprep",
        "microsoft.windows.",
    )

    UWP_IGNORED_SUFFIXES = (
        "videoextension",
        "videoextensions",
        "imageextension",
        "imageextensions",
        "mediaextensions",
        "mediaextension",
    )

    UWP_FRIENDLY_NAMES = {
        "microsoft.paint": "Paint",
        "microsoft.windowsnotepad": "Блокнот",
        "microsoft.windowscalculator": "Калькулятор",
        "microsoft.windowscamera": "Камера",
        "microsoft.windowsalarms": "Часы и будильник",
        "microsoft.windowssoundrecorder": "Запись голоса",
        "microsoft.windowsfeedbackhub": "Центр отзывов",
        "microsoft.windowsterminal": "Windows Terminal",
        "microsoft.windows.photos": "Фотографии",
        "microsoft.windowsstore": "Microsoft Store",
        "microsoft.powerautomatedesktop": "Power Automate",
        "microsoft.yourphone": "Связь с телефоном (Phone Link)",
        "microsoft.zunemusic": "Media Player",
        "microsoft.outlookforwindows": "Outlook for Windows",
        "microsoft.onedrivesync": "Microsoft OneDrive",
        "microsoft.windowscommunicationsapps": "Почта и Календарь",
        "microsoft.people": "Люди (People)",
        "microsoft.bingsearch": "Поиск Bing",
        "microsoft.gethelp": "Техподдержка (Get Help)",
        "microsoft.windows.devhome": "Dev Home",
        "microsoft.xboxgameoverlay": "Xbox Game Bar Overlay",
        "microsoft.xboxgamingoverlay": "Xbox Game Bar",
        "microsoft.xboxidentityprovider": "Xbox Live Services",
        "microsoft.xboxspeechtotextoverlay": "Xbox Speech-To-Text",
        "nvidiacorp.nvidiacontrolpanel": "Панель управления NVIDIA",
        "b9eced6f.armourycrate": "ASUS Armoury Crate",
        "xk72.charles": "Charles Web Debugging Proxy",
    }

    @classmethod
    def _clean_uwp_name(cls, raw_name: str) -> str:
        """Format raw UWP package name into clean human-readable title."""
        low = raw_name.lower().strip()
        if low in cls.UWP_FRIENDLY_NAMES:
            return cls.UWP_FRIENDLY_NAMES[low]
        parts = raw_name.split(".")
        # Strip hex vendor hash prefix e.g. B9ECED6F.
        if len(parts) > 1 and len(parts[0]) == 8 and all(c in "0123456789ABCDEFabcdef" for c in parts[0]):
            candidate = parts[1]
        elif len(parts) > 1 and parts[0].lower() in ("microsoft", "microsoftwindows"):
            candidate = parts[-1]
        else:
            candidate = parts[-1]
        spaced = re.sub(r'([a-z])([A-Z])', r'\1 \2', candidate)
        return spaced.strip() or raw_name

    @classmethod
    def _get_uwp_applications(cls) -> List[Dict[str, Any]]:
        """Retrieve user-removable UWP / Windows Store apps via PowerShell for active user."""
        ps_cmd = (
            "Get-AppxPackage | "
            "Where-Object { -not $_.IsFramework -and -not $_.NonRemovable -and $_.SignatureKind -ne 'System' } | "
            "Select-Object Name, PackageFullName, Version, Publisher, InstallLocation | "
            "ConvertTo-Json -Compress"
        )
        try:
            res = subprocess.run(
                ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd],
                capture_output=True,
                text=True,
                timeout=6,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            if res.returncode != 0 or not res.stdout.strip():
                return []

            data = json.loads(res.stdout)
            if isinstance(data, dict):
                data = [data]

            uwp_list = []
            seen_pkg_names = set()

            for item in data:
                name = item.get("Name", "")
                pkg_full = item.get("PackageFullName", "")
                if not name or not pkg_full:
                    continue

                low_name = name.lower()
                # 1. Filter out core system infrastructure & internal runtime packages
                if any(low_name.startswith(p) for p in cls.UWP_IGNORED_PREFIXES):
                    continue
                # 2. Filter out internal codec/image extension packages
                if any(low_name.endswith(s) for s in cls.UWP_IGNORED_SUFFIXES):
                    continue
                # 3. Deduplicate (keep single active version per package name)
                if low_name in seen_pkg_names:
                    continue
                seen_pkg_names.add(low_name)

                install_loc = item.get("InstallLocation", "")
                size_mb = _get_dir_size_mb(install_loc) if install_loc and os.path.isdir(install_loc) else 0.0

                friendly_name = cls._clean_uwp_name(name)
                publisher_str = "Microsoft Store" if "Microsoft" in (item.get("Publisher") or "") else (item.get("Publisher") or "UWP App")
                category = classify_app_category(friendly_name, publisher_str, install_loc)
                resolved_icon = cls._resolve_app_icon_path(friendly_name, "", install_loc)

                uwp_list.append({
                    "id": f"uwp_{pkg_full}",
                    "name": friendly_name,
                    "package_name": name,
                    "package_full_name": pkg_full,
                    "version": item.get("Version", "—"),
                    "publisher": publisher_str,
                    "install_date": "—",
                    "install_location": install_loc,
                    "uninstall_string": f"powershell -Command Remove-AppxPackage -Package {pkg_full}",
                    "quiet_uninstall_string": "",
                    "display_icon": "",
                    "resolved_icon_path": resolved_icon,
                    "estimated_size_mb": size_mb,
                    "category": category,
                    "app_type": "uwp",
                    "hive": "UWP",
                    "registry_path": "",
                    "key_name": pkg_full
                })
            return uwp_list
        except Exception:
            return []

    @classmethod
    def scan_residuals(cls, app: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deep Residual Scanner:
        Scans filesystem and Windows Registry for leftover files, folders, and keys.
        """
        app_name = (app.get("name") or "").strip()
        publisher = (app.get("publisher") or "").strip()
        install_loc = (app.get("install_location") or "").strip()
        
        residuals: List[Dict[str, Any]] = []

        if not app_name or len(app_name) < 2:
            return {"items": [], "total_size_mb": 0.0, "total_count": 0}

        # Clean search tokens
        raw_tokens = [w for w in app_name.replace("-", " ").replace("_", " ").split() if len(w) > 2]
        ignore_words = {"setup", "installer", "version", "edition", "x64", "x86", "64bit", "32bit", "client", "microsoft", "windows"}
        tokens = [t.lower() for t in raw_tokens if t.lower() not in ignore_words]
        if not tokens:
            tokens = [app_name.lower()]

        # 1. Search File System
        search_roots = [
            os.environ.get('ProgramData', r'C:\ProgramData'),
            os.path.join(os.environ.get('LOCALAPPDATA', r'C:\Users\Default\AppData\Local')),
            os.path.join(os.environ.get('LOCALAPPDATA', r'C:\Users\Default\AppData\Local'), 'Programs'),
            os.environ.get('APPDATA', r'C:\Users\Default\AppData\Roaming'),
            os.environ.get('ProgramFiles', r'C:\Program Files'),
            os.environ.get('ProgramFiles(x86)', r'C:\Program Files (x86)'),
        ]

        found_paths = set()

        # If install_location still exists, include it
        if install_loc and os.path.exists(install_loc) and cls._is_path_safe_to_touch(install_loc):
            norm_loc = os.path.normpath(install_loc).lower()
            if norm_loc not in found_paths:
                found_paths.add(norm_loc)
                size_mb = _get_dir_size_mb(install_loc)
                residuals.append({
                    "id": f"fs_{len(residuals)}",
                    "type": "folder",
                    "category": "Корневой каталог установки",
                    "path": install_loc,
                    "size_mb": size_mb,
                    "safe": True
                })

        for root_dir in search_roots:
            if not root_dir or not os.path.exists(root_dir):
                continue
            try:
                for entry in os.scandir(root_dir):
                    if not entry.is_dir(follow_symlinks=False):
                        continue
                    folder_name = entry.name.lower()
                    folder_path = entry.path

                    # Check token match
                    matches = any(t in folder_name for t in tokens)
                    if matches and cls._is_path_safe_to_touch(folder_path):
                        norm_p = os.path.normpath(folder_path).lower()
                        if norm_p not in found_paths:
                            found_paths.add(norm_p)
                            size_mb = _get_dir_size_mb(folder_path)
                            cat = "Папка данных (%AppData% / %ProgramData%)" if "appdata" in norm_p or "programdata" in norm_p else "Папка приложения"
                            residuals.append({
                                "id": f"fs_{len(residuals)}",
                                "type": "folder",
                                "category": cat,
                                "path": folder_path,
                                "size_mb": size_mb,
                                "safe": True
                            })
            except (PermissionError, OSError):
                continue

        # 2. Search Registry Keys
        reg_targets = [
            (winreg.HKEY_CURRENT_USER, r"Software", "HKCU\\Software"),
            (winreg.HKEY_LOCAL_MACHINE, r"Software", "HKLM\\Software"),
            (winreg.HKEY_LOCAL_MACHINE, r"Software\WOW6432Node", "HKLM\\Software\\WOW6432Node"),
        ]

        for h_root, rel_path, display_prefix in reg_targets:
            try:
                with winreg.OpenKey(h_root, rel_path, 0, winreg.KEY_READ) as k:
                    sub_count, _, _ = winreg.QueryInfoKey(k)
                    for i in range(sub_count):
                        try:
                            s_name = winreg.EnumKey(k, i)
                            s_name_lower = s_name.lower()
                            if any(t == s_name_lower or t in s_name_lower for t in tokens):
                                full_reg_path = f"{display_prefix}\\{s_name}"
                                if cls._is_reg_safe_to_touch(full_reg_path):
                                    residuals.append({
                                        "id": f"reg_{len(residuals)}",
                                        "type": "registry",
                                        "category": "Запись в системном реестре",
                                        "path": full_reg_path,
                                        "hive": "HKCU" if h_root == winreg.HKEY_CURRENT_USER else "HKLM",
                                        "sub_key": f"{rel_path}\\{s_name}",
                                        "size_mb": 0.01,
                                        "safe": True
                                    })
                        except (PermissionError, OSError):
                            continue
            except (PermissionError, OSError):
                continue

        total_size = round(sum(r.get("size_mb", 0) for r in residuals), 1)
        return {
            "items": residuals,
            "total_size_mb": total_size,
            "total_count": len(residuals)
        }

    @classmethod
    def _is_path_safe_to_touch(cls, target_path: str) -> bool:
        """Verify target path is safe and not a root system directory."""
        if not target_path or len(target_path) < 4:
            return False
        norm = os.path.normpath(target_path).lower()

        # Drive roots are strictly forbidden
        if len(norm) <= 3 or norm in [r"c:", r"d:", r"e:", r"c:\\", r"d:\\", r"e:\\"]:
            return False

        # Windows root directory is strictly forbidden
        if norm == r"c:\windows" or norm.startswith(r"c:\windows\\"):
            return False

        # System roots cannot be deleted as a whole
        root_prots = [
            r"c:\program files",
            r"c:\program files (x86)",
            r"c:\programdata",
            r"c:\users",
            r"c:\program files\common files",
            r"c:\program files (x86)\common files",
            os.environ.get('USERPROFILE', '').lower(),
            os.path.join(os.environ.get('USERPROFILE', ''), 'appdata').lower(),
            os.path.join(os.environ.get('USERPROFILE', ''), 'appdata', 'local').lower(),
            os.path.join(os.environ.get('USERPROFILE', ''), 'appdata', 'roaming').lower(),
        ]
        if norm in root_prots:
            return False

        return True

    @classmethod
    def _is_reg_safe_to_touch(cls, reg_full_path: str) -> bool:
        """Verify registry key is safe and not a critical Windows subkey."""
        norm = reg_full_path.lower().replace("/", "\\")
        for prot in CRITICAL_PROTECTED_REG:
            if prot in norm:
                return False
        # Do not delete root Microsoft node itself, only specific vendor/app subkeys
        if norm in [r"hkcu\software\microsoft", r"hklm\software\microsoft", r"hklm\software\wow6432node\microsoft"]:
            return False
        return True

    @classmethod
    def delete_residuals(cls, residual_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Safely delete selected leftover files, folders, and registry keys."""
        deleted_files = 0
        deleted_reg_keys = 0
        freed_mb = 0.0
        errors: List[str] = []

        for item in residual_items:
            item_type = item.get("type")
            path = item.get("path", "")

            # 1. Delete Folders / Files
            if item_type in ("folder", "file"):
                if not cls._is_path_safe_to_touch(path):
                    continue
                try:
                    if os.path.isdir(path):
                        size = _get_dir_size_mb(path)
                        success = cls._unlock_and_delete_dir(path)
                        if success:
                            deleted_files += 1
                            freed_mb += size
                        else:
                            errors.append(f"Не удалось удалить папку: {path}")
                    elif os.path.isfile(path):
                        size = round(os.path.getsize(path) / (1024 * 1024), 2)
                        try:
                            os.chmod(path, stat.S_IWRITE)
                            os.remove(path)
                        except Exception:
                            subprocess.run(["cmd.exe", "/c", "del", "/f", "/q", f'"{path}"'], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
                        if not os.path.exists(path):
                            deleted_files += 1
                            freed_mb += size
                        else:
                            errors.append(f"Не удалось удалить файл: {path}")
                except Exception as ex:
                    errors.append(f"Файл {path}: {ex}")

            # 2. Delete Registry Keys
            elif item_type == "registry":
                if not cls._is_reg_safe_to_touch(path):
                    continue
                hive_name = item.get("hive", "HKCU")
                sub_key = item.get("sub_key", "")
                h_root = winreg.HKEY_CURRENT_USER if hive_name == "HKCU" else winreg.HKEY_LOCAL_MACHINE
                try:
                    cls._delete_registry_tree(h_root, sub_key)
                    deleted_reg_keys += 1
                except Exception as ex:
                    errors.append(f"Реестр {path}: {ex}")

        return {
            "success": len(errors) == 0 or deleted_files > 0 or deleted_reg_keys > 0,
            "deleted_files_count": deleted_files,
            "deleted_reg_keys_count": deleted_reg_keys,
            "freed_mb": round(freed_mb, 1),
            "errors": errors
        }

    @classmethod
    def _unlock_and_delete_dir(cls, path: str) -> bool:
        """Forcefully take ownership, unlock and delete a directory."""
        if not path or not os.path.exists(path):
            return True

        # 1. Take ownership and grant full access to Administrators
        try:
            subprocess.run(["takeown", "/F", path, "/R", "/D", "Y"], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
            subprocess.run(["icacls", path, "/grant", "*S-1-5-32-544:F", "/T", "/C", "/Q"], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
        except Exception:
            pass

        # 2. Try shutil.rmtree with chmod
        try:
            def _on_rm_err(func, p, exc):
                try:
                    os.chmod(p, stat.S_IWRITE)
                    func(p)
                except Exception:
                    pass
            shutil.rmtree(path, onerror=_on_rm_err)
        except Exception:
            pass

        # 3. Fallback cmd.exe rd /s /q
        if os.path.exists(path):
            try:
                subprocess.run(["cmd.exe", "/c", "rd", "/s", "/q", f'"{path}"'], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
            except Exception:
                pass

        return not os.path.exists(path)

    @classmethod
    def _delete_uninstall_keys(cls, hive: str, key_name: str, reg_path: str):
        """Delete application uninstall entries from both 32-bit and 64-bit registry views."""
        keys_to_clean = []
        if reg_path:
            keys_to_clean.append(f"{hive}\\{reg_path}")
        if key_name:
            if hive == "HKLM":
                keys_to_clean.append(rf"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{key_name}")
                keys_to_clean.append(rf"HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{key_name}")
            else:
                keys_to_clean.append(rf"HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{key_name}")

        for k_path in set(keys_to_clean):
            for reg_flag in [[], ["/reg:32"], ["/reg:64"]]:
                try:
                    subprocess.run(
                        ["reg.exe", "delete", k_path, "/f"] + reg_flag,
                        capture_output=True,
                        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                    )
                except Exception:
                    pass

    @classmethod
    def _delete_registry_tree(cls, root_key, subkey_path: str):
        """Recursively delete a Windows Registry key and all its subkeys."""
        try:
            # Win32 API RegDeleteTreeW directly removes the key tree
            advapi32 = ctypes.windll.advapi32
            res = advapi32.RegDeleteTreeW(root_key, ctypes.c_wchar_p(subkey_path))
            if res != 0 and res != 2:  # 2 is ERROR_FILE_NOT_FOUND (already gone)
                # Fallback manual recursion
                with winreg.OpenKey(root_key, subkey_path, 0, winreg.KEY_ALL_ACCESS) as key:
                    while True:
                        try:
                            sub = winreg.EnumKey(key, 0)
                            cls._delete_registry_tree(root_key, f"{subkey_path}\\{sub}")
                        except OSError:
                            break
                winreg.DeleteKey(root_key, subkey_path)
        except Exception:
            pass

    @classmethod
    def run_standard_uninstall(cls, app: Dict[str, Any]) -> Dict[str, Any]:
        """Launch the official application uninstaller and wait for completion."""
        uninstall_str = app.get("uninstall_string") or app.get("quiet_uninstall_string")
        if not uninstall_str:
            return {"success": False, "error": "Строка деинсталляции отсутствует"}

        try:
            # If UWP app, run PowerShell Remove-AppxPackage
            if app.get("app_type") == "uwp":
                pkg = app.get("package_full_name") or app.get("key_name")
                cmd = f"Remove-AppxPackage -Package {pkg} -AllUsers"
                res = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=30)
                return {"success": res.returncode == 0}

            # If MSI uninstaller
            if "msiexec" in uninstall_str.lower():
                # Ensure /X flag is used for uninstall
                cleaned_str = uninstall_str.replace("/I", "/X").replace("/i", "/X")
                proc = subprocess.Popen(cleaned_str, shell=True)
                proc.wait()
                return {"success": True}

            # Standard Win32 executable
            proc = subprocess.Popen(uninstall_str, shell=True)
            proc.wait()
            return {"success": True}
        except Exception as ex:
            return {"success": False, "error": str(ex)}

    @classmethod
    def force_remove_app(cls, app: Dict[str, Any]) -> Dict[str, Any]:
        """
        Force Removal Mode:
        Directly eliminates program directory, terminates lingering processes,
        cleans shortcuts and registry uninstallation entries, and removes residuals.
        """
        import psutil
        import stat

        install_loc = app.get("install_location", "")
        reg_path = app.get("registry_path", "")
        hive_name = app.get("hive", "HKLM")
        app_type = app.get("app_type", "win32")
        app_name = app.get("name", "")

        freed_mb = 0.0

        # 1. Handle UWP
        if app_type == "uwp":
            return cls.run_standard_uninstall(app)

        # 2. Terminate any running processes for this app
        try:
            if install_loc and os.path.isdir(install_loc):
                norm_loc = os.path.normpath(install_loc).lower()
                for proc in psutil.process_iter(['pid', 'name', 'exe']):
                    try:
                        exe = proc.info.get('exe')
                        if exe and os.path.normpath(exe).lower().startswith(norm_loc):
                            proc.kill()
                    except Exception:
                        pass
        except Exception:
            pass

        # Targeted termination for stubborn clients (Edge, Chrome, etc.)
        if "edge" in app_name.lower():
            for p_name in ["msedge.exe", "msedgewebview2.exe", "MicrosoftEdgeUpdate.exe", "identity_helper.exe"]:
                try:
                    subprocess.run(["taskkill", "/F", "/IM", p_name, "/T"], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
                except Exception:
                    pass
            for svc in ["edgeupdate", "edgeupdatem"]:
                try:
                    subprocess.run(["sc", "stop", svc], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
                except Exception:
                    pass

        # 3. Remove Install Location if safe
        if install_loc and os.path.isdir(install_loc) and cls._is_path_safe_to_touch(install_loc):
            size = _get_dir_size_mb(install_loc)
            if cls._unlock_and_delete_dir(install_loc):
                freed_mb += size
            else:
                print(f"[ForceRemove] Could not delete install location: {install_loc}", file=sys.stderr)

        # 4. Remove Registry Uninstall entry via reg.exe (native 32 & 64 bit views)
        key_name = app.get("key_name", "")
        cls._delete_uninstall_keys(hive_name, key_name, reg_path)

        # 5. Clean shortcuts on Desktop and Start Menu
        try:
            name_tokens = [t.lower() for t in app_name.replace("-", " ").split() if len(t) > 2]
            shortcut_dirs = [
                os.path.join(os.environ.get('USERPROFILE', ''), 'Desktop'),
                os.path.join(os.environ.get('PUBLIC', r'C:\Users\Public'), 'Desktop'),
                os.path.join(os.environ.get('APPDATA', ''), r'Microsoft\Windows\Start Menu\Programs'),
                os.path.join(os.environ.get('PROGRAMDATA', ''), r'Microsoft\Windows\Start Menu\Programs'),
            ]
            for s_dir in shortcut_dirs:
                if os.path.isdir(s_dir):
                    for root, _, files in os.walk(s_dir):
                        for f in files:
                            if f.lower().endswith('.lnk') and any(t in f.lower() for t in name_tokens):
                                try:
                                    os.remove(os.path.join(root, f))
                                except Exception:
                                    pass
        except Exception:
            pass

        # 6. Automatically find and delete residuals
        scan_res = cls.scan_residuals(app)
        items = scan_res.get("items", [])
        del_res = cls.delete_residuals(items)

        total_freed = round(freed_mb + del_res.get("freed_mb", 0.0), 1)

        # Verify whether uninstall key is gone
        key_still_exists = False
        if hive_name == "HKLM" and key_name:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, rf"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{key_name}", 0, winreg.KEY_READ | winreg.KEY_WOW64_32KEY):
                    key_still_exists = True
            except OSError:
                try:
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, rf"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{key_name}", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY):
                        key_still_exists = True
                except OSError:
                    key_still_exists = False

        if key_still_exists or (install_loc and os.path.exists(install_loc)):
            return {
                "success": False,
                "error": "Не удалось полностью удалить системные файлы или запись реестра. Запустите TheCore от имени Администратора.",
                "freed_mb": total_freed
            }

        return {
            "success": True,
            "freed_mb": total_freed,
            "deleted_files_count": del_res.get("deleted_files_count", 0) + (1 if install_loc else 0),
            "deleted_reg_keys_count": del_res.get("deleted_reg_keys_count", 0) + (1 if reg_path else 0)
        }
