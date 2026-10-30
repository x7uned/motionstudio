# Brief for module builders · «Why your cat sleeps all day and goes crazy at 3 a.m.» (pixel film, Kagenami)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/cat-zoomies/film` (paths below are relative to it).

## The film
A ~57 s vertical pixel film (540×960 grid, ×2 nearest → 1080×1920, 30 fps) that loops. English narration, one take
(`narration.txt`). The user's own idea for the opening: **at night a cat races through the apartment, runs into the
legs of its owner, who is walking to the kitchen, and knocks him over.** Then: why cats sleep all day (≈15 h, light
sleep, ears turning to sounds), why they are built for short sprints (wild cats catch ≈10 mice a day: long wait, short
sprint, rest to save energy), mice come out at dusk and dawn, a bowl means no hunt, so the saved energy explodes at
night — the zoomies (vets: FRAPs). The fix: play with a wand toy before bed until the cat is tired, then feed it —
hunt, eat, wash, sleep. Then it loops back to the knock-over.

ONE persistent world: a side-view cross-section of one apartment — bedroom (left), living room (middle), kitchen
corner (right). The camera pans and zooms through it (z from about 0.8 for the whole living room to about 5 for an ear
close-up). Time of day changes through the window (day → golden → dusk → night → evening lamp light).

## Style (match the user's earlier films)
«Пиксель-фильм»: fine pixels, volume shading in flat tone bands with Bayer dithering, dark 1-px outlines, warm and
cute, polished, readable on a phone. Look at these first (Read the images):
- `../../cat-drink/film/contact-sheet.jpg` — the night kitchen and the orange tabby side view (our cat comes from there);
- `../../cat-eyes/film/qa/contact-sheet.jpg` — the cute black cat, mitten hero, UI tags;
- `../../touch/film/stills/*.png` and `../../plane/film/stills/*.png` — the recurring human hero (coral puffer, purple
  bobble hat). In THIS film he is at home at night: pyjamas, and the same purple bobble hat as a night cap.
Code to read and reuse:
- `../../../../renderer/pixel/raster.mjs` — `Canvas` (`px rect rrect frame line poly disc ring ellipse ering dither
  tint text measure get`), `bayer`, `mix`, `fade(c, a)` (dissolve view), fonts `MAIN` (5×7) / `TINY` (3×5).
- `../../dog/shade.mjs` — the volume-shading engine: `smooth(pts, sharpSet, seg)` (Catmull-Rom outline) and
  `drawPart(g, polys, {ramp, base, gain, slope, thick, light, outline, litOutline})`. Everything organic is drawn
  through it, in world units scaled by the camera, so it stays crisp at every zoom.
- `../../cat-drink/film/cat.mjs` — the tabby (palette `CAT`, `CREAM`, `PINK`, part polygons, stripes, whiskers).
- `../../cat-drink/film/kitchen.mjs` — per-pixel wall/floor drawing, window with the night outside, parallax layers.
- `../../animals/film/cute.mjs` — `ell`, `capsule`, `tube`, `bez`, cute `eye` (big glossy eye, two highlights).
- `../../touch/film/hero.mjs` — the human hero's palettes (`HAT`, `SKIN`, …) and side-view construction.
- `layout.mjs` (this folder) — **shared conventions: use them, never your own numbers**: `FLOOR = 0`, `CEIL = -430`,
  `LAYOUT` (bed, sofa, window, curtain, clock, bowl, counter, fridge, door…), `layer(cam, p)` / `ground(cam)`
  (world → screen), `sm ease lerp win clamp01 rnd`, `gate(c, lo, hi)` (complementary dither gates for crossfades).

## Coordinates and scale
- Camera `cam = {cx, cy, z}`. Actors' plane: `G = ground(cam)`; screen = `(G.X(wx), G.Y(wy))`, `G.z` = pixels per
  world unit. Draw every part from world units through `G` (or your own local frame scaled by `G.z`).
- Floor `wy = 0`; up is negative. Sizes: **person standing ≈ 250 units** tall (top of the bobble hat); **cat**: nose →
  rump ≈ 72, shoulder ≈ 34, sitting head top ≈ −62. Bed mattress top −80, blanket top −96, sofa seat −62, ceiling −430.
- Typical cameras: hook/walk `{cx: -40, cy: -80, z: 1.05}`; whole living room `{cx: 0, cy: -120, z: 0.85}`;
  sleeping-cat close-up `{z: 3.5}`; ear `{z: 5}`; bowl `{cx: 372, cy: -40, z: 2.2}`; bedroom `{cx: -560, cy: -90, z: 1.1}`.
- Captions sit at screen y ≈ 640–790 (soft shade). The picture must reach every edge: no black bands, no vignettes.

## Rules for every module
1. **Pure functions.** Each draw call depends only on its arguments (and `t` if given). No `Math.random` (use `rnd`),
   no globals that change, no timeline knowledge: the director (render.mjs, written by the lead) decides poses and times.
2. **Nothing changes in one frame.** Cycles are continuous in their phase `p` (p and p+1 look identical). Every option
   that makes something appear (eyes open, a prop) is a continuous 0..1 parameter. Pose switches are done by the lead
   with crossfades (`gate`), so every pose must accept an `alpha`/gate canvas (just draw through the `g` you are given).
3. **Speed.** ≤ 25 ms for one actor at z ≤ 2 on an M-series Mac; cache what is static.
4. **Only edit your own files** (named in your task) plus test scripts `dev/<yours>-*.mjs`. Do not edit `layout.mjs`,
   `render.mjs`, `timeline.mjs` or other agents' files (others work at the same time). If you need a change there, say so.
5. No network, no paid APIs, no TTS, no video renders.

## Checking your work
Write `dev/<yours>-sheet.mjs` that draws your module on a plain dark-purple background in a grid of labelled cells
(every pose / several phases / at least z = 1 and z = 3.5) and saves `dev/<yours>-sheet.png` at ×2 (use `sharp`, as in
`../../cat-eyes/film/render.mjs` `toFull`). **Read the PNG and iterate** until it is cute, polished and clearly readable
— silhouettes first, then shading. Also time a draw call. In your final report: files, the exported API with every
parameter, what each pose looks like, anchors returned, known issues.
