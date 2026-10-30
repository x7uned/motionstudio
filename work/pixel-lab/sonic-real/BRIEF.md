# BRIEF: sonic-real — «How fast is Sonic, really?» (IN OUR WORLD #4)

User order (2026-10-30, chat): the user approved `script.md` v2 in this folder, with the ending changed to the Creeper. The user's words were «собирай».

- One builder makes this ONE film.
- The lead checks it and sends it to the user.
- Nothing is approved until the user says so.

## Read first
- `work/pixel-lab/sonic-real/script.md` is the source of truth:
  - narration: the English paragraph that starts with `> `, word for word (233 words);
  - shot table (including 6a/6b);
  - sound, cover, description, facts.
- `work/pixel-lab/IN-OUR-WORLD.md` sets the rubric format:
  - game world → portal → HARD CUT → our city;
  - the hero is about 20–30% of the frame height;
  - **the hero is a low-res game sprite**.
- `work/pixel-lab/BATCH-2026-10-26.md`: its «Save the user's limits», «Format» and «Render, QA, deliverables» sections apply unchanged:
  - build alone, no subagents;
  - one paid TTS take; up to 2 re-takes only for a broken take;
  - FOLLOW → FOLLOWING ✓ card;
  - no overlay;
  - safe zones v1;
  - synthesized 8-bit/16-bit-style sound only;
  - render-lock for heavy jobs;
  - QA from the final MP4.
- `docs/pixel-film.md`, `work/pixel-lab/shared/BRIEF-COMMON.md`, `video-design/MOTION-RULES.md`.
- Previous episodes. They set the quality floor and the sprite approach:
  - `work/pixel-lab/pacman-real/film/`: README, `qa/contact-sheet.jpg`, `dev/assets-new.png`;
  - `work/pixel-lab/mario-real/film2/`.

## No catalog art (user rule 2026-10-28)
- Draw everything for this film.
- Import or copy NOTHING from the Kagenami catalog (`~/Desktop/kagenami/...`).
- Never edit other films' folders, `shared/`, `renderer/` or the catalog.
- Do not reuse the market, maze, house, street or sprites of the Mario or Pac-Man films. New location, new art.

## Harness
Make a frozen copy of the film-own code from `pacman-real/film/` into `sonic-real/film/`:
- render.mjs, timeline.mjs (MERGE of captions and digits), mix.mjs, synth-core.mjs, synth.mjs, sheet.mjs, cover.mjs, cta.mjs, cute.mjs, tts.py, `dev/*`;
- `lib/*`, including cam.mjs (integer-scale dissolves) and hud.mjs (comma with a tail);
- the sprite-grid drawing approach of `assets/sprites.mjs`.

Do not copy `voice/`, `audio/`, the narration or any Pac-Man art.

You may start the passers-by from Pac-Man's `assets/passerby.mjs`. Give them new clothes and afternoon light.

## The film
- 540×960 grid ×2 → 1080×1920, 30 fps.
- The duration follows the voice: 233 words, expect about 74–77 s.

### Sonic sprite (user rule 2026-10-29: game heroes are game sprites)
- **Our own drawing** in the spirit of the 1991 game, not Sega's sprite pixel for pixel. Draw it from hand-made string grids, never from arcs or ellipses.
- **Grid:** 39 cells tall when standing. The narration says «39 pixels tall».
- **Palette:** flat 16-bit, about 6–9 colours: blue body and quills, peach muzzle and arms, white gloves, red shoes with a white stripe, dark outline cells as the game sprite has them. No gradients, no anti-aliasing.
- **Poses:**
  - stand;
  - impatient foot-tap;
  - run at three speeds (legs; blurred legs; «figure-eight» legs);
  - skid;
  - look up;
  - surprised (at the TV);
  - annoyed (arms crossed);
  - point;
  - spin ball (3–4 frames with spikes);
  - uncurl.
- **Pose changes:** 2–3 frame Bayer dissolve. Run and spin cycles step at game cadence through a 1-frame dither.
- **Scale:** one integer scale N per shot, nearest-neighbour.
  - Default N = 6: Sonic is 234 grid px, about 24% of the frame. That is 1 m next to adults of 1.6–1.85 m, who stand much taller and may be cropped at the head.
  - The wide hill+loop shot uses a smaller N.
  - Game-window insets use a small N.
  - Change N through a dither dissolve, never with a fractional zoom.
- Sonic is the most saturated object in the frame and casts a flat 1–2 row shadow.

### Game world (frame 0 → «Let's bring him here»)
- Our own bright 16-bit zone in the spirit of the first game: checkered brown earth, green grass top, palm trees, rounded hills, a loop in the background.
- Not a copy of Green Hill and no Sega tiles.
- Sonic is already running fast at frame 0, and the camera scrolls with him.
- On «bring», a portal opens at the bottom of a slope. Sonic rolls into it as a ball.

### Portal and hard cut
- **HARD CUT:** the next frame is our city with the same portal. The ball rolls out, uncurls, and Sonic stands next to a passer-by, reaching their waist.
- QA must name this cut frame as the intended cut.
- Inside each scene, everything enters and leaves smoothly.

### Our city
- Hilly city in the afternoon, 3/4 high angle, full frame top to bottom.
- A steep street down a hill, like a seaside city with terraced houses. At the bottom, a flat square with a skatepark and a giant loop about 6 m tall next to a two-story house for scale.
- A road with traffic, where a small car runs at 88 km/h next to the rolling ball. Draw speed with motion lines and parallax, not real-time speed.
- A shop window with two TVs for shots 6a/6b.
- Lit, readable, detailed 32-bit pixel art; the contrast with the sprite is the point.
- Passers-by at real scale. The runner in a yellow-green vest is a generic runner with no likeness of Usain Bolt.

### Movie and cartoon comparison (shots 6a/6b)
- **TV 1 (6a):** our own pixel drawing of a police radar gun with a big `300 MPH` readout.
  - Use no movie frames, actors, posters, logos or the movie's Sonic design.
  - Sonic in the street turns his head to the TV, surprised.
- **TV 2 (6b):** a blue streak breaking the sound barrier, shown as a white shock-wave cone. Our own drawing.
- **Speed ladder** at the side of the frame, built rung by rung on the words:
  - `GAME 33`
  - `MOVIE ≈480`
  - `CARTOONS 1,235+` (comma with a tail)
- In shot 9 the ladder comes back with a new rung, `ROLLING 88`.

### Loop scenes
- Wide shot with the `6 m` bracket.
- Diagram:
  - an arrow at the bottom reading `≥ 44 km/h`;
  - a dotted line showing where a body falls from the top.
- **Running attempt at 33:** Sonic gets about halfway up and slides back down. Smooth and cartoonish, not hurt.
- **Rolling ball at 88:** goes around the loop with a blue trail. Chips `33 < 44` and `88 > 44` ✓.
- **Flat square:** the ball rolls and slows to a stop with a speedometer `88 → 0`, then Sonic uncurls, annoyed, and looks at the hill.

### Numbers on screen, each on its word
`1 m` · `39 px` · `1 px ≈ 2.5 cm` · `6 px/frame × 60` · `33 km/h` · `RUNNER 45` / `SONIC 33` · `MOVIE ≈300 mph` · `≈480 km/h` · `SPEED OF SOUND ≈1,235 km/h` · `SONIC = SOUND` · `16 px/frame` · `88 km/h` · `CAR 88` · `6 m` · `≥ 44 km/h` · `33 < 44` · `88 > 44 ✓` · `88 → 0` · `SUPERPOWER: HILLS` · `NEXT: CREEPER`

- Counters roll smoothly.
- Chips are no smaller than Pac-Man's.

### Ending
- On «Next», the portal blinks and a green Creeper silhouette shows in it. Our own simple blocky drawing, no Mojang art. Chip `NEXT: CREEPER`.
- Then the FOLLOW → FOLLOWING ✓ card (button part, as in Pac-Man's `cta.mjs`), with the bell on «miss».
- Hold about 0.8 s, with a music cadence.

### Not allowed
- Sega or Mojang logos, fonts, original sprites, tiles or zone layouts; original sounds (rings, jump, spin dash) or music.
- Movie stills or actor likenesses.
- Latin words on screen other than those the shot table names, in our pixel fonts.

## Voice
- Dennis · Eleven v4 `[thoughtful]`, `language_code=en`, the cached `tts.py` pattern.
- The key is read from `.env.local` inside the process only. Never print, copy or log it.
- **ONE paid take.** Up to 2 re-takes only for a broken take: a wrong or missing word, failed alignment, or a mispronounced «Sonic», «Usain Bolt» or «Creeper».
- `narration.txt` writes numbers as words, as listed in script.md:
  - «three hundred miles an hour»;
  - «four hundred eighty kilometers an hour»;
  - «twelve hundred kilometers an hour»;
  - and the others listed there.
- Keep the script's wording. Captions show the script's text with digits (timeline MERGE).
- Check pronunciations and timings with Scribe.

## Sound
- Synthesized only, our own. Each sound lasts exactly its motion:
  - accelerating footsteps;
  - a spin-ball hum that pitches up with speed;
  - skid;
  - portal swirl, and a whoosh-thump on the hard cut;
  - speedometer ticks;
  - TV click-on;
  - a shock-wave «boom» (soft, short) on the sound barrier;
  - car pass-by whoosh;
  - loop rising tone, then a slide-down;
  - a ball winding down on flat ground.
- Bed: a fast, cheerful chiptune of our own, about −12 dB under the speech, with a cadence at the end.
- Voice about −16 LUFS integrated.

## Deliverables (in `sonic-real/film/`)
- `sonic-real-pixel.mp4` master.
- Send copy ≤30 MiB (`-max.mp4`, or the master if it is already ≤30 MiB).
- `cover.png`:
  - kicker «IN OUR WORLD #4»;
  - title «HOW FAST IS / SONIC REALLY?»;
  - the Sonic sprite as a spin ball rolling down the city street with a speedometer `88 km/h`;
  - margins as in Pac-Man's `cover.mjs`.
- `description.txt` exactly as in script.md.
- `credits.txt`.
- `facts.md`: copy the facts table and calculations from script.md.
- `README.md`:
  - what was built;
  - QA numbers;
  - what was not checked;
  - a no-catalog statement;
  - the list of new assets;
  - the measured sprite height (39 cells).
- `dev/assets-new.png`: a sheet of every sprite and frame at its scale, plus new city props.

## QA (from the final MP4)
- Frames and duration.
- Pops scan: the portal cut is the only allowed cut; name its frame. Say how the scan treated cycle and dither steps.
- Loudness.
- 30-frame `qa/contact-sheet.jpg`.
- Safe-zone overlay on about 12 key frames.
- Real playback in the built-in browser if you can; otherwise say so.
- Sonic's height on the contact-sheet frames, as % of 1920: min, median, max. Target: median 20–30%, min ≥8% (wide shot).
- Zoom one frame per scale: the cells must be clean integer squares.
- Every on-screen number matches the script and appears on its word.
- Work in three passes: one draft sheet, one fix pass, one final sheet.

## Report back (≤250 words)
- Paths, duration, word count.
- TTS takes used.
- Sprite grid and scales.
- Sonic's size: min, median, max.
- QA numbers.
- Known issues.
