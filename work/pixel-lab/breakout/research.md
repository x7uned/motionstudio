# Breakout (Atari arcade, 1976) research (2026-10-26, research subagent)

Main source M = Atari Operation/Maintenance/Service Manual (full text): https://archive.org/stream/ArcadeGameManualBreakout/breakout_djvu.txt
Secondary W = https://en.wikipedia.org/wiki/Breakout_(video_game)

1. Paddle shrinks to half — CONFIRMED. M §1.2 "when a 'breakout' occurs the width of the paddle is reduced to one half its normal size" (breakout = ball through an opening in the wall). W: trigger is the ball passing the red row and hitting the top wall. Paddle back to full width on the next serve (M §3.3.3). 2600 also shrinks (fraction uncertain).
2. Speed-ups — CONFIRMED with correction. M §3.3.3: three speed-ups per serve (4 speeds): 4th hit, 12th hit, and hitting any 5- or 7-point (orange/red) brick jumps straight to the fastest speed. Speed resets at every new serve. Myth: orange and red each add a separate step.
3. Bricks — 8 rows × 14, four colour strips of 2 rows each, bottom→top yellow, green, orange, red; points 1/3/5/7 (NOT 1/4/7). 448 per wall, 896 max per game. After the second wall no more bricks (M); the ball bounces on an empty screen (W).
4. Serves — operator switch 3 or 5 per play (M §2.4).
5. Woz/Jobs — Woz built a prototype in 4 nights with 44 chips; Atari's production board did not use it (~100 chips). Dollar figures disputed. Not used in the script.
6. Colours fake — CONFIRMED. M §1.1 19-inch black-and-white monitor; M §3.2.3 "Four transparent strips, each a different color, are affixed to the surface of the picture tube."
   Paddle zones — CONFIRMED. M §3.3.3 ball rebounds "in any of 4 directions, depending on which portion of the paddle was hit"; incoming angle does not matter; also at half width.
   Attract mode: full-width row of paddles, no sound (M §3.3.2).
Avoid: 1/4/7 points; "five speeds"; "always 3 balls"; Woz board shipped; exact $ figures; "angles get steeper with speed" (unconfirmed).
