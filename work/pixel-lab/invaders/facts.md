# «The lowest aliens can't hit you» — факты (ресёрч 2026-10-24, сабагент; полные заметки — `research/notes.md`)

Главный источник — прокомментированный дизассемблер 8080 на Computer Archeology (CA). Это код версии **Midway**: по комментариям CA он ветвь кода Taito. Для оригинала Taito то же поведение подтверждают сам Нисикадо и IGCC 2018. Координаты ниже: «Y» — пиксели **вверх от низа экрана**, как `Yr` в дизассемблере. Y пришельца — нижний край спрайта.

## Что поменялось против исходной идеи
- Хук «the lowest aliens **can't shoot** you» неточен: нижние пришельцы **стреляют**, их выстрелы просто не могут убить. В ролике: «can't **hit** you» и сразу «They still shoot, but their shots can't hurt you».
- Ускорение (по одному пришельцу за кадр) оставлено одной фразой: оно связано с сюжетом цикла (армию расчищают, последний пришелец носится).

## Механика (HIGH, CA-Code https://www.computerarcheology.com/Arcade/SpaceInvaders/Code.html)
1. Выстрел берётся из **самого нижнего живого пришельца в колонке** (`FindInColumn` `$062F`).
2. Выстрел появляется **на 10 px ниже** пришельца (`$05A9–$05B4`: Y = Y пришельца − `$0A`, «Set shot coordinates below alien»). Перед первой отрисовкой он сдвигается ещё на 4 px (на 5, когда пришельцев ≤ 8). Нисикадо: «I programmed it so that their shots would come out just a little bit in front of the invaders» (https://shmuplations.com/nishikado/).
3. Попадание засчитывается только в **узкой полосе высот** Y 30–38 (`$05FB–$060F`: ниже `$1E` — «below player's area», от `$27` — «above player's area»; иначе выстрел просто взрывается).
4. Пушка: Y 32–39 (`$1B1A` = `$20`, спрайт 8 px). Самая низкая высота перед посадкой — низ пришельцев на Y 40, «ноги» касаются верха пушки. Выстрел оттуда появляется на Y 30, впервые рисуется на Y 26 — **ниже полосы**. Даже касаясь основания пушки, он «too low» и просто лопается. Нисикадо: выстрелы «seemed to pass right through his ship».
5. **Только эта высота.** Пришелец на ряд выше (Y 56) стреляет с Y 46 → 42 → 38 → 34 и попадает в полосу — может убить (расчёт сабагента по коду, источником не подтверждён напрямую).
6. **Ещё шаг вниз — посадка.** Если живой пришелец опустился ниже Y 40 (`CursorNextAlien` `$016A–$016D`, «reached the end of screen… kill the player», `invaded` = 1), игра заканчивается **даже с запасными жизнями** (`$16E6–$1709`; JA-Wiki «残機があってもゲームオーバー»; Нисикадо «automatically game over»).
7. Армия опускается на 8 px при каждом ударе о стену (`RackBump` `$1597`). Ряды отстоят на 16 px. Во 2-й волне низ армии стартует с Y 96 (`AlienStartTable` `$1DA3`; в 1-й — Y 120). Щиты на Y 48–63 (22×16, 4 шт.), пришельцы стирают их, проходя.

## Название и история (HIGH, кроме отмеченного)
- 名古屋撃ち, «Nagoya attack». **Происхождение названия неизвестно** — Нисикадо: «残念ながら分かりません» (https://www.chunichi.co.jp/article/554896). Не говорить «открыли в Нагое».
- Нисикадо называет это «a programming bug» (shmuplations); IGCC 2018 (https://web.archive.org/web/2024/https://igcc.jp/invader-house2018/): исправить было можно, но отдел продаж Taito сказал «このままで良い» — вторая замена ПЗУ в уже проданных автоматах была бы дорогой.
- Как играли: подпускали армию до последнего ряда и расстреливали передний ряд в упор; ошибка на последнем ряду — мгновенная посадка (Middle Edge https://middle-edge-neo.jp/articles/1507/ ; Shmups Wiki https://shmups.wiki/library/Space_Invaders ).
- Не работает в порте для Atari 2600 и в части клонов (JA-Wiki https://ja.wikipedia.org/wiki/スペースインベーダー ).

## Ускорение (HIGH)
- За кадр двигается **ровно один** живой пришелец, на 2 px; прерывания 60 раз в секунду (CA-Overview https://www.computerarcheology.com/Arcade/SpaceInvaders/ , CA-Hardware). 55 пришельцев — шаг армии ≈ 0,92 с; последний шагает каждый кадр — 60 раз в секунду (вправо 3 px, влево 2 px).
- На каждый взрыв марш стоит 16 кадров.
- Нисикадо (Wired, 12.04.2023, https://www.wired.com/story/space-invaders-45-years-tomohiro-nishikado/): рисовать по одному пришельцу за 1/60 с — ответ на слабое железо; ускорение «makes the game more interesting». Решение оставить — Retro Gamer №3 через EN-Wiki.

## Избегать
«the lowest aliens can't shoot»; «once low, nothing can hit you»; «works until they touch the ground»; «discovered in Nagoya»; «the CPU drew faster»; «the speed-up was an accident»; «works on every version»; точные очки («150k»).
