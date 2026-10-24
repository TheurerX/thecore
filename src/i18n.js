// TheCore Internationalization (i18n) Module
// Clean, technical, non-marketing terminology

const I18N_STORAGE_KEY = 'thecore_language';

const translations = {
  ru: {
    // Navigation
    nav_dashboard: "Обзор системы",
    nav_optimize: "Очистка",
    nav_uninstaller: "Деинсталлятор",
    nav_startup: "Автозагрузка",
    nav_upgrade: "Апгрейд",

    // Header
    top_clean_btn: "Очистить",
    top_clean_tooltip: "Очистить память и кэш",
    top_settings_tooltip: "Параметры и система",
    win_min: "Свернуть",
    win_close: "Закрыть",

    // Dashboard Cards
    card_cpu: "Процессор (CPU)",
    card_gpu: "Видеокарта (GPU)",
    card_ram: "Оперативная память (RAM)",
    card_mb: "Материнская плата",
    card_disks: "Накопители",
    card_psu: "Дисплеи и питание",
    card_details: "Детали",
    card_loading: "Загрузка данных...",

    // CPU Specs
    cpu_usage: "Загрузка ядер",
    cpu_socket: "Сокет",
    cpu_cores: "Ядра / Потоки",
    cpu_clock: "Базовая частота",
    cpu_cache: "Кэш L2 / L3",
    cpu_arch: "Архитектура",
    cpu_tdp: "Расчетный TDP",

    // GPU Specs
    gpu_vram: "Видеопамять",
    gpu_clock: "Частота ядра",
    gpu_fan: "Вентиляторы",
    gpu_temp: "Температура",
    gpu_power: "Энергопотребление",
    gpu_driver: "Драйвер",
    gpu_bus: "Интерфейс",

    // RAM Specs
    ram_usage: "Использовано",
    ram_speed: "Частота",
    ram_channels: "Каналы",
    ram_slots: "Разъемы",
    ram_type: "Тип",

    // Motherboard & PSU
    mb_model: "Модель",
    mb_chipset: "Чипсет",
    mb_bios: "Версия BIOS",
    psu_est: "Расчетная нагрузка",
    psu_rec: "Рекомендованный БП",

    // Optimization / Cleanup View
    opt_title: "Обслуживание системы",
    opt_desc: "Анализ и высвобождение зарезервированной оперативной памяти, удаление временных файлов и кэша шейдеров.",
    opt_status: "Статус системы",
    opt_potential: "Потенциал высвобождения",
    opt_btn_run: "Выполнить очистку",
    opt_step1: "Закрытие фоновых клиентов",
    opt_step2: "Сброс неиспользуемой памяти",
    opt_step3: "Очистка временных файлов",
    opt_step4: "Очистка кэша шейдеров",
    opt_res_ram: "Высвобождено RAM",
    opt_res_temp: "Очищено %TEMP%",
    opt_res_shaders: "Кэш шейдеров",
    opt_res_procs: "Выгружено процессов",
    opt_auto_chip: "Фоновый мониторинг активен",

    // Startup View
    startup_title: "Управление автозагрузкой",
    startup_desc: "Программы, запускающиеся вместе с операционной системой Windows.",
    startup_search: "Поиск по списку программ...",
    thecore_autostart_title: "Автозапуск TheCore",
    thecore_autostart_desc: "Запуск приложения в фоновом режиме системного трея при старте Windows.",
    startup_impact_low: "Низкое влияние",
    startup_impact_med: "Среднее влияние",
    startup_impact_high: "Высокое влияние",
    startup_toggle_on: "Включено",
    startup_toggle_off: "Отключено",

    // Upgrade View
    upgrade_title: "Анализ платформы",
    upgrade_desc: "Технический анализ совместимости и подбор комплектующих под текущий сокет.",
    upgrade_xmp_title: "Оптимизация частоты памяти (XMP)",
    upgrade_xmp_desc: "Обнаружен заводской профиль XMP в чипе SPD. Память может работать быстрее на штатной частоте после включения профиля в BIOS.",
    upgrade_best_cpu: "Оптимальный процессор под сокет",
    upgrade_best_gpu: "Рекомендуемая видеокарта",

    // Settings Modal (TheCore Hub)
    settings_title: "Параметры и система",
    settings_section_general: "Основные параметры",
    settings_lang_label: "Язык интерфейса",
    settings_autostart_label: "Автозапуск с Windows",
    settings_autostart_sub: "Запуск в свернутом виде в системный трей.",
    settings_tray_label: "Сворачивать при закрытии",
    settings_tray_sub: "При клике на крестик окно сворачивается в трей вместо выхода.",
    settings_poll_label: "Частота опроса датчиков",
    settings_section_privacy: "Конфиденциальность и безопасность",
    settings_privacy_badge: "100% Offline-First",
    settings_privacy_desc: "TheCore не делает сетевых запросов, не содержит аналитики и работает полностью автономно.",
    settings_eula_btn: "Лицензионное соглашение (EULA)",
    settings_section_wei: "Индекс производительности Windows (WEI)",
    settings_close: "Закрыть",

    // Overlay (HUD)
    hud_title: "Игровой оверлей",
    hud_hotkey: "Хоткей: Ctrl+Shift+O"
  },

  en: {
    // Navigation
    nav_dashboard: "System Overview",
    nav_optimize: "Cleanup",
    nav_uninstaller: "Uninstaller",
    nav_startup: "Startup",
    nav_upgrade: "Upgrade",

    // Header
    top_clean_btn: "Clean",
    top_clean_tooltip: "Flush memory & clear cache",
    top_settings_tooltip: "Settings & System",
    win_min: "Minimize",
    win_close: "Close",

    // Dashboard Cards
    card_cpu: "Processor (CPU)",
    card_gpu: "Graphics Card (GPU)",
    card_ram: "Memory (RAM)",
    card_mb: "Motherboard",
    card_disks: "Storage Drives",
    card_psu: "Displays & Power",
    card_details: "Details",
    card_loading: "Loading telemetry...",

    // CPU Specs
    cpu_usage: "Core Load",
    cpu_socket: "Socket",
    cpu_cores: "Cores / Threads",
    cpu_clock: "Base Clock",
    cpu_cache: "Cache L2 / L3",
    cpu_arch: "Architecture",
    cpu_tdp: "Rated TDP",

    // GPU Specs
    gpu_vram: "VRAM",
    gpu_clock: "Core Clock",
    gpu_fan: "Fans",
    gpu_temp: "Temperature",
    gpu_power: "Power Draw",
    gpu_driver: "Driver",
    gpu_bus: "Interface",

    // RAM Specs
    ram_usage: "Used",
    ram_speed: "Speed",
    ram_channels: "Channels",
    ram_slots: "Slots",
    ram_type: "Type",

    // Motherboard & PSU
    mb_model: "Model",
    mb_chipset: "Chipset",
    mb_bios: "BIOS Version",
    psu_est: "Estimated Load",
    psu_rec: "Recommended PSU",

    // Optimization / Cleanup View
    opt_title: "System Maintenance",
    opt_desc: "Analyze and release unreferenced memory, remove temporary files and graphics shader caches.",
    opt_status: "System Status",
    opt_potential: "Reclaimable Resources",
    opt_btn_run: "Run Cleanup",
    opt_step1: "Closing background clients",
    opt_step2: "Flushing unreferenced memory",
    opt_step3: "Purging temporary files",
    opt_step4: "Purging shader cache",
    opt_res_ram: "RAM Released",
    opt_res_temp: "%TEMP% Cleaned",
    opt_res_shaders: "Shader Cache",
    opt_res_procs: "Clients Closed",
    opt_auto_chip: "Live audit active",

    // Startup View
    startup_title: "Startup Applications",
    startup_desc: "Programs configured to launch automatically with Windows.",
    startup_search: "Search startup apps...",
    thecore_autostart_title: "TheCore Autostart",
    thecore_autostart_desc: "Start minimized to system tray on Windows boot.",
    startup_impact_low: "Low Impact",
    startup_impact_med: "Medium Impact",
    startup_impact_high: "High Impact",
    startup_toggle_on: "Enabled",
    startup_toggle_off: "Disabled",

    // Upgrade View
    upgrade_title: "Platform Upgrade Analysis",
    upgrade_desc: "Architecture analysis and component matching for your current motherboard socket.",
    upgrade_xmp_title: "Memory Speed Optimization (XMP)",
    upgrade_xmp_desc: "Factory XMP profile detected in SPD chip. Memory can run at higher rated frequency once enabled in BIOS.",
    upgrade_best_cpu: "Best CPU for current socket",
    upgrade_best_gpu: "Recommended Graphics Card",

    // Settings Modal (TheCore Hub)
    settings_title: "Settings & System",
    settings_section_general: "Preferences",
    settings_lang_label: "Interface Language",
    settings_autostart_label: "Start with Windows",
    settings_autostart_sub: "Launch minimized to system tray on boot.",
    settings_tray_label: "Minimize on close",
    settings_tray_sub: "Close button minimizes to tray instead of quitting.",
    settings_poll_label: "Sensor Polling Interval",
    settings_section_privacy: "Privacy & Security",
    settings_privacy_badge: "100% Offline-First",
    settings_privacy_desc: "TheCore makes zero network requests, contains zero trackers, and operates fully offline.",
    settings_eula_btn: "License Agreement (EULA)",
    settings_section_wei: "Windows Experience Index (WEI)",
    settings_close: "Close",

    // Overlay (HUD)
    hud_title: "In-Game HUD",
    hud_hotkey: "Hotkey: Ctrl+Shift+O"
  }
};

class I18nManager {
  constructor() {
    this.currentLang = this.detectInitialLanguage();
  }

  detectInitialLanguage() {
    // 1. Check saved user preference
    const saved = localStorage.getItem(I18N_STORAGE_KEY);
    if (saved && (saved === 'ru' || saved === 'en')) {
      return saved;
    }
    // 2. Check system locale
    const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (navLang.startsWith('ru') || navLang.startsWith('be') || navLang.startsWith('uk') || navLang.startsWith('kk')) {
      return 'ru';
    }
    return 'en';
  }

  getLang() {
    return this.currentLang;
  }

  setLang(lang) {
    if (lang !== 'ru' && lang !== 'en') return;
    this.currentLang = lang;
    localStorage.setItem(I18N_STORAGE_KEY, lang);
    this.applyToDOM();
    document.dispatchEvent(new CustomEvent('thecore:language_changed', { detail: { lang } }));
  }

  t(key, fallback = '') {
    const dict = translations[this.currentLang] || translations.en;
    return dict[key] !== undefined ? dict[key] : (fallback || key);
  }

  applyToDOM() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        el.textContent = text;
      }
    });

    // Update tooltips / titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (text) {
        el.title = text;
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text) {
        el.placeholder = text;
      }
    });

    // Update active lang switcher state
    document.querySelectorAll('.lang-pill-btn').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === this.currentLang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.documentElement.lang = this.currentLang;
  }
}

// Global instance
window.i18n = new I18nManager();
