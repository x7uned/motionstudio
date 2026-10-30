// «Computers inside Minecraft» — the story state at time t: levers, the signal logic of every exhibit (with the real
// redstone delays: a torch flips 0.1 s after its block changes), the copies, the computer's lamps and screen modes, the
// hero's walk and lever pulls, and the camera. Everything that repeats is periodic over END (loop film).
import { EV, END } from "./timeline.mjs";
import { LAMPS, SCREEN, GROUND } from "./world.mjs";
import { TRAVELS, sourceOf } from "./redstone.mjs";
import { screenBit } from "./screen.mjs";
import { hash } from "./noise.mjs";
import { bayer } from "../../../../renderer/pixel/raster.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const wrap = (t) => ((t % END) + END) % END;

// ---------------------------------------------------------------- levers: initial state + flip times
const FLIP = 0.16;                                            // the handle swings over in 0.16 s
export const LEVERS = {
  A1: { s0: 1, at: [1.7, EV.lever + 0.3, EV.off + 0.02, EV.lever3 - 0.05] },
  A2: { s0: 0, at: [EV.powerB + 0.02, 45.0] },
  A3: { s0: 0, at: [EV.lampLights - 0.1, 45.4] }, B3: { s0: 0, at: [EV.both - 0.25, 45.6] },
  A4: { s0: 0, at: [EV.either - 0.05, EV.works + 0.12] }, B4: { s0: 0, at: [EV.works - 0.12, 46.4] },
  hA: { s0: 0, at: [EV.one1 - 0.05, 45.0] }, hB: { s0: 0, at: [EV.one2 - 0.05, 45.2] },
};
// how far the handle is over (0 off … 1 on)
export function leverPos(name, t) {
  const L = LEVERS[name]; if (!L) return copyLever(name, t);
  let s = L.s0, k = s; for (const f of L.at) { const u = smooth(t, f, f + FLIP); k = s + (1 - 2 * s) * u; if (t < f + FLIP) return k; s = 1 - s; }
  return s;
}
// the copies: levers that toggle by themselves, a whole number of times over the film
function copyLever(name, t) {
  const m = /^c(\d)([AB])$/.exec(name); if (!m) return 0; const k = Number(m[1]), n = m[2] === "A" ? 4 + k : 7 + 2 * k, ph = hash(k, m[2] === "A" ? 1 : 2, 7);
  const u = (wrap(t) / END) * n + ph, f = u - Math.floor(u), e = 0.12 * n / END;   // edges of 0.12 s
  return f < 0.5 ? smooth(f, 0, e) : 1 - smooth(f, 0.5, 0.5 + e);
}
// a lever's power: on once the handle has passed the middle
const leverSig = (name, t) => smooth(leverPos(name, t), 0.45, 0.75);

// ---------------------------------------------------------------- travel speeds (s / block) for the visible change
Object.assign(TRAVELS, { A1: 0.13, A2: 0.2, N2: 0.2, A3: 0.07, B3: 0.07, and3: 0.07, A4: 0.12, B4: 0.12, or4: 0.12 });
for (const tg of ["h", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7"]) for (const s of ["A", "B", "S", "C"]) TRAVELS[tg + s] = 0.1;
const tr = (s) => TRAVELS[s] ?? 0.03;
const TORCH = 0.1;
// signal arriving at a block `d` blocks down the wire from its source
const arrive = (s, d, t) => SIG(s, t - d * tr(s));

/** level 0..1 of a named signal at time t */
export function SIG(name, t) {
  switch (name) {
    case "A1": case "A2": case "A3": case "B3": case "A4": case "B4": return leverSig(name, t);
    case "N2": return 1 - arrive("A2", 4, t - TORCH);
    case "nA3": return 1 - arrive("A3", 5, t - TORCH);
    case "nB3": return 1 - arrive("B3", 5, t - TORCH);
    case "nand3": return Math.max(SIG("nA3", t), SIG("nB3", t));
    case "and3": return 1 - SIG("nand3", t - TORCH);
    case "or4": return Math.max(arrive("A4", 4, t), arrive("B4", 4, t));
  }
  const m = /^(h|c\d)(.+)$/.exec(name); if (m) return adderSig(m[1], m[2], t);
  return 0;
}
// a half adder module: inputs over 3 blocks of dust; the gate block answers after two torch delays
function adderSig(tg, sub, t) {
  const a = (u) => arrive(tg + "A", 3, u), b = (u) => arrive(tg + "B", 3, u);
  switch (sub) {
    case "A": case "B": return tg === "h" ? leverSig(tg + sub, t) : leverSig(tg + sub, t);
    case "nA": return 1 - a(t - TORCH);
    case "nB": return 1 - b(t - TORCH);
    case "mid": return Math.max(1 - a(t - TORCH), 1 - b(t - TORCH));
    case "S": { const x = a(t - 2 * TORCH), y = b(t - 2 * TORCH); return clamp01(x + y - 2 * x * y); }
    case "C": return a(t - 2 * TORCH) * b(t - 2 * TORCH);
    case "x1": return 1 - adderSig(tg, "C", t - TORCH);
    case "x2": return 1 - adderSig(tg, "S", t - TORCH);
  }
  return 0;
}
// the lamp at (x, y, z): its signal at the lamp's distance down the wire, or the computer's own patterns
export function lampLevel(x, y, z, t) {
  const s = LAMPS.get(`${x},${y},${z}`); if (!s) return 0;
  if (s === "screen") return screenLamp(x - SCREEN.x0, SCREEN.y1 - 1 - y, t);
  if (s === "blink" || s === "mem") return computerLamp(x, y, z, t, s === "mem");
  const src = sourceOf(s), d = src ? Math.abs(src.x - x) + Math.abs(src.z - z) : 0;
  return SIG(s, t - d * tr(s));
}

// ---------------------------------------------------------------- the computer's lamps: busy patterns, then the 1 Hz tick
export const TICK = { a: EV.but - 0.1, b: EV.timesEnd + 0.3 };
const tickW = (t) => win(t, TICK.a, TICK.b, 0.35, 0.5);
const tickFlash = (t) => { const u = t - EV.ticks + 0.05; if (u < 0) return 0; const f = u - Math.floor(u); return f < 0.08 ? smooth(f, 0, 0.08) : 1 - smooth(f, 0.08, 0.45); };
function computerLamp(x, y, z, t, mem) {
  const n = mem ? 6 + Math.floor(hash(x, y, z) * 8) : 14 + Math.floor(hash(x, z, y) * 30), ph = hash(z, x, y + 3);
  const u = (wrap(t) / END) * n + ph, busy = (u - Math.floor(u)) < (mem ? 0.4 : 0.5) ? 1 : 0;
  const w = tickW(t); if (w <= 0) return busy;
  return lerp(busy, tickFlash(t), w);
}
export const tickNow = (t) => tickFlash(t) * tickW(t);

// ---------------------------------------------------------------- the screen: landscape → falling-blocks game → chat → landscape
export const MODES = [
  { mode: "land", a: -99, b: EV.in2021 - 0.2 },
  { mode: "game", a: EV.in2021 + 0.1, b: EV.in2025 - 0.3 },
  { mode: "chat", a: EV.in2025, b: EV.hours + 0.4 },
  { mode: "land", a: EV.hoursEnd + 0.2, b: 999 },
];
function screenLamp(u, v, t) {
  // each lamp switches mode at its own moment within 0.6 s (a wipe of random pixels, never one frame)
  const thr = hash(u, v, 77) * 0.6;
  let m = MODES[0].mode; for (const M of MODES) if (t >= M.a + thr) m = M.mode;
  if (m === "game") return gameBit(u, v, t);
  if (m === "chat") return chatBit(u, v, t);
  return screenBit(u, v, t, "land", END);
}
// the falling-blocks game on the lamp screen: a 10 × 19 well of 2×2-lamp cells in the middle of the screen
const WELL = { cols: 10, rows: 19, cell: 2 };
const WX = Math.floor(56 - WELL.cols), WY = 2;
const STACK = (() => { const h = [3, 2, 4, 4, 2, 1, 3, 5, 3, 2]; const g = []; for (let c = 0; c < 10; c++) for (let r = 0; r < h[c]; r++) if (hash(c, r, 9) > 0.12 || r === 0) g.push([c, WELL.rows - 1 - r]); return g; })();
const PIECES = [[[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [1, 1], [2, 1]]];
// the game advances in steps: 2 rows a second before the tick section, exactly one row per tick during it
export function gameStep(t) {
  const t0 = EV.in2021, tt = Math.max(0, t - t0), slowFrom = EV.ticks - t0;
  return tt < slowFrom ? Math.floor(tt * 2) : Math.floor(slowFrom * 2) + Math.floor(tt - slowFrom + 0.05);
}
function gameBit(u, v, t) {
  const x = u - WX, y = v - WY; if (x === -1 || x === WELL.cols * 2 || (y === WELL.rows * 2 && x >= -1 && x <= WELL.cols * 2)) return y >= -1 && y <= WELL.rows * 2 ? 1 : 0;   // the well's walls
  if (x < 0 || y < 0 || x >= WELL.cols * 2 || y >= WELL.rows * 2) return 0;
  const c = Math.floor(x / 2), r = Math.floor(y / 2);
  for (const [sc, sr] of STACK) if (sc === c && sr === r) return (x + y) % 2 === 0 || x % 2 === 0 ? 1 : 1;
  const step = gameStep(t), piece = PIECES[Math.floor(step / 14) % PIECES.length], row = step % 14, col = 3 + (Math.floor(step / 14) % 3);
  for (const [pc, pr] of piece) if (pc + col === c && pr + row === r) return 1;
  return 0;
}
// chat: a bubble "HI" from the player, then the bot's bubble with three dots that keep thinking
const CH = { HI: [["101", "101", "111", "101", "101"], ["111", "010", "010", "010", "111"]] };
function chatBit(u, v, t) {
  // bubble 1 (left): x 8..40, y 6..18; bubble 2 (right): x 60..104, y 20..34
  const box = (x0, y0, x1, y1) => (u === x0 || u === x1) && v >= y0 && v <= y1 || (v === y0 || v === y1) && u >= x0 && u <= x1;
  if (box(10, 5, 40, 17) || (u >= 12 && u <= 14 && v === 18) || (u === 12 && v === 19)) return 1;
  // "HI" 3×5 at scale 2
  { const x0 = 18, y0 = 6; const xs = u - x0, ys = v - y0; if (ys >= 0 && ys < 10) { const gi = Math.floor(xs / 8), gx = Math.floor((xs % 8) / 2), gy = Math.floor(ys / 2); if (gi >= 0 && gi < 2 && gx < 3 && xs >= 0 && CH.HI[gi][gy][gx] === "1") return 1; } }
  if (box(60, 21, 104, 35) || (u >= 98 && u <= 100 && v === 36) || (u === 100 && v === 37)) return t > EV.in2025 + 1.2 ? 1 : 0;
  // three dots that light one by one, slowly, over and over: the answer is still coming
  for (let k = 0; k < 3; k++) { const cx = 74 + k * 8, cy = 28; if (Math.abs(u - cx) <= 1 && Math.abs(v - cy) <= 1) { const ph = (t - EV.in2025 - 1.5) * 0.8 - k / 3; return ph > 0 && (ph - Math.floor(ph)) < 0.55 ? 1 : 0; } }
  return 0;
}

// ---------------------------------------------------------------- copies and their visibility
// the copies are seen in the first and last wide shots; they dissolve away while far off screen (8–10 s) and grow back
// one by one on "Copy that thousands of times"
export function copyAlpha(k, t) {
  const gone = smooth(t, 8.2, 9.4), back = smooth(t, EV.copy + 0.1 + k * 0.2, EV.copy + 0.45 + k * 0.2);
  return Math.max(1 - gone, back);
}

// ---------------------------------------------------------------- the hero: walks along the lever column, pulls levers
const HX = -1.35;
export const WALKS = [
  { a: EV.needsEnd - 0.4, b: EV.opposite + 0.4, z0: 0, z1: -7 },
  { a: EV.gate1End - 0.2, b: EV.gate2 - 0.2, z0: -7, z1: -15 },
  { a: EV.on2End + 0.05, b: EV.or + 0.15, z0: -15, z1: -23 },
  { a: EV.worksEnd + 0.15, b: EV.add, z0: -23, z1: -32 },
  { a: 44.6, b: 60.4, z0: -32, z1: 0 },
];
const PULLS = ["A1", "A2", "A3", "B3", "A4", "B4", "hA", "hB"].flatMap((n) => LEVERS[n].at.map((f) => ({ f, n })));
export function hero(t) {
  t = wrap(t);
  let z = 0, walking = null, face = Math.PI / 2;
  for (const w of WALKS) { if (t >= w.b) z = w.z1; else if (t >= w.a) { const k = (t - w.a) / (w.b - w.a), e = ease(k); z = lerp(w.z0, w.z1, e); walking = (t - w.a) * 9; } }
  // facing: towards +x at the levers, along the walk while walking (turns over 0.3 s at both ends)
  for (const w of WALKS) { const dir = w.z1 < w.z0 ? Math.PI : 0, k = Math.min(smooth(t, w.a - 0.1, w.a + 0.25), 1 - smooth(t, w.b - 0.25, w.b + 0.1)); if (k > 0) face = lerp(Math.PI / 2, dir, k); }
  let wave = 0; for (const p of PULLS) wave = Math.max(wave, win(t, p.f - 0.32, p.f + 0.1, 0.2, 0.3) * (Math.abs(leverZ(p.n) - z) < 2.6 ? 1 : 0));
  return { x: HX, y: GROUND + 1, z, face, walk: walking, wave };
}
const LZ = { A1: 0, A2: -7, A3: -16, B3: -14, A4: -25, B4: -21, hA: -34, hB: -30 };
const leverZ = (n) => LZ[n] ?? 99;

// ---------------------------------------------------------------- camera
export const CAM = {
  WIDE: { x: -58, y: 22, z: -56, b: 2.7, ay: 420 },
  E1: { x: 4.6, y: 11, z: 0, b: 30, ay: 410 }, E2: { x: 4.6, y: 11, z: -7, b: 30, ay: 410 }, E3: { x: 5, y: 11.5, z: -15, b: 30, ay: 410 },
  E4: { x: 4.6, y: 11, z: -23, b: 30, ay: 410 }, E5: { x: 5, y: 11.5, z: -32, b: 27, ay: 410 },
  COPIES: { x: 5, y: 11, z: -61, b: 8.5, ay: 430 }, COMP: { x: -60, y: 22, z: -68, b: 2.9, ay: 420 },
  SCREEN: { x: -82, y: 35, z: -33, b: 4.4, ay: 330 }, SCREENW: { x: -78, y: 30, z: -40, b: 3.3, ay: 300 },
};
export const KEYS = [
  [0, 0.9, CAM.WIDE], [5.6, EV.wireEnd, CAM.E1], [EV.wire + 0.3, EV.needsEnd - 0.2, CAM.E1],
  [EV.needsEnd + 0.25, EV.gate1End - 0.15, CAM.E2], [EV.three - 0.1, EV.on2End, CAM.E3], [EV.two + 0.15, EV.worksEnd, CAM.E4],
  [EV.put + 0.3, EV.numbersEnd, CAM.E5], [EV.copy + 0.5, EV.thousands + 0.5, CAM.COPIES], [EV.whole + 0.1, EV.computer2End + 0.2, CAM.COMP],
  [EV.player - 0.2, EV.secondEnd + 0.1, CAM.SCREEN], [EV.phoneChip + 0.3, EV.redstone2End, CAM.SCREENW], [EV.ownE, EV.hours, CAM.SCREENW],
  [EV.lever3 - 0.35, EV.lamp3 + 0.25, CAM.E1], [END + 0.0, END + 1, CAM.WIDE],
];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function rawCam(t) {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++;
  const [a0, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return { ...A };
  const [b0, , Bc] = KEYS[i + 1], k = ease((t - a1) / (b0 - a1));
  // long moves zoom out on the way (the view must not swing past the subject at full zoom)
  const d = dist(A, Bc), bmin = Math.min(A.b, Bc.b), need = Math.max(0, Math.log((d * Math.max(A.b, Bc.b)) / 900)), dip = Math.min(need, 1.6) * Math.sin(Math.PI * k);
  return { x: lerp(A.x, Bc.x, k), y: lerp(A.y, Bc.y, k), z: lerp(A.z, Bc.z, k), b: Math.exp(lerp(Math.log(A.b), Math.log(Bc.b), k) - dip), ay: lerp(A.ay, Bc.ay, k) };
}
const FR = Math.round(END * 30), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / 30));
const SMW = 6;
export function camera(t) {
  const f = Math.round(wrap(t) * 30) % FR; let x = 0, y = 0, z = 0, lb = 0, ay = 0, w = 0;
  for (let k = -SMW; k <= SMW; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SMW / 2) ** 2)); x += c.x * q; y += c.y * q; z += c.z * q; lb += Math.log(c.b) * q; ay += c.ay * q; w += q; }
  const s = { x: x / w, y: y / w, z: z / w, b: Math.exp(lb / w), ay: ay / w };
  // the seam itself is exact: the first and last frames are the WIDE shot
  const exact = Math.max(1 - smooth(wrap(t), 0.15, 0.6), smooth(wrap(t), END - 0.45, END - 0.05));
  if (exact <= 0) return s;
  const e = CAM.WIDE; return { x: lerp(s.x, e.x, exact), y: lerp(s.y, e.y, exact), z: lerp(s.z, e.z, exact), b: Math.exp(lerp(Math.log(s.b), Math.log(e.b), exact)), ay: lerp(s.ay, e.ay, exact) };
}
