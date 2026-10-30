# Pac-Man level 256 · сценарий v1 (2026-10-24)

- **Аккаунт:** Kagenami (@kagenami_ai), English, голос Dennis · Eleven v4, Plain English. Заказ пользователя: идея №69 из разбора залетевших рилсов («надо реализовать 59, 60, 63 и 69»).
- **Стиль:** «Пиксель-фильм» на лабиринте и спрайтах ролика про призраков (`../pacman/film`), вид сверху, внизу панель автомата; без оверлея, субтитры караоке.
- **Концовка — петля:** «…So the only ending Pac-Man has is a bug. Funny, because» → «Pac-Man has no last level. Yet level 256 breaks the screen in half.»
- **Факты:** `facts.md` (ресёрч 2026-10-24).

## Текст (одна непрерывная озвучка)

> Pac-Man has no last level. Yet level 256 breaks the screen in half. The game keeps its level number in one byte, a tiny box for numbers from 0 to 255. Level one is stored as 0, so level 256 is 255, the biggest number that fits. Each level, the game draws fruit at the bottom of the screen. To count them, it adds one to the level. On level 256, that gives 255 plus one, and in one byte, that is zero. So the counter starts at zero, and the loop runs 256 times instead of seven at most. It runs past the fruit pictures and draws other parts of its memory as pictures: letters, numbers and broken symbols, all over the right half of the maze. On that side, the walls stop working, and most dots are missing. You need 244 dots to finish a level. Here you can eat 168 at most. The ghosts still catch you, and the game is over. The highest possible score is 3,333,360. The first perfect game, in 1999, took about six hours. So the only ending Pac-Man has is a bug. Funny, because

**Перевод:** У Pac-Man нет последнего уровня. И всё же 256-й уровень ломает экран пополам. Игра хранит номер уровня в одном байте — крошечной коробке для чисел от 0 до 255. Первый уровень записан как 0, так что 256-й — это 255, самое большое число, которое помещается. На каждом уровне игра рисует фрукты внизу экрана. Чтобы их посчитать, она прибавляет к уровню единицу. На 256-м выходит 255 плюс один, а в одном байте это ноль. Счётчик начинает с нуля, и цикл крутится 256 раз вместо максимум семи. Он пробегает мимо картинок фруктов и рисует как картинки другие части своей памяти: буквы, цифры и сломанные символы на всю правую половину лабиринта. С той стороны стены перестают работать, а большинства точек нет. Чтобы пройти уровень, нужно 244 точки. Здесь можно съесть максимум 168. Призраки всё так же ловят — и игра окончена. Самый большой возможный счёт — 3 333 360. Первая идеальная игра, в 1999-м, заняла около шести часов. Так что единственный конец у Pac-Man — это баг. Забавно, ведь…

## Оговорки (из ресёрча)

«Сброс на ноль» — только у копии числа в процедуре фруктов (сам уровень остаётся 255); игра не зависает, а продолжает работать; справа 9 точек (4 невидимы), а не ноль; имя автора первой идеальной игры не называем (спор вокруг рекордов); цитат Иватани о 256 нет.
