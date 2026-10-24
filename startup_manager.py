"""
Модуль управления автозагрузкой Windows (Startup Manager) v1.5.0.
Включает базу экспертных комментариев, оценку безопасности отключения
и рекомендации для каждого процесса автозапуска.
"""

import os
import winreg

RUN_KEY_HKCU = r"Software\Microsoft\Windows\CurrentVersion\Run"
RUN_KEY_HKLM = r"Software\Microsoft\Windows\CurrentVersion\Run"
DISABLED_KEY_HKCU = r"Software\TheCore\DisabledStartup"

# База экспертных знаний об автозапуске Windows
APP_KNOWLEDGE_BASE = {
    "steam": {
        "title": "Steam Client",
        "rec": "Безопасно отключить",
        "rec_color": "#10b981",
        "impact": "Высокое влияние",
        "impact_color": "#ef4444",
        "desc": "Игровой клиент Valve. Игры запускаются по ярлыку вручную. Отключение ускорит включение ПК на 3–5 секунд."
    },
    "mediaget": {
        "title": "MediaGet Torrent",
        "rec": "Рекомендуется отключить",
        "rec_color": "#10b981",
        "impact": "Высокое влияние",
        "impact_color": "#ef4444",
        "desc": "Торрент-загрузчик. Рекомендуется убрать из автозапуска: постоянно нагружает диск и сеть в фоне при старте."
    },
    "edge": {
        "title": "Microsoft Edge AutoLaunch",
        "rec": "Безопасно отключить",
        "rec_color": "#10b981",
        "impact": "Высокое влияние",
        "impact_color": "#ef4444",
        "desc": "Фоновая предзагрузка браузера Edge. Не требуется при включении ПК, браузер отлично работает при обычном запуске."
    },
    "compactgui": {
        "title": "CompactGUI",
        "rec": "По желанию",
        "rec_color": "#f59e0b",
        "impact": "Низкое влияние",
        "impact_color": "#10b981",
        "desc": "Утилита сжатия файлов NTFS. Нужна в трее только если вы регулярно сжимаете папки с играми."
    },
    "proxy-sdk": {
        "title": "Proxy SDK Client",
        "rec": "По желанию",
        "rec_color": "#f59e0b",
        "impact": "Среднее влияние",
        "impact_color": "#f59e0b",
        "desc": "Служба прокси/туннелирования трафика. Отключите, если не используете прокси постоянно при каждом старте."
    },
    "razer": {
        "title": "Razer App Engine",
        "rec": "Не рекомендуется",
        "rec_color": "#ef4444",
        "impact": "Среднее влияние",
        "impact_color": "#f59e0b",
        "desc": "Драйвер звука Razer 7.1 Surround. Отключение может отключить пространственное позиционирование звука в наушниках."
    },
    "rzapp": {
        "title": "Razer Audio Engine",
        "rec": "Не рекомендуется",
        "rec_color": "#ef4444",
        "impact": "Среднее влияние",
        "impact_color": "#f59e0b",
        "desc": "Служба обработки аудио Razer. Нужна для корректной работы профилей гарнитуры."
    },
    "surround": {
        "title": "Razer Surround Helper",
        "rec": "Не рекомендуется",
        "rec_color": "#ef4444",
        "impact": "Среднее влияние",
        "impact_color": "#f59e0b",
        "desc": "Вспомогательный компонент звукового окружения Razer."
    },
    "securityhealth": {
        "title": "Защитник Windows (Security)",
        "rec": "Не рекомендуется",
        "rec_color": "#ef4444",
        "impact": "Низкое влияние",
        "impact_color": "#10b981",
        "desc": "Служба безопасности Microsoft Defender. Обеспечивает защиту системы в реальном времени."
    },
    "discord": {
        "title": "Discord",
        "rec": "Безопасно отключить",
        "rec_color": "#10b981",
        "impact": "Высокое влияние",
        "impact_color": "#ef4444",
        "desc": "Мессенджер Discord. Выгоднее открывать вручную перед игрой, чтобы не замедлять старт Windows."
    },
    "telegram": {
        "title": "Telegram Desktop",
        "rec": "По желанию",
        "rec_color": "#f59e0b",
        "impact": "Среднее влияние",
        "impact_color": "#f59e0b",
        "desc": "Мессенджер Telegram. Отключите, если не требуются мгновенные уведомления сразу после включения ПК."
    },
    "epic": {
        "title": "Epic Games Launcher",
        "rec": "Безопасно отключить",
        "rec_color": "#10b981",
        "impact": "Высокое влияние",
        "impact_color": "#ef4444",
        "desc": "Лаунчер Epic Games. Отключение ускоряет загрузку ОС на несколько секунд."
    }
}


class StartupManager:
    def __init__(self):
        self._ensure_disabled_key()

    def _ensure_disabled_key(self):
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, DISABLED_KEY_HKCU)
            winreg.CloseKey(key)
        except Exception:
            pass

    def _analyze_item(self, name: str, command: str) -> dict:
        """
        Сопоставляет процесс с базой знаний и генерирует экспертный комментарий,
        уровень влияния и вердикт по безопасности отключения.
        """
        combined = f"{name} {command}".lower()

        for key_pattern, data in APP_KNOWLEDGE_BASE.items():
            if key_pattern in combined:
                return {
                    "impact": data["impact"],
                    "impact_color": data["impact_color"],
                    "recommendation": data["rec"],
                    "rec_color": data["rec_color"],
                    "description": data["desc"]
                }

        # Эвристика по умолчанию
        if any(w in combined for w in ["audio", "sound", "driver", "nvidia", "realtek", "intel"]):
            return {
                "impact": "Среднее влияние",
                "impact_color": "#f59e0b",
                "recommendation": "Не рекомендуется",
                "rec_color": "#ef4444",
                "description": "Служба оборудования или звука. Отключать не рекомендуется во избежание сбоев периферии."
            }
        elif any(w in combined for w in ["game", "play", "torrent", "downloader", "update"]):
            return {
                "impact": "Высокое влияние",
                "impact_color": "#ef4444",
                "recommendation": "Безопасно отключить",
                "rec_color": "#10b981",
                "description": "Фоновый клиент или загрузчик. Безопасно убрать из автозапуска для ускорения включения ПК."
            }

        return {
            "impact": "Низкое влияние",
            "impact_color": "#10b981",
            "recommendation": "По желанию",
            "rec_color": "#f59e0b",
            "description": "Пользовательское приложение. Можно отключить, если не требуется постоянная работа в фоне."
        }

    def _is_self_entry(self, name: str, val: str) -> bool:
        n = name.lower()
        c = str(val).lower()
        return ("thecore" in n or "the-core" in n or "theoptimizer" in n or "the-optimizer" in n or "electron" in n or 
                "thecore" in c or "the-core" in c or "theoptimizer" in c or "the-optimizer" in c)

    def get_startup_items(self) -> list:
        items = []

        # 1. HKCU (Активные)
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY_HKCU, 0, winreg.KEY_READ)
            i = 0
            while True:
                try:
                    name, val, _ = winreg.EnumValue(key, i)
                    if self._is_self_entry(name, str(val)):
                        i += 1
                        continue
                    meta = self._analyze_item(name, str(val))
                    items.append({
                        "id": f"HKCU_{name}",
                        "name": name,
                        "command": str(val),
                        "location": "HKCU (Текущий пользователь)",
                        "enabled": True,
                        "impact": meta["impact"],
                        "impact_color": meta["impact_color"],
                        "recommendation": meta["recommendation"],
                        "rec_color": meta["rec_color"],
                        "description": meta["description"],
                        "is_user_level": True
                    })
                    i += 1
                except OSError:
                    break
            winreg.CloseKey(key)
        except Exception:
            pass

        # 2. Отключённые в TheCore
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, DISABLED_KEY_HKCU, 0, winreg.KEY_READ)
            i = 0
            while True:
                try:
                    name, val, _ = winreg.EnumValue(key, i)
                    if self._is_self_entry(name, str(val)):
                        i += 1
                        continue
                    meta = self._analyze_item(name, str(val))
                    items.append({
                        "id": f"DISABLED_{name}",
                        "name": name,
                        "command": str(val),
                        "location": "Отключено в TheCore",
                        "enabled": False,
                        "impact": meta["impact"],
                        "impact_color": meta["impact_color"],
                        "recommendation": meta["recommendation"],
                        "rec_color": meta["rec_color"],
                        "description": meta["description"],
                        "is_user_level": True
                    })
                    i += 1
                except OSError:
                    break
            winreg.CloseKey(key)
        except Exception:
            pass

        # 3. HKLM (Системные)
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, RUN_KEY_HKLM, 0, winreg.KEY_READ)
            i = 0
            while True:
                try:
                    name, val, _ = winreg.EnumValue(key, i)
                    if self._is_self_entry(name, str(val)):
                        i += 1
                        continue
                    meta = self._analyze_item(name, str(val))
                    items.append({
                        "id": f"HKLM_{name}",
                        "name": name,
                        "command": str(val),
                        "location": "HKLM (Системный)",
                        "enabled": True,
                        "impact": meta["impact"],
                        "impact_color": meta["impact_color"],
                        "recommendation": meta["recommendation"],
                        "rec_color": meta["rec_color"],
                        "description": meta["description"],
                        "is_user_level": False
                    })
                    i += 1
                except OSError:
                    break
            winreg.CloseKey(key)
        except Exception:
            pass

        # Сортировка: сначала включённые
        items.sort(key=lambda x: (not x["enabled"], x["recommendation"] != "Рекомендуется отключить", x["name"]))
        return items

    def set_item_state(self, item_name: str, enable: bool) -> bool:
        try:
            if not enable:
                run_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY_HKCU, 0, winreg.KEY_READ)
                val, val_type = winreg.QueryValueEx(run_key, item_name)
                winreg.CloseKey(run_key)

                dis_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, DISABLED_KEY_HKCU, 0, winreg.KEY_SET_VALUE)
                winreg.SetValueEx(dis_key, item_name, 0, val_type, val)
                winreg.CloseKey(dis_key)

                run_write_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY_HKCU, 0, winreg.KEY_SET_VALUE)
                winreg.DeleteValue(run_write_key, item_name)
                winreg.CloseKey(run_write_key)
                return True
            else:
                dis_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, DISABLED_KEY_HKCU, 0, winreg.KEY_READ)
                val, val_type = winreg.QueryValueEx(dis_key, item_name)
                winreg.CloseKey(dis_key)

                run_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY_HKCU, 0, winreg.KEY_SET_VALUE)
                winreg.SetValueEx(run_key, item_name, 0, val_type, val)
                winreg.CloseKey(run_key)

                dis_write_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, DISABLED_KEY_HKCU, 0, winreg.KEY_SET_VALUE)
                winreg.DeleteValue(dis_write_key, item_name)
                winreg.CloseKey(dis_write_key)
                return True
        except Exception:
            return False
