"""
engine.py — Высокопроизводительный Python Core Sidecar для TheCore Electron Shell.
Обеспечивает межпроцессное взаимодействие (IPC) по стандартному потоку stdin/stdout
с использованием протокола Line-Delimited JSON-RPC.
"""

import sys
import os
import json
import traceback
import pythoncom

# Настройка UTF-8 ввода/вывода с принудительной построчной буферизацией
if hasattr(sys.stdin, "reconfigure"):
    sys.stdin.reconfigure(encoding="utf-8")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)

from system_inspector import SystemInspector
from optimizer import SystemOptimizer
from startup_manager import StartupManager
from upgrade_advisor import UpgradeAdvisor
from uninstaller_manager import UninstallerManager
from security_guard import security_guard


class EngineServer:
    def __init__(self):
        # Инициализация защитных механизмов: антиотладка и проверка легитимности вызывающего процесса
        security_guard.check_debugger()
        security_guard.verify_parent_process()

        try:
            pythoncom.CoInitialize()
        except Exception:
            pass

        self.inspector = SystemInspector()
        self.optimizer = SystemOptimizer()
        self.startup_mgr = StartupManager()
        self.advisor = UpgradeAdvisor(self.inspector)
        self.cached_hardware = None

    def send_event(self, event_name: str, data: dict):
        """Отправляет асинхронное событие в Electron Shell."""
        payload = {
            "type": "event",
            "event": event_name,
            "data": data
        }
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    def send_response(self, req_id, result=None, error=None):
        """Отправляет ответ на RPC-запрос."""
        payload = {
            "type": "response",
            "id": req_id,
            "result": result,
            "error": error
        }
        sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
        sys.stdout.flush()

    def handle_get_hardware(self, req_id, params):
        if not self.cached_hardware:
            try:
                pythoncom.CoInitialize()
            except Exception:
                pass
            cpu = self.inspector.get_cpu_info()
            mobo = self.inspector.get_motherboard_info()
            ram = self.inspector.get_ram_info()
            gpu = self.inspector.get_gpu_info()
            storage = self.inspector.get_storage_info()
            displays = self.inspector.get_monitors_info()
            primary_gpu_name = gpu[0].get("name", "") if gpu and isinstance(gpu, list) and len(gpu) > 0 else ""
            psu = self.inspector.get_power_and_psu_info(cpu.get("name", ""), primary_gpu_name)

            self.cached_hardware = {
                "cpu": cpu,
                "motherboard": mobo,
                "ram": ram,
                "gpu": gpu,
                "storage": storage,
                "displays": displays,
                "psu": psu
            }

        self.send_response(req_id, result=self.cached_hardware)

    def handle_get_live_metrics(self, req_id, params):
        security_guard.check_debugger()
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass
        metrics = self.inspector.get_live_metrics()
        self.send_response(req_id, result=metrics)

    def handle_run_optimization(self, req_id, params):
        def progress_cb(step_idx: int, title: str, progress: float):
            self.send_event("optimization_progress", {
                "step": step_idx,
                "title": title,
                "progress": progress
            })

        try:
            res = self.optimizer.run_auto_optimization(step_callback=progress_cb)
            self.send_response(req_id, result=res)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_get_optimization_analysis(self, req_id, params):
        try:
            analysis = self.optimizer.analyze_optimization_potential()
            self.send_response(req_id, result=analysis)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_get_startup_items(self, req_id, params):
        try:
            items = self.startup_mgr.get_startup_items()
            self.send_response(req_id, result=items)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_toggle_startup_item(self, req_id, params):
        name = params.get("name")
        enable = params.get("enable")
        try:
            success = self.startup_mgr.set_item_state(name, enable)
            self.send_response(req_id, result={"success": success, "name": name, "enabled": enable})
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_get_upgrade_recommendations(self, req_id, params):
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass
        try:
            recs = self.advisor.generate_recommendations()
            self.send_response(req_id, result=recs)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_get_installed_apps(self, req_id, params):
        try:
            apps = UninstallerManager.get_installed_applications()
            self.send_response(req_id, result=apps)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_scan_app_residuals(self, req_id, params):
        app = params.get("app", {})
        try:
            res = UninstallerManager.scan_residuals(app)
            self.send_response(req_id, result=res)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_delete_residuals(self, req_id, params):
        items = params.get("items", [])
        try:
            res = UninstallerManager.delete_residuals(items)
            self.send_response(req_id, result=res)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_run_standard_uninstall(self, req_id, params):
        app = params.get("app", {})
        try:
            res = UninstallerManager.run_standard_uninstall(app)
            self.send_response(req_id, result=res)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_force_remove_app(self, req_id, params):
        app = params.get("app", {})
        try:
            res = UninstallerManager.force_remove_app(app)
            self.send_response(req_id, result=res)
        except Exception as e:
            self.send_response(req_id, error=str(e))

    def handle_get_system_rating(self, req_id, params):
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass
        rating = self.inspector.get_system_rating()
        self.send_response(req_id, result=rating)

    def handle_run_system_assessment(self, req_id, params):
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass
        rating = self.inspector.run_system_assessment()
        self.send_response(req_id, result=rating)

    def handle_auth_handshake(self, req_id, params):
        res = security_guard.verify_handshake(
            nonce=params.get("nonce", ""),
            timestamp=params.get("timestamp", 0),
            client_signature=params.get("client_signature", "")
        )
        self.send_response(req_id, result=res)

    def handle_ping(self, req_id, params):
        self.send_response(req_id, result="pong")

    def run(self):
        # Сообщаем оболочке Electron, что ядро успешно запущено
        self.send_event("ready", {"version": "3.3.0", "pid": os.getpid()})

        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue

            req_id = None
            try:
                msg = json.loads(line)
                req_id = msg.get("id")
                method = msg.get("method")
                params = msg.get("params", {})

                if method == "auth_handshake":
                    self.handle_auth_handshake(req_id, params)
                    continue

                # Принудительная проверка авторизации: команды не выполняются без валидного HMAC-рукопожатия
                security_guard.enforce_authentication(method)

                # Проверка отсутствия отладчиков
                security_guard.check_debugger()

                if method == "ping":
                    self.handle_ping(req_id, params)
                elif method == "get_hardware":
                    self.handle_get_hardware(req_id, params)
                elif method == "get_live_metrics":
                    self.handle_get_live_metrics(req_id, params)
                elif method == "get_system_rating":
                    self.handle_get_system_rating(req_id, params)
                elif method == "run_system_assessment":
                    self.handle_run_system_assessment(req_id, params)
                elif method == "run_optimization":
                    self.handle_run_optimization(req_id, params)
                elif method == "get_optimization_analysis":
                    self.handle_get_optimization_analysis(req_id, params)
                elif method == "get_startup_items":
                    self.handle_get_startup_items(req_id, params)
                elif method == "toggle_startup_item":
                    self.handle_toggle_startup_item(req_id, params)
                elif method == "get_upgrade_recommendations":
                    self.handle_get_upgrade_recommendations(req_id, params)
                elif method == "get_installed_apps":
                    self.handle_get_installed_apps(req_id, params)
                elif method == "scan_app_residuals":
                    self.handle_scan_app_residuals(req_id, params)
                elif method == "delete_residuals":
                    self.handle_delete_residuals(req_id, params)
                elif method == "run_standard_uninstall":
                    self.handle_run_standard_uninstall(req_id, params)
                elif method == "force_remove_app":
                    self.handle_force_remove_app(req_id, params)
                else:
                    self.send_response(req_id, error=f"Unknown method: {method}")

            except json.JSONDecodeError as jde:
                sys.stderr.write(f"[Engine] JSON decode error: {jde}\n")
            except Exception as ex:
                err_trace = traceback.format_exc()
                sys.stderr.write(f"[Engine] Unhandled error: {err_trace}\n")
                if req_id is not None:
                    self.send_response(req_id, error=str(ex))


if __name__ == "__main__":
    server = EngineServer()
    server.run()
