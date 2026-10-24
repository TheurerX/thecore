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
        # 1. БЕСПЛАТНЫЙ БУСТ: Проверка XMP / DOCP
        # -------------------------------------------------------------
        if ram.get("xmp_not_enabled"):
            current = ram.get("current_speed_mhz", 2400)
            rated = ram.get("max_rated_speed_mhz", 3200)
            boost_pct = round(((rated - current) / current) * 100)
            recommendations.append({
                "category": "Настройка памяти (BIOS)",
                "title": "Включить профиль XMP / DOCP в BIOS",
                "badge": "0 руб. • МАКСИМАЛЬНАЯ ВЫГОДА",
                "type": "free_boost",
                "priority": "Срочно",
                "cost_est": "0 руб.",
                "benefit": f"+{boost_pct}% пропускной способности, +10–15% 1% Low FPS в играх",
                "description": (
                    f"Ваши планки памяти (Kingston Fury) с завода сертифицированы на частоту {rated} МГц, "
                    f"но сейчас работают на базовой частоте {current} МГц. "
                    f"Включение штатного профиля DOCP (XMP) в BIOS материнской платы {mobo.get('product', '')} "
                    f"даст ощутимый прирост плавности в играх и скорости отклика системы абсолютно бесплатно!"
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
                "badge": "ЛУЧШИЙ FPS НА РУБЛЬ",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "от 15 000 до 18 000 руб.",
                "benefit": "+35–55% FPS в процессорозависимых играх, отсутствие микрофризов",
                "description": (
                    f"У вас установлена отличная материнская плата {mobo_prod} на сокете AM4. "
                    f"Вам НЕ нужно менять материнскую плату и оперативную память DDR4! "
                    f"Установка 8-ядерного процессора с 3D V-Cache (96 МБ кэша L3) полностью раскроет вашу видеокарту "
                    f"RTX 3070 во всех современных играх (Cyberpunk 2077, Warzone, CS2, WoW, Rust), устранив узкое место."
                ),
                "action_guide": (
                    "Перед покупкой и установкой нового процессора просто обновите BIOS материнской платы до актуальной версии "
                    "через ASUS EZ Flash в BIOS."
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
                "title": "GeForce RTX 3070: Апгрейд пока не целесообразен",
                "badge": "ОТЛИЧНЫЙ БАЛАНС",
                "type": "info",
                "priority": "Низкий",
                "cost_est": "Экономия 60 000+ руб.",
                "benefit": "Высокая производительность в 1080p и 1440p (2K)",
                "description": (
                    f"Ваша видеокарта {gpu_name} (8 ГБ VRAM) сохраняет высокую актуальность. "
                    f"Апгрейд на видеокарту следующего уровня (например, RTX 4070 Ti Super / RX 7800 XT) потребует "
                    f"более 60 000 руб., при этом текущий процессор не даст ей раскрыться. "
                    f"Экономически выгоднее вложить средства в процессор 5700X3D."
                ),
                "action_guide": "Используйте технологии DLSS Quality для требовательных игр с трассировкой лучей."
            })
        elif vram > 0 and vram <= 4:
            recommendations.append({
                "category": "Видеокарта (GPU)",
                "title": "Апгрейд видеокарты (мало видеопамяти VRAM)",
                "badge": "УЗКОЕ МЕСТО В ИГРАХ",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "~20 000 – 30 000 руб.",
                "benefit": "Возможность запускать современные игры на высоких текстурах без вылетов",
                "description": f"Текущей памяти {vram} ГБ недостаточно для современных игр. Рекомендуются карты с 8+ ГБ (RTX 3060 12GB / RX 6600 8GB).",
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
                "title": "Объём 32 ГБ в двухканальном режиме: Идеально",
                "badge": "ОПТИМАЛЬНО",
                "type": "info",
                "priority": "Низкий",
                "cost_est": "0 руб.",
                "benefit": "Запас на несколько лет вперёд для игр, монтажа и многозадачности",
                "description": (
                    f"Установлено {ram_total} ГБ (слоты {slots_used} из {slots_total}). "
                    f"Двухканальный режим активен в правильных разъёмах. Наращивать объём до 64 ГБ для обычных игр "
                    f"бессмысленно — это пустая трата денег."
                ),
                "action_guide": "Достаточно убедиться в работе XMP/DOCP на 3200 МГц."
            })
        elif ram_total <= 8:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "title": "Увеличение объёма RAM до 16 ГБ",
                "badge": "КРИТИЧЕСКИЙ АПГРЕЙД",
                "type": "upgrade",
                "priority": "Срочно",
                "cost_est": "~2 500 – 4 000 руб.",
                "benefit": "+40% скорости работы ПК, устранение зависаний при открытии браузера и игр",
                "description": "8 ГБ памяти в современных условиях потребляет одна только Windows с несколькими вкладками браузера.",
                "action_guide": "Установите вторую планку идентичной частоты и таймингов."
            })
        elif not is_dual and slots_used == 1 and slots_total >= 2:
            recommendations.append({
                "category": "Оперативная память (RAM)",
                "title": "Включить двухканальный режим (Dual Channel)",
                "badge": "+25% К СКОРОСТИ",
                "type": "upgrade",
                "priority": "Высокий",
                "cost_est": "~2 000 – 3 500 руб.",
                "benefit": "+20–30% к стабильности FPS в играх",
                "description": "Память работает в одноканальном режиме. Добавление идентичного второго модуля удваивает пропускную способность шины памяти.",
                "action_guide": "Купите точно такую же планку памяти и установите через один слот (A2 + B2)."
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
                    "badge": "ПРЕДУПРЕЖДЕНИЕ",
                    "type": "warning",
                    "priority": "Средний",
                    "cost_est": "0 руб.",
                    "benefit": "Предотвращение деградации скорости SSD и сбоев записи",
                    "description": (
                        f"Раздел {p.get('device', '')} заполнен на {p.get('percent')}% "
                        f"(свободно всего {p.get('free_gb')} ГБ из {p.get('total_gb')} ГБ). "
                        f"При заполнении SSD свыше 85–90% механизм очистки ячеек (TRIM/Garbage Collection) "
                        f"замедляется, что может вызывать микрозадержки."
                    ),
                    "action_guide": "Удалите неиспользуемые игры или перенесите медиафайлы."
                })

        # Анализ HDD vs SSD
        has_hdd = any(d.get("media_type") == "HDD" for d in disks)
        if has_hdd:
            recommendations.append({
                "category": "Накопители (Диски)",
                "title": "Замена жесткого диска (HDD) на вместительный SSD 1–2 ТБ",
                "badge": "КОМФОРТ В ИГРАХ",
                "type": "upgrade",
                "priority": "Средний",
                "cost_est": "~6 000 – 9 000 руб.",
                "benefit": "Мгновенная подгрузка уровней и текстур в тяжелых играх без подвисаний",
                "description": (
                    "В системе обнаружен HDD накопитель (1 ТБ). Для хранения архивов и видео он подходит, "
                    "но современные игры (DirectStorage) на HDD страдают от долгих загрузок и заиканий звука/текстур. "
                    "В перспективе выгодно добавить 1 ТБ или 2 ТБ M.2 NVMe или SATA SSD."
                ),
                "action_guide": "На материнской плате ROG STRIX B550-F есть свободный второй слот M.2!"
            })

        return recommendations
