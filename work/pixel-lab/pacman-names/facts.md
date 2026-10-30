# Факты: «Pac-Man's ghost names got lost in translation» (2026-10-24)

Полный фактчек с цитатами и оценкой источников — `research.md` (сабагент, 2026-10-24). Здесь — только то, что сказано или показано в ролике, и откуда это.

| В ролике | Проверка | Источник |
|---|---|---|
| Имена: Blinky, Pinky, Inky, Clyde (красный, розовый, голубой, оранжевый) | подтверждено | Jamey Pittman, *The Pac-Man Dossier*, гл. 4 — https://pacman.holenet.info/ ; Wikipedia «Pac-Man» |
| На экране автомата (Midway, 1980) у каждого ещё одно слово-характеристика: Shadow, Speedy, Bashful, Pokey | подтверждено (колонка CHARACTER, имена — колонка NICKNAME) | Dossier, гл. 4; перевод кода ROM mburkley/pacman-c (`MSG_NICKNAME`, `introduceShadow`) — https://github.com/mburkley/pacman-c ; arcade-history.com |
| Speedy не быстрее остальных, Pokey не медленнее | подтверждено: в начале уровня все четверо одной скорости, ускоряется только Blinky (Cruise Elroy) | Dossier, гл. 4: «All ghosts move at the same rate of speed when a level begins», «speedy is a poor translation», «Clyde moves at the same speed as Inky and Pinky» |
| В японском оригинале (Puck Man) слова другие и описывают, как охотится призрак: OIKAKE, MACHIBUSE, KIMAGURE, OTOBOKE (на экране латиницей) | подтверждено (строки ROM) | дизассемблер Scott Lawrence, `mspac.asm` (дамп строк Puck Man) — http://umlautllama.com/projects/pacdocs/mspac/mspac.asm ; Dossier, гл. 1 и Glossary; ja.wikipedia «パックマン» |
| oikake 追いかけ = the chaser | подтверждено | Jisho/JMdict «to chase, to pursue»; Dossier «to run down or pursue» |
| machibuse 待ち伏せ = the ambusher | подтверждено | Jisho «ambush, lying in wait»; Dossier «to perform an ambush» |
| kimagure 気まぐれ = moody | подтверждено (Dossier: «a fickle, moody, or uneven temper») | Jisho «capricious, fickle, changeable»; Dossier |
| otoboke お惚け = playing dumb | подтверждено (не «stupid»: это притворство) | デジタル大辞泉 «わざと知らないふりをすること»; Dossier «pretending ignorance»; GameInternals «feigning ignorance» |
| Blinky целится в клетку Pac-Man | подтверждено | Dossier, гл. 4 |
| Pinky целится на 4 клетки впереди Pac-Man | подтверждено (при взгляде вверх баг сдвигает цель ещё на 4 влево; в ролике в эти моменты клетки не показываются) | Dossier, гл. 4; Иватани, интервью OPENERS 2020 (32 точки = 4 клетки) |
| Цель Inky зависит от того, где Blinky (линия от Blinky через клетку в 2 впереди Pac-Man, удвоенная) | подтверждено | Dossier, гл. 4 |
| Clyde гонится издалека; ближе 8 клеток уходит к своему углу внизу слева, поэтому кружит вокруг | подтверждено; расстояние по прямой между клетками, ровно 8 — ещё погоня (код: сумма квадратов < 64) | Dossier, гл. 4 («Clyde circling around and around»); mburkley/pacman-c `clydeScatterOrChase_27f1` |
| Его угол — левый нижний; там его путь домой проходит прямо через Pac-Man | подтверждено | Chad Birch, GameInternals, «Understanding Pac-Man Ghost Behavior» (архив: https://web.archive.org/web/20201213134620/https://gameinternals.com/understanding-pac-man-ghost-behavior); Dossier гл. 4–5 |

## Оговорки

- Kimagure и otoboke описывают впечатление от поведения, а не алгоритм. Правило Inky и Clyde полностью определено (Dossier), «переменчивость» — следствие того, что цель зависит от Blinky.
- Кто дал имена — неизвестно (Dossier пишет пассивно). Цитаты Иватани, что эти слова описывают ИИ, нет — в ролике этого не говорим.
- В Dossier Pinky — «he», в современных материалах Bandai Namco — девочка. В ролике у Pinky нет местоимения.
- Японские слова озвучены по фонетической записи (oh-ee-kah-keh и т. д.), в субтитрах — латиница, как на экране Puck Man. Проверка Scribe: Oikake, Kimagure, Otoboke распознаны дословно, Machibuse — как «Machiguse» (погрешность распознавания).
- Лабиринт, спрайты, игра и звуки — наши, нарисованы и синтезированы в коде. Это иллюстрация правил, а не оригинальная игра. Призраки в ролике всё время живут по правилам Dossier (режим погони, в конце круга — разбег).
