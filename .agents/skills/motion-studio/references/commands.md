# Команды студии

Все команды: `npm run studio -- <команда>` из папки студии (на любой ОС). Коды выхода `run` — в SKILL.md, раздел 2. Решения пользователя (аккаунт, платное, одобрение, выбор голоса/текста) передаются его дословными словами (`--quote`, `--user-confirmed`).

## Установка и движок
| Команда | Что делает |
|---|---|
| `npm run setup` | Первая установка на этой ОС (`install.md`) |
| `npm run assets -- status` · `fetch [--only <префикс>]` | Тяжёлые файлы стилей из GitHub Release, проверка SHA-256; локальные изменения не перезаписываются |
| `start [--foreground]` · `stop [--force]` | Движок очереди (в терминале пользователя) |
| `status [<id>]` | Движок, слот рендера, инструменты, ключи (есть/нет), активные задачи; с id — итог и журнал проекта |
| `health` | Подробная проверка инструментов и легаси CLI |
| `config get [ключ]` · `set <ключ> <значение>` · `unset <ключ>` | Настройки `studio.config.json` (`settings.md`) |

## Ролики
| Команда | Что делает |
|---|---|
| `templates` | Каталог шаблонов (подробнее о стилях — `styles.md`) |
| `create --topic "…" [флаги]` | Новый проект (флаги — SKILL.md, раздел 1); `--engine legacy` — встроенные Codex/Claude, тогда доступны `--content-model`, `--voice-mode selected|baseline`, `--models <id,id>` (3D-модели), `--author <uuid>` |
| `run <id> [<id2> …] [--timeout 540]` | Ждать, пока ролику нужен ты или пользователь |
| `task <id> [--all]` · `submit <id> <taskId> [--isolated]` | Задания агенту и ответы |
| `list [--all] [--limit N]` | Все проекты: id, дата, статус, формат, MP4 |
| `events <id>` | Полный журнал проекта |
| `report <id>` | Источники, исследование, редактор, фактчек, голосовой план, концепция: что есть и что актуально |
| `scenes <id> [show]` · `export <файл>` · `save <файл>` | Сценарий по сценам; ручная правка заголовков, текста, визуала, подписей (бывший «Редактор»), затем `retry` |
| `narrative <id> <файл>` | Новый цельный рассказ одним абзацем (новая озвучка — с подтверждением) |
| `retry <id>` | Рендер заново после правки |
| `repair <id> --notes "…"` | Правка только изображения, без озвучки (агентные проекты) |
| `review <id>` | Повторная проверка готового MP4 без озвучки и рендера |
| `revise <id> --feedback "…"` | Вернуть на доработку с замечанием редактора |
| `confirm <id> tts --quote "…"` | Разрешить новую платную озвучку |
| `approve <id> --quote "…"` | Одобрение — только по дословным словам пользователя |
| `pause` · `resume` · `cancel` · `release <id>` | Управление роликом |
| `media <id> [list]` · `add "<имя>" --kind logo|person|flag [--wikidata Q…]` | Настоящие логотипы, портреты, флаги из Wikimedia Commons |
| `compare <id> prepare` · `show` · `select --winner A|B|tie [--scores "5,4,4,5,5;3,4,4,4,5"] [--comment …] --user-confirmed "…"` | Слепое сравнение первого рассказа и текущей редакции; выбирает пользователь |

## Шаблоны и стиль
| Команда | Что делает |
|---|---|
| `template save <projectId> --id <id> --name "…" [--notes …]` | Шаблон из одобренного ролика (новая версия, старые не трогаются) |
| `template sample <style-lab-id> --user-confirmed "…"` | Образец стиля из `work/style-lab/<id>` (`connected=false`) |
| `profile get [--out файл]` · `profile set <файл>` | Профиль стиля автора (применяется к новым проектам) |
| `style refs list [--archived]` · `add <файлы…>` · `add --text-file <файл> [--name …]` · `archive|restore <id>` | Материалы стиля: кадры JPG/PNG/WebP до 15 МБ, транскрипты TXT/SRT/VTT |
| `style analyze --agent "…"` (или `--engine legacy`) | Извлечь правила из материалов → `run style` |

## Разборы Reels, голоса, 3D, звуки
| Команда | Что делает |
|---|---|
| `apify connect` | **Только пользователь, в своём терминале**: скрытый ввод токена Apify Free → `.env.local` |
| `apify check` | Подключён ли Apify и на тарифе Free |
| `refs add <url>… --agent "…" --user-confirmed "…" [--step 0.5|1] [--name …]` | Разбор 1–20 Reels (Apify Free ≤ $1 + Scribe) |
| `refs list` · `refs show <id>` · `refs retry <id>` | Подборки, детали и каталоги, продолжение незавершённой |
| `voices list` | Голоса и модели ElevenLabs, кредиты, выбранный профиль |
| `voices quote --text-file <txt> --alt-voice <id> --rates a,b,c --rate-source "…"` | Оценка слепого сравнения трёх голосов (бесплатно) |
| `voices start <id> --quote-hash <h> --user-confirmed "…"` | Платный запуск трёх генераций |
| `voices state <id>` · `voices sample <id> <0-2> [--out файл.wav]` | Состояние и образцы A/B/C вслепую |
| `voices select <id> <0-2> --user-confirmed "…"` | Победитель — только выбор пользователя |
| `models list` · `add <glb|gltf> --name … --rights …` · `demo` | Свои 3D-модели (≤ 25 МБ) и демо-проект three/v1 |
| `sfx` | Диагностика библиотеки звуков (ничего не скачивает) |

## Что заменило веб-интерфейс
| Было в вебе | Теперь |
|---|---|
| Библиотека проектов, плеер | `list`, `status <id>`, файлы MP4/постер/лист в `data/projects/<id>`; агент отправляет MP4 пользователю |
| Редактор сцен | `scenes export/save` |
| Цельный рассказ | `narrative` |
| Ревью, «Перепроверить», «На доработку», «Принять» | `status`, `review`, `revise`, `approve --quote` |
| Исследование и отчёты | `report`, файлы в папке проекта |
| Слепое сравнение текстов | `compare` |
| Стиль автора | `style refs …`, `style analyze`, `profile get/set` |
| Разборы видео, подключение Apify | `refs …`, `apify connect/check` |
| Голос рассказчика, сравнение голосов | `voices …` |
| 3D-модели | `models …` |
| Проверка здоровья | `status`, `health` |
Код веба сохранён в истории git: тег `web-ui-final`.
