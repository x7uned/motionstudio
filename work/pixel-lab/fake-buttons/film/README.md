# «You've been pressing fake buttons» · пиксельный ролик (2026-10-24)

- **Аккаунт:** Kagenami. English, Dennis · Eleven v4, один дубль (`narration.txt`, 172 слова; тайминги слов сверены по Scribe — числа «2,500», «3,250» иначе съезжали).
- **Формат:** 1080×1920, 30 fps, 54,87 с. Не петля. Финал — «Liked this video? Send it to a friend, and follow…» + карточка SEND / FOLLOW (как в GTA).
- **Идея:** один мир сбоку — угол нью-йоркской улицы на закате (`levels/street*.mjs`: кнопка перехода ровно под пальцем персонажа канала, шкаф-контроллер с отсчётом, сигнал WALK по таймеру `walkAt(t)`) и офисное здание в разрезе (`levels/building*.mjs`: лобби, лифт со стариком и пожарным, офис с термостатом NOT CONNECTED). Камера: угол → лобби → подъём на лифте в офис → обратно на угол.
- **Карточки (мои, `levels/cards.mjs`):** FAKE BUTTONS?, NEW YORK · 2004 (3 250 точек, 2 500 гаснут), US LAW, FIREFIGHTERS, POLL 51/70, X-RAY телефона (NO SHUTTER, CLICK.WAV), FEELING OF CONTROL. Флаги — Commons (`media/`, `credits.txt`).
- **Пересборка:** `../../render-lock.sh fake-buttons ./build.sh fake-buttons`.
