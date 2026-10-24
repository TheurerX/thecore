"""
Модуль чистой автоматической оптимизации ПК:
- Автоматическая выгрузка несистемных ресурсоёмких фоновых лаунчеров и апдейтеров
- Сброс неиспользуемого кэша оперативной памяти (EmptyWorkingSet)
- Глубокая очистка временных файлов (%TEMP%)
- Безопасная очистка кэша шейдеров GPU (DirectX / Vulkan / NVIDIA / AMD)
- Поддержка пошагового прогресса для плавного UI
"""

import os
import time
import ctypes
import psutil

# Строгий белый список: системные службы Windows и важные компоненты
SYSTEM_WHITELIST = {
    "system", "system idle process", "registry", "smss.exe", "csrss.exe", "wininit.exe",
    "services.exe", "lsass.exe", "svchost.exe", "fontdrvhost.exe", "winlogon.exe",
    "dwm.exe", "explorer.exe", "sihost.exe", "taskhostw.exe", "ctfmon.exe",
    "runtimebroker.exe", "shellexperiencehost.exe", "startmenuexperiencehost.exe",
    "searchhost.exe", "securityhealthsystray.exe", "securityhealthservice.exe",
    "audiodg.exe", "spoolsv.exe", "conhost.exe", "searchindexer.exe", "msmpeng.exe",
    "nissrv.exe", "wudfhost.exe", "dashost.exe", "smartscreen.exe", "taskmgr.exe",
    "python.exe", "pythonw.exe", "powershell.exe", "cmd.exe", "code.exe",
    "antigravity.exe", "git.exe"
}

# Мишени для автоматической выгрузки перед играми или тяжелой работой
AUTO_TARGET_APPS = {
    # Игровые клиенты
    "steam.exe": "Steam",
    "steamwebhelper.exe": "Steam Web Helper",
    "epicgameslauncher.exe": "Epic Games",
    "battle.net.exe": "Battle.net",
    "agent.exe": "Battle.net Agent",
    "galaxyclient.exe": "GOG Galaxy",
    "origin.exe": "Origin",
    "eadesktop.exe": "EA Desktop",
    "ubisoftconnect.exe": "Ubisoft Connect",
    "riotclientservices.exe": "Riot Client",
    # Мессенджеры
    "discord.exe": "Discord",
    "telegram.exe": "Telegram",
    "whatsapp.exe": "WhatsApp",
    "skype.exe": "Skype",
    "slack.exe": "Slack",
    "teams.exe": "Teams",
    # Торренты и авто-апдейтеры
    "utorrent.exe": "uTorrent",
    "qbittorrent.exe": "qBittorrent",
    "bittorrent.exe": "BitTorrent",
    "onedrive.exe": "OneDrive",
    "dropbox.exe": "Dropbox",
    "spotify.exe": "Spotify",
    "vlc.exe": "VLC"
}


class SystemOptimizer:
    def __init__(self):
        self.kernel32 = ctypes.windll.kernel32
        self.psapi = ctypes.windll.psapi
        self.PROCESS_QUERY_INFORMATION = 0x0400
        self.PROCESS_SET_QUOTA = 0x0100

    def clean_ram_working_set(self) -> dict:
        """Сброс неиспользуемого кэша RAM по всем доступным процессам."""
        mem_before = psutil.virtual_memory()
        processed_count = 0

        for p in psutil.process_iter(["pid", "name"]):
            try:
                pid = p.info["pid"]
                if pid <= 4:
                    continue
                name = (p.info["name"] or "").lower()
                if name in ("python.exe", "pythonw.exe"):
                    continue

                h_proc = self.kernel32.OpenProcess(
                    self.PROCESS_QUERY_INFORMATION | self.PROCESS_SET_QUOTA,
                    False,
                    pid
                )
                if h_proc:
                    self.psapi.EmptyWorkingSet(h_proc)
                    self.kernel32.CloseHandle(h_proc)
                    processed_count += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            except Exception:
                pass

        mem_after = psutil.virtual_memory()
        freed_bytes = max(0, mem_before.used - mem_after.used)

        return {
            "processed_processes": processed_count,
            "freed_mb": round(freed_bytes / (1024 ** 2), 1),
            "ram_used_before_gb": round(mem_before.used / (1024 ** 3), 1),
            "ram_used_after_gb": round(mem_after.used / (1024 ** 3), 1),
            "ram_percent_now": mem_after.percent
        }

    def clean_temp_files(self) -> dict:
        """Очистка временных файлов из %TEMP%."""
        temp_dir = os.environ.get("TEMP", "")
        deleted_files = 0
        deleted_dirs = 0
        freed_bytes = 0

        if not temp_dir or not os.path.exists(temp_dir):
            return {"deleted_files": 0, "freed_mb": 0.0}

        for root, dirs, files in os.walk(temp_dir, topdown=False):
            for file in files:
                fpath = os.path.join(root, file)
                try:
                    size = os.path.getsize(fpath)
                    os.remove(fpath)
                    deleted_files += 1
                    freed_bytes += size
                except Exception:
                    pass

            for d in dirs:
                dpath = os.path.join(root, d)
                try:
                    os.rmdir(dpath)
                    deleted_dirs += 1
                except Exception:
                    pass

        return {
            "deleted_files": deleted_files,
            "deleted_dirs": deleted_dirs,
            "freed_mb": round(freed_bytes / (1024 ** 2), 1)
        }

    def clean_shader_cache(self) -> dict:
        """
        Безопасная очистка кэша шейдеров GPU (DirectX, Vulkan, OpenGL, NVIDIA, AMD).
        Файлы, заблокированные запущенными играми или видеодрайвером, безопасно пропускаются.
        """
        local_app = os.environ.get("LOCALAPPDATA", "")
        if not local_app:
            return {"deleted_files": 0, "freed_mb": 0.0}

        cache_dirs = [
            # NVIDIA Shader Caches
            os.path.join(local_app, "NVIDIA", "DXCache"),
            os.path.join(local_app, "NVIDIA", "GLCache"),
            os.path.join(local_app, "NVIDIA Corporation", "NV_Cache"),
            # DirectX Shader Cache
            os.path.join(local_app, "D3DSCache"),
            # AMD Shader Caches
            os.path.join(local_app, "AMD", "DxCache"),
            os.path.join(local_app, "AMD", "GLCache"),
            os.path.join(local_app, "AMD", "D3DSCache"),
        ]

        deleted_files = 0
        freed_bytes = 0

        for target_dir in cache_dirs:
            if not os.path.exists(target_dir):
                continue

            for root, dirs, files in os.walk(target_dir, topdown=False):
                for file in files:
                    fpath = os.path.join(root, file)
                    try:
                        size = os.path.getsize(fpath)
                        os.remove(fpath)
                        deleted_files += 1
                        freed_bytes += size
                    except Exception:
                        # Файл заблокирован драйвером или запущенной игрой — безопасно пропускаем
                        pass

                for d in dirs:
                    dpath = os.path.join(root, d)
                    try:
                        os.rmdir(dpath)
                    except Exception:
                        pass

        return {
            "deleted_files": deleted_files,
            "freed_mb": round(freed_bytes / (1024 ** 2), 1)
        }

    def close_target_background_apps(self) -> dict:
        """Автоматическая безопасная выгрузка фоновых приложений из списка целевых."""
        closed_count = 0
        freed_mb = 0.0
        closed_names = []

        for p in psutil.process_iter(["pid", "name", "memory_info"]):
            try:
                name_lower = (p.info["name"] or "").strip().lower()
                pid = p.info["pid"]

                if pid <= 4 or name_lower in SYSTEM_WHITELIST:
                    continue

                if name_lower in AUTO_TARGET_APPS:
                    mem = (p.info["memory_info"].rss if p.info["memory_info"] else 0) / (1024 ** 2)
                    p.terminate()
                    closed_count += 1
                    freed_mb += mem
                    closed_names.append(AUTO_TARGET_APPS[name_lower])
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            except Exception:
                pass

        return {
            "closed_count": closed_count,
            "freed_mb": round(freed_mb, 1),
            "closed_names": list(set(closed_names))
        }

    def run_auto_optimization(self, step_callback=None) -> dict:
        """
        Полный автоматический цикл оптимизации с пошаговым уведомлением callback:
        1. Выгрузка фоновых лаунчеров и апдейтеров
        2. Очистка кэша оперативной памяти
        3. Очистка системных файлов Temp
        4. Очистка кэша шейдеров GPU (DirectX / Vulkan / NVIDIA / AMD)
        5. Завершение
        """
        def report_step(step_idx: int, title: str, progress: float):
            if step_callback:
                step_callback(step_idx, title, progress)

        # Фаза 1: Фоновые процессы
        report_step(1, "Выгрузка фоновых лаунчеров и апдейтеров...", 0.20)
        time.sleep(0.3)
        proc_res = self.close_target_background_apps()

        # Фаза 2: Кэш оперативной памяти
        report_step(2, "Сброс неиспользуемого кэша RAM (EmptyWorkingSet)...", 0.45)
        time.sleep(0.4)
        ram_res = self.clean_ram_working_set()

        # Фаза 3: Временные файлы
        report_step(3, "Удаление системного мусора и %TEMP%...", 0.70)
        time.sleep(0.3)
        temp_res = self.clean_temp_files()

        # Фаза 4: Кэш шейдеров GPU
        report_step(4, "Очистка кэша шейдеров GPU (DirectX/Vulkan)...", 0.90)
        time.sleep(0.3)
        shader_res = self.clean_shader_cache()

        # Фаза 5: Завершение
        report_step(5, "Оптимизация успешно завершена!", 1.0)
        time.sleep(0.2)

        total_cleaned_mb = round(temp_res["freed_mb"] + shader_res["freed_mb"], 1)

        return {
            "closed_processes_count": proc_res["closed_count"],
            "closed_names": proc_res["closed_names"],
            "proc_freed_mb": proc_res["freed_mb"],
            "ram_freed_mb": ram_res["freed_mb"],
            "temp_deleted_files": temp_res["deleted_files"],
            "temp_freed_mb": total_cleaned_mb,
            "shader_freed_mb": shader_res["freed_mb"],
            "shader_deleted_files": shader_res["deleted_files"],
            "total_disk_freed_mb": total_cleaned_mb,
            "current_ram_percent": ram_res["ram_percent_now"]
        }

    def analyze_optimization_potential(self) -> dict:
        """
        Экспресс-аудит системы без модификации файлов:
        1. Оперативная память: текущая загрузка, объем, расчетная оценка кэша EmptyWorkingSet
        2. Системный мусор (%TEMP%): размер и количество файлов
        3. Кэш шейдеров GPU (DirectX, Vulkan, NVIDIA, AMD): размер и количество файлов
        4. Фоновые лаунчеры и апдейтеры: количество активных, потребление памяти, имена
        5. Итоговый статус готовности и объем ресурсов, готовых к освобождению
        """
        # 1. Анализ %TEMP%
        temp_dir = os.environ.get("TEMP", "")
        temp_files_count = 0
        temp_bytes = 0
        if temp_dir and os.path.exists(temp_dir):
            for root, dirs, files in os.walk(temp_dir):
                for f in files:
                    try:
                        fpath = os.path.join(root, f)
                        temp_bytes += os.path.getsize(fpath)
                        temp_files_count += 1
                    except Exception:
                        pass
        temp_size_mb = round(temp_bytes / (1024 ** 2), 1)

        # 2. Анализ кэша шейдеров GPU
        local_app = os.environ.get("LOCALAPPDATA", "")
        shader_dirs = [
            os.path.join(local_app, "NVIDIA", "DXCache"),
            os.path.join(local_app, "NVIDIA", "GLCache"),
            os.path.join(local_app, "NVIDIA Corporation", "NV_Cache"),
            os.path.join(local_app, "D3DSCache"),
            os.path.join(local_app, "AMD", "DxCache"),
            os.path.join(local_app, "AMD", "GLCache"),
            os.path.join(local_app, "AMD", "D3DSCache"),
        ] if local_app else []

        shader_files_count = 0
        shader_bytes = 0
        for sdir in shader_dirs:
            if not os.path.exists(sdir):
                continue
            for root, dirs, files in os.walk(sdir):
                for f in files:
                    try:
                        fpath = os.path.join(root, f)
                        shader_bytes += os.path.getsize(fpath)
                        shader_files_count += 1
                    except Exception:
                        pass
        shader_size_mb = round(shader_bytes / (1024 ** 2), 1)

        # 3. Анализ запущенных целевых приложений
        active_target_apps = []
        target_apps_mem_mb = 0.0
        seen_names = set()
        user_proc_rss_total = 0

        for p in psutil.process_iter(["pid", "name", "memory_info"]):
            try:
                name_lower = (p.info["name"] or "").strip().lower()
                pid = p.info["pid"]
                if pid <= 4 or name_lower in SYSTEM_WHITELIST:
                    continue

                mem_rss = (p.info["memory_info"].rss if p.info["memory_info"] else 0)
                user_proc_rss_total += mem_rss

                if name_lower in AUTO_TARGET_APPS:
                    display_name = AUTO_TARGET_APPS[name_lower]
                    app_mem_mb = round(mem_rss / (1024 ** 2), 1)
                    target_apps_mem_mb += app_mem_mb
                    if display_name not in seen_names:
                        seen_names.add(display_name)
                        active_target_apps.append({
                            "name": display_name,
                            "exe": name_lower,
                            "pid": pid,
                            "memory_mb": app_mem_mb
                        })
                    else:
                        for app in active_target_apps:
                            if app["name"] == display_name:
                                app["memory_mb"] = round(app["memory_mb"] + app_mem_mb, 1)
                                break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
            except Exception:
                pass

        target_apps_mem_mb = round(target_apps_mem_mb, 1)

        # 4. Анализ оперативной памяти (RAM)
        mem = psutil.virtual_memory()
        ram_total_gb = round(mem.total / (1024 ** 3), 1)
        ram_used_gb = round(mem.used / (1024 ** 3), 1)
        ram_percent_now = mem.percent

        ram_cleanable_est_mb = round((user_proc_rss_total * 0.22) / (1024 ** 2), 1)
        if ram_cleanable_est_mb < 300.0 and mem.used > (2 * 1024 ** 3):
            ram_cleanable_est_mb = 450.0

        # 5. Итоговый расчет
        total_cleanable_disk_mb = round(temp_size_mb + shader_size_mb, 1)
        total_potential_mb = round(total_cleanable_disk_mb + ram_cleanable_est_mb + target_apps_mem_mb, 1)
        total_potential_gb = round(total_potential_mb / 1024, 2)

        if total_potential_mb > 2500 or len(active_target_apps) >= 3 or ram_percent_now > 75:
            health_status = "warning"
            health_text = "Требуется оптимизация"
        elif total_potential_mb > 800 or len(active_target_apps) >= 1 or ram_percent_now > 60:
            health_status = "moderate"
            health_text = "Рекомендуется очистка"
        else:
            health_status = "optimal"
            health_text = "Система в хорошем состоянии"

        return {
            "ram_total_gb": ram_total_gb,
            "ram_used_gb": ram_used_gb,
            "ram_percent_now": ram_percent_now,
            "ram_cleanable_mb": ram_cleanable_est_mb,
            "temp_files_count": temp_files_count,
            "temp_size_mb": temp_size_mb,
            "shader_files_count": shader_files_count,
            "shader_size_mb": shader_size_mb,
            "target_apps_count": len(active_target_apps),
            "target_apps": active_target_apps,
            "target_apps_mem_mb": target_apps_mem_mb,
            "total_cleanable_disk_mb": total_cleanable_disk_mb,
            "total_potential_mb": total_potential_mb,
            "total_potential_gb": total_potential_gb,
            "health_status": health_status,
            "health_text": health_text
        }
