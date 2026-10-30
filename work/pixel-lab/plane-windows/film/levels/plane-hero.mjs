// Builder PLANE · the channel's character inside the hero window (levels/hero.mjs, grade "cabin"), clipped to the
// window opening (inside the cabin bezel), so his face sits in the window and his body continues below the sill.
// Poses on the narration beats; the sprite is never redrawn, only posed (crossfades come from makeHero).
import { makeHero } from "./hero.mjs";
import { sdRR, HW, HH, BEZ, radiusOf, winScreen, bob, EV } from "./plane-kit.mjs";
import { HERO_X, HERO_FEET } from "../timeline.mjs";

// [t0, row, frames, seconds per frame] — rows: 0 idle · 1 wave · 2 talk · 3 shrug · 4 point · 5 think · 6 arms crossed · 7 surprised · 8 hands together · 9 excited
export const POSES = [
  [0, 1, [1, 2, 1, 2, 1], 0.32],                       // hello: waves from his round window
  [1.62, 0, [0, 1, 0, 3], 0.7],                         // looks out
  [EV.tore1 - 0.06, 7, [0, 2, 3], 0.32],               // "…tore planes apart": a startled flinch
  [EV.apart1End + 0.05, 0, [0, 3, 4, 0], 0.7],
  [EV.y1954 - 0.05, 5, [0, 1, 2, 1], 0.9],     // the 1954 Comet: thinks
  [EV.every1 - 0.1, 2, [0, 1, 2, 3, 4, 5], 0.42],              // "the cabin is pumped up …": explains
  [EV.each - 0.1, 0, [0, 1, 0, 3], 0.75],
  [EV.sharp1 - 0.05, 6, [0, 1, 2, 1], 0.8],              // "Sharp corners collect that stress": arms crossed
  [EV.flight2 - 0.1, 5, [0, 1, 2, 1], 0.95],              // flight after flight: worried thinking
  [EV.tore2 - 0.08, 7, [0, 2, 3, 4], 0.34],         // "the metal tore open": surprised, hands up
  [EV.round2 + 0.05, 3, [0, 1, 2, 3, 4, 5], 0.5],              // "Round corners spread the stress evenly": open hands
  [EV.rounded - 0.12, 9, [1, 3, 4], 0.34],                  // "rounded windows": happy
  [EV.windows2End + 0.25, 0, [0, 1, 0], 0.6],
  [EV.hole1 - 0.25, 3, [0, 1, 2, 3, 4, 5], 0.45],              // "And that tiny hole?": open hands (the hole sits lower left; row 4 points up-right)
  [EV.window2 - 0.1, 2, [0, 1, 2, 3, 4, 5], 0.42],             // "Your window has three layers" … explains the hole
  [EV.middle2 - 0.05, 7, [0, 2, 1], 0.36],                    // the backup test: the outer pane "cracks"
  [EV.backupEnd + 0.1, 0, [0, 1], 0.6],
  [EV.also - 0.08, 2, [0, 1, 2, 3, 4, 5], 0.42],               // moisture / fog
  [EV.little - 0.1, 3, [0, 1, 2, 3, 4, 5], 0.4],              // "isn't a flaw"
  [EV.safety - 0.1, 9, [1, 2, 3, 4, 5], 0.32],               // "It's a safety feature."
  [EV.liked - 0.05, 0, [0, 1], 0.55],
  [EV.send - 0.08, 1, [1, 2, 1, 2, 1], 0.32],           // "Send it to a friend": waves
  [EV.send + 1.55, 0, [0, 1, 0, 3, 2, 0, 1], 0.7],    // calm to the end (a wink on the way)
];

export const HERO = makeHero({ poses: POSES, grade: "cabin", x: () => HERO_X, y: (t) => HERO_FEET + bob(t) });

export function drawHero(c, V, t) {
  const [sx, sy] = winScreen(V, t, 0), r = radiusOf(0, t);
  HERO.draw(c, V, t, { clip: (X, Y) => sdRR(X - sx + 0.5, Y - sy + 0.5, HW, HH, r) < -BEZ });
}
