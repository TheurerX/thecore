"""
Модуль экспертного анализа комплектующих и интеллектуальных рекомендаций по апгрейду.
Рассчитывает соотношение цена/прирост производительности.
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
                "title": "Включить профиль XMP / DOCP в BIOS",
                "badge": "Штатная настройка BIOS",
                "type": "xmp_tuning",
                "priority": "Рекомендуется",
                "cost_est": "0 руб.",
                "benefit": f"+{boost_pct}% пропускной способности памяти",
                "description": (
                    f"Модули памяти аппаратно поддерживают частоту {rated} МГц, "
                    f"но в данный момент работают на стандартной частоте {current} МГц. "
                    f"Включение штатного заводского профиля XMP/DOCP в BIOS платы {mobo.get('product', '')} "
                    f"переведёт оперативную память на сертифицированную скорость."
                ),
                "action_guide": (
                    "Инструкция: Перезагрузите ПК -> при старте нажимайте клавишу Del или F2 -> "
                    "в меню найдите пункт 'Ai Overclock Tuner' (или XMP/DOCP) -> выберите 'Profile 1' -> "
                    "нажмите F10 для сохранения и перезагрузки."
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
            has_b550_x570 = any(ch in mobo_prod.upper() for ch in ["B550", "X570", "B450", "X470"])
            recommendations.append({
                "category": "Процессор (CPU)",
                "title": "Апгрейд на AMD Ryzen 7 5700X3D (или 5800X3D)",
                "badge": "Оптимальный процессор под сокет",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "от 15 000 до 18 000 руб.",
                "benefit": "+35–55% производительности в процессорозависимых задачах",
                "description": (
                    f"У вас установлена материнская плата {mobo_prod} на сокете AM4. "
                    f"Замена системной платы и оперативной памяти DDR4 не требуется. "
                    f"Установка 8-ядерного процессора с 3D V-Cache (96 МБ кэша L3) обеспечит полное раскрытие графического процессора."
                ),
                "action_guide": (
                    "Перед установкой процессора обновите BIOS материнской платы до актуальной версии."
                )
            })
        elif "LGA1200" in socket:
            recommendations.append({
                "category": "Процессор (CPU)",
                "title": "Апгрейд на Intel Core i7-10700K / 11700K",
                "badge": "Без замены платы",
                "type": "upgrade",
                "priority": "Средний",
                "cost_est": "~12 000 – 16 000 руб.",
                "benefit": "+25-35% производительности в рабочих задачах и играх",
                "description": "Позволяет повысить число ядер/потоков в рамках сокета LGA1200 без смены платформы.",
                "action_guide": "Убедитесь в наличии мощного кулера (TDP от 180W)."
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
                "title": "GeForce RTX 3070: Апгрейд пока не требуется",
                "badge": "Сбалансировано",
                "type": "info",
                "priority": "Низкий",
                "cost_est": "0 руб.",
                "benefit": "Стабильная производительность в разрешениях 1080p и 1440p (2K)",
                "description": (
                    f"Графический адаптер {gpu_name} (8 ГБ VRAM) сохраняет достаточный запас вычислительной мощности. "
                    f"Смена видеокарты на текущем процессоре нецелесообразна."
                ),
                "action_guide": "Используйте технологии апскейлинга DLSS для тяжелых сцен."
            })
        elif vram > 0 and vram <= 4:
            recommendations.append({
                "category": "Видеокарта (GPU)",
                "title": "Апгрейд видеокарты (дефицит VRAM)",
                "badge": "Дефицит видеопамяти",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "~20 000 – 30 000 руб.",
                "benefit": "Запуск современных приложений на высоких текстурах без сбоев памяти",
                "description": f"Объема видеопамяти {vram} ГБ недостаточно. Рекомендуются карты с объемом памяти от 8 ГБ.",
                "action_guide": "Проверьте мощность блока питания перед покупкой."
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
                "title": "Объём 32 ГБ в двухканальном режиме: Сбалансировано",
                "badge": "Сбалансировано",
                "type": "info",
                "priority": "Низкий",
                "cost_est": "0 руб.",
                "benefit": "Достаточный запас емкости для рабочих задач и многозадачности",
                "description": (
                    f"Установлено {ram_total} ГБ (слоты {slots_used} из {slots_total}). "
                    f"Двухканальный режим активен в правильных разъёмах."
                ),
                "action_guide": "Убедитесь в активности профиля XMP/DOCP в BIOS."
            })
        elif ram_total <= 8:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "title": "Увеличение объёма RAM до 16 ГБ",
                "badge": "Рекомендуемый апгрейд",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "~2 500 – 4 000 руб.",
                "benefit": "Устранение дефицита ОЗУ при работе браузера и фоновых программ",
                "description": "8 ГБ оперативной памяти минимально достаточны лишь для базовой работы системы.",
                "action_guide": "Установите идентичный модуль ОЗУ во второй канал."
            })
        elif not is_dual and slots_used == 1 and slots_total >= 2:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "title": "Включить двухканальный режим (Dual Channel)",
                "badge": "Двухканальный режим",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "~2 000 – 3 500 руб.",
                "benefit": "Увеличение пропускной способности шины памяти вдвое",
                "description": "Память работает в одноканальном режиме. Добавление второго модуля удваивает теоретическую пропускную способность.",
                "action_guide": "Установите второй модуль памяти через один слот (A2 + B2)."
            })

        # -------------------------------------------------------------
        # 5. НАКОПИТЕЛИ (STORAGE)
        # -------------------------------------------------------------
        partitions = storage.get("partitions", [])
        disks = storage.get("physical_disks", [])

        # Проверка переполнения разделов
        for p in partitions:
            if p.get("percent", 0) >= 90:
                recommendations.append({
                    "category": "Накопители (Диски)",
                    "title": f"Очистить диск {p.get('device', '')} (заполнен на {p.get('percent')}%)",
                    "badge": "Заполнение диска",
                    "type": "warning",
                    "priority": "Средний",
                    "cost_est": "0 руб.",
                    "benefit": "Предотвращение деградации скорости записи SSD",
                    "description": (
                        f"Раздел {p.get('device', '')} заполнен на {p.get('percent')}% "
                        f"(свободно {p.get('free_gb')} ГБ из {p.get('total_gb')} ГБ). "
                        f"При заполнении SSD свыше 85–90% скорость записи может снижаться."
                    ),
                    "action_guide": "Удалите неиспользуемые файлы или перенесите данные на другой накопитель."
                })

        # Анализ HDD vs SSD
        has_hdd = any(d.get("media_type") == "HDD" for d in disks)
        if has_hdd:
            recommendations.append({
                "category": "Накопители (Диски)",
                "title": "Замена жесткого диска (HDD) на твердотельный накопитель SSD",
                "badge": "SSD накопитель",
                "type": "upgrade",
                "priority": "Средний",
                "cost_est": "~6 000 – 9 000 руб.",
                "benefit": "Высокая скорость чтения/записи и быстрый запуск приложений",
                "description": (
                    "В системе обнаружен механический жесткий диск. Для хранения архивных файлов он пригоден, "
                    "но современные ресурсоемкие приложения требуют высокой скорости SSD."
                ),
                "action_guide": "Рекомендуется установка NVMe PCIe накопителя в свободный слот M.2."
            })

        return recommendations
