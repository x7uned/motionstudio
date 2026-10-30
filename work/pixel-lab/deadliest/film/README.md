# «Which animal kills the most people?» · пиксельный ролик (2026-10-23)

- **Аккаунт:** Kagenami. English, Dennis · Eleven v4, один дубль (`narration.txt`, 173 слова). Пауза 1,5 с после «…the mosquito.» перед «Yes.» — по просьбе пользователя: естественный промежуток дубля расширен его же тишиной (`pause.py`, `voice/words-master.json`), без растяжения речи.
- **Формат:** 1080×1920, 30 fps, 61,733 с (1852 кадра). Не петля.
- **Порядок:** акула ~10 → лев ~100 → бегемот ~500 → крокодил до 1000 → скорпион ~3000 → собака ~60 000 (бешенство) → змея ~100 000 → комар ~600 000 (малярия). Факты — `../facts.md`, `credits.txt`.
- **Концовка (эксперимент пользователя):** ночной лагерь, персонаж канала (спрайт-лист `data/branding/xtuned-outro/v1`), комар кусает, персонаж падает, призрак; поверх — карточка LIKED IT? · SEND (самолётик) · FOLLOW → FOLLOWING ✓ (`levels/cta.mjs`).
- **Устройство:** `timeline.mjs`, `world.mjs`, `levels/*.mjs` (строили помощники по `BRIEF.md`), табло `levels/meter.mjs`, карточки `levels/cta.mjs`, звук `levels/*-motions.mjs` → `cues.mjs` → `synth.mjs`, `mix.mjs`, `cover.mjs dev/faces.json`.
- **Пересборка (в общем слоте рендера):** `../../render-lock.sh deadliest ./build.sh deadliest` (картинка, звук, сведение, копия -phone, QA из MP4 в `qa/`).
