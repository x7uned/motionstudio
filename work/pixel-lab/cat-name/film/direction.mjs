// «Your cat knows its name. It just ignores you.» — direction: camera, the room, the front-facing cat's face (catface.mjs)
// on every word, the hidden speaker and its speech bubbles. One world: the living room at golden hour, the orange tabby
// sitting on the rug, looking at the viewer (its owner). Everything is a continuous function of t; the face and camera
// hold still at the seam (t = 0 ≡ END), and every cycle (breath, tail, drift) runs whole periods over END.
import { sm, ease, lerp, win, clamp01 } from "./layout.mjs";
import { EV, END, CALLS, BUBBLE_LIFE } from "./timeline.mjs";

const per = (t, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / END + ph);
const keys = (t, ks) => { if (t <= ks[0][0]) return ks[0][1]; for (let i = 0; i < ks.length - 1; i++) { const [a, va] = ks[i], [b, vb] = ks[i + 1]; if (t < b) return lerp(va, vb, ease((t - a) / (b - a))); } return ks[ks.length - 1][1]; };
/** attack–hold–release pulse (0..1..0) starting at a */
const pulse = (t, a, at = 0.14, hold = 0.35, rel = 0.55) => (t < a ? 0 : t < a + at ? ease((t - a) / at) : t < a + at + hold ? 1 : 1 - ease((t - a - at - hold) / rel));

export const SET = { cat: 60, speaker: 126 };

// ---------------------------------------------------------------- camera
export const CAMS = {
  FACE: { cx: 60, cy: -35.5, z: 6.6 },
  MED: { cx: 95, cy: -34, z: 3.6 },
  CLOSE: { cx: 64, cy: -35, z: 4.6 },
};
const C = CAMS, CAM = [
  { t: 0, ...C.FACE }, { t: EV.you1End - 0.25, ...C.FACE }, { t: EV.tokyo, ...C.MED },
  { t: EV.lessEnd - 0.1, ...C.MED }, { t: EV.bored + 0.25, ...C.CLOSE }, { t: EV.then1 - 0.05, ...C.CLOSE }, { t: EV.said - 0.25, ...C.MED },
  { t: EV.voiceEnd - 0.1, ...C.MED }, { t: EV.did, ...C.CLOSE }, { t: EV.stepEnd - 0.1, ...C.CLOSE }, { t: EV.team, ...C.MED },
  { t: EV.headsEnd - 0.2, ...C.MED }, { t: EV.dogs, ...C.CLOSE }, { t: EV.toEnd, ...C.CLOSE }, { t: EV.deaf - 0.1, ...C.MED },
  { t: EV.you2End - 0.15, ...C.MED }, { t: EV.ear + 0.15, ...C.FACE }, { t: END + 10, ...C.FACE },
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  const c = { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
  const q = 1.4 / c.z; c.cx += q * per(t, 3); c.cy += q * 0.7 * per(t, 2, 1.3);   // a slow hand-held drift, whole cycles
  return c;
}
/** camera moves (for the swoosh sounds): [t0, t1] of every key-to-key move that changes the view */
export const CAM_MOVES = CAM.slice(0, -1).map((a, i) => [a, CAM[i + 1]]).filter(([a, b]) => a.z !== b.z || a.cx !== b.cx).map(([a, b]) => [a.t, b.t]);

// ---------------------------------------------------------------- the room: golden hour, no lamps
export function world(t) { return { t, tod: 18.0, clock: 18.0, lampLiving: 0, lampBed: 0, bedBlanket: 1, curtainSwing: 0 }; }

// ---------------------------------------------------------------- the speaker and its speech bubbles
export const speakerVis = (t) => win(t, EV.hidden - 0.15, EV.heard - 0.1, 0.45, 0.6);
/** every call bubble at time t: { text, who, name, k (pop 0..1), a (alpha), age } */
export function bubbles(t) {
  const out = [];
  CALLS.forEach((c, i) => {
    // the three strangers of 2013 stack up over the speaker and stay until the owner's call
    const life = i >= 6 && i <= 8 ? CALLS[9].t - c.t - 0.05 : BUBBLE_LIFE, age = t - c.t; if (age < 0 || age > life + 0.3) return;
    out.push({ ...c, i, age, k: sm(age, 0, 0.28), a: 1 - sm(age, life, life + 0.3) }); });
  return out;
}
/** speaker cone thump: strongest in the first half second of each call (two syllables) */
export function speakerBeat(t) { let v = 0; for (const c of CALLS) { const a = t - c.t; if (a < 0 || a > 0.6) continue; v = Math.max(v, Math.sin(Math.PI * Math.min(1, a / 0.25)) * (a < 0.25 ? 1 : 0.6) + (a > 0.27 && a < 0.5 ? 0.6 * Math.sin(Math.PI * (a - 0.27) / 0.23) : 0)); } return clamp01(v); }

// the owner's call at the hook and at the end (off screen, left): bubble k and alpha; held through the seam
export const HOOK_CALL = { t: EV.one - 0.12 };
export function hookBubble(t) {
  const end = sm(t, HOOK_CALL.t, HOOK_CALL.t + 0.28);                // pops on "one", stays through the seam
  const start = 1 - sm(t, EV.ignores + 0.45, EV.you1End - 0.05);     // fades as the cat closes its eyes on "ignores you"
  return t > END / 2 ? { k: end, a: 1 } : { k: 1, a: start };
}

// ---------------------------------------------------------------- the face
// lids 0 open .. 0.55 soft .. 1 closed; look [x, y]; tilt −1..1; ear −1 flat .. 1 perked; earTwitch (screen-right ear,
// toward the speaker) / earTwitchL (screen-left ear, toward the owner's call at the hook); mouth (yawn); pupil.
const HOOK = { lid: 0.42, look: [0.75, -0.12], tilt: 0.22 };
function callResp(t) {
  // the right ear and the eyes answer each speaker call, scaled by the call's response; quick in, slow out
  let ear = 0, look = 0, tilt = 0;
  for (const c of CALLS) { const p = pulse(t, c.t + 0.08, 0.16, c.name || c.who === "owner" ? 1.6 : 0.3, 0.6) * c.resp; ear = Math.max(ear, p); if (c.name || c.who === "owner" || c.resp > 0.6) { look = Math.max(look, p); tilt = Math.max(tilt, p * (c.name || c.who === "owner" ? 1 : 0.4)); } }
  return { ear, look, tilt };
}
export function face(t) {
  const r = callResp(t);
  // lids: hook (unbothered, then closes on "ignores you"), habituation droop, yawn, wide on the name, slow blink on
  // "they answer when they want to", and back to the hook state at the end
  const lid = keys(t, [
    [0, HOOK.lid], [EV.ignores - 0.05, HOOK.lid], [EV.ignores + 0.55, 0.88], [EV.you1End + 0.1, 0.88], [EV.y2019 + 0.4, 0.12],
    [CALLS[0].t, 0.08], [CALLS[1].t, 0.16], [CALLS[2].t, 0.3], [CALLS[3].t, 0.46], [EV.bored - 0.1, 0.52], [EV.bored + 0.35, 0.95], [EV.boredEnd + 0.05, 0.62],
    [CALLS[4].t + 0.05, 0.62], [CALLS[4].t + 0.3, 0], [EV.againEnd, 0], [EV.tell, 0.1], [EV.voiceEnd, 0.1],
    [EV.dogs, 0.15], [EV.never + 0.2, 0.5], [EV.usEnd, 0.42], [EV.answer - 0.05, 0.2],
    [EV.want - 0.3, 0.5], [EV.want + 0.15, 1], [EV.toEnd + 0.2, 1], [EV.so2 + 0.3, 0.15], [EV.heard, 0.05],
    [EV.ear + 0.15, 0.05], [EV.tells + 0.15, HOOK.lid], [END, HOOK.lid],
  ]);
  // looking: away (hook), at the viewer, toward the speaker (screen right) on calls
  const lookX = keys(t, [[0, HOOK.look[0]], [EV.ignores + 0.3, HOOK.look[0]], [EV.y2019 + 0.3, 0], [EV.tells - 0.05, 0], [EV.tells + 0.4, HOOK.look[0]], [END, HOOK.look[0]]]);
  const lookY = keys(t, [[0, HOOK.look[1]], [EV.ignores + 0.3, HOOK.look[1]], [EV.y2019 + 0.3, 0], [EV.tells - 0.05, 0], [EV.tells + 0.4, HOOK.look[1]], [END, HOOK.look[1]]]);
  const look = [clamp01(lookX + 0.8 * r.look * (1 - lookX)), lookY * (1 - r.look)];
  // head tilt: hook (chin away), toward the speaker on the name / owner / "turned their heads", curious on "confused"
  const tiltK = keys(t, [[0, HOOK.tilt], [EV.ignores - 0.05, HOOK.tilt], [EV.ignores + 0.6, 0.42], [EV.you1End + 0.1, 0.42], [EV.y2019 + 0.4, 0],
    [EV.tells - 0.05, 0], [EV.tells + 0.45, HOOK.tilt], [END, HOOK.tilt]]);
  const tilt = tiltK + 0.55 * r.tilt + 0.5 * pulse(t, EV.head2 - 0.05, 0.25, 0.25, 0.5) + 0.6 * pulse(t, EV.turned2 - 0.1, 0.3, 0.5, 0.6) - 0.35 * pulse(t, EV.confused - 0.05, 0.3, 0.35, 0.5) - 0.25 * pulse(t, EV.never, 0.3, 0.6, 0.6);
  // ears: perk on the name, the owner and "isn't deaf"; flicks on "ears"
  const ear = 0.9 * pulse(t, CALLS[4].t + 0.05, 0.2, 2.2, 0.7) + 0.8 * pulse(t, CALLS[9].t + 0.05, 0.2, 2.0, 0.7) + 0.6 * pulse(t, EV.deaf - 0.05, 0.2, 0.9, 0.6) + 0.3 * pulse(t, EV.stranger, 0.2, 0.8, 0.6);
  const flick = pulse(t, EV.ears3 - 0.02, 0.1, 0.12, 0.25) + 0.7 * pulse(t, EV.deaf + 0.1, 0.1, 0.12, 0.25);
  const earTwitch = clamp01(Math.max(r.ear, flick));
  // the left ear: turned to the owner's call at the hook, a small flutter right after frame 0, back to the call at the end
  const earTwitchL = clamp01(keys(t, [[0, 1], [0.25, 0.72], [0.5, 1], [EV.ignores + 0.6, 1], [EV.you1End + 0.4, 0], [EV.ear - 0.08, 0], [EV.ear + 0.22, 1], [END, 1]]) + flick);
  const mouth = pulse(t, EV.bored - 0.05, 0.35, 0.25, 0.4) * 0.95;
  const pupil = 0.55 + 0.4 * Math.max(pulse(t, CALLS[4].t, 0.25, 1.8, 0.8), pulse(t, CALLS[9].t, 0.25, 1.5, 0.8));
  return {
    lid: clamp01(lid), look, tilt: Math.max(-1, Math.min(1, tilt)), ear: Math.max(-1, Math.min(1, ear)), earTwitch, earTwitchL, mouth, pupil,
    breath: (14 * t) / END, tail: (16 * t) / END, tailAmt: 0.55 - 0.4 * win(t, EV.tail - 0.4, EV.stepEnd, 0.4, 0.6),
    purrAmt: win(t, EV.want, EV.toEnd + 0.3, 0.3, 0.4),
  };
}
/** heart over the head after the slow blink */
export const heartK = (t) => win(t, EV.want + 0.25, EV.so2 + 0.2, 0.35, 0.4);
