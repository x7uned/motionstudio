# A chatbot built inside Minecraft · сценарий v1 (2026-10-25)

- **Аккаунт:** Kagenami (@kagenami_ai), English, голос Dennis · Eleven v4, Plain English. Заказ пользователя: «сделай мне видос по 1, то есть внутри Minecraft построили чат-бота с ИИ, реализуй такой видос в таком дизайне, как мы реализовали видос про Redstone» (идея №1 из `IDEAS-3-2026-10-25.md`).
- **Почему эта тема:** продолжение хита «компьютеры из редстоуна» (323 тыс. просмотров, 1 547 сохранений за 8 часов). Тот ролик закончился на CraftGPT, здесь — как он устроен внутри.
- **Стиль:** «Пиксель-фильм», изометрия, тот же воксельный движок и тот же блочный мир, что в ролике про редстоун (своя копия). Один постоянный мир: шесть длинных залов-слоёв, экран из ламп, огромная клавиатура, панель на 240 ламп, «выбор токена», шина из пыли. Без оверлея, субтитры караоке. Безопасные зоны v1.
- **Концовка — петля:** «…So type your question, press enter, and wait, because» → «this chatbot is built inside Minecraft, and one answer takes two hours.» Камера садится в первый общий план, экран снова показывает вопрос и ждущего бота.

## Текст (одна непрерывная озвучка, 203 слова)

> This chatbot is built inside Minecraft, and one answer takes two hours. A player called sammyuri made it in 2025, out of redstone, with no command blocks. A chatbot doesn't think in sentences. It only guesses the next token: a small piece of a word. Then it guesses again, and again. Every guess is math with five million numbers. Those numbers were learned on a normal computer, then built into the world as blocks. Most of them are just eight on-off bits. You type a question. Each token turns into a list of two hundred forty numbers. The list goes through six layers that mix it. That's about five million multiplications for every single token. At the end, the machine picks the next token, prints it on the screen, and starts over. It can only hold sixty-four tokens at once. The whole build is over a kilometer long, too big for the game to show at once. Minecraft moves twenty steps a second. At that speed, one answer would take over ten years. A special server runs it forty thousand times faster, and it still takes two hours. And sometimes, the answer is nonsense. So type your question, press enter, and wait, because

**Перевод:** Этот чат-бот построен внутри Minecraft, и один ответ занимает два часа. Игрок sammyuri сделал его в 2025 году из редстоуна, без командных блоков. Чат-бот не думает предложениями. Он только угадывает следующий токен — кусочек слова. Потом угадывает снова и снова. Каждая догадка — математика с пятью миллионами чисел. Эти числа выучили на обычном компьютере, а потом встроили в мир как блоки. Большинство из них — всего восемь битов «вкл-выкл». Ты набираешь вопрос. Каждый токен превращается в список из двухсот сорока чисел. Список проходит через шесть слоёв, которые его перемешивают. Это около пяти миллионов умножений на каждый токен. В конце машина выбирает следующий токен, печатает его на экране и начинает заново. Она помнит только 64 токена за раз. Вся постройка длиннее километра — слишком большая, чтобы игра показала её целиком. Minecraft делает двадцать шагов в секунду. С такой скоростью один ответ занял бы больше десяти лет. Специальный сервер гонит её в сорок тысяч раз быстрее, и всё равно — два часа. А иногда ответ — бессмыслица. Так что набери вопрос, нажми Enter и жди, потому что…

## Что на экране

| Речь | Картинка |
|---|---|
| This chatbot… two hours. | Общий план (стык): экран из ламп «HOW ARE YOU?», бот «думает» тремя точками, полоса прогресса; за экраном шесть залов уходят вдаль. Плашки «A CHATBOT BUILT IN MINECRAFT», песочные часы «1 ANSWER · 2 HOURS». |
| A player called sammyuri… no command blocks. | Крыша зала 6: дорожки пыли с бегущими импульсами, факелы, биты. «SAMMYURI · 2025», «ONLY REDSTONE», зачёркнутый командный блок. |
| A chatbot doesn't think… piece of a word. | Экран: вопрос делится на рамки-токены HOW / ARE / YOU / ?; плашка MINE + CRAFT = 2 TOKENS. |
| Then it guesses again, and again. | В пузыре бота появляются «I», потом «AM»; список «NEXT TOKEN > I > AM > …». |
| Every guess… five million numbers. | Пролёт над крышами-ROM; «5,087,280 NUMBERS». На крыше зала 6 видно пустое место. |
| Those numbers were learned… as blocks. | Плашка с обычным компьютером; пустое место на крыше заполняется блоками-битами. |
| Most of them are just eight on-off bits. | Крупно один ряд: 0 1 1 0 1 1 0 0, рамка; «8 ON-OFF BITS = 1 NUMBER», «01101100 = 108». |
| You type a question. | Клавиатура с буквами: клавиши H-O-W… загораются, герой печатает. |
| Each token… 240 numbers. | Токен HOW бежит по проводу к панели; 240 ламп заполняются; «1 TOKEN = 240 NUMBERS». |
| The list goes through six layers… every single token. | Фасады залов 1–6: сигнал бежит по шине, номер каждого слоя загорается по очереди; «6 LAYERS», «5,000,000 MULTIPLICATIONS FOR 1 TOKEN». |
| At the end… starts over. | «Выбор»: GOOD / FINE / SPOON, выбран GOOD; на экране печатается GOOD; сигнал бежит назад, «AND AGAIN». |
| It can only hold sixty-four tokens at once. | На экране полоса из 64 ячеек, 7 заняты; «64 TOKENS MAX», «7 USED NOW». |
| The whole build… show at once. | Камера улетает далеко: постройка на «острове», дальше туман по чанкам; мерка «1,656 BLOCKS = 1.6 KM» уходит в туман, пунктир — остальная постройка. |
| Minecraft moves twenty steps a second. | Часы из 20 точек, «20 TICKS / SECOND». |
| At that speed… two hours. | «1 ANSWER: NORMAL SPEED 10+ YEARS → SPECIAL SERVER ×40,000 → STILL 2 HOURS». |
| And sometimes, the answer is nonsense. | Ответ на экране: «I AM A SPOON»; «SOMETIMES: NONSENSE ?!». |
| So type your question… because | Экран очищается, герой печатает вопрос, Enter, «WAIT»; отъезд в первый кадр. |
