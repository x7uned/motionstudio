# BRIEF: pacman-real — «How much would Pac-Man eat in our world» (IN OUR WORLD #3)

**User order (2026-10-29, chat).** The user approved `script.md` in this folder: «Да, собирай».
- One builder makes this ONE film.
- The lead checks it and sends it to the user.
- Nothing is approved until the user says so.

## Read first
- `work/pixel-lab/pacman-real/script.md` is the source of truth:
  - the narration (the `> ` English paragraph, word for word);
  - the shot table;
  - sound, cover, description, facts.
- `work/pixel-lab/IN-OUR-WORLD.md` sets the rubric format:
  - game world, then portal, then a HARD CUT to our city;
  - the hero is about 20–30% of the frame height;
  - **the hero is a low-res game sprite**.
- `work/pixel-lab/BATCH-2026-10-26.md`: the sections «Save the user's limits», «Format» and «Render, QA, deliverables» apply unchanged:
  - build alone, no subagents;
  - one paid TTS take (≤2 re-takes only for a broken take);
  - FOLLOW → FOLLOWING ✓ card;
  - no overlay;
  - safe zones v1;
  - synthesized 8-bit sound only;
  - render-lock for heavy jobs;
  - QA from the final MP4.
- `docs/pixel-film.md`, `work/pixel-lab/shared/BRIEF-COMMON.md`, `video-design/MOTION-RULES.md`.
- **Previous episode, the quality floor and the reference for the sprite approach:** `work/pixel-lab/mario-real/film2/`. Read `README.md`, look at `qa/contact-sheet.jpg` and `dev/assets-new.png`. The user accepted its look after rejecting v1, where Mario was drawn from circles and was too big.

## No catalog art (user rule 2026-10-28)
- Draw everything for this film.
- Import or copy NOTHING from the Kagenami catalog (`~/Desktop/kagenami/...`).
- Never edit other films' folders, `shared/`, `renderer/` or the catalog.
- Do not reuse art from earlier Pac-Man films (`pacman*`). This film draws its own.

## Harness
Make a frozen copy of the film-own code from `mario-real/film2/` into `pacman-real/film/`:
- render.mjs, timeline.mjs (MERGE of captions and digits), mix.mjs, synth-core.mjs, synth.mjs, sheet.mjs, cover.mjs, cta.mjs, cute.mjs, tts.py, `dev/*`;
- `lib/*`, including cam.mjs (integer-scale dissolves) and hud.mjs (comma with a tail);
- the sprite-grid drawing approach of `assets/mario.mjs`.

Do NOT copy:
- Mario, the Mario game level, the evening street, the house or the props. This film has a new location and new art.
- `voice/`, `audio/` or the narration. This film gets its own voice and sounds.

`assets/passerby.mjs` may be the base for passers-by. Give them summer clothes and noon light.

## The film
- 540×960 grid ×2 → 1080×1920, 30 fps. The duration follows the voice: 214 words, expect about 68–71 s.

### Sprites (the user's rule, 2026-10-29)
Pac-Man and the ghosts are game sprites drawn by us in the arcade spirit, not copied pixel for pixel:
- Pac-Man's body is a 13 × 13 sprite-pixel circle grid inside a 16 × 16 slot. The ghosts are about 14 × 14.
- Flat colours, hard square cells, no outline, no gradients, no anti-aliasing.
- Draw them from hand-made string grids, never from arcs or ellipses.
- **Pac-Man frames:** mouth open wide, half, closed, in four directions; one «gulp» frame.
- **Ghost frames:** body with two skirt frames; eyes that look left, right, up or down along the movement; frightened blue with two skirt frames and white flashing; eyes-only.
- **Ghost colours:** Blinky red, Pinky pink, Inky cyan, Clyde orange.
- **Integer scale.** Use one integer scale N per shot, nearest-neighbour.
  - Default: Pac-Man is 13·N grid px. At N = 18 he is 234 grid px, about 24% of the frame, which is 1.7 m next to adults of 1.6–1.85 m.
  - The wide crossroads shot uses a smaller N.
  - Game-window insets use a small N.
  - A change of N is a dither dissolve (as in Mario v2), never a fractional zoom.
- **Mouth.** The mouth cycle steps at game cadence (a frame every 2–4 video frames) through a 1-frame dither. Position moves smoothly.
- **Pose and colour changes** go through a 2–3 frame Bayer dissolve: normal → blue, blue → flashing, gulp.
- Sprites are the most saturated objects in the frame. Each casts a flat 1–2 row shadow.

### Game world (frame 0 → «Let's bring him here»)
- A dark maze in the arcade spirit, drawn by us in the same blocky sprite scale:
  - blue double-line walls;
  - 2 × 2 dots;
  - 8 × 8 big dots, flashing;
  - the ghost house with a pink door.
- Not a copy of the original maze layout.
- Pac-Man is already eating along a corridor at frame 0, with two or three ghosts behind him.
- On «≈7 🍉 / s», watermelon icons flicker over the dots for a moment.

### Portal and hard cut
- On «bring», a swirling portal opens at the corridor's end. Pac-Man dives in.
- **HARD CUT:** the next frame is our city with the same portal. He flies out and lands next to a passer-by.
- QA lists this cut frame as the intended cut. Inside each scene, everything enters and leaves smoothly.

### Our city (rest of the film)
- **Setting:** a sunny summer street market at noon, 3/4 high angle, the full frame top to bottom.
- **Stalls:** awnings with no brands, crates of fruit, a vendor, a market scale.
- **Watermelons:** a long line of them on the pavement, one per game tile, about 1 m apart.
- **Street:** a parked small car (for «heavier than a car»), a crossroads with a sharp kerb corner for the finale, a road with markings in the lower part.
- **Lighting:** lit and readable, no dark blobs.
- **Art level:** detailed 32-bit pixel art like the Mario v2 city. The contrast with the chunky sprites is the joke.
- **Ghosts:** they arrive through the portal on «ghosts are faster», one by one, smoothly.

### Numbers on screen
Exactly as in the shot table, each on its word:
- `≈7 🍉/s`
- `1.7 m`
- `13 px` · `2 px` (a pixel ruler in a game window)
- `26 cm`
- `1 m`
- `25 km/h`
- `6.7 / s` (counter + timer)
- `240` · `≈2 t` · `car ≈1.5 t` (two scales)
- `GHOSTS 27 km/h` vs `PAC-MAN (eating) 25`
- `BLINKY 37` · `PAC-MAN 36`
- `6 s`
- `LEVEL 19 · 0 s`
- `+ distance`
- `SUPERPOWER: CORNERS`
- `NEXT: SONIC`

Rules for them:
- Counters roll smoothly.
- Use the comma with a tail if a thousands separator appears.
- Keep the chips readable: not smaller than the Mario v2 chips, and grow the smallest ones ×1.5.

### Corner finale
- A slow-mo top-down or 3/4 view of the crossroads.
- Blinky runs to the middle of the turn (dotted line to the centre point), then turns.
- Pac-Man starts the turn early and cuts the diagonal (yellow line).
- A gap bracket grows, then Pac-Man shoots out and the ghosts fall behind.

### Ending
- On «Next», the portal blinks and a blue spiky silhouette shows inside it. It is our own simple drawing: no Sega art, no face detail.
- `NEXT: SONIC` chip.
- Then the FOLLOW → FOLLOWING ✓ card (the button part, as in Mario's `cta.mjs`), with the bell on «miss». Hold about 0.8 s, with a music cadence.

### Not allowed
- Namco or Sega logos, fonts, original sprites, the original maze, the original sounds or music.
- Latin words on screen other than those the shot table names, in our pixel fonts.

## Voice
- Dennis · Eleven v4 `[thoughtful]`, `language_code=en`, using the cached `tts.py` pattern.
- The key is read from `.env.local` inside the process only. Never print, copy or log it.
- ONE paid take. Up to 2 re-takes only for a broken take: a wrong or missing word, failed alignment, or a mispronounced «Pac-Man», «Blinky» or «Sonic».
- `narration.txt` writes the numbers as words, as listed in script.md («one point seven meters», «thirteen pixels», «twenty-six centimeters», «twenty-five kilometers an hour», «two hundred forty», «thirty-seven», «thirty-six», «level nineteen»).
- Keep the script's wording. The captions show the script's text with digits (timeline MERGE).
- Check pronunciations and timings with Scribe.

## Sound
Synthesized 8-bit only, our own. No original waka-waka, intro tune, siren or death sound, and nothing that copies them.

Sounds, each lasting exactly its motion:
- an eat «chomp» of our design, one per watermelon, never faster than the picture;
- our own ghost siren;
- portal swirl, then a whoosh-thump on the hard cut;
- landing;
- counter ticks;
- scale clunk;
- frightened hum;
- corner whoosh;
- a light 8-bit market murmur.

Music and loudness:
- A cheerful chiptune bed of our own about −12 dB under speech, with a cadence at the end.
- Voice about −16 LUFS integrated.

## Deliverables (in `pacman-real/film/`)
- `pacman-real-pixel.mp4`: the master.
- A send copy ≤30 MiB (`-max.mp4`, or the master if it is already ≤30 MiB).
- `cover.png`:
  - kicker «IN OUR WORLD #3»;
  - title «HOW MUCH WOULD / PAC-MAN EAT?»;
  - the Pac-Man sprite biting a watermelon at the market, with `≈7 🍉/s`;
  - margins as in Mario v2's `cover.mjs`.
- `description.txt` exactly as in script.md.
- `credits.txt`.
- `facts.md`: copy the facts table and the calculations from script.md.
- `README.md`:
  - what was built;
  - QA numbers;
  - what was not checked;
  - a no-catalog statement;
  - a list of new assets;
  - the measured Pac-Man sprite width you drew (13 cells) and how it relates to the «about 13 pixels» line.
- `dev/assets-new.png`: a sheet of all sprites and their frames at their scale, plus the new city props.

## QA (from the final MP4)
- Frames and duration.
- Pops scan: the portal cut is the only allowed cut; name its frame. Say how the scan treated mouth-cycle and dither steps.
- Loudness.
- A 30-frame `qa/contact-sheet.jpg`.
- Safe-zone overlay on about 12 key frames.
- Real playback in the built-in browser if you can; otherwise say so.
- Measure Pac-Man's height on the contact-sheet frames and report min, median and max as % of 1920. Targets: median 20–30%, min ≥8% on the wide shot.
- Zoom in on one frame per scale and check that the sprite cells are clean integer squares.
- Check that every on-screen number matches the script and appears on its word.

Work in three passes: one draft sheet, one fix pass, one final sheet.

## Report back (≤250 words)
- paths and duration;
- word count;
- TTS takes used;
- sprite grids and scales;
- Pac-Man size min, median and max;
- QA numbers;
- known issues.
