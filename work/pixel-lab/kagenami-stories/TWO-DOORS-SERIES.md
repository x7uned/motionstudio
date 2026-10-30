# TWO DOORS · полная серия, 5 частей (черновик v1, 2026-10-27)

Для @kagenami_stories. Формат прежний: рассказчик Dennis от второго лица, реплики героев своими голосами, пиксельные сцены, титул после хука, экран выбора в конце частей 1–4. Правила сюжета — `kagenami-stories/STORY-WRITING-PROMPT.md`.

---

## 0. Как устроена серия

### 0.1. Вся история в пяти строках
1. **Ночь прилёта.** Над школой сестры зависает корабль. Пришельцы делают копии людей. В дом стучат две Нины сразу. **FRONT / BACK**
2. **Ночь 1 → утро.** Нина внутри ведёт себя странно, вторая стучит в окно. Армия проверяет людей сканером. **TEST / HIDE**
3. **День 2 → ночь 2.** Радио договаривает правило. Ты почти проверяешь сестру тайным стуком, и тут в дом входит свет и поднимает её. **HOLD / RELEASE**
4. **Корабль.** Тысячи спящих, среди них мама. Стена показывает, кто из Нин настоящая. Копия предлагает две двери. **WAKE / LEAVE**
5. **Финал без выбора.** Две концовки, в каждой последний холодный удар.

### 0.2. Как ветки сходятся
4 выбора дают 16 путей. Писать 16 серий не нужно. Каждая часть = **короткое начало своей ветки (8–15 с)** + **общая середина** + выбор. Рендерится только тот вариант начала, который выбрали зрители.

```
CH1 ──FRONT──┐                    (выбор 1 решает, кто внутри: копия или настоящая;
     └─BACK──┴─► CH2 общая          правда раскрывается только в CH4)
CH2 ──TEST───┐
     └─HIDE──┴─► CH3 общая (вечер дома)
CH3 ──HOLD───┐
     └─RELEASE┴► CH4 общая (корабль) + 1 строка по выбору 1
CH4 ──WAKE──► CH5-A        (в обеих — 1 реплика копии по выбору 1
     └─LEAVE─► CH5-B         и 1 строка по выбору 3)
```

Выборы не «пустые»:
- **выбор 1** решает, с кем ты прожил две ночи — с копией или с сестрой. От него зависят раскрытие в CH4 и последние слова копии в CH5;
- **выбор 2** решает, где ты провёл день и что узнал (в TEST — что сканер не отличает «отсканированных» людей от копий);
- **выбор 3** решает, сканировали ли тебя самого (HOLD), и от этого меняется одна строка в финале;
- **выбор 4** даёт две разные концовки.

### 0.3. Скрытая правда (зритель узнаёт в CH4)
- **Кто они.** Пришельцы — существа из света без своих тел. Корабли — их ковчеги. Чтобы жить на Земле, они делают копии людей и живут в них. Настоящих людей кладут спать в корабле, в колонны света: живыми, «в безопасности», навсегда. Они не злые и не жестокие, они просто забирают жизнь себе.
- **Скан.** Чтобы сделать копию, человека сканируют. После скана настоящий человек несколько часов путается и забывает слова.
- **Правило.** Копия знает только то, что услышала после своего «рождения». Учится очень быстро, подслушивая. Полное правило по радио: «A copy cannot remember anything it did not hear.»
- **Ночь прилёта.** Нину сканировали в спортзале школы. Настоящая Нина вырвалась и побежала домой без вещей. Копия подняла с пола её сумку и рацию и по рации выманила у тебя семейное слово.
- **Ответ на выбор 1:** настоящая — **BACK**. Улики честные: у передней рация и слово (выманила), у задней ожог и провал памяти (последствие скана). Ожог есть у обеих, ведь копия копирует тело, но передняя его не показывает.
- **Копии меняются.** Копия, которая живёт среди людей и слушает их, начинает их любить. Копия Нины к финалу по-своему любит тебя.

### 0.4. Герои и предметы

| Кто | Вид | Голос (ElevenLabs) |
|---|---|---|
| **Ты** | герой канала: тёмные торчащие волосы, угольно-фиолетовое худи, кроссовки с красной подошвой | без реплик (рассказчик Dennis) |
| **Нина**, сестра, 19 | тёмный хвост, красная дутая куртка, серая спортивная сумка; **ожог на левой ладони** — розовое пятно | молодая женщина, живой голос. Копия говорит тем же голосом, в CH4–5 спокойнее и мягче |
| **Мама** | медсестра, синяя больничная форма, бейдж | женщина 45–50, усталая, тёплая; в CH1 — телефонный фильтр |
| **Роза** | только голос: ведущая ночного радиошоу, осталась в эфире | женщина 30–40, тёплая; полоса 300–3400 Гц |
| **Солдат** | противогаз, жёлтый жилет | мужской; громкоговоритель |
| **Пришельцы** | высокие силуэты из мягкого света, без лиц, бесшумные | не говорят |

**Предметы-ружья (показывать крупно):**
- **рация** — две старые жёлтые рации, «мамино правило»: одна дома на полке, вторая всегда у Нины;
- **слово** «Pancake» — семейное слово на случай беды, его придумала мама;
- **ожог** на левой ладони Нины — фото на холодильнике: Нина прошлым летом с забинтованной рукой у плиты;
- **тайный стук** «тук · тук-тук · тук» — стук брата и сестры из детства, его никогда не произносили вслух;
- **корабль** — чёрный диск шире школы, с тонкими белыми швами; **свет** — белые столбы, которые идут по улице от дома к дому.

### 0.5. Счётчик серии (вверху главной зоны)
CH1 `20:14` → `21:06`, в конце `LIGHT: 2 HOUSES` · CH2 `NIGHT 1 · 03:00` → `DAY 2 · 08:00` · CH3 `DAY 2` → `NIGHT 2 · 23:40` · CH4 `NIGHT 2 · 00:20` · CH5 `DAWN 3` → `3 WEEKS LATER`.

---

## CHAPTER 1 · Ночь прилёта

**≈ 80 с.** Места: дом (кухня, прихожая, задний двор), улица, далёкая школа с кораблём.

```
NARRATOR: 8:14 p.m. Every phone in the city screams at once. Then the sky turns white.
NARRATOR: Out of the light come the ships. Black. Silent. Bigger than a stadium. One stops right over your sister's school.
        [титул: TWO DOORS · CHAPTER 1]
NARRATOR: Nina is at the school gym tonight. Mom is at the hospital. You call her.
MOM:      Lock the doors. Find Nina. I'll—
NARRATOR: The call drops. Then the radio. Rosa, from the night show.
ROSA:     They're copying people. Never let a copy inside. A copy cannot—
NARRATOR: Static.
NARRATOR: At nine, the old walkie on the shelf clicks. Mom's rule: Nina always has the other one.
NINA:     I'm coming home. Say our word.
NARRATOR: Your family has one secret word for danger. You say it. Pancake.
NARRATOR: White lights move down the street. House by house. Whoever is outside, they take.
NARRATOR: A knock on the front door.
NINA (front): It's me. Pancake. Open!
NARRATOR: It's Nina. Her gym bag. The walkie in her hand.
NARRATOR: Then a knock on the back door.
NINA (back): Don't open the front! That's not me!
NARRATOR: It's Nina too. Her jacket is torn. No bag. She holds up her hand. The old burn is there.
NARRATOR: You ask her for the word. Nothing.
NINA (back): They were in my head. I can't remember!
NARRATOR: The light is two houses away. Open both, and the copy gets in too. You can open one.
BOTH NINAS: Please. I'm your sister.
NARRATOR: Which door do you open? Write FRONT or BACK in the comments.
```

**Что показываем**

| ≈ с | Вид | Кадр |
|---|---|---|
| 0–3 | от 1-го лица | Тёмная кухня, телефон в руке взрывается красным экраном тревоги, за окном небо плавно белеет. Счётчик `20:14`. |
| 3–7 | сбоку, широко | Пригород ночью. Из белого неба опускаются чёрные диски, один зависает над далёкой школой, от него в землю бьёт столб света. Титул TWO DOORS · CHAPTER 1. |
| 7–12 | от 1-го лица | Телефон у уха, на экране `MOM`, голос мамы, звонок обрывается. На холодильнике фото Нины с забинтованной рукой у плиты (**ружьё: ожог**). |
| 12–18 | сбоку, кухня | Старое радио на столе, шум, голос Розы обрывается. Свечи. |
| 18–26 | от 1-го лица | Жёлтая рация на полке мигает, голос Нины. Ты подносишь рацию ко рту: «Pancake» (подпись крупно). |
| 26–32 | сбоку, улица | Белые столбы света идут по улице от дома к дому, у соседних домов пусто. |
| 32–40 | от 1-го лица | Глазок передней двери: Нина с сумкой и **жёлтой рацией в руке**, тёплый фонарь крыльца. |
| 40–52 | от 1-го лица | Стекло задней двери: Нина в порванной куртке, ладонь с ожогом прижата к стеклу. Ты спрашиваешь слово — она открывает рот и молчит. |
| 52–62 | сбоку, **дом в разрезе** | Ты посередине прихожей. Слева передняя дверь и Нина, справа задняя дверь и Нина. За окном белый свет в двух домах от вас. Обе говорят одновременно. |
| 62–70 | **экран выбора** | «WHICH DOOR DO YOU OPEN?» Слева передняя дверь с Ниной, сумкой и рацией — FRONT. Справа задняя дверь, Нина с ладонью на стекле, сзади подходит белый свет — BACK. |

**Бухгалтерия улик:** FRONT — знает слово, у неё сумка и рация, то есть именно с ней ты говорил; против — слово ушло в эфир, его мог выманить кто угодно («Say our word» попросила она сама). BACK — ожог, порванная куртка, предупреждает; против — не помнит слово, а копия может скопировать и ожог. Ожидаемый расклад ≈ 50/50. **Противовес:** история тянет к задней двери, и в последний момент задняя Нина не может назвать слово.

---

## CHAPTER 2 · Нина, которую ты впустил

**≈ 80 с.** Карточка `MOST OF YOU CHOSE: FRONT` / `BACK`. Места: дом ночью, окно, улица утром.

**Начало — вариант FRONT:**
```
NARRATOR: Most of you chose the front door.
NARRATOR: Nina falls inside with her bag. You lock the door. Through the back glass, the other Nina is still looking at you. Then the light comes. When it moves on, she's gone.
```
**Начало — вариант BACK:**
```
NARRATOR: Most of you chose the back door.
NARRATOR: Nina falls inside, shaking. You lock the door. Through the front glass, the other Nina is still looking at you. Then the light comes. When it moves on, she's gone.
```
**Общая часть:**
```
NARRATOR: Nina doesn't talk much. She sits by the candles and stares at her hands. She asks where we keep the matches. They're right in front of her.
NARRATOR: Mom's phone just rings and rings.
NARRATOR: At three a.m., a soft knock on the window. It's the other Nina. Her face against the glass.
OTHER NINA: She's not me. Don't fall asleep.
NARRATOR: Then she's gone again.
NARRATOR: In the morning, army trucks drive down the street.
SOLDIER:  Shelter at the school. Everyone gets tested.
NARRATOR: The army has a new scanner. It finds copies. If it says copy, they take her away. No second test.
NARRATOR: At the shelter, there's food, water and soldiers. At home, there's half a bottle of water, and someone at the window at night.
NARRATOR: The radio clicks. Rosa.
ROSA:     The scanners are brand new. Nobody knows if they work.
NARRATOR: Nina grabs your hand.
NINA:     Not the school. That's where they took me.
NARRATOR: Do you take her to the test? Write TEST or HIDE in the comments.
```

**Что показываем**

| ≈ с | Вид | Кадр |
|---|---|---|
| 0–2 | карточка | `MOST OF YOU CHOSE: FRONT` (или BACK) поверх последнего кадра CH1. |
| 2–12 | сбоку, разрез | Нина вваливается в дверь, щелчок замка. В окне напротив вторая Нина, белый свет заливает двор и уходит — двор пуст. |
| 12–22 | сбоку, кухня | Ночь, свечи. Нина за столом, смотрит на ладони. Спички лежат прямо перед ней — камера чуть наезжает на них. |
| 22–26 | от 1-го лица | Телефон: `MOM · CALLING…`, гудки. |
| 26–34 | от 1-го лица | Окно в темноте: лицо второй Нины у стекла, дыхание оставляет пятно пара, она шепчет. Плавно уходит в темноту. |
| 34–44 | сбоку, улица утром | Серое утро, корабль вдали над школой. Армейские грузовики с громкоговорителями, солдаты в противогазах. Счётчик `DAY 2 · 08:00`. |
| 44–52 | от 1-го лица | Листовка в руке: рисунок сканера и две лампы — GREEN / RED. |
| 52–60 | сбоку, кухня | Полбутылки воды на столе. Радио, голос Розы. |
| 60–68 | от 1-го лица | Рука Нины хватает твою руку (ожог не видно — она держит ладонью вниз). Её лицо, глаза полны страха. |
| 68–76 | **экран выбора** | «DO YOU TAKE HER TO THE TEST?» Слева: школа под кораблём, очередь, сканер с зелёной и красной лампой — TEST. Справа: задёрнутые шторы, вы двое на полу у дивана, за окном силуэт — HIDE. |

**Бухгалтерия улик:** TEST — еда, вода, солдаты, наконец узнаешь правду; против — машина новая и, может, ошибается, а «копию» уводят навсегда; Нина боится школы. HIDE — она с тобой при любом раскладе; против — воды на полдня, ночью кто-то у окна, правду не узнаешь. ≈ 50/50. **Противовес:** история тянет к тесту (предупреждение «не засыпай», армия), а в конце Роза говорит, что сканеры не проверены, и Нина умоляет не вести её туда.

---

## CHAPTER 3 · Свет приходит за ней

**≈ 82 с.** Места: спортзал школы (TEST) или дом днём (HIDE), потом дом ночью.

**Начало — вариант TEST:**
```
NARRATOR: Most of you chose the test.
NARRATOR: The school gym, right under the ship. A man steps into the scanner. Red. Soldiers walk him to a white bus. Then Nina steps in.
NARRATOR: Yellow.
SOLDIER:  Yellow means scanned. Could be either. Room B.
NARRATOR: Then the ship hums, and every light in the gym dies. In the dark, you grab Nina and run home.
```
**Начало — вариант HIDE:**
```
NARRATOR: Most of you chose to hide.
NARRATOR: All day, you stay away from the windows. At noon, the other Nina is at the glass again. She talks about your seventh birthday. Every detail.
NINA:     She listened at our walls all night.
```
**Общая часть:**
```
NARRATOR: Night two. The radio clicks. Rosa, out of breath.
ROSA:     A copy cannot remember anything it did not hear. They learn by listening.
NARRATOR: Now you know how to check. When you were kids, you and Nina had a secret knock. You never said it out loud. And nobody has knocked it in ten years.
NARRATOR: You ask her to knock it. She lifts her hand.
NARRATOR: And the ceiling turns white.
NARRATOR: The light comes through the roof. Nina rises off the floor. She grabs your hand.
NINA:     Don't let go!
NARRATOR: The other Nina is at the window, shouting.
OTHER NINA: Let her go! It only takes copies!
NARRATOR: You hold on. And then your own feet leave the floor.
NARRATOR: Do you hold on? Write HOLD or RELEASE in the comments.
```

**Что показываем**

| ≈ с | Вид | Кадр |
|---|---|---|
| 0–2 | карточка | `MOST OF YOU CHOSE: TEST` / `HIDE`. |
| 2–18 (TEST) | сбоку | Спортзал под кораблём: очередь, сканер-арка с лампой. Мужчина — красный свет, солдаты спокойно ведут его к белому автобусу. Нина в арке — лампа медленно разгорается **жёлтым**. Гул, свет в зале гаснет волной, вы бежите в темноте. |
| 2–18 (HIDE) | сбоку / от 1-го лица | Задёрнутые шторы, полоса дневного света. Вторая Нина за стеклом рассказывает, в кадре тёплое пиксельное воспоминание — торт с семью свечами. Нина внутри сидит, не поднимая головы. |
| 18–28 | от 1-го лица | Ночь. Радио на столе, голос Розы, крупно шкала частоты. |
| 28–38 | сбоку, воспоминание | Тёплая тонировка: двое детей стучат по стенке шкафа — тук · тук-тук · тук (**ружьё: стук**). Растворение обратно в ночь. |
| 38–44 | от 1-го лица | Нина напротив тебя поднимает руку к столу, чтобы постучать… |
| 44–56 | сбоку, **дом в разрезе** | Потолок плавно белеет, сквозь крышу входит столб света. Нина медленно поднимается над полом, волосы плывут вверх. Она хватает тебя за руку. |
| 56–64 | от 1-го лица | Твоя рука держит её руку, снизу пол уходит вниз. В окне вторая Нина кричит. |
| 64–70 | сбоку | Вы оба висите в столбе света над кухней, стулья тоже чуть приподнимаются. |
| 70–78 | **экран выбора** | «DO YOU HOLD ON?» Слева: две руки крепко сцеплены в белом свете — HOLD. Справа: пальцы разжимаются, Нина уходит вверх, ты на полу — RELEASE. |

**Бухгалтерия улик:** HOLD — не теряешь её, а если она настоящая, то бросить нельзя; против — свет забирает и тебя, и неизвестно куда. RELEASE — вторая Нина говорит, что свет берёт только копии; ты остаёшься на земле; против — это говорит та, кому ты не поверил, а настоящую ты, может быть, отдаёшь. ≈ 50/50. **Противовес:** история тянет держать (сестра просит, она поднимается), и в конце от пола отрываются уже твои ноги.

---

## CHAPTER 4 · Внутри корабля

**≈ 85 с.** Места: корабль — бесконечный белый зал с колоннами, стена-«экран», две двери.

**Начало — вариант HOLD:**
```
NARRATOR: Most of you held on.
NARRATOR: You rise together into the white. You wake up on a cold, bright floor. Your head hurts. You can't remember your own phone number. Nina's hand is gone.
```
**Начало — вариант RELEASE:**
```
NARRATOR: Most of you let go.
NARRATOR: Nina rises through the roof. The window is empty too. Ten minutes later, you're under the ship, at the school. A column of light touches the ground. You step in.
```
**Общая часть:**
```
NARRATOR: Inside, a white hall with no end. Thousands of people sleep standing in columns of light. Breathing.
NARRATOR: Tall shapes of light move between them. No faces. No sound.
NARRATOR: Then you see Mom. Still in her blue hospital clothes.
NARRATOR: On the wall, light shows the night they came. Nina walks into the light, and two Ninas walk out. One runs. The other picks up the walkie.
COPY (on the wall): I'm coming home. Say our word.
NARRATOR: The one with the walkie was never your sister.
NARRATOR: Behind you stands the copy. Awake. Next to her, in a column, the real Nina sleeps. Her burned hand against the light.
        [FRONT: The copy is the Nina you let in.]
        [BACK:  The copy is the Nina you left outside.]
COPY:     We have no bodies. So we wear yours. Your people sleep here. Safe. Forever.
NARRATOR: Two doors. The small one leads out. You can carry Mom and Nina. Everyone else sleeps forever.
NARRATOR: The big one leads to the heart of the ship. Break the light, and everyone wakes up. But the ship falls, and every copy goes dark.
COPY:     Me too. And not everyone gets out.
NARRATOR: Which door do you open? Write WAKE or LEAVE in the comments.
```

**Что показываем**

| ≈ с | Вид | Кадр |
|---|---|---|
| 0–2 | карточка | `MOST OF YOU CHOSE: HOLD` / `RELEASE`. |
| 2–12 (HOLD) | сбоку → от 1-го лица | Вы поднимаетесь сквозь крышу в белое; растворение; белый потолок над тобой, всё плывёт, рука пустая. |
| 2–12 (RELEASE) | сбоку | Нина уходит вверх; ты бежишь по пустой улице к школе; под кораблём столб света касается земли, ты входишь в него. |
| 12–22 | сбоку, широко | Белый зал уходит в бесконечность, ряды колонн света, в каждой спящий человек. Высокие светлые силуэты медленно плывут между рядами. |
| 22–28 | от 1-го лица | Колонна с мамой: синяя форма, бейдж, закрытые глаза, свет мерцает в такт дыханию. |
| 28–42 | от 1-го лица | Стена-экран: зернистая «запись» из света — спортзал, Нина входит в столб, выходят две Нины. Одна бежит, держась за голову. Вторая поднимает с пола сумку и **жёлтую рацию** и говорит в неё. |
| 42–52 | сбоку | Ты оборачиваешься: копия Нины стоит рядом, спокойная. В соседней колонне спит настоящая Нина, левая ладонь с ожогом прижата к свету. |
| 52–62 | сбоку | Копия идёт вдоль колонн, объясняет. Вокруг неё лёгкое свечение — видно, что под кожей свет. |
| 62–72 | сбоку, широко | Две двери: маленькая с полосой рассвета за щелью и огромная, за которой гудит белое ядро. |
| 72–80 | **экран выбора** | «WHICH DOOR DO YOU OPEN?» Слева: огромная дверь, за ней белый шар-ядро, тысячи колонн — WAKE. Справа: маленькая дверь в рассвет, ты несёшь маму, копия держит спящую Нину — LEAVE. |

**Бухгалтерия улик:** WAKE — проснутся тысячи людей, корабли больше никого не заберут; против — корабль падает, «не все выберутся», может, и мама; гаснет копия, которая тебе помогла. LEAVE — мама и Нина спасены точно; против — тысячи спят навсегда, пришельцы остаются жить среди людей. ≈ 50/50 («Своих спасаю наверняка» против «Там тысячи людей»). **Противовес:** история тянет к героическому WAKE, а копия в конце говорит: «And not everyone gets out».

---

## CHAPTER 5 · Финал (без выбора)

**≈ 80 с.** Кикер обложки `FINAL CHAPTER`, плашка `THE END?`.

### 5-A. WAKE
```
NARRATOR: Most of you chose to wake them.
NARRATOR: The heart of the ship is a ball of white light, humming. You push your hands into it. It's cold. It cracks.
NARRATOR: And thousands of eyes open at once.
NARRATOR: The floor tilts. People run, fall, shout names. You pull Mom out of her column. Nina wakes up, holding her head.
NARRATOR: The ship is falling. The copy holds the small door open with both hands. Her light is going out.
        [FRONT] COPY: Pancake.
        [BACK]  COPY: You chose right. Go.
NARRATOR: You jump. The ground hits hard. Behind you, the ship slides into the field like a broken moon.
NARRATOR: At dawn, people walk out of it. Thousands. Blinking at the sun.
        [HOLD] NARRATOR: Your headaches never stop. Sometimes you forget your own phone number.
NARRATOR: Three weeks later, a knock at your door. Knock. Knock-knock. Knock. The secret knock. Nina is home.
NARRATOR: That night, the old walkie on the shelf clicks.
NINA (walkie): I'm coming home. Say our word.
NARRATOR: Nina is asleep in the next room.
```

### 5-B. LEAVE
```
NARRATOR: Most of you chose to leave.
NARRATOR: You lift Mom out of her column. She's so light. The copy carries Nina for you.
NARRATOR: The small door opens onto the field. Cold air. Dawn. Behind you, thousands keep sleeping.
NARRATOR: The copy stops at the door.
        [FRONT] COPY: I liked being your sister.
        [BACK]  COPY: You never let me in. That's okay.
NARRATOR: The door closes. The ship rises and hangs over the town. It doesn't leave.
NARRATOR: Three weeks later, life is almost normal. Almost. The neighbors smile too much. Rosa on the radio sounds too calm.
        [HOLD] NARRATOR: Your headaches never stop. Sometimes you forget your own phone number.
NARRATOR: Then a knock at your door. Knock. Knock-knock. Knock. The secret knock. Nina is home.
NARRATOR: That night, Mom hugs you goodnight. Then she whispers.
MOM:      What's our word again?
NARRATOR: Mom made up that word.
```

**Почему финалы двусмысленные, а не «на отвали».** Оба удара держатся на правиле серии: после скана настоящий человек забывает слова, а копия знает только услышанное. Мама, которая забыла слово, может быть настоящей после скана — а может быть копией. Голос в рации — уцелевшая копия или новая. Строка HOLD намекает, что сканировали и тебя, и где-то есть твоя копия. Всё это повод для комментариев и, если серия зайдёт, для второго сезона.

**Что показываем**

| ≈ с | Вид | Кадр (5-A / 5-B) |
|---|---|---|
| 0–2 | карточка | `MOST OF YOU CHOSE: WAKE` / `LEAVE`. |
| 2–20 | сбоку / от 1-го лица | **A:** твои руки входят в белый шар, по нему бегут трещины, по залу волной открываются глаза. **B:** ты выносишь маму из колонны, копия несёт Нину, ряды спящих позади. |
| 20–36 | сбоку | **A:** зал кренится, люди бегут, копия держит маленькую дверь, её свет гаснет пятнами. **B:** маленькая дверь, рассвет в поле, копия останавливается на пороге. |
| 36–48 | сбоку, широко | **A:** корабль медленно, со скрежетом, ложится в поле у школы; на рассвете из него выходят люди. **B:** корабль поднимается и зависает над городом — неподвижный, как вторая луна. |
| 48–58 | сбоку | Три недели спустя (счётчик `3 WEEKS LATER`). **B:** соседи улыбаются слишком широко, радио на подоконнике. |
| 58–66 | от 1-го лица | Входная дверь, звук стука «тук · тук-тук · тук», открываешь — Нина улыбается. |
| 66–78 | от 1-го лица | **A:** тёмная комната, жёлтая рация на полке мигает, голос Нины, затем панорама на приоткрытую дверь — Нина спит в соседней комнате. **B:** мама обнимает тебя в дверях спальни, её лицо близко, шёпот. |
| 78–82 | финальная карточка | Тишина, последний кадр плавно уходит в темноту, `THE END?`. |

---

## Что дальше
- Если всё в целом нравится, сделаю `series.json` (библия серии для агента друга) и по нему Chapter 1 в работу.
- Длина: все части 78–85 с.
- Голоса: Нина и копия — один голос (так и задумано). Отдельно нужны мама, Роза и солдат.
