---
name: motion-studio
description: Drive the local Motion Studio end to end from chat — "сделай видео про X", "по шаблону Y", "сделай три ролика", "сохрани как шаблон", "разбери эти Reels", "открой студию". You (the chat agent) do every thinking role through studio tasks; the studio engine validates, voices, renders and measures. Use for any request to make, revise, approve or template a video in this workspace, or to start/stop the engine or open the UI.
---

Полные инструкции навыка — общий файл для любого чат-агента: `.agents/skills/motion-studio/SKILL.md` (прочитай его целиком перед работой), `references/roles.md`, `references/settings.md`, `references/harnesses.md`.

В Claude Code: движок запускай через терминальную панель (`npm run studio -- start`), UI — только по просьбе человека (`npm run studio -- ui`). Независимые роли (редактор, фактчек, ревью кадров, фрагменты разборов) отдавай сабагенту `studio-role` с путём папки задания, затем `npm run studio -- submit <id> <taskId> --isolated`. Несколько роликов — по сессии на ролик или сабагент general-purpose на ролик (у него есть shell и свои сабагенты). Команду `run` запускай с таймаутом Bash 600000 мс. Stop-хук проекта не даст закончить ход, пока ролики этой сессии в работе.
