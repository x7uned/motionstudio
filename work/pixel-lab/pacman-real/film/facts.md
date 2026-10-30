# Facts · How much would Pac-Man eat in our world (IN OUR WORLD #3)

Copied from `../script.md` (approved by the user 2026-10-29).

## Facts and calculations

| Fact | Value | Source / calculation |
|---|---|---|
| Speed at 100% | 75.76 px/s | Pac-Man Dossier, Table A.1 (pacman.holenet.info) |
| Level 1 speeds | Pac-Man 80%, while eating ~71%, ghosts 75% | Dossier, Table A.1 |
| Levels 5–20 | Pac-Man 100%, Elroy 2 (Blinky) 105% | Dossier, Table A.1 |
| Pause on a dot | 1 frame (1/60 s), big dot 3 frames | Dossier |
| Tile | 8×8 px, screen 28×36 tiles | Dossier |
| Dots | 240 small + 4 big = 244 | Dossier |
| Blue time | level 1: 6 s; levels 17, 19+: 0 | Dossier, table of frightened times |
| Cornering | Pac-Man turns before the middle of a turn, ghosts only at the middle | Dossier, «Cornering» |
| Pac-Man's size | ≈13 px across | **Not confirmed by a source.** This is the known size of the arcade sprite (in a 16×16 slot). Before the build, the builder checks it against the sprite they draw. In the text it is «about». |
| Dot | 2×2 px | same as above, «about» |

Calculations (scale: 13 px = 1.7 m → 1 px = 0.131 m):
- dot 2 px = 26 cm (a medium-large watermelon, 20–30 cm);
- tile 8 px = 1.05 m;
- level 1 while eating: 75.76 × 0.71 = 53.8 px/s = 7.0 m/s = **25.3 km/h**;
- dots per second: 53.8 / 8 = **6.7**. The same result comes from 80% speed plus a 1-frame stop on each dot, so the ~71% already includes the stops;
- ghosts on level 1: 75% = **26.7 km/h**, more than 25.3 while Pac-Man eats (but less than his 28.5 without dots);
- Pac-Man at 100% = **35.7 km/h**; Blinky (Elroy 2) at 105% = **37.4 km/h** (levels 5+, at the end of a level);
- 240 watermelons × ≈8 kg ≈ **1.9 t** («about two tons»). A 26 cm watermelon weighs 7–9 kg. A car is ≈1.3–1.5 t.

Assumptions:
- Pac-Man's height of 1.7 m is our choice, and we say so in the text;
- the dot weighs like a watermelon;
- the 13 px is not from a primary source (see the table).

Why the final line is true: the Dossier says Pac-Man does not have to wait for the middle of a turn, while ghosts do. That is the known reason why skilled players get away from ghosts through turns.

## Checked while building
- The Pac-Man sprite drawn for this film is exactly 13 cells wide and 13 cells tall (body), in a 15-cell-wide slot; the dot is 2 × 2 cells. So the film's «about 13 pixels» and «2 pixels» match our own drawing by construction. The 13 px of the original arcade sprite is still not confirmed by a primary source (see the table); the narration says «about».
