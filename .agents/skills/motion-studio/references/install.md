# Установка студии · macOS, Windows 10/11, Linux

Студия — папка-скилл: клонируешь репозиторий, ставишь зависимости, и любой чат-агент с shell (Claude Code, Codex, другие) ведёт ролики командами `npm run studio -- …`. Веб-интерфейса нет.

## Что нужно
- **Node.js 22.13+** (лучше текущий LTS) — нужен встроенный `node:sqlite`.
- **Python 3.10+** — речь (edge-tts), сведение звука, Tavily CLI. На Windows ставь с python.org и отметь «Add python.exe to PATH» (или пользуйся `py`).
- **Git** — клонировать и обновлять.
- Интернет — Tavily, ElevenLabs, скачивание FFmpeg/Chrome/тяжёлых стилей при установке.
- FFmpeg ставить заранее не нужно: `npm run setup` возьмёт его из PATH или скачает статический GPL-билд в `bin/`.

## Шаги
```
git clone https://github.com/x7uned/motionstudio.git "Motion Studio"
cd "Motion Studio"
npm install
npm run setup
npm run studio -- status
```
`npm run setup` (повторный запуск безопасен, готовое пропускается):
1. проверяет Node;
2. создаёт `.runtime/venv` (edge-tts 7.3.1) и `.runtime/research` (tavily-cli 0.1.8);
3. находит или скачивает FFmpeg и проверяет libx264, loudnorm, ebur128;
4. скачивает headless Chrome для Remotion под эту ОС;
5. скачивает тяжёлые файлы стилей из GitHub Release и сверяет SHA-256 (`npm run assets -- status`).

Флаги: `--no-assets`, `--no-browser`, `--no-tavily`.

## Ключи — только пользователь
Скопируй `.env.example` в `.env.local` и впиши ключи сам: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (речь и Scribe). Apify подключается командой `npm run studio -- apify connect` в своём терминале (токен вводится скрыто). Tavily Search/Extract работает без ключа в бесплатном лимите; вход — `.runtime/research` → `tvly login` (Windows: `.runtime\research\Scripts\tvly.exe login`). Агент ключи не видит, не печатает и не передаёт.

## Windows: что учесть
- Держи папку **вне OneDrive** (например `C:\Studio\Motion Studio`): SQLite и гигабайты рендеров плохо живут в синхронизируемой папке. Длинные пути: `git config --global core.longpaths true`.
- Движок: `npm run studio -- start` — работает в фоне без окна; `npm run studio -- stop` останавливает аккуратно (через файл-запрос `data/engine.stop`, в крайнем случае `taskkill /T`).
- Не копируй `node_modules` и `.runtime` с Mac — ставь заново (`npm install`, `npm run setup`): sharp, компоновщик Remotion и Python-окружения свои для каждой ОС.
- Хуки Claude Code (`.claude/settings.json`) рассчитаны на Git Bash, которым Claude Code пользуется на Windows; если хук не сработал, работа не блокируется — просто держи цикл `run` сам.
- Ограничение: OCR кадров и поиск лица для портретов используют Apple Vision и есть только на macOS. На Windows/Linux ревью пишет «OCR недоступен» — проверяй текст в кадрах глазами; портреты обрезаются по центру сверху.

## Проверка
- `npm run studio -- status` — движок, FFmpeg, Chrome, Tavily, ключи (есть/нет, без значений).
- `npm run studio -- health` — то же подробнее (легаси Codex/Claude CLI, голос).
- `npm run assets -- status` — тяжёлые файлы стилей.
- Для разработчика: `npm run check`, `npm test`, перед публикацией — `npm run secrets:check`.

## Если что-то не так
| Симптом | Что сделать |
|---|---|
| `Нужен Node.js 22.13` | поставить Node LTS, `npm install` заново |
| FFmpeg «нет» | `npm run setup` или `STUDIO_FFMPEG=<путь>` в `.env.local`; Windows: `winget install Gyan.FFmpeg` |
| Chrome «нет» | `npm run browser:install` |
| музыка не звучит, `assets status` — «нет» | `npm run assets -- fetch` |
| «ОТЛИЧАЕТСЯ» в `assets status` | файл стиля изменён локально — пакеты неизменяемы; верни оригинал из Release или сохрани изменения новой версией пакета |
| Python не найден | python.org + PATH, или `STUDIO_PYTHON_BOOTSTRAP=<путь к python>` и `npm run setup` |
