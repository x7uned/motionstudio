# Brief for kit builders · dog series (pixel films, Kagenami, 2026-10-23)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/dogs/kit` (paths below are relative to it).

## The series
Three short vertical pixel films (540×960 grid, ×2 nearest → 1080×1920, 30 fps, English narration, no overlay: the
picture reaches every edge, karaoke captions sit at screen y ≈ 640–790 over a soft shade). The SAME dog, the SAME owner
and the SAME sunny park appear in all three, so everything you build is a reusable kit:
1. **«Is my dog blind?»** (being made now). The owner throws a RED ball; it lands in the green grass; the dog runs past
   it, stops, looks around, sniffs, walks around it and can't find it. Then: dogs see only blue and yellow, so red looks
   like the grass (the film re-colours the whole frame in «dog vision»); the ball is easy to follow while it flies, lost
   once it stops; dogs see less detail; so the dog uses its nose, follows the scent and finds the ball. The fix: blue
   or yellow balls are easy to spot. Ending: the dog brings the red ball back, the owner throws it again (loop).
2. **«Why is a dog's nose wet?»** (next; close-ups of the nose, licking the nose, sniffing).
3. **«Why do dogs spin before lying down?»** (later; circling and curling up to sleep).

## Style (match the user's earlier films)
«Пиксель-фильм»: fine pixels, volume shading in flat tone bands with Bayer dithering, dark 1-px outlines, warm and
cute, chibi proportions, polished, readable on a phone. Look at these first (Read the images):
- `../../animals/film/dev/yard-sheet.jpg` — **our dog is this black-and-white border collie** (amber eyes with two
  highlights, pink dithered blush, white blaze and bib, semi-perked ears with folded tips, red collar with a gold tag).
  Its front-view code: `drawDog` in `../../animals/film/levels/yard.mjs` (lines ~209–275).
- `../../dog/film/` frames (`../../dog/film/cover.png`) — an earlier side-view dog in a sunset scene (older, less cute).
- `../../cat-eyes/film/qa/contact-sheet.jpg` — current quality bar, the owner's mitten.
- `../../cat-zoomies/film/BRIEF.md` + `../../cat-zoomies/film/cat-rig.mjs` — another session is building a side-view
  cat rig with gaits in the same way right now; read for ideas, do NOT edit those files.
Code to read and reuse:
- `../../../../renderer/pixel/raster.mjs` — `Canvas` (`px rect rrect frame line poly disc ring ellipse ering dither tint
  text measure get`), `bayer`, `mix`, `fade(c, a)` (dissolve view), fonts `MAIN` (5×7) / `TINY` (3×5).
- `../../animals/film/cute.mjs` — the cute kit: `blob` (volume-shaded union of polygons + outline, built on
  `../../dog/shade.mjs` `drawPart`), `flat`, `ell`, `capsule`, `tube`, `bez`, `eye`, `blinkAt`, `blush`, `smile`, `nose`,
  `shadow`, `RAMP`, `C`. Import from it; don't copy it.
- `../../animals/film/hero.mjs` — the recurring human hero (coral puffer, purple bobble hat, blue scarf, yellow mittens).
- `layout.mjs` (this folder) — **shared conventions: use them, never your own numbers**: `LAYOUT`, `CAMS`, `layer(cam, p)`
  / `ground(cam)` (world → screen), `sm ease lerp win clamp01 rnd`, `gate(c, lo, hi)` (complementary dither gates for
  crossfades).

## Coordinates and scale
- Camera `cam = {cx, cy, z}`. Actors' plane: `G = ground(cam)`; screen = `(G.X(wx), G.Y(wy))`, `G.z` = pixels per world
  unit. Draw every part from world units through `G` (or a local frame scaled by `G.z`) so it stays crisp at every zoom
  from z = 0.7 (wide) to z = 4 (face / nose close-up).
- Lawn line `wy = 0`; up is negative. Sizes: **owner ≈ 150 units** tall to the top of the bobble (hero.mjs at scale 1);
  **dog** standing side view: nose → rump ≈ 112, back ≈ −52, head top ≈ −92, ball radius 7.
- The hook camera `CAMS.hook` = `{cx: −60, cy: −120, z: 1}`: the lawn line is at screen y ≈ 640, the owner (x −230) at
  screen x ≈ 100, the ball's resting spot (x 60) at screen x ≈ 390.

## Rules for every module
1. **Pure functions.** Each draw call depends only on its arguments (and `t` if given). No `Math.random` (use `rnd`), no
   globals that change, no timeline knowledge: the director (render.mjs, written by the lead) decides poses and times.
2. **Nothing changes in one frame.** Cycles are continuous in their phase (p and p+1 look identical). Every option that
   makes something appear (mouth open, tongue, a held ball) is a continuous 0..1 parameter or is crossfaded by the lead
   with `gate`; so just draw through the canvas you are given (it may be a gate/fade view).
3. **Speed.** ≤ 25 ms per actor at z ≤ 2 on an M-series Mac; cache what is static.
4. **Only edit your own files** (named in your task) plus test scripts `dev/<yours>-*.mjs`. Do not edit `layout.mjs` or
   other agents' files (others work at the same time). If you need a change there, say so in your report.
5. No network, no paid APIs, no TTS, no video renders.

## Checking your work
Write `dev/<yours>-sheet.mjs` that draws your module in a grid of labelled cells (every pose / several phases / at least
z = 1 and z = 3), on the park lawn colour or a plain background, and saves `dev/<yours>-sheet.png` at ×2 (`sharp`, raw
RGB from `c.d`, nearest ×2 like `toFull` in `../../animals/film/render.mjs`). **Read the PNG and iterate** until it is
cute, polished and clearly readable — silhouettes first, then shading. Also time a draw call. In your final report: files,
the exported API with every parameter, what each pose looks like, anchors returned, known issues.
