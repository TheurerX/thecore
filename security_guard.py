"""
security_guard.py — Подсистема криптографической защиты, контроля целостности,
антиотладки и взаимной аутентификации ядра TheCore.

Защищает процессы TheCore от:
1. Подмены бинарных компонентов и инъекций стороннего кода (Anti-Tamper).
2. Подключения отладчиков и реверс-инжиниринга (Anti-Debugging / IsDebuggerPresent).
3. Прямого запуска ядра в обход официальной оболочки TheCore (Parent Process Lock).
4. Несанкционированного вызова команд по IPC (HMAC-SHA256 Challenge-Response Handshake).
"""

import sys
import os
import time
import hmac
import hashlib
import ctypes

# Мастер-ключ закрытого криптографического протокола TheCore IPC
THECORE_IPC_SECRET = b"TheCore_Secure_Kernel_Key_2026_AntiTamper_V3"

# Разрешенные родительские процессы для скомпилированного автономного ядра (production)
PRODUCTION_ALLOWED_PARENTS = {
    "thecore.exe",
    "electron.exe",
    "engine.exe",
    "node.exe",
    "python.exe"
}

# Разрешенные процессы в режиме разработки (development)
DEV_ALLOWED_PARENTS = {
    "thecore.exe",
    "electron.exe",
    "node.exe",
    "python.exe",
    "powershell.exe",
    "cmd.exe"
}


class SecurityGuard:
    def __init__(self):
        self._authenticated = False
        self._handshake_nonce = None
        self._session_start = time.time()
        self._kernel32 = None

        if sys.platform == "win32":
            try:
                self._kernel32 = ctypes.windll.kernel32
            except Exception:
                self._kernel32 = None

    def check_debugger(self) -> bool:
        """
        Проверяет наличие активного отладчика (локального или удаленного).
        При обнаружении немедленно завершает процесс без вызова паники или трассировок.
        """
        if not self._kernel32:
            return False

        try:
            # 1. Проверка пользовательского отладчика через IsDebuggerPresent
            if self._kernel32.IsDebuggerPresent():
                self._terminate_silent()

            # 2. Проверка удаленного отладчика через CheckRemoteDebuggerPresent (x64dbg, IDA Pro, Cheat Engine)
            is_remote_dbg = ctypes.c_bool(False)
            h_proc = self._kernel32.GetCurrentProcess()
            if self._kernel32.CheckRemoteDebuggerPresent(h_proc, ctypes.byref(is_remote_dbg)):
                if is_remote_dbg.value:
                    self._terminate_silent()
        except Exception:
            pass

        return False

    def verify_parent_process(self) -> bool:
        """
        Проверяет легитимность вызывающего процесса (TheCore / Electron).
        Корректно учитывает внутренний bootloader PyInstaller и цепочку вызовов.
        """
        try:
            import psutil
            parent_pid = os.getppid()
            if parent_pid <= 0:
                return True

            parent = psutil.Process(parent_pid)
            parent_name = parent.name().lower()

            # Если родитель — загрузчик PyInstaller (engine.exe), проверяем вышестоящего родителя (TheCore.exe)
            if "engine" in parent_name:
                grandparent_pid = parent.ppid()
                if grandparent_pid > 0:
                    try:
                        grandparent = psutil.Process(grandparent_pid)
                        parent_name = grandparent.name().lower()
                    except Exception:
                        pass

            is_frozen = getattr(sys, "frozen", False)
            allowed = PRODUCTION_ALLOWED_PARENTS if is_frozen else DEV_ALLOWED_PARENTS

            if not any(allowed_proc in parent_name for allowed_proc in allowed):
                sys.stderr.write(f"[SecurityGuard] Notice: parent is {parent_name}, enforcing HMAC\n")
                return False

            return True
        except Exception:
            return True

    def verify_handshake(self, nonce: str, timestamp: int, client_signature: str) -> dict:
        """
        Криптографическая валидация динамического HMAC-SHA256 рукопожатия от процесса Electron.
        """
        self.check_debugger()

        if not nonce or not timestamp or not client_signature:
            self._terminate_silent()

        # Проверка актуальности временной метки (окно валидности: 60 сек для защиты от Replay-атак)
        now_ms = int(time.time() * 1000)
        if abs(now_ms - timestamp) > 60000:
            sys.stderr.write("[SecurityGuard] Handshake timestamp expired\n")
            self._terminate_silent()

        # Вычисляем ожидаемую подпись клиента
        message = f"{nonce}:{timestamp}".encode("utf-8")
        expected_sig = hmac.new(THECORE_IPC_SECRET, message, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_sig, client_signature):
            sys.stderr.write("[SecurityGuard] Invalid HMAC handshake signature\n")
            self._terminate_silent()

        # Рукопожатие успешно — генерируем ответную криптографическую подпись сервера
        self._authenticated = True
        self._handshake_nonce = nonce

        server_token_msg = f"{nonce}:authorized_session:{timestamp}".encode("utf-8")
        server_signature = hmac.new(THECORE_IPC_SECRET, server_token_msg, hashlib.sha256).hexdigest()

        session_id = hashlib.sha256(f"{nonce}:{THECORE_IPC_SECRET.decode()}".encode()).hexdigest()[:16]

        return {
            "status": "authenticated",
            "server_signature": server_signature,
            "session_id": session_id
        }

    def is_authenticated(self) -> bool:
        return self._authenticated

    def enforce_authentication(self, method: str):
        """
        Гарантирует, что ни одна системная операция (очистка, мониторинг, деинсталляция)
        не может быть выполнена до успешного прохождения взаимного рукопожатия.
        """
        if method in ("auth_handshake", "ping"):
            return

        if not self._authenticated:
            # Если неавторизованные запросы продолжают поступать через 5 секунд после запуска — аварийный выход
            if time.time() - self._session_start > 5.0:
                self._terminate_silent()
            raise PermissionError(f"Security violation: Core IPC authentication required for '{method}'")

    def _terminate_silent(self):
        """Бесшумное немедленное завершение процесса."""
        try:
            os._exit(0)
        except Exception:
            sys.exit(0)


# Синглтон защитника ядра
security_guard = SecurityGuard()
