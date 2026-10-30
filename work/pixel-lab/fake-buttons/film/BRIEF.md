# Brief · «You've been pressing fake buttons» (pixel film, Kagenami, 2026-10-24)

Folder: `/Users/rv/Desktop/Motion Studio/work/pixel-lab/fake-buttons/film` (paths below are relative to it).
**Read `../../shared/BRIEF-COMMON.md` first** (style, hero sprite, layout, rules, checking). Then `timeline.mjs`.

## The film
54.9 s vertical pixel film, one narration take (`narration.txt`, word timings `voice/words.json` — use `EV`):
> You've been pressing fake buttons your whole life. Start with the crosswalk button. In New York, computers took over the traffic lights, and most buttons were switched off. In 2004, more than 2,500 of the city's 3,250 buttons did nothing at all. The elevator's close button? In the US, for the first few seconds it can't do anything: by law, the doors stay open for people who move slowly. It's really there for firefighters, who use it with a special key. The thermostat in your office? In one poll of heating technicians, 51 out of 70 said they had installed fake ones. People turn the dial, feel better, and stop complaining. Even your phone's camera click is fake. There's no shutter inside, no moving part. It's a recorded sound. So why keep them? Pressing something makes you feel in control, and that feels good. The button doesn't change the light. It changes how you feel. Liked this video? Send it to a friend, and follow so you don't miss the next one.

Tone: playful, a little mischievous ("caught you!"), clear. Late-afternoon golden light (sky tod 4.3 is drawn by the harness; the low sun disc at screen (120, 250) sits behind the skyline at the corner).

## The world (one side-view world, z = 1; see `timeline.mjs` for every constant)
- **The corner (x < `BLD.x0` = −90).** Front sidewalk, top at `LAND` = 0 (the hero's feet; screen y 640 at the street keys). Behind the hero: the road (`ROAD` −40 … −80, cars drive left/right, seen from the side like a platformer street) with a **zebra crossing** across it (`ZEBRA` x −560 … −400), the far sidewalk (`BACKWALK` −84), and the far side's **pedestrian signal head** facing us (`PED_SIGNAL`: red raised hand = DON'T WALK, white walking man = WALK, US style) on its pole, then New York-style buildings, a water tower, fire escapes, a skyline. On the front sidewalk: the **crosswalk push-button box on its pole** right of the hero (`BUTTON`: the round button is exactly at (BUTTON.x, BUTTON.y), the pole at `BUTTON.pole`; a small sign "PUSH BUTTON FOR WALK SIGNAL" in pixel text, a little arrow), and the grey **signal controller cabinet** (`CABINET.x`): a metal box with a tiny screen — the computer that really runs the lights (`walkAt(t)`; show a clock/countdown "AUTO 0:12 → 0:00" that hits zero exactly when the WALK light comes on). Below the sidewalk to the bottom edge: the sidewalk's front half, street furniture (hydrant, newspaper box, bike rack), the kerb and a slice of the avenue's near lane at the very bottom (cars pass now and then, foreground parallax ~1.15).
- **The office building (x ≥ −90, to 620).** Cut open like a dollhouse (front wall removed; we see inside). Ground floor = **lobby** at street level (floor y 0 … ceiling ≈ −270): glass entrance on its left facade (x −90 … −60), marble floor, reception desk, plant, waiting bench, **elevator doors** on the right (`SHAFT` x 420 … 560) with a hall call panel and a floor indicator above. Floor 2 (`BLD.f2` = −300) = **the office**: desks, monitors, a plant, a window, a water cooler, ceiling lights, a ceiling duct with the **building computer box** ("AUTO 22°" screen) that really controls the air; the **thermostat** on the back wall at `THERMO` (a round dial with digits, generic). Floor 3 (−600) = an archive/meeting room (only seen partly). The elevator shaft runs through all floors (cut-away: rails, cables, counterweight, pit at the bottom). Below the lobby floor (y 0 … +320): the basement section (pipes, the elevator pit with buffers, a boiler) to the bottom edge.

## Who draws what
- **Builder STREET** — `levels/street.mjs` (+ `levels/street-*.mjs`, `levels/street-motions.mjs`): the backdrop over the whole world width (sky extras, skyline, NY buildings — also visible above/behind the office building), everything at x < −90 (road, zebra, far side, signal head, cars, a few pedestrians, front sidewalk, button box + pole, cabinet, foreground to the bottom edge), and **the channel's character** (`makeHero` from `levels/hero.mjs`, grade `golden`, feet at (`HERO_X`, `LAND`), facing right), his **phone prop**, and the **X-ray lens** for the crosswalk button.
- **Builder BUILDING** — `levels/building.mjs` (+ `levels/building-*.mjs`, `levels/building-motions.mjs`): the whole office building (x ≥ −90: facade edge, lobby, shaft, elevator car + doors + inside button panel, office, floor 3, roof, basement), its people (an office worker, an older man with a cane, a firefighter, a cold desk worker), the elevator ride, the thermostat and its X-ray, the building computer.
- **The lead** (not you): `levels/cards.mjs` (screen-space cards, top y 96–330) and `levels/cta.mjs` (share/follow card y 96–270 from `EV.liked − 0.12`), sound, mix, cover.

The two builders share only the timeline constants. STREET may draw the skyline behind the building; BUILDING draws everything of the building on top (its `back` runs after STREET's `back` because of the module order `[street, building]`).

## Beats (seconds from `EV`; the camera keys are in `CAM`)
**Corner, 0 – 14.8** (camera at the corner, cx −300, cy −160):
- 0.0 – 2.7 «You've been pressing fake buttons your whole life.» The hero presses the button again and again (`PRESSES` times): pose row 4 (point), his fingertip on the button; the button sinks 1–2 px and the box flashes a tiny "WAIT" lamp at each press. The signal stays DON'T WALK. Feel: impatient, comic.
- 2.7 – 3.9 «Start with the crosswalk button.» The box gets a pulsing outline (in-world highlight).
- 4.3 – 8.2 «In New York, computers took over the traffic lights, and most buttons were switched off.» On "computers" the cabinet's screen lights up (AUTO countdown); on "traffic lights" the signal switches to WALK **by itself** (`walkAt`, cars stop at the zebra, two pedestrians cross), then back. On "switched off": the **X-ray lens** opens over the box (a round magnifier, radius ~70–90, centre around screen (380, 470); keep it inside x 300–470, y 340–620): inside the box the button's wire is unplugged from the cabinet cable — a red ✕ and "OFF" tag. The lens closes by ≈ 14.6.
- 8.7 – 14.6 «In 2004, more than 2,500 of the city's 3,250 buttons did nothing at all.» The lead's NYC card is at the top. The hero: arms crossed (row 6), then surprised (row 7) on "nothing" (`EV.nothing`).

**Lobby, 14.8 – 25.9** (pan `PAN_TO_LOBBY` → cx 330):
- 15.4 – 16.9 «The elevator's close button?» The car is at the lobby, doors open; the office worker inside jabs the **CLOSE** button (◀|▶) again and again; it lights, nothing happens.
- 17.0 – 20.0 «In the US, for the first few seconds it can't do anything:» A door-timer arc above the doors fills slowly ("WAIT"); an X-ray lens over the car's panel shows the CLOSE wire going into a small timer chip with a clock that blocks it.
- 20.2 – 22.6 «by law, the doors stay open for people who move slowly.» An older man with a cane walks slowly from the lobby into the car (crosses the threshold by `EV.slowly`); then the timer completes and the doors close smoothly (≈ 22.6 – 23.3).
- 23.2 – 25.9 «It's really there for firefighters, who use it with a special key.» A firefighter (helmet, coat with reflective stripes) dissolves in at the lobby call panel and turns a key in its "FIRE" keyswitch (on "key"); the panel's CLOSE icon lights red. He dissolves away by `RIDE[0]`.
- 25.9 – 27.1 (`RIDE`) the car rises to floor 2 with the camera (counterweight goes down, cable moves, indicator 1 → 2).

**Office, 27.1 – 35.3** (cx 250, cy −460):
- 27.1 doors open; «The thermostat in your office?» The worker steps out and walks to the thermostat (≈ 1 s). A colleague at a desk shivers ("BRR" bubble).
- 28.0 – 32.4 «In one poll of heating technicians, 51 out of 70 said they had installed fake ones.» (The lead's poll card is at the top.) The worker turns the dial 22° → 19°. On "fake" (`EV.fake2`) an X-ray strip opens the wall behind the thermostat: its wire ends in a capped stub, red "NOT CONNECTED"; the building computer box on the duct keeps showing "AUTO 22°".
- 32.8 – 35.3 «People turn the dial, feel better, and stop complaining.» Both smile, little hearts; "BRR" turns into "♥"; a ringing desk phone (complaints) stops.

**Corner again, 35.3 – end** (`BACK_TO_CORNER`, a quick diagonal glide):
- 35.8 – 41.2 «Even your phone's camera click is fake. There's no shutter inside, no moving part. It's a recorded sound.» The hero (row 8, hands at the chest) lifts a phone and takes a photo of the street on "click" (`EV.click`): a white flash ramped over ~0.2 s, a "CLICK!" pop-text. (The lead's phone X-ray card is at the top.) On "recorded sound": he shrugs (row 3).
- 41.4 – 46.0 «So why keep them?» think (row 5). «Pressing something makes you feel in control, and that feels good.» He presses the button again (row 4) and smiles; a little glow/"+CONTROL" pickup; on "good" → excited (row 9).
- 46.3 – 49.1 «The button doesn't change the light.» He presses; the signal stays DON'T WALK… then, on its own timer, it turns WALK at `WALK_ON[1][0]` (cabinet countdown hits 0). «It changes how you feel.» → excited (row 9), a heart.
- 49.7 – end: the lead's share/follow card at the top. The hero waves (row 1, frames 0–3) on "Send it to a friend", then idle/happy. Pedestrians cross on WALK. Calm ending; keep the frame full.

## Lead's cards (keep y < 330 free of key action then)
NYC card `[EV.newYork − 0.1, EV.allEnd + 0.3]` · US law card `[EV.us − 0.1, EV.slowlyEnd + 0.2]` · poll card `[EV.poll − 0.1, EV.ones + 0.8]` · phone X-ray card `[EV.phones − 0.1, EV.soundEnd + 0.3]` · control card `[EV.pressing2 − 0.1, EV.liked − 0.2]` · share/follow `[EV.liked − 0.12, END]`.

## Checks to look at
STREET: `--stills 0.5,2,4.5,6.8,7.9,9,14.2,36.9,38,43,47.8,51` (+ in-between frames around presses and the WALK switch). BUILDING: `--stills 15.6,18,21.3,22.9,24.6,26.5,27.6,29,32,34`. Both: 14.8–16 and 35.3–36.2 (the pans), the frame must stay full at every camera position.
