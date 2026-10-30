# Каталог стилей студии

Всё, из чего складывается вид и звук ролика, и где это лежит. Стили в репозитории: правила, JSON, код рендереров, картинки и звуки — в git; тяжёлые WAV подложек и эталонные MP4 — в GitHub Release (`npm run assets -- fetch`). Ничего из этого не переписывается: пакеты и шаблоны неизменяемы, изменения — новой версией (`v2`, `v3`…). Правила стиля — это наблюдения и решения пользователя в контексте, **не обучение модели**.

Как выбрать: пользователь назвал стиль → найди его ниже → создай проект так, как написано в колонке «Как создать». Не назвал → тип ролика по теме (объяснение «как это работает» → иллюстрированная сцена или пиксель-фильм; город, трафик, маршруты → изометрия; устройство одной вещи → 3D-разбор). Спорно — спроси одним вопросом.

## 1. Шаблоны (`data/templates/<id>/v<N>`, список: `npm run studio -- templates`)
Каждая версия: `README/DESIGN/CONTENT/MOTION/VOICE/WORKFLOW/CHECKLIST.md`, `settings.json`, `brand.json`, `template.json`, `provenance.json`, эталон в `reference/` (постер, контактный лист, кадры, MP4). Прочитай их перед работой по шаблону. Проект снимает копию инструкций шаблона и дальше от него не зависит.

| Шаблон | Что это | Как создать | Статус |
|---|---|---|---|
| `tech-story` v1 · «История технологий» | Связный русский рассказ: крупный текст, архивные изображения и схемы, которые растут с голосом; 150 с | `--template tech-story` | Подключён. **Неизменяем**, эталон TelephoneFilm — тематический, не универсальный |
| `model-breakdown` v1 · «Разбор 3D-модели» | Одна детальная 3D-модель: устройство, работа, движение, голос и звук на одном таймлайне | `--template model-breakdown` (рендер three) | Подключён |
| `illustrated-scene` v2 · «Иллюстрированная сцена» | Один постоянный 2D-мир из нарисованных low-poly предметов, голос Dennis | `--template illustrated-scene` (тип illustrated) | Подключён; v1 сохранён |
| `isometric` v1 · «Изометрия» | Ортографический low-poly город: маршруты, эстакады, машины, метки, карточки | `--film-kind isometric` без `--template` (только 9:16) | Образец; реализован рендерером. Подключённая v2 — только из первого одобренного изометрического фильма |
| `pixel-film` v1 · «Пиксель-фильм» | 32-битный пиксель-арт, сетка 540×960 ×2, пиксельная планета с диорамами, 8-битный звук | Через пиксель-лабораторию (раздел 3), не `create` | Образец (`connected=false`) |
| `illustrated-depth` v1 · «Иллюстрированная сцена 2.0» | Предметы на шестигранных постаментах, три слоя параллакса, пакеты по кривым, орб thinking-orbs | — | Образец, рендерер не подключён |
| `sketchbook` v1 · «Карандашный скетчбук» | Тетрадь в клетку, Rough.js, почерк Caveat, стикеры | — | Образец |
| `watercolor-marker` v1 · «Акварель и маркер» | Детская книжка: акварель p5.brush, карандашная штриховка, пунктир фломастера | — | Образец |
| `toy-physics` v1 · «Игрушечная физика» | Пастельные игрушки, Matter.js, squash & stretch | — | Образец |
| `neon-terminal` v1 · «Неоновый терминал» | CRT, сканлинии, glitch RGB-split, неоновые капсулы | — | Образец |

**Образец стиля** (`styleSample.connected=false`) виден в каталоге, но проект по нему не создаётся. Если пользователь хочет именно его — это работа «реализовать стиль»: подготовленный рендерер `renderer/…` + JSON-схема + новая версия шаблона (SKILL.md, раздел 5½; исходники образцов — `renderer/style-lab/<стиль>/`, правила — `work/style-lab/<стиль>/`).

## 2. Типы фильмов (рендереры студии, `renderer/`)
| Тип | Файлы | Правила | Шапка/оверлей |
|---|---|---|---|
| illustrated (2D-мир) | `IllustratedFilm.tsx` + каталоги `Illustrated{Cat,History,Space,Qr,Net,Tunnel,Passwords,Faceid,Shazam,Minute,Media}.tsx` | `docs/illustrated-renderer.md`, `video-design/illustrated-style.md` | Без оверлея (v3) |
| isometric (город) | `IsometricFilm.tsx` + `IsometricWave/Speedcam/Hex/Tiles.tsx` | `docs/isometric-renderer.md`, `video-design/isometric-style.md` | Без оверлея (v3) |
| three (3D) | `ThreeFilm.tsx`, свои модели `data/models` | `docs/3d-renderer.md`, `docs/3d-sources.md` | Рисует шапку y108 — предупреди |
| netcode | `NetcodeFilm.tsx` | `src/lib/netcode.ts` | Рисует шапку — предупреди |
| explainer / постоянная схема | `Explainer.tsx`, `PersistentDiagram.tsx`, `SystemGrowth.tsx` | `video-design/DESIGN.md`, `MOTION-RULES.md` | Рисует шапку — предупреди |
| telephone (история) | `TelephoneFilm.tsx` | шаблон tech-story | Рисует шапку |
Каталоги предметов (что можно показывать без рисования «с нуля»): `src/lib/illustrated-catalog-*.ts` и описания в `docs/illustrated-renderer.md`. Новых предметов нет в каталоге → сначала подготовить объект, не подменять примитивом.

## 3. Пиксель-фильмы и киты (`work/pixel-lab`)
Основной формат Kagenami. Правила: `docs/pixel-film.md`, `renderer/pixel/README.md`.
- Общие модули: `renderer/pixel/` — растр, пиксельная Земля `earth.mjs` v1, кириллический пиксельный шрифт `cyrillic.mjs` (утверждён 2026-10-29).
- Ведущий кит: `work/pixel-lab/shared/` (`hero.mjs`, `synth-core.mjs`, `retime.mjs`, `lead-stills.mjs`, `scribe.py`, `BRIEF-COMMON.md`).
- Тематические киты: собаки `work/pixel-lab/dogs/kit-v1…v3`, казино `work/pixel-lab/casino-math/film/casino-*.mjs`, воксели Minecraft `work/pixel-lab/minecraft/film`, FPS `work/pixel-lab/ping/film`, кот `work/pixel-lab/cat-drink/film` и др. Каждый фильм — своя папка `work/pixel-lab/<тема>/film` с `render.mjs`, `timeline.mjs`, `synth.mjs`, `mix.mjs`, `sheet.mjs`, `cover.mjs`, `qa.mjs`, `narration.txt`, `description.txt`, `credits.txt`. Правила партий — `work/pixel-lab/BATCH-*.md`.
- В репозитории только код и правила; рендеры, кадры, аудио и голосовые кэши остаются у автора. Старые фильмы содержат пути `/Users/rv/...` — это история, а не шаблон: новый фильм собирай из китов, пути — относительно папки.
- Правила пользователя: игровые герои — низкое разрешение, «кубики» как в игре; город 32-битный; звук 8-битный и длится ровно столько, сколько движение; новые фильмы рисуют свой арт и не берут из каталога Kagenami (каталог пополняется после QA — скилл `kagenami-catalog`).

## 4. Лаборатория стилей (`renderer/style-lab`, `work/style-lab`)
Пробы до решения пользователя: `sketch`, `watercolor`, `illustrated`, `toy-physics`, `neon`, `iso-city`, `pixel-film`, `smoke`, `hair3d` (3D-образы для @kagenami_fun, стиль не выбран), `stickman`, `stickman-mine`, `stickman-truck` («Стикмен»: чёрный фон, белые фигуры со свечением без обводки, один цветовой акцент, шрифт Prata — `renderer/style-lab/fonts/prata.ts`; не одобрен, звука нет). Рендер проб: `node --import tsx scripts/style-lab-render.ts <стиль> [--stills-only --frames 3.0,3.5]`.

## 5. Звук и музыка (`data/sound-packs`)
- **Фоновая музыка обязательна** (`docs/background-music.md`): `background-beds` v1–v5. Тембры: `pluck-curious`, `glass-arp`, `chip-soft` (объяснения), `space-drone` (космос, «что если» о планетах), `warm-pad` (история), `lofi-pulse`; `music-box`, `nature-air` — только по `--music`. v3+ аранжируются по плану фильма (главы, warn → провал, ok → подъём, финальный аккорд); v4 — один звук на акцент; v5 — бесшовная петля. Новые проекты получают актуальную версию сами.
- **Эффекты**: `xtuned-selected/v1` — утверждённые UI-reveal, whoosh, highlight (лицензии в `licenses/`, CC0); `audition-01` — кандидаты из Kenney/OpenGameArt с исходными архивами; `outro-8bit-01` — 8-битная заставка. Правила: `docs/sound-preferences.md` (cue sheet v5–v10, одинаковый эффект не чаще раза в 3 с, звук начинается с предыдущего ключа движения, плавные хвосты).
- Пиксель-фильмы синтезируют свой 8-битный звук (`synth-core.mjs`).

## 6. Фоны, бренды, подписи, раскладка
- **Фоны** `data/backgrounds/v1`: 01–06 и 08–10 (07 никогда); выбирается один раз при создании и не меняется (`docs/video-backgrounds.md`).
- **Бренды** (`docs/creator-outro.md`): `--brand kagenami` (@kagenami_ai), `--brand worldifthen` (@worldifthen_ai), `--brand xtuned` (@xtuned, пакет `data/branding/xtuned-outro/v1` — спрайт, звуки). Аккаунты отличаются только концовкой/ником, остальное одинаково. Без названного аккаунта — спроси.
- **Концовка** новых видео: «…Follow, so you don't miss the next one.» и карточка FOLLOW → FOLLOWING ✓ поверх последней сцены (`docs/publishing-and-retention.md`); петля (`--ending loop`) — только по явной просьбе.
- **Подписи** (`renderer/CaptionStyles.tsx`): по умолчанию karaoke; есть word, marker, terminal, roll, chips, bold, focus, tape и др.
- **Кадр 9:16 без оверлея** (overlayVersion 3): картинка на весь кадр, только субтитры с мягкой тенью. **Безопасные зоны** `docs/safe-zones.md`, `video-design/safe-zones.json`: важное в x 70–880, y 300–1250; субтитры y 1360–1500; проверка кадра — `node scripts/safe-zones-overlay.mjs <кадр> <выход>`.
- **Язык и голос**: `docs/english-films.md` (Dennis · Eleven v4, Plain English для EN), `video-design/ELEVENLABS.md`, `VOICE-OPTIONS.md`.
- **Бренд-палитра и дизайн**: `video-design/brand.json`, `video-design/DESIGN.md`, `video-design/MOTION-RULES.md` (ничто не появляется и не исчезает за один кадр).
- **Публикация**: обложка и описание — `docs/publishing-and-retention.md`.

## 7. Сохранить новый стиль
- Из одобренного ролика: `template save <id> --id <латиница> --name "…"` → новая версия.
- Из пробы style-lab: `template sample <style-lab-id> --user-confirmed "<слова пользователя>"` → образец `connected=false`.
- Новые тяжёлые файлы (≥ 4 МБ) в стилях: `node scripts/assets.mjs pack --release assets-vN` → загрузить список `assets/upload-assets-vN.txt` в Release `assets-vN` (`gh release upload`), закоммитить `assets/manifest.json` и `.gitignore`.
