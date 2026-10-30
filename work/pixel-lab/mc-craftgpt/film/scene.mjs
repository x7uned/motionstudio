// «A chatbot built inside Minecraft» — the story state at time t: the screen (chat, tokens, progress bar, token strip),
// the keys, the embedding panel, the token's journey along the dust (keyboard → embedding → bus → layers 1…6 → picker
// → screen → back again), the halls' lamps, the ROM row that is built on cue, the hero and the camera.
// Everything that repeats is periodic over END (loop film); every change is a ramp or a per-lamp wipe, never one frame.
import { EV, END } from "./timeline.mjs";
import { LAMPS, SCREEN, EMBED, HALLS, KEYS, keyOf, GROUND, BUS, BUS_Z, FRONT_Z, PICK, PLAYER } from "./world.mjs";
import { screenLevel, QUESTION } from "./screen.mjs";
import { hash } from "./noise.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const wrap = (t) => ((t % END) + END) % END;

// ---------------------------------------------------------------- typing: "HOW ARE YOU?" twice (the pipeline shot, the ending)
export const TYPE1 = { t0: EV.type1 - 0.05, step: 0.085 }, TYPE2 = { t0: EV.type2 + 0.1, step: 0.08 };
const typeTime = (T, i) => T.t0 + i * T.step;
export const PRESSES = [];
for (const T of [TYPE1, TYPE2]) [...QUESTION].forEach((ch, i) => PRESSES.push({ t: typeTime(T, i), key: keyOf(ch === " " ? "SPACE" : ch) }));
PRESSES.push({ t: EV.enter - 0.04, key: keyOf("ENTER"), long: true });
export function keyLevel(i, t) {
  let k = 0; for (const p of PRESSES) if (p.key.i === i) k = Math.max(k, win(t, p.t - 0.03, p.t + (p.long ? 0.45 : 0.1), 0.05, p.long ? 0.3 : 0.1)); return k;
}

// ---------------------------------------------------------------- the screen: a state at time t (discrete fields), wiped per lamp
const CLEAR = EV.so + 0.08;                                   // the screen clears for the new question
const userTyped = (t) => { if (t < CLEAR) return 12; let n = 0; QUESTION.split("").forEach((_, i) => { if (t >= typeTime(TYPE2, i) + 0.03) n = i + 1; }); return n; };
const PRINTS = [EV.then, EV.again1, EV.prints];               // the bot's tokens appear: I · AM · GOOD
const PB_STARTS = [EV.wait - END, ...PRINTS, EV.wait];        // the progress bar restarts with every token
const pbAt = (t) => { let t0 = PB_STARTS[0]; for (const s of PB_STARTS) if (t >= s) t0 = s; const D = t0 < 0 || t0 === EV.wait ? 20 : t0 < 17 ? 26 : 28; return clamp01((t - t0) / D); };
export const NONSENSE = EV.sometimes + 0.15;
function screenState(t) {
  const st = { user: 12, userBubble: 1, tokenBoxes: 0, bot: "I AM GOOD", botN: 0, botBubble: 1, pb: 0, strip: 0, used: 7, dots: [0, 0, 0] };
  if (t >= EV.token1 - 0.05 && t < EV.every) { st.userBubble = 0; st.tokenBoxes = 1; }
  if (t >= EV.hold - 0.25 && t < EV.once1End + 0.2) { st.userBubble = 0; st.tokenBoxes = 1; st.strip = 1; }
  st.botN = t >= PRINTS[2] ? 9 : t >= PRINTS[1] ? 4 : t >= PRINTS[0] ? 1 : 0;
  if (t >= NONSENSE) { st.bot = "I AM A SPOON"; st.botN = 12; }
  st.pb = pbAt(t);
  if (t >= CLEAR) { st.user = userTyped(t); st.userBubble = t >= EV.enter ? 1 : 0; st.botBubble = 0; st.botN = 0; st.pb = -1; }
  if (t >= EV.wait) { st.botBubble = 1; st.bot = "I AM GOOD"; st.botN = 0; st.pb = pbAt(t); }
  return st;
}
const cache = new Map();
function stateQ(q) { let s = cache.get(q); if (!s) { if (cache.size > 400) cache.clear(); s = screenState(q / 60); cache.set(q, s); } return s; }
// thinking dots: one after another, softly, over and over (whole cycles over the film)
const DOTC = Math.round(END / 1.25);
function dots(t) { const u = (wrap(t) / END) * DOTC; return [0, 1, 2].map((k) => { const f = ((u - k / 3) % 1 + 1) % 1; return f < 0.15 ? smooth(f, 0, 0.15) : 1 - smooth(f, 0.35, 0.6); }); }
export function screenLamp(u, v, t) {
  const thr = hash(u, v, 77) * 0.35, st = stateQ(Math.round(wrap(t - thr) * 60));
  const lv = screenLevel({ ...st, dots: st.botBubble ? dots(t) : [0, 0, 0] }, u, v);
  return lv;
}

// ---------------------------------------------------------------- the token's journey along the dust
// head position along each wire as a function of time; the lit part is the head plus a short tail behind it
export const J = {
  keys: { a: EV.token2 - 0.05, b: EV.list1 - 0.05 },                 // keyboard → embedding panel (81 cells)
  embOut: { a: EV.list2 - 0.12, b: EV.list2 + 0.08 },                // panel → bus (4 cells)
  feed: { a: EV.list2 + 0.08, b: EV.six - 0.05 },                    // bus: x 56 → −250
  pickIn: { a: 0, b: 0 }, toScreen: { a: EV.picks + 0.35, b: EV.prints - 0.02 }, back: { a: EV.starts - 0.05, b: EV.over1End + 0.05 },
};
export const HALL_T = HALLS.map((H, k) => EV.six + 0.03 + k * ((EV.atEnd - 0.35 - EV.six) / 6));   // layer k gets the list at HALL_T[k]
const DWELL = 0.55;
J.pickIn = { a: HALL_T[5] + DWELL + 0.25, b: HALL_T[5] + DWELL + 0.45 };
const gateX = HALLS.map((H) => Math.round(H.cx));
const bump = (dist, tail = 7) => (dist < -1.2 ? 0 : dist < 0.6 ? 1 : dist < 0.6 + tail ? 1 - (dist - 0.6) / tail : 0);
// the bus head position (x) and direction at t, or null
function busHead(t) {
  if (t >= J.feed.a && t <= J.feed.b + 0.3) return { x: lerp(BUS.x1, BUS.x0, ease((t - J.feed.a) / (J.feed.b - J.feed.a))), dir: -1, tail: 14 };
  if (t >= HALL_T[0] && t < J.pickIn.a + 0.3) {
    for (let k = 0; k < 6; k++) { const a = HALL_T[k], d = a + DWELL, n = k < 5 ? HALL_T[k + 1] : J.pickIn.a; if (t < a) return null; if (t < d) return { x: gateX[k], dir: 1, tail: 3, dwell: k }; if (t < n) return { x: lerp(gateX[k], k < 5 ? gateX[k + 1] : -80, ease((t - d) / (n - d))), dir: 1, tail: 10 }; }
    return { x: -80, dir: 1, tail: 6 };
  }
  if (t >= J.toScreen.a && t <= J.toScreen.b + 0.2) return { x: lerp(-80, SCREEN.x0 + 8, ease((t - J.toScreen.a) / (J.toScreen.b - J.toScreen.a))), dir: 1, tail: 6 };
  if (t >= J.back.a && t <= J.back.b + 0.3) return { x: lerp(SCREEN.x0 + 8, BUS.x1, ease((t - J.back.a) / (J.back.b - J.back.a))), dir: 1, tail: 16 };
  return null;
}
function pathLevel(name, t, d) {
  if (name === "bus") { const h = busHead(t); if (!h) return 0; return bump((h.x - d.x) * h.dir, h.tail); }
  if (name === "keys-out") { const s = d.z === -27 ? d.x + 5 : 68 + (-27 - d.z); if (t < J.keys.a || t > J.keys.b + 0.5) return 0; const hs = lerp(0, 80, ease((t - J.keys.a) / (J.keys.b - J.keys.a))); return bump(hs - s, 10); }
  if (name === "embed-out") { const s = -36 - d.z; let lv = 0; if (t >= J.embOut.a && t <= J.embOut.b + 0.3) lv = bump(s - lerp(3.5, 0, clamp01((t - J.embOut.a) / (J.embOut.b - J.embOut.a))), 3);
    if (t >= J.back.b - 0.2 && t <= J.back.b + 0.5) lv = Math.max(lv, bump(lerp(0, 3.5, clamp01((t - J.back.b + 0.2) / 0.4)) - s, 3)); return lv; }
  if (name === "pick-in") { const s = -36 - d.z; if (t < J.pickIn.a || t > J.pickIn.b + 0.4) return 0; return bump(lerp(0, 4, (t - J.pickIn.a) / (J.pickIn.b - J.pickIn.a)) - s, 3); }
  const g = /^gate:(\d)$/.exec(name); if (g) { const k = +g[1], s = -36 - d.z, a = HALL_T[k]; return win(t, a + s * 0.04, a + DWELL - 0.1 - s * 0.04, 0.08, 0.12); }
  return 0;
}

/** level 0..1 of a named signal at time t (d: the dust cell, for wires whose level depends on position) */
export function SIG(name, t, d = null) {
  t = wrap(t);
  if (d) return pathLevel(name, t, d);
  const m = /^blink:(\d):(\d+)$/.exec(name); if (m) return blink(+m[1] * 37 + +m[2], t, 5 + (+m[2] % 7));
  return 0;
}
// a lamp or torch that blinks on its own: n whole cycles over the film, edges of 0.12 s
function blink(seed, t, n) { const ph = hash(seed, 3, 9), u = (wrap(t) / END) * n + ph, f = u - Math.floor(u), e = 0.12 * n / END; return f < 0.5 ? smooth(f, 0, e) : 1 - smooth(f, 0.5, 0.5 + e); }

// ---------------------------------------------------------------- lamps
export const hallActive = (k, t) => win(t, HALL_T[k] - 0.02, HALL_T[k] + DWELL + 0.15, 0.12, 0.35);
const digitLit = (k, t) => Math.min(smooth(t, HALL_T[k] - 0.02, HALL_T[k] + 0.12), 1 - smooth(t, EV.machine, EV.machine + 0.6));
export const embedFill = (i, t) => Math.min(smooth(t, EV.list1 - 0.1 + (i / 240) * 0.8, EV.list1 + (i / 240) * 0.8 + 0.06), 1 - smooth(t, EV.goes + hash(i, 1, 5) * 0.4, EV.goes + 0.15 + hash(i, 1, 5) * 0.4));
export function lampLevel(x, y, z, t) {
  t = wrap(t);
  const s = LAMPS.get(`${x},${y},${z}`); if (!s) return 0;
  if (s === "screen") return screenLamp(x - SCREEN.x0, SCREEN.y1 - 1 - y, t);
  if (s === "embed") { const i = (EMBED.y1 - 1 - y) * 12 + (x - EMBED.x0); return embedFill(i, t) * (0.3 + 0.7 * hash(x, y, 31)); }
  const c = s.indexOf(":"), kind = s.slice(0, c), arg = +s.slice(c + 1);
  if (kind === "key") return keyLevel(arg, t);
  if (kind === "digit") return digitLit(arg, t);
  if (kind === "roof" || kind === "side") { const idle = blink(x * 31 + z * 7 + y, t, 6 + Math.floor(hash(x, z, y) * 10)) * (kind === "side" ? 0.7 : 1), act = hallActive(arg, t) * (0.35 + 0.65 * blink(x * 13 + z, t, 120)); return Math.max(idle, act); }
  if (kind === "pick") { const on = win(t, J.pickIn.b - 0.05, EV.prints + 0.2, 0.12, 0.4), chosen = smooth(t, EV.picks - 0.05, EV.picks + 0.12); const base = [0.85, 0.55, 0.3][arg] * on; return arg === 0 ? Math.max(base, chosen * on) : base * (1 - 0.7 * chosen); }
  return 0;
}

// ---------------------------------------------------------------- the ROM row that is built on cue (hall 6, near the front)
// present in the first and last shots; dissolves away while far off screen, then is built again on "built into the world as blocks"
export const romAlpha = (t) => { t = wrap(t); return Math.max(1 - smooth(t, 11.5, 12.6), smooth(t, EV.built2 + 0.1, EV.blocks2 + 0.2)); };

// ---------------------------------------------------------------- the hero: stands at the keyboard, types twice
export const TYPING = [{ a: TYPE1.t0 - 0.1, b: typeTime(TYPE1, 11) + 0.15 }, { a: TYPE2.t0 - 0.1, b: EV.enter + 0.3 }];
export function hero(t) {
  t = wrap(t);
  let wave = 0; for (const w of TYPING) if (t > w.a - 0.3 && t < w.b + 0.4) { const k = win(t, w.a - 0.2, w.b, 0.2, 0.3); wave = Math.max(wave, k * (0.45 + 0.35 * Math.abs(Math.sin((t - w.a) * 22)))); }
  return { x: PLAYER.x + 0.5, y: GROUND + 1, z: PLAYER.z + 0.6, face: Math.PI, walk: null, wave };
}

// ---------------------------------------------------------------- camera
export const CAM = {
  WIDE: { x: -44, y: 26, z: -84, b: 2.6, ay: 455 }, WIDE2: { x: -38, y: 26, z: -78, b: 2.85, ay: 455 },
  ROOF: { x: -93, y: 25, z: -58, b: 12, ay: 450 },
  SCREEN: { x: -14, y: 33, z: -40, b: 4.3, ay: 330 },
  FLY: { x: -150, y: 25, z: -190, b: 3.0, ay: 430 },
  PATCH: { x: -100, y: 25, z: -200, b: 7.5, ay: 430 }, BYTE: { x: -106, y: 25, z: -199, b: 24, ay: 430 },
  KEYS: { x: -22, y: 11, z: -25, b: 16, ay: 430 }, EMBED: { x: 48, y: 16, z: -34, b: 6.5, ay: 470 },
  FRONTS: { x: -175, y: 17, z: -40, b: 2.9, ay: 430 }, PICK: { x: -66, y: 20, z: -38, b: 4.6, ay: 420 },
  FAR: { x: -266, y: 10, z: -869, b: 0.28, ay: 400 }, DESK: { x: -40, y: 22, z: -66, b: 2.9, ay: 470 },
  KEYS2: { x: -24, y: 22, z: -34, b: 5.0, ay: 470 },
};
export const KEYS_CAM = [
  [0, 0.9, CAM.WIDE], [4.2, EV.hours0End, CAM.WIDE2], [EV.player + 0.4, EV.blocks0End - 0.3, CAM.ROOF],
  [EV.chatbot1 + 0.2, EV.again2End - 0.1, CAM.SCREEN], [EV.math, EV.numbers1End, CAM.FLY], [EV.normal, EV.blocks2End - 0.1, CAM.PATCH],
  [EV.eight - 0.2, EV.bitsEnd - 0.15, CAM.BYTE], [EV.type1 - 0.1, EV.question1End - 0.1, CAM.KEYS], [EV.list1 - 0.1, EV.numbers3End - 0.05, CAM.EMBED],
  [EV.six - 0.25, EV.token3End - 0.2, CAM.FRONTS], [EV.end, EV.over1End - 0.5, CAM.PICK], [EV.hold - 0.2, EV.once1End - 0.1, CAM.SCREEN],
  [EV.kilometer - 0.2, EV.once2End - 0.2, CAM.FAR], [EV.twenty, EV.hours2End - 0.1, CAM.DESK], [EV.sometimes, EV.nonsenseEnd - 0.1, CAM.SCREEN],
  [EV.type2 + 0.05, EV.wait, CAM.KEYS2], [END + 0.0, END + 1, CAM.WIDE],
];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function rawCam(t) {
  let i = 0; while (i < KEYS_CAM.length - 1 && KEYS_CAM[i + 1][0] <= t) i++;
  const [, a1, A] = KEYS_CAM[i]; if (t <= a1 || i === KEYS_CAM.length - 1) return { ...A };
  const [b0, , Bc] = KEYS_CAM[i + 1], k = ease((t - a1) / (b0 - a1));
  const d = dist(A, Bc), need = Math.max(0, Math.log((d * Math.max(A.b, Bc.b)) / 900)), dip = Math.min(need, 1.6) * Math.sin(Math.PI * k);
  return { x: lerp(A.x, Bc.x, k), y: lerp(A.y, Bc.y, k), z: lerp(A.z, Bc.z, k), b: Math.exp(lerp(Math.log(A.b), Math.log(Bc.b), k) - dip), ay: lerp(A.ay, Bc.ay, k) };
}
const FR = Math.round(END * 30), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / 30));
const SMW = 6;
export function camera(t) {
  const f = Math.round(wrap(t) * 30) % FR; let x = 0, y = 0, z = 0, lb = 0, ay = 0, w = 0;
  for (let k = -SMW; k <= SMW; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SMW / 2) ** 2)); x += c.x * q; y += c.y * q; z += c.z * q; lb += Math.log(c.b) * q; ay += c.ay * q; w += q; }
  const s = { x: x / w, y: y / w, z: z / w, b: Math.exp(lb / w), ay: ay / w };
  const exact = Math.max(1 - smooth(wrap(t), 0.15, 0.6), smooth(wrap(t), END - 0.45, END - 0.05));
  if (exact <= 0) return s;
  const e = CAM.WIDE; return { x: lerp(s.x, e.x, exact), y: lerp(s.y, e.y, exact), z: lerp(s.z, e.z, exact), b: Math.exp(lerp(Math.log(s.b), Math.log(e.b), exact)), ay: lerp(s.ay, e.ay, exact) };
}
export { BUS_Z, FRONT_Z, PICK };
