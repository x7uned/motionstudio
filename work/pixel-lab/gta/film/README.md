# «GTA 6: the city behind you» · пиксельный ролик (2026-10-23)

- **Аккаунт:** Kagenami. English, Dennis · Eleven v4, один дубль (`narration.txt`, 159 слов).
- **Формат:** 1080×1920, 30 fps, 47,867 с (1436 кадров). Не петля.
- **Идея:** одна закатная улица «Vice City» сбоку; над персонажем канала игровая камера с конусом; что вне конуса — синий каркас «NOT DRAWN». Единственный источник видимости — `drawnAt(wx, t)` / `camDir(t)` в `timeline.mjs`. Повороты: TURN1 (медленный), TURN_BACK, TURN2 (быстрый, город дорисовывается с опозданием — шутка).
- **Логотипы:** GTA VI и Rockstar Games из Wikimedia Commons (public domain text logo, товарные знаки), растрированы в `media/`; SHA-256 и ссылки в `credits.txt`. Цитата: Обб Вермей, экс-техдиректор Rockstar North (через 80.lv).
- **Устройство:** `levels/street*.mjs` (город, две «подачи», камера/конус, x-ray, LOD-башня), `levels/actors*.mjs` (персонаж, консоль, машины, прохожие, DELETED, T-поза), мои слои `levels/radar.mjs`, `levels/cards.mjs`, `levels/cta.mjs`.
- **Пересборка:** `../../render-lock.sh gta ./build.sh gta`.
