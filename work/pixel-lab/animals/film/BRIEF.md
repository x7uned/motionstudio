# Brief for level builders · «From the dumbest animal to the smartest» (pixel film, Kagenami)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/animals/film` (all paths below are relative to it).

## What the film is
A 75.9 s vertical pixel film (540×960 grid, upscaled ×2 → 1080×1920, 30 fps) that loops. One take of narration (`narration.txt`, word timings in `voice/words.json`). The camera travels through ONE continuous side-view world: a sea column (sponge on the deep floor → jellyfish → octopus near the surface) → shore → meadow with a beehive → a house yard → forest → a bay → savanna → jungle → a night city with a harbour. Under the city the same sea column repeats; the camera dives down it and lands exactly on the first frame. Ten levels: LV1 sponge, LV2 jellyfish, LV3 octopus, LV4 bee, LV5 dog, LV6 crow, LV7 dolphin, LV8 elephant, LV9 chimp, LV10 human.

## Style (the user's explicit request)
Cute pixel-art animals that **look into the camera**, like the user's reference: a black pixel cat sitting front-on under a full moon, big round amber eyes with two white highlights, pink dithered blush dots, small pink nose and "w" mouth, whiskers, dark 1-px outline, soft volume shading in flat tone bands with Bayer dithering, a big sky disc behind the head. Our calibration copy of that cat: `dev/cat-test.mjs` → `dev/cat-test.png` (read both). Chibi proportions: big head, big eyes, soft round bodies, small limbs. Polished, warm, readable at phone size.

## Files to read first
- `timeline.mjs` — `W()` word lookup, `EV` (event times), `LV` (level time ranges), `REST` (camera rest positions), `BIOME` (x ranges), `LAND` (=-20, land ground line), `SURFACE` (=0, sea level), `SEA_FLOOR` (=1800), `DISC` (screen 270,360), `CAM`, `END`.
- `world.mjs` — `view()` (the V object), `drawWater(c, V, t, x0, x1, surfaceY)`, `tod()` (time of day by camera x). The sky, clouds, stars and the sky disc are drawn by the harness, not by you.
- `cute.mjs` — the kit: `blob` (volume-shaded union of polygons with outline), `flat`, `ell`, `tube`, `capsule`, `bez`, `eye`/`eyes` (pupil "slit" | "round" | "bead", `look`, `blink`), `blinkAt(t, every, phase)`, `blush`, `mouthW`, `smile` (with `open`), `nose`, `shadow`, `sign(c, x, y, "LV n", style)` (styles: wood, stone, plate, bubble, neon, buoy), `pickup(c, x, y, "+SKILL", k)`, `tag(c, lines, cx, y, a, col, scale)`, `panel`, `RAMP` (8-step colour ramps), `C` (UI colours), `sm`, `ease`, `win`, `lerp`, `rnd`, `fade`, `mix`, `bayer`, `MAIN`/`TINY` fonts.
- `hero.mjs` — `drawHero(c, x, y, {pose, phase, facing, look, blink, a, scale, mouth, brows, screen})`: the recurring human hero (coral puffer, purple bobble hat, blue scarf, yellow mittens), ~150 px tall, feet at (x, y).
- `render.mjs` — the harness: layer order sky → `fill` → sky disc → `back` → `actors` → `front` → `hud` → caption shade → captions.
- `../../../../renderer/pixel/raster.mjs` — `Canvas` primitives (`px rect rrect frame line poly disc ring ellipse ering dither tint text measure get`), `fade(c, a)` dissolve view.
- `../../dog/shade.mjs` — the shading engine behind `blob`.
- `../script.md` — the script (NOTE: in the final film the octopus is LV3 and the bee LV4; text otherwise as in `narration.txt`).

## Module interface (your files in `levels/`)
```js
export const RANGE = BIOME.<name>;              // world x range you own
export function fill(c, V, t) {}                // optional: water bodies (drawn before the sky disc)
export function back(c, V, t) {}                // terrain, far/mid background (in front of the sky disc)
export function actors(c, V, t) {}              // animals, props, in-world level sign
export function front(c, V, t) {}               // foreground (grass blades, stones, ground lip) that overlaps actors
export function hud(c, V, t) {}                 // pickups, counters, tags (screen space)
```
`V = { cx, cy, X(wx), Y(wy), x0, x1, y0, y1, t, dive? }`; screen = (270 + wx − cx, 480 + wy − cy). Convert world → screen with `V.X/V.Y` and round. z = 1 always (no zoom): the art stays pixel-crisp. Return early when your range is off screen.

## Rules
1. **Nothing changes in one frame.** Every appearance, disappearance and state change is continuous: dissolve with `fade(c, a)` / the `a` options, ease motions, blink over several frames (`blinkAt`). Animals breathe (1–2 px bob), blink, sway ears/tails a little: they must feel alive whenever on screen.
2. **Composition.** At the level's `REST` camera, the animal is centred at screen x ≈ 270 with its head around the sky disc (screen 270, 360; disc radius 55–125 depending on time of day), body on the ground at screen y ≈ 640 for land levels. Keep the disc area mostly free of opaque background so the disc frames the head like the reference moon. Captions live at screen y ≈ 640–790 (soft shade): no important text there. The picture must reach the bottom edge: ground and foreground continue to y 960 (no black bands, no vignettes).
3. **Text on screen**: Latin uppercase pixel font only (`MAIN`, scale 2–3), from the script's facts. Panels/tags at screen y ≥ 130; keep x within 12..528; avoid x > 470 for y 450–750 (TikTok buttons).
4. **Level sign**: one in-world `sign(...)` per level with "LV n", standing/floating near the animal (it belongs to the world, visible whenever the level is on screen). **Skill pickup**: `pickup(c, x, y, "+SKILL", k)` where k runs 0→1 over ~1.6 s from the skill word.
5. **Seams with neighbours**: terrain is yours only inside RANGE; at both range edges the land ground line is y = LAND (−20). Make the look blend into the neighbour (described in your task). Decor may overlap a neighbour by ≤ 40 px.
6. **Time of day** follows the camera (dawn → morning → day → afternoon → golden → dusk → night). Colour your terrain for your level's time of day (given in your task).
7. **Pure functions of t**: no Math.random; use `rnd(seed)`. Use only `EV`/`LV`/`W()` times — never hard-coded seconds.
8. **Speed**: ≤ 40 ms per frame for your module when visible. Cache static layers: draw them once into an offscreen `Canvas` and copy rows into `c.d` (Uint8ClampedArray RGB) with clipping, instead of redrawing thousands of primitives per frame. Avoid full-screen per-pixel loops calling `c.px` every frame.
9. **Only edit your own files** (`levels/<yours>.mjs`, helper files you create named `levels/<yours>-*.mjs`, test scripts in `dev/<yours>-*.mjs`). Never edit `render.mjs`, `timeline.mjs`, `world.mjs`, `cute.mjs`, `hero.mjs` or other agents' files — if you need a change there, say so in your report. Other agents are editing their levels at the same time; a stub of theirs may look plain — ignore it.
10. No network, no paid APIs, no TTS, no `--video` renders.

## Checking your work
`node render.mjs --stills 27,28.5,30` writes `stills/tX.XX.png` (1080×1920); `node sheet.mjs dev/<yours>-sheet.jpg 27,28.5,30 6` makes a contact sheet. **Look at them** (Read the images) and iterate until the level is cute, polished and readable, every event happens on its word, and transitions in/out of your range look good. Also time one frame (`node -e` with `frame(t)` from render.mjs) to check speed. In the report: files, what is on screen when, times worth checking, known issues.
