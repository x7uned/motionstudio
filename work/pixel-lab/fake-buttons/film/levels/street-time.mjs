// STREET timing for «Fake buttons»: every street beat derived from the timeline's words (EV), PRESSES and the one signal
// schedule walkAt(). Shared by the picture (street*.mjs) and the sound list (street-motions.mjs), so every sound lasts
// exactly as long as its motion.
import { EV, PRESSES, WALK_ON, walkAt, END, BACK_TO_CORNER, PAN_TO_LOBBY } from "../timeline.mjs";
export { EV, PRESSES, WALK_ON, walkAt, END };

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));

// ---------------------------------------------------------------- presses (the hero leans 3 px in; the button sinks)
export const PRESS = { in: 0.07, hold: 0.08, out: 0.16 };
/** 0 → 1 → 0 around each press (1 = fingertip fully on the button). */
export function pressAt(t) {
  let v = 0;
  for (const p of PRESSES) {
    const u = t - p; if (u < -PRESS.in || u > PRESS.hold + PRESS.out) continue;
    v = Math.max(v, u < 0 ? ease((u + PRESS.in) / PRESS.in) : u < PRESS.hold ? 1 : 1 - ease((u - PRESS.hold) / PRESS.out));
  }
  return v;
}
/** The tiny WAIT lamp on the box: lights on each press, glows ~0.5 s, fades. */
export function waitLampAt(t) {
  let v = 0;
  for (const p of PRESSES) { const u = t - p; if (u < -0.02 || u > 0.9) continue; v = Math.max(v, Math.min(sm(u, -0.02, 0.06), 1 - sm(u, 0.45, 0.9))); }
  return v;
}

// ---------------------------------------------------------------- the hero's pose segments ([t0, row, frames, s/frame])
// rows: 0 idle · 1 wave · 2 talk · 3 shrug · 4 point · 5 think · 6 arms crossed · 7 surprised · 8 hands at chest · 9 excited
export const POINT_SEGS = [[0, EV.start + 1.2], [EV.pressing2 - 0.2, EV.control + 0.9], [EV.button3 - 0.25, EV.light - 0.2]];
export const HERO_POSES = [
  [0, 4, [4], 9],                                   // pressing the button again and again (fingertip on the button)
  [EV.life + 0.25, 4, [3, 4], 0.45],                // a little life between the bursts
  [EV.crosswalk - 0.12, 4, [4], 9],
  [POINT_SEGS[0][1], 2, [0, 1, 2, 3, 4, 5], 0.3],  // "In New York, computers took over…" — explaining
  [EV.traffic - 0.02, 3, [0, 1, 2, 3, 4, 5], 0.3], // the light changes BY ITSELF: open hands, "see?"
  [EV.y2004 - 0.25, 6, [0, 1, 2, 3, 4, 5], 0.36],   // arms crossed for the numbers
  [EV.nothing - 0.06, 7, [0, 1, 2, 3, 4, 5], 0.28],  // surprised on "nothing"
  [PAN_TO_LOBBY[1] + 0.4, 0, [0, 1, 3, 4, 5, 6], 0.4],   // off screen: idle
  [BACK_TO_CORNER[0] - 0.2, 8, [0, 3], 1.7],        // hands at the chest, holding the phone
  [EV.recorded - 0.04, 3, [0, 1, 2, 3, 4, 5], 0.3],// "It's a recorded sound." — shrug
  [EV.so - 0.06, 5, [0, 1, 2, 3, 4, 5], 0.36],       // "So why keep them?" — think
  [POINT_SEGS[1][0], 4, [4], 9],                    // "Pressing something…" — presses, smiling
  [POINT_SEGS[1][1], 4, [2, 4], 0.4],
  [EV.good - 0.08, 9, [0, 2, 3, 5], 0.3],     // "…feels good" — excited
  [POINT_SEGS[2][0], 4, [4], 9],                    // "The button doesn't change the light." — presses again
  [POINT_SEGS[2][1], 0, [0, 1, 3, 4], 0.3],         // …waits; the light turns WALK by itself
  [EV.changes - 0.06, 9, [0, 2, 3, 5], 0.3],  // "It changes how you feel." — excited, a heart
  [EV.feelEnd + 0.45, 0, [0, 1, 3, 4], 0.4],        // calm while the share card comes in
  [EV.send - 0.12, 1, [0, 1, 2, 3, 2, 1], 0.24],    // waves on "Send it to a friend"
  [EV.follow + 0.15, 9, [0, 2, 3, 5], 0.32],  // happy
  [EV.next + 0.2, 0, [0, 1, 2, 3, 4, 5, 6], 0.4],  // calm idle to the end (frame 2 = wink)
];
// little hops: startled on "nothing", happy on "good" and on "changes"
export const HOPS = [[EV.nothing - 0.02, EV.nothing + 0.38, 9], [EV.good - 0.02, EV.good + 0.36, 7], [EV.changes, EV.changes + 0.36, 7]];
/** Weight of the "pointing at the button" stance (eases the 3-px lean baseline in/out with the pose). */
export function pointW(t) { let v = 0; for (const [a, b] of POINT_SEGS) v = Math.max(v, Math.min(a <= 0 ? 1 : sm(t, a - 0.05, a + 0.2), 1 - sm(t, b - 0.05, b + 0.2))); return v; }
export const LEAN = 3;
/** Hero x offset: rests 3 px short of the button while pointing, leans onto it at each press. */
export function heroDX(t) { return -LEAN * pointW(t) + LEAN * pressAt(t); }

// ---------------------------------------------------------------- box highlight, cabinet, lens, phone, pickups
export const HILITE = [EV.start - 0.05, EV.button1 + 0.3];               // pulsing outline on "Start with the crosswalk button."
export const SCREEN_ON = [EV.computers - 0.04, EV.computers + 0.26];     // the cabinet's screen lights up on "computers"
export const LENS = { open: [EV.switched - 0.06, EV.off + 0.12], unplug: [EV.off - 0.08, EV.off + 0.22], cross: [EV.off + 0.2, EV.off + 0.45], tag: [EV.off + 0.4, EV.off + 0.9], close: [EV.nothing + 0.12, EV.allEnd - 0.1] };
export const PHONE = { in: [BACK_TO_CORNER[0] - 0.1, BACK_TO_CORNER[0] + 0.25], lift: [EV.camera - 0.2, EV.click - 0.04], out: [EV.recorded - 0.1, EV.recorded + 0.16] };
export const FLASH = [EV.click - 0.03, EV.click + 0.24];                    // white flash: up 0.09 s (peak on the word), down 0.18 s
export const CLICK_POP = [EV.click, EV.click + 1.3];
export const CONTROL_POP = [EV.control - 0.05, EV.control + 1.5];
export const HEART = [EV.changes + 0.02, EV.feelEnd + 0.7];

// ---------------------------------------------------------------- vehicle signal (red for cars while WALK, with yellow + all-red)
export const CAR_RED = WALK_ON.map(([a, b]) => [a - 2.0, b + 0.35]);      // all-red 2 s before WALK: committed cars clear the zebra
export const CAR_YELLOW = WALK_ON.map(([a]) => [a - 3.3, a - 2.0]);
/** 0 green · 1 yellow · 2 red */
export function carLightAt(t) { for (const [a, b] of CAR_RED) if (t >= a && t < b) return 2; for (const [a, b] of CAR_YELLOW) if (t >= a && t < b) return 1; return 0; }
/** Crossfade weight of WALK (0 = DON'T WALK hand, 1 = walking man), ramped over 0.18 s (never a one-frame swap). */
export const WALK_XF = 0.22;
export function walkK(t) { let v = 0; for (const [a, b] of WALK_ON) v = Math.max(v, Math.min(sm(t, a, a + WALK_XF), 1 - sm(t, b, b + WALK_XF))); return v; }
/** Each lamp of the car signal, crossfaded (g, y, r). */
export function carLamps(t) {
  const on = (segs) => { let v = 0; for (const [a, b] of segs) v = Math.max(v, Math.min(sm(t, a, a + 0.12), 1 - sm(t, b, b + 0.12))); return v; };
  const y = on(CAR_YELLOW), r = on(CAR_RED); return { g: clamp01(1 - y - r), y, r };
}
/** Seconds left on the cabinet's AUTO timer (counts to the next WALK); null while WALK is on. */
export function autoLeft(t) { if (walkAt(t)) return null; for (const [a] of WALK_ON) if (t < a) return a - t; return null; }
