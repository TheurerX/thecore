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
    card_ram: "Оперативная память",
    card_storage: "Накопители (SSD/HDD)",
    card_mobo: "Материнская плата",
    card_displays: "Дисплеи и Питание",
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
    gpu_temp_power: "Температура & Энергия",
    gpu_vram: "Видеопамять",
    gpu_bus: "Интерфейс шины",
    gpu_driver: "Версия драйвера",
    gpu_power: "Энергопотребление",
    gpu_fan: "Охлаждение",
    gpu_disp: "Разрешение",

    // RAM Specs
    ram_usage: "Использование RAM",
    ram_speed: "Частота памяти",
    ram_profile: "Профиль DOCP",
    ram_config: "Конфигурация",
    ram_channel: "Режим шины",
    ram_parts: "Маркировка",
    ram_avail: "Доступно памяти",

    // Storage Specs
    storage_sys: "Системный диск",
    storage_count: "Всего накопителей",
    storage_total: "Общий объем",
    storage_bus: "Типы шины",

    // Motherboard & Displays
    mobo_desc: "Системная платформа с поддержкой высокоскоростных интерфейсов PCIe 4.0 и разгона памяти DOCP.",
    mobo_mfg: "Производитель",
    mobo_chipset: "Чипсет платы",
    mobo_bios: "Версия BIOS",
    mobo_date: "Дата BIOS",
    mobo_socket: "Сокет процессора",
    mobo_pcie: "Шина PCIe",

    psu_desc: "Расчет пикового энергопотребления системы при полной синхронной нагрузке на CPU и GPU.",
    psu_disp_label: "Монитор",
    psu_disp_mode: "Режим работы",
    psu_load_split: "Нагрузка CPU/GPU",
    psu_peak: "Пиковое потребление",
    psu_rec_w: "Рекомендуемый БП",
    psu_cert_label: "Сертификат БП",

    // Optimization / Cleanup View
    opt_badge_express: "Экспресс-аудит",
    opt_badge_eval: "Оценка состояния системы",
    opt_auto_monitoring: "Автоматический мониторинг",
    opt_hero_idle_title: "Анализ ресурсов системы...",
    opt_hero_idle_desc: "Сканирование оперативной памяти, временных файлов, кэша шейдеров и фоновых приложений.",
    opt_step_launchers: "Фоновые лаунчеры",
    opt_step_ram: "Кэш памяти RAM",
    opt_step_temp: "Файлы %TEMP%",
    opt_step_shaders: "Шейдеры GPU",
    opt_card_ram_title: "Оперативная память",
    opt_card_ram_sub: "Кэш и рабочий набор",
    opt_caption_ram: "потенциал сброса кэша RAM",
    opt_ram_now_label: "Текущая загрузка:",
    opt_ram_method_label: "Метод оптимизации:",
    opt_ram_method_val: "Очистка страниц Win32 API",
    opt_card_temp_title: "Системный мусор",
    opt_card_temp_sub: "Каталог %TEMP%",
    opt_card_temp_badge: "Временные файлы",
    opt_caption_temp: "накоплено временных файлов",
    opt_temp_count_label: "Количество файлов:",
    opt_temp_safe_label: "Безопасность:",
    opt_temp_safe_val: "Пропуск заблокированных",
    opt_card_shader_title: "Кэш шейдеров GPU",
    opt_card_shader_sub: "DirectX / Vulkan / NVIDIA / AMD",
    opt_caption_shader: "размер дискового кэша шейдеров",
    opt_shader_count_label: "Файлов шейдеров:",
    opt_shader_impact_label: "Влияние:",
    opt_shader_impact_val: "Устранение статтеров игр",
    opt_card_apps_title: "Фоновые клиенты",
    opt_card_apps_sub: "Лаунчеры и авто-апдейтеры",
    opt_caption_apps: "потребляют активные клиенты",
    opt_apps_count_label: "Найдено процессов:",
    opt_res_ram: "Освобождено RAM",
    opt_res_temp: "Очищено кэша и %TEMP%",
    opt_res_procs: "Выгружено процессов",
    opt_res_ram_cur: "Текущая загрузка RAM",

    // Uninstaller View
    uninst_badge: "Менеджер программ",
    uninst_title: "Установленные приложения",
    uninst_scanning: "Сканирование реестра и хранилища Windows...",
    uninst_search_placeholder: "Поиск по названию или издателю...",
    uninst_search_clear: "Очистить поиск",
    uninst_filter_all: "Все",
    uninst_filter_game: "Игры",
    uninst_filter_junk: "Мусорные",
    uninst_filter_app: "Программы",
    uninst_filter_system: "Система",
    uninst_sort_label: "Сортировка:",
    uninst_sort_size: "По размеру",
    uninst_sort_name: "По имени",
    uninst_sort_date: "По дате",
    uninst_loading: "Поиск и расчёт размера установленных приложений...",
    uninst_btn_uninstall: "Удалить",
    uninst_btn_force: "Принудительно",
    uninst_lbl_ondisk: "На диске",
    uninst_lbl_installed: "Установлено:",
    uninst_unknown_pub: "Неизвестный разработчик",
    uninst_empty: "Приложения не найдены по заданным критериям",

    // Startup View
    startup_header_title: "Активные программы в автозагрузке Windows",
    startup_header_desc: "Отображаются только те процессы, которые сейчас реально включены и запускаются при старте Windows.",
    startup_active_summary: "Активных процессов:",
    thecore_autostart_tag: "Фоновый режим",
    thecore_autostart_impact: "Низкое влияние (~0.05 сек)",
    thecore_autostart_rec: "Рекомендуется",
    thecore_autostart_info: "Бесшумный запуск в системный трей при включении Windows для непрерывного мониторинга датчиков и мгновенной оптимизации.",
    thecore_autostart_toggle_title: "Включить / Отключить автозапуск TheCore",
    startup_empty: "В автозагрузке Windows нет активных сторонних приложений",
    startup_toggle_title: "Отключить автозапуск",

    // Upgrade View
    upgrade_xmp_title: "Оптимизация частоты памяти: включить XMP / DOCP в BIOS",
    upgrade_xmp_badge: "Штатная частота SPD",
    upgrade_empty: "Конфигурация сбалансирована. Узких мест в текущей системе не обнаружено.",

    // Modals
    detail_modal_title: "Спецификация компонента",
    residuals_title: "Найденные остатки",
    residuals_app_label: "Приложение",
    residuals_stat_disk: "Мусора на диске",
    residuals_stat_files: "Папок и файлов",
    residuals_stat_reg: "Записей реестра",
    residuals_items_found: "Обнаруженные остаточные элементы:",
    residuals_unselect_all: "Снять выбор",
    residuals_select_all: "Выбрать все",
    residuals_btn_cancel: "Пропустить",
    residuals_btn_purge: "Очистить остатки",

    // Settings Modal (TheCore Hub)
    settings_header_title: "Параметры и оценка системы",
    settings_wei_title: "Индекс производительности Windows",
    wei_score_title: "Базовый балл системы",
    wei_score_caption: "Определяется по наименьшей оценке компонента",
    settings_section_general: "Основные параметры",
    settings_lang_label: "Язык интерфейса",
    settings_autostart_label: "Автозагрузка вместе с Windows",
    settings_autostart_sub: "Бесшумный запуск в системный трей без всплывающего окна (--hidden)",
    settings_tray_label: "Сворачивать в системный трей при закрытии",
    settings_tray_sub: "При нажатии на крестик окно скрывается, продолжая безопасный фоновый мониторинг",
    settings_poll_label: "Частота опроса телеметрии",
    settings_poll_desc: "Интервал снятия показаний датчиков процессора, видеокарты и памяти",
    settings_rate_fast: "1.5 сек (Баланс)",
    settings_rate_slow: "3.0 сек (Эко)",
    settings_hud_label: "Игровой оверлей (In-Game HUD)",
    settings_hud_desc: "Стеклянный виджет FPS, температур и нагрузки поверх игр без риска бана и инпут-лага",
    settings_hud_pos_label: "Расположение оверлея на экране",
    settings_hud_pos_desc: "Угол отображения игрового виджета во время игры",
    settings_pos_tr: "Верх-Право",
    settings_pos_tl: "Верх-Лево",
    settings_pos_br: "Низ-Право",
    settings_pos_bl: "Низ-Лево",
    settings_about_title: "О программе и разработчике",
    settings_about_author: "Автор и разработчик: Theurer",
    settings_about_privacy: "Offline-First • Zero-Telemetry • 100% приватность",
    settings_eula_link: "Лицензионное соглашение",
    settings_eula_done: "Готово",
    eula_welcome_confirm: "Понятно"
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
    card_storage: "Storage (SSD/HDD)",
    card_mobo: "Motherboard",
    card_displays: "Displays & Power",
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
    gpu_temp_power: "Temperature & Power",
    gpu_vram: "VRAM",
    gpu_bus: "Bus Interface",
    gpu_driver: "Driver Version",
    gpu_power: "Power Draw",
    gpu_fan: "Cooling",
    gpu_disp: "Resolution",

    // RAM Specs
    ram_usage: "RAM Usage",
    ram_speed: "Memory Speed",
    ram_profile: "DOCP Profile",
    ram_config: "Configuration",
    ram_channel: "Bus Mode",
    ram_parts: "Part Number",
    ram_avail: "Available Memory",

    // Storage Specs
    storage_sys: "System Drive",
    storage_count: "Total Drives",
    storage_total: "Total Capacity",
    storage_bus: "Bus Types",

    // Motherboard & Displays
    mobo_desc: "System platform supporting high-speed PCIe 4.0 interfaces and DOCP memory overclocking.",
    mobo_mfg: "Manufacturer",
    mobo_chipset: "Chipset",
    mobo_bios: "BIOS Version",
    mobo_date: "BIOS Date",
    mobo_socket: "CPU Socket",
    mobo_pcie: "PCIe Bus",

    psu_desc: "Estimated peak power consumption at full synchronized CPU and GPU load.",
    psu_disp_label: "Display",
    psu_disp_mode: "Display Mode",
    psu_load_split: "CPU / GPU Load",
    psu_peak: "Peak Consumption",
    psu_rec_w: "Recommended PSU",
    psu_cert_label: "PSU Efficiency",

    // Optimization / Cleanup View
    opt_badge_express: "Express Audit",
    opt_badge_eval: "System Health Assessment",
    opt_auto_monitoring: "Continuous Monitoring",
    opt_hero_idle_title: "Analyzing system resources...",
    opt_hero_idle_desc: "Scanning RAM, temporary files, GPU shader caches, and background apps.",
    opt_step_launchers: "Background Launchers",
    opt_step_ram: "RAM Cache",
    opt_step_temp: "%TEMP% Files",
    opt_step_shaders: "GPU Shaders",
    opt_card_ram_title: "Memory (RAM)",
    opt_card_ram_sub: "Cache & Working Set",
    opt_caption_ram: "reclaimable RAM cache",
    opt_ram_now_label: "Current load:",
    opt_ram_method_label: "Method:",
    opt_ram_method_val: "Win32 API EmptyWorkingSet",
    opt_card_temp_title: "System Junk",
    opt_card_temp_sub: "Directory %TEMP%",
    opt_card_temp_badge: "Temporary Files",
    opt_caption_temp: "accumulated temporary files",
    opt_temp_count_label: "File count:",
    opt_temp_safe_label: "Safety:",
    opt_temp_safe_val: "Skip locked files",
    opt_card_shader_title: "GPU Shader Cache",
    opt_card_shader_sub: "DirectX / Vulkan / NVIDIA / AMD",
    opt_caption_shader: "on-disk shader cache size",
    opt_shader_count_label: "Shader files:",
    opt_shader_impact_label: "Effect:",
    opt_shader_impact_val: "Prevents gaming stutter",
    opt_card_apps_title: "Background Clients",
    opt_card_apps_sub: "Launchers & updaters",
    opt_caption_apps: "used by active clients",
    opt_apps_count_label: "Processes found:",
    opt_res_ram: "RAM Released",
    opt_res_temp: "Cleaned Cache & %TEMP%",
    opt_res_procs: "Closed Processes",
    opt_res_ram_cur: "Current RAM Load",

    // Uninstaller View
    uninst_badge: "Software Manager",
    uninst_title: "Installed Applications",
    uninst_scanning: "Scanning Windows registry and disk storage...",
    uninst_search_placeholder: "Search by name or publisher...",
    uninst_search_clear: "Clear search",
    uninst_filter_all: "All",
    uninst_filter_game: "Games",
    uninst_filter_junk: "Junk",
    uninst_filter_app: "Applications",
    uninst_filter_system: "System",
    uninst_sort_label: "Sort by:",
    uninst_sort_size: "Size",
    uninst_sort_name: "Name",
    uninst_sort_date: "Date",
    uninst_loading: "Scanning and calculating application sizes...",
    uninst_btn_uninstall: "Uninstall",
    uninst_btn_force: "Force Clean",
    uninst_lbl_ondisk: "On disk",
    uninst_lbl_installed: "Installed:",
    uninst_unknown_pub: "Unknown publisher",
    uninst_empty: "No applications found matching criteria",

    // Startup View
    startup_header_title: "Active Windows Startup Applications",
    startup_header_desc: "Displays only applications currently enabled and starting with Windows.",
    startup_active_summary: "Active processes:",
    thecore_autostart_tag: "Background Mode",
    thecore_autostart_impact: "Low Impact (~0.05s)",
    thecore_autostart_rec: "Recommended",
    thecore_autostart_info: "Silent startup to system tray on Windows boot for continuous sensor monitoring and instant maintenance.",
    thecore_autostart_toggle_title: "Toggle TheCore autostart",
    startup_empty: "No active third-party startup applications",
    startup_toggle_title: "Disable autostart",

    // Upgrade View
    upgrade_xmp_title: "Memory Speed Optimization: enable XMP / DOCP in BIOS",
    upgrade_xmp_badge: "Factory SPD Frequency",
    upgrade_empty: "System is well-balanced. No hardware bottlenecks detected.",

    // Modals
    detail_modal_title: "Component Specification",
    residuals_title: "Leftover Traces",
    residuals_app_label: "Application",
    residuals_stat_disk: "Disk Space",
    residuals_stat_files: "Folders & Files",
    residuals_stat_reg: "Registry Keys",
    residuals_items_found: "Detected leftover items:",
    residuals_unselect_all: "Deselect All",
    residuals_select_all: "Select All",
    residuals_btn_cancel: "Skip",
    residuals_btn_purge: "Clean Leftovers",

    // Settings Modal (TheCore Hub)
    settings_header_title: "Settings & System Performance",
    settings_wei_title: "Windows Experience Index",
    wei_score_title: "System Base Score",
    wei_score_caption: "Determined by the lowest subscore",
    settings_section_general: "Preferences",
    settings_lang_label: "Interface Language",
    settings_autostart_label: "Start with Windows",
    settings_autostart_sub: "Silent launch minimized to system tray on boot (--hidden)",
    settings_tray_label: "Minimize to system tray on close",
    settings_tray_sub: "Closing window hides it to tray, keeping sensor monitoring active",
    settings_poll_label: "Sensor Polling Interval",
    settings_poll_desc: "Sampling frequency for CPU, GPU, and RAM telemetry",
    settings_rate_fast: "1.5s (Balanced)",
    settings_rate_slow: "3.0s (Eco)",
    settings_hud_label: "In-Game HUD Overlay",
    settings_hud_desc: "Glass overlay for FPS, temperatures, and load in games with zero ban risk",
    settings_hud_pos_label: "Overlay Screen Position",
    settings_hud_pos_desc: "Screen corner for in-game telemetry display",
    settings_pos_tr: "Top Right",
    settings_pos_tl: "Top Left",
    settings_pos_br: "Bottom Right",
    settings_pos_bl: "Bottom Left",
    settings_about_title: "About & Author",
    settings_about_author: "Author & Developer: Theurer",
    settings_about_privacy: "Offline-First • Zero-Telemetry • 100% Privacy",
    settings_eula_link: "License Agreement",
    settings_eula_done: "Done",
    eula_welcome_confirm: "Acknowledge"
  }
};

class I18nManager {
  constructor() {
    this.currentLang = this.detectInitialLanguage();
  }

  detectInitialLanguage() {
    const saved = localStorage.getItem(I18N_STORAGE_KEY);
    if (saved && (saved === 'ru' || saved === 'en')) {
      return saved;
    }
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
    // 1. Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text) {
        el.textContent = text;
      }
    });

    // 2. Elements with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (text) {
        el.title = text;
      }
    });

    // 3. Elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text) {
        el.placeholder = text;
      }
    });

    // 4. Update language switcher pill buttons
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
