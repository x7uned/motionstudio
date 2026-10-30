# Факты и источники · «Many claw machines choose when to let you win»

(Скопировано из `claw-machine/script.md`; текст озвучки не менялся.)

## Факты и ссылки

- ICE «Emporium», инструкция 2012 года. Prize Cost по умолчанию $3, Payout 10–50% (по умолчанию 33%), Min/Max Power 45/99%.
  - Хватка ослабевает на подъёме, так что приз «just slip out… without a noticeable release».
  - Release strength советуют ставить «just NOT be able to hold the prize».
  - https://www.bmigaming.com/Games/Manuals/ice/emporium-crane-redemption-game-service-manual-ice-games.pdf
- Sega «Cubic 4 Catcher», 2019. Win rate 1–900, пример в инструкции — один выигрыш на 100 игр. Режимы Random / Fixed: в Fixed выигрыш даётся, когда счётчик ≥ win rate, а после выигрыша счётчик обнуляется. Strong-V 20–48 V (по умолчанию 48), Weak-V 0–30 V (по умолчанию 10): https://www.bmigaming.com/Games/Manuals/sega/Cubic_4_Catcher_Prize_Redemption_Arcade_Game_Manual_Sega_Amusements.pdf
- Paokai «Show Time»: Auto Percentaging по цене игры и стоимости приза, «Super Power Frequency 0=FIXED 1=Random»: https://coastalamusements.com/wp-content/uploads/2020/01/Coastal-Showtime-User-Manual.pdf
- Prize Cube: формула «Prize Cost × (100% + Percentage) / Game Cost = X game 1 prize»: https://www.betson.com/wp-content/uploads/2023/07/804MAN001-rA-Prize-Cube-6-Player-User-Manual.pdf
- Не все так настраивают: NPR 2015, «some vendors don't even use the voltage feature»: https://text.npr.org/437873846
- «≈1 win / 9 plays» на экране — наш расчёт по умолчаниям ICE ($3 приз, 33%, $1 игра), не цифра из инструкции.

**Оговорки:** правила зависят от страны. В Великобритании автоматы с компенсатором выплат относятся к игровым. В Аризоне запрещено настраивать коготь так, чтобы он не мог схватить приз. В Японии стоимость приза ограничена примерно 1 000 иен. Это осталось за кадром ради длины. Режим (Random или Fixed) снаружи не видно, поэтому совет «после выигрыша хуже» дан только для автоматов со счётчиком («On those»). Инструкция в кадре — наш рисунок, не скан. Цитаты на экране — пересказ.

## Что на экране и откуда
- **WIN RATE 1 / 100** — пример из инструкции Sega «Cubic 4 Catcher» (win rate 1–900, пример — один выигрыш на 100 игр).
- **PLAY $1 · PRIZE $3 · PAYOUT 33% → ≈1 WIN / 9 PLAYS** — умолчания ICE «Emporium» (Prize Cost $3, Payout 33%) и цена игры $1; итог — наш расчёт ($3 приз ÷ 33% = $9 выручки на выигрыш = 9 игр по $1), не цифра из инструкции.
- **CLAW POWER 48 V / 10 V** — умолчания Sega Strong-V 48 V и Weak-V 10 V. Стрелка поднимается до 48 В на хватке и плавно падает до 10 В на подъёме (иллюстрация того, что инструкция ICE описывает словами: хватка ослабевает по дороге вверх).
- **«SET JUST / NOT ABLE / TO HOLD»** — пересказ совета ICE: release strength «just NOT be able to hold the prize».
- **MODE RANDOM / FIXED** — режимы Sega (и «Super Power Frequency 0=FIXED 1=Random» у Paokai). В FIXED выигрыш, когда счётчик ≥ win rate, после выигрыша счётчик обнуляется. «07/12 → 12/12 → 00/12 → 01/12» и «WIN AT 12» — условная настройка для иллюстрации.
- **WORST TIME** на «01 / 12» — только для автоматов со счётчиком (в тексте «On those»).
- **SKILL** — соседний автомат: «Not every machine is set this way» (NPR 2015: часть владельцев вообще не использует регулировку напряжения).
