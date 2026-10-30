# «Why airplane windows are round» · пиксельный ролик (2026-10-24)

- **Аккаунт:** Kagenami. English, Dennis · Eleven v4, один дубль (`narration.txt`, 164 слова; тайминги слов сверены по Scribe).
- **Формат:** 1080×1920, 30 fps, 51,47 с. Не петля. Финал — «Liked this video? Send it to a friend, and follow…» + карточка SEND / FOLLOW (как в GTA).
- **Идея:** один борт самолёта над морем облаков; персонаж канала смотрит из иллюминатора. Единый источник правды — `timeline.mjs`: `cornerR(t)` (круглое ↔ квадратное окно), `pressure(t)` (наддув), `crack(t)`, окна STRESS_VIEW / EXPLODE / AIRFLOW / LOAD / BACKUP_TEST / FOG. Мир — `levels/plane*.mjs`; вставка Comet 1954, полоска полёта и три стекла — `levels/explain*.mjs`; мои карточки PRESSURE CYCLES и SAFETY FEATURE ✓ — `levels/cards.mjs`.
- **Факты:** иллюстрация, не реальный самолёт и не в масштабе; трещина — упрощённая картинка усталости металла. Источники — `credits.txt`.
- **Пересборка:** `../../render-lock.sh plane-windows ./build.sh plane-windows`.
