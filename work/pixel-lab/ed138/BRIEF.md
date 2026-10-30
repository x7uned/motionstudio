# Builder brief · ed138 «A new world beyond Pluto» (2026-10-28)

User order (2026-10-28, chat): a Kagenami video in English about yesterday's Rubin Observatory news (dwarf planet candidate 2026 ED138), space topic, «надо хорошо отрисовать и все круто сделать». Then the assets we draw go into the Kagenami catalog. The lead wrote and fact-checked the script. You build ONE film; the lead checks and sends it, then ports the good assets into the catalog.

- Script, screen table, asset list: `work/pixel-lab/ed138/script.md`. Facts: `work/pixel-lab/ed138/research.md`. Build in `work/pixel-lab/ed138/film/`.
- **All rules of `work/pixel-lab/BATCH-2026-10-26.md` apply unchanged** (sections «Save the user's limits», «Format», «Render, QA, deliverables»): build alone, no subagents; one paid TTS take (≤2 re-takes only if broken: wrong/missing word, failed alignment, mispronounced topic word — check «ED138», Haumea, Makemake); follow ending with the FOLLOW → FOLLOWING ✓ card; no overlay; safe zones v1; no one-frame changes; synthesized 8-bit sound only; render-lock for heavy jobs; QA from the final MP4; deliverables (master, ≤30 MiB send copy, cover.png, description.txt, credits.txt, facts.md, README.md). Do not send files to the user.

## Harness
Frozen copy of `work/pixel-lab/casino-tables/film` harness only (render/captions, timeline, mix, synth-core/synth, sheet, cover, cta, cute, tts.py, dev/qa.mjs, dev/pops.mjs, dev/retime.mjs, dev/maxcopy.sh, dev/zones.mjs). Do NOT copy the casino art; this film is space. Never edit other folders.

## Art (the priority: good drawing)
Space art in the house style already exists in the Kagenami catalog — reuse it as **frozen copies** inside `film/` (fix import paths; don't import from the catalog folder):
`/Users/rv/Desktop/kagenami/packages/pixel-engine/catalog/init/assets/{sun,earth,moon,star,asteroid,saturn,mars}.mjs`, `init/lib/space-kit.mjs`, `init/backdrops/space.mjs` (+ `bd1-*` libs it needs), `engine/layout.mjs`, `renderer/pixel/raster.mjs` of that package (or Motion Studio `renderer/pixel/raster.mjs`). Look at `init/gallery/assets-05-space.jpg` and `init/gallery/backdrops.jpg` for the look: chunky lit spheres, 1-px dark outline, light from upper left, Bayer-dithered bands, no blur, no smooth gradients.

Look and world (one persistent world, camera close → wide, see script «Мир фильма»):
- A rich, deep night: dense Milky Way band (thousands of stars of several sizes and colours, dark dust lanes, faint glow by dithering), parallax star layers, slow twinkle. Every frame full and lit; avoid long near-black frames and tiny close-ups.
- The mountain: Andes silhouettes in layers, sea of clouds in the valley, the Rubin-like observatory (our own drawing: white tower, boxy dome with open slit, short wide telescope with a big camera; no logo, no lettering on the building). Dome rotation and slit opening are eased.
- The outer solar system: oblique top view, dotted orbits, small far Sun, Neptune, Pluto (heart-shaped bright plain, no face), Kuiper-belt pebbles, the new icy world (grey-blue ice with pinkish patches, craters), tilted orbit ≈25°.
- Sky photos: square survey frames with a film-strip border and a year label (2016 … 2026), the same star field with one faint dot that shifts; circle reticle; blinking = smooth crossfade between frames.
- Dwarf-planet line-up: Pluto, Ceres, Eris, Haumea (elongated), Makemake + a dashed «?» slot; names appear on the spoken word; the new world rolls into slot six on «sixth».
- Chile flag: draw it yourself in pixels (white/red halves, blue square, white star); no downloads, no Rubin logo (note it in README).
- On-screen words: few, Latin, our pixel fonts: «2026 ED138», «CHILE», «DOTS», «600–1,500 KM», «SHINY / DARK», years, names. No real Rubin images, no real data plots.

## New assets → catalog-ready (important for the next step)
Write every NEW object as its own module `film/assets/<kind>.mjs` that default-exports an item in the catalog contract (`/Users/rv/Desktop/kagenami/packages/pixel-engine/catalog/items/README.md`: kind, covers, desc, hw, hh, start, states (2–6, first = idle), base, st, linear, draw(c, cx, cy, z, t, s) pure, returns {box, pt}); objects only — one asset = one object, no scenery inside, no text except `s.label`/`s.value`. In the film, drive them through a tiny adapter that builds `s` (`v` eased params from your timeline, `acc`, `a` presence, `label`). Backdrop-like pieces (Milky Way sky, night mountain) go to `film/assets/backdrop-<kind>.mjs` with the backdrop contract (`backdrop: true`, theme, draw(c, cam, t)) where practical; if a film piece cannot follow the contract cheaply, keep it film-only and say so.
Expected kinds (adapt names if better): `observatory`, `sky-photo`, `ice-world` (the 2026 ED138 look; states idle/grow/shiny/dark), `pluto`, `ceres`, `eris`, `haumea`, `makemake`, `neptune`, `orbit-path`, `chile-flag` (flag is fine as a prop: our drawing of a public-domain design), backdrops `milky-way`, `night-mountain`. Do not write into the Kagenami catalog folder yourself.

## Sound
8-bit synthesized: soft telescope motor whir (dome turn, exact length), shutter clicks for photos, data blips for linking dots, a rising sweep for the flight to space, gentle sparkle on the reveal, pop on names, a «slot» thunk on the sixth place. Space bed: calm, wonder (space-drone-like chiptune pad + slow arpeggio) ≈ −12 dB under speech, cadence at the end.

## Cover and description
Cover kicker «SPACE NEWS», pixel title «A NEW WORLD / BEYOND PLUTO», scene = the icy world in front of the Milky Way with the reticle «2026 ED138». Description per BATCH rules: ~10 words with «dwarf planet», an emoji, ≤4 hashtags (e.g. #space #astronomy #dwarfplanet #pluto), `Sources: Rubin Observatory, University of Washington, SLAC`.

## Report (≤ 250 words)
Paths, duration, word count, TTS takes, QA numbers, known issues, and the list of `film/assets/*.mjs` with their states and which you think are good enough for the catalog.
