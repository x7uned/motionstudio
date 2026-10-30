# Mario jump research: does holding A make Mario fall slower? (SMB1, NES 1985, NTSC)

Researched 2026-10-24 for a ~55 s English pixel-art explainer.
Method: I read the code in doppelganger's commented SMB1 disassembly (SMBDIS.ASM) and re-ran its vertical-physics routine in a small simulation. I then compared the results with jdaster64's physics guide, TASVideos pages and the Nintendo/Iwata Asks interview.

**Bottom line for the hook:** "Mario falls slower while you hold the jump button" is **wrong**. Holding A lowers Mario's gravity **only while he is moving up**. From the top of the jump onward, the game ignores A and always uses the strong gravity. Letting go of A early switches to the strong gravity at once. It does not cut his upward speed.
Accurate short hooks:
- "Holding jump doesn't make Mario jump harder. It makes his gravity weaker, but only on the way up."
- "Let go of jump, and Mario's gravity gets more than three times stronger."

---

## Units used below

- The game runs at 60 frames per second (NTSC 60.0988 fps, the frame rate TASVideos lists for SMB1 runs). One block is 16 px.
- **Vertical speed** is a whole number of pixels per frame (`Player_Y_Speed`, a signed byte; negative means up) plus a fraction in 1/256 px (`Player_Y_MoveForce`).
- **Gravity** (`VerticalForce`) is added to that fraction every frame, so gravity is measured in **1/256 px per frame per frame**.
- **Horizontal speed** (`Player_X_Speed`) is in **1/16 px per frame**: the high nibble is pixels and the low nibble is sixteenths. The code that shows this is `MoveObjectHorizontally`. So 16 = 1.0 px/frame, 24 = 1.5 and 40 = 2.5.
- jdaster64 writes values as 5 hex digits: block, pixel, subpixel (1/16), sub-subpixel (1/256), and so on. In his notation "00200" = 2/16 px = 0.125 px, and "04000" = 4 px.

---

## Verified facts

### 1. When the light gravity is used: only while rising AND holding A
Every airborne jump frame, routine `JumpSwimSub` (SMBDIS.ASM line ~5922) does the following. This is my paraphrase of the code:

```
if Player_Y_Speed >= 0            ; not rising any more (apex or falling)
    VerticalForce = VerticalForceDown        ; strong gravity
else if A is held this frame AND was held last frame
    keep VerticalForce                        ; light gravity stays
else if Mario has risen less than DiffToHaltJump (=1 px) from the jump origin
    keep VerticalForce                        ; jump start
else
    VerticalForce = VerticalForceDown        ; button released while rising: strong gravity
```
Then `MovePlayerVertically` (line ~7586) runs `ImposeGravity` (line ~7704) with that `VerticalForce` and a maximum downward speed of 4.

- When Mario walks off a ledge (state "falling"), `FallingSub` (line ~5915) copies `VerticalForceDown` into `VerticalForce` without reading the A button at all.
- So **there is no code path where holding A slows a downward fall.** The A check only runs while `Player_Y_Speed` is negative, which means Mario is moving up.
- The first frame of every jump always uses light gravity. On that frame Mario has not yet risen 1 px from the origin. As a result even a 1-frame tap gets one light-gravity frame.
- Release cannot be undone. Once strong gravity has been copied into `VerticalForce`, nothing in the jump code puts the light value back. Pressing A again in mid-air also cannot start a new jump: `ProcJumping` allows a jump only from the ground, or while swimming. So re-pressing A does not bring back the light gravity.
- Sources:
  - Disassembly (gist, primary): https://gist.github.com/1wErt3r/4048722 (raw: https://gist.githubusercontent.com/1wErt3r/4048722/raw/59e88c0028a58c6d7b9156749230ccac647bc7d4/SMBDIS.ASM). Labels: `JumpSwimSub`, `FallingSub`, `MovePlayerVertically`, `ImposeGravity`.
  - jdaster64, "A Complete Guide to SMB's Physics Engine", archived image: http://web.archive.org/web/20130807122227/http://i276.photobucket.com/albums/kk21/jdaster64/smb_playerphysics.png. Section "Jumping/Vertical physics" says that holding A makes Mario rise more slowly as long as he is moving upward in a jump.
  - Secondary forum summary of the same rule ("holding A reduces gravity as long as vertical speed is upwards"): https://www.lexaloffle.com/bbs/?tid=3981

### 2. The numbers: launch speed and both gravities per tier
At takeoff, `InitJS`/`GetYPhy` (lines ~6084–6123) pick a row from four tables. The data is at line ~6014: `JumpMForceData`, `FallMForceData`, `PlayerYSpdData`, `InitMForceData`.

The index comes from the absolute horizontal speed. The code compares it with 9, 16, 25 and 28 (in 1/16 px/frame). Rows 0 and 1 are the same, and so are rows 3 and 4. That leaves **3 real tiers**:

| Takeoff speed (1/16 px/f) | px/frame | Launch speed | Gravity, rising + A held | Gravity after apex or release | Strong / light |
|---|---|---|---|---|---|
| 0–15 ("standing", slow walk) | < 1.0 | 4.0 px/f up ($FC.00) | $20/256 = **0.125** px/f² | $70/256 = **0.4375** px/f² | **3.5×** |
| 16–24 ("walking") | 1.0–1.5 | 4.0 px/f up ($FC.00) | $1E/256 = **0.1171875** | $60/256 = **0.375** | **3.2×** |
| 25–40 ("running", needs B-dash) | 1.5625–2.5 | **5.0** px/f up ($FB.00) | $28/256 = **0.15625** | $90/256 = **0.5625** | **3.6×** |

- The same values in jdaster64's 1/16-px "subpixel" units: light gravity is 2 / 1.875 / 2.5 subpixels per frame², and strong gravity is 7 / 6 / 9. His table lists 04000/00200/00700, 04000/001E0/00600 and 05000/00280/00900.
- A rough per-second scale at 60 fps: 4 px/f ≈ 240 px/s ≈ 15 blocks/s. Light standing gravity ≈ 450 px/s², strong ≈ 1,580 px/s².
- The running launch is 25 % faster (5 vs 4 px/f), but running gravity is also stronger in both phases.
- **Maximum fall speed:** the player's speed limit is 4 px/frame (`lda #$04` in `MovePlayerVertically`). In `ImposeGravity`, when the speed reaches 4 and the fraction is at least $80 (that is, about 4.5 px/f), it is reset to exactly 4.00. So the top fall speed stays between 4.0 and just under 4.5 px/frame, about 15 blocks per second. jdaster64 describes the same rule: the downward speed caps at 04800 and wraps back to 04000.
- Speed thresholds in TASVideos' wording (submission #7094): standing gravity at speed 0–15, walking 16–24, running 25–40. The top walking speed is 24 (1.5 px/f), from `MaxRightXSpdData` = $18. The top running speed is 40 (2.5 px/f), from $28.
- Sources:
  - Disassembly: https://gist.github.com/1wErt3r/4048722 (data tables `JumpMForceData`, `FallMForceData`, `PlayerYSpdData`, `InitMForceData`, `MaxRightXSpdData`; code `InitJS`)
  - TASVideos #7094 "minimum A presses" submission (HappyLee et al.): https://tasvideos.org/7094S
  - jdaster64 guide (archived): http://web.archive.org/web/20130807122227/http://i276.photobucket.com/albums/kk21/jdaster64/smb_playerphysics.png

### 3. Jump height vs run speed and hold time
These numbers come from my re-run of the disassembly logic, checked against jdaster64's "Jump Heights/Distances" table. All full-hold values match his exactly.

| Jump | Peak above takeoff | Rising time | Total air time (back to takeoff height) |
|---|---|---|---|
| Standing, A held to the top | **66.0 px = 4.13 blocks** (jdaster "42000") | 32 frames ≈ 0.53 s | 53 frames ≈ 0.88 s |
| Walking, A held | **70.3 px = 4.39 blocks** ("46460") | 35 frames ≈ 0.58 s | 58 frames ≈ 0.97 s |
| Running, A held | **82.5 px = 5.16 blocks** ("52800") | 32 frames ≈ 0.53 s | 57 frames ≈ 0.95 s |
| Standing, 1-frame tap | ≈ 23 px ≈ 1.45 blocks | 10 frames | 21 frames ≈ 0.35 s |
| Walking, 1-frame tap | ≈ 26 px ≈ 1.6 blocks | 12 frames | 24 frames |
| Running, 1-frame tap | ≈ 28 px ≈ 1.8 blocks | 10 frames | 21 frames |

- jdaster lists "no A held" heights of 20.3 / 23.4 / 24.8 px. He calculated them with strong gravity from frame 0. In the real game the first frame is always light, so the true minimum tap is a few pixels higher, as in my table. Either way, a tap is **under 2 blocks**.
- Holding A past the top does nothing: about 32 frames standing or running, about 35 walking. Holding for a shorter time gives heights in between. Standing examples: 10 frames ≈ 45 px, 20 frames ≈ 60 px, 25 frames ≈ 64 px.
- The fall is faster than the rise. A full standing jump takes ~0.53 s to go up and ~0.35 s to come back down.
- An official Nintendo guide agrees: the *Super Mario All-Stars* Player's Guide (1993), reproduced in jdaster's guide, says Mario clears four blocks on a normal run and five on a dash. This is the SNES remake's guide, but the numbers match the NES values above.
- Sources:
  - jdaster64 guide, "Extras / Distances" (archived): http://web.archive.org/web/20130807122227/http://i276.photobucket.com/albums/kk21/jdaster64/smb_playerphysics.png
  - Disassembly: https://gist.github.com/1wErt3r/4048722
  - TASVideos game resources ("minimal height jump (hold A for 1 frame)"): https://tasvideos.org/GameResources/NES/SuperMarioBros

### 4. The takeoff speed fixes the gravity tier for the whole jump
- `VerticalForce` and `VerticalForceDown` are set from the tables only in `InitJS`, at the moment of the jump. Speeding up or slowing down in mid-air does not change the tier.
- Also, if you take off below running speed (< 25), your top air speed is the walking limit. The B button does nothing to air momentum (jdaster64, "Air physics").
- The falling-gravity value stays in memory **after** the jump. A later walk off a ledge uses the strong gravity of your *most recent jump*. TASVideos #7094: Mario keeps that gravity state until he jumps again. jdaster64: running off a ledge has no gravity of its own and uses the previous falling gravity.
- Sources: disassembly (`InitJS`, `FallingSub`) https://gist.github.com/1wErt3r/4048722 ; https://tasvideos.org/7094S ; jdaster64 guide (archived link above).

### 5. Releasing A early: gravity switches at once, speed is not cut
- On the frame you let go, `JumpSwimSub` copies the strong gravity into `VerticalForce`, and `ImposeGravity` uses it on that same frame. `Player_Y_Speed` and `Player_Y_MoveForce` are **not** changed.
- Mario keeps rising and slows down 3.2–3.6× faster, so he reaches a lower peak sooner. This is how "variable jump height" works in SMB1.
- At the top of the jump (speed ≥ 0) the switch happens anyway, even if you keep holding A.
- Sources: disassembly https://gist.github.com/1wErt3r/4048722 ; jdaster64 guide (archived link above).

### 6. Bonus facts (verified)
- **Floaty start:** at every level start or area entry (including coming out of a pipe), `Entrance_GameTimerSetup` (line ~2833) sets `VerticalForceDown = $28` (0.156 px/f²). Until Mario's first jump, walking off a ledge gives a floaty fall. TASVideos calls this "Low-Gravity Mario". jdaster lists it as "Level entry 00280".
  - Sources: https://tasvideos.org/GameResources/NES/SuperMarioBros (section "Low-Gravity Mario"); disassembly; jdaster64.
- **Stomp bounces do not change gravity:** a stomp only sets the upward speed. It is −4 px/f for Goombas and shelled enemies (`SBnce`: `lda #$fc`) and −3 for Lakitu, Hammer Bro, Cheep Cheep and Bullet Bill (`EnemyStompedPts`: `lda #$fd`).
  - After a normal stomp (Mario falling), gravity is already strong, so holding A does not raise the bounce.
  - Only if you stomp while still rising with A held do you keep the light gravity, which gives a much higher "super bounce" (jdaster64; TASVideos "Bouncing high off turtles").
  - Sources: disassembly; jdaster64; TASVideos game resources page.
- **Development history (Iwata Asks, 2010, Vol. 5 "Original Super Mario Developers"):**
  - Miyamoto recalls asking Nakago's team at SRD in December 1984 for a test with a big Mario who jumps. He says the first thing he told Nakago "was make a big character that jumps around".
  - Iwata notices that Miyamoto's spec of February 20, 1985 says to push **up on the D-pad** to jump, with the A button for attacks.
  - https://iwataasks.nintendo.com/interviews/wii/mario25th/4/0

---

## Caveats / uncertain

- **jdaster64's speed thresholds are written oddly.** His table says "< 01000 / 01000–024FF / 02500+". The code compares with $10 and $19 (16 and 25 in 1/16 px/f, so 1.0 and 1.5625 px/f), and TASVideos #7094 uses 0–15 / 16–24 / 25–40. jdaster probably wrote decimal 24/25 inside his hex notation (my inference). Use the code values. In plain terms: standing or slow walking, walking, running with B.
- jdaster's guide warns that it is not 100 % accurate to the code. His gravity, launch and height numbers do match the code, but the threshold wording does not.
- Jump heights are takeoff-to-peak values for Mario's position. Whether Mario can *land on* a platform also depends on collision rules. 66 px vs a 64 px stack leaves only 2 px to spare. So say "about 4 blocks" and "about 5 blocks", not exact landing claims.
- The tap heights depend on how a "tap" is defined (1 frame held). Real human taps are usually several frames, so their heights fall between the two extremes.
- These values are for the NTSC/Japan NES version. The PAL version runs at 50 fps with changed physics values, and *Super Mario All-Stars* may differ slightly. Do not mix them.
- **No well-sourced designer quote about the variable jump itself was found.** Miyamoto, Tezuka and Nakago are not quoted on "hold to jump higher" in the Iwata Asks pages I checked.
  - A blog recap of Kyle Pittman's GDC 2016 talk "Math for Game Programmers: Building a Better Jump" says Mario's gravity triples after the peak. The published slides do **not** mention Mario (https://media.gdcvault.com/gdc2016/Presentations/Pittman_Kyle_BuildingBetterJump.pdf). They only cover "Fast falling", "Variable height jumping" and changing gravity in mid-arc in general.
  - Treat the Mario claim as unverified. In any case, SMB1's real ratio is 3.2–3.6× and it switches at the top *or* on release.
- Claims that SMB "invented" or was the "first" game with variable jump height are **not verified**. Say "a famous early example", not "the first".
- Pop-science figures for "Mario's gravity in m/s²" (for example ~91 m/s²) depend on an assumed Mario height. They also ignore that SMB has two gravities per jump. Do not use them.

## Myths / wrong

- **"Mario falls slower while you hold jump."** False. Once Mario stops rising, the code always applies strong gravity. Falls from ledges never read A.
- **"Holding A makes Mario jump harder or launch faster."** False. Launch speed is fixed by run speed at takeoff (4 or 5 px/frame). A only lowers gravity during the rise.
- **"Letting go of A stops Mario's rise or cuts his speed."** False for SMB1. His speed is untouched; gravity jumps to 3.2–3.6× and he keeps rising a little.
- **"While you hold A, Mario rises at a constant speed until the peak."** (This guess appears in a forum thread.) False. He slows down the whole time, just more gently.
- **"Tap A again in mid-air to float again."** False. Once released, the jump stays heavy for the rest of the jump.
- **"Holding A when you stomp a Goomba bounces you higher."** False in SMB1 for normal stomps. It only matters in the rare case of stomping while still rising with A held.
- **"Gravity tier changes if you speed up in the air."** False. It is locked at takeoff.
- **A forum post's general claim** (NESdev "Rebuilding SMB" thread) that "acceleration is doubled if the jump button is released" is not SMB1's real factor (3.2–3.6×). That post also describes a generic engine.

## Suggested safe one-line claims for narration (plain English)

1. "In Super Mario Bros., holding jump doesn't make Mario jump harder. It makes his gravity weaker."
2. "But only on the way up. At the top, gravity gets strong again, even if you keep holding the button."
3. "Let go early, and gravity becomes more than three times stronger at once. Mario stops rising sooner."
4. "That is how one button gives you a tiny hop or a big jump."
5. "A quick tap lifts Mario less than two blocks. Hold it, and he clears about four."
6. "With a running start, he launches faster and goes about five blocks high."
7. "The game picks the jump type the moment Mario leaves the ground. Speeding up in the air doesn't change it."
8. "In a full standing jump, Mario goes up for about half a second and comes down in about a third of a second."
9. "His top falling speed is about four pixels every frame, roughly fifteen blocks a second."
10. "Fun fact: at the start of a level, Mario falls extra slowly until his first jump."

Avoid: "Mario falls slower while you hold jump", "Mario floats down", "the first game with variable jump height", "gravity triples" stated as an exact number (say "more than three times").
