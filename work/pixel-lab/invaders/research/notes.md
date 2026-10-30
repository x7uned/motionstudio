# Space Invaders: Nagoya attack (名古屋撃ち) fact check

Researched 2026-10-24 for a ~55 s EN pixel explainer. Primary source: the commented 8080 disassembly at Computer Archeology (CA). Note that CA disassembled the **Midway** ROM set (invaders.h/g/f/e). Its comments say the Midway code is a branch of Taito's code. Nishikado and Taito sources describe the same behaviour in the Taito original.

**Coordinates used below.** The monitor is rotated 90° in the cabinet. "Y" means pixels **up from the bottom of the visible screen**, the disassembly's `Yr` value. Hex is followed by decimal, for example `$28` (40). An alien's Y is its bottom edge (tentacle tips). Sprites are 8 px tall.

Sources (short names used below):
- CA-Code: https://www.computerarcheology.com/Arcade/SpaceInvaders/Code.html
- CA-RAM: https://www.computerarcheology.com/Arcade/SpaceInvaders/RAMUse.html
- CA-HW: https://www.computerarcheology.com/Arcade/SpaceInvaders/Hardware.html
- CA-Overview: https://www.computerarcheology.com/Arcade/SpaceInvaders/
- Nishikado 2000 (book *game maestro*, English translation): https://shmuplations.com/nishikado/
- Wired 2023 (Craig Grannell, 12 Apr 2023): https://www.wired.com/story/space-invaders-45-years-tomohiro-nishikado/ (archive: https://web.archive.org/web/20250705233729/https://www.wired.com/story/space-invaders-45-years-tomohiro-nishikado/)
- IGCC 2018 (Nishikado and Kamei talk, 7 Sep 2018): https://igcc.jp/invader-house2018/ (the site is down for maintenance; archive: https://web.archive.org/web/2024/https://igcc.jp/invader-house2018/)
- JA-Wiki: https://ja.wikipedia.org/wiki/スペースインベーダー (section 裏ワザ・バグなど; 名古屋撃ち redirects here)
- EN-Wiki: https://en.wikipedia.org/wiki/Space_Invaders
- Chunichi 2022a (30 Sep 2022, on the roots of the name): https://www.chunichi.co.jp/article/554896
- Chunichi 2022b (interview with Mitsuru Sugaya, the Game Center Arashi author): https://www.chunichi.co.jp/article/554897
- Famitsu (16 Jun 2026 repost): https://www.famitsu.com/article/202606/77988
- Middle Edge: https://middle-edge-neo.jp/articles/1507/
- Shmups Wiki: https://shmups.wiki/library/Space_Invaders

---

## Verified facts

### 1. What the Nagoya attack is

- **It is a bug.** Invaders that have come down to the lowest row before landing cannot kill the cannon with their shots. Players let the formation come all the way down, then shot it from point-blank range.
  - IGCC 2018 quotes Nishikado on the bug: 「最下段まで降りたインベーダーの攻撃は自機に当たらないという仕様（いわゆる「名古屋撃ち」の要因）」.
  - Chunichi 2022a: 「最下段まで降りてきたインベーダーから発射されるミサイルがプレーヤー側のビーム砲をすり抜けてしまう」.
  - Nishikado 2000 calls it "a programming bug": "the very bottom row of invaders' shots seemed to pass right through his ship."
  - EN-Wiki: the bug "prevented the invaders' attacks from harming the laser cannon at very close range".
- **How far down the invaders must be.** The safe height is exactly one 8-px drop above landing. At that height the invaders' feet touch the cannon's top: alien bottom edge at Y=`$28` (40), cannon at Y 32–39 with the barrel tip at 39.
  - The cannon's position comes from CA-Code (RAM mirror `$1B1A` = `$20`, so the cannon's Y is 32) and its sprite at `$1C60` (8 px tall).
  - Famitsu describes the cannon as 「自機がインベーダーに密着すると」, in close contact with the invaders.
  - Folk explanation of the name pun: 「あと1段侵略されたら終わり」, "one more step and it's over" (Chunichi 2022a, IGCC footnote 05).
- **Number of drops to reach the safe height.** The formation drops 8 px each time it hits a side wall (`RackBump` at `$1597`, `rackDownDelta` = `$F8` = −8).
  - Starting Y of the bottom-left alien by round: R1 `$78` (120), R2 `$60` (96), R3 `$50` (80), R4–6 `$48` (72), R7–9 `$40` (64), then R10 goes back to `$60`. Sources: CA-Code `$07EA` and `AlienStartTable` `$1DA3`; the lookup is at `$0A10`.
  - In round 1 the bottom row needs 10 drops to reach Y 40, and the 11th drop lands. In rounds 7–9 it needs only 3 drops, and the 4th lands.
  - The rack's reference point keeps falling even if the lower rows are dead (CA-Code comment at `$14F8`). So whichever row is the lowest one still alive can reach the safe height.

### 2. The mechanism, from the disassembly (CA-Code)

- **Who fires.** Each shot picks a column. `FindInColumn` (`$062F`) then fires from the **lowest live alien in that column** ("starting with the lowest position").
- **Where the shot appears.** `$05A9–$05B4`: `GetAlienCoords`, then shot X = alien X + 7 (centred) and shot Y = alien Y − `$0A` (10), commented "Set shot coordinates below alien". The shot's pixels start about 3 px under the alien's feet. This matches Nishikado's "I programmed it so that their shots would come out just a little bit in front of the invaders" (Nishikado 2000).
- **First move before first draw.** A new shot is not drawn when it is created. On its next step it moves first (`alienShotDelta`, normally `$FC` = −4 px; `$FB` = −5 px when 8 or fewer aliens remain, `SpeedShots` `$08D8`) and is then drawn with collision detection (`$05E5–$05F0`).
- **The hit test is a height window.** `$05FB–$060F`: if the shot touched any pixel, the game checks the shot's Y.
  - `CP $1E` (30): below that, the comment says "Is it below player's area? Yes ... end it".
  - `CP $27` (39): at or above that, the comment says "Is it above player's area? Yes ... end it".
  - Only Y 30–38 (`$1E`–`$26`) sets `playerAlive` = 0, which kills the cannon. Anything else just makes the shot explode.
- **Why the lowest invaders are harmless.**
  - An alien at Y 40 creates its shot at Y 30. The shot is first drawn at Y 26 (or 25) and keeps falling. It is never inside the 30–38 window.
  - Even when it overlaps the cannon's base (cannon pixels Y 32–36), the game treats the touch as "below player's area". The shot just pops, or it falls on and is removed below Y 21 (`CP $15`).
  - One step higher (alien at Y 48), the shot appears at 38 and is first drawn at 34, inside the window, so it can kill.
- **Only the lowest height is safe.**
  - The rule depends on height, not on the alien's original row. Any alien that is the lowest live alien in its column and sits at Y 40 is harmless.
  - An alien one row up (Y 56) fires only if the alien under it is dead. Its shot appears at 46 and passes 42, 38, 34. At 34 it can hit the cannon, so **it can still kill you**.
  - This is my calculation from the code above; no secondary source states it.
- **Landing ends the game.**
  - `CursorNextAlien` `$016A–$016D`: if any live alien's Y is below `$28` (40), the comment says "reached the end of screen? Yes ... kill the player". It then jumps to `$1971`, which sets `invaded` = 1, "aliens reached bottom of screen".
  - The end-of-round code (`$16E6`–`$1709`) erases the spare ships, prints 0 ships, then jumps to `$1671` "Flag player is dead". That is game over **even with lives left**.
  - JA-Wiki agrees: 「残機があってもゲームオーバー」. So does Nishikado 2000: "if one of them crossed the line into your territory, it was automatically game over."
  - Landing means dropping to Y 32, the cannon's own height.

### 3. Most accurate short wording

- The invaders still shoot; their shots just can't kill you. "The lowest aliens can't shoot you" is slightly wrong.
- Accurate wording: **"Invaders that come down to the last row before landing can't hit you."** A looser version: "Once the invaders are right on top of you, their shots can't hurt you."
- It is not true that "none of their shots can hit you" once the formation is low. Shots from aliens one row higher (16 px up) still kill.
- **Shields at that point.**
  - Shields sit at Y 48–63 (screen address `$2806`, 22×16 px, 4 shields; CA-Code `CopyShields` `$021E`).
  - Aliens are drawn by overwriting screen bytes (`DrawSprite` `$15D3`), which wipes shield pixels where they pass. JA-Wiki: 「降りてきたインベーダーが触れることでも削られてしまう」.
  - When the bottom row is at Y 40, it is below the shields and the row above (Y 56–63) is inside them. The shields are mostly eaten where the formation swept.
  - Shots from the Y 40 aliens start below the shields (Y 30 and lower), so they can't damage shields either.
  - The shield-height part is my calculation from the code.

### 4. How players used it, versions, name

- **Classic procedure (Japanese guides):**
  1. Leave the top invader in an edge column alive.
  2. Shoot out the 2–3 columns next to it to make a gap (a "safe zone").
  3. Wait in the gap until the formation reaches the last row.
  4. Step out and shoot the front row from directly below.
  5. Mistakes are fatal: 「最下段に到達してからミスをすると、即占領、ゲームオーバー」.
  - Sources: Middle Edge; IGCC footnote 05 「インベーダーの間に作った安全地帯を利用し、最下段まで引き寄せてから撃つテクニック」; Chunichi 2022b 「上端の1匹を残すのが特徴」.
  - Shmups Wiki: "failing to destroy the last row perfectly results in the game ending instantly."
- **Scores.**
  - Nishikado 2000 first noticed it watching "a really good player putting up some high scores around 150k".
  - It was linked to steady UFO scoring. Middle Edge: 「安定したUFO破壊による高得点」. Masaru Tomita called his early tactic "300点UFO" (Chunichi 2022a).
  - In Aug 1979 the critic Kajiwara wrote in *Game Machine* that with so many cabinets, anyone could score high 「名古屋撃ち等を利用して」 (cited in JA-Wiki).
- **Versions.**
  - Taito original (1978): confirmed by Nishikado and IGCC.
  - Midway version: the disassembled code shows the same mechanism (CA).
  - **Not** in the Atari 2600 port: 「ハードの性能上、前述の名古屋撃ちやレインボーはできない」 (JA-Wiki).
  - Some 1979 clones blocked it too, for example Space Stranger: 「名古屋撃ちは通用しない」 (JA-Wiki).
  - Taito made it an official mechanic, "NAGOYA ATTACK", in *Space Invaders Infinity Gene Evolve* (Apple Arcade, 2025) (JA-Wiki, citing 4Gamer).
- **Why it wasn't fixed (IGCC 2018).**
  - A fix was possible in code, but Taito sales said 「このままで良い」. A second ROM swap would have cost a lot, since many cabinets were already out.
  - A coin bug had already been fixed by a ROM swap when only a few hundred units existed.
  - JA-Wiki, citing IGCC 2019: Nishikado wanted to block Nagoya-uchi too, but sales asked him to keep it.
  - JA-Wiki: Nishikado said it was a "shock" when he learned about it.
- **The name's origin is unknown.**
  - JA-Wiki: 「名称の出自ははっきりせず」. Nishikado: 「残念ながら分かりません」 (Chunichi 2022a).
  - Theories: it spread from Nagoya first; a Nagoya Kawaijuku tutor invented it; a pun on Nagoya = Owari = 終わり ("the end"); a 1979 weekly magazine credited "a person named Nagoya" (Chunichi 2022a; IGCC footnote 05).
  - Other names: モグラ撃ち, 寝技, 横浜撃ち, 原宿撃ち, 神戸撃ち, フェイス・トゥ・フェイス. EN-Wiki and Shmups Wiki also list "Wall of Death".
  - The name reportedly became standard after Japan's first strategy book in June 1979 (JA-Wiki, Chunichi 2022a).

### 5. Why the invaders speed up

- **One alien moves per frame.** The mid-screen interrupt moves the cursor to the next live alien (`CursorNextAlien` `$0141`). The end-of-screen interrupt draws that one alien (`DrawAlien` `$0100`). Both interrupts run 60 times per second (CA-Overview, CA-HW: "raster resolution is 256x224 at 60Hz", RST 8 at mid-screen and RST 10 at VBLANK).
  - So exactly **one live alien moves 2 px per frame, 60 per second**. The whole rack moves only after every live alien has had its turn (`MoveRefAlien` `$01A1`).
- **Numbers.**
  - 55 aliens: 55 frames per step, about 0.92 s. CA-Overview: "55 interrupts or almost 1 second". Nishikado (Wired 2023): "about a second for all the invaders to take a step."
  - 1 alien: it steps every frame, 60 steps per second, so 120 px/s to the left.
- **The last alien's extra speed.** `RackBump` comment (`$1597`) and `$18F1–$18F9`: with exactly one alien left, the move to the right is **3 px** instead of 2, while the move to the left stays −2. That is 180 px/s right versus 120 px/s left. CA-Overview: "faster going right than it is going left". Shmups Wiki: "50% faster moving right than left".
- **Pause on each kill.** While an alien explodes the march stops for 16 frames: `expAlienTimer` is set to 16 at `$152C` and counted down in `AExplodeTime` `$1538`. Shmups Wiki: "Each hit stops the wave for 16 frames."
- **The march sound is not locked to the march.** The four-note tempo comes from its own table (`$1A11`/`$1A21`): a 52-interrupt delay at 50+ aliens, down to 5 with 1 alien (CA-Overview).
- **Intended or not.**
  - Nishikado (Wired 2023): "This was the result of the game board's low processing power. It was designed to draw one invader every 60th of a second, instead of all the invaders at once … As their number decreases, the time to draw them all becomes shorter, and so their speed of movement increases. This makes the game more interesting…"
  - EN-Wiki, citing Retro Gamer #3 (2004): he discovered the effect and "Rather than design a compensation for the speed increase, he decided to keep this undocumented feature as a gameplay mechanism."
  - So drawing one alien per frame was a deliberate answer to the weak hardware. The speed-up came from it, and he chose to keep it.

### 6. The three alien shots (CA-Code, CA-Overview)

- **Rolling shot** (object 2, "targets player specifically"). It fires from the column **directly above the cannon** (`$061B–$062C`: player X + 8, `FindColumn`), then from the lowest live alien in that column. If that column is empty, no rolling shot is fired that turn (`RET NC` at `$05A8`).
- **Plunger shot** (object 3). It uses the column table at `$1D00`, entries 00–0F: columns **1, 7, 1, 1, 1, 4, 11, 1, 6, 3, 1, 1, 11, 9, 2, 8**. It is disabled when only one alien is left (`$04FC–$0505`, `skipPlunger`).
- **Squiggly shot** (object 4). It uses entries 06–14 of the same table: **11, 1, 6, 3, 1, 1, 11, 9, 2, 8, 2, 11, 4, 7, 10**. It shares its object slot with the flying saucer, so only one of the two can be on screen at a time.
- Shmups Wiki has the same lists and notes that column 1 is fired from most often.
- **Shot speed.** Shots fall 4 px per step, one step every 3 frames, which is 80 px/s. With 8 or fewer aliens left they fall 5 px per step, 100 px/s (CA-Overview; Shmups Wiki says "25% faster").
- **Fire rate.** It depends on score. The reload value is `$30` below 200 points, then `$10`, `$0B`, `$08`, and `$07` (the fastest) above 3000 (`$170E`, tables `$1CB8`/`$1AA1`).
- **Only one shot is processed per frame** (CA-Overview).

---

## Caveats / uncertain

- **Midway vs Taito code.** The disassembly is of the Midway ROM. I could not find a Taito-ROM disassembly to compare the shot routine byte for byte. The Nagoya behaviour itself is confirmed for the Taito original by Nishikado (2000) and by IGCC 2018.
- **What the screen shows.**
  - The code says a lowest-row shot is first drawn at Y 26, overlapping the lower part of the cannon. If it touches the cannon, the shot's small explosion is drawn right there, with no death. If it misses, it falls one more step and is removed.
  - Nishikado's eyewitness wording is "seemed to pass right through his ship". "Passes through" or "can't hurt you" are both fine for narration. "Spawns under the cannon" is a slight simplification: it appears inside the cannon's base, below the hit strip.
- **The Japanese popular explanation.** Famitsu says 「弾の当たり判定も弾の先にあった」 (the hit point was at the bullet's tip). The code actually uses a height window on the shot's position plus a pixel-overlap test. The Famitsu wording is a simplified folk explanation, so don't present it as the exact mechanism.
- **"Bottom row" vs "lowest height".** Nishikado says "very bottom row" and Japanese sources say 最下段. Both mean the lowest height the invaders can reach before landing, not "the bottom row of the formation wherever it is". This is my reading of the code, and it agrees with every source.
- **Safe-zone gap.** Japanese guides say players hide in a gap of empty columns. This fits the code: the rolling shot only fires from the column above the cannon, and an empty column produces no shot. No source spells out that link, so treat it as my inference.
- **The "150k" figure.** It comes from an English translation of a 2000 interview. Score handling on the 4-digit counter isn't explained, so don't quote a number.
- **Game Center Arashi.**
  - The shmuplations interviewer (not Nishikado) says the manga introduced the public to the Nagoya shot.
  - Chunichi 2022b: Sugaya learned a similar trick, 不死鳥 ("phoenix", which does *not* leave one invader at the edge), from a university student he knew through ham radio.
  - Use neither claim without more checking.
- **The 60 Hz figure** is the CA nominal refresh rate. The real refresh is close to 60 Hz, and any small difference doesn't matter here.
- **A small error in CA-Overview prose.** It says the 2nd wave starts at Y=50. The table and code (`$0A10` uses rack count 1 → `$1DA3` = `$60`) show round 2 starts at `$60` and round 3 at `$50`. The code is the authority.

## Myths / wrong

- **"The lowest aliens can't shoot."** Wrong: they fire normally, but their shots can't hit you.
- **"Once the invaders are low, nothing can hit you."** Wrong: aliens one row higher (16 px up) can still kill you. Only aliens at the last height before landing are harmless.
- **"It works until they touch the ground."** It works only at that one height. One more drop is a landing, which is instant game over even with lives left.
- **"It was discovered in Nagoya."** Unproven. Nishikado doesn't know where the name came from, and Tomita argued Nagoya locals would hardly have named it after their own city.
- **"Enemy bullets spawn one row below the alien."** This is a common forum wording (for example on Lexaloffle). The real offset is 10 px below the alien's base, plus one 4 px move before the first draw, not a full 16 px row.
- **"The CPU drew faster when there were fewer aliens, so the game sped up."** This is EN-Wiki's paraphrase and is misleading. The game always moves exactly one alien per 1/60 s. Fewer aliens means a shorter round trip, so each alien moves more often. The frame rate does not change.
- **"The speed-up was a pure accident or bug."** Shaky. One alien per frame was Nishikado's deliberate answer to weak hardware (Wired 2023). The speed-up was a known side effect that he chose to keep (Retro Gamer via EN-Wiki).
- **"The last alien is just faster."** Partly right. It moves 3 px right but only 2 px left.
- **"The march sound matches the steps."** Wrong. It runs from a separate table and drifts out of sync (CA-Overview).
- **"Works in every version."** Wrong. It does not work in the Atari 2600 port or in some clones.

---

## Suggested safe one-line claims for narration (plain English)

1. "In Space Invaders, aliens that come all the way down can't hit you."
2. "Their shots are fired, but they can't hurt you."
3. "Each alien shot starts a little below the alien."
4. "The game only counts a hit in a thin strip at your cannon's height."
5. "When the aliens are right on top of you, their shots start below that strip."
6. "So the game never counts them as a hit."
7. "Aliens just one row higher can still kill you."
8. "One more step down, and the aliens land. Game over, even with lives left."
9. "Japanese players called it the Nagoya attack. Nobody knows for sure where the name came from."
10. "The creator called it a programming bug."
11. "Taito could have fixed it, but left it in."
12. "The game moves just one alien per frame, sixty per second."
13. "With 55 aliens, the whole army takes almost a second to step."
14. "With one alien left, it steps sixty times a second."
15. "The last alien moves three pixels right, but only two pixels left."
16. "The speed-up came from weak hardware, and the creator chose to keep it."
17. "The rolling shot always drops from the column right above you."

Avoid saying: "discovered in Nagoya", "the lowest aliens can't shoot", "nothing can hit you once they're low", "the speed-up was an accident", "works on every version".
