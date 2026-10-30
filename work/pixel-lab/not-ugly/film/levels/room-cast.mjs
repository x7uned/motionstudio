// «You're not ugly» — the cast of the room (Builder ROOM): YOU (adapted recurring hero), your reflection in the standing
// mirror, YOUR FRIEND (the channel's sprite, grade "lamp", mirrored to face you), the phone (in your fist → floats to the
// friend like a game item → held, REC → pocketed), the dotted "30 CM" → "1.5 M" line, talk rings, bone pulses, hearts.
// Pure functions of t (EV-anchored beats in room-times.mjs); every pose / face / facing change is continuous.
import { EV, YOU_X, FRIEND_X, LAND, MIRROR } from "../timeline.mjs";
import { Canvas, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { makeHero, AX, FOOT } from "./hero.mjs";
import { drawYou, gate } from "./room-person.mjs";
import { drawPhone, heart, sparkle, pill, dimLine, arc, ring, recLabel } from "./room-props.mjs";
import { GLASS, inGlass, LAMP } from "./room-set.mjs";
import { T, FRIEND_POSES, TALK_WORDS } from "./room-times.mjs";

const R = Math.round, PI = Math.PI, clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ramp = (t, a, b) => ease((t - a) / (b - a));
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(ramp(t, a, a + fi), 1 - ramp(t, b, b + fo));
const blinkAt = (t, every = 3.7, ph = 0) => { const p = ((t + ph) % every + every) % every, d = 0.2; return p < d ? Math.sin((PI * p) / d) : 0; };
const L2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
const LIGHT_YOU = [0.85, -0.55];                  // the lamp is to your right (screen)
/** Phone centre for a grip point: the fist holds its lower part (5.5 px down the phone's long axis). */
const inHand = (x, y, ang, s = 1) => [x + Math.sin(ang) * 6.5 * s, y - Math.cos(ang) * 6.5 * s];

// ================================================================ YOU: state at time t
const FACE_KEYS = [
  [-1, "sad"], [T.selfieUp[0] + 0.1, "pose"], [EV.nose - 0.1, "worried"], [T.fly[0] - 0.05, "surprised"], [EV.away, "neutral"],
  [EV.nobody + 0.1, "pose"], [EV.photos - 0.1, "neutral"], [EV.wrong - 0.05, "worried"], [EV.flipped + 0.35, "neutral"],
  [EV.like - 0.08, "happy"], [EV.y1977 - 0.1, "neutral"], [EV.chose1 - 0.05, "pose"], [EV.friends + 0.05, "surprised"], [EV.real - 0.15, "happy"],
  [EV.voice1 - 0.4, "talk"], [EV.deeper - 0.08, "deep"], [EV.deeperEnd + 0.25, "neutral"], [EV.only - 0.2, "wince"],
  [EV.air2End + 0.3, "neutral"], [EV.higher - 0.1, "happy"], [T.hop[0] - 0.08, "joy"], [T.hop[1] + 0.3, "happy"], [EV.next, "pose"],
];
const LOOK_KEYS = [
  [-1, [0.25, 0.95]], [T.selfieUp[0] + 0.15, [0.7, -0.6]], [T.fly[0], [1, -0.3]], [T.fly[1], [1, 0.25]], [T.fly[1] + 0.6, [1, 0]],
  [T.chin[0] + 0.1, [0.3, -0.9]], [T.chin[1], [1, 0]], [T.wave[1], [0.8, 0.1]],
];
function faceAt(t) {
  let i = 0; while (i < FACE_KEYS.length - 1 && FACE_KEYS[i + 1][0] <= t) i++;
  const k = i === 0 ? 1 : ramp(t, FACE_KEYS[i][0], FACE_KEYS[i][0] + 0.22);
  return { faceA: i ? FACE_KEYS[i - 1][1] : FACE_KEYS[0][1], faceB: FACE_KEYS[i][1], faceK: k };
}
function lookAt(t) { let i = 0; while (i < LOOK_KEYS.length - 1 && LOOK_KEYS[i + 1][0] <= t) i++; const k = i === 0 ? 1 : ramp(t, LOOK_KEYS[i][0], LOOK_KEYS[i][0] + 0.3); return L2(i ? LOOK_KEYS[i - 1][1] : LOOK_KEYS[0][1], LOOK_KEYS[i][1], k); }
/** Mouth opening while you "talk" along the narration (26–34 s): opens and closes with every word. */
export function talkOpen(t) {
  let v = 0;
  for (const w of TALK_WORDS) { if (t < w.start - 0.03 || t > w.end + 0.03) continue; const u = clamp01((t - w.start + 0.03) / (w.end - w.start + 0.06)); v = Math.max(v, Math.pow(Math.sin(PI * u), 0.7) * (0.55 + 0.45 * ((w.start * 7.13) % 1))); }
  return v;
}
/** Facing: +1 right (toward the friend), −1 left (toward the mirror); turns squash and crossfade (never one frame). */
export function facingAt(t) {
  for (const [a, b, from] of [[T.turnTo[0], T.turnTo[1], 1], [T.turnBack[0], T.turnBack[1], -1]]) {
    if (t > a && t < b) { const u = (t - a) / (b - a), sq = 1 - 0.62 * Math.pow(Math.sin(PI * u), 1.5); return { from, to: -from, sq, k: ramp(u, 0.33, 0.67), u }; }
  }
  const f = t >= T.turnTo[1] && t <= T.turnBack[0] ? -1 : 1; return { from: f, to: f, sq: 1, k: 1, u: 0 };
}

export function youState(t) {
  const selfieIn = ramp(t, ...T.selfieUp), selfieOut = ramp(t, ...T.selfieDown);
  const phoneLow = 1 - selfieIn, selfie = selfieIn * (1 - selfieOut);
  const jaw = win(t, T.jaw[0], T.jaw[1], 0.3, 0.35), cringe = win(t, T.cringe[0], T.cringe[1], 0.3, 0.4), chin = win(t, T.chin[0], T.chin[1], 0.4, 0.45);
  const yay = win(t, T.yay[0], T.yay[1], 0.25, 0.4), hopFist = win(t, T.hop[0] - 0.14, T.hop[1] + 0.25, 0.15, 0.4), wave = win(t, T.wave[0], T.wave[1], 0.35, 0.5);
  const u = (t - T.hop[0]) / (T.hop[1] - T.hop[0]), lift = u > 0 && u < 1 ? 8.5 * Math.sin(PI * u) : 0;
  const deep = win(t, T.deeper[0], T.deeper[1], 0.18, 0.35);
  const squat = 0.55 * deep + 0.4 * win(t, T.hop[0] - 0.17, T.hop[0] + 0.02, 0.1, 0.07) + 0.45 * win(t, T.hop[1] - 0.03, T.hop[1] + 0.08, 0.05, 0.22);
  const open = talkOpen(t), holding = t < T.fly[0] + 0.02;
  const wrongSlump = win(t, EV.wrong - 0.1, EV.flipped + 0.2, 0.3, 0.4);
  return {
    p: t / 3.6, slump: Math.max(1 - ramp(t, T.selfieUp[0] - 0.1, T.selfieUp[0] + 0.45), 0.3 * wrongSlump, 0.25 * cringe),
    arms: { n: [["phoneLow", phoneLow], ["selfie", selfie], ["jaw", jaw], ["chest", cringe], ["chin", chin], ["fist", Math.max(yay, hopFist)], ["wave", wave]], f: [["chest", cringe]] },
    selfieA: 2.36, waveP: (t - T.wave[0]) * 1.7,
    openN: holding ? 0 : Math.min(ramp(t, ...T.handOpen), 1 - 0.75 * cringe, 1 - Math.max(yay, hopFist)), openF: 1 - 0.7 * cringe,
    head: -0.2 * selfie - 0.1 * chin + 0.05 * open + 0.12 * deep + 0.08 * cringe - 0.06 * win(t, EV.like - 0.1, EV.version + 0.3),
    lean: -0.03 * selfie - 0.06 * cringe, shrug: 1.6 * cringe + 0.4 * yay, squat, lift, pomK: u > 0 && u < 1.6 ? 0.9 * Math.sin(PI * Math.min(1, u / 1.4)) : 0,
    ...faceAt(t), open, blink: blinkAt(t, 3.3, 0.4), look: lookAt(t), light: LIGHT_YOU,
    // the phone in your hand: chest (screen up toward your eyes) → arm's length (back to us, lens and sticker visible)
    phoneAng: lerp(0.75, -0.08, selfieIn), phoneTurn: lerp(-0.42, 0.5, selfieIn), holding,
  };
}

// ================================================================ the friend (channel sprite) and his phone anchors
export const FRIEND = makeHero({ poses: FRIEND_POSES, mirror: [{ t: [-2, -1.9], sq: [-2, -1.9], to: 1 }], grade: "lamp", x: () => FRIEND_X, y: () => LAND });
// where the phone sits in his hands, per sprite cell (cell px; the phone's centre)
const ANCHOR = {
  8: [[101, 116], [101, 116], [101, 117], [101, 116], [101, 116], [101, 116]],
  9: [[87, 98], [84, 93], [76, 77], [87, 96], [82, 91], [82, 97]],
  4: [[75, 137], [75, 136], [66, 132], [75, 136], [75, 136], [76, 136]],
};
const POCKET = [114, 146];
const anchorCell = (row, f) => ANCHOR[row]?.[f] ?? POCKET;
function friendAnchor(V, t) {
  const st = FRIEND.state(t), a = anchorCell(...st.A), b = anchorCell(...st.B), k = st.k, u = lerp(a[0], b[0], k), v = lerp(a[1], b[1], k);
  const held = (ANCHOR[st.A[0]] ? 1 - k : 0) + (ANCHOR[st.B[0]] ? k : 0);
  return { x: V.X(FRIEND_X) - (u - AX) * st.sq, y: V.Y(LAND) - st.lift + (v - FOOT), row: st.k < 0.5 ? st.A[0] : st.B[0], held };
}

// ================================================================ drawing helpers
const SCRATCH = new Canvas(540, 960, "#000000");
/** Draw YOU (with the turn crossfade) through g in view G at the floor point (wx, wy). Returns the anchors. */
function drawYouAt(g, G, wx, wy, st, fc, extra = {}) {
  const base = { ...st, ...extra };
  if (fc.k >= 1 || fc.from === fc.to) return drawYou(g, G, wx, wy, { ...base, f: (extra.flip ?? 1) * fc.to * fc.sq });
  const b = drawYou(gate(g, 0, fc.k), G, wx, wy, { ...base, f: (extra.flip ?? 1) * fc.to * fc.sq, prop: fc.k > 0.5 ? base.prop : null });
  const a = drawYou(gate(g, fc.k, 1), G, wx, wy, { ...base, f: (extra.flip ?? 1) * fc.from * fc.sq, prop: fc.k <= 0.5 ? base.prop : null });
  return fc.k > 0.5 ? b : a;
}
/** Grade proxy: every colour drawn through it is warmed like the lamp-lit friend sprite (cached per colour). */
const GRADE = new Map();
function lampGrade(c) {
  const o = Object.create(c);
  o.px = (x, y, col) => {
    if (!col) return; const key = typeof col === "string" ? col : col.join(","); let v = GRADE.get(key);
    if (!v) { const [r, g, b] = typeof col === "string" ? [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16)) : col, lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255; v = [r * 0.94 + 10, g * 0.86 + 5, b * 0.8 + 8 + 12 * (1 - lum)].map((q) => Math.max(0, Math.min(255, R(q)))); GRADE.set(key, v); }
    c.px(x, y, v);
  };
  return o;
}
/** Reflection proxy: only inside the mirror glass, tinted toward the cool glass colour by k. */
function mirrorView(c, V, k) {
  const o = Object.create(c), cache = new Map(), kk = R(k * 20) / 20;
  o.px = (x, y, col) => {
    x = Math.floor(x); y = Math.floor(y); if (!col || !inGlass(x - 270 + V.cx, y - 480 + V.cy)) return;
    const key = typeof col === "string" ? col : col.join(","); let v = cache.get(key); if (!v) { v = mix(mix(col, "#2E2C5E", kk), "#000000", 0.08); cache.set(key, v); }
    c.px(x, y, v);
  };
  return o;
}

// ================================================================ layers
/** Mirror glass content: your reflection (mirrored figure, smaller, cool tint; clearer while you face the mirror) + glints. */
export function drawMirror(c, V, t) {
  const st = youState(t), fc = facingAt(t), look = clamp01(fc.from === fc.to ? (fc.to < 0 ? 1 : 0) : fc.to < 0 ? fc.u : 1 - fc.u);
  const tint = lerp(0.76, 0.16, ease(look)), z = 0.84, wxR = MIRROR.x + 2, footY = GLASS.y1 - 4;
  const G = { z, X: (x) => V.X(wxR) + (x - wxR) * z, Y: (y) => V.Y(footY) + y * z };
  drawYouAt(lampGrade(mirrorView(c, V, tint)), G, wxR, 0, { ...st, light: [-LIGHT_YOU[0], LIGHT_YOU[1]], shadow: false, prop: t < T.fly[0] + 0.3 ? (g, x, y) => { const [px, py] = inHand(x, y, -st.phoneAng, 0.84); drawPhone(g, px, py, -st.phoneAng, st.phoneTurn, 0.92, { a: 1 - ramp(t, T.fly[0], T.fly[0] + 0.3) }); } : null }, fc, { flip: -1 });
  // two soft diagonal glints across the glass
  for (const [off, w, k] of [[-14, 5, 0.32], [2, 2, 0.22]]) for (let y = R(V.Y(GLASS.y0)); y < R(V.Y(GLASS.y1)); y++) {
    const x0 = V.X(GLASS.x0) + 30 + off - (y - V.Y(GLASS.y0)) * 0.45; for (let x = R(x0); x < R(x0 + w); x++) { if (!inGlass(x - 270 + V.cx, y - 480 + V.cy)) continue; if (k > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#E8E4FF", 0.35)); }
  }
}

let LAST = null;
/** YOU, the friend, the phone and the in-world marks. */
export function drawCast(c, V, t) {
  const st = youState(t), fc = facingAt(t), gy = lampGrade(c);
  const youG = { z: 1, X: V.X, Y: V.Y };
  // ---- the friend first (he stands a little further back, by the bed)
  FRIEND.shadow(c, V, t, { col: "#160A1E", k: 0.5, rx: 36 });
  FRIEND.draw(c, V, t);
  // ---- YOU (the phone is drawn in your fist under the fingers while you hold it)
  const prop = st.holding ? (g, x, y) => { const [px, py] = inHand(x, y, st.phoneAng); drawPhone(g, px, py, st.phoneAng, st.phoneTurn, 1.1, { glow: 1 }); } : null;
  const you = drawYouAt(gy, youG, YOU_X, LAND, { ...st, prop }, fc);
  LAST = you;
  // the phone's screen light on your face while you look down at it (cool, dithered)
  const glowK = 1 - ramp(t, T.selfieUp[0], T.selfieUp[0] + 0.4);
  if (glowK > 0) {   // only on skin (face and hand), strongest low on the face, toward the screen
    const ex = you.nose[0] - 2, ey = you.nose[1] + 8;
    for (let Y = R(ey - 16); Y <= R(ey + 8); Y++) for (let X = R(ex - 16); X <= R(ex + 8); X++) {
      const i = (Y * c.w + X) * 3, r = c.d[i], g = c.d[i + 1], b = c.d[i + 2]; if (!(r > 120 && r > g + 18 && g > b)) continue;
      const d = Math.hypot(X - ex, (Y - ey) * 1.2) / 16, k = d < 1 ? 0.42 * glowK * (1 - d) : 0; if (k <= 0) continue;
      const q = (k * 3 + bayer(X, Y) > 1 ? 2 : k * 3 + bayer(X, Y) > 0.5 ? 1 : 0) / 3; if (q > 0) c.px(X, Y, mix([r, g, b], "#A8E4FF", q * 0.8));
    }
  }
  // ---- the phone after it leaves your hand: floats to the friend → held → REC → pocket
  drawPhoneWorld(c, V, t, you);
  // ---- the dotted distance line and its tag
  drawDistance(c, V, t, you);
  // ---- talk rings from your mouth, bone pulses around your head
  drawTalk(c, V, t, you, fc);
  // ---- hearts
  drawHearts(c, V, t, you);
  return you;
}

function phonePos(V, t, you) {
  const [a, b] = T.fly, fa = friendAnchor(V, t);
  if (t < a) return null;
  if (t < b) {
    const k = ease((t - a) / (b - a)), p0 = inHand(you.grip[0], you.grip[1], -0.08), p1 = [fa.x, fa.y], ctrl = [(p0[0] + p1[0]) / 2, Math.min(p0[1], p1[1]) - 46];
    const x = (1 - k) * (1 - k) * p0[0] + 2 * (1 - k) * k * ctrl[0] + k * k * p1[0], y = (1 - k) * (1 - k) * p0[1] + 2 * (1 - k) * k * ctrl[1] + k * k * p1[1];
    return { x, y: y + 2 * Math.sin(PI * k * 3) * (1 - k), ang: -0.08 + 0.3 * Math.sin(2 * PI * k), turn: Math.cos(2 * PI * k) * lerp(0.5, 0.75, k), k, flying: true };
  }
  const [p0, p1] = T.pocket;
  if (t < p0) return { x: fa.x, y: fa.y, ang: fa.row === 8 ? 0.06 : -0.12, turn: 0.75, k: 1 };
  const k = ease((t - p0) / (p1 - p0));
  return { x: fa.x, y: fa.y + 3 * k, ang: lerp(-0.12, 0.3, k), turn: 0.75, a: 1 - k, k: 1 };
}

function drawPhoneWorld(c, V, t, you) {
  const P = phonePos(V, t, you); if (!P || (P.a ?? 1) <= 0) return;
  const recA = win(t, T.rec[0], T.rec[1], 0.2, 0.3), pulse = 0.5 + 0.5 * Math.sin((t - T.rec[0]) * 2 * PI * 1.1);
  if (P.flying) {   // game-item glow and a sparkle trail
    const k = P.k, glow = Math.sin(PI * k);
    const gl = Math.min(1, Math.sin(PI * k) * 1.6), X0 = R(P.x), Y0 = R(P.y);
    for (let dy = -20; dy <= 20; dy++) for (let dx = -20; dx <= 20; dx++) { const d = Math.hypot(dx, dy); if (d > 20) continue; const v = gl * (d < 12 ? 0.75 : 0.75 * (1 - (d - 12) / 8)); if (v > bayer(X0 + dx, Y0 + dy)) c.px(X0 + dx, Y0 + dy, mix(c.get(X0 + dx, Y0 + dy), "#FFF2B8", d < 12 ? 0.5 : 0.32)); }
    { const rr = 15 + 1.5 * Math.sin(t * 9); ring(c, P.x, P.y, rr + 1, gl * 0.9, "#3A2450"); ring(c, P.x, P.y, rr, gl, "#FFF2B8"); }
    for (let i = 0; i < 4; i++) { const a2 = t * 5 + i * PI / 2; sparkle(c, P.x + Math.cos(a2) * 19, P.y + Math.sin(a2) * 19, 2, gl * 0.9, "#FFF2B8"); }
    for (let i = 1; i <= 7; i++) { const kk = k - i * 0.05; if (kk <= 0) continue; const q = phonePos(V, T.fly[0] + kk * (T.fly[1] - T.fly[0]) * 0.999, you); if (!q) continue; sparkle(c, q.x + Math.sin(i * 2.1) * 5, q.y + Math.cos(i * 1.7) * 5, i < 4 ? 3 : 2, gl * (1 - i / 8), i % 2 ? "#FFF2B8" : "#E0CDF8"); }
  }
  const scale = P.flying ? lerp(1.1, 1, P.k) + 0.35 * Math.sin(PI * P.k) : 1;
  drawPhone(c, P.x, P.y, P.ang, P.turn, scale, { a: P.a ?? 1, rec: recA * pulse, glow: 1 });
  // the friend's fingers in front of the phone's lower half (copied from his own sprite: skin pixels only)
  if (!P.flying && (P.a ?? 1) > 0.05) {
    const x0 = R(P.x) - 9, y0 = R(P.y) + 1, x1 = R(P.x) + 9, y1 = R(P.y) + 16;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * 540 + x) * 3; SCRATCH.d[i] = 0; SCRATCH.d[i + 1] = 0; SCRATCH.d[i + 2] = 0; }
    FRIEND.draw(SCRATCH, V, t, { clip: (X, Y) => X >= x0 && X <= x1 && Y >= y0 && Y <= y1 });
    const ga = (P.a ?? 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = (y * 540 + x) * 3, r = SCRATCH.d[i], g = SCRATCH.d[i + 1], b = SCRATCH.d[i + 2];
      if (r > 150 && r > g + 22 && g > b - 10 && (ga >= 1 || ga > bayer(x, y))) { c.d[i] = r; c.d[i + 1] = g; c.d[i + 2] = b; }
    }
  }
  if (recA > 0) recLabel(c, P.x - 11, P.y - 24, recA, pulse);
}

function drawDistance(c, V, t, you) {
  const aIn = ramp(t, T.lineIn[0] - 0.1, T.lineIn[0] + 0.05), aOut = 1 - ramp(t, ...T.lineOut), a = Math.min(aIn, aOut); if (a <= 0) return;
  const P = t < T.fly[0] ? (([x, y]) => ({ x, y }))(inHand(you.grip[0], you.grip[1], youState(t).phoneAng)) : phonePos(V, t, you);
  if (!P) return;
  const face = [you.nose[0] + 2, you.nose[1]], end = [P.x - 3, P.y - 4 * ramp(t, T.fly[0], T.fly[0] + 0.3)];
  const grow = ramp(t, T.lineIn[0], T.lineIn[1]);
  dimLine(c, face, end, a, grow, "#FDFEED");
  // tag: "30 CM" next to the phone → "1.5 M" over the middle of the long line (glides and crossfades on "half")
  const k15 = ramp(t, T.tag15 - 0.15, T.tag15 + 0.25), pop = (t0) => { const u = clamp01((t - t0) / 0.22); return u < 1 ? 1 + 0.25 * Math.sin(PI * u) : 1; };
  const tag30 = [V.X(YOU_X + 93), V.Y(LAND - 213)]   /* fixed beside the selfie phone (≈ YOU_X + 49, −187): no 1-px jitter with the arm sway */, mid = [(face[0] + end[0]) / 2, Math.min(face[1], end[1]) - 30];
  const pos = L2(tag30, mid, ease(ramp(t, T.fly[0], T.fly[1] + 0.1)));
  const ta = a * ramp(t, T.tag30 - 0.12, T.tag30 + 0.1);
  if (k15 < 1) pill(gateC(c, k15, 1), "30 CM", pos[0], pos[1] - (pop(T.tag30) - 1) * 6, ta, "#F4CA50", 2);
  if (k15 > 0) pill(gateC(c, 0, k15), "1.5 M", pos[0], pos[1] - (pop(T.tag15) - 1) * 6, ta, "#7FE3F0", 2);
}
const gateC = (c, lo, hi) => gate(c, lo, hi);

function drawTalk(c, V, t, you, fc) {
  const dirn = fc.to;
  // a ring leaves the mouth at every word start, travels forward, widens and dissolves (0.8 s)
  for (const w of TALK_WORDS) {
    const u = (t - w.start) / 0.8; if (u <= 0 || u >= 1) continue;
    const r = 3 + 11 * u, x = you.mouth[0] + dirn * (4 + 26 * u), y = you.mouth[1] + 1, a = Math.min(1, u * 6) * (1 - u) * 1.2;
    arc(c, x, y, r, dirn, Math.min(1, a), "#9AF0FA", 0.85, true);
  }
  // bone pulses: orange rings spread around your head on "bones", "bones carry", "low", "deeper"
  T.bonePulses.forEach((t0, i) => {
    const u = (t - t0) / 0.9; if (u <= 0 || u >= 1) return;
    const slow = i >= 2 ? 1.25 : 1, r = 14 + 22 * u * slow, a = Math.min(1, u * 5) * (1 - u);
    ring(c, you.head[0], you.head[1] + 4, r, a * 0.9, "#F59A3A"); if (r > 20) ring(c, you.head[0], you.head[1] + 4, r - 6, a * 0.5, "#F4CA50");
  });
}

function drawHearts(c, V, t, you) {
  const pop = (t0, x, y, dx = 0, s = 2, col = "#F27A9A") => {
    const u = (t - t0) / 1.5; if (u <= 0 || u >= 1) return;
    const a = Math.min(1, u * 6) * (1 - ease(clamp01((u - 0.6) / 0.4))), rise = 34 * ease(Math.min(1, u * 1.3)), sc = u < 0.12 ? 1 : 1;
    heart(c, x + dx * ease(u) + Math.sin(u * 9) * 2, y - rise, s * sc, a, col);
  };
  // "you like the mirror version": a heart between you and the mirror
  pop(T.heartMirror, (you.head[0] + V.X(MIRROR.x)) / 2 + 10, you.head[1] - 10, -8);
  // "their friends chose the real one": a heart from the friend toward you
  const fx = V.X(FRIEND_X) - 22, fy = V.Y(LAND) - 170; pop(T.heartFriend, fx, fy, -40);
  // happy: little hearts around you on "distance" and "mirror"
  pop(T.heartsHappy[0], you.head[0] - 20, you.head[1] - 22, -6, 2); pop(T.heartsHappy[0] + 0.3, you.head[0] + 26, you.head[1] - 8, 6, 2);
  pop(T.heartsHappy[1], you.head[0] + 4, you.head[1] - 30, 4, 2, "#F4CA50");
}
export function lastYou() { return LAST; }
