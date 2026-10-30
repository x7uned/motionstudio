# BRIEF v2: mario-real — Mario as a game sprite, camera pulled back

The user's verdict on v1 (`mario-real/film`, 2026-10-29): the scene is fine, but Mario is drawn badly. He was built from circles, gradients and smooth shading («из кругов… получаются уебищно»). He is also too big: about 40% of the frame height.

What the user wants:
1. **Redraw Mario as a pixel sprite, the way the game draws him.** The target look is the user's reference `mario-real/ref/user-sprite-ref-2026-10-29.png`. It shows NES Mario poses (idle, run ×3, skid, jump, win, lose) as chunky square pixels in a few flat colours. Quote: «не обязательно делать так, как на картинке, просто типа пиксельным». The city stays detailed 32-bit pixel art. The contrast (a game sprite in a rich real city) is the joke.
2. **Pull the camera back a bit** («чуть отдалить», «чуть менее масштабно»).

Everything else in v1 stays: script, voice, timing, shot order, city, residents, numbers, sound, ending. This is a picture-only rework.

All rules of `BRIEF.md` (v1) and `BATCH-2026-10-26.md` still apply unless this file says otherwise:
- build alone, no subagents;
- use render-lock;
- QA from the final MP4;
- safe zones v1, no overlay;
- synthesized 8-bit sound;
- no catalog art.

## Folder and voice
- Build in a NEW folder `mario-real/film2/`. Copy the film-own code, assets, `audio/` and `voice/` from `mario-real/film/`. Do not copy the MP4s, `video-noaudio.mp4`, `stills/` or `qa/`. Leave `film/` untouched as history.
- **No new TTS.** `tts.py` must hit the cache. If it would call the API, stop and report. Captions and timings stay exactly as in v1.

## Mario sprite (the point of v2)
- New module `film2/assets/mario.mjs`. Replace the v1 drawing completely and keep nothing of the round drawing. Use the same catalog contract (`kind/covers/desc/hw/hh/start/states/base/st/linear/draw → {box, pt}`).
- **Sprite grid: big Mario is 16 × 32 sprite pixels.** The narration says «big Mario is two blocks tall», and a game block is 16 × 16.
- Draw it ourselves in the NES spirit. It does not have to match Nintendo's sprite pixel for pixel. No «M» or logo on the cap.
- **Palette:** 3–4 flat colours plus transparency, like the reference: red (cap, overalls in the NES scheme), olive-brown (hair, moustache, shirt, shoes), skin orange.
- **Pixels:** no outlines added around the sprite. No gradients, no dither inside the sprite, no anti-aliasing, no circles.
- **Drawing method:** pose frames are hand-made pixel grids, for example string arrays like `"..RRRRR.."`, rendered as filled squares. Never draw from ellipses or arcs.
- **Poses as sprite frames.** Use NES-style poses that fit the shot table:
  - idle
  - run (3 frames, game cadence)
  - skid
  - jump (arm up)
  - duck/crouch (before take-off)
  - win/proud (arm up, both feet down)
  - look-up (idle with eyes and head shifted 1 sprite px)
  - point (arm forward)
  - land (one squash frame, then idle)
- **Pose changes.** Switch poses through a 2–3 frame ordered-dither (Bayer) dissolve. Never use an alpha blur and never swap in a single frame (MOTION-RULES).
- **Run cycle.** The run cycle may step at the game's cadence: a frame change every 4–6 video frames, each through a 1–2 frame dither. Position, height and camera move smoothly.
- **Integer scale, nearest-neighbour.** Every sprite pixel is an exact square of N grid pixels (film grid 540×960), with the same N everywhere inside a shot.
  - Default N = 8: Mario is 256 grid px, about 27% of the frame height.
  - The single wide shot above the roof: N = 3, about 10%.
  - The «SUPERPOWER / knees» shot may go to N = 12–16. The legs become big readable blocks, which is fine.
  - Between shots with different N, cut on the action or dissolve with dither. Never use a non-integer zoom on the sprite.
- **The game world uses the same sprite.** The prologue level and every «game window» inset use the same Mario sprite, at the same or a smaller integer scale.
- Mario stays the most saturated object in the frame.
- The sprite casts a simple flat dark shadow on the pavement: 1–2 rows, dithered at the edge. It is not part of the sprite.

## Camera pulled back
- Target Mario height:
  - median about 22–30% of 1920 in the city;
  - minimum 10% (the single wide shot);
  - the knee close-up is the only shot above 40%.
- At N = 8 more of the city shows around him. Use that: more facade, the pavement, the planter, passers-by. Real adult scale is unchanged: Mario 1.55 m, adults 1.6–1.85 m.
- **The 11 m jump.** The camera still rides up the facade with Mario, framed wider, so two floors show at a time. The floor numbers, the tape and the residents' gags stay on their words.
- **Prologue.** The game world uses the same blocky look: 16×16-sprite-pixel blocks at N, our own flat-colour drawing of ground bricks, «?» blocks, pipes, bushes and clouds. Not World 1-1, not Nintendo tiles. Mario runs, bumps a «?» block and a coin pops out, then the portal on «bring», then the hard cut. Keep the hard cut at the same frame (≈5.97 s).
- **Number chips.** Do not shrink chips and labels when the camera pulls back; they are not world-scaled. Keep them at least at v1 size. The small ones («1.55 m», «3.9 m», «1 block ≈ 0.78 m») may grow up to ×1.5.

## Do not change
- the words, voice, timings or captions;
- the shot order or numbers;
- the city art, residents, portal art or sound design. Re-time sounds only if a motion moved.

## Deliverables and QA (in `film2/`)
Deliverables:
- `mario-real-pixel.mp4` master and a send copy ≤30 MiB;
- `cover.png`: same texts, the new sprite Mario mid-air above the roof at a large integer scale;
- `description.txt` and `facts.md` copied from v1;
- `credits.txt`;
- `README.md`: what changed from v1, QA numbers, a no-catalog statement, the new sprite and its poses;
- `dev/assets-new.png`: a sheet of every Mario sprite pose at N = 8 next to the user's reference.

QA from the final MP4:
- frames and duration (must equal v1: 1978 frames);
- pops scan: the portal hard cut at ≈5.97 s is the only allowed cut. Run-cycle and pose dither steps are expected small diffs; say how the scan treated them;
- loudness;
- a 30-frame `qa/contact-sheet.jpg`;
- safe zones on about 12 frames;
- real playback in the built-in browser if you can.

Also measure:
- Mario's height on the contact-sheet frames: min / median / max as % of 1920;
- whether every Mario pixel block is a clean integer square (zoom one frame per scale and check).

One draft sheet, one fix pass, one final sheet.

## Report back (≤250 words)
Paths, duration, TTS calls (must be 0), sprite grid and scales used, Mario size min/median/max, QA numbers, known issues.
