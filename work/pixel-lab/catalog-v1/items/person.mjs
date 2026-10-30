// catalog-v1 item «person»: a generic chibi office worker facing the camera (white shirt, red tie, blue lanyard badge, navy
// trousers, side-parted brown hair), ported from work/pixel-lab/fake-buttons/film/levels/building-people.mjs drawPerson
// (copy in lib/fakebuttons-people.mjs, CAST.worker, front view). Not the channel's recurring hero. Arm poses are
// continuous angles eased by the engine; expressions crossfade through Bayer gates, so nothing switches in one frame.
import { drawPerson, CAST } from "./lib/fakebuttons-people.mjs";
import { blinkAt, shadow } from "./lib/cute.mjs";

const CFG = CAST.worker, MID = 81;            // drawing spans y −162…+1 around the feet at scale 1; ground = centre + MID·S
const TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const mixA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const SH_Y = -93;                              // shoulder height (feet = 0) at rest
const lerpAng = (a, b, k) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * k;   // shortest way round
export default {
  kind: "person",
  covers: ["person"],
  source: "fake-buttons/film/levels/building-people.mjs#drawPerson (CAST.worker, front view)",
  desc: "friendly chibi office worker facing the camera: white shirt, red tie, badge; blinks and breathes",
  hw: 48, hh: 82, start: "stands, breathes, blinks",
  states: {
    stand: [0.5, "stands relaxed, arms down"],
    wave: [0.5, "raises a hand and waves with a big happy smile", "blip"],
    point: [0.45, "points an arm at its target prop and looks at it", "whoosh"],
    talk: [0.4, "talks: mouth opens and closes, one hand gestures", "blip"],
    shrug: [0.5, "shrugs: palms up, worried brows, wavy mouth", "swish"],
    surprised: [0.35, "hops a little: hands up, eyes wide, mouth an O", "rise"],
  },
  base: { look: 0, point: 0, wave: 0, talk: 0, shrug: 0, surp: 0 },
  st: {
    stand: { look: 0, point: 0, wave: 0, talk: 0, shrug: 0, surp: 0 },
    wave: { look: 0, point: 0, wave: 1, talk: 0, shrug: 0, surp: 0 },
    point: { look: 1, point: 1, wave: 0, talk: 0, shrug: 0, surp: 0 },
    talk: { look: 0, point: 0, wave: 0, talk: 1, shrug: 0, surp: 0 },
    shrug: { look: 0, point: 0, wave: 0, talk: 0, shrug: 1, surp: 0 },
    surprised: { look: 0, point: 0, wave: 0, talk: 0, shrug: 0, surp: 1 },
  },
  demo: { target: true },
  notes: "Generic office worker (CAST.worker), front view only; the rig's side view (walk, reach IK) is not used. Hands are round fists, so point reads as reaching toward the target (the arm on the target's side, blended smoothly). Volumes, eyes and blush are re-rasterised crisp at any zoom; the pixel-level details (brows, mouth, tie, badge, hair gloss) scale as blocks and look 2x chunky next to the 1-px outlines in close-ups. Expressions crossfade by Bayer gates (talk alternates smile / O mouth).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(z * 100) / 100, gx = cx, hop = 5 * Math.sin(Math.PI * s.acc("surprised")) * v.surp;
    const gy = cy + MID * S;
    // target direction from the shoulders (screen) → arm angle (0 = down, + = toward +x) and gaze
    let aim = null, wR = 1, look = [0, 0.1];
    if (s.look) { const dx = s.look[0] - gx, dy = s.look[1] - (gy + SH_Y * S), d = Math.hypot(dx, dy) || 1; aim = [dx / d, dy / d]; wR = sm(dx, -24 * S, 24 * S);
      look = [aim[0] * v.look * s.lookK, 0.1 + (aim[1] - 0.1) * v.look * s.lookK]; }
    const aimA = aim ? lerpAng(2.1, Math.atan2(aim[0], aim[1]), s.lookK) : 2.1;   // eases with the target's presence
    // arm poses [shoulder, elbow] per state, mixed in sequence by the eased parameters
    let R = [0.12, 0.08], L = [-0.12, -0.08];
    R = mixA(R, [2.35, -0.2 + 0.42 * Math.sin(TAU * 2.3 * t)], v.wave);
    R = mixA(R, [0.5, 1.05 + 0.28 * Math.sin(TAU * 1.4 * t)], v.talk);
    R = mixA(R, [Math.max(0.35, Math.min(2.9, aim ? aimA : 2.1)), 0], v.point * wR);
    L = mixA(L, [Math.min(-0.35, Math.max(-2.9, aim ? aimA : -2.1)), 0], v.point * (1 - wR));
    R = mixA(R, [0.78, 1.5], v.shrug); L = mixA(L, [-0.78, -1.5], v.shrug);
    R = mixA(R, [0.5, 2.05], v.surp); L = mixA(L, [-0.5, -2.05], v.surp);
    // expressions (weights; the rest of the face area keeps the neutral face)
    const talkW = v.talk * (0.5 - 0.5 * Math.cos(TAU * 3.1 * t));
    const faces = [[Math.max(0, 1 - talkW - v.wave - v.shrug - v.surp), {}], [talkW, { mouth: "o" }], [v.wave, { eyes: "happy", mouth: "grin", blush: 1 }],
      [v.shrug, { mouth: "wavy", brow: 1, browIn: -1 }], [v.surp, { mouth: "o", brow: 1, wide: 1 }]];
    shadow(c, gx, gy + S, 34 * S, 6 * S);
    const A = drawPerson(c, CFG, { x: gx, y: gy - hop * S, S, view: "front", dir: 1, armF: R, armB: L, look, blink: blinkAt(t, 4.3, 1.1), mouth: "smile", eyes: "open", blush: 0.6,
      bob: 0.6 * Math.sin(TAU * 0.32 * t) - 1.5 * v.shrug, tilt: 0.1 * v.shrug - 0.04 * v.surp + 0.03 * v.talk * Math.sin(TAU * 0.9 * t), faces });
    const hx = A.head[0], hy = A.head[1];
    return { box: { x0: gx - 36 * S, y0: gy - 162 * S, x1: gx + 36 * S, y1: gy + 2 * S }, pt: [hx, hy], face: [hx, hy + 4 * S], faceBox: { x0: hx - 34 * S, y0: hy - 34 * S, x1: hx + 34 * S, y1: hy + 30 * S } };
  },
};
