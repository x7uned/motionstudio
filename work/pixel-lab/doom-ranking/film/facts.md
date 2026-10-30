# Факты и источники · «Doom runs on a lawn mower, a light bulb, and even bacteria»

(Скопировано из `doom-ranking/script.md`; текст озвучки не менялся. Наушники вырезаны из текста ради длины, в фильме их нет; ссылка оставлена как в сценарии.)

## Факты и ссылки

- Мир игры обновляется 35 раз в секунду: https://en.wikipedia.org/wiki/Doom_engine. Код открыт 23.12.1997, под GPL с 1999 года.
- Husqvarna Automower NERA, официальное обновление (апрель–сентябрь 2024): https://www.engadget.com/can-your-robot-lawnmower-run-doom-this-one-can-162641979.html. Цифра 35 fps известна только из пересказа в прессе, поэтому в тексте её нет.
- Лампочка IKEA TRÅDFRI (next-hack, 2021): чип MGM210L, к нему добавлены экран 160×128, кнопки и флеш-память, «over 30fps»: https://gigazine.net/gsc_news/en/20210615-doom-on-ikea-tradfri
- Наушники Pinebuds Pro (январь 2026): Doom считает чип наушника, кадры уходят по проводу на веб-страницу, до 18 fps: https://hackaday.com/2026/01/27/running-doom-on-earbuds/
- DoomPDF (2025): «around 80ms per frame», около 12,5 fps: https://github.com/ading2210/doompdf
- Тест на беременность (Foone, 2020): от теста остался только корпус, а процессор, экран и картинку дал компьютер: https://www.gamespot.com/articles/doom-is-finally-playable-on-a-pregnancy-test/1100-6481877
- Redstone-компьютер IRIS (ModPunchtree, 2024): около 23 с на кадр на ускоренном сервере MCHPRS, Doom сильно упрощён: https://www.gamespark.jp/article/2024/04/08/140147.html
- E. coli (Ren Ramlan, MIT, 2024): компьютерная модель, бактерии только экран, около 70 мин на кадр, вся игра около 600 лет: https://www.theregister.com/2024/01/31/bacteria_runs_doom
- TypeScript types (Dimitri Mitropoulos, 2025): первый кадр 12 дней: https://simonwillison.net/2025/Feb/27/typescript-types-can-run-doom/

**Оговорки:** косилка и лампочка не измерены одинаково, поэтому в тексте нет точных цифр для косилки. Бактерии — это модель, а не опыт в лаборатории, и считает игру всё равно компьютер. Доступ к Doom Wiki был закрыт, поэтому 35 fps взяты из Википедии. Наушники 2026 года: в разных изданиях от 18 до 27 fps, в тексте взята осторожная цифра Hackaday.

## Что на экране и откуда
- **TIME PER FRAME** — логарифмическая шкала от 1/35 с (35 кадров в секунду, Википедия «Doom engine») до 12 дней (первый кадр в типах TypeScript). Точки: ПК 1/35 с, лампочка ~1/30 с, PDF ~1/12 с (≈80 мс), Minecraft 23 с, бактерии 70 мин, TypeScript 12 дней.
- **Косилка: «OFFICIAL UPDATE · 2024»** — официальное обновление Husqvarna (Engadget, 2024); числа FPS нет, бегунок не двигается (цифра известна только из пересказа).
- **Лампочка: «~30 FPS», CHIP, + SCREEN** — next-hack 2021: чип лампочки, к нему добавлены экран, кнопки и память, «over 30fps».
- **PDF: «~12 FPS»** — DoomPDF, «around 80ms per frame»; коридор нарисован символами и обновляется 12 раз в секунду.
- **Тест на беременность: «SHELL ONLY», NEW CHIP, NEW SCREEN** — Foone 2020: от теста остался корпус, чип и экран новые. Не ранжирован, бегунок стоит.
- **Minecraft: «23 S / FRAME», «SPED-UP SERVER»** — IRIS, около 23 с на кадр на ускоренном сервере MCHPRS. Кадр на экране из ламп собирается по рядам (в ускоренном показе).
- **Бактерии: «COMPUTER MODEL», «70 MIN / FRAME», «600 YEARS»** — Ren Ramlan 2024: компьютерная модель, ~70 мин на кадр, вся игра ~600 лет. Сетка 48×32 точки — иллюстрация (точки разгораются в ускоренном показе), часы идут в ускоренном показе.
- **TypeScript: «THE SLOWEST», «12 DAYS / FRAME», календарь DAY 1 → 12** — Dimitri Mitropoulos 2025: первый кадр 12 дней. Стена кода — условные блоки, не настоящий код.
- **Дискета «DOOM 1993», «FREE CODE», «SMALL»** — игра 1993 года, код открыт в 1997 (GPL с 1999).
