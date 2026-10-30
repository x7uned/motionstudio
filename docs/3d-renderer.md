# 3D-рендер · three/v1

## Рабочий процесс

Веб-интерфейса нет с 2026-10-30; всё делается командами `npm run studio -- …`. Готовая подборка разборов (`refs list`) подключается к новому ролику: `create --topic «новая тема» --reference <id подборки>`. Без `--render-mode` режим выбирается автоматически по разбору: Three.js включается для сцен, которые анализатор предлагает собирать в Three.js или Blender. Для ролика без референса 3D задаётся вручную: `--render-mode three`. Свои модели — `--models <id,id>` (id из `models list`). Прежние роли GPT‑6.1 Sol / Claude Opus 5.5 из списка ниже — с `--engine legacy`; в агентном режиме эти роли выполняет ведущий агент. Сохранённый «История технологий / v1» остаётся отдельным неизменным 2D-шаблоном.

1. Изолированные GPT‑6.1 Sol xhigh роли готовят поисковые запросы, проверяют прочитанные Tavily первоисточники и пишут сценарий.
2. Один непрерывный дубль ElevenLabs задаёт таймкоды слов и измеренную длительность. Для теста можно выключить речь.
3. 3D-режиссёр Claude Opus 5.5 xhigh получает сценарий, снимок разбора референсов, бренд и выбранные реальные модели. Он возвращает валидированный JSON, а не исполняемый код.
4. Камера, трансформации и появление объектов привязываются к главам и словам измеренного сценария. Один мир и одинаковые id объектов сохраняются весь фильм; переходов страниц нет.
5. Three.js + React Three Fiber + Remotion рендерят кадры и собирают MP4. Камера, титры, субтитры и аудио используют 30 fps. Экспорт: H.264, yuv420p, BT.709 limited, AAC 48 kHz, faststart.
6. Очередь делает полное декодирование, проверяет длительность, громкость, речь и кадры. Редактор принимает результат вручную. Автоматический разбор кадров не является прослушиванием или просмотром движения.

Технический тест на 30 с без речи: `npm run studio -- models demo`, затем `run <id>`. Для него сценарий задан студией: это проверка рендера, а не новый фактологический выпуск.

## Модели

Базовые процедурные модели: смартфон, сервер, чип, спутник, стилизованная Земля, Луна и простые геометрические формы. Это условные иллюстрации, не точные реконструкции предметов и не точная карта Земли. Режиссёр обязан записывать упрощения в `notes`; они видны в проекте.

GLB 2.0 или embedded GLTF 2.0 добавляется командой `npm run studio -- models add <файл> --name «…» --rights «чья модель и на каких правах»`; список — `models list`. При создании проекта можно выбрать до восьми моделей (`create … --models <id,id>`). Поддерживаются материалы, скелеты и встроенные анимационные клипы. Клипы проигрываются по абсолютному времени кадра, без собственного real-time цикла.

Ограничения загрузки: 25 МБ, 250 000 вершин, 128 meshes, 512 nodes, 16 текстур/клипов. Буферы и PNG/JPEG должны быть внутри файла. Внешние URI, соседние .bin и изображения не запрашиваются. Draco, KTX2, meshopt и обязательные неизвестные расширения отклоняются. Для сцены с особым предметом предоставьте пригодную модель: скачивание/покупка и нейросетевая генерация моделей здесь не подключены.

Библиотека: `data/models/<sha-prefix>.glb|gltf` плюс JSON-метаданные. Проект получает собственный снимок `models/`, SHA‑256 файлов и контрольную сумму manifest в профиле. Повреждённый снимок останавливает рендер. Изменения библиотеки не переписывают старые проекты.

## Декларативный план

`Storyboard.filmKind = three`, `Storyboard.world3d` соответствует `src/lib/scene3d.ts`. В плане: камера с position/target/fov, свет, список объектов, материалы, ключи position/rotation/scale, enter/exit, выбранный клип GLB, ссылки на исходные shots и объяснения решений. `at={scene,progress,cue}` задаёт смысловую отметку; cue при наличии использует реальные word timestamps. Камера покрывает весь ролик. Ключи строго упорядочены; неизвестная модель отклоняется.

Чистые функции `cameraState()` и `objectState()` вычисляют состояние для произвольного кадра. Нет CSS-анимаций, таймеров, случайного состояния или кодогенерации. Камера интерполируется плавно, вход/выход моделей длится0,5 с, заголовки и субтитры перекрываются мягко.

Проект хранит `three-plan.json`, `three-context.json`, `3D-RENDER.md`, результаты изолированного режиссёра, измеренный storyboard, MP4 и ревью. Повтор использует проверенный план; правка сценария (`scenes <id> save`) сбрасывает его для новой постановки. Сценарий и выбранные модели сохраняются. Пользовательские старые storyboards не переводятся в3D автоматически.

## Границы возможностей

Референс помогает воспроизвести структуру сцены, композицию, свет и характер движения. Система не извлекает исходную mesh, скрытые поверхности или точную траекторию камеры из Reels. Blender в разборе означает возможный способ исходной/предлагаемой сборки; Three.js использует доступные модели и записывает приближения. Живая съёмка, экранные записи, сложные физические симуляции и полноценный монтаж исходного видео требуют отдельного рендерера и остаются заблокированными для автоматического запуска через3D.

## Проверка реализации

`npm run check`, `npm test`. После изменений рендера: настоящий проход очереди до MP4 и ревью, контактные листы на всех ключевых позах/сменах титров, проверка границ с шагом кадра, полный decode, реальное воспроизведение экспортированного файла.

Официальные API: [Remotion Three](https://www.remotion.dev/docs/three), [ThreeCanvas](https://www.remotion.dev/docs/three-canvas), [Three.js GLTFLoader](https://threejs.org/docs/#GLTFLoader).


## Пространственные объяснения и измеренные действия

В `three/v1` доступны `labelStyle: "pin"` для короткой экранной подписи, проецируемой из координат модели, и `world3d.shadows: true` для предметной сцены. Держать одновременно до трёх подписей; проверять читаемость в реальном кадре.

У GLB-клипа можно задать `animationWindow: {start, end}` с обычными словесными anchors. Клип проигрывается один раз за это окно и удерживает конечную позу. Без окна сохраняется прежний отсчёт от появления модели. Один и тот же кадр даёт одинаковую позу при прямом и обратном seek.

Необязательный `model-layout.json` в папке проекта содержит массив `assets`: `id`, исходные `size`/`center`, `restoreScale`, `restorePosition`, `notes`. Файл ограничен20КБ и валидируется; ID должны принадлежать снимку моделей. Он помогает режиссёру учесть центрирование и нормализацию GLB до размера2. Эти данные включены в отпечаток контекста3D, не исполняются как код.

Новые планы сохраняют `referenceShotIds` в формате `videoId:shot.id`, чтобы одинаковые имена фрагментов разных Reels не путались. Старые сохранённые миры остаются воспроизводимыми.

Анализ нескольких Reels выполняется независимо по видео с общим пределом трёх одновременных запросов модели. Готовые фрагменты повторно не генерируются. После проверки явно неверной автоматической транскрипции можно вручную повторить Scribe с известным языком (`rus`); автоматического платного повтора нет. Исходный ошибочный ответ сохранять отдельно.


Контекст3D-режиссёра ограничен: все исходные кадры и разборы остаются в подборке, а в один запрос передаются до4равномерно выбранных пространственных shots на пример с сокращёнными описаниями и полный каталог правил. Промежуточные diagram/beats не дублируются в3D-контексте. Это уменьшает повторение текста; не уменьшает покрытие сохранённого анализа.

Адаптер строгого JSON Schema делает необязательные поля required + nullable для ответа агента, а перед локальной Zod-проверкой возвращает null таких полей в отсутствие. Обязательное nullable exit=null сохраняется. Координатные тройки сохраняют длину3.

У загруженных непрозрачных моделей тень раскрывается вместе с видимостью через статический depth-material. Прозрачные исторические силуэты и светящиеся маршруты тень не отбрасывают. Проверять начальный кадр и вход поздних объектов, чтобы невидимая модель не выдавала себя тенью.

Для 3D-постановки выбран Claude Opus 5.5 xhigh (Claude Code CLI, restricted, без инструментов): компактные ключи камеры и трансформации по готовому сценарию. Старые проекты хранят свой three-context.json с прежним режиссёром GPT; при совпадении контекста план не пересчитывается. Отдельные роли планирования поиска, исследования и сценария сохраняют GPT‑6.1 Sol xhigh. Время ожидания или смена reasoning не должны приводить к повторной платной озвучке.

Готовность первого кадра: не вызывать continueRender сразу после setLoaded. ThreeCanvas в режиме экспорта использует frameloop=never. CanvasReady после коммита GLTF выполняет advance и завершает GPU-отрисовку до снятия delayRender; это исключает кадр с одними процедурными маркерами без загруженных моделей.

Экранные pin-подписи плавно скрываются до края кадра с учётом ширины текста, а не после обрезания букв. Проверять также промежуточные ракурсы во время пролёта.

## Visual design pipeline / detailed-machines v1

New quality-v2 topic projects snapshot `production.visualDesignVersion=1` (saved templates and old projects unchanged). After whole-story editing/fact verification, `visual-concept.ts` runs a separate GPT-6.1 Sol / xhigh visual editor: what the viewer sees, why, persistent hero, cutaway and local changes. It receives only retrieved source metadata/research, never voice credentials. Rules snapshot into the project from `video-design/visual-concept.md`.

A separate Claude Opus 5.5 / xhigh scene builder chooses supported geometry configurations from `detailed-machines/1`: sports car, pressure system and electric drive. `renderer/DetailedMachines.tsx` contains the static geometry, not generated code. Car details include body/canopy, four treaded wheels, spokes/brakes/suspension, chassis, drive, battery modules, wrapped COPV tanks, valves/pipes/nozzles and fans. Body opening, rear air jets, downward air jets and fans have separate continuous channels. Their internal layout is illustrative, not factory CAD or verified Tesla packaging. Unsupported required parts or missing uploaded models stop preparation before TTS. No cube/ring hero fallback.

Force glyphs use the static `arrow` primitive (local +Y; rotate by pi around Z for down). Detailed films constrain spatial labels to the exact pre-TTS `verifiedLabels`; reusing one does not invalidate fact approval, while a new label does. Downward illustrative outlets sit beside the body so the gas direction is visible, with markers fading before the support plane. Powered fans in an open cutaway move outward and rotate for inspection, with a visible exploded-view disclaimer. These are explanatory geometry and motion, not a physical fluid simulation or reconstructed factory layout.

Measured narration then goes to the existing separate Claude motion director, which uses these prepared assemblies and speech anchors. Schema and snapshot hashes prevent unknown assemblies or changed geometry configuration. Fan phase integrates the animated power channel, so changing power does not jump blade orientation. `confirmClaudeModel` checks actual CLI modelUsage and stops if the requested model is absent. Preparation reports (`npm run studio -- report <id>` and the project files) expose concept, parts, approximations and actual provider telemetry.

Changing narration archives these reports and invalidates dependent hashes. Picture-only repair preserves the continuous narration master. Final MP4 frames and native playback still require review; neither a concept nor a model report approves a film.

Production-сборки Next.js больше нет (веб-интерфейс удалён 2026-10-30, код — в теге git `web-ui-final`); Remotion собирает свой бандл при рендере (`src/lib/remotion-bundle.ts`). Проверка типов — `npm run check`.


## Нижний блок портретного quality-v2 ролика

По уточнению пользователя номер главы, заголовок и пояснение опущены на 110 px: y=1010 вместо900. Субтитры y=1250 вместо1124; их контейнер заканчивается на1395, внутри safe-zone1420. Исходная 3D-область y260..1110, масштаб модели и камера сохраняются: опущенный текст освобождает 110 px визуального зазора и не увеличивает модель к краям кадра. Верхняя шапка, фирменные цвета, CTA, камера и сцены не переписываются. Настройки: `src/lib/three-layout.ts`; общие 2D-субтитры и горизонтальная версия сохраняют прежние координаты.
