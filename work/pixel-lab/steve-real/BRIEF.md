# BRIEF: steve-real — «How strong is Minecraft Steve in our world» (IN OUR WORLD #1)

User order (2026-10-28, chat): the user approved `script.md` in this folder and said «Да, собирай». One builder makes this ONE film; the lead checks it and sends it to the user. Nothing is approved until the user says so.

## Read first
- `work/pixel-lab/steve-real/script.md` — the narration (the `> ` paragraph, word for word), the shot table, sound, cover, description, facts. It is the source of truth.
- `work/pixel-lab/BATCH-2026-10-26.md` — sections «Save the user's limits», «Format», «Render, QA, deliverables» apply unchanged: build alone, no subagents; one paid TTS take (≤2 re-takes only for a broken take: wrong/missing word, failed alignment, mispronounced topic word); follow ending with FOLLOW → FOLLOWING ✓ card; no overlay; safe zones v1; no one-frame changes; synthesized 8-bit sound only; render-lock for heavy jobs; QA from the final MP4; the listed deliverables. Do not send files to the user.
- `docs/pixel-film.md`, `work/pixel-lab/shared/BRIEF-COMMON.md`, `video-design/MOTION-RULES.md`.
- `.agents/skills/kagenami-catalog/SKILL.md` — only the part about the catalog contract for new assets (the lead ports them later; you do not touch the catalog).

## Harness
- Frozen copy of the newest harness `work/pixel-lab/ed138/film` into `steve-real/film/`: render/captions, timeline, mix, synth-core/synth, sheet, cover, cta, cute, tts.py, `lib/drive.mjs`, `lib/layout.mjs`, `dev/*` (qa.mjs, pops.mjs, asset-sheet.mjs, zones.mjs, diffbox.mjs, maxcopy.sh). Do not copy the space art.
- Never edit other films' folders, `shared/`, `renderer/` or the Kagenami catalog.

## Reuse before drawing
Frozen copies (fix import paths) from the Kagenami catalog `~/Desktop/kagenami/packages/pixel-engine/catalog/init/`:
- backdrop `city-street` (base of the persistent world; extend it in your copy: bank facade with columns, café, bus stop, tree in a planter, 1×1×1 m concrete barrier, roofline where Eiffel silhouettes later rise);
- assets `bank`, `tree`, `adult` (+ `child`, `office-worker` for passers-by), `bus`, `car`, `bicycle`, `scales`.
Check each with `dev/asset-sheet.mjs` first; if one does not fit the scene, adapt your copy.

New objects: draw each as a catalog-contract module `film/assets/<kind>.mjs` (`kind/covers/desc/hw/hh/start/states/base/st/linear/draw → {box, pt}`), pure functions of t, smooth state changes. Expected new kinds:
- `steve` — recognisable blocky hero (light-blue tee, dark-blue trousers, brown hair, square head), OUR pixel drawing, no ripped textures; blocky motion (arm swings in an arc, stiff-leg walk/run, head turns); states idle / walk / run / punch / hold (block in one hand) / step-sink / look.
- `portal` (purple swirling frame, our drawing) open / close; `break-cracks` overlay (10 stages, eased); `item-drop` (small spinning block item that flies to the hand);
- `gold-block`, `concrete-block`, `log` (block + item forms); `shulker-box` (purple box with a lid; open / fill / shrink-to-icon);
- `inventory-grid` (our own 4×9 grid UI, slots fill in a wave, «64» counts, a slot can hold a shulker icon) — not the Mojang GUI texture;
- `elephant`, `strongman` (barbell, shaking), `eiffel-silhouette`, `gold-mountain` (labelled pile), `speedometer`, `timer` chip, `asphalt-cracks`.
- No Minecraft logo or Mojang UI art. Latin on-screen words in our pixel fonts, only those the shot table names.

## Film specifics
- 540×960 grid ×2 → 1080×1920, 30 fps. One persistent street for the whole film; the camera moves (pull back for the gold mountains, run with Steve, return for the final step). Inventory and counters live in the main safe zone over the sky.
- Frame 0: Steve already tumbling out of the open portal (hero moving at frame 0).
- Every number on screen exactly as in the shot table: 1.8 m, 1 m, 3 s, 9 s, 19 t, ≈0.5 t WORLD RECORD, ×40, 64, 2,304 BLOCKS, 44,000 t, 20 km/h, 1,200,000 t, ALL GOLD EVER MINED ≈ 220,000 t (5½ piles). Counters roll smoothly (odometer), never jump.
- Ending: «NEXT: MARIO» chip on «Next» (a silhouette with «?», no Nintendo art), then the FOLLOW → FOLLOWING ✓ card (button part of `deadliest/film/levels/cta.mjs`, as in ed138), bell on «miss», hold ~0.8 s, music cadence.
- Duration: the approved script is ~208 words, expect ~68–72 s. That is accepted by the user; do not cut text for length.

## Voice
- Dennis · Eleven v4 `[thoughtful]`, `language_code=en`, the cached `tts.py` pattern; the key is read from `.env.local` inside the process only — never print, copy or log it.
- For the voice write numbers as words where needed (narration.txt): «one point eight», «forty thousand»… keep the script's wording; captions show the script's digits (timeline MERGE, as in ed138). «Minecraft», «shulker» must be pronounced correctly — check with Scribe.

## Sound
Synthesized 8-bit only: portal hum, punch thuds + crack ticks, item «plip», slot clicks, counter ticks, footsteps, heavy asphalt crunch on the final step, scale clunk, elephant steps. Each sound lasts exactly its motion. Light curious chiptune bed ≈ −12 dB under speech, a short music pause before «Our world has weight», cadence at the end. Voice ≈ −16 LUFS integrated.

## Deliverables (in `steve-real/film/`)
`steve-real-pixel.mp4` master; send copy ≤30 MiB (`-max.mp4` or the master if ≤30 MiB); `cover.png` per script (kicker «IN OUR WORLD #1», title «HOW STRONG / IS STEVE?», Steve holding the gold block in the street, Eiffel silhouettes; cover margins as in ed138 `cover.mjs`, avatar + @KAGENAMI_AI + chip in one row at y1545); `description.txt` exactly as in script.md; `credits.txt`; `facts.md` (copy facts + links from script.md); `README.md` (what was built, QA numbers, what was not checked); `dev/assets-new.png` sheet of all new assets in all states.

## QA (from the final MP4)
Frame/duration, pops scan, loudness, 30-frame `qa/contact-sheet.jpg`, safe-zone overlay on ~10 key frames, real playback in the built-in browser if you can (otherwise say so). Check that every on-screen number matches the script and appears on its word.

## Report back (≤250 words)
Paths, duration, word count, TTS takes used, QA numbers, known issues.
