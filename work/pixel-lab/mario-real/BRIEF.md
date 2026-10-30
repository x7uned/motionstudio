# BRIEF: mario-real — «How high can Mario jump in our world» (IN OUR WORLD #2)

User order (2026-10-29, chat): the user approved `script.md` v2 in this folder and said «Да, собирай». One builder makes this ONE film; the lead checks it and sends it to the user. Nothing is approved until the user says so.

## Read first
- `work/pixel-lab/mario-real/script.md` — narration (the `> ` paragraph, word for word), the shot table, the «Марио крупно» rules, sound, cover, description, facts. Source of truth.
- `work/pixel-lab/IN-OUR-WORLD.md` — the rubric format (game world → portal → HARD CUT → our city; hero large).
- `work/pixel-lab/BATCH-2026-10-26.md` — «Save the user's limits», «Format», «Render, QA, deliverables» apply unchanged: build alone, no subagents; one paid TTS take (≤2 re-takes only for a broken take); FOLLOW → FOLLOWING ✓ card; no overlay; safe zones v1; synthesized 8-bit sound only; render-lock for heavy jobs; QA from the final MP4.
- `docs/pixel-film.md`, `work/pixel-lab/shared/BRIEF-COMMON.md`, `video-design/MOTION-RULES.md`.
- Quality reference and the previous episode: `work/pixel-lab/steve-real/film2/` (README, `qa/contact-sheet.jpg`) — its art level is the floor; its main flaw (hero tiny in wide shots, ~6% of frame height; puddles reading as blue blobs) must not repeat.

## No catalog art (user rule 2026-10-28)
Draw everything for this film. Import or copy NOTHING from the Kagenami catalog (`~/Desktop/kagenami/...`), not even when a kind exists. Never edit other films' folders, `shared/`, `renderer/` or the catalog.

## Harness
- Frozen copy of `work/pixel-lab/steve-real/film2/` film-own code into `mario-real/film/`: render.mjs, timeline.mjs, mix.mjs, synth-core.mjs, synth.mjs, sheet.mjs, cover.mjs, cta.mjs, cute.mjs, tts.py, `dev/*`, `lib/drive.mjs`, `lib/layout.mjs`, `lib/hud.mjs` (comma with a tail), `lib/rig.mjs`, `lib/view.mjs`, `lib/box3d.mjs` if useful. You may start the passers-by from film2's `assets/passerby.mjs` (it is film art, not catalog) but give them this film's evening light and new looks.
- Do NOT copy Steve, the Steve street backdrop, bank, scales, elephants, gold, shulker, inventory. New location, new art.
- Do NOT copy film2's `voice/` — this film has its own voice.

## The film
- 540×960 grid ×2 → 1080×1920, 30 fps. Duration follows the voice (~196 words, expect ~64–68 s).
- **Two worlds.**
  1. **Game world (frame 0 → «Let's bring him here»):** a flat side-scrolling level in the spirit of the 1985 game, drawn by us — sky blue, brick ground, brick and «?» blocks, green pipes, round bushes and clouds. Not a copy of World 1-1 and not Nintendo sprites/tiles; our pixel drawing at the film's resolution (finer than NES). Mario already running and jumping at frame 0, large (≥35% of frame height); camera scrolls with him; he bumps a «?» block and a coin pops out.
  2. **Portal:** on «bring», a swirling purple-blue portal opens in the level (smooth growth); Mario runs and dives in.
  3. **HARD CUT** (the user's explicit rubric signature): the next frame is our city with the same portal; Mario flies out of it large and lands on the pavement. This scene cut is allowed; everything inside each scene still enters/leaves smoothly. In QA, list this cut frame as the intended cut, not a pop.
  4. **Our city (rest of film):** evening street, 3/4 high angle, full frame top to bottom. Hero location: a three-story residential house (≈10 m to the roof) with balconies, flower boxes, residents in windows; pavement with a low brick planter, a high-jump bar on stands, lamp posts, road with markings in the lower part (lit, readable, no blobs). Adult passers-by to real scale (1.6–1.85 m) next to Mario 1.55 m.
  - The game world returns only as a small framed «game window» inset for comparisons (two blocks, five-block jump, ≈10× pull, ≈40 km/h landings), smooth in/out.
- **Mario large (main lesson from Steve):** Mario is 35–60% of frame height in almost every shot; low camera (knee/chest level) looking up. The 11 m jump: the camera RIDES UP with Mario along the facade (floors, windows, residents pass by) instead of pulling back. Only one wide shot (~2 s, on «higher than the roof»), and even there Mario is ≥12% of frame height in the foreground with a white motion trail. Mario is the most saturated object in the frame.
- **Mario design:** recognisable, drawn by us — red cap with a plain round emblem (no «M», no logo), black moustache, blue overalls with buttons, red shirt, white gloves, brown shoes. Springy motion, clear arm wind-up before jumps. Same design in both worlds (flatter shading in the game world). Make him a catalog-contract module `film/assets/mario.mjs` (`kind/covers/desc/hw/hh/start/states/base/st/linear/draw → {box, pt}`), states idle / run / crouch / jump-up / apex / fall / land / dust-off / look-up / point / proud.
- **Physics on screen:** the game jump (in the inset and the first «five blocks» jump) uses game timing: fast rise, short hang, fast fall (~0.95 s total). The 11 m jump in our world is ~3 s of real air time; show the flight in smooth slow motion with a small «SLOW-MO» chip while the «3 s» timer counts real flight time; the fall/landing returns to normal speed. Landing: dust, cracked paving tile, Mario stays on his feet.
- **Numbers on screen exactly as the shot table, on their words:** 1.55 m, 1 block ≈ 0.78 m, 3.9 m, 2.45 m · WORLD RECORD, 52 km/h ↑, 44.7 km/h (runner, no celebrity likeness), EARTH 1× / GAME ≈10×, 10.8 m (tape on the wall 1 m … 11 m, floor numbers 1–2–3), 3 s, 52 km/h ↓, ≈40 km/h, SUPERPOWER. Counters roll smoothly.
- **Residents' gags on the words:** «second floor» — a grandmother drops a watering can; «third» — a boy films with a phone; «roof» — pigeons take off.
- **Ending:** «NEXT: PAC-MAN» chip on «Next» with our own yellow Pac-Man silhouette (no Namco art), then the FOLLOW → FOLLOWING ✓ card (button part of `deadliest/film/levels/cta.mjs`, as in film2's `cta.mjs`), bell on «miss», hold ~0.8 s, music cadence.
- No Nintendo/Namco logos, sprites, tiles, fonts, sounds or music. Latin words on screen only those the shot table names, in our pixel fonts.

## Voice
- Dennis · Eleven v4 `[thoughtful]`, `language_code=en`, the cached `tts.py` pattern; the key is read from `.env.local` inside the process only — never print, copy or log it. ONE paid take; ≤2 re-takes only for a broken take (wrong/missing word, failed alignment, mispronounced «Mario» / «Pac-Man» / «Usain Bolt»).
- narration.txt for the voice: write numbers as words where needed («one hundred fifty-five centimeters», «seventy-eight», «two point four five meters», «fifty-two kilometers an hour», «eleven», «forty»), «Super Mario Brothers» for «Super Mario Bros.». Keep the script's wording; captions show the script's text and digits (timeline MERGE, as in film2). Check pronunciations and timings with Scribe.

## Sound
Synthesized 8-bit only, ours (no Mario jump/coin sounds, no Mario theme or anything resembling it): game-world bounce and coin-like «ding» of our own design, portal swirl, hard-cut whoosh-thump, landing thud + dust, spring take-off, rising whistle on the climb, wind at the apex, heavy landing hit, counter/tape ticks, pigeon flutter, watering can clang. Each sound lasts exactly its motion. A bright curious chiptune bed ≈ −12 dB under speech (our own melody); music drops out for ~1 s at the 11 m apex and returns with the landing; cadence at the end. Voice ≈ −16 LUFS integrated.

## Deliverables (in `mario-real/film/`)
`mario-real-pixel.mp4` master; send copy ≤30 MiB (`-max.mp4`, or the master if ≤30 MiB); `cover.png` (kicker «IN OUR WORLD #2», title «HOW HIGH CAN / MARIO JUMP?», Mario large mid-air above the roof of the three-story house, tape «11 m»; cover margins as in film2's `cover.mjs`, avatar + @KAGENAMI_AI + chip in one row at y1545); `description.txt` exactly as in script.md; `credits.txt`; `facts.md` (copy the facts table + links from script.md); `README.md` (what was built, QA numbers, what was not checked, statement that no catalog art was used, list of new assets); `dev/assets-new.png` sheet of all new assets in all states.

## QA (from the final MP4)
Frames/duration, pops scan (the portal cut is the only allowed cut — name its frame), loudness, 30-frame `qa/contact-sheet.jpg`, safe-zone overlay on ~12 key frames, real playback in the built-in browser if you can (otherwise say so). Measure Mario's height in px on the contact-sheet frames and report min/median (target: median ≥35% of 1920, min ≥12%). Check every on-screen number matches the script and appears on its word. One draft sheet, one fix pass, one final sheet — don't polish endlessly.

## Report back (≤250 words)
Paths, duration, word count, TTS takes used, QA numbers (incl. Mario size), known issues.
