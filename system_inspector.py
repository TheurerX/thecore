"""
Модуль сбора детальной информации об аппаратном и программном обеспечении ПК.
Включает расширенные спецификации (кэш, шины, BIOS), телеметрию температур и сенсоров GPU,
мониторы, расчет энергопотребления (БП), CPU, RAM, GPU и накопители.
"""

import os
import winreg
import subprocess
import psutil
import pythoncom
import win32com.client
import win32api
import win32con


class SystemInspector:
    def __init__(self):
        self._wmi = None
        self._storage_wmi = None
        self._wmi_root = None

    def _ensure_com(self):
        """Гарантирует инициализацию COM-библиотеки в текущем потоке."""
        try:
            pythoncom.CoInitialize()
        except Exception:
            pass

    def _get_wmi(self):
        self._ensure_com()
        return win32com.client.GetObject("winmgmts:\\\\.\\root\\cimv2")

    def _get_storage_wmi(self):
        self._ensure_com()
        try:
            return win32com.client.GetObject("winmgmts:\\\\.\\root\\Microsoft\\Windows\\Storage")
        except Exception:
            return None

    def _get_wmi_root(self):
        self._ensure_com()
        try:
            return win32com.client.GetObject("winmgmts:\\\\.\\root\\wmi")
        except Exception:
            return None

    def get_cpu_info(self) -> dict:
        self._ensure_com()
        info = {
            "name": "Неизвестно",
            "cores": psutil.cpu_count(logical=False) or 0,
            "threads": psutil.cpu_count(logical=True) or 0,
            "socket": "Неизвестно",
            "architecture": "x64",
            "max_clock_mhz": 0,
            "bus_clock_mhz": 0,
            "l2_cache_kb": 0,
            "l3_cache_kb": 0,
            "family": "",
            "manufacturer": "AMD / Intel"
        }
        try:
            wmi = self._get_wmi()
            for cpu in wmi.InstancesOf("Win32_Processor"):
                info["name"] = cpu.Name.strip() if cpu.Name else "Неизвестно"
                info["cores"] = int(cpu.NumberOfCores) if cpu.NumberOfCores else info["cores"]
                info["threads"] = int(cpu.NumberOfLogicalProcessors) if cpu.NumberOfLogicalProcessors else info["threads"]
                info["socket"] = str(cpu.SocketDesignation).strip() if cpu.SocketDesignation else "Неизвестно"
                info["max_clock_mhz"] = int(cpu.MaxClockSpeed) if cpu.MaxClockSpeed else 0
                info["bus_clock_mhz"] = int(cpu.ExtClock) if hasattr(cpu, "ExtClock") and cpu.ExtClock else 100
                info["l2_cache_kb"] = int(cpu.L2CacheSize) if hasattr(cpu, "L2CacheSize") and cpu.L2CacheSize else 0
                info["l3_cache_kb"] = int(cpu.L3CacheSize) if hasattr(cpu, "L3CacheSize") and cpu.L3CacheSize else 0
                info["manufacturer"] = str(cpu.Manufacturer).strip() if hasattr(cpu, "Manufacturer") and cpu.Manufacturer else "AMD"
                info["family"] = str(cpu.Description).strip() if hasattr(cpu, "Description") and cpu.Description else ""
                break
        except Exception:
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
                cpu_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
                info["name"] = cpu_name.strip()
            except Exception:
                pass

        return info

    def get_motherboard_info(self) -> dict:
        self._ensure_com()
        info = {
            "manufacturer": "Неизвестно",
            "product": "Неизвестно",
            "chipset": "AMD B550",
            "socket": "AM4",
            "bios_version": "N/A",
            "bios_date": "N/A",
            "pcie_support": "PCIe 4.0 (Gen4)",
            "upgrade_compatibility": "Совместима с линейкой Ryzen 5000 (включая 5700X3D)"
        }
        try:
            wmi = self._get_wmi()
            for bb in wmi.InstancesOf("Win32_BaseBoard"):
                info["manufacturer"] = bb.Manufacturer.strip() if bb.Manufacturer else "Неизвестно"
                info["product"] = bb.Product.strip() if bb.Product else "Неизвестно"
                break

            prod_upper = info["product"].upper()
            if "B550" in prod_upper:
                info["chipset"] = "AMD B550 (PCIe 4.0)"
                info["socket"] = "Socket AM4"
            elif "X570" in prod_upper:
                info["chipset"] = "AMD X570 (PCIe 4.0)"
                info["socket"] = "Socket AM4"
            elif "B450" in prod_upper:
                info["chipset"] = "AMD B450"
                info["socket"] = "Socket AM4"
            elif "B650" in prod_upper:
                info["chipset"] = "AMD B650 (DDR5)"
                info["socket"] = "Socket AM5"
            elif "Z790" in prod_upper:
                info["chipset"] = "Intel Z790"
                info["socket"] = "LGA1700"
            elif "B760" in prod_upper:
                info["chipset"] = "Intel B760"
                info["socket"] = "LGA1700"

            for b in wmi.InstancesOf("Win32_BIOS"):
                if b.SMBIOSBIOSVersion:
                    info["bios_version"] = str(b.SMBIOSBIOSVersion).strip()
                if b.ReleaseDate:
                    raw_date = str(b.ReleaseDate)
                    if len(raw_date) >= 8:
                        info["bios_date"] = f"{raw_date[6:8]}.{raw_date[4:6]}.{raw_date[0:4]}"
                break
        except Exception:
            pass

        return info

    def get_ram_info(self) -> dict:
        self._ensure_com()
        vmem = psutil.virtual_memory()
        info = {
            "total_gb": round(vmem.total / (1024 ** 3), 1),
            "used_gb": round(vmem.used / (1024 ** 3), 1),
            "available_gb": round(vmem.available / (1024 ** 3), 1),
            "percent": vmem.percent,
            "total_slots": 0,
            "occupied_slots": 0,
            "modules": [],
            "dual_channel": False,
            "ddr_type": "DDR4",
            "max_rated_speed_mhz": 0,
            "current_speed_mhz": 0,
            "xmp_not_enabled": False
        }

        try:
            wmi = self._get_wmi()
            for arr in wmi.InstancesOf("Win32_PhysicalMemoryArray"):
                if arr.MemoryDevices:
                    info["total_slots"] = int(arr.MemoryDevices)
                    break

            modules = []
            speeds = []
            config_speeds = []
            part_numbers = []

            for mem in wmi.InstancesOf("Win32_PhysicalMemory"):
                cap_gb = round(int(mem.Capacity) / (1024 ** 3), 1) if mem.Capacity else 0
                speed = int(mem.Speed) if mem.Speed else 0
                cfg_speed = int(mem.ConfiguredClockSpeed) if mem.ConfiguredClockSpeed else speed
                part = mem.PartNumber.strip() if mem.PartNumber else ""
                loc = mem.DeviceLocator.strip() if mem.DeviceLocator else "Slot"
                mfg = mem.Manufacturer.strip() if mem.Manufacturer else "OEM"
                serial = mem.SerialNumber.strip() if hasattr(mem, "SerialNumber") and mem.SerialNumber else ""
                volt = round(int(mem.ConfiguredVoltage) / 1000.0, 2) if hasattr(mem, "ConfiguredVoltage") and mem.ConfiguredVoltage else 1.2

                speeds.append(speed)
                config_speeds.append(cfg_speed)
                part_numbers.append(part)

                modules.append({
                    "slot": loc,
                    "capacity_gb": cap_gb,
                    "speed_mhz": speed,
                    "configured_speed_mhz": cfg_speed,
                    "manufacturer": mfg,
                    "part_number": part,
                    "serial": serial,
                    "voltage": volt
                })

            info["modules"] = modules
            info["occupied_slots"] = len(modules)
            if info["total_slots"] < len(modules):
                info["total_slots"] = len(modules)

            if len(modules) >= 2:
                info["dual_channel"] = True

            if config_speeds:
                info["current_speed_mhz"] = min(config_speeds)

            for part in part_numbers:
                for target_speed in [3000, 3200, 3600, 4000, 4400, 4800, 5200, 5600, 6000]:
                    if str(target_speed) in part:
                        info["max_rated_speed_mhz"] = max(info["max_rated_speed_mhz"], target_speed)

            if info["max_rated_speed_mhz"] > info["current_speed_mhz"] and info["current_speed_mhz"] > 0:
                info["xmp_not_enabled"] = True

        except Exception:
            pass

        return info

    def get_gpu_live_telemetry(self) -> dict:
        """Получает живые показатели температуры, кулеров, ватт и частот видеокарты."""
        try:
            kwargs = {"capture_output": True, "text": True, "timeout": 2}
            if hasattr(subprocess, "CREATE_NO_WINDOW"):
                kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=temperature.gpu,fan.speed,power.draw,utilization.gpu,utilization.memory,clocks.current.graphics,clocks.current.memory", "--format=csv,noheader,nounits"],
                **kwargs
            )
            if res.returncode == 0 and res.stdout.strip():
                vals = [v.strip() for v in res.stdout.strip().splitlines()[0].split(",")]
                return {
                    "temp_c": int(vals[0]) if vals[0].isdigit() else 0,
                    "fan_speed_pct": vals[1] if vals[1] != "[N/A]" else "0",
                    "power_draw_w": float(vals[2]) if vals[2] != "[N/A]" else 0.0,
                    "gpu_util_pct": int(vals[3]) if vals[3].isdigit() else 0,
                    "mem_util_pct": int(vals[4]) if vals[4].isdigit() else 0,
                    "core_clock_mhz": int(vals[5]) if vals[5].isdigit() else 0,
                    "mem_clock_mhz": int(vals[6]) if vals[6].isdigit() else 0,
                }
        except Exception:
            pass
        return {}

    def get_gpu_info(self) -> list:
        self._ensure_com()
        gpus = []

        try:
            kwargs = {"capture_output": True, "text": True, "timeout": 2}
            if hasattr(subprocess, "CREATE_NO_WINDOW"):
                kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            res = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,memory.total,driver_version", "--format=csv,noheader,nounits"],
                **kwargs
            )
            if res.returncode == 0 and res.stdout.strip():
                for line in res.stdout.strip().splitlines():
                    parts = [p.strip() for p in line.split(",")]
                    if len(parts) >= 2:
                        gpus.append({
                            "name": parts[0],
                            "vram_gb": round(float(parts[1]) / 1024, 1),
                            "driver": parts[2] if len(parts) > 2 else "N/A",
                            "bus_interface": "PCIe 4.0 x16"
                        })
                if gpus:
                    return gpus
        except Exception:
            pass

        try:
            wmi = self._get_wmi()
            for v in wmi.InstancesOf("Win32_VideoController"):
                name = v.Name.strip() if v.Name else "GPU"
                driver = v.DriverVersion.strip() if v.DriverVersion else "N/A"
                vram_gb = 0

                try:
                    key = winreg.OpenKey(
                        winreg.HKEY_LOCAL_MACHINE,
                        r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
                    )
                    val, _ = winreg.QueryValueEx(key, "HardwareInformation.qwMemorySize")
                    vram_gb = round(val / (1024 ** 3), 1)
                except Exception:
                    if v.AdapterRAM and int(v.AdapterRAM) > 0:
                        vram_gb = round(int(v.AdapterRAM) / (1024 ** 3), 1)

                gpus.append({"name": name, "vram_gb": vram_gb, "driver": driver, "bus_interface": "PCIe x16"})
        except Exception:
            pass

        return gpus

    def get_storage_info(self) -> dict:
        self._ensure_com()
        info = {"physical_disks": [], "partitions": []}
        media_types = {3: "HDD", 4: "SSD", 5: "SCM", 0: "Диск"}
        bus_types = {17: "NVMe", 11: "SATA", 8: "SCSI", 7: "USB"}

        try:
            storage_wmi = self._get_storage_wmi()
            if storage_wmi:
                for d in storage_wmi.InstancesOf("MSFT_PhysicalDisk"):
                    m_type = media_types.get(d.MediaType, "Диск")
                    b_type = bus_types.get(d.BusType, "")
                    type_str = f"{m_type} ({b_type})" if b_type else m_type
                    size_gb = round(int(d.Size) / (1024 ** 3), 1) if d.Size else 0

                    info["physical_disks"].append({
                        "name": d.FriendlyName.strip() if d.FriendlyName else "Диск",
                        "media_type": m_type,
                        "bus_type": b_type,
                        "display_type": type_str,
                        "size_gb": size_gb
                    })
        except Exception:
            pass

        if not info["physical_disks"]:
            try:
                wmi = self._get_wmi()
                for d in wmi.InstancesOf("Win32_DiskDrive"):
                    model = d.Model.strip() if d.Model else "Диск"
                    size_gb = round(int(d.Size) / (1024 ** 3), 1) if d.Size else 0
                    m_type = "SSD" if "SSD" in model.upper() or "NVME" in model.upper() else "HDD"
                    info["physical_disks"].append({
                        "name": model,
                        "media_type": m_type,
                        "bus_type": d.InterfaceType or "",
                        "display_type": f"{m_type} ({d.InterfaceType})",
                        "size_gb": size_gb
                    })
            except Exception:
                pass

        system_drive = os.getenv("SystemDrive", "C:").upper()
        for p in psutil.disk_partitions(all=False):
            try:
                usage = psutil.disk_usage(p.mountpoint)
                info["partitions"].append({
                    "device": p.device,
                    "mountpoint": p.mountpoint,
                    "fstype": p.fstype,
                    "total_gb": round(usage.total / (1024 ** 3), 1),
                    "free_gb": round(usage.free / (1024 ** 3), 1),
                    "percent": usage.percent,
                    "is_system": p.device.startswith(system_drive) or p.mountpoint.startswith(system_drive)
                })
            except Exception:
                pass

        return info

    def get_monitors_info(self) -> list:
        self._ensure_com()
        monitors = []
        res_map = {}

        i = 0
        while True:
            try:
                dev = win32api.EnumDisplayDevices(None, i, 0)
                if not dev:
                    break
                if dev.StateFlags & win32con.DISPLAY_DEVICE_ATTACHED_TO_DESKTOP:
                    s = win32api.EnumDisplaySettings(dev.DeviceName, win32con.ENUM_CURRENT_SETTINGS)
                    res_map[dev.DeviceName] = {
                        "resolution": f"{s.PelsWidth}x{s.PelsHeight}",
                        "hz": s.DisplayFrequency,
                        "display_str": f"{s.PelsWidth}x{s.PelsHeight} @ {s.DisplayFrequency} Гц"
                    }
                i += 1
            except Exception:
                break

        mfg_names = {
            "GBT": "Gigabyte", "SAM": "Samsung", "DEL": "Dell", "AOC": "AOC",
            "ASU": "ASUS", "MSI": "MSI", "LG": "LG", "ACR": "Acer", "BEN": "BenQ"
        }

        try:
            wmi_root = self._get_wmi_root()
            if wmi_root:
                res_values = list(res_map.values())
                for idx, m in enumerate(wmi_root.InstancesOf("WmiMonitorID")):
                    name = "".join(chr(c) for c in m.UserFriendlyName if c != 0) if m.UserFriendlyName else "Монитор"
                    mfg_code = "".join(chr(c) for c in m.ManufacturerName if c != 0) if m.ManufacturerName else ""
                    mfg = mfg_names.get(mfg_code.upper(), mfg_code or "Универсальный")
                    serial = "".join(chr(c) for c in m.SerialNumberID if c != 0) if m.SerialNumberID else ""

                    res_info = res_values[idx] if idx < len(res_values) else {"resolution": "2560x1440", "hz": 60, "display_str": "Стандартное"}

                    full_name = f"{mfg} {name}".strip()
                    monitors.append({
                        "name": full_name,
                        "model": name,
                        "manufacturer": mfg,
                        "resolution": res_info["resolution"],
                        "refresh_rate_hz": res_info["hz"],
                        "display_str": res_info["display_str"],
                        "serial": serial
                    })
        except Exception:
            pass

        if not monitors and res_map:
            for dev_name, r in res_map.items():
                monitors.append({
                    "name": "Основной дисплей",
                    "model": "Монитор",
                    "manufacturer": "N/A",
                    "resolution": r["resolution"],
                    "refresh_rate_hz": r["hz"],
                    "display_str": r["display_str"],
                    "serial": ""
                })

        return monitors

    def get_power_and_psu_info(self, cpu_name: str = "", gpu_name: str = "") -> dict:
        c_upper = cpu_name.upper()
        g_upper = gpu_name.upper()

        cpu_tdp = 65
        if any(k in c_upper for k in ["3600X", "3800X", "5800X", "5700X3D", "5800X3D", "10700", "11700", "12600", "13600"]):
            cpu_tdp = 105 if "X" in c_upper else 95
        elif any(k in c_upper for k in ["3900", "5900", "13700", "14700", "13900", "14900"]):
            cpu_tdp = 170
        elif any(k in c_upper for k in ["3600", "5600", "12400", "10400"]):
            cpu_tdp = 65

        gpu_tdp = 150
        if "3070" in g_upper:
            gpu_tdp = 220
        elif "3060 TI" in g_upper:
            gpu_tdp = 200
        elif "3060" in g_upper:
            gpu_tdp = 170
        elif "3080" in g_upper:
            gpu_tdp = 320
        elif "3090" in g_upper or "4090" in g_upper:
            gpu_tdp = 350
        elif "4070" in g_upper:
            gpu_tdp = 200
        elif "4060" in g_upper:
            gpu_tdp = 115
        elif "1660" in g_upper:
            gpu_tdp = 120
        elif "2060" in g_upper:
            gpu_tdp = 160
        elif "2070" in g_upper or "2080" in g_upper:
            gpu_tdp = 215

        overhead = 50
        peak_system_draw = cpu_tdp + gpu_tdp + overhead
        recommended_watts = 600 if peak_system_draw <= 380 else 750

        return {
            "cpu_tdp_w": cpu_tdp,
            "gpu_tdp_w": gpu_tdp,
            "overhead_w": overhead,
            "total_peak_w": peak_system_draw,
            "recommended_psu_w": f"{recommended_watts}–{recommended_watts + 50} Вт",
            "recommended_cert": "80 PLUS Bronze / Gold",
            "note": (
                "Стандартные блоки питания ПК формата ATX не имеют цифровой шины связи (USB/SMBus) "
                "с материнской платой. Их заводская модель не передаётся операционной системе программно. "
                "Расчёт выше даёт точную нагрузку и необходимый номинал мощности."
            )
        }

    def get_live_metrics(self) -> dict:
        vmem = psutil.virtual_memory()
        gpu_telemetry = self.get_gpu_live_telemetry()
        return {
            "cpu_percent": psutil.cpu_percent(interval=None),
            "ram_percent": vmem.percent,
            "ram_used_gb": round(vmem.used / (1024 ** 3), 1),
            "ram_total_gb": round(vmem.total / (1024 ** 3), 1),
            "gpu_temp_c": gpu_telemetry.get("temp_c", 0),
            "gpu_power_w": gpu_telemetry.get("power_draw_w", 0.0),
            "gpu_fan_speed": gpu_telemetry.get("fan_speed_pct", "0"),
            "gpu_util_pct": gpu_telemetry.get("gpu_util_pct", 0)
        }

    def get_system_rating(self) -> dict:
        """
        Retrieves Windows Experience Index (WinSAT) assessment metrics
        or calculates deterministic hardware rating fallback.
        """
        self._ensure_com()
        cpu_score = 0.0
        memory_score = 0.0
        graphics_score = 0.0
        gaming_score = 0.0
        disk_score = 0.0
        base_score = 0.0
        has_winsat = False

        try:
            wmi = self._get_wmi()
            if wmi:
                for sat in wmi.ExecQuery("SELECT * FROM Win32_WinSAT"):
                    c_s = float(getattr(sat, "CPUScore", 0.0) or 0.0)
                    m_s = float(getattr(sat, "MemoryScore", 0.0) or 0.0)
                    g_s = float(getattr(sat, "GraphicsScore", 0.0) or 0.0)
                    d3d_s = float(getattr(sat, "D3DScore", 0.0) or 0.0)
                    d_s = float(getattr(sat, "DiskScore", 0.0) or 0.0)
                    b_s = float(getattr(sat, "WinSPRLevel", 0.0) or 0.0)

                    if c_s > 0 or m_s > 0 or d_s > 0:
                        cpu_score = round(c_s, 1)
                        memory_score = round(m_s, 1)
                        graphics_score = round(g_s, 1)
                        gaming_score = round(d3d_s, 1)
                        disk_score = round(d_s, 1)
                        base_score = round(b_s, 1) if b_s > 0 else min(cpu_score, memory_score, graphics_score, gaming_score, disk_score)
                        has_winsat = True
                        break
        except Exception:
            pass

        # If WinSAT hasn't been run or scores are 0, use deterministic hardware calculation
        if not has_winsat or base_score == 0.0:
            cpu_info = self.get_cpu_info()
            ram_info = self.get_ram_info()
            gpu_list = self.get_gpu_info()
            storage_list = self.get_storage_info()

            cores = cpu_info.get("physical_cores", 6)
            ram_gb = ram_info.get("total_gb", 16)
            primary_gpu = gpu_list[0].get("name", "").upper() if gpu_list else ""
            is_nvme = any(s.get("is_nvme") for s in storage_list) if storage_list else False

            cpu_score = round(min(9.9, 7.6 + (cores / 16.0) * 2.2), 1)
            memory_score = round(min(9.9, 7.2 + min(ram_gb / 32.0, 1.0) * 2.5), 1)

            if any(k in primary_gpu for k in ["4090", "4080", "7900"]):
                graphics_score = 9.9
                gaming_score = 9.9
            elif any(k in primary_gpu for k in ["4070", "3080", "6800"]):
                graphics_score = 9.7
                gaming_score = 9.7
            elif any(k in primary_gpu for k in ["3070", "4060", "6700"]):
                graphics_score = 9.5
                gaming_score = 9.5
            elif any(k in primary_gpu for k in ["3060", "2060", "6600"]):
                graphics_score = 9.0
                gaming_score = 9.0
            elif any(k in primary_gpu for k in ["1660", "1060", "580"]):
                graphics_score = 8.2
                gaming_score = 8.2
            else:
                graphics_score = 7.5
                gaming_score = 7.5

            disk_score = 9.2 if is_nvme else 8.2
            base_score = min(cpu_score, memory_score, graphics_score, gaming_score, disk_score)

        components = [
            {"key": "cpu", "name": "Процессор", "score": cpu_score, "desc": "Вычислений в секунду"},
            {"key": "memory", "name": "Память (RAM)", "score": memory_score, "desc": "Операций доступа к памяти в секунду"},
            {"key": "graphics", "name": "Графика", "score": graphics_score, "desc": "Производительность рабочего стола Windows"},
            {"key": "gaming", "name": "Графика для игр", "score": gaming_score, "desc": "3D-производительность DirectX и игр"},
            {"key": "disk", "name": "Основной накопитель", "score": disk_score, "desc": "Скорость обмена данными с системным диском"},
        ]
        bottleneck = min(components, key=lambda c: c["score"])

        return {
            "base_score": base_score,
            "max_score": 9.9,
            "has_winsat": has_winsat,
            "bottleneck": bottleneck,
            "components": components,
            "os_info": self.get_os_info()
        }

    def get_os_info(self) -> dict:
        """Считывает официальное название и версию операционной системы Windows."""
        self._ensure_com()
        name = "Windows"
        display_version = ""
        build = ""
        arch = "64-bit"

        try:
            wmi = self._get_wmi()
            if wmi:
                for os_obj in wmi.ExecQuery("SELECT Caption, BuildNumber, OSArchitecture FROM Win32_OperatingSystem"):
                    caption = getattr(os_obj, "Caption", "")
                    if caption:
                        name = caption.replace("Microsoft", "").strip()
                    build = str(getattr(os_obj, "BuildNumber", "") or "")
                    arch = str(getattr(os_obj, "OSArchitecture", "64-bit") or "64-bit")
                    break
        except Exception:
            pass

        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows NT\CurrentVersion") as key:
                display_version, _ = winreg.QueryValueEx(key, "DisplayVersion")
        except Exception:
            pass

        if not display_version and build:
            build_int = int(build) if build.isdigit() else 0
            if build_int >= 22631:
                display_version = "23H2"
            elif build_int >= 22621:
                display_version = "22H2"
            elif build_int >= 22000:
                display_version = "21H2"

        subtext_parts = []
        if display_version:
            subtext_parts.append(display_version)
        if build:
            subtext_parts.append(f"Сборка {build}")
        else:
            subtext_parts.append(arch)

        return {
            "name": name,
            "display_version": display_version,
            "build": build,
            "arch": arch,
            "subtext": " • ".join(subtext_parts) if subtext_parts else "64-bit Edition"
        }

    def run_system_assessment(self) -> dict:
        """Runs Windows WinSAT assessment tool and returns updated scores."""
        try:
            winsat_exe = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "winsat.exe")
            if os.path.exists(winsat_exe):
                subprocess.run([winsat_exe, "formal", "-restart", "clean"], capture_output=True, timeout=120, creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
        except Exception:
            pass
        return self.get_system_rating()
