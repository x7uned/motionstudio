# Brief for level builders · «From the slowest wingbeat to the fastest» (pixel film, Kagenami)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/animals-wingbeat/film` (all paths below are relative to it).

## What the film is
A 59.8 s vertical pixel film (540×960 grid ×2 → 1080×1920, 30 fps) that loops. One narration take (`narration.txt`, word times in
`voice/words.json`, anchors in `timeline.mjs` `EV`). It ranks ten flying animals by **wingbeats per second**, slowest → fastest.
The core idea: every wingbeat is a little push of air; slow wings are separate clicks, and from about 20 beats a second the
clicks blur into one tone — that tone IS the hum, buzz or whine you hear. The lead synthesises the wing sound from one rate
curve (`timeline.mjs`: `rate(t)`, `phase(t)`), and a wing meter at the top of the frame shows the number (`levels/meter.mjs`).

The camera travels right through ONE continuous side-view world of ten biomes (540 px each, `BIOME` in timeline.mjs):
LV1 ocean (wandering albatross, 2.5/s) → LV2 city (pigeon, 6/s) → LV3 flower garden (butterfly, ~10/s) → LV4 pond (banded
demoiselle damselfly, 20/s) → LV5 tropical garden (Anna's hummingbird, 44/s) → LV6 leafy garden (seven-spot ladybug, 75/s) →
LV7 clover field (bumblebee, 150/s) → LV8 meadow with a beehive (honeybee, 230/s) → LV9 house porch at dusk (mosquito, 500/s)
→ LV10 marsh at late dusk (midge, ~1000/s). **The film opens and ends on LV8 (the honeybee):** the hook is about the bee's
buzz, then the camera rewinds fast (motion-blurred) to LV1, climbs the ladder, and at the end pans back from LV10 to LV8,
landing on the exact first frame.

## Style (the user's explicit taste — match the series)
Cute pixel-art animals that **look into the camera**: chibi proportions (big head, big glossy eyes with two white highlights,
pink dithered blush dots, small smile), dark 1-px outline, soft volume shading in flat tone bands with Bayer dithering.
Read these images first: `../../animals-heart/film/qa/contact-sheet.jpg`, `../../animals-weight/film/qa/contact-sheet.jpg`
(our honeybee and hummingbird are there), `../../animals-heart/film/dev/cat-test.png` (the reference cat). Polished, warm,
readable on a phone. **One sky disc** (sun → golden sun → red dusk sun → moon) sits behind the animal's head; the harness
draws it at screen (270, 360). Time of day follows the camera (`TOD_KEYS`): ocean 0.9 (morning) · city 1.5 · garden 2.0 (day)
· pond 2.3 · tropic 2.6 · leaf 3.0 (afternoon) · clover 3.6 · hive 4.2 (golden) · porch 5.0 (dusk) · marsh 5.7 (late dusk).
Colour your terrain for your biome's time of day (`tod(cx)` from world.mjs gives the current value).

## Files to read first
- `timeline.mjs` — `BIOME`, `REST` (rest camera per animal: cx = biome centre, cy = −180), `LAND` (= −20, ground/sea line at
  every biome edge), `EV` (word times), `LV` (when each animal is on air), `RATE` (shown numbers), `wingPhase(who, t)`,
  `strokeAmt(who, t)`, `onAir(t)`, `END`.
- `render.mjs` — the harness: sky → `fill` → sky disc → `back` → `actors` → `front` → `hud` → wing meter → caption shade →
  captions. `node render.mjs --stills 3,9.5` writes `stills/tX.XX.png`; `node sheet.mjs dev/<you>-sheet.jpg 3,9.5,12 6` makes a
  contact sheet. Fast camera moves are rendered as an average of up to 8 sub-frames (motion blur), so your code runs up to
  8× per frame during pans: keep it fast.
- `world.mjs` — `view()` (the V object: `V.X(wx)`, `V.Y(wy)`, `V.x0..x1`, `V.y0..y1`, `V.cx`), `tod(cx)`, `drawWater(c, V, t, x0, x1, surfaceY)`.
- `cute.mjs` — the kit: `blob` (volume-shaded union of polygons with outline), `flat`, `ell`, `tube`, `capsule`, `bez`,
  `eye`/`eyes`, `blinkAt(t, every, phase)`, `blush`, `smile`, `nose`, `shadow`, `sign(c, x, y, "LV n", style)` (styles: wood,
  stone, plate, bubble, neon, buoy), `tag`, `panel`, `RAMP`, `C`, `sm`, `ease`, `win`, `lerp`, `rnd`, `fade`, `mix`, `bayer`,
  `MAIN`/`TINY` fonts. `shade.mjs` is the shading engine behind `blob`.
- `levels/meadow-kit.mjs` — `spriteCache`, `xform`, `Layer`, `flower`, `stem`, `tuft`, `clover`, `leafBall`, `paintHills`,
  `grassAt`, `grade`, `gradeView`, `osc`, `cyc` (meadow helpers from the earlier films).
- Finished art you may reuse: `levels/bee-art.mjs` (`drawBee`, `miniBee` — our honeybee), `levels/hummingbird-art.mjs`
  (`drawHummingbird` with `LOOKS`), `hero.mjs` (`drawHero(c, x, y, {pose, phase, facing, look, blink, a, scale, mouth, brows})`:
  the channel's human hero, coral puffer + purple bobble hat). Reference level code (read, copy what helps; never import):
  `levels/ref/weight-meadow.mjs.txt` (the bee meadow with the beehive), `levels/ref/weight-cuba.mjs.txt` (the hummingbird
  level), and all of `../../animals-heart/film/levels/*.mjs` (ocean, snow, lagoon, savanna, roofs, meadow, barn, gorge, wall).
- `levels/meter.mjs` — the lead's screen HUD (top band y 96–196, tags y 200–270). Keep your own text and key action below y 270.

## Module interface (your file `levels/<biome>.mjs`, replacing the STUB)
```js
export const RANGE = BIOME.<biome>;
export function fill(c, V, t) {}    // optional: water bodies (drawn before the sky disc)
export function back(c, V, t) {}    // terrain, far/mid background (in front of the sky disc)
export function actors(c, V, t) {}  // your animal, props, the in-world "LV n" sign
export function front(c, V, t) {}   // foreground (grass blades, stones, reeds) that overlaps actors, down to the bottom edge
export function hud(c, V, t) {}     // optional small screen-space extras near your animal (not the number — the meter has it)
```
screen = (270 + wx − cx, 480 + wy − cy); use `V.X/V.Y` and round. z = 1 (no zoom). Return early when your range is off screen
(`V.x1 < RANGE[0] − 140 || V.x0 > RANGE[1] + 140`).

## Wings (the core of the film — follow exactly)
- Your animal's wing position comes ONLY from `wingPhase(who, t)` (beats; one beat = one full up-and-down stroke) and
  `strokeAmt(who, t)` (0 = wings held still / gliding … 1 = full stroke). Elevation of the wing: `e = cos(2π·wingPhase)·amt`
  (+1 = top of the stroke, −1 = bottom). The lead's click sound sits at the middle of each downstroke, so the picture and the
  sound always agree. Never use your own clock for wings.
- Rates under ~12/s (albatross 2.5, pigeon 6, butterfly 10): draw the real wing positions, smoothly, each frame.
- Rates of 20/s and more cannot be seen at 30 fps: draw a **motion-blur fan** — the swept area as a dithered, translucent
  sheet, brighter at the two turning points, plus one faint "ghost" wing that drifts (like `levels/bee-art.mjs` and
  `levels/hummingbird-art.mjs` already do). The damselfly at 20/s sits on the border: a strong blur with two visible ghosts.
- The animal hovers in front of the sky disc: body centre near screen (270, 380) at the rest camera, head near the disc
  centre (270, 360) — the disc frames the head like the reference moon. A gentle hover bob of 1–3 px, a blink every few seconds
  (`blinkAt`), a little head tilt: alive whenever on screen. Every slow cycle must be periodic over the film: use
  `Math.sin(2π·n·t / END)` with whole n, or `wingPhase`.
- Size: the animal (wings spread) should fill roughly 200–420 px across. Illustrations, not to scale (a midge as big as an
  albatross is fine — say nothing on screen about scale).

## Rules
1. **Nothing changes in one frame.** Every appearance, disappearance and state change is continuous (dissolve with
   `fade(c, a)`, eased motion, multi-frame blinks).
2. **Composition.** Ground / water line at y = LAND (screen y 640 at the rest camera) at both range edges; your terrain may
   rise or fall inside the range. Captions live at screen y 640–790 over a soft shade: no key action there. **The picture
   must reach the bottom edge**: ground, water, foreground plants continue to y 960, bigger and more detailed near the bottom
   (no black bands, no empty flat floor). No key action at x > 470 for y 450–760 (TikTok/Instagram buttons).
3. **Seams with neighbours**: terrain is yours only inside RANGE; decor may overlap a neighbour by ≤ 40 px. During the
   camera hops (≈ 0.5 s) and the long rewind / return pans, neighbours are seen side by side: make edges blend (same ground
   height LAND at the edges, compatible colours).
4. **In-world sign**: one `sign(...)` per level with "LV n", standing or floating near the animal, visible whenever the level is
   on screen (inside the lower-left or lower-right part of the scene, above y 600).
5. **Pure functions of t**: no Math.random, no wall clock; `rnd(seed)`; times only from `EV` / `LV` / timeline values.
6. **Speed**: ≤ 30 ms per frame for your module when visible (it can run 8× per frame during pans). Cache static layers:
   draw them once into an offscreen `Canvas` (raster.mjs) or `spriteCache`, then copy rows into `c.d` with clipping. Never
   redraw thousands of primitives or loop `c.px` over the whole screen every frame.
7. **Only edit your own files**: `levels/<biome>.mjs`, helpers `levels/<biome>-*.mjs`, tests `dev/<biome>-*.mjs`. Never edit
   `render.mjs`, `timeline.mjs`, `world.mjs`, `cute.mjs`, `levels/meter.mjs`, `levels/bee-art.mjs`,
   `levels/hummingbird-art.mjs`, `levels/meadow-kit.mjs`, `hero.mjs` or other builders' files. If you need a change in a shared
   file, copy it into your own helper file (e.g. `levels/tropic-hummingbird.mjs`) and change the copy; say so in your report.
   Other builders work in this folder at the same time; their levels may still be STUBs.
8. **Sound**: the wing sound is the lead's — do not add wing sounds. If your level has another clearly visible event (a
   splash, a take-off from a ledge, a door), export `MOTIONS = [{ t0, t1, kind, note }]` from `levels/<biome>-motions.mjs`,
   computed from the same constants as the picture (kinds: whoosh, splash, pop, flutter, tick, chime, rise, fall, step, tap,
   creak, wind). Zero to three per level.
9. No network, no paid APIs, no TTS, no `--video` renders, no ffmpeg (the render slot is shared). Stills and sheets are fine.

## Checking your work
Render stills at your level's key times (below) and a contact sheet; **look at them** (Read the images) and iterate until the
animal is cute and polished, the biome is rich and readable, the wings move as specified, and the transitions into the
neighbours look good. Also check two frames 1/30 s apart to see the wings move. Time one frame (`node -e` importing `frame`
from render.mjs, or time your module directly). In the report: files, what is on screen when, times worth checking, frame
timing, known issues, anything you need from the lead.

## When each biome is on screen (s) — the camera is at rest on the animal while it is "on air" (`LV`)
| Biome | On screen | Animal on air (LV) | Story beats |
|---|---|---|---|
| ocean | 10.0–20.2 | albatross 11.1–18.0 | arrives at the end of the rewind; "mostly glides" 12.3 (wings held out, gentle banking over swells); "flaps" 13.5 → flapping 2.5/s; "you could count every beat" 16.4 |
| city | 9.8–22.0 | pigeon 18.0–20.4 | morning; pigeon flapping 6/s in front of the disc above a rooftop / plaza |
| garden | 18.1–27.6 | butterfly 20.4–22.2 | day; flower garden; butterfly ~10/s (from the front its wings clap up and down) |
| pond | 20.6–35.1 | damselfly 22.2–29.5 | pond with reeds and lily pads; damselfly 20/s; a slow pan to the tropic starts at 27.0 while the clicks "blur into one sound" |
| tropic | 22.4–37.3 | hummingbird 29.5–35.3 | Anna's hummingbird at a red tubular flower; "that low hum gave the bird its name" 33.1–35.3 |
| leaf | 29.1–41.0 | ladybug 35.3–37.5 | big garden leaves; seven-spot ladybug flying, red wing cases lifted, hind wings blurred |
| clover | 0–9.2, 35.4–43.5, 58.5–59.8 | bumblebee 37.5–41.3 | clover / lavender; fuzzy bumblebee 150/s; "a deep buzz" 40.1 |
| hive | 0–8.9, 37.7–49.6, 57.6–59.8 | honeybee 0–7.9, 41.3–43.7, 58.6–59.8 | **the first frame**: golden-hour meadow with a beehive; honeybee 230/s; must be gorgeous and moving at t = 0 |
| porch | 0–8.2, 41.4–59.8 | mosquito 43.7–49.6 | dusk porch with warm window light; mosquito 500/s; "the whine in your ear" 46.3; "on a warm night it gets even higher" 47.6–48.7 |
| marsh | 43.9–57.6 | midge 49.6–55.3 | late dusk under the moon; "a tiny midge" 50.0, ~1000/s; stays on screen through the outro lines until the camera pans back at 56.4 |
