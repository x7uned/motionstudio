# Pac-Man: имена призраков и их правила — фактчек

Дата проверки: 2026-10-24. Ролик: ~55 с, английский, Instagram.
Цитаты короткие (фрагменты до 15 слов), остальное — пересказ. Всё, что не подтверждено источником, помечено как «гипотеза» или «фольклор».

## Источники (с краткой оценкой надёжности)

| # | Источник | URL | Надёжность |
|---|---|---|---|
| D | Jamey Pittman, «The Pac-Man Dossier», обновлённая версия (гл. 1, 2 «Speed», 3 «Fixed Target Tiles», 4 «Meet the Ghosts», 5, приложение Table A.1, Glossary) | https://pacman.holenet.info/ | высокая для механики (разбор кода и игры), средняя для истории |
| D09 | То же, публикация Gamasutra / Game Developer, 23.02.2009 (старая редакция) | https://www.gamedeveloper.com/design/the-pac-man-dossier | то же; формулировки про Клайда старее |
| C | mburkley/pacman-c — построчный перевод кода ROM Pac-Man на C, ассемблер оставлен в комментариях (`clydeScatterOrChase_27f1`, `computeDistance_29ea`, `consts.h`) | https://github.com/mburkley/pacman-c | высокая для логики (код) |
| S | Scott Lawrence, документированный дизассемблер `mspac.asm` (там есть дамп строк Puck Man: OIKAKE, AKABEI, URCHIN, MACKY…) | http://umlautllama.com/projects/pacdocs/mspac/mspac.asm (зеркало: https://github.com/BleuLlama/GameDocs) | высокая для строк ROM |
| GI | Chad Birch, «Understanding Pac-Man Ghost Behavior», GameInternals, 02.12.2010 (живой домен теперь спам, использую архив) | https://web.archive.org/web/20201213134620/https://gameinternals.com/understanding-pac-man-ghost-behavior | средне-высокая (вторичный, опирается на D) |
| OP | Интервью Тору Иватани, Web Magazine OPENERS, 14.09.2020 (JP; EN-версия по тому же пути /en/) | https://openers.jp/design/design_features/4CoXi | высокая (слова создателя) |
| L | Susan Lammers, «Programmers at Work», Microsoft Press, 1986, интервью Иватани (с. 264–?); копия текста | https://www.oocities.org/siliconvalley/heights/5874/iwatani.htm ; книга: https://archive.org/details/programmersatwor00lamm_0/page/266 | высокая (слова создателя, но перевод и упрощения 1986 г.) |
| PM | Официальный сайт PAC-MAN (Bandai Namco), History | https://pacman.com/en/history/ | высокая для дат |
| WG | Wikipedia «Ghosts (Pac-Man)» | https://en.wikipedia.org/wiki/Ghosts_(Pac-Man) | средняя (есть ошибки, см. ниже) |
| WP | Wikipedia «Pac-Man» | https://en.wikipedia.org/wiki/Pac-Man | средняя |
| JW | Японская Википедия «パックマン» (цитирует OP, FUNFARE Bandai Namco 2021, Famicom Magazine 2016) | https://ja.wikipedia.org/wiki/パックマン | средняя |
| AH | arcade-history.com: Puckman / Pac-Man | https://www.arcade-history.com/game/2063/ ; https://www.arcade-history.com/game/1914/ | низко-средняя (неподписанные «trivia») |
| DIC | Словари: Jisho (JMdict), デジタル大辞泉 (через Weblio и Kotobank) | https://jisho.org/ ; https://www.weblio.jp/content/おとぼけ ; https://kotobank.jp/word/愚図-487033 | высокая для значений слов |

Японского отдельного статьи «ゴースト (パックマン)» в ja.wikipedia нет; призраки описаны в статье «パックマン». Интервью FUNFARE (Bandai Namco, 26.01.2021, https://funfare.bandainamcoent.co.jp/7116/) во время проверки было на техобслуживании; его содержание видно только через пересказ в JW.

---

## 1. Английские имена на заставке Midway (1980)

**Вердикт: подтверждено** (пары и цвета). Шапка экрана «CHARACTER / NICKNAME» подтверждена **косвенно**: на скриншот я не смотрел, но об этом говорят вторичные источники и структура кода.

- Пары и цвета: Shadow «Blinky» — красный, Speedy «Pinky» — розовый, Bashful «Inky» — голубой (cyan), Pokey «Clyde» — оранжевый.
  - D, гл. 4: Блинки — «The red ghost's character is aptly described as that of a shadow». У Пинки — «Nicknamed "Pinky"», у Инки — «nicknamed "Inky"», цвет «light-blue». У Клайда — «The orange ghost is nicknamed "Clyde"».
  - AH (Pac-Man): «Bashful - "Inky" (cyan ghost)» и так же для остальных; там же отмечено, что прозвище Pinky не менялось при переводе с японского.
  - WP: «Blinky (red), Pinky (pink), Inky (cyan), and Clyde (orange)».
  - JW: 赤色「オイカケ アカベイ」（英：SHADOW BLINKY）, 桃色「マチブセ ピンキー」（SPEEDY PINKY）, 水色「キマグレ アオスケ」（BASHFUL INKY）, 橙色「オトボケ グズタ」（POKEY CLYDE）.
- **Что здесь «character», а что «nickname».** CHARACTER — это однословная характеристика (Shadow / Speedy / Bashful / Pokey). NICKNAME — имя в кавычках (Blinky / Pinky / Inky / Clyde).
  - D последовательно пишет «his character is described as…» о слове-характеристике и «nicknamed…» об имени.
  - GI: единственное официальное описание характера каждого призрака — однословное описание «character» на заставке (attract mode).
  - C: заголовок, который код рисует перед представлением каждого призрака, называется `MSG_NICKNAME` (строка 0x0C). Затем выводятся слово-характеристика (например, `introduceShadow`) и прозвище (`introduceBlinkyNickname`).
  - AH (Puckman): в поздней японской ревизии («Japan set 2» в MAME) в заголовке вместо «Nickname» стоит «Ghost». Отсюда следует, что в обычной версии в заголовке было слово «Nickname».
- Термины расходятся: WG называет Shadow и остальные «names», а Blinky и остальные — «nicknames». JW называет オイカケ «名前», а アカベイ — «ニックネーム». На самом экране первое слово стоит в колонке CHARACTER, а не NAME.
- Цвет Клайда: сам Иватани в интервью L (1986) перечисляет цвета как «blue, yellow, pink and red». Это вопрос перевода или восприятия; в игре и во всех источниках Клайд оранжевый.

## 2. Японский оригинал (Puck Man): слова-характеры и прозвища

**Вердикт: подтверждено** (сами слова и пары). По переводам **частично**: источники расходятся, особенно по otoboke.

На экране Puck Man слова написаны **латиницей**. Это видно по дампу строк ROM в S: `OIKAKE`, `MACHIBUSE`, `KIMAGURE`, `OTOBOKE`, `AKABEI`, `PINKY`, `AOSUKE`. Строку GUZUTA я не нашёл в показанном фрагменте дампа, но в D (гл. 1 и Glossary) и AH она есть. В японских текстах слова пишут катаканой (JW: オイカケ / マチブセ / キマグレ / オトボケ; アカベイ / ピンキー / アオスケ / グズタ). Обычная словарная запись: 追いかけ, 待ち伏せ, 気まぐれ (気紛れ), お惚け (おとぼけ).

Написание прозвища красного: в JW и в оригинальной латинице AKABEI это **アカベイ**. В более поздних материалах Namco и в части японских статей встречается **アカベエ** (например, в JW «ナムコクラシックコレクション»). Оба варианта в ходу.

| Призрак | Характер (CHARACTER) | Буквальное значение | Как переводят источники | Лучший простой перевод |
|---|---|---|---|---|
| Blinky | **oikake** 追いかけ | от 追いかける «гнаться, преследовать» (Jisho: «to chase, to run after, to pursue») | D: «to run down or pursue»; GI: «pursuer» or «chaser»; WG, AH: «chaser»; WP: «chase» | **chaser** |
| Pinky | **machibuse** 待ち伏せ | «засада, поджидать в засаде» (Jisho: «ambush, lying in wait») | D: «to perform an ambush»; GI, WG, AH: «ambusher»; WP: «ambush» | **ambusher** |
| Inky | **kimagure** 気まぐれ / 気紛れ | «каприз; капризный, переменчивый» (Jisho: «capricious, fickle, whimsical… changeable, temperamental») | D: «a fickle, moody, or uneven temper»; GI: «whimsical»; WG, WP, AH: «fickle» | **fickle** (или moody) |
| Clyde | **otoboke** お惚け / おとぼけ | «нарочно делать вид, что не знаешь» (デジタル大辞泉: «わざと知らないふりをすること。しらばくれること。»; Jisho: «feigned ignorance»; глагол 惚ける — «to play dumb… to play the fool») | D: «pretending ignorance»; GI: «feigning ignorance»; WP: «playing dumb»; **WG и AH: «stupid»** (WG ссылается на книгу «High Score!», 2003) | **playing dumb** |

Расхождение по otoboke: перевод «stupid» неточный. Слово означает **притворство** («делает вид, что не замечает»), а не настоящую глупость. Разговорный оттенок «чудак, рассеянный» (おとぼけキャラ) возможен, но в словарных статьях для お惚け я его не нашёл, поэтому «airhead» не использовать.

Прозвища:

| Прозвище | Разбор | Источник | Статус |
|---|---|---|---|
| **Akabei** アカベイ/アカベエ | 赤 aka «красный» + -bei/-bē, старинный суффикс мужского имени (как в 権兵衛 Gonbē) | AH: «Red Guy». Суффикс — мой лингвистический разбор | «красный» подтверждено; суффикс — **гипотеза**. Связь с あかんべえ (дразнилка «оттянуть веко») — **не подтверждена**, не говорить |
| **Pinky** ピンキー | английское заимствование | AH: прозвище не менялось | подтверждено |
| **Aosuke** アオスケ | 青 ao «синий/голубой» + -suke (助), суффикс мужского имени | AH: «Blue Guy» | «синий» подтверждено; суффикс — общеизвестный, создатели его не комментировали. Цвет призрака по JW 水色 (светло-голубой) |
| **Guzuta** グズタ | ぐず (愚図) «копуша, медлительный, нерешительный» + -ta (太, суффикс мужского имени) | D: «one who lags behind»; AH: «Slow Guy»; デジタル大辞泉 о 愚図: «はきはきしないで動作や決断が鈍いこと。また、そのような人» | «копуша / slowpoke» — защитимо; суффикс -ta — **гипотеза** |

Альтернативный набор имён в японском ROM (включается перемычкой или DIP): URCHIN «MACKY», ROMP «MICKY», STYLIST «MUCKY», CRYBABY «MOCKY». Строки есть в дампе S. В D (Glossary) пары такие: Blinky = Akabei/Macky, Clyde = Guzuta/Mocky, Inky = Aosuke/Mucky. MAME (src/mame/pacman/pacman.cpp) называет настройку «Ghost Names: Normal / Alternate». Это **запасной** набор, а не основной. Mental Floss и ряд фан-сайтов ошибочно выдают его за «японские имена».

## 3. Отражают ли японские слова правило погони (по Dossier)

**Правила: подтверждены** (D, гл. 4, а для Клайда ещё и код C). **Соответствие слов правилам: в целом да**, но kimagure и otoboke описывают впечатление от поведения, а не алгоритм.

- **Blinky.** Цель — клетка, где сейчас стоит Пакман. D: «using Pac-Man's current tile as his target». **oikake = chaser: точно.** Дополнительно (D): ближе к концу уровня Блинки ускоряется («Cruise Elroy», см. п. 4).
- **Pinky.** Цель — на 4 клетки впереди Пакмана по направлению движения. Если Пакман смотрит вверх, из-за ошибки переполнения в коде цель смещается на 4 вверх **и** на 4 влево. D: «four tiles up and four tiles to the left» (подробный разбор бага — у Don Hodges). Иватани (OP) описывает то же: розовый целится на 32 точки (пикселя) перед ртом Пакмана, а 32 px = 4 клетки по 8 px. **machibuse = ambusher: честно**: Пинки целится туда, куда Пакман идёт.
- **Inky.** Промежуточная клетка — 2 клетки перед Пакманом (при взгляде вверх — 2 вверх и 2 влево, тот же баг). Берётся вектор от клетки Блинки до этой точки и удваивается. D: «double the vector length». Иватани (OP): голубой целится в точку, симметричную относительно Пакмана («パックマンを中心とした点対称の場所»). Это упрощённое описание того же правила. **kimagure = fickle: честно как впечатление.** Правило детерминированное, но цель зависит ещё и от положения Блинки, поэтому Инки кажется непредсказуемым. D: «Inky is the least predictable of the ghosts».
- **Clyde.** Сначала считается евклидово расстояние (по прямой) между его клеткой и клеткой Пакмана. D: «He first calculates the Euclidean distance between his tile and Pac-Man's tile.» Если расстояние **8 клеток или больше**, цель — Пакман, как у Блинки. Если **меньше 8**, цель — его угловая клетка режима scatter (за пределами лабиринта, **внизу слева**). D: «less than eight tiles», «heads for his corner».
  - Код (C, `clydeScatterOrChase_27f1`): функция `computeDistance_29ea` возвращает сумму квадратов разниц по x и y (без корня). Если сумма меньше 0x40 = 64, то есть расстояние меньше 8, Клайд идёт к фиксированной угловой цели. Ровно 8 клеток — погоня. Это совпадает с D. **Определение «8 клеток по прямой, а не по коридорам» подтверждено кодом.**
  - Старая редакция D09 (2009) писала «more than eight» / «closer than eight». Это та же граница, только сформулирована менее точно.
  - Угол внизу слева: схема «Scatter.png» в D (оранжевая цель в левом нижнем углу); GI: «just outside the bottom-left corner of the maze».
  - Масштаб (D): клетка = 8 px, точки стоят ровно через одну клетку. Значит, 8 клеток ≈ **8 точек** по прямой. Лабиринт шириной 28 клеток.
  - **otoboke = playing dumb: честно как впечатление.** Вблизи Клайд будто «не замечает» Пакмана. GI прямо пишет, что японское слово точнее: Клайд создаёт впечатление, что «doing his own thing».

## 4. Вводят ли английские имена в заблуждение

**Вердикт: подтверждено**: Speedy и Pokey вводят в заблуждение, Bashful в основном тоже. Shadow подходит.

- **Скорости.** D, гл. 4 (Blinky): «All ghosts move at the same rate of speed when a level begins». Дальше: Блинки дважды за раунд ускоряется по числу оставшихся точек (Cruise Elroy). На 1-м уровне это происходит при 20 оставшихся точках (80%) и при 10 (85%). Обычная скорость призраков на 1-м уровне 75%, у Пакмана 80% (D, раздел «Speed» и Table A.1). D, «Speed»: обычная скорость призраков чуть ниже скорости Пакмана до 21-го уровня. В туннелях призраки замедляются почти вдвое, в испуганном режиме тоже медленнее. Эти поправки одинаковы для всех четверых.
- **Speedy (Pinky).** D: «He always moves at the same speed as Inky and Clyde», поэтому «speedy is a poor translation». GI: Пинки не быстрее других и медленнее Блинки в режиме Elroy. **Не быстрее.**
- **Pokey (Clyde).** D: «In reality, Clyde moves at the same speed as Inky and Pinky». **Не медленнее.**
  - Откуда «копуша»: D говорит, что Клайд **последним выходит из домика**. На 1-м уровне у него лимит 60 точек, который начинает считаться после выхода Инки (лимит 30). GI: Клайд не выходит, пока не съедено больше трети точек. Связь имени Guzuta/Pokey с поздним выходом — **моя гипотеза**, источники её не утверждают.
- **Bashful (Inky).** D: «Bashful is not a very good translation of kimagure» — оно заставляет думать, что Инки отступит, а это не всегда так. Есть частичная правда: D пишет, что правило держит Инки **вдали** от Пакмана, когда Блинки далеко. Ирония: «застенчиво отступает» как раз Клайд — D о нём: «shying away from Pac-Man». Перенос «bashful» на Клайда — наша интерпретация, а не утверждение источника.
- **Shadow (Blinky).** D: «aptly described as that of a shadow». Подходит.
- WP подаёт английские имена как подсказки к стратегии (там «Pokey alternates between chasing and escaping»). Это пересказ D, а не слова Midway.

## 5. Клайд: «а оранжевый вообще ничего не делает?»

**Вердикт: Клайд делает три вещи.** (a) Внизу слева он опасен — **подтверждено** (GI прямо; D для частного случая). (b) Кружит вокруг Пакмана на расстоянии около 8 клеток — **подтверждено** (D). (c) Создатель хотел, чтобы призраки не ехали гуськом, — **подтверждено** (L 1986, OP 2020). Что Клайд «блокирует путь бегства» — **не подтверждено**: источник говорит обратное.

- **(b) Кружение.** D: в схеме Клайд «stuck in an endless loop», пока Пакман стоит на месте. Снаружи пунктирного круга он идёт к Пакману, внутри передумывает и идёт к своему углу. Итог (D): «Clyde circling around and around until Pac-Man moves elsewhere». Пунктирный круг на схеме «ClydeJ.png» — это радиус 8 клеток вокруг клетки Пакмана. GI: Клайд то идёт прямо на Пакмана, то передумывает и уходит в свой угол, когда подходит слишком близко.
- **(a) Опасность внизу слева.**
  - GI: если игрок не в левом нижнем углу, Клайда можно избегать, просто **не перекрывая его путь отступления** («escape route») к углу. Когда Пакман в пределах 8 клеток от левого нижнего угла, Клайд ходит по той же петле, что и в режиме scatter, то есть прямо по территории Пакмана.
  - D, гл. 4: Клайд опасен, если оказаться у него на пути, когда он бежит в свой угол или когда он ещё не дошёл до развилки, где мог бы отвернуть.
  - D, гл. 5 (уровень 256 и трюк с запиранием призраков): «take care around the lower-left corner», там Клайду «nowhere left to run» и он «much more aggressive».
  - D, «Believe It Or Not»: в демо-ролике на заставке при сложности «hard» Пакмана ловит именно **Клайд**, в левой нижней части лабиринта. На «normal» ловит Инки. Факт эффектный, но нишевый.
- **(c) Замысел создателя.**
  - L (1986): Иватани хотел, чтобы у каждого призрака был свой характер и свои движения, «so they weren't all just chasing after Pac Man in single file». В том же ответе он говорит, что остальные призраки двигаются «more at random». Это упрощение 1986 года: в коде погоня детерминированная. Псевдослучайны только повороты испуганных синих призраков (GI).
  - OP (2020): если бы все четверо гнались за текущей позицией Пакмана, они бы выстроились «数珠繋ぎ» (цепочкой, как бусины) и пропала бы острота. О Клайде: оранжевый, «パックマンに近づきすぎると、自分のポジションに向かう». Там же сказано, что разные движения ввёл программист Сигэо Фунаки (舟木茂雄).
  - JW (по OP): алгоритм сделан так, чтобы призраки распределялись **вокруг** Пакмана.
- **«Охраняет / блокирует выход».** Ни один источник не говорит, что Клайд блокирует путь бегства Пакмана. GI говорит обратное: игроку нельзя перекрывать путь отступления **Клайда**. D пишет, что Клайд «patrolling his corner» (только про scatter и угол). JW описывает режим scatter для всех монстров как охрану своей территории у энергетайзера («縄張り…を守るように»). Это общий режим, не особенность Клайда. Значит: «Клайд патрулирует свой угол» — можно; «Клайд перекрывает тебе выход» — нельзя.

## 6. Кто придумал имена; «Monsters»

**Кто назвал: неясно.** D (гл. 1) говорит пассивно: ближе к концу разработки призракам «finally given names: Akabei, Pinky, Aosuke, and Guzuta». Конкретного человека не называет ни D, ни JW, ни интервью OP и L. Английские имена: WG, ссылаясь на «High Score!» (2003), говорит, что их сменила **Midway**. Кто именно в Midway — неизвестно.

**Говорил ли Иватани, что японские слова описывают характер: прямой цитаты нет.** Он говорил, что у каждого призрака свой характер и свои движения. L: «each of the enemies has its own character». OP: «それぞれの性格や動きの特徴がある»; призраки сделаны по образцу Q-таро из «Обакэ-но Q-таро», «性格も含めて». Иватани описывал поведение по цветам, а не по словам oikake и остальным. Так что утверждение «Иватани сказал: эти слова описывают ИИ» — **не подтверждено**.

**«Monsters»: подтверждено.**
- В японских материалах призраков называют モンスター (JW: «性格付けされた4匹のモンスター», испуганные — «イジケモンスター»).
- Иватани (L): «four little ghost-shaped monsters».
- D, Glossary: «ghosts or monsters»; домик называется «monster pen».
- WG: ранние рекламные материалы иногда называли их «monsters» или «goblins».
- На самой заставке в заголовке ни «ghost», ни «monster» нет: только CHARACTER / NICKNAME. Исключение — поздняя японская ревизия, где, по AH, стоит «Ghost» (единственный, слабый источник).

## 7. Даты выхода

**Вердикт: частично.** 22 мая 1980 — это **первый тест на площадке** в Японии; в широкую продажу игра вышла в июле. США — октябрь 1980.

- PM (официальный сайт): «On May 22, the first focus test was held for PAC-MAN.» В Японии игра вышла в июле, в США — в октябре того же года.
- JW (по FUNFARE Bandai Namco 2021): 22.05.1980 — тест в игровом зале на крыше 東急文化会館 в Сибуе; выпуск в Японии — 1980年7月.
- WP: «Location testing for Puck Man began on May 22, 1980 in Shibuya, Tokyo», в июле — общенациональный выпуск. В карточке WP указано JP May 22, 1980 / US October 1980.
- D пишет, что 22 мая 1980 игра «released to arcades in Japan». Это неточно: это день теста. Bandai Namco отмечает эту дату как день рождения Pac-Man.
- США: D — Midway выпустила игру под названием Pac-Man в октябре 1980. Точная дата 10 октября 1980 есть только у AH (слабый источник), поэтому её не называть.
- Издатели: в Японии Namco (название PUCK MAN), в США Midway по лицензии (MAME: «Namco (Midway license)»).

---

## Что можно сказать в ролике (простым английским)

1. «On the 1980 arcade screen, each ghost has a character word and a nickname: Shadow "Blinky", Speedy "Pinky", Bashful "Inky", Pokey "Clyde".»
2. «In the Japanese original, the four words meant: chaser, ambusher, fickle, and playing dumb.»
3. «Blinky, the red ghost, always aims at the spot where Pac-Man is right now.»
4. «Pinky aims four tiles in front of Pac-Man, so it tries to cut you off.» (По желанию: «A bug in the code also moves that point four tiles left when you face up.»)
5. «Inky uses two points: a spot two tiles in front of Pac-Man, and Blinky. It takes the line from Blinky to that spot and makes it twice as long.»
6. «Clyde chases you only when he is eight tiles away or more, about eight dots in a straight line. When he gets closer, he turns back to his corner, at the bottom left.»
7. «So Clyde keeps circling around you at a distance.»
8. «"Speedy" is not faster, and "Pokey" is not slower. All four ghosts start each level at the same speed. Only Blinky speeds up when few dots are left.»
9. «Near the bottom-left corner, Clyde's way home runs right through you. There he is dangerous.»
10. «The creator, Toru Iwatani, gave the ghosts different moves so they would not chase you in one line.»
(Дата, если нужна: «Puck Man was first tested in Tokyo on May 22, 1980. Midway brought Pac-Man to the US in October 1980.»)

Примечание: в D Пинки — «he», в современных материалах Bandai Namco Пинки — девочка. В ролике лучше говорить «Pinky» или «it» и не использовать местоимение по полу.

## Чего говорить нельзя

- «Pinky is the fastest ghost» или «Clyde is the slowest». Скорость у всех одинаковая. Исключения: Блинки в режиме Elroy и общие для всех замедления в туннеле и в испуге.
- «Clyde moves randomly» или «Clyde does nothing». WG («the orange ghost would be random») и даже Иватани в 1986 упрощали; в коде правило детерминированное. Случайны только повороты испуганных синих призраков, и это касается всех четверых.
- «Otoboke means stupid». Точнее «playing dumb / pretending not to notice».
- «Inky is shy and runs away from you». D прямо называет это ошибкой перевода.
- «Clyde guards the exit» или «blocks your escape route». Источник говорит наоборот: игроку нельзя перекрывать путь отступления Клайда.
- «Clyde counts eight steps through the maze». Расстояние по прямой (евклидово), а не по коридорам.
- «The Japanese names were Urchin, Romp, Stylist, Crybaby». Это запасной набор в ROM, а не основной.
- «Iwatani named the ghosts» и «Iwatani said these words describe their AI». Кто дал имена, неизвестно; такой цитаты не найдено.
- «Akabei means "red devil"» или «comes from akanbe». Не подтверждено. Можно сказать только, что «aka» — это «red».
- «Pac-Man came out in Japan on May 22, 1980». Это был тест; в продажу игра вышла в июле. «US release October 10» — слабый источник.
- «The ghosts learn», «see you» или «were trained». Это фиксированные правила выбора клетки-цели.
