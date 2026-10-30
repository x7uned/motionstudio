# Catalog v1 · how to port an item (2026-10-26)

Catalog v1 is the free-trial catalog for the «10-second fact» format (`work/pixel-lab/trial-10s`): one Claude call writes a
validated JSON plan, a deterministic pixel renderer draws it. Here we port pixel art that is **already drawn** in the
channel's films into that contract. Nothing is approved; the user judges quality.

## Hard rules

- **Copy, never edit.** Copy code from film folders into `catalog-v1/items/` or `catalog-v1/items/lib/`. Never edit any
  film folder, `work/pixel-lab/trial-10s`, `renderer/pixel` or files outside `catalog-v1`. Never import from a film
  folder (it may change). `renderer/pixel/raster.mjs` may be imported (it is the shared library).
- Do not read `work/pixel-lab/ant-zombie` (in progress).
- Skip game IP and brands (Pac-Man, Mario, Minecraft, Tetris, Space Invaders, Duck Hunt, GTA look-alikes, logos) and the
  channel's own avatar sprite (`data/branding/xtuned-outro/v1/spritesheet.png`, «channel-hero/avatar/mascot»). The
  recurring film hero (coral puffer, purple bobble hat) is Kagenami identity too: do not use that outfit.
- No video renders, no TTS, no paid APIs. Stills only (`tools/sheet.mjs`). Do not commit.
- Do not change shared files (`contract.mjs`, `engine/`, `tools/`, `items/index.mjs`, existing `items/lib/*.mjs`). If an
  item needs a shared change, write it in your report instead. You may add new files in `items/lib/`.

## A prop item: `items/<kind>.mjs`

```js
export default {
  kind: "cat",                      // = the idea-registry name (catalog-sizing/coverage.json prop_registry), unique
  covers: ["cat"],                  // registry names this kind satisfies (exact names, used for topic coverage)
  source: "animals-heart/film/levels/cat-art.mjs#drawCat",
  desc: "black cat sitting front-on …",   // ≤ 20 words: what the director model reads in the prompt
  hw: 72, hh: 92,                   // half extents of the body (grid px) at size m, camera z 1 — the overlap check uses them
  start: "sits, breathes, tail sways",    // its idle motion at frame 0
  states: {                         // 2–6 states; the FIRST is the initial look. [D seconds to enter, "what it looks like", sound?]
    sit: [0.5, "sits calmly"],
    look: [0.45, "looks at its target prop", "blip"],
  },
  base: { look: 0 },                // continuous parameters
  st: { sit: { look: 0 }, look: { look: 1 } },   // per state: parameter targets (unlisted parameters keep their value)
  linear: [],                       // parameters eased linearly (sweeps, progress); others ease in-out
  slots: null, hud: false, value: false, text: false,   // see below
  demo: { target: true },           // sheet only: { target, label, value, unit, slot }
  notes: "quality issues you saw",
  draw(c, cx, cy, z, t, s) { …; return { box: { x0, y0, x1, y1 }, pt: [x, y], face?, faceBox? }; },
};
```

- `draw` is a **pure function of its arguments**. `(cx, cy)` = screen centre of the footprint, `z` = camera zoom × size
  (1 at size m, wide shot; up to ≈ 2.4). Pick a base scale so the body fills about `hw × hh` at z 1 (trial kinds use
  hw 66–118). `t` = film seconds (idle loops: `Math.sin`, `noise1`, never `Math.random` or the clock).
- `s.v` = current parameter values (the engine eases them, so a state change is never one frame). `s.acc(state, w0, w1)`
  = 0..1 progress of the latest key of that state — use `Math.sin(Math.PI * acc)` for one-off accents (wink, flash,
  bounce). `s.integ(f)` = ∫ f(params) dt for phases whose rate changes (spin speed, heartbeat). `s.look` = screen point
  of the target prop (even before it enters) or null, `s.lookK` = the target's presence 0..1 — **always blend the aim
  by `s.lookK`** (angle `lerpAng(rest, aim, s.lookK)`, look vector × `s.lookK`) so a target entering or leaving never
  re-aims the item in one frame. `s.x`, `s.slot` = the item's world x and slot (e.g. a side-view animal faces the centre). `s.label` (text items: 1–3 script words, uppercase), `s.value`/`s.unit` (value items),
  `s.a` = presence 0..1, `s.theme` = backdrop colours, `s.raw` = the undissolved canvas.
- `c` is a dissolve view of the frame while the item enters/exits: draw everything through `c.px` and the raster
  primitives (`rect line poly disc ellipse tint text …`) and it dissolves for free. Code that writes `c.d` directly
  (glows via `tintPx`) must scale its strength by `s.a`. `lib/roofs-kit.mjs` `Layer.blit` already writes through views.
- `hud: true` = a card in screen space at its slot (not moved by the camera). `value: true` = shows `s.value` (a number
  spoken in the script) and `s.unit`. `text: true` = shows `s.label`. `slots: ["left"]` restricts its slots.
- Return `box` (visible body, screen px) for labels/focus brackets, `pt` (where beams and looks aim). Optional `face`,
  `faceBox`.
- `sound` (3rd element of a state) is one of: pop blip rise ding glow swell dim whoosh swish sparkle zap fold wink creak
  appear flutter sonar whirr boo thump tick count scan lock carve fall thud. Each sound lasts exactly its transition.

## No one-frame change (user rule, video-design/MOTION-RULES.md)

Nothing visible may appear, vanish or swap in one frame. Typical film code that breaks it and must be fixed in the copy:
`if (k < 0.3) drawA() else drawB()` → crossfade A and B through `fade(c, 1 − w)` / `fade(c, w)` with `w` smooth over a
range; parts hidden at a threshold → clip them per pixel or dissolve them; accents switched on at full strength → ramp
them; cached sprites keyed by a continuous value → quantise finely (≈ 1 %). `tools/sheet.mjs` checks every frame.

## House style

Palette ramps (dark → light), a dark 1-px outline (`#0B0812`-ish), light from the upper left, flat tone bands with narrow
dithered seams (`band`/`ramp` in `engine/layout.mjs`, `blob` in `lib/cute.mjs`, `drawPart` in `lib/shade.mjs`), ordered
Bayer dithering, no anti-aliasing, no smooth gradients. Text only in the pixel fonts `MAIN`/`TINY` of raster.mjs and only
from `s.label`/`s.value`. No logos or brand names. Keep the film's look; adapt only what the contract needs.

## A backdrop item: `items/<kind>.mjs` with `backdrop: true`

```js
export default { kind: "living-room", backdrop: true, covers: ["living-room"], source: "…", desc: "≤ 12 words",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#221B38", "#2E2548", "#1A1530"], beam: "#F7B04A" },
  draw(c, cam, t) { … },            // everything behind the props, full 540×960 frame
  front(c, cam, t, ctx) { … },      // optional: foreground over the props (lower edge)
  notes: "…" };
```

- Camera: `layer(cam, p)` from `engine/layout.mjs` gives the transform for depth `p` (1 = the prop plane, far wall
  0.6–0.9). The camera zooms 1–2.4 on any slot; the frame must stay filled (no black edges) for every camera the
  sheet tests. Static scenery may be painted once into a cached `Layer` (lib/roofs-kit) per depth and blitted, but the
  result must not depend on what was drawn before (pure).
- Props stand in slots centred at y 262–440 (x 140–372) with half heights up to ≈ 120: the floor line sits at about y
  540–580 at the wide shot. The caption row y 680–750 lies over the floor; the picture continues to the bottom edge
  (no black band). Keep the middle calm so props read; detail goes to the sides and the top. Nothing readable, no logos.
  `theme.accent` colours the karaoke words; `stone` the label plates.
- Backdrop time `t`: only slow ambient motion (dust, light flicker, a clock hand, curtains), smooth.
- Keep it ≤ 40 ms per frame.

## Examples already ported (read only the one closest to your item)

Character: `items/cat.mjs` (cute front-facing kit), `items/dog.mjs` (rig in lib/dogs-*), `items/person.mjs`. HUD card with
value/label: `items/chart-bar.mjs`. Effects/diagrams aimed at a target: `items/arrow.mjs`, `items/sound-wave.mjs`. Backdrops:
`items/living-room.mjs` (cat-zoomies apartment, lib/zoomies-*), `items/kitchen.mjs`, `items/studio.mjs`. Existing lib copies
may be reused as they are (e.g. lib/zoomies-apartment.mjs for another room of that apartment).

## Cost discipline

Cost is measured. Read sources with targeted ranges (`grep -n`, `sed -n a,bp`) instead of whole files when they are big,
never re-read a file you already have, batch small edits, and look at each sheet once per real change.

## Per item, in this order

1. Read its inventory entry (locations, states) and the source function with what it needs.
2. Copy the code into `items/lib/<film>-<name>.mjs` (header: `// catalog-v1 copy (2026-10-26) of <path>; changes: …`)
   or inline it, fixing import paths (`../../../../../renderer/pixel/raster.mjs` from `items/lib`,
   `../../../../renderer/pixel/raster.mjs` from `items`).
3. Write `items/<kind>.mjs`: map the film's poses/options to 2–6 named states the director can use on spoken words.
4. `node tools/sheet.mjs <kind>` → `sheets/<kind>.png` + `sheets/<kind>.json`. **Read the PNG and look at it.**
   `node tools/sheet.mjs --small <kind>` draws only the settled states at 1× (about a quarter of the image tokens); the
   frame-by-frame checks are the same.
5. Fix until the checks report `jumps 0 · pops 0 · pure true · footprint ok`. If a flag is a false positive, say why in
   `notes`. Quality issues you can see but not fix cheaply go into `notes`.
