# «You're not ugly» · пиксельный ролик (2026-10-24)

- **Аккаунт:** Kagenami. English, Dennis · Eleven v4, один дубль (`narration.txt`, 176 слов; тайминги слов сверены по Scribe — `voice/scribe.json`, `voice/words-el.json` — исходная разметка ElevenLabs).
- **Формат:** 1080×1920, 30 fps, 53,27 с. Не петля. Финал — реплика «Liked this video? Send it to a friend, and follow…» + карточка LIKED IT? / SEND / FOLLOW → FOLLOWING ✓ (как в GTA).
- **Идея:** одна спальня ночью сбоку. «Ты» — постоянный герой (фиолетовая шапка, пижама; `levels/room-person.mjs` из cat-zoomies), друг — персонаж канала (спрайт, `levels/hero.mjs`) на 1,5 м. Сверху — видоискатель VIEW (`levels/finder*.mjs`): селфи с широкоугольной выпуклостью и «+30%», 1,5 м, переворот в зеркало, исследование 1977, рентген головы (AIR / BONE), запись, слепой тест; в конце мои три плашки DISTANCE / MIRROR / SKULL (`levels/cards.mjs`).
- **Звук:** `synth.mjs` (тёплая чиптюн-подложка Fmaj7–Em7–Dm7–Cmaj7, 84 BPM) + звуки движений из `levels/*-motions.mjs` (cues.mjs; двойники комнаты и VIEW убраны) + `mix.mjs` (голос −16 LUFS, подложка −12 дБ под речью).
- **Пересборка:** `../../render-lock.sh not-ugly ./build.sh not-ugly`.
