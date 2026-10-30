# Rock-paper-scissors isn't luck · сценарий v1 (2026-10-26)

- **Аккаунт:** Kagenami (@kagenami_ai), English, голос Dennis · Eleven v4, Plain English. Заказ пользователя: идея №62 из списка 4.
- **Опора:** формула хитов «знакомая всем игра + скрытое правило» (Pac-Man) и практичный секрет, которым можно сразу воспользоваться (укрытие, 340 тыс.).
- **Стиль:** «Пиксель-фильм», один школьный двор или аудитория: две пиксельные руки крупно, над ними табло раундов. Круг «камень → бумага → ножницы» со стрелками живёт в кадре весь ролик и показывает, кто куда переходит.
- **Концовка — призыв подписаться** (решение пользователя 2026-10-26, вместо петли): последняя фраза «Follow, so you don't miss…», карточка FOLLOW → FOLLOWING ✓ поверх финальной сцены, без смены сцены. Бренд не произносится.
- **Длина:** ≈159 слов, ≈55 с.

## Текст (одна непрерывная озвучка)

> Rock-paper-scissors isn't luck: people play in patterns. And you can use them on your friends. In 2014, scientists in China had three hundred sixty students play three hundred rounds each, for real money. Overall, each move came up about a third of the time. But winners kept the same move about half the time. Losers most often switched to the move that would beat the winner. So here's the trick. If you lose, play what beats their last move, because winners like to repeat. If you win, play the move they just lost with, because they'll try to beat you. It's a small edge, not magic. Against someone truly random, nothing works. But people are bad at being random. In 2005, a Japanese company couldn't choose an auction house for its paintings, so it made them play. Christie's chose scissors, on advice from two eleven-year-old girls. Sotheby's chose paper. Scissors won. Follow, so you don't miss the next trick.

**Перевод:** Камень-ножницы-бумага — не удача: люди играют по шаблонам. И это можно использовать против друзей. В 2014 году учёные в Китае дали 360 студентам сыграть по триста раундов на настоящие деньги. В целом каждый жест выпадал примерно в трети случаев. Но победители примерно в половине случаев повторяли тот же жест. Проигравшие чаще всего переходили на жест, который побил бы победителя. Вот хитрость. Проиграл — покажи то, что бьёт последний жест соперника, потому что победители любят повторять. Выиграл — покажи тот жест, которым соперник только что проиграл, потому что он попробует побить тебя. Это небольшое преимущество, а не магия. Против того, кто играет по-настоящему случайно, не работает ничего. Но люди плохо умеют быть случайными. В 2005 году японская компания не могла выбрать аукционный дом для своих картин и заставила их сыграть. Christie's выбрал ножницы по совету двух одиннадцатилетних девочек. Sotheby's выбрал бумагу. Ножницы победили. Подпишись, чтобы не пропустить следующую хитрость.

## Что на экране

| Речь | Картинка |
|---|---|
| Rock-paper-scissors isn't luck: people play in patterns. | **Первый кадр:** две руки качаются «раз, два, три» и показывают камень и ножницы. Под ними проявляется круг R → P → S. |
| And you can use them on your friends. | Над руками табло «YOU 0 : 0 FRIEND». |
| In 2014… 360 students… for real money. | Аудитория-сетка: 60 групп по 6 пиксельных студентов, монетки над столами. «360 STUDENTS · 300 ROUNDS». |
| Overall, each move came up about a third… | Три столбика ≈ ⅓ каждый: 36 / 33 / 32 %. |
| But winners kept the same move about half the time. | Рука-победитель снова показывает тот же жест, столбик «STAY 50%» растёт рядом с пунктиром «33%». |
| Losers most often switched… | Рука-проигравший переходит по кругу на жест, который бьёт победителя, стрелка на круге подсвечивается. |
| So here's the trick. If you lose… | Раунд 1: ты проиграл камнем против бумаги, подсказка: ножницы. Раунд 2: соперник повторил бумагу, ножницы побеждают. «+1». |
| If you win… | Раунд 3: ты выиграл бумагой против камня. Соперник переходит на ножницы, ты показываешь камень и выигрываешь. «+1». |
| It's a small edge… nothing works. | Стрелки табло дрожат вокруг нуля против «RANDOM» робота-кубика. |
| But people are bad at being random. | Рука человека снова показывает тот же жест, выдавая шаблон. |
| In 2005… made them play. | Аукционный зал, на стене пейзаж с деревьями (наш рисунок), два конверта. |
| Christie's chose scissors… two eleven-year-old girls… | Две девочки подсказывают «SCISSORS». |
| Sotheby's chose paper. Scissors won. | Ножницы режут бумагу, молоток аукциониста. |
| Follow, so you don't miss the next trick. | Камера возвращается к двум рукам, табло «YOU 2 : 0 FRIEND». Поверх плавно выезжает карточка подписки (код `deadliest/film/levels/cta.mjs`, только кнопка): FOLLOW → FOLLOWING ✓, колокольчик на «miss». |

## Факты и источники

- Wang, Xu & Zhou 2014, Scientific Reports 4:5830: 360 студентов Чжэцзянского университета, группы по 6, по 300 раундов, оплата зависит от очков. Частоты R/P/S 0,36 / 0,33 / 0,32: https://www.nature.com/articles/srep05830 (PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC5376050/)
- Условные ответы (по графикам 2F–J, в среднем по пяти уровням выплат). После победы игрок повторяет жест в 50% случаев (45–57). После поражения чаще всего переходит на жест, который бьёт жест победителя: 38%. Повторяет в 33% случаев.
  - Внимание: MIT Technology Review перепутала направление, и многие статьи-советы повторяют эту ошибку.
- Правила для зрителя выведены нами из этих частот, в статье их нет. После поражения бить последний жест соперника даёт около +0,22 за раунд. После победы показать жест, которым соперник проиграл, даёт около +0,08.
- Christie's против Sotheby's, 2005: Такаси Хасияма (Maspro Denkoh), Christie's выбрал ножницы по совету 11-летних близняшек Николаса Маклина: https://www.mentalfloss.com/article/64401/time-sothebys-and-christies-played-rock-paper-scissors-cezanne (исходник: NYT, 29.04.2005).

**Оговорки:** проценты считаны с графиков, в тексте статьи их нет. Это средние по незнакомым людям, которых каждый раунд пересаживали, а на одном друге шаблон может быть другим. Dyson et al. 2016 против компьютера «проигравшие меняют жест» подтвердили, а «победители повторяют» нет. Zhang et al. 2021 нашли, что люди очень разные. Поэтому в тексте «small edge, not magic». Миф «начинают с камня» не подтверждается: в 2,6 млн матчей первым чаще показывали бумагу (Batzilis et al. 2019), поэтому его в тексте нет.
