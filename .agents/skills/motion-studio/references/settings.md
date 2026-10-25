# Настройки скилла · studio.config.json

Один источник настроек (решение пользователя 2026-10-21): файл `studio.config.json` в корне студии. Почему файл, а не таблица `settings` в SQLite: его читает любой чат-агент без инструментов базы, он не смешан с рабочим состоянием движка (`workerSeen`, `engineState`, профиль стиля) и переживает восстановление базы. Нет файла или ключа — действует значение по умолчанию. Схема строгая (`src/lib/studio-config.ts`): неизвестные ключи и похожие на ключи/токены значения отклоняются. **Секреты — только в `.env.local`.**

```
npm run studio -- config get                 # все ключи; «(по умолчанию)» — не задано в файле
npm run studio -- config get defaults.brand  # одно значение (JSON)
npm run studio -- config set defaults.language en
npm run studio -- config unset defaults.language
```

| Ключ | По умолчанию | Смысл |
|---|---|---|
| `agent.declared` | `null` | Самоотчёт ведущего агента для `create`, если не передан `--agent` / `MOTION_STUDIO_AGENT`. Например `claude-code/claude-opus-5-5`. Другая среда в той же папке передаёт свой `--agent`. |
| `defaults.brand` | `ask` | `ask` — не создавать ролик без названного аккаунта и спросить пользователя (Kagenami или World If Then). `kagenami`, `worldifthen`, `xtuned` — аккаунт по умолчанию, только по решению пользователя. |
| `defaults.language` | `ru` | `ru` или `en`. Русский пишется как отсутствие поля (промпты и кэши байт в байт прежние). Kagenami и World If Then — только `en`. |
| `defaults.template` | `null` | Шаблон по умолчанию (`id` или `id@vN`); `create --template none` — без шаблона. |
| `defaults.duration` | `60` | 30, 45, 60 или 150 секунд — потолок, не квота тишины. |
| `defaults.format` | `9:16` | `9:16` или `16:9`. |
| `defaults.factCheck` | `off` | `off`, `lenient`, `strict`. |
| `defaults.voice` | `true` | `false` — ролики без озвучки по умолчанию (`create --voice on` включит). |
| `engine.maxActiveJobs` | `0` | Сколько задач движок ведёт одновременно; `0` — без искусственного предела. Применяется без перезапуска. |
| `engine.renderSlots` | `1` | Сколько локальных рендеров (Remotion, лист ключевых кадров, кодирование/сведение FFmpeg) идут одновременно. **1 = строго по одному.** Меняется только по словам пользователя: `config set engine.renderSlots 2 --user-confirmed "<его слова>"` (цитата сохраняется в `confirmations`). |
| `engine.autostart` | `false` | `run` сам запускает движок, если он не запущен. Включай только там, где shell агента имеет вход Tavily (не в песочнице Bash Claude Code). |
| `ui.port` | `3210` | Порт UI (`npm run studio -- ui`, `npm start`). Только `127.0.0.1`. Переменная `PORT` важнее. |

Порядок для `create`: флаг → значение, заданное в файле → значение шаблона → значение по умолчанию.
