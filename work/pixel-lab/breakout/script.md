# Breakout's paddle shrinks at the worst moment · сценарий v1 (2026-10-26)

- **Аккаунт:** Kagenami (@kagenami_ai), English, голос Dennis · Eleven v4, Plain English. Заказ пользователя («реализуй то, что считаешь наилучшим, 3 видео поочерёдно»): идея №3 из списка 5.
- **Опора:** формула хитов «знакомая старая игра + скрытое правило, которое игрок видел, но не понимал» (Pac-Man: имена 441 тыс., укрытие 340 тыс.).
- **Стиль:** «Пиксель-фильм». Один мир: аркадный автомат в тёмном зале, на весь кадр его экран с полем Breakout (наш рисунок, без логотипа Atari). Поле живёт весь ролик: стена кирпичей, ракетка, мяч.
- **Концовка — призыв подписаться:** FOLLOW → FOLLOWING ✓ поверх финальной сцены, колокольчик на «miss». Бренд не произносится.
- **Длина:** ≈170 слов, ≈55 с.

## Текст (одна непрерывная озвучка)

> In Breakout, your paddle gets cut in half, at the worst possible moment. It happens when your ball breaks through the red row and hits the top wall. And your paddle stays small until you lose that ball. That's one hidden rule. Here's another. The ball speeds up three times. Once on the fourth hit. Again on the twelfth hit. And the first time it touches an orange or red brick, it jumps straight to top speed. So the ball is fastest right when your paddle is smallest. But you can still aim. Your paddle has four parts. The part the ball hits picks where it goes next, not the way it came in. And the colors were fake. The screen was black and white. Strips of colored plastic were stuck on the glass. Clear the wall, and a second wall appears. Clear that one, and no more bricks ever come. The most you can score is eight hundred ninety-six. Follow, so you don't miss the next arcade secret.

**Перевод:** В Breakout твою ракетку режут пополам в самый неудачный момент. Это случается, когда мяч пробивает красный ряд и бьётся о верхнюю стенку. И ракетка остаётся маленькой, пока ты не потеряешь этот мяч. Это одно скрытое правило. Вот ещё. Мяч ускоряется три раза. На четвёртом ударе. На двенадцатом. А когда он впервые касается оранжевого или красного кирпича, он сразу прыгает на максимальную скорость. Так что мяч быстрее всего, когда ракетка меньше всего. Но целиться всё равно можно. У ракетки четыре части. Часть, в которую попал мяч, выбирает, куда он полетит, а не то, как он прилетел. А цвета были ненастоящие. Экран был чёрно-белый. На стекло наклеили полоски цветного пластика. Расчисти стену — появится вторая. Расчисти и её — и кирпичей больше не будет. Максимум очков — 896. Подпишись, чтобы не пропустить следующий секрет аркад.

## Что на экране

| Речь | Картинка |
|---|---|
| In Breakout, your paddle gets cut in half… | **Кадр 0:** мяч уже летит, ракетка отбивает его. Поле: 8 рядов по 14 кирпичей, снизу вверх жёлтый, зелёный, оранжевый, красный (по 2 ряда). В красном ряду уже есть дыра. |
| …breaks through the red row and hits the top wall. | Мяч проходит дыру, бьётся о верхнюю стенку, вспышка у стенки. Ракетка плавно сжимается до половины (не в один кадр), табличка «1/2». |
| …stays small until you lose that ball. | Мяч прыгает между верхней стенкой и стеной сверху (настоящая механика «прорыва»), потом пролетает мимо ракетки; новый мяч — ракетка плавно возвращается к полной ширине. |
| The ball speeds up three times. | Сбоку появляется спидометр мяча из 4 делений: SLOW → 2 → 3 → TOP. Счётчик ударов HITS. |
| Once on the fourth hit. Again on the twelfth hit. | HITS 4 → стрелка на деление 2; HITS 12 → деление 3. След мяча становится длиннее. |
| …touches an orange or red brick… top speed. | Мяч касается оранжевого кирпича — стрелка сразу в TOP. Подпись «ORANGE / RED = TOP». |
| …fastest right when your paddle is smallest. | Рядом: спидометр TOP и ракетка 1/2, связаны «=». |
| Your paddle has four parts… | Ракетка крупно, делится на 4 цветные части со стрелками направлений. Два мяча прилетают с разных углов в одну часть — уходят в одну сторону. |
| And the colors were fake… black and white. | Цветные полосы-плёнки плавно «отклеиваются» от стекла (сдвиг + дизеринг), под ними белые кирпичи на чёрном экране. |
| Strips of colored plastic were stuck on the glass. | Плёнки возвращаются на место, ярлык «PLASTIC STRIPS». |
| Clear the wall, and a second wall appears. | Быстрая перемотка: стена тает по кирпичу, счёт 448, сверху вниз проявляется вторая стена. |
| …no more bricks ever come… eight hundred ninety-six. | Вторая стена тает, поле пустое, мяч прыгает по пустому экрану. Счёт «896» крупно, «MAX». |
| Follow, so you don't miss the next arcade secret. | Поверх пустого поля плавно выезжает карточка FOLLOW → FOLLOWING ✓, колокольчик на «miss». |

## Факты и источники (полностью — `research.md`)

- Сервисное руководство Atari Breakout (1976), полный текст: https://archive.org/stream/ArcadeGameManualBreakout/breakout_djvu.txt
  - §1.2: при прорыве ракетка уменьшается до половины; §3.3.3: на следующей подаче снова полная.
  - §3.3.3: три ускорения за подачу — 4-й удар, 12-й удар, первый удар по кирпичу на 5 или 7 очков (оранжевый/красный) — сразу максимум. На новой подаче скорость сбрасывается.
  - §3.3.3: мяч отскакивает в одном из 4 направлений в зависимости от части ракетки; угол прилёта не важен.
  - §1.1, §3.2.3: 19-дюймовый чёрно-белый монитор, на трубку наклеены четыре прозрачные цветные полосы.
  - 8 рядов × 14 кирпичей, очки 1/3/5/7, 448 за стену, 896 максимум за игру; после второй стены кирпичей больше нет.
- Wikipedia: https://en.wikipedia.org/wiki/Breakout_(video_game) — точный триггер (мяч прошёл красный ряд и ударился о верх), пустое поле после второй стены.

**Оговорки:** это аркадная версия 1976 года; в версии для Atari 2600 правила похожи, но не во всём. Подач 3 или 5 — настройка владельца, в тексте не упоминаем. Миф «очки 1/4/7» и «скорость растёт на каждом ряду» не используем.
