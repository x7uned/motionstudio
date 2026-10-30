# Brief for builders · «GTA 6: the city behind you» (pixel film, Kagenami)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/gta/film` (all paths below are relative to it).

## What the film is
A 47.9 s vertical pixel film (540×960 grid ×2 → 1080×1920, 30 fps). One narration take (`narration.txt`; word timings in `voice/words.json`). It explains why a huge open-world game like GTA 6 runs on a console: the game only DRAWS what its camera can see. Narration:
> GTA 6 comes out this November, and its city looks almost real. So how can a PS5 run it without lag? Here's the trick: most of the city isn't there. Your console only draws what your camera can see. Turn around, and the street behind you is no longer drawn. A building hidden behind another building? Not drawn either. Far away, a tower is just a simple box. It gets its details only when you come close. And the people and cars? They appear in front of you and vanish behind you. A former Rockstar technical director said that in the old GTA games, cars were deleted as soon as they were out of sight. Rockstar has used tricks like this since GTA 3. Now GTA 6 has to do it for a whole state. So next time, turn around really fast. Liked this video? Send it to a friend, and follow so you don't miss the next one.

The whole film is ONE sunset street in a pixel "Vice City" (a sunny Florida-like resort city at golden hour — pastel art-deco hotels, neon signs, palm trees, a beach and the ocean far behind, a skyline of towers on the horizon), seen from the SIDE like a platformer. The channel's own pixel character stands on the front sidewalk at world x = HERO_X (screen x 270 at the resting camera). Above his head floats the GAME CAMERA: a small pixel video camera with a translucent view cone. Everything inside the cone is DRAWN (full pixel art); everything outside is NOT DRAWN: a dark navy blueprint — the same shapes as thin cyan/blue wireframe lines on a dark grid, like an empty game level. The cone turns with the narration ("Turn around…").

**One source of truth:** `timeline.mjs` → `drawnAt(wx, t)` (0 = not drawn/wireframe … 1 = drawn), `camDir(t)` (+1 looks right, −1 left; eased turns), `CULL_ON` (before it the whole street is drawn — the player's illusion; on "isn't there" the outside dissolves), `TURN1`, `TURN_BACK`, `TURN2`, `LAG` (on the final fast turn the city catches up late). Every module must use them — never invent its own visibility.

Tone: playful, game-like, crisp. This is not a real map, not real GTA 6 assets, not a real console design: an illustration in our own pixel style. No real car brands, no real people's faces. Logos are mine (overlays from Wikimedia Commons), don't draw any logo.

## Style
Our "Pixel film" style: 540×960 grid ×2 nearest, flat tone bands with Bayer dithering, a dark 1-px outline on characters and props, warm and readable at phone size; every appearance/disappearance is a dithered dissolve (`fade`), never a one-frame change. Earlier films to look at (copy code, never edit those folders): `../../animals-weight/film` (side-view world, stills in `stills/`), `../../minecraft/film` (game-world look), `../../ping/film` (a gaming film), `../../netflix/film` (pixel city/isometric). The night camp of `../../deadliest/film/levels/camp*.mjs` and the rooftop of `../../animals-speed/film/levels/city*.mjs` (made at the same time by other builders) draw the same channel character — you may copy their sprite loader/outline code if it exists.

## Files to read first
- `timeline.mjs` — `W()`, `EV`, `drawnAt`, `camDir`, `CULL_ON`, `TURN1`, `TURN_BACK`, `TURN2`, `LAG`, `HERO_X`, `CAM_ICON`, `LAND` (front sidewalk, the hero's feet), `ROAD` (road surface behind him), `BACKWALK` (far sidewalk before the buildings), `REST`, `CAM`, `END`, `DISC` (the sunset sun at screen 270, 360).
- `world.mjs` — `view()` (the V object), sky and sun are drawn by the harness (sunset, tod 4.7).
- `cute.mjs` — kit: `blob`, `flat`, `ell`, `tube`, `bez`, `eye`/`eyes`, `blinkAt`, `blush`, `smile`, `shadow`, `sign`, `pickup`, `tag`, `panel`, `RAMP`, `C`, `sm`, `ease`, `lerp`, `rnd`, `fade`, `mix`, `bayer`, `MAIN`/`TINY`.
- `render.mjs` — the harness: sky → disc → `back` → `actors` → `front` → `hud` → overlays (mine: radar, cards, share card) → caption shade → captions.
- `../../../../renderer/pixel/raster.mjs` — `Canvas` (`px rect rrect frame line poly disc ring ellipse ering dither tint text measure get blit`), `fade(c, a)`.

## Layout (screen, at the resting camera)
- My overlays: a GTA-style radar minimap at the top left (screen x 16–150, y 96–230) from ≈ 10.5 s; logo/quote cards at the top centre (y 96–330) at their words; the share/follow card (y 96–270) from ≈ 42.1 s to the end. Keep your important action out of y < 330 at those times (sky, skyline tops and the sun are fine).
- Captions: screen y ≈ 640–790 with a soft shade. The hero's feet are at y 640, so his body is above the captions. The picture must reach the bottom edge (front sidewalk / kerb / foreground to y 960; no black bands).
- TikTok buttons: avoid key action at x > 470 for y 450–750.
- The camera (`CAM`) drifts from cx 690 to 540 during the hook, then rests at cx 540; z = 1 always.

## Rules
1. Nothing changes in one frame: dissolves (`fade`), eased motion, crossfaded sprite frames.
2. Pure functions of t (no Math.random; `rnd(seed)`), only `EV`/`W()`/timeline times.
3. Speed ≤ 60 ms per frame for your module. Cache static layers (draw once into an offscreen `Canvas`, copy rows into `c.d`); the drawn/wireframe mix should be a per-column (or per-pixel with cached layers) choice between two cached images using `drawnAt` + `bayer`, not a redraw of every primitive each frame.
4. Only edit your own files (named in your task) plus helpers `levels/<yours>-*.mjs` and tests `dev/<yours>-*.mjs`. Never edit `render.mjs`, `timeline.mjs`, `world.mjs`, `cute.mjs`, or the other builder's files; if you need a change there, say so in the report.
5. No network, no paid APIs, no TTS, no `--video` renders, no ffmpeg encodes (the render slot is shared with other sessions).
6. Sound: export `MOTIONS = [{ t0, t1, kind, level, note }]` from `levels/<yours>-motions.mjs`, computed from the same constants as the picture (every 8-bit sound lasts exactly as long as its motion). Kinds: whoosh, swish, click, blip, pop, sparkle, chime, zap (drawing in), glitch, delete, engine (a passing car), horn, step, chatter, tilt, dissolve, alert, uhoh, slap, boing, rise, fall.

## Checking your work
`node render.mjs --stills 2,9.5,13,16.5` writes `stills/tX.XX.png`; `node sheet.mjs dev/<yours>-sheet.jpg 2,9.5,13,16.5 4` makes a contact sheet. **Look at them** (Read the images) and iterate until it is polished and every beat lands on its word. Time one frame (`node -e` importing `frame` from render.mjs). Report: files, what is on screen when, times worth checking, frame timing, known issues.
