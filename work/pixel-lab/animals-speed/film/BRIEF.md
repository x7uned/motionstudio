# Brief for level builders · «From the slowest animal to the fastest» (pixel film, Kagenami)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/animals-speed/film` (all paths below are relative to it).

## What the film is
A 53.8 s vertical pixel film (540×960 grid ×2 → 1080×1920, 30 fps). One narration take (`narration.txt`; word timings in `voice/words.json`). It ranks animals from the SLOWEST to the FASTEST. The camera travels right through ONE continuous side-view world, morning → night → the next dawn: a morning garden with a snail-race track (hook + snail) → a rainforest (sloth) → a running stadium (a human sprinter) → a house yard in the afternoon (cat) → a racecourse at golden hour (racehorse) → the savanna at sunset (cheetah) → a bat cave under the night moon (free-tailed bat) → a city rooftop at dawn (peregrine falcon + the channel's own pixel character, whom the falcon's dive blows over at the very end). Not a loop.

Eight levels, numbers = top speed in KM/H (see `../facts.md`; on-screen numbers must match): LV1 snail 0.01 (record: 33 CM in 2 MIN) · LV2 sloth 0.25 · LV3 human 44 · LV4 cat 48 · LV5 racehorse 70 · LV6 cheetah 93 · LV7 free-tailed bat 160 · LV8 peregrine falcon 300+ (in a dive). A speedometer readout at the very top (screen y 100–190) is mine; it shows the number, so you don't need to draw it (you may add a small in-world tag for an idea, e.g. "33 CM / 2 MIN", "ALGAE", "+REST").

Tone: cute, energetic and a bit funny. Speed reads through motion: speed lines, dust, wind in fur and grass, squash-and-stretch, a blur trail behind a sprint — all continuous.

## Style (the user's explicit request for this series)
Cute pixel-art animals that **look into the camera**, like the user's reference: a black pixel cat sitting front-on under a full moon, big round eyes with two white highlights, pink dithered blush dots, small nose, "w"/smile mouth, dark 1-px outline, soft volume shading in flat tone bands with Bayer dithering, the big sky disc behind the head. Calibration copy of that cat: `../../animals-weight/film/dev/cat-test.mjs` → `../../animals-weight/film/dev/cat-test.png` (read both). Chibi proportions: big head, big eyes, soft round bodies, small limbs. Polished, warm, readable at phone size. Earlier films of the same series to look at (finished art you may copy code from, never edit): `../../animals/film`, `../../animals-weight/film`, `../../animals-heart/film` (stills in their `stills/` and `dev/*sheet*.jpg`). Reusable animals there: cat (`animals-weight/film/levels/cat-art.mjs`, `animals-heart/film/levels/cat-art.mjs`), horse (`animals-weight/film/levels/pasture*.mjs`), rabbit, mouse, dog, chimp, hummingbird, elephant… The orange tabby of the earlier film «How your cat drinks» lives in `../../cat-drink/`. A sister film made at the same time, `../../deadliest/film/levels/`, has a lion, a hippo, a dog, a snake, a mosquito and the night camp with the channel's character (copy only, never edit).

## Files to read first
- `timeline.mjs` — `W()` word lookup, `EV` (event times), `LV` (level time ranges), `REST` (camera rest positions), `BIOME` (x ranges), `LAND` (= −20, land ground line), `SURFACE` (= 0, water level), `DISC` (screen 270, 360), `CAM`, `END`.
- `world.mjs` — `view()` (the V object), `drawWater(c, V, t, x0, x1, surfaceY)`, `tod()` (time of day by camera x). The sky, clouds, stars and the sky disc are drawn by the harness, not by you.
- `cute.mjs` — the kit: `blob` (volume-shaded union of polygons with outline), `flat`, `ell`, `tube`, `capsule`, `bez`, `eye`/`eyes` (pupil "slit" | "round" | "bead", `look`, `blink`), `blinkAt(t, every, phase)`, `blush`, `mouthW`, `smile` (with `open`), `nose`, `shadow`, `sign(c, x, y, "LV n", style)` (styles: wood, stone, plate, bubble, neon, buoy), `pickup(c, x, y, "+WORD", k)`, `tag(c, lines, cx, y, a, col, scale)`, `panel`, `RAMP` (8-step colour ramps), `C` (UI colours), `sm`, `ease`, `win`, `lerp`, `rnd`, `fade`, `mix`, `bayer`, `MAIN`/`TINY` fonts.
- `hero.mjs` — `drawHero(c, x, y, {pose, phase, facing, look, blink, a, scale, mouth, brows, screen})`: the series' recurring human hero (coral puffer, purple bobble hat), ~150 px tall, feet at (x, y). Use it only if your task says so.
- `render.mjs` — the harness: layer order sky → `fill` → sky disc → `back` → `actors` → `front` → `hud` → overlays (mine) → caption shade → captions.
- `../../../../renderer/pixel/raster.mjs` — `Canvas` primitives (`px rect rrect frame line poly disc ring ellipse ering dither tint text measure get`), `fade(c, a)` dissolve view.
- `../../dog/shade.mjs` — the shading engine behind `blob`.
- `narration.txt` and `../facts.md` — the text and the sourced numbers.

## Module interface (your files in `levels/`)
```js
export const RANGE = BIOME.<name>;              // world x range you own
export function fill(c, V, t) {}                // optional: water bodies (drawn before the sky disc)
export function back(c, V, t) {}                // terrain, far/mid background (in front of the sky disc)
export function actors(c, V, t) {}              // animals, props, in-world level sign
export function front(c, V, t) {}               // foreground (grass blades, stones, ground lip) that overlaps actors
export function hud(c, V, t) {}                 // in-world tags / pickups in screen space
export function ICON(c, cx, cy, a = 1) {}       // REQUIRED: a ~56×56 px head portrait of your animal centred at (cx, cy),
                                                // facing the camera, dark 1-px outline, readable on a dark panel; a = dissolve
```
`ICON` is used by my speedometer (next to the number) and by the guess cards before the reveal ("The cheetah? A racehorse?"), so make it the same character as in your level, just the head, cute and crisp.

`V = { cx, cy, X(wx), Y(wy), x0, x1, y0, y1, t }`; screen = (270 + wx − cx, 480 + wy − cy). Convert world → screen with `V.X/V.Y` and round. z = 1 always (no zoom): the art stays pixel-crisp. Return early when your range is off screen. Also export `MOTIONS` from `levels/<yours>-motions.mjs` (see Sound).

## Rules
1. **Nothing changes in one frame.** Every appearance, disappearance and state change is continuous: dissolve with `fade(c, a)` / the `a` options, ease motions, blink over several frames (`blinkAt`). Animals breathe (1–2 px bob), blink, sway ears/tails a little: they must feel alive whenever on screen. Sprite/pose swaps crossfade.
2. **Composition.** At the level's `REST` camera, the animal is centred at screen x ≈ 270 with its head around the sky disc (screen 270, 360; disc radius 55–125 depending on time of day), body on the ground at screen y ≈ 640 for land levels (REST cy = −180), or at the waterline at screen y 540 (all levels in this film are land levels, REST cy = −180). Keep the disc area mostly free of opaque background so the disc frames the head like the reference moon. Captions live at screen y ≈ 640–790 (soft shade): no important text there. The picture must reach the bottom edge: ground, water and foreground continue to y 960 (no black bands, no vignettes).
3. **Text on screen**: Latin uppercase pixel font only (`MAIN`, scale 2–3). My speedometer sits at the very top (screen y 100–190); keep your own text at y 200–620. Keep x within 12..528; avoid x > 470 for y 450–750 (TikTok buttons).
4. **Level sign**: one in-world `sign(...)` per level with "LV n", standing/floating near the animal (it belongs to the world, visible whenever the level is on screen).
5. **Seams with neighbours**: terrain is yours only inside RANGE; at both range edges the land ground line is y = LAND (−20) (water levels: make the bank meet LAND at the edge). Make the look blend into the neighbour (described in your task). Decor may overlap a neighbour by ≤ 40 px.
6. **Time of day** follows the camera (`TOD_KEYS` in timeline.mjs: morning garden → day jungle and stadium → afternoon yard → golden racecourse → sunset savanna → night cave → dawn city). Colour your terrain for your level's time of day.
7. **Pure functions of t**: no Math.random; use `rnd(seed)`. Use only `EV`/`LV`/`W()` times — never hard-coded seconds.
8. **Speed**: ≤ 40 ms per frame for your module when visible. Cache static layers: draw them once into an offscreen `Canvas` and copy rows into `c.d` (Uint8ClampedArray RGB) with clipping, instead of redrawing thousands of primitives per frame. Avoid full-screen per-pixel loops calling `c.px` every frame.
9. **Only edit your own files** (`levels/<yours>.mjs`, helpers you create named `levels/<yours>-*.mjs`, test scripts in `dev/<yours>-*.mjs`). Never edit `render.mjs`, `timeline.mjs`, `world.mjs`, `cute.mjs`, `hero.mjs` or other builders' files — if you need a change there, say so in your report. Other builders work at the same time; their stubs may look plain — ignore them.
10. No network, no paid APIs, no TTS, no `--video` renders, no ffmpeg encodes (the render slot is shared with other sessions).

## Sound
Every audible motion gets an 8-bit sound that lasts exactly as long as the motion. In `levels/<yours>-motions.mjs` export `MOTIONS = [{ t0, t1, kind, level, note }]` computed from the SAME constants/expressions your picture uses (import them from your level file or a shared `<yours>-time.mjs`), never hard-coded seconds. Kinds the synth knows: buzz, flutter, flap, swish, whoosh, dash (a fast run past), patter (paws), stamp (hooves), step, squish (snail), slide, rustle, chime, sparkle, pop, thud, land, bounce, rise, dive (falcon stoop: a long falling whistle), tilt, munch, blip, alert, uhoh, slap, fall, boing, scratch, creak, trill, twinkle, squeak (bat), click, train (a passing train), wind. Add `note` with a few words ("lion roar", "boat tips over"). level 0..1 = suggested loudness.

## Checking your work
`node render.mjs --stills 3,7.5,9.2` writes `stills/tX.XX.png` (1080×1920); `node sheet.mjs dev/<yours>-sheet.jpg 3,7.5,9.2 6` makes a contact sheet. **Look at them** (Read the images) and iterate until the level is cute, polished and readable, every event happens on its word, and transitions in/out of your range look good (check the camera pans: frames between the neighbouring REST positions). Also time one frame (`node -e` importing `frame` from render.mjs) to check speed. In the report: files, what is on screen when, times worth checking, known issues.
