# BRIEF · «Infinite aura» (full brainrot pixel film) · effect builders (2026-10-25)

A ≈ 38 s pixel film for a friend's new brainrot channel, in the style of our 5-second test `../../aura-stairs/film` (watch its stills `../../aura-stairs/film/stills/`). A guy in a hoodie climbs a floating marble staircase in the sky; every step lands on the beat of a phonk track; his aura grows; at every milestone the world gets **more absurd and cringe** (the user asked for it: «более кринжовое… голуби летают с лазерами с глаз… динозавры просыпаются… метеориты… взрывы… кринжи побольше»). Funny, loud, over the top, for kids/teens — not scary, no gore.

Voice (one take, already recorded; exact word times in `timeline.mjs` `EV`):
> Every step you take, your aura goes up. One hundred aura. The pigeons are watching you. One thousand aura. The pigeons have lasers now. Ten thousand aura. The dinosaurs wake up. Fifteen thousand. Meteors start falling. Twenty thousand. Everything explodes. You don't even look. Fifty thousand. The moon is staring at you. One hundred thousand. Aliens want your autograph. One million aura. Time stops. You don't. One billion. The planet is too small for you. Infinite aura. How much aura do you have? Be honest.

| time, s (EV) | what the world does |
|---|---|
| 2.64 `hundred` | a flock of pigeons flies in around him; 4.18–5.24 (`watching`) they all turn their heads and stare at him while flying/hovering |
| 5.58 `thousand` | their eyes glow red; on `lasers` (7.78) they fire red laser beams from their eyes (sweeping across the sky, cutting through clouds, sparks where they hit); they keep flying and lasering through the chaos until the time stop |
| 8.82 `ten` | the music DROPS (white flash, the lead draws it). 10.36 `dinosaurs` → 10.96 `wake` a huge T-rex head bursts up out of the cloud sea (bottom right), roars (jaw wide, shock rings); a long-necked brachiosaurus rises at the far left; they stay, bob, roar now and then |
| 11.70 `fifteen` | 13.10 `meteors`: flaming meteors streak across the sky (top right → bottom left), more and more; impacts on the cloud sea burst |
| 14.52 `twenty` | 15.66 `everything` 16.08 `explodes`: a chain of big pixel explosions everywhere (sea, islands, sky), fireballs, shock rings, debris; 17.06–17.82 "You don't even look." — he walks on, explosions behind him (the cool-guy shot) |
| 18.20 `fifty` | 19.48 `moon` 20.10 `staring`: the moon (top right, the lead draws the disc; its screen disc is `X.moon = {x, y, r}`) opens big cartoon eyes and stares at him, eyes following him; eyebrows; maybe a slow creepy-funny zoom |
| 21.12 `hundredK` | 22.64 `aliens` 23.36 `autograph`: two or three flying saucers swoop in (top left), one beams a light down next to him; a little green alien floats down in the beam holding a sign "AUTOGRAPH?" and a pen, waving it at him |
| 24.24 `million` | peak chaos — everything at once |
| 25.68 `time` | TIME STOPS: the lead draws a grey wave from him and the whole world freezes (world time τ = `X.T` stops). **Everything you draw must run on `X.T`** (never `X.t`), so lasers, meteors, explosions, roars, saucers freeze mid-motion. He keeps walking (he runs on `X.t`). 26.82 "You don't." |
| 27.62 `billion` | second drop, white flash → SPACE: stars, the Earth far below — tiny ("The planet is too small for you" 28.84–30.38), the staircase keeps going up into space |
| 30.72 `infinite` | "Infinite aura." — warp/galaxy burst behind him, everything white-gold; the counter becomes ∞ (the lead) |
| 31.82 `how` → END (≈ 38.27) | the end card: "How much aura do you have? Be honest." (captions are the lead's) + a list of the milestones with a "YOU" marker hopping between them |

## Integration (read `render.mjs`, it is the harness and already runs)
Each module exports any of these functions, each `(c, X)` drawing into the 540×960 `Canvas` c:
- `sky` — high in the sky, behind clouds and the sea (meteor streaks, the moon's face, far saucers);
- `sea` — on/just in front of the cloud sea, behind islands, mid clouds and the stairs (dinosaurs rising out of it, explosions on it, meteor impacts);
- `near` — in front of the stairs, behind the aura and him (pigeons, lasers, the UFO beam, the alien);
- `front` — in front of him (a few pigeons/lasers/debris crossing in front, sparingly);
- `hud` — on top of everything except captions (the end card only);
- `back` — **space only**: paint the whole frame for the space world; the lead dissolves it in (`X.space` 0 → 1) and stops drawing the sky world when `X.space` = 1.

`X = { t (film time), T (world time τ: freezes 25.68 → 27.62), cam, G (= ground(cam): world → screen of his plane), layer, L (aura level 0…10), col (aura colour hex), frozen (0..1 grey), space (0..1), cta (0..1 end card), EV, hero: { head, eye, top, hip, chest, footFront, footBack, bbox } (screen points), moon: { x, y, r } | null }`.
- Work in **screen coordinates** for sky things (the sky barely moves); attach pigeons/alien to `X.hero` anchors (he moves up-right on screen a little with each step; the camera follows him, zooms between 1.35 and 1.95).
- The lead applies the time-stop grey wave over everything drawn before him (sky, sea, near), so your colours go grey automatically; just freeze motion via `X.T`.
- Fade things in and out with `fade(c, a)` (dithered), never pop. Grow/rise/fly in continuously.
- Pure functions of the arguments: no `Math.random`, no wall clock; use `rnd(n)` from `layout.mjs`.

## Layout and safe zones (grid px; docs/safe-zones.md)
- His chest sits near (250, 400); head ≈ y 290–330; feet ≈ y 520; the staircase runs from bottom-left to top-right; the cloud sea fills y ≈ 650–960. **HUD (the lead):** y 150–250 centre (STEP, the number, AURA, the yellow "unlocked" line) — keep that band clear of your important stuff.
- Important things (faces, eyes, the T-rex head, the alien and sign, the moon's eyes) in x 35–440 (up to 505 above y 400), y 150–625. Below y 750 and x > 470 below y 400 = background only (big shapes may pass/extend there, nothing important). Caption row y 680–750 stays calm (no key action).
- Free sky areas: top-left above the stairs (x 20–220, y 250–450) and bottom-right below the stairs (x 300–530, y 430–650).

## Style
Same «Пиксель-фильм» look as the test: fine pixels, flat tone bands + Bayer dithering, dark 1-px outlines on creatures/objects, readable at phone size, bright saturated cartoon colours. Text only "AUTOGRAPH?" on the alien's sign (pixel font `MAIN` from raster.mjs) and the end card. No logos, no real people, no copyrighted characters.

## Files you may read / copy from (never edit them)
`render.mjs`, `timeline.mjs`, `layout.mjs`, `world.mjs`, `aura.mjs`, `guy.mjs` here; `../../../../renderer/pixel/raster.mjs` (Canvas: `px rect rrect frame rframe line poly disc ring ellipse ering dither tint text measure get blit`, `fade`, `mix`, `bayer`, fonts `MAIN` 5×7 / `TINY` 3×5, Latin + digits + `@_.,'!?-:/+%°·><*✓$`); `../../../../renderer/pixel/earth.mjs` (**pixel Earth v1 — use it for the Earth**, see `../../../../renderer/pixel/README.md`); `../../animals/film/cute.mjs` (cute creature kit: `blob`, `eye`, `blush`, `tube`…), `../../dog/shade.mjs` (`drawPart` volume shading), `../../minecraft/film` (voxel looks), `../../pacman/film` (sprite looks).

## Rules
1. Edit only your files (named in your task) plus helpers `<yours>-*.mjs` and tests `dev/<yours>-*.mjs`. Never edit `render.mjs`, `timeline.mjs`, `layout.mjs`, `world.mjs`, `aura.mjs`, `guy.mjs` or the other builder's files; if you need a change there, say so in your report.
2. No network, no paid APIs, no TTS, no `--video` renders, no ffmpeg encodes (shared render slot). Stills (`node render.mjs --stills 3,7.9,… <prefix>` — use your own prefix, e.g. `C-`) and contact sheets (`node sheet.mjs …` reads `stills/tX.XX.png` — or write your own sheet with your prefix) are fine.
3. ≤ 40 ms per frame for each of your modules (cache sprites/static layers).
4. Sound: export `MOTIONS = [{ t0, t1, kind, level, note }]` (film seconds, using EV and the same constants as the picture; kinds like `coo`, `laser`, `roar`, `stomp`, `whoosh`, `meteor`, `boom`, `ufo`, `beam`, `blip`) so the lead can place a few sound effects — the lead keeps sound minimal.
5. Look at your stills (Read the PNGs) like an art director, iterate until it is funny, readable and polished, check in-between frames for smoothness (no pops), then report: files, exports, what happens when, ms per frame, known issues.
