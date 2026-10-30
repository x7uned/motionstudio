---
name: motion-studio
description: Motion Studio as one skill with settings and styles — make short explainer videos end to end from chat: "сделай видео про X", "по шаблону Y", "в стиле Z", "сделай три ролика", "сохрани как шаблон", "разбери эти Reels", "какие есть стили", "настрой студию", "установи студию". You (the chat agent) do every thinking role through studio tasks; the studio engine validates, voices, renders and measures. No web app; macOS, Windows and Linux. Use for any request to make, revise, approve or template a video in this workspace, to pick a style, change settings, or install/start/stop the engine.
---

Полные инструкции навыка — общий файл для любого чат-агента: `.agents/skills/motion-studio/SKILL.md` (прочитай его целиком перед работой) и справочники в `.agents/skills/motion-studio/references/`: `install.md`, `commands.md`, `styles.md`, `settings.md`, `roles.md`, `libraries.md`, `harnesses.md`.

В Claude Code: движок запускай через терминальную панель (`npm run studio -- start`). Веб-интерфейса нет — результаты показывай файлами (MP4, кадры ревью). Независимые роли (редактор, фактчек, ревью кадров, фрагменты разборов) отдавай сабагенту `studio-role` с путём папки задания, затем `npm run studio -- submit <id> <taskId> --isolated`. Несколько роликов — по сессии на ролик или сабагент general-purpose на ролик (у него есть shell и свои сабагенты). Команду `run` запускай с таймаутом Bash 600000 мс. Stop-хук проекта не даст закончить ход, пока ролики этой сессии в работе.
