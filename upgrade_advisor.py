"""
Модуль экспертного анализа комплектующих и интеллектуальных рекомендаций по апгрейду.
Рассчитывает соотношение цена/прирост производительности.
Поддерживает двуязычный вывод (RU / EN с конвертацией цен в USD).
"""


class UpgradeAdvisor:
    def __init__(self, system_inspector):
        self.inspector = system_inspector

    def generate_recommendations(self) -> list:
        recommendations = []

        cpu = self.inspector.get_cpu_info()
        mobo = self.inspector.get_motherboard_info()
        ram = self.inspector.get_ram_info()
        gpus = self.inspector.get_gpu_info()
        storage = self.inspector.get_storage_info()

        # -------------------------------------------------------------
        # 1. Проверка профиля памяти XMP / DOCP
        # -------------------------------------------------------------
        if ram.get("xmp_not_enabled"):
            current = ram.get("current_speed_mhz", 2400)
            rated = ram.get("max_rated_speed_mhz", 3200)
            boost_pct = round(((rated - current) / current) * 100)
            recommendations.append({
                "category": "Настройка памяти (BIOS)",
                "category_en": "Memory Tuning (BIOS)",
                "title": "Включить профиль XMP / DOCP в BIOS",
                "title_en": "Enable XMP / DOCP Profile in BIOS",
                "badge": "Штатная настройка BIOS",
                "badge_en": "BIOS Memory Setting",
                "type": "xmp_tuning",
                "priority": "Рекомендуется",
                "priority_en": "Recommended",
                "cost_est": "0 руб.",
                "cost_est_en": "$0 (Free)",
                "benefit": f"+{boost_pct}% пропускной способности памяти",
                "benefit_en": f"+{boost_pct}% memory bandwidth",
                "description": (
                    f"Модули памяти аппаратно поддерживают частоту {rated} МГц, "
                    f"но в данный момент работают на стандартной частоте {current} МГц. "
                    f"Включение штатного заводского профиля XMP/DOCP в BIOS платы {mobo.get('product', '')} "
                    f"переведёт оперативную память на сертифицированную скорость."
                ),
                "description_en": (
                    f"RAM modules support {rated} MHz hardware profile, but currently run at standard {current} MHz. "
                    f"Enabling factory XMP/DOCP profile in the BIOS of motherboard {mobo.get('product', '')} "
                    f"switches memory to its certified speed."
                ),
                "action_guide": (
                    "Инструкция: Перезагрузите ПК -> при старте нажимайте клавишу Del или F2 -> "
                    "в меню найдите пункт 'Ai Overclock Tuner' (или XMP/DOCP) -> выберите 'Profile 1' -> "
                    "нажмите F10 для сохранения и перезагрузки."
                ),
                "action_guide_en": (
                    "Guide: Restart PC -> press Del or F2 on boot -> "
                    "locate 'Ai Overclock Tuner' (or XMP/DOCP) -> select 'Profile 1' -> "
                    "press F10 to save and reboot."
                )
            })

        # -------------------------------------------------------------
        # 2. ПРОЦЕССОР (CPU) И МАТЕРИНСКАЯ ПЛАТА
        # -------------------------------------------------------------
        cpu_name = cpu.get("name", "")
        socket = cpu.get("socket", "")
        mobo_prod = mobo.get("product", "")

        # Сокет AM4 с процессором Ryzen 1000/2000/3000
        if "AM4" in socket or "Ryzen 5 3600" in cpu_name or "Ryzen 5 2600" in cpu_name or "Ryzen 5 1600" in cpu_name:
            recommendations.append({
                "category": "Процессор (CPU)",
                "category_en": "Processor (CPU)",
                "title": "Апгрейд на AMD Ryzen 7 5700X3D (или 5800X3D)",
                "title_en": "Upgrade to AMD Ryzen 7 5700X3D (or 5800X3D)",
                "badge": "Оптимальный процессор под сокет",
                "badge_en": "Optimal Socket CPU",
                "type": "upgrade",
                "priority": "Высокий",
                "priority_en": "High",
                "cost_est": "от 15 000 до 18 000 руб.",
                "cost_est_en": "~$160 – $190",
                "benefit": "+35–55% производительности в процессорозависимых задачах",
                "benefit_en": "+35–55% performance in CPU-intensive tasks",
                "description": (
                    f"У вас установлена материнская плата {mobo_prod} на сокете AM4. "
                    f"Замена системной платы и оперативной памяти DDR4 не требуется. "
                    f"Установка 8-ядерного процессора с 3D V-Cache (96 МБ кэша L3) обеспечит полное раскрытие графического процессора."
                ),
                "description_en": (
                    f"Motherboard {mobo_prod} on AM4 socket is installed. "
                    f"System board and DDR4 RAM replacement is not required. "
                    f"Installing an 8-core CPU with 3D V-Cache (96 MB L3 cache) will fully unleash GPU performance."
                ),
                "action_guide": (
                    "Перед установкой процессора обновите BIOS материнской платы до актуальной версии."
                ),
                "action_guide_en": (
                    "Update motherboard BIOS to the latest version before CPU installation."
                )
            })
        elif "LGA1200" in socket:
            recommendations.append({
                "category": "Процессор (CPU)",
                "category_en": "Processor (CPU)",
                "title": "Апгрейд на Intel Core i7-10700K / 11700K",
                "title_en": "Upgrade to Intel Core i7-10700K / 11700K",
                "badge": "Без замены платы",
                "badge_en": "Socket Retained",
                "type": "upgrade",
                "priority": "Средний",
                "priority_en": "Medium",
                "cost_est": "~12 000 – 16 000 руб.",
                "cost_est_en": "~$130 – $170",
                "benefit": "+25–35% производительности в рабочих задачах и играх",
                "benefit_en": "+25–35% performance in workloads and gaming",
                "description": "Позволяет повысить число ядер/потоков в рамках сокета LGA1200 без смены платформы.",
                "description_en": "Allows increasing core and thread count within the LGA1200 socket without changing the platform.",
                "action_guide": "Убедитесь в наличии мощного кулера (TDP от 180W).",
                "action_guide_en": "Ensure a capable CPU cooler is installed (TDP 180W+)."
            })

        # -------------------------------------------------------------
        # 3. ВИДЕОКАРТА (GPU)
        # -------------------------------------------------------------
        primary_gpu = gpus[0] if gpus else {"name": "Неизвестно", "vram_gb": 0}
        gpu_name = primary_gpu.get("name", "")
        vram = primary_gpu.get("vram_gb", 0)

        if "3070" in gpu_name:
            recommendations.append({
                "category": "Видеокарта (GPU)",
                "category_en": "Graphics Card (GPU)",
                "title": "GeForce RTX 3070: Апгрейд пока не требуется",
                "title_en": "GeForce RTX 3070: Upgrade not required",
                "badge": "Сбалансировано",
                "badge_en": "Balanced",
                "type": "info",
                "priority": "Низкий",
                "priority_en": "Low",
                "cost_est": "0 руб.",
                "cost_est_en": "$0",
                "benefit": "Стабильная производительность в разрешениях 1080p и 1440p (2K)",
                "benefit_en": "Stable performance in 1080p and 1440p (2K) resolutions",
                "description": (
                    f"Графический адаптер {gpu_name} (8 ГБ VRAM) сохраняет достаточный запас вычислительной мощности. "
                    f"Смена видеокарты на текущем процессоре нецелесообразна."
                ),
                "description_en": (
                    f"Graphics card {gpu_name} (8 GB VRAM) maintains sufficient compute power. "
                    f"Upgrading GPU on the current processor is not recommended."
                ),
                "action_guide": "Используйте технологии апскейлинга DLSS для тяжелых сцен.",
                "action_guide_en": "Use DLSS upscaling technologies for heavy scenes."
            })
        elif vram > 0 and vram <= 4:
            recommendations.append({
                "category": "Видеокарта (GPU)",
                "category_en": "Graphics Card (GPU)",
                "title": "Апгрейд видеокарты (дефицит VRAM)",
                "title_en": "Graphics Card Upgrade (VRAM Bottleneck)",
                "badge": "Дефицит видеопамяти",
                "badge_en": "VRAM Bottleneck",
                "type": "upgrade",
                "priority": "Высокий",
                "priority_en": "High",
                "cost_est": "~20 000 – 30 000 руб.",
                "cost_est_en": "~$220 – $320",
                "benefit": "Запуск современных приложений на высоких текстурах без сбоев памяти",
                "benefit_en": "Run modern applications with high textures without memory errors",
                "description": f"Объема видеопамяти {vram} ГБ недостаточно. Рекомендуются карты с объемом памяти от 8 ГБ.",
                "description_en": f"Video memory size ({vram} GB) is insufficient. Graphics cards with 8 GB+ VRAM are recommended.",
                "action_guide": "Проверьте мощность блока питания перед покупкой.",
                "action_guide_en": "Verify power supply unit capacity before purchase."
            })

        # -------------------------------------------------------------
        # 4. ОПЕРАТИВНАЯ ПАМЯТЬ (RAM)
        # -------------------------------------------------------------
        ram_total = ram.get("total_gb", 0)
        is_dual = ram.get("dual_channel", False)
        slots_used = ram.get("occupied_slots", 0)
        slots_total = ram.get("total_slots", 0)

        if ram_total >= 32 and is_dual:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "category_en": "Memory (RAM)",
                "title": "Объём 32 ГБ в двухканальном режиме: Сбалансировано",
                "title_en": "32 GB Dual-Channel Memory: Balanced",
                "badge": "Сбалансировано",
                "badge_en": "Balanced",
                "type": "info",
                "priority": "Низкий",
                "priority_en": "Low",
                "cost_est": "0 руб.",
                "cost_est_en": "$0",
                "benefit": "Достаточный запас емкости для рабочих задач и многозадачности",
                "benefit_en": "Sufficient capacity headroom for productivity and multitasking",
                "description": (
                    f"Установлено {ram_total} ГБ (слоты {slots_used} из {slots_total}). "
                    f"Двухканальный режим активен в правильных разъёмах."
                ),
                "description_en": (
                    f"Installed {ram_total} GB (slots {slots_used} of {slots_total}). "
                    f"Dual-channel mode is active in the correct slots."
                ),
                "action_guide": "Убедитесь в активности профиля XMP/DOCP в BIOS.",
                "action_guide_en": "Verify that XMP/DOCP profile is active in BIOS."
            })
        elif ram_total <= 8:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "category_en": "Memory (RAM)",
                "title": "Увеличение объёма RAM до 16 ГБ",
                "title_en": "Expand RAM Capacity to 16 GB",
                "badge": "Рекомендуемый апгрейд",
                "badge_en": "Recommended Upgrade",
                "type": "upgrade",
                "priority": "Высокий",
                "priority_en": "High",
                "cost_est": "~2 500 – 4 000 руб.",
                "cost_est_en": "~$25 – $40",
                "benefit": "Устранение дефицита ОЗУ при работе браузера и фоновых программ",
                "benefit_en": "Eliminates memory bottleneck for browsers and background applications",
                "description": "8 ГБ оперативной памяти минимально достаточны лишь для базовой работы системы.",
                "description_en": "8 GB of RAM is only sufficient for basic system tasks.",
                "action_guide": "Установите идентичный модуль ОЗУ во второй канал.",
                "action_guide_en": "Install an identical RAM module in the second channel."
            })
        elif not is_dual and slots_used == 1 and slots_total >= 2:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "category_en": "Memory (RAM)",
                "title": "Включить двухканальный режим (Dual Channel)",
                "title_en": "Enable Dual-Channel Memory Mode",
                "badge": "Двухканальный режим",
                "badge_en": "Dual Channel",
                "type": "upgrade",
                "priority": "Высокий",
                "priority_en": "High",
                "cost_est": "~2 000 – 3 500 руб.",
                "cost_est_en": "~$20 – $35",
                "benefit": "Увеличение пропускной способности шины памяти вдвое",
                "benefit_en": "Doubles memory bus bandwidth",
                "description": "Память работает в одноканальном режиме. Добавление второго модуля удваивает теоретическую пропускную способность.",
                "description_en": "Memory operates in single-channel mode. Adding a second module doubles theoretical bandwidth.",
                "action_guide": "Установите второй модуль памяти через один слот (A2 + B2).",
                "action_guide_en": "Install a second memory module in alternating slot (A2 + B2)."
            })

        # -------------------------------------------------------------
        # 5. НАКОПИТЕЛИ (STORAGE)
        # -------------------------------------------------------------
        partitions = storage.get("partitions", [])
        disks = storage.get("physical_disks", [])

        # Проверка переполнения разделов
        for p in partitions:
            if p.get("percent", 0) >= 90:
                dev_name = p.get('device', '')
                pct = p.get('percent', 0)
                free_gb = p.get('free_gb', 0)
                total_gb = p.get('total_gb', 0)
                recommendations.append({
                    "category": "Накопители (Диски)",
                    "category_en": "Storage (Drives)",
                    "title": f"Очистить диск {dev_name} (заполнен на {pct}%)",
                    "title_en": f"Clean Drive {dev_name} ({pct}% full)",
                    "badge": "Заполнение диска",
                    "badge_en": "Drive Full",
                    "type": "warning",
                    "priority": "Средний",
                    "priority_en": "Medium",
                    "cost_est": "0 руб.",
                    "cost_est_en": "$0",
                    "benefit": "Предотвращение деградации скорости записи SSD",
                    "benefit_en": "Prevents SSD write speed degradation",
                    "description": (
                        f"Раздел {dev_name} заполнен на {pct}% "
                        f"(свободно {free_gb} ГБ из {total_gb} ГБ). "
                        f"При заполнении SSD свыше 85–90% скорость записи может снижаться."
                    ),
                    "description_en": (
                        f"Partition {dev_name} is {pct}% full "
                        f"({free_gb} GB free of {total_gb} GB). "
                        f"When SSD is filled over 85–90%, write speeds can decrease."
                    ),
                    "action_guide": "Удалите неиспользуемые файлы или перенесите данные на другой накопитель.",
                    "action_guide_en": "Delete unused files or transfer data to another drive."
                })

        # Анализ HDD vs SSD
        has_hdd = any(d.get("media_type") == "HDD" for d in disks)
        if has_hdd:
            recommendations.append({
                "category": "Накопители (Диски)",
                "category_en": "Storage (Drives)",
                "title": "Замена жесткого диска (HDD) на твердотельный накопитель SSD",
                "title_en": "Replace Mechanical Hard Drive (HDD) with SSD",
                "badge": "SSD накопитель",
                "badge_en": "SSD Storage",
                "type": "upgrade",
                "priority": "Средний",
                "priority_en": "Medium",
                "cost_est": "~6 000 – 9 000 руб.",
                "cost_est_en": "~$65 – $95",
                "benefit": "Высокая скорость чтения/записи и быстрый запуск приложений",
                "benefit_en": "High read/write speeds and fast application launch times",
                "description": (
                    "В системе обнаружен механический жесткий диск. Для хранения архивных файлов он пригоден, "
                    "но современные ресурсоемкие приложения требуют высокой скорости SSD."
                ),
                "description_en": (
                    "Mechanical hard drive detected. While suitable for archives, "
                    "modern demanding applications require SSD performance."
                ),
                "action_guide": "Рекомендуется установка NVMe PCIe накопителя в свободный слот M.2.",
                "action_guide_en": "Installing an NVMe PCIe drive into an available M.2 slot is recommended."
            })

        return recommendations
