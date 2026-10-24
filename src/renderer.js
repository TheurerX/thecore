// TheCore v3.3.0 — Frontend Renderer Logic

document.addEventListener('DOMContentLoaded', () => {
  // Initialize i18n
  if (window.i18n) {
    window.i18n.applyToDOM();
    document.addEventListener('thecore:language_changed', () => {
      window.i18n.applyToDOM();
      if (hardwareData) {
        renderDashboard(hardwareData);
      }
      if (allStartupItems && allStartupItems.length > 0) {
        renderStartupList();
      }
      if (allInstalledApps && allInstalledApps.length > 0) {
        updateUninstallerCounters();
        renderInstalledApps();
      }
      if (lastOptimizationAnalysis) {
        renderOptimizationAnalysis(lastOptimizationAnalysis);
      }
      loadUpgradeRecommendations();
      loadSystemRating();
    });
  }

  // Navigation & Views Cache (Zero-lag 0ms switching)
  const navButtons = document.querySelectorAll('.nav-item');
  const viewPanels = {
    dashboard: document.getElementById('view-dashboard'),
    optimize: document.getElementById('view-optimize'),
    uninstaller: document.getElementById('view-uninstaller'),
    startup: document.getElementById('view-startup'),
    upgrade: document.getElementById('view-upgrade')
  };

  function switchTab(viewName) {
    if (!viewPanels[viewName]) return;

    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    Object.keys(viewPanels).forEach(key => {
      const panel = viewPanels[key];
      if (key === viewName) {
        panel.classList.add('active');
        if (viewName === 'optimize') {
          loadOptimizationAnalysis();
        } else if (viewName === 'uninstaller') {
          loadInstalledApps();
        } else if (viewName === 'startup') {
          loadStartupItems();
        } else if (viewName === 'upgrade') {
          loadUpgradeRecommendations();
        }
      } else {
        panel.classList.remove('active');
      }
    });
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.view);
    });
  });

  // Window Controls (Direct Minimize and Hide to Tray)
  const winMinBtn = document.getElementById('win-min-btn');
  const winCloseBtn = document.getElementById('win-close-btn');

  winMinBtn?.addEventListener('click', () => window.api.minimizeWindow());
  winCloseBtn?.addEventListener('click', () => {
    const minimizeToTray = localStorage.getItem('thecore_minimize_to_tray') !== 'false';
    if (minimizeToTray) {
      window.api.hideToTray();
    } else {
      window.api.closeApp();
    }
  });

  // Component Details Dialog
  const detailsDialog = document.getElementById('details-dialog');
  const detailCloseBtn = document.getElementById('detail-close-btn');
  const detailDialogTitle = document.getElementById('detailDialogTitle');
  const detailDialogBody = document.getElementById('detailDialogBody');

  detailCloseBtn?.addEventListener('click', () => detailsDialog.close());
  if (detailsDialog && !('closedBy' in HTMLDialogElement.prototype)) {
    detailsDialog.addEventListener('click', (event) => {
      if (event.target !== detailsDialog) return;
      const rect = detailsDialog.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) detailsDialog.close();
    });
  }

  // Listeners from Main Process (Tray / Close requests)
  window.api.onRequestClose?.(() => window.api.hideToTray());
  window.api.onTriggerQuickBoost?.(() => triggerOptimizationFlow());

  // Cached Data
  let hardwareData = null;
  let allStartupItems = [];
  let isOptimizing = false;

  // Telemetry Elements
  const topCpuMetric = document.getElementById('top-cpu-metric');
  const topRamMetric = document.getElementById('top-ram-metric');
  const cpuUsageVal = document.getElementById('cpu-usage-val');
  const cpuUsageBar = document.getElementById('cpu-usage-bar');
  const gpuTempVal = document.getElementById('gpu-temp-val');
  const gpuTempBar = document.getElementById('gpu-temp-bar');
  const gpuPower = document.getElementById('gpu-power');
  const gpuFan = document.getElementById('gpu-fan');
  const ramUsageVal = document.getElementById('ram-usage-val');
  const ramUsageBar = document.getElementById('ram-usage-bar');

  // Load Hardware Info
  async function loadHardware() {
    try {
      hardwareData = await window.api.getHardware();
      renderDashboard(hardwareData);
    } catch (err) {
      console.error('Failed to load hardware specs:', err);
    }
  }

  function renderDashboard(data) {
    if (!data) return;

    const isEn = window.i18n?.getLang() === 'en';
    const uMhz = isEn ? 'MHz' : 'МГц';
    const uGb = isEn ? 'GB' : 'ГБ';
    const uTb = isEn ? 'TB' : 'ТБ';
    const uMb = isEn ? 'MB' : 'МБ';
    const uW = isEn ? 'W' : 'Вт';
    const uHz = isEn ? 'Hz' : 'Гц';
    const uPcs = isEn ? 'pcs.' : 'шт.';

    // CPU Card
    const cpu = data.cpu || {};
    const cpuNameEl = document.getElementById('cpu-name');
    if (cpuNameEl) cpuNameEl.textContent = cpu.name || 'AMD / Intel Processor';
    const cpuSocketEl = document.getElementById('cpu-socket');
    if (cpuSocketEl) cpuSocketEl.textContent = cpu.socket || 'AM4';
    const cpuCoresEl = document.getElementById('cpu-cores');
    if (cpuCoresEl) cpuCoresEl.textContent = `${cpu.cores || 0} / ${cpu.threads || 0}`;
    const cpuClockEl = document.getElementById('cpu-clock');
    if (cpuClockEl) cpuClockEl.textContent = `${cpu.max_clock_mhz || 0} ${uMhz}`;
    const cpuCacheEl = document.getElementById('cpu-cache');
    if (cpuCacheEl) {
      const l2 = Math.round((cpu.l2_cache_kb || 3072) / 1024);
      const l3 = Math.round((cpu.l3_cache_kb || 32768) / 1024);
      cpuCacheEl.textContent = `${l2} ${uMb} / ${l3} ${uMb}`;
    }
    const cpuArchEl = document.getElementById('cpu-arch');
    if (cpuArchEl) cpuArchEl.textContent = `${cpu.architecture || 'x64'} (Zen 2)`;
    const cpuTdpEl = document.getElementById('cpu-tdp');
    if (cpuTdpEl) cpuTdpEl.textContent = `${(data.psu || {}).cpu_tdp_w || 95} ${uW}`;

    // GPU Card
    const gpus = data.gpu || [];
    const mainGpu = gpus[0] || {};
    const gpuNameEl = document.getElementById('gpu-name');
    if (gpuNameEl) gpuNameEl.textContent = mainGpu.name || 'NVIDIA / AMD GPU';
    const gpuVramEl = document.getElementById('gpu-vram');
    const gpuVram = mainGpu.vram_gb || mainGpu.memory_total_gb || 8;
    if (gpuVramEl) gpuVramEl.textContent = `${gpuVram} ${uGb} GDDR6`;
    const gpuBusEl = document.getElementById('gpu-bus');
    if (gpuBusEl) gpuBusEl.textContent = mainGpu.bus_interface || 'PCIe 4.0 x16';
    const gpuDriverEl = document.getElementById('gpu-driver');
    if (gpuDriverEl) gpuDriverEl.textContent = mainGpu.driver || '610.88';
    const gpuDispEl = document.getElementById('gpu-disp');
    const displays = data.displays || [];
    const mainDisp = displays[0] || {};
    if (gpuDispEl) gpuDispEl.textContent = `${mainDisp.resolution || '2560x1440'} @ ${mainDisp.refresh_rate_hz || 165} ${uHz}`;

    // RAM Card
    const ram = data.ram || {};
    const ramNameEl = document.getElementById('ram-name');
    if (ramNameEl) {
      const parts = (ram.modules || []).map(m => m.part_number).filter(Boolean).join(' / ') || ram.ddr_type || 'DDR4';
      ramNameEl.textContent = `${ram.total_gb || 0} ${uGb} (${parts})`;
    }
    const ramSpeedEl = document.getElementById('ram-speed');
    if (ramSpeedEl) ramSpeedEl.textContent = `${ram.current_speed_mhz || 3200} ${uMhz}`;
    const ramXmpEl = document.getElementById('ram-xmp');
    if (ramXmpEl) {
      if (ram.xmp_not_enabled) {
        ramXmpEl.textContent = isEn ? 'Disabled (2400 MHz)' : 'Отключён (2400 МГц)';
        ramXmpEl.style.color = '#F59E0B';
      } else {
        ramXmpEl.textContent = isEn ? 'DOCP Active' : 'DOCP Активен';
        ramXmpEl.style.color = '#10B981';
      }
    }
    const ramModulesEl = document.getElementById('ram-modules');
    if (ramModulesEl) ramModulesEl.textContent = `${ram.occupied_slots || 2} ${isEn ? 'of' : 'из'} ${ram.total_slots || 4} (A2/B2)`;
    const ramChannelEl = document.getElementById('ram-channel');
    if (ramChannelEl) ramChannelEl.textContent = ram.dual_channel ? 'Dual-Channel (128-bit)' : 'Single-Channel';
    const ramPartsEl = document.getElementById('ram-parts');
    if (ramPartsEl) ramPartsEl.textContent = (ram.modules || []).map(m => m.part_number).filter(Boolean)[0] || 'Kingston Fury';
    const ramAvailEl = document.getElementById('ram-avail');
    if (ramAvailEl) ramAvailEl.textContent = `${ram.available_gb || 24.5} ${uGb}`;

    // Storage Card
    const storage = data.storage || {};
    const partitions = storage.partitions || [];
    const physDisks = storage.physical_disks || [];
    const storageNameEl = document.getElementById('storage-name');
    if (storageNameEl) {
      storageNameEl.textContent = isEn
        ? `Storage Subsystem (${physDisks.length} drives, ${partitions.length} volumes)`
        : `Дисковая подсистема (${physDisks.length} диска, ${partitions.length} тома)`;
    }

    const storageDrivesList = document.getElementById('storage-drives-list');
    if (storageDrivesList && partitions.length > 0) {
      storageDrivesList.innerHTML = partitions.map(p => {
        const pct = Math.round(p.percent || 0);
        const diskType = p.device.toUpperCase().startsWith('C') ? 'SSD NVMe' : (p.device.toUpperCase().startsWith('E') ? 'SSD NVMe' : 'HDD SATA');
        const driveLabel = isEn ? 'Drive' : 'Диск';
        const freeLabel = isEn ? 'free of' : 'свободно из';
        return `
          <div class="storage-mini-drive">
            <div class="storage-mini-header">
              <span><strong>${driveLabel} ${p.device}</strong> (${p.fstype} • ${diskType})</span>
              <span>${p.free_gb} ${uGb} ${freeLabel} ${p.total_gb} ${uGb} (${pct}%)</span>
            </div>
            <div class="storage-mini-bar">
              <div class="storage-mini-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    const storageSysDisk = document.getElementById('storage-sys-disk');
    if (storageSysDisk) {
      const cPart = partitions.find(p => p.device && p.device.toUpperCase().startsWith('C')) || partitions[0] || {};
      const cap = Math.round(cPart.total_gb || 232);
      storageSysDisk.textContent = `${cPart.device || 'C:'} (${cap} ${uGb}, SSD)`;
      storageSysDisk.title = `${cPart.device || 'C:'} (${cPart.total_gb || 232} ${uGb}, SSD)`;
    }
    const storageCount = document.getElementById('storage-count');
    if (storageCount) {
      storageCount.textContent = isEn
        ? `${physDisks.length} ${uPcs} (${partitions.length} vol.)`
        : `${physDisks.length} шт. (${partitions.length} тома)`;
      storageCount.title = isEn
        ? `${physDisks.length} physical drives, ${partitions.length} logical volumes`
        : `${physDisks.length} физ. накопителя, ${partitions.length} логических тома`;
    }
    const storageTotalCap = document.getElementById('storage-total-cap');
    if (storageTotalCap) {
      const totalGb = Math.round(partitions.reduce((acc, p) => acc + (p.total_gb || 0), 0));
      const totalTb = (totalGb / 1024).toFixed(2);
      storageTotalCap.textContent = `${totalTb} ${uTb} (${totalGb} ${uGb})`;
      storageTotalCap.title = isEn ? `Total Capacity: ${totalTb} ${uTb} (${totalGb} ${uGb})` : `Суммарный объем: ${totalTb} ТБ (${totalGb} ГБ)`;
    }
    const storageBus = document.getElementById('storage-bus');
    if (storageBus) {
      storageBus.textContent = 'NVMe PCIe + SATA';
      storageBus.title = isEn ? 'Interfaces: NVMe PCIe 4.0 + SATA 6Gb/s' : 'Поддерживаемые интерфейсы: NVMe PCIe 4.0 + SATA 6Gb/s';
    }

    // Motherboard Card
    const mobo = data.motherboard || {};
    const moboNameEl = document.getElementById('mobo-name');
    if (moboNameEl) moboNameEl.textContent = `${mobo.manufacturer || ''} ${mobo.product || ''}`.trim() || 'ROG STRIX B550-F GAMING';
    const moboMfg = document.getElementById('mobo-mfg');
    if (moboMfg) moboMfg.textContent = mobo.manufacturer || 'ASUSTeK COMPUTER INC.';
    const moboChipset = document.getElementById('mobo-chipset');
    if (moboChipset) moboChipset.textContent = 'AMD B550';
    const moboBios = document.getElementById('mobo-bios');
    if (moboBios) moboBios.textContent = mobo.bios_version || '2403';
    const moboDate = document.getElementById('mobo-date');
    if (moboDate) moboDate.textContent = mobo.bios_date || '16.06.2021';
    const moboSocket = document.getElementById('mobo-socket');
    if (moboSocket) moboSocket.textContent = cpu.socket || 'Socket AM4';
    const moboPcie = document.getElementById('mobo-pcie');
    if (moboPcie) moboPcie.textContent = 'PCIe Gen 4 Ready';

    // Displays & PSU Card
    const psu = data.psu || {};
    const displayNameEl = document.getElementById('display-name');
    if (displayNameEl) displayNameEl.textContent = `${mainDisp.name || 'Gigabyte GS27QC'} (${mainDisp.resolution || '2560x1440'} @ ${mainDisp.refresh_rate_hz || 165} ${uHz})`;
    const dispModel = document.getElementById('disp-model');
    if (dispModel) dispModel.textContent = mainDisp.model || mainDisp.name || 'Gigabyte GS27QC';
    const dispMode = document.getElementById('disp-mode');
    if (dispMode) dispMode.textContent = `${mainDisp.resolution || '2560x1440'} @ ${mainDisp.refresh_rate_hz || 165} ${uHz}`;
    const psuBreakdown = document.getElementById('psu-breakdown');
    if (psuBreakdown) {
      psuBreakdown.textContent = `${psu.cpu_tdp_w || 95} ${uW} / ${psu.gpu_tdp_w || 220} ${uW}`;
      psuBreakdown.title = `CPU: ${psu.cpu_tdp_w || 95} ${uW} | GPU: ${psu.gpu_tdp_w || 220} ${uW}`;
    }
    const psuDraw = document.getElementById('psu-draw');
    if (psuDraw) {
      psuDraw.textContent = `${psu.total_peak_w || 375} ${uW}`;
      psuDraw.title = isEn ? `Peak Estimated Load: ${psu.total_peak_w || 375} ${uW}` : `Пиковое расчетное потребление: ${psu.total_peak_w || 375} Вт`;
    }
    const psuRec = document.getElementById('psu-rec');
    if (psuRec) {
      psuRec.textContent = isEn
        ? (psu.recommended_psu_w ? psu.recommended_psu_w.replace('Вт', 'W') : '600–650 W')
        : (psu.recommended_psu_w || '600–650 Вт');
      psuRec.title = isEn ? 'Recommended Power Supply Unit' : `Рекомендуемая мощность блока питания: ${psu.recommended_psu_w || '600–650 Вт'}`;
    }
    const psuCert = document.getElementById('psu-cert');
    if (psuCert) {
      psuCert.textContent = psu.recommended_cert || '80 PLUS Gold';
      psuCert.title = isEn ? 'Efficiency Certification: 80 PLUS Gold' : `Сертификат энергоэффективности: ${psu.recommended_cert || '80 PLUS Gold'}`;
    }
  }

  // Live Telemetry Loop (1.5s interval)
  async function updateLiveMetrics() {
    try {
      const metrics = await window.api.getLiveMetrics();
      if (!metrics) return;

      const isEn = window.i18n?.getLang() === 'en';
      const uGb = isEn ? 'GB' : 'ГБ';
      const uW = isEn ? 'W' : 'Вт';

      const cpuPct = Math.round(metrics.cpu_percent || 0);
      const ramPct = Math.round(metrics.ram_percent || 0);

      if (topCpuMetric) topCpuMetric.textContent = `${cpuPct}%`;
      if (topRamMetric) topRamMetric.textContent = `${ramPct}%`;

      if (cpuUsageVal) cpuUsageVal.textContent = `${cpuPct}%`;
      if (cpuUsageBar) cpuUsageBar.style.width = `${cpuPct}%`;

      if (ramUsageVal) ramUsageVal.textContent = `${metrics.ram_used_gb || 0} / ${metrics.ram_total_gb || 0} ${uGb} (${ramPct}%)`;
      if (ramUsageBar) ramUsageBar.style.width = `${ramPct}%`;

      const gpuTemp = metrics.gpu_temp_c || 0;
      if (gpuTempVal) gpuTempVal.textContent = `${gpuTemp} °C`;
      if (gpuTempBar) gpuTempBar.style.width = `${Math.min(100, Math.round((gpuTemp / 90) * 100))}%`;

      if (gpuPower) gpuPower.textContent = `${metrics.gpu_power_w || 0} ${uW}`;
      const gpuFanSpeed = metrics.gpu_fan_speed || '0';
      if (gpuFan) gpuFan.textContent = `${gpuFanSpeed}% ${gpuFanSpeed == 0 ? '(Fan Stop)' : ''}`;
    } catch (err) {
      // Игнорируем сетевые задержки при закрытии/перезапуске
    }
  }

  let telemetryInterval = parseInt(localStorage.getItem('thecore_telemetry_rate') || '1500', 10);
  let telemetryTimerId = null;

  function restartTelemetryTimer(newRate) {
    if (telemetryTimerId) clearInterval(telemetryTimerId);
    telemetryInterval = newRate;
    telemetryTimerId = setInterval(updateLiveMetrics, telemetryInterval);
  }

  restartTelemetryTimer(telemetryInterval);

  // Optimization & Live Express Audit Logic
  const topBoostBtn = document.getElementById('top-boost-btn');
  const optHealthBadge = document.getElementById('opt-health-badge');
  const optHealthText = document.getElementById('opt-health-text');
  const optHeroTitle = document.getElementById('opt-hero-title');
  const optHeroDesc = document.getElementById('opt-hero-desc');
  const optProgressSection = document.getElementById('opt-progress-section');
  const optProgressFill = document.getElementById('opt-progress-fill');
  const optStep1 = document.getElementById('opt-step-1');
  const optStep2 = document.getElementById('opt-step-2');
  const optStep3 = document.getElementById('opt-step-3');
  const optStep4 = document.getElementById('opt-step-4');
  const optResultsSection = document.getElementById('opt-results-section');

  // Pre-Scan Card Elements
  const optValRamCleanable = document.getElementById('opt-val-ram-cleanable');
  const optValRamNow = document.getElementById('opt-val-ram-now');
  const optValTempSize = document.getElementById('opt-val-temp-size');
  const optValTempCount = document.getElementById('opt-val-temp-count');
  const optValShaderSize = document.getElementById('opt-val-shader-size');
  const optValShaderCount = document.getElementById('opt-val-shader-count');
  const optBadgeApps = document.getElementById('opt-badge-apps');
  const optValAppsMem = document.getElementById('opt-val-apps-mem');
  const optValAppsCount = document.getElementById('opt-val-apps-count');
  const optAppsTagsList = document.getElementById('opt-apps-tags-list');

  let isAnalyzingOptimization = false;
  let lastOptimizationAnalysis = null;
  let isShowingResults = false;
  let optResultsTimer = null;

  async function loadOptimizationAnalysis(forceRefresh = false) {
    if (isAnalyzingOptimization && !forceRefresh) return;
    isAnalyzingOptimization = true;

    try {
      const data = await window.api.getOptimizationAnalysis();
      lastOptimizationAnalysis = data;
      renderOptimizationAnalysis(data);
    } catch (err) {
      console.error('Failed to load optimization analysis:', err);
    } finally {
      isAnalyzingOptimization = false;
    }
  }

  function renderOptimizationAnalysis(data) {
    if (!data) return;

    const isEn = window.i18n?.getLang() === 'en';
    const uMb = isEn ? 'MB' : 'МБ';
    const uGb = isEn ? 'GB' : 'ГБ';
    const uPcs = isEn ? 'pcs.' : 'шт.';

    // 1. Hero Status
    const status = data.health_status || 'moderate';
    if (optHealthBadge) {
      optHealthBadge.className = `opt-badge ${status}`;
      optHealthBadge.textContent = isEn
        ? (status === 'optimal' ? 'Optimal' : (status === 'warning' ? 'Attention Needed' : 'Express Audit'))
        : (data.health_text || 'Экспресс-аудит');
    }
    if (optHealthText) {
      optHealthText.textContent = isEn ? 'Overall optimization potential' : 'Общий потенциал оптимизации';
    }

    if (optHeroTitle && !isOptimizing && !isShowingResults) {
      const totalMb = data.total_potential_mb || 0;
      const readyPrefix = isEn ? 'Ready for cleanup: ~' : 'Готово к оптимизации: ~';
      if (totalMb >= 1024) {
        optHeroTitle.textContent = `${readyPrefix}${data.total_potential_gb || (totalMb / 1024).toFixed(1)} ${uGb}`;
      } else {
        optHeroTitle.textContent = `${readyPrefix}${totalMb} ${uMb}`;
      }
    }

    if (optHeroDesc && !isOptimizing && !isShowingResults) {
      const parts = [];
      if (data.ram_cleanable_mb > 0) parts.push(isEn ? `RAM cache (~${data.ram_cleanable_mb} MB)` : `кэш RAM (~${data.ram_cleanable_mb} МБ)`);
      if (data.temp_size_mb > 0) parts.push(isEn ? `temporary files (${data.temp_size_mb} MB)` : `временные файлы (${data.temp_size_mb} МБ)`);
      if (data.shader_size_mb > 0) parts.push(isEn ? `GPU shaders (${data.shader_size_mb} MB)` : `шейдеры GPU (${data.shader_size_mb} МБ)`);
      if (data.target_apps_count > 0) parts.push(isEn ? `${data.target_apps_count} background clients` : `${data.target_apps_count} фоновых клиентов`);
      
      if (parts.length > 0) {
        optHeroDesc.textContent = isEn
          ? `Resources ready for safe cleanup: ${parts.join(', ')}.`
          : `Обнаружены ресурсы, готовые к безопасной очистке: ${parts.join(', ')}.`;
      } else {
        optHeroDesc.textContent = isEn
          ? 'System cache is clean. Click "Clean" in the header to flush unreferenced memory.'
          : 'Система очищена. Нажмите «Очистить» в шапке для превентивного сброса кэша.';
      }
    }

    // 2. RAM Card
    if (optValRamCleanable) optValRamCleanable.textContent = `${data.ram_cleanable_mb || 0} ${uMb}`;
    if (optValRamNow) {
      optValRamNow.textContent = `${data.ram_percent_now || 0}% (${data.ram_used_gb || 0} / ${data.ram_total_gb || 0} ${uGb})`;
    }

    // 3. Temp Files Card
    if (optValTempSize) optValTempSize.textContent = `${data.temp_size_mb || 0} ${uMb}`;
    if (optValTempCount) optValTempCount.textContent = `${data.temp_files_count || 0} ${uPcs}`;

    // 4. Shader Cache Card
    if (optValShaderSize) optValShaderSize.textContent = `${data.shader_size_mb || 0} ${uMb}`;
    if (optValShaderCount) optValShaderCount.textContent = `${data.shader_files_count || 0} ${uPcs}`;

    // 5. Target Background Apps Card
    const targetApps = data.target_apps || [];
    if (optBadgeApps) optBadgeApps.textContent = isEn ? `${targetApps.length} active` : `${targetApps.length} активно`;
    if (optValAppsMem) optValAppsMem.textContent = `${data.target_apps_mem_mb || 0} ${uMb}`;
    if (optValAppsCount) optValAppsCount.textContent = `${targetApps.length} ${uPcs}`;

    if (optAppsTagsList) {
      if (targetApps.length === 0) {
        optAppsTagsList.innerHTML = `<span style="font-size: 11px; color: var(--text-muted);">${isEn ? 'No background clients detected' : 'Фоновые клиенты не обнаружены'}</span>`;
      } else {
        optAppsTagsList.innerHTML = targetApps.map(app => `
          <span class="opt-app-tag">
            ${app.name} <span class="opt-app-tag-mem">${app.memory_mb} ${uMb}</span>
          </span>
        `).join('');
      }
    }
  }

  async function triggerOptimizationFlow() {
    if (isOptimizing) return;
    isOptimizing = true;

    const isEn = window.i18n?.getLang() === 'en';
    const uMb = isEn ? 'MB' : 'МБ';

    // Clear any pending results fadeout timer
    if (optResultsTimer) {
      clearTimeout(optResultsTimer);
      optResultsTimer = null;
    }
    isShowingResults = false;

    switchTab('optimize');

    if (topBoostBtn) topBoostBtn.classList.add('running');
    if (optHeroTitle) {
      optHeroTitle.classList.add('running');
      optHeroTitle.textContent = isEn ? 'Optimization in progress...' : 'Оптимизация выполняется...';
    }
    if (optHeroDesc) {
      optHeroDesc.textContent = isEn
        ? 'Closing background apps, flushing unreferenced RAM working set, cleaning temporary files and GPU shader caches.'
        : 'Система выгружает фоновые процессы, освобождает заблокированный кэш RAM, очищает временные файлы и кэш шейдеров GPU.';
    }

    if (optProgressSection) {
      optProgressSection.style.display = 'block';
      optProgressSection.style.opacity = '1';
    }
    if (optProgressFill) optProgressFill.style.width = '10%';

    // Reset steps
    [optStep1, optStep2, optStep3, optStep4].filter(Boolean).forEach(s => {
      s.classList.remove('active', 'completed');
    });
    if (optStep1) optStep1.classList.add('active');
    if (optResultsSection) {
      optResultsSection.style.display = 'none';
      optResultsSection.style.opacity = '1';
    }

    try {
      const result = await window.api.runOptimization();

      if (optProgressFill) optProgressFill.style.width = '100%';
      [optStep1, optStep2, optStep3, optStep4].filter(Boolean).forEach(s => {
        s.classList.remove('active');
        s.classList.add('completed');
      });

      if (optHeroTitle) {
        optHeroTitle.classList.remove('running');
        optHeroTitle.textContent = isEn ? 'Optimization completed successfully!' : 'Оптимизация успешно завершена!';
      }
      const totalCleaned = result.total_disk_freed_mb || result.temp_freed_mb || 0;
      const shaderDetails = result.shader_freed_mb
        ? (isEn ? ` (shaders: ${result.shader_freed_mb} MB)` : ` (шейдеры: ${result.shader_freed_mb} МБ)`)
        : '';
      if (optHeroDesc) {
        optHeroDesc.textContent = isEn
          ? `Memory released: ${result.ram_freed_mb || 0} MB | Purged cache & temp: ${totalCleaned} MB${shaderDetails} | Clients closed: ${result.closed_processes_count || 0}.`
          : `Освобождено памяти: ${result.ram_freed_mb || 0} МБ | Удалено кэша и мусора: ${totalCleaned} МБ${shaderDetails} | Закрыто процессов: ${result.closed_processes_count || 0}.`;
      }

      // Fill summary cards
      const rRam = document.getElementById('res-ram-freed');
      const rTemp = document.getElementById('res-temp-freed');
      const rProc = document.getElementById('res-proc-closed');
      const rCur = document.getElementById('res-current-ram');
      if (rRam) rRam.textContent = `${result.ram_freed_mb || 0} ${uMb}`;
      if (rTemp) rTemp.textContent = `${totalCleaned} ${uMb}`;
      if (rProc) rProc.textContent = `${result.closed_processes_count || 0}`;
      if (rCur) rCur.textContent = `${result.current_ram_percent || 0}%`;

      // Show results block with smooth fade in
      if (optResultsSection) {
        optResultsSection.style.display = 'grid';
        optResultsSection.style.opacity = '0';
        requestAnimationFrame(() => {
          optResultsSection.style.opacity = '1';
        });
      }

      isShowingResults = true;

      // Update telemetry immediately
      await updateLiveMetrics();

      // Refresh express audit cards in background to update card values
      window.api.getOptimizationAnalysis().then(freshData => {
        lastOptimizationAnalysis = freshData;
        renderOptimizationAnalysis(freshData);
      }).catch(err => {
        console.error('Failed to update audit after optimization:', err);
      });

      // Smoothly hide progress bar after 2 seconds
      setTimeout(() => {
        if (optProgressSection && isShowingResults) {
          optProgressSection.style.transition = 'opacity 300ms ease';
          optProgressSection.style.opacity = '0';
          setTimeout(() => {
            optProgressSection.style.display = 'none';
            optProgressSection.style.opacity = '1';
          }, 300);
        }
      }, 2000);

      // Temporary showcase: results disappear automatically after exactly 10 seconds
      optResultsTimer = setTimeout(() => {
        if (optResultsSection) {
          optResultsSection.style.opacity = '0';
          setTimeout(() => {
            optResultsSection.style.display = 'none';
            optResultsSection.style.opacity = '1';
            isShowingResults = false;
            // Restore hero title & description back to current live audit stats
            if (lastOptimizationAnalysis) {
              renderOptimizationAnalysis(lastOptimizationAnalysis);
            }
          }, 400);
        } else {
          isShowingResults = false;
        }
      }, 10000);

    } catch (err) {
      const isEn = window.i18n?.getLang() === 'en';
      if (optHeroTitle) {
        optHeroTitle.classList.remove('running');
        optHeroTitle.textContent = isEn ? 'Error during optimization' : 'Ошибка во время оптимизации';
      }
      if (optHeroDesc) optHeroDesc.textContent = String(err);
    } finally {
      if (topBoostBtn) topBoostBtn.classList.remove('running');
      isOptimizing = false;
    }
  }

  topBoostBtn?.addEventListener('click', triggerOptimizationFlow);

  // Auto-refresh express audit every 15s under the hood when optimize view is active
  setInterval(() => {
    const optPanel = document.getElementById('view-optimize');
    if (optPanel && optPanel.classList.contains('active') && !isOptimizing && !isAnalyzingOptimization && !isShowingResults) {
      loadOptimizationAnalysis();
    }
  }, 15000);

  // Streaming Engine Events
  window.api.onEngineEvent((evt) => {
    if (evt.event === 'optimization_progress') {
      const isEn = window.i18n?.getLang() === 'en';
      const { step, title, progress } = evt.data;
      if (optProgressFill) optProgressFill.style.width = `${Math.round(progress * 100)}%`;
      if (optHeroTitle) optHeroTitle.textContent = isEn ? 'Optimization in progress...' : 'Оптимизация выполняется...';
      if (optHeroDesc) optHeroDesc.textContent = title;

      if (step === 1) {
        if (optStep1) optStep1.classList.add('active');
      } else if (step === 2) {
        if (optStep1) {
          optStep1.classList.remove('active');
          optStep1.classList.add('completed');
        }
        if (optStep2) optStep2.classList.add('active');
      } else if (step === 3) {
        if (optStep2) {
          optStep2.classList.remove('active');
          optStep2.classList.add('completed');
        }
        if (optStep3) optStep3.classList.add('active');
      } else if (step === 4) {
        if (optStep3) {
          optStep3.classList.remove('active');
          optStep3.classList.add('completed');
        }
        if (optStep4) optStep4.classList.add('active');
      } else if (step === 5) {
        if (optStep4) {
          optStep4.classList.remove('active');
          optStep4.classList.add('completed');
        }
      }
    }
  });

  // Startup Items Logic (ТОЛЬКО ВКЛЮЧЁННЫЕ В АВТОЗАГРУЗКЕ WINDOWS)
  const startupListEl = document.getElementById('startup-items-list');
  const startupStatsText = document.getElementById('startup-stats-text');

  async function loadStartupItems() {
    try {
      allStartupItems = await window.api.getStartupItems();
      renderStartupList();
    } catch (err) {
      console.error('Failed to load startup items:', err);
    }
  }

  function renderStartupList() {
    if (!startupListEl) return;

    // Фильтруем: показываем ТОЛЬКО реально включённые в автозагрузке сторонние процессы (TheCore закреплен сверху отдельно)
    const activeItems = (allStartupItems || []).filter(i => {
      if (!i.enabled) return false;
      const n = (i.name || '').toLowerCase();
      const c = (i.command || '').toLowerCase();
      return !n.includes('thecore') && 
             !n.includes('the-core') && 
             !n.includes('theoptimizer') && 
             !n.includes('the-optimizer') && 
             !n.includes('electron') && 
             !c.includes('thecore') && 
             !c.includes('the-core') && 
             !c.includes('theoptimizer') && 
             !c.includes('the-optimizer');
    });

    const isEn = window.i18n?.getLang() === 'en';
    if (startupStatsText) {
      const prefix = isEn ? 'Active processes:' : 'Активных процессов:';
      startupStatsText.innerHTML = `${prefix} <strong style="color: #10B981;">${activeItems.length}</strong>`;
    }

    if (activeItems.length === 0) {
      startupListEl.innerHTML = `
        <div style="text-align: center; padding: 48px; color: var(--text-muted); font-size: 13.5px;">
          ${isEn ? 'No active third-party startup applications' : 'В автозагрузке Windows нет активных сторонних приложений'}
        </div>
      `;
      return;
    }

    function getImpactClass(impact) {
      const imp = (impact || '').toLowerCase();
      if (imp.includes('высок') || imp.includes('high')) return 'impact-high';
      if (imp.includes('средн') || imp.includes('med')) return 'impact-med';
      return 'impact-low';
    }

    function getRecClass(rec) {
      const r = (rec || '').toLowerCase();
      if (r.includes('не рекоменд') || r.includes('not rec') || r.includes('caution')) return 'rec-caution';
      if (r.includes('безопасн') || r.includes('рекоменд') || r.includes('safe') || r.includes('rec')) return 'rec-safe';
      return 'rec-neutral';
    }

    function getLocalizedImpact(impact) {
      if (!isEn) return impact;
      const imp = (impact || '').toLowerCase();
      if (imp.includes('высок')) return 'High Impact';
      if (imp.includes('средн')) return 'Medium Impact';
      return 'Low Impact';
    }

    function getLocalizedRec(rec) {
      if (!isEn) return rec;
      const r = (rec || '').toLowerCase();
      if (r.includes('не рекоменд')) return 'Not Recommended';
      if (r.includes('безопасн')) return 'Safe to Disable';
      if (r.includes('рекоменд')) return 'Recommended';
      return 'Neutral';
    }

    startupListEl.innerHTML = activeItems.map(item => `
      <div class="startup-card" id="startup-card-${item.name}">
        <div class="startup-card-left">
          <div class="startup-title-row">
            <span class="startup-name">${item.name}</span>
            <span class="startup-location-tag">${item.location}</span>
          </div>
          <div class="startup-badges-row">
            <span class="startup-chip ${getImpactClass(item.impact)}">
              <span class="chip-dot"></span>
              ${getLocalizedImpact(item.impact)}
            </span>
            <span class="startup-chip ${getRecClass(item.recommendation)}">
              ${getLocalizedRec(item.recommendation)}
            </span>
          </div>
          <div class="startup-desc">${item.description}</div>
          <div class="startup-cmd" title="${item.command}">${item.command}</div>
        </div>
        <div class="startup-card-right">
          <label class="toggle-switch" title="${isEn ? 'Disable startup' : 'Отключить автозапуск'}">
            <input type="checkbox" class="startup-toggle-input" data-name="${item.name}" checked>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `).join('');

    // Toggle event listener: disable in Windows registry and smoothly remove from active list
    startupListEl.querySelectorAll('.startup-toggle-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const name = e.target.dataset.name;
        if (!e.target.checked) {
          try {
            await window.api.toggleStartupItem(name, false);
            const found = allStartupItems.find(i => i.name === name);
            if (found) found.enabled = false;

            const cardEl = document.getElementById(`startup-card-${name}`);
            if (cardEl) {
              cardEl.style.opacity = '0';
              cardEl.style.transform = 'translateX(20px)';
              cardEl.style.transition = 'all 200ms ease';
              setTimeout(() => {
                renderStartupList();
              }, 200);
            } else {
              renderStartupList();
            }
          } catch (err) {
            e.target.checked = true;
            const isEn = window.i18n?.getLang() === 'en';
            alert(isEn ? `Failed to disable startup application: ${err.message}` : `Ошибка отключения автозапуска: ${err.message}`);
          }
        }
      });
    });
  }

  // TheCore Pinned Autostart Toggle Logic
  async function initTheCoreAutostart() {
    const toggleInput = document.getElementById('thecore-autostart-toggle');
    if (!toggleInput) return;

    try {
      const isEnabled = await window.api.getAutostartStatus();
      toggleInput.checked = Boolean(isEnabled);
    } catch (err) {
      console.error('Failed to get TheCore autostart status:', err);
    }

    toggleInput.addEventListener('change', async (e) => {
      const shouldEnable = e.target.checked;
      toggleInput.disabled = true;
      try {
        const newStatus = await window.api.setAutostart(shouldEnable);
        toggleInput.checked = Boolean(newStatus);
        const settingsToggle = document.getElementById('settings-toggle-autostart');
        if (settingsToggle) {
          settingsToggle.checked = Boolean(newStatus);
        }
      } catch (err) {
        console.error('Failed to set TheCore autostart:', err);
        toggleInput.checked = !shouldEnable;
      } finally {
        toggleInput.disabled = false;
      }
    });
  }

  // Upgrade Advisor Logic
  const freeBoostCard = document.getElementById('free-boost-card');
  const freeBoostDesc = document.getElementById('free-boost-desc');
  const freeBoostGuide = document.getElementById('free-boost-guide');
  const upgradeListEl = document.getElementById('upgrade-recommendations-list');

  async function loadUpgradeRecommendations() {
    try {
      const recs = await window.api.getUpgradeRecommendations();
      if (!recs) return;

      const isEn = window.i18n?.getLang() === 'en';

      const freeBoost = recs.find(r => r.type === 'free_boost');
      if (freeBoost && freeBoostCard) {
        freeBoostCard.style.display = 'flex';
        if (freeBoostDesc) freeBoostDesc.textContent = freeBoost.description;
        if (freeBoostGuide) freeBoostGuide.textContent = freeBoost.action_guide;
      }

      const hardwareRecs = recs.filter(r => r.type !== 'free_boost');
      if (upgradeListEl) {
        upgradeListEl.innerHTML = hardwareRecs.map(r => {
          let catClass = 'cat-cpu';
          const cat = (r.category || '').toLowerCase();
          if (cat.includes('видео') || cat.includes('gpu')) {
            catClass = 'cat-gpu';
          } else if (cat.includes('памят') || cat.includes('ram')) {
            catClass = 'cat-ram';
          } else if (cat.includes('накопител') || cat.includes('диск') || cat.includes('ssd') || cat.includes('hdd') || cat.includes('storage')) {
            catClass = 'cat-storage';
          }

          const costText = isEn
            ? (r.cost_est || '').replace('руб.', 'RUB').replace('0 руб.', '0 ₽ (Free)')
            : r.cost_est;
          let priorityText = r.priority || '';
          if (isEn) {
            if (priorityText.includes('Высок')) priorityText = 'High';
            else if (priorityText.includes('Средн')) priorityText = 'Medium';
            else if (priorityText.includes('Низк')) priorityText = 'Low';
            else if (priorityText.includes('Рекоменд')) priorityText = 'Recommended';
            else if (priorityText.includes('Сроч')) priorityText = 'High';
          }

          let catText = r.category || '';
          if (isEn) {
            if (catText.includes('Процессор')) catText = 'Processor (CPU)';
            else if (catText.includes('Видеокарта')) catText = 'Graphics Card (GPU)';
            else if (catText.includes('Оперативная память')) catText = 'Memory (RAM)';
            else if (catText.includes('Накопители')) catText = 'Storage (Drives)';
            else if (catText.includes('Настройка памяти')) catText = 'Memory Tuning (BIOS)';
          }

          return `
            <div class="glass-card upgrade-card ${catClass}">
              <div class="upgrade-card-head">
                <span class="upgrade-cat-tag">${catText}</span>
                <span class="upgrade-cost-badge">${costText} • ${priorityText}</span>
              </div>
              <div class="upgrade-title">${r.title}</div>
              <div class="upgrade-benefit">${r.benefit}</div>
              <div class="upgrade-desc">${r.description}</div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load upgrade recommendations:', err);
    }
  }

  // Details Dialog Handlers
  document.querySelectorAll('.card-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const detailType = e.target.dataset.detail;
      if (!detailType || !hardwareData) return;

      const isEn = window.i18n?.getLang() === 'en';
      const uMhz = isEn ? 'MHz' : 'МГц';
      const uGb = isEn ? 'GB' : 'ГБ';
      const uMb = isEn ? 'MB' : 'МБ';
      const uW = isEn ? 'W' : 'Вт';

      if (detailType === 'cpu') {
        const c = hardwareData.cpu || {};
        detailDialogTitle.textContent = isEn ? `Processor: ${c.name}` : `Процессор: ${c.name}`;
        detailDialogBody.innerHTML = `
          <p><strong>${isEn ? 'Socket:' : 'Сокет:'}</strong> ${c.socket}</p>
          <p><strong>${isEn ? 'Physical Cores:' : 'Физических ядер:'}</strong> ${c.cores}</p>
          <p><strong>${isEn ? 'Logical Threads:' : 'Логических потоков:'}</strong> ${c.threads}</p>
          <p><strong>${isEn ? 'Base Clock:' : 'Базовая частота:'}</strong> ${c.max_clock_mhz} ${uMhz}</p>
          <p><strong>${isEn ? 'Cache L2:' : 'Кэш L2:'}</strong> ${c.l2_cache_kb} ${isEn ? 'KB' : 'КБ'}</p>
          <p><strong>${isEn ? 'Cache L3:' : 'Кэш L3:'}</strong> ${Math.round((c.l3_cache_kb || 0) / 1024)} ${uMb}</p>
          <p><strong>${isEn ? 'Architecture:' : 'Архитектура:'}</strong> ${c.architecture || 'x64'} (Zen 2)</p>
        `;
      } else if (detailType === 'gpu') {
        const g = (hardwareData.gpu || [])[0] || {};
        detailDialogTitle.textContent = isEn ? `Graphics Card: ${g.name}` : `Видеокарта: ${g.name}`;
        detailDialogBody.innerHTML = `
          <p><strong>${isEn ? 'VRAM:' : 'Видеопамять:'}</strong> ${g.vram_gb || g.memory_total_gb || 8} ${uGb} GDDR6</p>
          <p><strong>${isEn ? 'Driver Version:' : 'Версия видеодрайвера:'}</strong> ${g.driver || g.driver_version || 'N/A'}</p>
          <p><strong>${isEn ? 'Bus Interface:' : 'Шина подключения:'}</strong> ${g.bus_interface || 'PCIe 4.0 x16'}</p>
          <p><strong>${isEn ? 'Supported API:' : 'Поддерживаемый API:'}</strong> DirectX 12 Ultimate / Vulkan 1.3</p>
        `;
      } else if (detailType === 'ram') {
        const r = hardwareData.ram || {};
        const mfgList = Array.from(new Set((r.modules || []).map(m => m.manufacturer).filter(Boolean))).join(', ') || 'Kingston';
        const partList = (r.modules || []).map(m => m.part_number).filter(Boolean).join(', ') || 'KF3200C16D4/16GX';
        detailDialogTitle.textContent = isEn ? `Memory: ${r.total_gb} ${uGb}` : `Оперативная память: ${r.total_gb} ГБ`;
        detailDialogBody.innerHTML = `
          <p><strong>${isEn ? 'Current Speed:' : 'Текущая частота:'}</strong> ${r.current_speed_mhz} ${uMhz}</p>
          <p><strong>${isEn ? 'Rated Speed:' : 'Паспортная частота:'}</strong> ${r.max_rated_speed_mhz} ${uMhz}</p>
          <p><strong>${isEn ? 'Occupied Slots:' : 'Слотов занято:'}</strong> ${r.occupied_slots || 2} ${isEn ? 'of' : 'из'} ${r.total_slots || 4}</p>
          <p><strong>${isEn ? 'Module Manufacturer:' : 'Производитель модулей:'}</strong> ${mfgList}</p>
          <p><strong>${isEn ? 'Part Number:' : 'Маркировка планок:'}</strong> ${partList}</p>
          <p><strong>${isEn ? 'Mode:' : 'Режим:'}</strong> ${r.dual_channel ? 'Dual-Channel (128-bit)' : 'Single-Channel'}</p>
          <p><strong>${isEn ? 'DOCP / XMP Status:' : 'Статус XMP:'}</strong> ${r.xmp_not_enabled ? (isEn ? 'Disabled in BIOS (running at 2400 MHz)' : 'Выключен в BIOS (работает на 2400 МГц)') : (isEn ? 'Active (3200 MHz DOCP)' : 'Активен (3200 МГц DOCP)')}</p>
        `;
      } else if (detailType === 'storage') {
        const s = hardwareData.storage || {};
        const partitions = s.partitions || [];
        const physDisks = s.physical_disks || [];
        detailDialogTitle.textContent = isEn
          ? `Storage Drives (${physDisks.length} drives, ${partitions.length} volumes)`
          : `Накопители (${physDisks.length} диска, ${partitions.length} раздела)`;
        let html = `<div style="margin-bottom: 8px;"><strong style="color: #60A5FA;">${isEn ? 'Physical Drives:' : 'Физические накопители:'}</strong></div>`;
        html += physDisks.map(p => `
          <div style="margin-bottom: 8px; padding: 8px 10px; background: rgba(255,255,255,0.025); border-radius: 6px;">
            <p><strong>${p.name}</strong></p>
            <p style="font-size: 11.5px; color: var(--text-muted);">${p.size_gb} ${uGb} • ${isEn ? 'Type:' : 'Тип:'} ${p.display_type || p.media_type}</p>
          </div>
        `).join('');
        html += `<div style="margin: 14px 0 8px 0;"><strong style="color: #60A5FA;">${isEn ? 'Logical Volumes:' : 'Логические разделы:'}</strong></div>`;
        html += partitions.map(p => `
          <div style="margin-bottom: 8px; padding: 8px 10px; background: rgba(255,255,255,0.025); border-radius: 6px;">
            <p><strong>${isEn ? 'Volume' : 'Раздел'} ${p.device}</strong> (${p.fstype}): ${isEn ? 'Free' : 'Свободно'} ${p.free_gb} ${uGb} ${isEn ? 'of' : 'из'} ${p.total_gb} ${uGb} (${p.percent}% ${isEn ? 'used' : 'заполнено'})</p>
          </div>
        `).join('');
        detailDialogBody.innerHTML = html;
      } else if (detailType === 'mobo') {
        const m = hardwareData.motherboard || {};
        detailDialogTitle.textContent = isEn ? `Motherboard: ${m.product}` : `Материнская плата: ${m.product}`;
        detailDialogBody.innerHTML = `
          <p><strong>${isEn ? 'Manufacturer:' : 'Производитель:'}</strong> ${m.manufacturer}</p>
          <p><strong>${isEn ? 'Chipset:' : 'Чипсет:'}</strong> AMD B550</p>
          <p><strong>${isEn ? 'BIOS Version:' : 'Версия BIOS:'}</strong> ${m.bios_version}</p>
          <p><strong>${isEn ? 'BIOS Date:' : 'Дата BIOS:'}</strong> ${m.bios_date}</p>
          <p><strong>${isEn ? 'Serial Number:' : 'Серийный номер:'}</strong> ${m.serial_number}</p>
          <p><strong>PCIe:</strong> ${isEn ? 'PCIe 4.0 x16 support for GPU and M.2 NVMe' : 'Поддержка PCIe 4.0 x16 для видеокарты и M.2 NVMe'}</p>
        `;
      } else if (detailType === 'psu') {
        const p = hardwareData.psu || {};
        detailDialogTitle.textContent = isEn ? 'System Power Estimation (PSU)' : 'Расчет энергопотребления системы (БП)';
        detailDialogBody.innerHTML = `
          <p><strong>${isEn ? 'Peak Load:' : 'Пиковая нагрузка:'}</strong> ${p.total_peak_w} ${uW}</p>
          <p><strong>${isEn ? 'Recommended Power:' : 'Рекомендуемая мощность:'}</strong> ${isEn && p.recommended_psu_w ? p.recommended_psu_w.replace('Вт', 'W') : p.recommended_psu_w}</p>
          <p><strong>${isEn ? 'Certificate:' : 'Сертификат:'}</strong> ${p.recommended_cert}</p>
          <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px;">${p.note}</p>
        `;
      }

      detailsDialog.showModal();
    });
  });

  // ==========================================================================
  // 5. CLEAN UNINSTALLER & FORCE REMOVAL LOGIC
  // ==========================================================================
  const uninstallerHeroStats = document.getElementById('uninstaller-hero-stats');
  const uninstallerSearchInput = document.getElementById('uninstaller-search-input');
  const uninstallerSearchClear = document.getElementById('uninstaller-search-clear');
  const countAll = document.getElementById('count-all');
  const countGame = document.getElementById('count-game');
  const countJunk = document.getElementById('count-junk');
  const countApp = document.getElementById('count-app');
  const countSystem = document.getElementById('count-system');
  const appsListContainer = document.getElementById('apps-list-container');
  const categoryFilterButtons = document.querySelectorAll('#uninstaller-category-filters .liquid-pill');
  const sortFilterButtons = document.querySelectorAll('#uninstaller-sort-filters .liquid-pill');

  // Residuals Modal Elements
  const residualsDialog = document.getElementById('residuals-dialog');
  const residualsCloseBtn = document.getElementById('residuals-close-btn');
  const residualsBtnCancel = document.getElementById('residuals-btn-cancel');
  const residualsBtnPurge = document.getElementById('residuals-btn-purge');
  const residualsToggleAll = document.getElementById('residuals-toggle-all');
  const resTargetAppName = document.getElementById('res-target-app-name');
  const resFoundSize = document.getElementById('res-found-size');
  const resFoundFiles = document.getElementById('res-found-files');
  const resFoundReg = document.getElementById('res-found-reg');
  const residualsItemsTree = document.getElementById('residuals-items-tree');

  let allInstalledApps = [];
  let currentCategoryFilter = 'all';
  let currentSortMode = 'size';
  let currentSearchQuery = '';
  let isLoadingApps = false;
  let activeResidualsApp = null;
  let currentResidualItems = [];
  const clientAppIconCache = new Map();

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getCategoryBadge(cat) {
    const isEn = window.i18n?.getLang() === 'en';
    if (cat === 'game') {
      return `
        <span class="app-cat-badge game">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/>
            <line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/>
            <rect width="20" height="12" x="2" y="6" rx="6"/>
          </svg>
          <span>${isEn ? 'Game' : 'Игра'}</span>
        </span>
      `;
    } else if (cat === 'junk') {
      return `
        <span class="app-cat-badge junk">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
          <span>${isEn ? 'Junk' : 'Мусорное'}</span>
        </span>
      `;
    } else if (cat === 'system') {
      return `
        <span class="app-cat-badge system">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/>
          </svg>
          <span>${isEn ? 'System' : 'Система'}</span>
        </span>
      `;
    } else {
      return `
        <span class="app-cat-badge app">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>
          </svg>
          <span>${isEn ? 'Application' : 'Программа'}</span>
        </span>
      `;
    }
  }

  function getAppIconSvg(cat) {
    if (cat === 'game') {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/>
          <line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/>
          <rect width="20" height="12" x="2" y="6" rx="6"/>
        </svg>
      `;
    } else if (cat === 'junk') {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      `;
    } else if (cat === 'system') {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/>
        </svg>
      `;
    } else {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
        </svg>
      `;
    }
  }

  function matchesAppSearch(app, query) {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    const name = (app.name || '').toLowerCase();
    const pub = (app.publisher || '').toLowerCase();

    if (name.includes(q) || pub.includes(q)) return true;

    // Smart aliases
    if (q === 'gta' && name.includes('grand theft auto')) return true;
    if (q === 'cs' && (name.includes('counter-strike') || name.includes('counter strike'))) return true;
    if (q === 'wow' && (name.includes('warcraft') || name.includes('world of warcraft'))) return true;
    if (q === 'cod' && name.includes('call of duty')) return true;
    if (q === 'nfs' && name.includes('need for speed')) return true;
    return false;
  }

  async function loadInstalledApps(forceRefresh = false) {
    if (isLoadingApps && !forceRefresh) return;
    isLoadingApps = true;

    if (allInstalledApps.length === 0 || forceRefresh) {
      if (appsListContainer) {
        appsListContainer.innerHTML = `
          <div class="apps-loading-state">
            <div class="apps-spinner"></div>
            <span>Поиск и расчёт размера установленных приложений...</span>
          </div>
        `;
      }
    }

    try {
      allInstalledApps = await window.api.getInstalledApps();
      updateUninstallerCounters();
      renderInstalledApps();
    } catch (err) {
      console.error('Failed to load installed apps:', err);
      if (appsListContainer) {
        appsListContainer.innerHTML = `
          <div class="apps-empty-state">
            <span>Ошибка при сканировании приложений: ${escapeHtml(String(err))}</span>
          </div>
        `;
      }
    } finally {
      isLoadingApps = false;
    }
  }

  function updateUninstallerCounters() {
    const totalApps = allInstalledApps.length;
    const gameApps = allInstalledApps.filter(a => a.category === 'game');
    const junkApps = allInstalledApps.filter(a => a.category === 'junk');
    const appApps = allInstalledApps.filter(a => a.category === 'app');
    const sysApps = allInstalledApps.filter(a => a.category === 'system');

    if (countAll) countAll.textContent = totalApps;
    if (countGame) countGame.textContent = gameApps.length;
    if (countJunk) countJunk.textContent = junkApps.length;
    if (countApp) countApp.textContent = appApps.length;
    if (countSystem) countSystem.textContent = sysApps.length;

    const isEn = window.i18n?.getLang() === 'en';
    const uGb = isEn ? 'GB' : 'ГБ';
    const uMb = isEn ? 'MB' : 'МБ';

    // Dynamically calculate size and description based on currentCategoryFilter
    let activeList = allInstalledApps;
    let countPrefix = isEn ? 'Total applications:' : 'Всего приложений:';
    let countColor = '#FFFFFF';
    let activeCount = totalApps;
    let sizePrefix = isEn ? 'Total disk space:' : 'Занято на диске:';

    if (currentCategoryFilter === 'game') {
      activeList = gameApps;
      countPrefix = isEn ? 'Games detected:' : 'Игр в системе:';
      countColor = '#FBBF24';
      activeCount = gameApps.length;
      sizePrefix = isEn ? 'Games size:' : 'Занято играми:';
    } else if (currentCategoryFilter === 'junk') {
      activeList = junkApps;
      countPrefix = isEn ? 'Junk apps:' : 'Мусорных программ:';
      countColor = '#F87171';
      activeCount = junkApps.length;
      sizePrefix = isEn ? 'Junk size:' : 'Занято мусором:';
    } else if (currentCategoryFilter === 'app') {
      activeList = appApps;
      countPrefix = isEn ? 'Regular programs:' : 'Обычных программ:';
      countColor = '#818CF8';
      activeCount = appApps.length;
      sizePrefix = isEn ? 'Apps size:' : 'Занято программами:';
    } else if (currentCategoryFilter === 'system') {
      activeList = sysApps;
      countPrefix = isEn ? 'System packages:' : 'Системных пакетов:';
      countColor = '#34D399';
      activeCount = sysApps.length;
      sizePrefix = isEn ? 'System size:' : 'Занято системой:';
    }

    const totalSizeMb = activeList.reduce((acc, a) => acc + (a.estimated_size_mb || 0), 0);
    const totalSizeGb = totalSizeMb >= 1024 ? `${(totalSizeMb / 1024).toFixed(1)} ${uGb}` : `${Math.round(totalSizeMb)} ${uMb}`;
    const hintText = isEn ? 'Click "Force Clean" for instant removal' : 'Нажмите «Принудительно» для быстрой очистки';

    if (uninstallerHeroStats) {
      uninstallerHeroStats.innerHTML = `
        ${countPrefix} <strong style="color: ${countColor};">${activeCount}</strong> • 
        ${sizePrefix} <strong style="color: #60A5FA;">~${totalSizeGb}</strong> • 
        ${hintText}
      `;
    }
  }

  function renderInstalledApps() {
    if (!appsListContainer) return;

    const isEn = window.i18n?.getLang() === 'en';
    const uGb = isEn ? 'GB' : 'ГБ';
    const uMb = isEn ? 'MB' : 'МБ';

    let filtered = [...allInstalledApps];

    // 1. Category Filter (all / game / junk / app / system)
    if (currentCategoryFilter !== 'all') {
      filtered = filtered.filter(a => a.category === currentCategoryFilter);
    }

    // 2. Search Query with Smart Aliases
    if (currentSearchQuery.trim()) {
      filtered = filtered.filter(a => matchesAppSearch(a, currentSearchQuery));
    }

    // 3. Sorting
    if (currentSortMode === 'size') {
      filtered.sort((a, b) => (b.estimated_size_mb || 0) - (a.estimated_size_mb || 0));
    } else if (currentSortMode === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', isEn ? 'en' : 'ru'));
    } else if (currentSortMode === 'date') {
      filtered.sort((a, b) => (b.install_date || '').localeCompare(a.install_date || ''));
    }

    if (filtered.length === 0) {
      appsListContainer.innerHTML = `
        <div class="apps-empty-state">
          <span>${isEn ? 'No applications found matching criteria' : 'Приложения не найдены по заданным критериям'}</span>
        </div>
      `;
      return;
    }

    appsListContainer.innerHTML = filtered.map(app => {
      const sizeMb = app.estimated_size_mb || 0;
      let sizeFormatted = sizeMb >= 1024 ? `${(sizeMb / 1024).toFixed(1)} ${uGb}` : `${Math.round(sizeMb)} ${uMb}`;
      if (sizeMb <= 0) sizeFormatted = '—';

      const cat = app.category || 'app';
      const categoryBadgeHtml = getCategoryBadge(cat);
      const iconPath = app.resolved_icon_path || '';
      const cachedIcon = iconPath ? clientAppIconCache.get(iconPath) : null;

      const iconContentHtml = cachedIcon
        ? `<img src="${cachedIcon}" class="app-real-icon" alt="" />`
        : getAppIconSvg(cat);

      return `
        <div class="app-item-card" data-app-id="${app.id}">
          <div class="app-item-left">
            <div class="app-icon-wrap ${cat}" data-icon-target="${escapeHtml(iconPath)}">
              ${iconContentHtml}
            </div>

            <div class="app-meta-group">
              <div class="app-title-row">
                <span class="app-item-name" title="${escapeHtml(app.name)}">${escapeHtml(app.name)}</span>
                ${categoryBadgeHtml}
              </div>
              <div class="app-sub-row">
                <span class="app-sub-publisher">${escapeHtml(app.publisher || (isEn ? 'Unknown publisher' : 'Неизвестный разработчик'))}</span>
                <span class="app-sub-divider">•</span>
                <span>v${escapeHtml(app.version || '1.0')}</span>
                ${app.install_date && app.install_date !== '—' ? `
                  <span class="app-sub-divider">•</span>
                  <span>${isEn ? 'Installed:' : 'Установлено:'} ${escapeHtml(app.install_date)}</span>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="app-item-right">
            <div class="app-size-badge">
              <span class="app-size-val">${sizeFormatted}</span>
              <span class="app-size-lbl">${isEn ? 'On disk' : 'На диске'}</span>
            </div>

            <div class="app-actions-group">
              <button class="app-action-btn btn-clean-uninstall" data-action="uninstall" data-app-id="${app.id}" title="${isEn ? 'Clean uninstall with leftover scanning' : 'Штатное удаление с поиском остаточных файлов'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>${isEn ? 'Uninstall' : 'Удалить'}</span>
              </button>

              <button class="app-action-btn btn-force-remove" data-action="force" data-app-id="${app.id}" title="${isEn ? 'Force removal without running default uninstaller' : 'Принудительное удаление без запуска штатного деинсталлятора'}">
                <span>${isEn ? 'Force Clean' : 'Принудительно'}</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Asynchronously resolve & inject real app icons
    const iconWrappers = appsListContainer.querySelectorAll('.app-icon-wrap[data-icon-target]');
    iconWrappers.forEach(async (wrap) => {
      const targetPath = wrap.dataset.iconTarget;
      if (!targetPath) return;

      // Skip if real icon already rendered
      if (wrap.querySelector('img.app-real-icon')) return;

      try {
        let dataUrl = clientAppIconCache.get(targetPath);
        if (!dataUrl && window.api?.getAppIcon) {
          dataUrl = await window.api.getAppIcon(targetPath);
          if (dataUrl) {
            clientAppIconCache.set(targetPath, dataUrl);
          }
        }
        if (dataUrl && wrap.dataset.iconTarget === targetPath) {
          wrap.innerHTML = `<img src="${dataUrl}" class="app-real-icon" alt="" />`;
        }
      } catch (err) {
        // Keep fallback SVG
      }
    });

    // Attach click listeners to cards' buttons
    appsListContainer.querySelectorAll('.app-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const appId = btn.dataset.appId;
        const app = allInstalledApps.find(a => a.id === appId);
        if (!app) return;

        if (action === 'uninstall') {
          handleCleanUninstallFlow(app, btn);
        } else if (action === 'force') {
          handleForceRemovalFlow(app, btn);
        }
      });
    });
  }

  async function handleCleanUninstallFlow(app, btn) {
    const isEn = window.i18n?.getLang() === 'en';
    const origText = btn.innerHTML;
    btn.innerHTML = `<span>${isEn ? 'Starting...' : 'Запуск...'}</span>`;
    btn.style.pointerEvents = 'none';

    try {
      const res = await window.api.runStandardUninstall(app);
      if (!res.success && res.error) {
        alert(isEn
          ? `Could not start standard uninstaller: ${res.error}\n\nYou may use the "Force Clean" option.`
          : `Не удалось запустить штатный деинсталлятор: ${res.error}\n\nВы можете воспользоваться кнопкой «Принудительно».`);
        btn.innerHTML = origText;
        btn.style.pointerEvents = '';
        return;
      }

      btn.innerHTML = `<span>${isEn ? 'Scanning leftovers...' : 'Поиск следов...'}</span>`;

      const scanRes = await window.api.scanAppResiduals(app);
      btn.innerHTML = origText;
      btn.style.pointerEvents = '';

      if (scanRes && scanRes.items && scanRes.items.length > 0) {
        showResidualsDialog(app, scanRes.items, scanRes.total_size_mb);
      } else {
        loadInstalledApps(true);
      }
    } catch (err) {
      console.error('Uninstall error:', err);
      btn.innerHTML = origText;
      btn.style.pointerEvents = '';
    }
  }

  async function handleForceRemovalFlow(app, btn) {
    const isEn = window.i18n?.getLang() === 'en';
    const confirmPrompt = confirm(isEn
      ? `Force remove "${app.name}"?\n\nApplication files, registry keys, and temporary directories will be deleted.`
      : `Принудительно удалить «${app.name}»?\n\nФайлы программы, записи реестра и временные данные будут удалены.`);
    if (!confirmPrompt) return;

    const origText = btn.innerHTML;
    btn.innerHTML = `<span>${isEn ? 'Removing...' : 'Удаление...'}</span>`;
    btn.style.pointerEvents = 'none';

    try {
      const res = await window.api.forceRemoveApp(app);
      if (res && res.success) {
        loadInstalledApps(true);
      } else {
        alert(isEn
          ? `Error during force removal: ${(res && res.error) || 'Unknown error'}`
          : `Ошибка при принудительном удалении: ${(res && res.error) || 'Неизвестная ошибка'}`);
      }
    } catch (err) {
      alert(`Error: ${err}`);
    } finally {
      btn.innerHTML = origText;
      btn.style.pointerEvents = '';
    }
  }

  function showResidualsDialog(app, items, totalSizeMb) {
    activeResidualsApp = app;
    currentResidualItems = items;

    const isEn = window.i18n?.getLang() === 'en';
    const uGb = isEn ? 'GB' : 'ГБ';
    const uMb = isEn ? 'MB' : 'МБ';

    if (resTargetAppName) resTargetAppName.textContent = app.name;
    if (resFoundSize) resFoundSize.textContent = totalSizeMb >= 1024 ? `${(totalSizeMb / 1024).toFixed(1)} ${uGb}` : `${totalSizeMb} ${uMb}`;
    
    const fileCount = items.filter(i => i.type !== 'registry').length;
    const regCount = items.filter(i => i.type === 'registry').length;
    if (resFoundFiles) resFoundFiles.textContent = fileCount;
    if (resFoundReg) resFoundReg.textContent = regCount;

    if (residualsItemsTree) {
      residualsItemsTree.innerHTML = items.map((item, idx) => `
        <div class="res-item-row">
          <input type="checkbox" id="res-item-${idx}" data-idx="${idx}" checked>
          <div class="res-item-icon ${item.type === 'registry' ? 'reg' : 'folder'}">
            ${item.type === 'registry' ? `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/>
              </svg>
            ` : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
              </svg>
            `}
          </div>
          <div class="res-item-info">
            <span class="res-item-path" title="${escapeHtml(item.path)}">${escapeHtml(item.path)}</span>
            <span class="res-item-cat">${escapeHtml(item.category || item.type)}</span>
          </div>
          <span class="res-item-size">${item.size_mb > 0 ? (item.size_mb >= 1024 ? `${(item.size_mb / 1024).toFixed(1)} ${uGb}` : `${item.size_mb} ${uMb}`) : ''}</span>
        </div>
      `).join('');
    }

    if (residualsDialog) residualsDialog.showModal();
  }

  // Search Input Events
  uninstallerSearchInput?.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    if (uninstallerSearchClear) {
      uninstallerSearchClear.style.display = currentSearchQuery ? 'block' : 'none';
    }
    renderInstalledApps();
  });

  uninstallerSearchClear?.addEventListener('click', () => {
    if (uninstallerSearchInput) {
      uninstallerSearchInput.value = '';
      currentSearchQuery = '';
      uninstallerSearchClear.style.display = 'none';
      renderInstalledApps();
    }
  });

  // Category Filters (All / Game / Junk / App / System)
  categoryFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryFilterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategoryFilter = btn.dataset.filter || 'all';
      updateUninstallerCounters();
      renderInstalledApps();
    });
  });

  // Sort Filters (Size / Name / Date)
  sortFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sortFilterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSortMode = btn.dataset.sort;
      renderInstalledApps();
    });
  });

  // Residuals Dialog Actions
  residualsToggleAll?.addEventListener('click', () => {
    const isEn = window.i18n?.getLang() === 'en';
    const checkboxes = residualsItemsTree?.querySelectorAll('input[type="checkbox"]');
    if (!checkboxes) return;
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
    residualsToggleAll.textContent = allChecked
      ? (isEn ? 'Select All' : 'Выбрать все')
      : (isEn ? 'Deselect All' : 'Снять выбор');
  });

  residualsBtnPurge?.addEventListener('click', async () => {
    if (!currentResidualItems || currentResidualItems.length === 0) {
      residualsDialog?.close();
      return;
    }

    const isEn = window.i18n?.getLang() === 'en';
    const checkboxes = residualsItemsTree?.querySelectorAll('input[type="checkbox"]');
    const selectedItems = [];
    checkboxes?.forEach(cb => {
      if (cb.checked) {
        const idx = parseInt(cb.dataset.idx, 10);
        if (currentResidualItems[idx]) {
          selectedItems.push(currentResidualItems[idx]);
        }
      }
    });

    residualsBtnPurge.innerHTML = `<span>${isEn ? 'Cleaning...' : 'Очистка...'}</span>`;
    residualsBtnPurge.style.pointerEvents = 'none';

    try {
      await window.api.deleteResiduals(selectedItems);
      residualsDialog?.close();
      loadInstalledApps(true);
    } catch (err) {
      alert(isEn ? `Error while deleting leftovers: ${err}` : `Ошибка при удалении остатков: ${err}`);
    } finally {
      residualsBtnPurge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>${isEn ? 'Clean Leftovers' : 'Очистить остатки'}</span>
      `;
      residualsBtnPurge.style.pointerEvents = '';
    }
  });

  residualsBtnCancel?.addEventListener('click', () => {
    residualsDialog?.close();
    loadInstalledApps(true);
  });

  residualsCloseBtn?.addEventListener('click', () => {
    residualsDialog?.close();
    loadInstalledApps(true);
  });

  // Residuals Dialog Backdrop Close
  if (residualsDialog && !('closedBy' in HTMLDialogElement.prototype)) {
    residualsDialog.addEventListener('click', (event) => {
      if (event.target !== residualsDialog) return;
      const rect = residualsDialog.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) residualsDialog.close();
    });
  }

  // Settings & System Rating Hub Elements
  const topSettingsBtn = document.getElementById('top-settings-btn');
  const settingsDialog = document.getElementById('settings-dialog');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const settingsViewMain = document.getElementById('settings-view-main');
  const settingsViewEula = document.getElementById('settings-view-eula');
  const settingsBtnEulaDone = document.getElementById('settings-btn-eula-done');
  const weiBaseScore = document.getElementById('wei-base-score');
  const weiOsIcon = document.getElementById('wei-os-icon');
  const weiOsName = document.getElementById('wei-os-name');
  const weiOsVersion = document.getElementById('wei-os-version');
  const weiComponentsList = document.getElementById('wei-components-list');
  const settingsToggleAutostart = document.getElementById('settings-toggle-autostart');
  const settingsToggleTray = document.getElementById('settings-toggle-tray');
  const btnOpenEula = document.getElementById('btn-open-eula');
  const eulaDialog = document.getElementById('eula-dialog');
  const eulaCloseBtn = document.getElementById('eula-close-btn');
  const eulaBtnConfirm = document.getElementById('eula-btn-confirm');

  // Official Microsoft Windows Vector Logos
  const WIN11_LOGO_SVG = '<svg width="28" height="28" viewBox="0 0 88 88" fill="none"><path d="M0 0H41.5V41.5H0V0Z" fill="#0078D4"/><path d="M46.5 0H88V41.5H46.5V0Z" fill="#0078D4"/><path d="M0 46.5H41.5V88H0V46.5Z" fill="#0078D4"/><path d="M46.5 46.5H88V88H46.5V46.5Z" fill="#0078D4"/></svg>';
  const WIN10_LOGO_SVG = '<svg width="28" height="28" viewBox="0 0 88 88" fill="none"><path d="M0 12.3L35.7 7.4V41.8H0V12.3Z" fill="#0078D4"/><path d="M40.9 6.7L88 0V41.8H40.9V6.7Z" fill="#0078D4"/><path d="M0 46.2H35.7V80.6L0 75.7V46.2Z" fill="#0078D4"/><path d="M40.9 46.2H88V88L40.9 81.3V46.2Z" fill="#0078D4"/></svg>';
  const WIN_SERVER_LOGO_SVG = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>';

  function renderOsIcon(osNameStr) {
    if (!weiOsIcon) return;
    const lower = (osNameStr || '').toLowerCase();
    if (lower.includes('server')) {
      weiOsIcon.innerHTML = WIN_SERVER_LOGO_SVG;
    } else if (lower.includes('windows 10')) {
      weiOsIcon.innerHTML = WIN10_LOGO_SVG;
    } else {
      weiOsIcon.innerHTML = WIN11_LOGO_SVG;
    }
  }

  // Load and Render System Performance Rating (WEI) and OS Identity
  async function loadSystemRating() {
    if (!weiBaseScore) return;

    // Load OS Info asynchronously
    try {
      const osInfo = await window.api.getOsInfo?.();
      if (osInfo) {
        if (weiOsName && osInfo.name) weiOsName.textContent = osInfo.name;
        if (weiOsVersion && osInfo.subtext) weiOsVersion.textContent = osInfo.subtext;
        renderOsIcon(osInfo.name);
      }
    } catch (osErr) {
      console.warn('Failed to load OS info:', osErr);
    }

    try {
      const data = await window.api.getSystemRating();
      if (!data) return;

      const baseScore = data.base_score || 0;
      weiBaseScore.textContent = baseScore > 0 ? Number(baseScore).toFixed(1) : '—';

      // Fallback OS info from backend data if available
      if (data.os_info) {
        if (weiOsName && data.os_info.name && (!weiOsName.textContent || weiOsName.textContent === 'Windows 11 Pro')) {
          weiOsName.textContent = data.os_info.name;
        }
        if (weiOsVersion && data.os_info.subtext) {
          weiOsVersion.textContent = data.os_info.subtext;
        }
        renderOsIcon(data.os_info.name || weiOsName?.textContent);
      }

      // Render components
      if (data.components && Array.isArray(data.components) && weiComponentsList) {
        const isEn = window.i18n?.getLang() === 'en';
        weiComponentsList.innerHTML = data.components.map(comp => {
          const score = Number(comp.score) || 0;
          const pct = Math.min(100, Math.max(10, Math.round((score / 9.9) * 100)));
          let name = comp.name;
          let desc = comp.desc;
          if (isEn) {
            if (name.includes('Процессор')) { name = 'Processor (CPU)'; desc = 'Calculations per second'; }
            else if (name.includes('Память')) { name = 'Memory (RAM)'; desc = 'Memory operations per second'; }
            else if (name.includes('для игр')) { name = 'Gaming Graphics'; desc = '3D gaming and graphics throughput'; }
            else if (name.includes('Графика')) { name = 'Desktop Graphics'; desc = 'Desktop interface & compositing performance'; }
            else if (name.includes('диск') || name.includes('жесткий')) { name = 'Primary Storage'; desc = 'Disk data transfer rate'; }
          }
          return `
            <div class="wei-component-row">
              <div class="wei-comp-left">
                <span class="wei-comp-name">${name}</span>
                <span class="wei-comp-desc">${desc}</span>
              </div>
              <div class="wei-comp-bar-container">
                <div class="wei-comp-bar-fill" style="width: ${pct}%;"></div>
              </div>
              <span class="wei-comp-val">${score.toFixed(1)}</span>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error('Failed to load system rating:', err);
    }
  }

  // Settings Initialization
  async function initSettingsHub() {
    // 0. Language Selector
    const langButtons = document.querySelectorAll('.lang-pill-btn');
    if (window.i18n) {
      const currentLang = window.i18n.getLang();
      langButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
        btn.addEventListener('click', () => {
          const newLang = btn.dataset.lang;
          if (newLang) {
            window.i18n.setLang(newLang);
            langButtons.forEach(b => b.classList.toggle('active', b.dataset.lang === newLang));
          }
        });
      });
    }

    // 1. Autostart toggle
    if (settingsToggleAutostart) {
      try {
        const isAuto = await window.api.getAutostartStatus();
        settingsToggleAutostart.checked = Boolean(isAuto);
      } catch (_) {}

      settingsToggleAutostart.addEventListener('change', async (e) => {
        const enable = e.target.checked;
        try {
          await window.api.setAutostart(enable);
          const startupToggle = document.getElementById('thecore-autostart-toggle');
          if (startupToggle) {
            startupToggle.checked = enable;
          }
        } catch (err) {
          console.error('Failed to toggle autostart from settings:', err);
        }
      });
    }

    // 2. Tray on close toggle
    const trayPref = localStorage.getItem('thecore_minimize_to_tray') !== 'false';
    if (settingsToggleTray) {
      settingsToggleTray.checked = trayPref;
      settingsToggleTray.addEventListener('change', (e) => {
        localStorage.setItem('thecore_minimize_to_tray', e.target.checked ? 'true' : 'false');
      });
    }

    // 3. Telemetry Rate Selector
    const savedRate = parseInt(localStorage.getItem('thecore_telemetry_rate') || '1500', 10);
    const rateButtons = document.querySelectorAll('.settings-rate-btn');
    rateButtons.forEach(btn => {
      const rate = parseInt(btn.dataset.rate, 10);
      btn.classList.toggle('active', rate === savedRate);
      btn.addEventListener('click', () => {
        rateButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        localStorage.setItem('thecore_telemetry_rate', rate.toString());
        restartTelemetryTimer(rate);
      });
    });

    // 4. In-Game HUD (Overlay) Toggle & Position
    const settingsToggleOverlay = document.getElementById('settings-toggle-overlay');
    const posButtons = document.querySelectorAll('.settings-pos-btn');

    const savedOverlayPref = localStorage.getItem('thecore_overlay_enabled') === 'true';
    const savedPos = localStorage.getItem('thecore_overlay_position') || 'top-right';

    if (settingsToggleOverlay) {
      settingsToggleOverlay.checked = savedOverlayPref;
      if (savedOverlayPref) {
        window.api.setOverlayVisible?.(true);
      }

      settingsToggleOverlay.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('thecore_overlay_enabled', enabled ? 'true' : 'false');
        try {
          await window.api.setOverlayVisible?.(enabled);
        } catch (err) {
          console.error('Failed to set overlay visibility:', err);
        }
      });
    }

    posButtons.forEach(btn => {
      const pos = btn.dataset.pos;
      btn.classList.toggle('active', pos === savedPos);
      btn.addEventListener('click', async () => {
        posButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        localStorage.setItem('thecore_overlay_position', pos);
        try {
          await window.api.setOverlayPosition?.(pos);
        } catch (err) {
          console.error('Failed to set overlay position:', err);
        }
      });
    });

    if (savedPos) {
      window.api.setOverlayPosition?.(savedPos);
    }

    // Listen for overlay toggle from global shortcut (Ctrl+Shift+O)
    window.api.onOverlayStatusChanged?.((enabled) => {
      if (settingsToggleOverlay) {
        settingsToggleOverlay.checked = Boolean(enabled);
      }
      localStorage.setItem('thecore_overlay_enabled', enabled ? 'true' : 'false');
    });
  }

  // Universal Smooth Dialog Close Helper (Liquid Glass fade-out + scale-down)
  function smoothCloseDialog(dialog, onClosed) {
    if (!dialog || !dialog.open) return;
    if (dialog.classList.contains('dialog-closing')) return;
    dialog.classList.add('dialog-closing');
    setTimeout(() => {
      try {
        dialog.close();
      } catch (_) {}
      dialog.classList.remove('dialog-closing');
      if (typeof onClosed === 'function') {
        onClosed();
      }
    }, 180);
  }

  // Settings Modal Sub-view Management
  const settingsModalBody = settingsDialog?.querySelector('.settings-modal-body');

  function showSettingsMainView() {
    if (settingsViewMain) settingsViewMain.style.display = 'flex';
    if (settingsViewEula) settingsViewEula.style.display = 'none';
    if (settingsModalBody) settingsModalBody.scrollTop = 0;
  }

  function showSettingsEulaView() {
    if (settingsViewMain) settingsViewMain.style.display = 'none';
    if (settingsViewEula) settingsViewEula.style.display = 'flex';
    if (settingsModalBody) settingsModalBody.scrollTop = 0;
  }

  function closeSettingsDialog() {
    smoothCloseDialog(settingsDialog, () => {
      showSettingsMainView();
    });
  }

  // Open Settings Modal
  topSettingsBtn?.addEventListener('click', () => {
    try {
      if (settingsDialog && !settingsDialog.open) {
        showSettingsMainView();
        settingsDialog.showModal();
        loadSystemRating();
      }
    } catch (err) {
      console.error('Failed to open settings modal:', err);
    }
  });

  settingsCloseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeSettingsDialog();
  });

  // Switch to Embedded EULA view inside Settings
  btnOpenEula?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSettingsEulaView();
  });

  // Agreement "Готово" button (closes EULA and returns to parameters)
  settingsBtnEulaDone?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSettingsMainView();
  });

  // Settings Dialog Backdrop Close & Escape
  if (settingsDialog) {
    settingsDialog.addEventListener('click', (event) => {
      if (event.target === settingsDialog) {
        const rect = settingsDialog.getBoundingClientRect();
        const isInside = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!isInside && settingsDialog.open) {
          closeSettingsDialog();
        }
      }
    });

    settingsDialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeSettingsDialog();
    });
  }

  // Standalone First-Run / Update EULA Welcome Modal Logic
  const CURRENT_BUILD_ID = '3.3.0_rel_20261022';
  const EULA_CONFIRM_KEY = 'thecore_eula_build_confirmed';

  function closeWelcomeEula(markAccepted = true) {
    if (markAccepted) {
      try {
        localStorage.setItem(EULA_CONFIRM_KEY, CURRENT_BUILD_ID);
        window.api.clearPostInstallEula?.();
      } catch (_) {}
    }
    smoothCloseDialog(eulaDialog);
  }

  eulaCloseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeWelcomeEula(true);
  });

  eulaBtnConfirm?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeWelcomeEula(true);
  });

  if (eulaDialog) {
    eulaDialog.addEventListener('click', (event) => {
      if (event.target === eulaDialog) {
        const rect = eulaDialog.getBoundingClientRect();
        const isInside = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );
        if (!isInside) {
          closeWelcomeEula(true);
        }
      }
    });

    eulaDialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeWelcomeEula(true);
    });
  }

  // Check First Run / Update for Welcome EULA Modal
  async function checkFirstRunEula() {
    try {
      let isPostInstall = false;
      try {
        isPostInstall = await window.api.checkPostInstallEula?.();
      } catch (_) {}
      const lastConfirmedBuild = localStorage.getItem(EULA_CONFIRM_KEY);
      const isNewBuild = lastConfirmedBuild !== CURRENT_BUILD_ID;

      if (isPostInstall || isNewBuild) {
        setTimeout(() => {
          try {
            if (eulaDialog && !eulaDialog.open) {
              eulaDialog.showModal();
            }
          } catch (err) {
            console.error('Failed to open first-run EULA modal:', err);
          }
        }, 600);
      }
    } catch (err) {
      console.error('Failed to check first run EULA:', err);
    }
  }

  // Initial Load
  loadHardware();
  loadStartupItems();
  initTheCoreAutostart();
  initSettingsHub();
  checkFirstRunEula();
  loadUpgradeRecommendations();
  loadOptimizationAnalysis();
  updateLiveMetrics();
});
