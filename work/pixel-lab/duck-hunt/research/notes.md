# Duck Hunt / NES Zapper — fact-check notes

Film: "How the Duck Hunt gun knew you hit the duck" (~55 s, EN, pixel art).
Researched 2026-10-24. Every point below was checked against the listed sources, not written from memory. Short quotes are kept to a few words; the rest is paraphrased.

Source key (used below):

- **[NESdev-Z]** NESdev Wiki, "Zapper": https://www.nesdev.org/wiki/Zapper
- **[NESdev-T]** NESdev Wiki, "Cycle reference chart": https://www.nesdev.org/wiki/Cycle_reference_chart
- **[PAT]** Nintendo patent US 4,813,682 (S. Okada), "Video target control and sensing circuit for photosensitive gun", continuation of an application filed 1985-08-09, issued 1989-03-21: https://patents.google.com/patent/US4813682A/en
- **[SMG]** The Slow Mo Guys, "How the Nintendo Zapper worked in Slow Motion" (2023-12-06; filmed on a Phantom TMX 7510 at up to 1,750,000 fps; transcript checked): https://www.youtube.com/watch?v=V6XnSvB34y8
- **[8BG]** The 8-Bit Guy, "How light pens and light guns work NES Zapper" (frame-by-frame + teardown; transcript checked): https://www.youtube.com/watch?v=Nu-Hoj4EIjU
- **[BILD]** Nick Bild, "How the NES Zapper REALLY Works" (teardown, schematic, logic-analyzer tests, 2025-05-05): https://hackaday.io/project/203034-how-the-nes-zapper-really-works/details (mirror: https://www.hackster.io/nickbild/how-the-nes-zapper-really-works-79add2)
- **[F-TEST]** NESdev forum "Zapper test ROMs" (rainwarrior, lidnariq, qwertymodo; 2015–2016): https://nesdev.nes.science/f9/t13021.xhtml (archive of forums.nesdev.org t=13021)
- **[F-LCD]** NESdev forum "NES zapper + LCD" (2016): https://forums.nesdev.org/viewtopic.php?p=225882
- **[MM]** "Modern Mallard" kit author post, EEVblog forum, 2018-06-28: https://www.eevblog.com/forum/crowd-funded-projects/modern-mallard-a-kit-to-make-the-nes-game-duck-hunt-work-on-an-lcd-tv/
- **[RRGB]** Nicole Branagan, "Yes, You Can Use Lightguns on LCDs – Sometimes", RetroRGB, 2023-10-26: https://retrorgb.com/yes-you-can-use-lightguns-on-lcds-sometimes.html
- **[WP-Z]** Wikipedia, "NES Zapper": https://en.wikipedia.org/wiki/NES_Zapper
- **[WP-DH]** Wikipedia, "Duck Hunt": https://en.wikipedia.org/wiki/Duck_Hunt
- **[SD]** The Straight Dope (Cecil Adams), "In Nintendo's Duck Hunt, how does the TV know when you've hit a duck?" (2001): https://www.straightdope.com/21343438/in-nintendo-s-duck-hunt-how-does-the-tv-know-when-you-ve-hit-a-duck
- **[GIGA]** Gigazine summary of the Slow Mo Guys video (2023-12-08): https://gigazine.net/gsc_news/en/20231208-nintendo-zapper-slow-motion
- **[SIN]** Sinden Lightgun official "Details": https://sindenlightgun.com/details/ and Wikipedia https://en.wikipedia.org/wiki/Sinden_Light_Gun
- **[BB]** Blur Busters, "Why Do Some OLEDs Have Motion Blur?" (sample-and-hold): https://blurbusters.com/faq/oled-motion-blur
- **[USC]** 15 U.S.C. § 5001 (toy guns, blaze-orange marking), Pub. L. 100-615, 1988-11-05: https://www.law.cornell.edu/uscode/text/15/5001

---

## Verified facts

### 1. What is inside the Zapper and what it sends

- **The gun only receives light; it emits nothing.** The NES/console never "receives a shot" from the TV either — the sensor in the gun looks at the screen. [SMG] ("this is the receiver"), [8BG], [SD], [WP-Z]
- **Optics:** a simple **lens at the front of the barrel** focuses a small area of the screen onto a **light sensor at the back** of the barrel. [SMG] (sensor "at the back of the gun … through this lens"), [8BG] teardown (lens at front; one metal cylinder and one shaped part are just weights; the photosensor "is not a camera").
- **Sensor + receiver chip:** Bild's teardown identifies a photodiode feeding a **Sharp IR3T07A** chip (undocumented, no datasheet) that decides which light frequencies count. [BILD] Nintendo's patent circuit describes the same idea: photo element → amplifier → **LC filter (capacitor + coil) passing only the TV's horizontal-scan frequency** → pulse-shaping gate → console. (The patent says phototransistor; the retail Zapper is described as a photodiode.) [PAT]
- **It behaves like a TV-remote receiver tuned to ~15–16 kHz instead of ~38–40 kHz.** NESdev regulars: the receiver is roughly a GL3274-type remote receiver retuned for 16 kHz; it is edge-triggered and removes the steady (DC) part of the light. [F-LCD] (lidnariq), [F-TEST] (lidnariq, qwertymodo). NESdev Wiki: filter tuned to roughly the CRT scanline frequency (~15 kHz), which attenuates slowly changing light such as light bulbs. [NESdev-Z]
- **Measured response band:** Bild flashed an LED at the bare sensor; the hit line switched on for flicker between about **13.5 kHz and 20 kHz**. [BILD] (lidnariq also got pickup with sharp 4 kHz and 64 kHz pulses and even a single sharp LED pulse — it reacts strongly to sudden turn-on edges. [F-TEST], [F-LCD])
- **How long the "light" signal lasts:** about **26 scanlines on pure white, 24 on light gray, 19 on dark gray** (Zap Ruder test ROM) — i.e. roughly 1.2–1.7 ms. [NESdev-Z] (A Cornell student project measured a pulse of up to ~2.5 ms: https://people.ece.cornell.edu/land/courses/ece4760/FinalProjects/s2003/lbb23/duckhunter/hardware.htm)
- **Trigger:** a plain switch, electrically **independent of the light sensor**. [BILD] Official Zapper reads 1 while half-pulled and 0 again after the full "clunk"; a 10 µF capacitor in the gun with the console's 10 kΩ pull-up makes it take ~100 ms to read "released". Games usually fire on the transition. [NESdev-Z]
- **Signals to the NES (NES/Famicom Zapper):** read from **$4016 (port 1) or $4017 (port 2)**:
  - **bit 3 (D3) = light sensed at the current scanline, active-low: 0 = light detected, 1 = no light;**
  - **bit 4 (D4) = trigger: 1 = half-pulled, 0 = released or fully pulled.**
  Most games accept the Zapper only in **controller port 2**; the Famicom gun goes in the expansion port and reads as port 2. The Vs. System (arcade) Zapper is different (serial, light bit inverted). [NESdev-Z]

### 2. The exact sequence in Duck Hunt

- **Trigger pulled → the console finishes the current frame → one entirely black frame → next frame: black screen with a white box exactly over where the duck sprite was.** If the sensor fires during that white frame, it is a hit. [SMG], [8BG], [WP-Z], [SD], [BILD]
- **The rest of the screen is black during the white-box frame** (only the box is lit). [WP-Z], [NESdev-Z] (generic method: "black screen with a single white … box"), [SMG]
- **Box, not duck shape:** it is a white rectangle over the sprite area. [SMG], [8BG]; the patent describes the white "mock target" as an area somewhat larger than the target. [PAT] (The Straight Dope says "duck-shaped" — see Myths.)
- **Two ducks (Game B): each duck gets its own white box in a separate frame.** The game knows which duck was hit by *which frame* the light arrived in. [SMG] (Gav: "in two duck mode it actually draws each box on a different frame"), [8BG] (frame-by-frame: black screen, one flash, "then in the next frame, a different flash"), [WP-Z] ("each target flashes for one video frame, one after another"), [NESdev-Z] (one target per test frame).
- **Frame count (as observed):**
  - one duck: 1 black + 1 white = **2 test frames**; after a hit, the duck was gone for **4 frames total** before the falling-duck sprite appeared (black, white box, background with no sprites, background with score updated). [SMG], [8BG]
  - two ducks: **black → box on duck A → box on duck B on the next frame = 3 test frames** per the 8-Bit Guy's frame-by-frame view. [8BG] (see Caveats: Nintendo's patent example puts another black frame between the two boxes.)
- **Timing numbers:** NTSC NES = **262 scanlines per frame at 60.0988 Hz → 16.64 ms per frame** (commonly rounded to 16.7 ms / "1/60 s"); line rate = 60.0988 × 262 ≈ **15,746 lines per second (~15.7 kHz), ~63.5 µs per line.** [NESdev-T]; Bild's own arithmetic gives the same ~15.7 kHz. [BILD] So the whole two-duck check is ~3 frames ≈ **50 ms (1/20 s)**; one duck ≈ 33 ms.
- **The game polls the light bit throughout the frame**, not once: the sensor turns on for only 10–25 scanlines, so a game must keep checking for the whole frame. [NESdev-Z]; rainwarrior notes Duck Hunt polls constantly until it gets a hit or the next NMI (frame start). [F-TEST]
- **Menus use the same trick with the whole screen:** on the title menu the entire screen flashes; no light = move the arrow, light = select. [SMG]; Zapper manual (1985): point away from the screen and shoot to move the arrow, shoot at the screen to start (quoted in [WP-Z]).

### 3. Why the black frame — the anti-cheat, both layers

- **Layer 1 — hardware filter (in the gun):** steady or slowly changing light is filtered out; the gun responds to the very fast (~15.7 kHz) flicker of CRT scanlines. [NESdev-Z], [PAT], [BILD], [RRGB]
- **Layer 2 — software black-frame check (in the game logic):** Nintendo's patent explains why: earlier light-gun games could score false hits when the gun was aimed at a lamp such as a fluorescent tube; a frequency filter alone was not enough because some lamps give off similar light. The fix: after the trigger, show a **black picture**; if the gun detects light while the screen is black, the CPU treats it as **noise** and skips the hit check; only light that appears exactly with the white "mock target" in the next frame counts. [PAT] NESdev documents the same practice: during vertical blank, confirm the gun is *not* seeing light before flashing targets. [NESdev-Z] Popular explanations match: [SD] (the dark-to-light change blocks cheating with a steadily shining light), [SMG] (black first "so you can't just point the gun into a bright light source like a light bulb"), [RRGB] (filter "in addition to the black frame check").
- **Lamp experiments (real hardware):**
  - incandescent and halogen bulbs: **not detected at all** by an original Zapper. [F-TEST] (rainwarrior, 2015)
  - some **fluorescent** lamps *can* make the sensor fire (a fluorescent bulb held right against it; a CFL false positive), probably because an electronic ballast flickers near 16 kHz. [F-TEST], [F-LCD] (dougeff, tepples). Others could not trigger it with household CFLs (~8 kHz) or monitor backlights (~1 kHz). [F-LCD] (lidnariq)
- **Verdict on the "light bulb trick":** **it does not work in Duck Hunt.** A normal bulb is invisible to the Zapper (filter). A lamp that does trip the sensor trips it during the black frame too, which the Nintendo design counts as noise, i.e. a miss. [PAT], [F-TEST], [NESdev-Z], [SMG]

### 4. Why it does not work on modern TVs

Two independent problems; good technical sources rank the **sensor/filter problem first**, lag second:

- **(a) No fast flicker for the filter to lock onto.** A CRT draws the picture with an electron beam one line at a time; at any instant only the line being drawn is lit, so a white area reaches the gun as a burst of ~15.7 kHz flashes. [SMG], [BILD], [8BG] Flat panels are **sample-and-hold**: each frame stays lit for the whole ~16.7 ms refresh instead of a brief scanning flash. [BB] The original Zapper's filter therefore sees an LCD as steady light and ignores it: NESdev Wiki (filter "strongly attenuate[s]" many LCD TVs) [NESdev-Z]; NESdev forum: the Zapper is only sensitive to the ~15 kHz CRT flicker, "the issue isn't just lag" [F-LCD]; rainwarrior's Zapper could not see his LCD at all, even on a static screen, so lag was irrelevant in that test [F-TEST]; qwertymodo calls the demodulator "the #1 reason". [F-TEST]
- **(b) Display lag.** Games expect zero delay: they read the sensor *while* the console is outputting the white-box frame. Modern TVs scale/process the image first. Typical LCD lag **16–100 ms** (1 to 6 frames) [MM]; even a one-frame buffer (e.g. an external scaler) means the box appears after the game has already decided "miss"; "Game Mode" lowers lag but cannot make it zero. [RRGB], [NESdev-Z]
- **Proof that both matter:** working LCD fixes need **both** a different light sensor (clone guns with a weaker filter, e.g. Tomee Zapp Gun; or a new board responsive down to steady light) **and** patched game code that waits for the TV's measured lag. [NESdev-Z], [MM] (Modern Mallard: replacement Zapper board + cartridge patch board with auto-calibration), [RRGB] (LCDMOD patches + Tomee gun).
- **Brightness also matters but is secondary:** a CRT's line flash is very bright for an instant; too-dim light makes detection unreliable. [F-TEST] (lidnariq)
- **Wild Gunman Game A** is the exception that "works" on any screen: it ignores where you aim and only checks trigger timing. [NESdev-Z], [RRGB]
- **Modern light guns work differently:** the **Sinden** light gun (2020) has an optical sensor/camera in the gun that tracks a **thin white border** added around the picture, computing aim in under ~20 ms; no CRT timing involved. [SIN]

### 5. Release and hardware history (only if useful)

- **Famicom light gun** (Kōsenjū, revolver-shaped, designed by Gunpei Yokoi and Satoru Okada, Nintendo R&D1): Japan **1984-02-18**, bundled with *Wild Gunman*. [WP-Z]
- **Duck Hunt:** Famicom, Japan **1984-04-21**; *VS. Duck Hunt* arcade (Nintendo VS. System), North America **April 1984**; NES launch title in North America **1985-10-18** (New York test market), wider US rollout 1986; Europe 1987-08-15. [WP-DH], [WP-Z]
- **NES Zapper:** launched **1985-10-18** with the NES (NES-005); redesigned as a ray gun by Lance Barr; original US color **dark gray**. [WP-Z]
- **Orange Zapper:** announced Jan 1988 (CES), released **1989** in the US. [WP-Z] US federal law (Pub. L. 100-615, **1988-11-05**, 15 U.S.C. § 5001) requires toy/imitation guns to carry a **blaze-orange** marking (plug in the barrel). [USC] (Wikipedia's "1987" law date is inconsistent with this; use "late 1980s" if needed.)

---

## Caveats / uncertain

- **Black frame between the two duck boxes?** Two-duck boxes are definitely in separate frames. Whether Duck Hunt inserts *another* black frame between box A and box B is not settled:
  - The 8-Bit Guy's frame-by-frame view and the Slow Mo Guys narration both describe box B on the **next** frame (black → A → B). [8BG], [SMG]
  - Nintendo's patent example uses black → A → **black** → B (frames 2–5). [PAT] A Gigazine summary of the Slow Mo Guys video also says "a black screen in between", but Gav does not say that in the transcript. [GIGA]
  - I tried to measure the frame spacing from the Slow Mo Guys footage; the high-speed clips are edited, so it was inconclusive.
  - **Safe for the film:** "black frame, then a box on one duck, then a box on the other duck." Don't state a frame count for the two-duck case.
- **Which duck flashes first** in Game B: not documented in the sources found.
- **Duck Hunt's own code** was not available as a published disassembly. The black-frame rejection is documented in Nintendo's patent for this system and in NESdev's standard method, and observed sequences match it, but no source quotes Duck Hunt's actual routine. (rainwarrior mentions Duck Hunt has a ~5-frame software trigger debounce and polls light until a hit or the next frame.) [F-TEST]
- **Photodiode vs phototransistor:** the patent schematic says phototransistor; retail teardowns/NESdev say photodiode. Say "light sensor".
- **Exact filter centre:** "~15 kHz" (NESdev), "13.5–20 kHz" (Bild's measurement), "16 kHz" (lidnariq). Sharp edges at other frequencies can also trigger it. Say "very fast flicker" rather than an exact frequency.
- **Typical TV lag numbers** vary a lot by set and mode. 16–100 ms comes from one project author [MM]. RTINGS measures it (methodology: https://www.rtings.com/tv/tests/inputs/input-lag) but per-model values differ. Avoid quoting one universal number; "a frame or more late" is safe.
- **Plasma/OLED specifics** were not checked individually. The sources lump all flat panels together as not producing CRT-style scanline flashes plus processing lag. Say "modern flat TVs".
- **Hackaday's framing** (LCD pixels "too slow") is a simplification. The cleaner statement is that LCDs don't produce the 15.7 kHz line flicker (sample-and-hold).

---

## Myths / wrong

- **"The gun fires a beam / laser at the TV."** Wrong. The TV flashes light and the gun only detects it. [SD], [SMG], [8BG]
- **"Point the Zapper at a light bulb and you always hit."** Wrong for Duck Hunt (filter + black-frame check; incandescent bulbs aren't even detected). [PAT], [F-TEST], [SMG] Today I Found Out says "early Zapper models" could be fooled by a bright light, with no source: https://www.todayifoundout.com/index.php/2010/12/how-the-gun-on-the-original-duck-hunt-game-worked/ — unsupported. StrategyWiki also claims cranking up TV brightness/contrast or using a magnifying glass helps; I couldn't open the page (Cloudflare) and found no test, so treat it as **unverified**.
- **"Duck Hunt tracks the electron beam to work out where you aimed (like a light pen)."** Wrong for Duck Hunt: it only asks "light or no light?" during each test frame. [8BG] (Giant Bomb's timing-based explanation is wrong for Duck Hunt.) Beam timing *is* used by some other Zapper games (e.g. *Operation Wolf* narrows the vertical position) and is an optional step in NESdev's method. [F-TEST] (tepples), [NESdev-Z]
- **"Both ducks light up in the same frame."** Wrong; one box per frame. Wikipedia's Zapper article half-says this ("all valid targets … drawn all white"), then contradicts itself in the next sentence. [SMG], [8BG], [WP-Z]
- **"The flash is a duck-shaped white silhouette."** It's a white box over the duck. [SMG], [8BG] (vs. [SD])
- **"The black frame is for the gun to calibrate."** Imprecise ([8BG], Gizmodo). Nintendo's patent says it is a false-light (noise) check. The receiver removes steady light on its own. [PAT], [F-TEST]
- **"It fails on new TVs only because of lag" / "Game Mode fixes it."** Incomplete. The original Zapper can't see an LCD at all because of its filter, and even Game Mode lag isn't zero. You need a different gun and a patched game. [NESdev-Z], [F-LCD], [MM], [RRGB] Wikipedia's "due to display lag" line carries a *citation needed* tag.
- **"TV lag is about a millisecond"** ([8BG]). Too small: one frame is already ~16.7 ms, and typical LCD lag is 16–100 ms. [NESdev-T], [MM]
- **"You can shoot the dog."** Not in the NES/Famicom game: Nintendo of America's Jerry Momoda says the dog was made unshootable on consoles to keep it family-friendly. In the **VS. Duck Hunt arcade** bonus stage the dog *can* be shot (he scolds you and the bonus ends). [WP-DH]
- **"The Zapper was always orange."** The 1985 NES Zapper was gray; orange arrived in the US in 1989. The Japanese gun is a different, revolver-shaped design. [WP-Z]

---

## Suggested safe one-line claims for narration

(Plain English, one idea per sentence, all backed above.)

1. The Zapper doesn't shoot anything. It only looks at the screen.
2. Inside the barrel is a lens and a tiny light sensor.
3. When you pull the trigger, the whole screen turns black for one frame.
4. In the next frame, a white box appears where the duck is. Everything else stays black.
5. If the sensor sees the white box, the duck is hit.
6. With two ducks, each duck gets its own white box, one frame after the other.
7. The moment the light arrives tells the game which duck you hit.
8. One frame lasts about one sixtieth of a second, so you barely notice the flash.
9. An old tube TV draws the picture one line at a time, about 15,700 lines every second.
10. The gun only reacts to that very fast flicker, not to steady light.
11. That's why pointing it at a lamp doesn't work.
12. And if the gun sees light during the black frame, the game doesn't count a hit.
13. Modern flat TVs don't flicker line by line, and they show each picture a little late.
14. So the old Zapper misses both the flash and the moment. Duck Hunt needs a tube TV.
15. (Optional history) Duck Hunt came out in Japan in 1984 and launched with the NES in America in 1985.
16. (Optional) And no, you can never shoot the dog. Not on the NES.

Avoid in narration: exact frame counts for the two-duck test, "the gun calibrates", "duck-shaped flash", one universal lag number, and claims that the lamp trick "used to work".
