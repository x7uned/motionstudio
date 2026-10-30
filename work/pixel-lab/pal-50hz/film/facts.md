# Факты и источники · «In Europe, your games ran slower»

(Скопировано из `pal-50hz/script.md` и `pal-50hz/research.md`; текст озвучки не менялся.)

## Факты и ссылки
- Частота полей связана с сетью: 50 Гц в Европе, 60 Гц в США/Японии: https://thebroadcastbridge.com/content/entry/10381/broadcast-for-it-pal-line-and-frame-relationships
- «Slowed down by approximately 16.7%», псевдо-леттербокс сверху и снизу, Dreamcast — первая с настоящим PAL 60: https://en.wikipedia.org/wiki/PAL_region
- Sonic 1 PAL: игра, музыка и игровой таймер медленнее: https://djcube.co.uk/sonic-the-hedgehog-mega-drive/
- Моды-переключатели 50/60 Гц для PAL Mega Drive: https://code.boy.sh/modifying-your-pal-megadrive-is-the-best
- Игры, оптимизированные под PAL (Tetris, Dr. Mario на NES): http://www.nesdev.org/wiki/List_of_games_with_significant_regional_differences

**Оговорки:** «17%» — округление 16,7%; миф «17,5%» не используем. Говорим «slower music», не «lower notes» (высота не подтверждена). Super Mario Bros. не используем (данные спорные). Ёжик — наш рисунок, не спрайт Sega.

## Исследование (research.md)

- Field rate tied to mains: 50 Hz Europe, 60 Hz US/Japan (avoid hum bars / beating with lights): https://thebroadcastbridge.com/content/entry/10381/broadcast-for-it-pal-line-and-frame-relationships , https://repairfaq.org/samnew/tvfaq/tvinfcotvs.htm
- 625 lines (576 visible) @50 vs 525 (480) @60 (later 59.94): https://en.wikipedia.org/wiki/576i
- ~16.7% slower (Wikipedia PAL region: "slowed down by approximately 16.7%"; DF 83.3%): https://en.wikipedia.org/wiki/PAL_region . "17.5%" is an old Wikipedia myth. NES 60.0988 vs 50.0070 Hz (nesdev cycle chart). Say "about seventeen percent" / "one sixth".
- Sonic 1 (1991, Mega Drive) not converted: game, music and in-game timer run slower: https://djcube.co.uk/sonic-the-hedgehog-mega-drive/ ; Wikipedia names Sonic. Say "slower music", not "lower notes" (pitch uncertain).
- Sonic 2 music reportedly fixed (DF secondhand) — not used.
- Super Mario Bros PAL: conflicting, do NOT use. SF2 weak, do not use. PAL-optimised: Tetris, Dr. Mario, Wario's Woods (NESdev), Super Mario Kart (press).
- Black borders top/bottom, squashed: Wikipedia PAL region. Safe: "the picture was made for a smaller screen, so black bars filled the rest".
- Dreamcast (1999) first true "PAL 60" mode (Wikipedia); ~70–75% PAL DC games support 60 Hz (segaretro). PS2 no native PAL60 — avoid absolutes.
- PS Classic (2018) / PS Plus (2022) shipped 50 Hz PAL versions again (DF via https://stevivor.com/news/digital-foundry-slams-playstation-classics-pal-games).
- 50/60 Hz switch mods for PAL Mega Drives: https://code.boy.sh/modifying-your-pal-megadrive-is-the-best
Myths: 17.5%; every PAL game slow; PAL SMB simply slow; "lower pitch".

## Что на экране и откуда
- **Шаги** (game.mjs): Φ(t) — реальные секунды с начала уровня (оба начали вместе, за 6 с до первого кадра). Слева шагов = 60·Φ, справа 50·Φ (после тумблера скорость плавно за 0,4 с становится 60). Кадр видео показывает floor(шагов): слева ровно 2 шага на кадр, справа 2-2-1 (5 на 3 кадра). Ёжик, прокрутка уровня, водопад, озеро, моргание, ноты и игровые часы (шаги/60) идут от этого счётчика.
- **«17% SLOWER»** — 50/60 = 0,833, медленнее на 16,7 % (в речи «about seventeen percent»).
- **Цель 0:59**: на «So your best time…» обе комнаты перематываются (подпись «>> FAST», реальное время ×16,7 для обеих). Слева игра показывает 0:59 при реальных 0:59, справа 0:59 при реальных 70,8 с — секундомер показывает 1:10 (секунды отбрасываются, как у секундомера).
- **Чёрные полосы**: картинка справа сжимается по вертикали на 14 % между чёрными полями; после тумблера 60 Гц снова во весь экран (иллюстрация: псевдо-леттербокс PAL, Wikipedia «PAL region»).
- **Картриджи**: 2 из 5 «PAL OK ✓», 3 — «50 HZ» (иллюстрация «some fixed, many weren't», без названий игр).
- **Тумблер 50/60** — мод для PAL Mega Drive (code.boy.sh); **«1999»** — белая приставка без логотипа, меню «60 HZ? YES» (Dreamcast — первая с настоящим PAL 60, Wikipedia).
