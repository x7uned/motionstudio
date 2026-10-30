# Effort experiment 2026-10-25 · «Pumpkin face» · 10 s pixel film

This is an **experiment**. Three chat sessions build the same 10-second film from the same brief and the same voice, each at a different reasoning effort (medium, high, xhigh). The user compares the quality of the final MP4 and the cost. The film is **not** a studio project and is not for publishing:
- no `npm run studio`, no data/projects, no templates;
- no cover, no description, no approval.

Communicate with the user in Russian. Work **alone**:
- no subagents (Agent tool) and no other sessions: their tokens would not be counted;
- do not read the other effort folders (`../medium`, `../high`, `../xhigh`) — they are your competitors' work.

## Inputs (read-only, shared)
- `common/narration.txt` — the text.
- `common/voice/voice-raw.wav` — one ElevenLabs take, Dennis · Eleven v4 [thoughtful], 48 kHz mono, 7.68 s. Do not re-voice it.
- `common/voice/words.json` — word timings. First word «Two» at 0.16 s, last word «pumpkin.» ends at 7.76 s.

Text: *Two holes and a line, and your brain sees a face. In a sixth of a second, the area that reads faces lights up for this pumpkin.*

Fact behind it: face-like objects activate the face area of the brain (ventral fusiform cortex) at about 165 ms, at a time and place similar to real faces (Hadjikhani et al., NeuroReport 2009). Show it as an illustration, not a brain-scan replica.

## The film
- **Length exactly 10.0 s** (300 frames, 30 fps), 1080×1920 (540×960 grid ×2, nearest).
- Put the voice at **t = 0.30 s**: word time = words.json time + 0.30.
- After the last word there are ~1.9 s for the payoff.
- **What it should make the viewer feel:** a Halloween night; a carved pumpkin's two holes and a line become a face the instant the brain «decides» it is a face. The idea «in a sixth of a second the face area lights up» must be visible on its words.
- Hero object visible and already moving within 0.5 s (strong-hook rule).
- Ending: optional loop. Never a «Follow …» outro.

## Style and rules (read these first)
- `docs/pixel-film.md` — the pixel-film style.
- `work/pixel-lab/shared/BRIEF-COMMON.md` — **Style** and **Layout rules**: safe zones, captions row, no text within 35 px of the sides.
- `video-design/MOTION-RULES.md` and AGENTS.md: nothing appears, leaves or changes in one frame; use dithered dissolves and eased motion.
- Halloween look: section «Хэллоуин-дизайн» in `work/pixel-lab/IDEAS-HALLOWEEN-2026-10-25.md`:
  - night purple sky, pumpkin-orange light, moon, dithered fog;
  - orange karaoke highlight;
  - 8-bit spooky bed in A minor.
- Pixel components: `renderer/pixel/raster.mjs` (Canvas, fonts MAIN/TINY, `fade`, `bayer`).

### Reference harness
A finished Halloween-season pixel film: `work/pixel-lab/zombie-mouse/film/`. Read its:
- `render.mjs` (karaoke captions, caption shade, dissolves),
- `timeline.mjs`/`layout.mjs`,
- `synth.mjs` + `mix.mjs` (voice −16 LUFS, bed under the voice, every 8-bit sound lasts exactly its motion),
- `qa.mjs`, `build.sh`.

Copy what you need into your own folder. **Never edit other films' folders.** The film being made right now in `work/pixel-lab/ant-zombie/` is someone else's live work: do not read or touch it.

## Where to work
Only `work/pixel-lab/effort-exp-2026-10-25/<your-effort>/film/` (your effort is in your task message).
- Final master: `pumpkin-face-<effort>.mp4`; phone copy ≤ 30 MiB: `pumpkin-face-<effort>-phone.mp4` (the master may already be small enough — then copy it).
- `README.md` (Russian): what is on screen when, the sound, QA results, known issues, and what you did not check.

## Rendering and checks
- Stills and contact sheets: any time.
- **Heavy steps** (`render.mjs --video`, synth/mix/encode, QA of the MP4): only in one turn of the shared render slot:
  ```
  ../../../render-lock.sh pumpkin-<effort> ./build.sh
  ```
  Run it from your `film/` folder; other sessions render in the same slot.
- Before you finish:
  - QA from the final MP4: frame count 300, no one-frame pops, loudness −16 LUFS / true peak ≤ −1 dBTP;
  - a contact sheet `qa/sheet.jpg` of the final MP4 that you actually looked at;
  - a safe-zone overlay of two key frames (`node scripts/safe-zones-overlay.mjs <frame> <out>`);
  - if you can, play the master once in the built-in browser.

  Do not call static frames a playback test.
- No network, no paid APIs, no TTS, no Scribe, no Tavily, no Apify. No `npm run studio`.

## Done
The master and phone MP4, `README.md` and `qa/` are in your folder. Your last message (Russian) gives:
- file paths;
- what you built;
- QA numbers;
- known issues.

The lead session collects cost and time from your transcript; you do not need to estimate them.
