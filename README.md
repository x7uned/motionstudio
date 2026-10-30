# Motion Studio · скилл для чат-агента

Студия коротких объясняющих роликов, которой управляет чат-агент (Claude Code, Codex или другой с shell). **Веб-интерфейса нет** (решение 2026-10-30): студия — один большой скилл с настройками, стилями, рендерерами, звуком и движком. Работает на **macOS, Windows 10/11 и Linux**.

Скажите агенту в этой папке: «сделай видео про … по шаблону …» или «какие есть стили». Агент работает по скиллу [`.agents/skills/motion-studio/SKILL.md`](.agents/skills/motion-studio/SKILL.md): сам пишет исследование, сценарий и постановку, студия озвучивает, рендерит и проверяет. Агент спрашивает вас только об аккаунте, платных шагах и одобрении.

## Установка
Нужны Node.js 22.13+, Python 3.10+ и Git. Подробно (Windows, ключи, ошибки): [references/install.md](.agents/skills/motion-studio/references/install.md).
```
git clone https://github.com/x7uned/motionstudio.git "Motion Studio"
cd "Motion Studio"
npm install
npm run setup
npm run studio -- status
```
`npm run setup` создаёт Python-окружения (edge-tts, Tavily CLI), находит или скачивает FFmpeg, ставит Chrome для Remotion и скачивает тяжёлые файлы стилей из GitHub Release с проверкой SHA-256. Ключи (ElevenLabs, по желанию Apify) вы кладёте сами в `.env.local` по образцу `.env.example`; Apify — командой `npm run studio -- apify connect` в своём терминале.

## Что внутри скилла
| Путь | Что это |
|---|---|
| `.agents/skills/motion-studio/` | Скилл: `SKILL.md` + справочники `install`, `commands`, `styles`, `settings`, `roles`, `libraries`, `harnesses` |
| `.agents/skills/*` | Вспомогательные скиллы: сценарий, монтаж, звук, исследование Tavily, Remotion, каталог Kagenami и др. |
| `.claude/`, `.codex/` | Подключение к Claude Code и Codex: хуки «не заканчивать, пока ролик не готов», сабагент `studio-role` |
| `studio.config.json` | Настройки (`npm run studio -- config get`), без секретов |
| `data/templates/` | Шаблоны и образцы стилей с правилами и эталонами |
| `data/sound-packs/`, `data/branding/`, `data/backgrounds/`, `data/models/` | Музыка, эффекты, концовки, фоны, 3D-модели |
| `assets/manifest.json` | Тяжёлые файлы стилей в GitHub Release (`npm run assets -- status|fetch`) |
| `renderer/` | Подготовленные рендереры Remotion (иллюстрированный мир, изометрия, 3D, пиксельные модули, лаборатория стилей) |
| `work/pixel-lab/`, `work/style-lab/` | Киты, код и правила пиксель-фильмов и проб стилей (без рендеров) |
| `docs/`, `video-design/` | Правила производства, дизайна, звука, публикации |
| `scripts/studio.ts`, `scripts/studio-commands.ts` | CLI студии |
| `scripts/worker.ts` | Движок: параллельная очередь, рендер — в одном слоте |
| `src/lib/` | Конвейер, валидаторы, провайдеры; `platform.ts` — различия ОС |

Остаётся только у вас (не в git): `data/studio.sqlite`, `data/projects/`, голосовые датасеты, профили авторов, персонажи, `archive/`, `exports/`, рендеры в `work/`, идеи и аналитика каналов, `.env.local`.

## Частые команды
```
npm run studio -- start                 # движок (в своём терминале)
npm run studio -- status                # движок, инструменты, активные задачи
npm run studio -- templates             # шаблоны; все стили — references/styles.md
npm run studio -- list                  # все проекты
npm run studio -- config get            # настройки
npm run studio -- stop                  # остановить между задачами
```
Полный список, включая то, что раньше было кнопками веба (правка сцен, ревью, стиль автора, разборы Reels, голоса, 3D-модели): [references/commands.md](.agents/skills/motion-studio/references/commands.md). Последняя версия с веб-интерфейсом сохранена в git-теге `web-ui-final`.

## Границы
- Локальная однопользовательская студия без сетевого сервиса. Внешние сервисы: Tavily (исследование), ElevenLabs (речь и Scribe), Apify Free (разборы Reels), Wikimedia Commons (логотипы и портреты); легаси-проекты — Codex/Claude CLI.
- Сгенерированный код никогда не исполняется: модели и агент возвращают проверенный JSON, рендерят подготовленные компоненты.
- Техническая проверка и ревью кадров — не одобрение: ролик одобряет только пользователь своими словами.
- Правила стилей — наблюдения и решения в контексте, не обучение модели.
- OCR кадров и поиск лица (Apple Vision) — только на macOS; на Windows/Linux ревью честно пишет «OCR недоступен».

## Роли моделей (легаси-проекты)
В агентном режиме все роли выполняет ведущий чат-агент. Проекты `create --engine legacy` используют встроенные роли:

| Роль | Модель | Как вызывается |
|---|---|---|
| Поисковые запросы, исследование, сценарий, разбор референсов, ревью кадров | GPT‑6.1 Sol · xhigh | Codex CLI, изолированный запуск |
| 3D-режиссёр, motion-планы, сценограф | Claude Opus 5.5 · xhigh | Claude Code CLI (`src/lib/claude-provider.ts`), `--restricted`, без инструментов и секретов |

Пути CLI: `STUDIO_CODEX`, `STUDIO_CLAUDE` в `.env.local`. Вход в Claude Code: `claude auth login`.

## Проверки для разработчика
`npm run check`, `npm test`, перед публикацией — `npm run secrets:check` (нет ли ключей и личных файлов среди того, что уйдёт в git). Проверка на Windows и Linux — GitHub Actions (`.github/workflows/ci.yml`).

## Источники инструментов
- [motion-graphics-skills](https://github.com/charlie947/motion-graphics-skills), [claude-motion](https://github.com/whaleyxbt/claude-motion)
- [Remotion](https://www.remotion.dev), [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)

Лицензии навыков — в их папках, звуков — в `data/sound-packs/*/licenses|sources`, npm-пакетов — в зависимостях. Шрифты Fontsource поставляются с собственными лицензиями.
