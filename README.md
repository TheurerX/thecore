<p align="center">
  <img src="assets/branding/logo_master.svg" width="128" height="128" alt="TheCore Silicon Logo">
</p>

<h1 align="center">TheCore</h1>

<p align="center">
  <strong>System monitor and cleaner for Windows.</strong>
</p>

<p align="center">
  <a href="https://github.com/TheurerX/thecore/releases"><img src="https://img.shields.io/github/v/release/TheurerX/thecore?color=00D26A&label=Release&style=flat-square" alt="Release"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/Framework-Electron%2034-47848F?style=flat-square" alt="Electron">
  <img src="https://img.shields.io/badge/Engine-Python%203.12-3776AB?style=flat-square" alt="Python">
  <img src="https://img.shields.io/badge/Telemetry-Zero%20%2F%20Offline--First-00D26A?style=flat-square" alt="Zero Telemetry">
  <img src="https://img.shields.io/badge/License-Freeware-blueviolet?style=flat-square" alt="License">
</p>

<p align="center">
  <b>English</b> • <a href="README_RU.md"><b>Русский</b></a>
</p>

---

## Overview

**TheCore** is a lightweight, offline-first system monitor and cleaner for Windows.

Engineered with a modern seamless dark UI (`border: none`) and a high-performance Python 3.12 hardware kernel.

---

## Key Modules

### Real-Time Hardware Telemetry
* **Central Processing Unit (CPU):** Live core load, architecture model, hardware socket detection, and real-time power metrics.
* **Graphics Processing Unit (GPU):** Direct integration with NVIDIA NVML (`pynvml`) and WMI. Reads GPU temperatures, clock speeds, fan utilization, and real-time wattage.
* **Memory & Storage:** RAM clock vs. SPD factory XMP profile analysis, NVMe and SATA drive health, space allocation, and temperature telemetry.
* **Power Supply Unit (PSU) Estimator:** Live calculation of system wattage with transient spike headroom (CPU TDP + GPU TDP + 60W motherboard/peripherals + 45% dynamic buffer).
* **Windows Experience Index (WEI):** Authentic recreation of the 1.0–9.9 hardware performance scale with five independent component scores (CPU, RAM, 2D Graphics, 3D Gaming, Primary Storage) and bottleneck identification.

### System Optimization
* **Live Pre-Optimization Audit:** Instant, non-destructive assessment of purgeable RAM standby caches, `%TEMP%` file count, accumulated GPU shader caches, and active background clients.
* **RAM Working Set Flush (`EmptyWorkingSet`):** Native Win32 API (`psapi.dll`) call releasing unreferenced reserved pages without killing active application contexts.
* **Shader Cache Cleanup:** Safe deletion of stale GPU shader cache directories (DirectX DXCache, Vulkan GLCache, NVIDIA `NV_Cache`, AMD Shader Cache) with lock detection.
* **Background Client Management:** Safe termination of background launchers (Steam, Epic Games, Battle.net, Discord, Telegram, torrent clients) while protecting system processes via a whitelist.

### Windows Startup Manager
* Comprehensive registry scanning (`HKCU`, `HKLM`, `shell:startup`, and `StartupApproved\Run`).
* Filters out phantom or disabled entries, presenting only genuinely active background items with evaluated startup impact ratings.
* Native system tray integration with dedicated toggle control for silent Windows boot (`--hidden`).

### Upgrade Advisor
* Deterministic engineering rules engine analyzing platform socket, CPU generation, GPU performance tier, and dual-channel memory configurations.
* Calculates cost-to-performance recommendations without external network or AI calls.
* Detects dormant BIOS XMP/DOCP profiles directly from the SPD chip for instant memory boost.

### In-Game Overlay (HUD)
* Lightweight transparent in-game telemetry display showing FPS, GPU/CPU thermals, and RAM usage.
* Zero-Ban architecture: utilizes native transparent window overlays with OS-level click-through rather than invasive game process memory or DLL injections.
* Toggleable via global hotkey (`Ctrl+Shift+O`).

---

## Security & Architecture

* **Inter-Process Communication (IPC):** Dynamic HMAC-SHA256 handshake with rotating nonce challenges between Node.js and the Python engine.
* **Anti-Debugging Guard:** Native Win32 `IsDebuggerPresent` and `CheckRemoteDebuggerPresent` guards prevent unauthorized memory tampering.
* **Offline-First Guarantee:** Zero outbound network calls, zero tracking pixels, zero analytics. Works fully air-gapped.

---

## Installation & Download

Pre-built standalone installers are available on the [Releases page](https://github.com/TheurerX/thecore/releases/latest).

1. Download **`TheCore.exe`**.
2. Run the installer (NSIS standalone setup).
3. Launch from desktop or start menu.

---

## Building from Source

### Prerequisites
* Node.js 20+
* Python 3.12 (with `psutil`, `pynvml`, `wmi`, `pywin32`)

```powershell
# Clone repository
git clone https://github.com/TheurerX/thecore.git
cd thecore

# Install Node.js dependencies
npm install

# Run in development mode
npm start

# Build protected production installer
npm run build
```

---

## License & Author

* **Author & Developer:** Theurer
* **License:** MIT License (Free for personal and commercial use)
