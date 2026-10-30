# Many claw machines choose when to let you win · сценарий v1 (2026-10-26)

- **Аккаунт:** Kagenami (@kagenami_ai), English, голос Dennis · Eleven v4, Plain English. Заказ пользователя: идея №67 из списка 4.
- **Опора:** аудитория Pac-Man — аркады, ностальгия, «игра решает за тебя» — и практичный секрет, как у укрытия (340 тыс.).
- **Стиль:** «Пиксель-фильм», один автомат с игрушками крупно, в разрезе. Сбоку открыта сервисная панель: экран настроек, счётчик игр и шкала силы когтя. Игрушки наши (зайцы, мишки, кубики), без лицензионных персонажей и логотипов производителей.
- **Концовка — призыв подписаться** (решение пользователя 2026-10-26, вместо петли): последняя фраза «Follow, so you don't miss…», карточка FOLLOW → FOLLOWING ✓ поверх финальной сцены, без смены сцены. Бренд не произносится.
- **Длина:** ≈172 слова, ≈59 с.

## Текст (одна непрерывная озвучка)

> Many claw machines choose when to let you win. And their own manuals explain how. Inside, the owner sets a win rate. One manual's example: one win every hundred games. Others just ask for the price of a play and the cost of the prize, then do the math. On most coins, the claw gets weak power. It grabs, lifts, and the grip fades on the way up, so the prize seems to slip out by itself. One manual even says: set it just too weak to hold. When its number comes up, the claw gets full power and holds on. Some machines pick that play at random. Others wait for a set count, and start again from zero after each win. On those, the play right after someone wins is one of the worst. Not every machine is set this way, and aim still matters. But if the claw closes hard and then goes limp, that's not bad luck. It's the setting. Follow, so you don't miss the next arcade secret.

**Перевод:** Многие автоматы с игрушками сами выбирают, когда дать тебе выиграть. И их собственные инструкции объясняют как. Внутри владелец задаёт частоту выигрышей. Пример из одной инструкции: один выигрыш на сто игр. Другие просто спрашивают цену игры и стоимость приза и считают сами. На большинстве монет коготь получает слабое питание. Он хватает, поднимает, и хватка слабеет по дороге вверх, так что приз будто выскальзывает сам. Одна инструкция прямо советует: поставь чуть слабее, чем нужно, чтобы удержать. Когда выпадает нужная игра, коготь получает полную силу и держит. Одни автоматы выбирают эту игру случайно. Другие ждут заданного числа игр и после каждого выигрыша начинают счёт с нуля. На таких игра сразу после чужого выигрыша — одна из худших. Не каждый автомат так настроен, и точность всё равно важна. Но если коготь сжался крепко, а потом обмяк, это не невезение. Это настройка. Подпишись, чтобы не пропустить следующий секрет игровых автоматов.

## Что на экране

| Речь | Картинка |
|---|---|
| Many claw machines choose when to let you win. | **Первый кадр:** монета падает в щель, коготь едет над горой игрушек. На боковой панели светится счётчик «07 / 12». |
| And their own manuals explain how. | Пиксельная инструкция (наш рисунок) раскрывается, страница «SETTINGS». |
| Inside, the owner sets a win rate… one win every hundred games. | Рука владельца с ключом открывает сервисную панель, на экране «WIN RATE 1 / 100». |
| Others just ask for the price… do the math. | «PLAY $1 · PRIZE $3 · PAYOUT 33%», цифры складываются в «≈ 1 WIN / 9 PLAYS». |
| On most coins, the claw gets weak power. | Шкала «CLAW POWER»: стрелка на «10 V», счётчик +1. |
| It grabs, lifts, and the grip fades… slip out by itself. | Коготь хватает зайца, на подъёме стрелка плавно падает с 48 V до 10 V, заяц выскальзывает. График напряжения рисуется линией. |
| One manual even says… | Строка инструкции подсвечивается «SET JUST NOT ABLE TO HOLD» (пересказ). |
| When its number comes up… full power… | Счётчик доходит до «12 / 12», стрелка держится на 48 V, мишка падает в лоток, звенит синтезированный колокольчик. |
| Some machines pick that play at random. | Переключатель «MODE: RANDOM», кубик крутится над счётчиком. |
| Others wait for a set count… zero… | «MODE: FIXED», счётчик плавно обнуляется «00 / 12». |
| On those, the play right after someone wins is one of the worst. | Следующий игрок кидает монету, счётчик «01 / 12», плашка «WORST TIME». |
| Not every machine… aim still matters. | Соседний автомат с табличкой «SKILL», рука точно наводит коготь. |
| But if the claw closes hard… It's the setting. | Повтор хватки крупно: сжался, обмяк. Стрелка шкалы падает. |
| Follow, so you don't miss the next arcade secret. | Поверх автомата плавно выезжает карточка подписки (код `deadliest/film/levels/cta.mjs`, только кнопка): FOLLOW → FOLLOWING ✓, колокольчик на «miss». В автомате тихо мигает счётчик «01 / 12». |

## Факты и источники

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
