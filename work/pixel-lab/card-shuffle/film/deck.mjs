// The deck: our own pixel cards (30×42 faces, procedural backs at any size) and the exact choreography of every card over
// time, computed from the simulated orders in timeline.mjs (START → riffle → cloud/picks → spread → overhand → a fresh
// deck → cut 26 | 26 → weave → 7 more perfect out-shuffles → START again). cardsAt(t) lists every card with its place,
// size, face/back mix, tint and z; drawDeck(c, t) draws them (shadows first) in z order. Pure functions of t.
import { Canvas, MAIN, bayer, mix } from "../../../../renderer/pixel/raster.mjs";
import {
  EV, T, START, RIFF, RIFFLE, OVERHAND, OVER_PACKETS, PERF, perfAt, cardOf, slot, homeTL, HOME, HOOK, CARD_W, CARD_H, ROW_Y,
} from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export const COL = { OUT: "#1A1428", IV: "#FDFEED", IV2: "#E4DDCB", RED: "#D0283E", BLK: "#2A2140", GOLD: "#F4CA50", CYAN: "#5FD8F0", BACK: "#4A3384", BACK2: "#8D59DA", BACK3: "#2E2058" };
// suit pips 7×7 (our drawing)
export const PIP = {
  H: [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
  D: ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."],
  S: ["...#...", "..###..", ".#####.", "#######", "#######", "...#...", "..###.."],
  C: ["..###..", "..###..", "##.#.##", "#######", "##.#.##", "...#...", "..###.."],
};
const RANK = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const suitColor = (s) => (s === "H" || s === "D" ? COL.RED : COL.BLK);
export function pip(c, s, x, y, col, scale = 1) { PIP[s].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") c.rect(x + i * scale, y + j * scale, scale, scale, col); })); }
/** Rank glyph: MAIN font, with a narrow "10" (1 is 3 px wide) so it fits the visible strip of a spread card. */
export function rankText(c, rank, x, y, col, scale = 1) {
  if (rank !== 10) { c.text(MAIN, RANK[rank], x, y, col, { scale }); return; }
  for (let j = 0; j < 7; j++) c.rect(x + 1 * scale, y + j * scale, scale, scale, col);
  c.rect(x, y + scale, scale, scale, col); c.rect(x, y + 6 * scale, 3 * scale, scale, col);
  c.text(MAIN, "0", x + 4 * scale, y, col, { scale });
}

// ---------------------------------------------------------------- sprites (cached): face × tint
const KEY = "#FF00FE", SPR = new Map();
function faceSprite(id, tint) {
  const key = id + ":" + (tint || ""); if (SPR.has(key)) return SPR.get(key);
  const c = new Canvas(CARD_W, CARD_H, KEY), { suit, rank } = cardOf(id), ink = suitColor(suit);
  const fill = tint ? mix(COL.IV, tint, 0.36) : COL.IV, fill2 = tint ? mix(COL.IV2, tint, 0.4) : COL.IV2;
  c.rrect(0, 0, CARD_W, CARD_H, COL.OUT, 2); c.rrect(1, 1, CARD_W - 2, CARD_H - 2, fill, 1);
  c.rect(2, CARD_H - 2, CARD_W - 4, 1, fill2); c.rect(CARD_W - 2, 2, 1, CARD_H - 4, fill2);
  if (tint) { c.rect(2, 1, CARD_W - 4, 1, tint); c.rect(1, 2, 1, CARD_H - 4, tint); }
  rankText(c, rank, 3, 3, ink); pip(c, suit, 3, 12, ink);
  if (rank >= 11) { // court cards: a framed letter
    c.rect(14, 15, 21, 31, mix(ink, fill, 0.78)); c.frame(14, 15, 21, 31, ink); c.text(MAIN, RANK[rank], 17, 20, ink, { scale: 3 }); pip(c, suit, 21, 37, ink, 1);
  } else if (rank === 1) pip(c, suit, 10, 17, ink, 3);
  else pip(c, suit, 13, 21, ink, 2);
  // the small mirrored corner pip
  PIP[suit].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") c.px(CARD_W - 4 - i, CARD_H - 4 - j, ink); }));
  const m = new Uint8Array(CARD_W * CARD_H), k = [0xff, 0x00, 0xfe];
  for (let i = 0; i < m.length; i++) m[i] = c.d[i * 3] === k[0] && c.d[i * 3 + 1] === k[1] && c.d[i * 3 + 2] === k[2] ? 0 : 1;
  const s = { d: c.d, m }; SPR.set(key, s); return s;
}
/** The back at any size: dark outline, ivory rim, purple lattice, a small gold diamond. */
function backAt(c, x, y, w, h, a = 1) {
  const g = a >= 1 ? c : { px: (X, Y, col) => { if (a > bayer(X, Y)) c.px(X, Y, col); } };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1); if (corner) continue;
    const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1, rim = i === 1 || j === 1 || i === w - 2 || j === h - 2;
    let col = edge ? COL.OUT : rim ? COL.IV : (i + j) % 4 === 0 || (i - j + 400) % 4 === 0 ? COL.BACK2 : COL.BACK;
    const cx = Math.abs(i - (w - 1) / 2), cy = Math.abs(j - (h - 1) / 2); if (!edge && !rim && cx / Math.max(2, w * 0.16) + cy / Math.max(3, h * 0.16) <= 1) col = COL.GOLD;
    g.px(x + i, y + j, col);
  }
}
/** Draw one card: (x, y) top-left, size w×h, face 0..1 (back → face dissolve), tint colour with tintA, hi (white flash). */
export function drawCard(c, id, x, y, { w = CARD_W, h = CARD_H, face = 1, tint = null, tintA = 0, hi = 0, a = 1, clipX1 = 1e9 } = {}) {
  x = R(x); y = R(y); w = Math.max(4, R(w)); h = Math.max(6, R(h));
  if (face < 1) backAt(c, x, y, w, h, a);
  if (face <= 0) return;
  const A = faceSprite(id, null), B = tint && tintA > 0 ? faceSprite(id, tint) : null, d = c.d, full = w === CARD_W && h === CARD_H;
  for (let j = 0; j < h; j++) {
    const Y = y + j; if (Y < 0 || Y >= c.h) continue; const sj = full ? j : Math.min(CARD_H - 1, Math.floor((j * CARD_H) / h));
    for (let i = 0; i < w; i++) {
      const X = x + i; if (X < 0 || X >= c.w || X >= clipX1) continue; const si = full ? i : Math.min(CARD_W - 1, Math.floor((i * CARD_W) / w)), k = sj * CARD_W + si;
      if (!A.m[k]) continue; const th = bayer(X, Y); if ((face < 1 && face <= th) || (a < 1 && a <= th)) continue;
      const S = B && tintA > bayer(X + 1, Y + 2) ? B : A, p = (Y * c.w + X) * 3;
      let r = S.d[k * 3], g = S.d[k * 3 + 1], b = S.d[k * 3 + 2];
      if (hi > 0) { const q = Math.round(hi * 3) / 3; r = r + (255 - r) * q * 0.55; g = g + (255 - g) * q * 0.55; b = b + (236 - b) * q * 0.4; }
      d[p] = r; d[p + 1] = g; d[p + 2] = b;
    }
  }
}

// ---------------------------------------------------------------- choreography
export const LPK = { x: 224, y: HOME.y }, UPK = { x: 316, y: HOME.y };       // the two packets of the overhand
export const LPKH = { x: 208, y: HOOK.y }, UPKH = { x: 332, y: HOOK.y };     // the two packets of the hook riffle
export const deckAt = (t) => { const k = ease((t - T.toHome[0]) / (T.toHome[1] - T.toHome[0])); return { x: HOME.x, y: lerp(HOOK.y, HOME.y, k) }; };
export const CELLS = [{ x: 106, y: 366 }, { x: 186, y: 366 }, { x: 266, y: 366 }]; // the "52 × 51 × 50 × … × 1" cells (top-left)
const MINI = { w: 18, h: 25 };
const cloudXY = (m, t) => { const u = hash(m * 7 + 3), v = hash(m * 13 + 5); return { x: 44 + u * 430 + 1.6 * Math.sin(t * 1.7 + m), y: 180 + v * 140 + 2 * Math.sin(t * 2.3 + m * 1.3) }; };
const at = (p, k, from, to, arc = 0) => ({ x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) - arc * Math.sin(Math.PI * k) });
export const TINT_RIFF = (m) => (RIFFLE.from[m][0] === 0 ? COL.GOLD : COL.CYAN);
const tintStart = (id) => (id < 26 ? COL.GOLD : COL.CYAN);
// hook gather / riffle-spread gather: the cards nearest the ends go first (the hands sweep inwards)
const sweepStart = (pos, t0, span) => t0 + ((pos % 26 < 13 ? pos % 26 : 25 - (pos % 26)) / 12) * span;

/** Cards on the riffle pile: per new position, the drop time and a little untidy offset that squares up. */
const DROP = RIFF.map((_, m) => ({ t: T.drops[0] + (m / 51) * (T.drops[1] - T.drops[0]) + (hash(m + 91) - 0.5) * 0.012, jx: R((hash(m + 17) - 0.5) * 5), jy: R((hash(m + 29) - 0.5) * 3) }));
export const RIFFLE_DROPS = DROP.map((d, m) => ({ t: d.t, side: RIFFLE.from[m][0] }));
const OVER_T = OVER_PACKETS.map((_, j) => T.over0 + j * T.overStep);
export const OVER_TIMES = OVER_T;

export function cardsAt(t) {
  const L = [];
  const push = (o) => L.push({ w: CARD_W, h: CARD_H, face: 1, tint: null, tintA: 0, hi: 0, lift: 0, ...o });
  // ---------- hook: spread → deck
  if (t < T.cut1[0]) {
    for (let k = 0; k < 52; k++) { const s0 = sweepStart(k, T.gather[0], 0.85), v = clamp01((t - s0) / 0.4), a = slot(k), b = homeTL(k, HOOK), ux = ease(Math.min(1, v * 1.35)), uy = ease(v); push({ id: START[k], x: lerp(a.x, b.x, ux), y: lerp(a.y, b.y, uy) - 6 * Math.sin(Math.PI * v), z: k, lift: Math.sin(Math.PI * v) * 3 }); }
    return L;
  }
  // ---------- hook riffle: cut → drops → square
  if (t < T.square[1] + 0.02) {
    const cutK = ease((t - T.cut1[0]) / (T.cut1[1] - T.cut1[0]));
    const goneL = RIFFLE.from.filter((f, m) => f[0] === 0 && DROP[m].t <= t).length, goneU = RIFFLE.from.filter((f, m) => f[0] === 1 && DROP[m].t <= t).length;
    for (let m = 0; m < 52; m++) {
      const [pk, idx] = RIFFLE.from[m], id = RIFF[m], d = DROP[m];
      const packAt = pk === 0 ? LPKH : UPKH, sIdx = idx - (pk === 0 ? goneL : goneU) + (t >= d.t ? 0 : 0);
      if (t < d.t) {
        // still in its packet: from the deck (START position = idx or 26 + idx) to the packet during the cut
        const p0 = homeTL(pk === 0 ? idx : 26 + idx, HOOK), p1 = homeTL(Math.max(0, sIdx), packAt), p = at(0, cutK, p0, p1, pk === 1 ? 7 : 0);
        push({ id, ...p, z: (pk === 0 ? 200 : 300) + idx, lift: pk === 1 ? Math.sin(Math.PI * cutK) * 3 : 0 });
      } else {
        const u = clamp01((t - d.t) / 0.16), sq = ease((t - T.square[0]) / (T.square[1] - T.square[0]));
        const p1 = homeTL(m, HOOK), dest = { x: p1.x + d.jx * (1 - sq), y: p1.y + d.jy * (1 - sq) }, p = at(0, ease(u), homeTL(0, packAt), dest, 8);
        push({ id, ...p, z: u < 1 ? 100 + m : m, lift: Math.sin(Math.PI * u) * 4 });
      }
    }
    return L;
  }
  // ---------- the riffled deck: stack → cloud → cells / back → stack
  if (t < T.spreadR[0]) {
    for (let m = 0; m < 52; m++) {
      const id = RIFF[m];
      if (t < T.cloud[0]) { push({ id, ...homeTL(m, deckAt(t)), z: m }); continue; }
      const c0 = T.cloud[0] + (51 - m) * 0.007, u = ease((t - c0) / 0.5), cl = cloudXY(m, t);
      let pick = null, back = null;
      if (m < 3) pick = [T.pick1, T.pick2, T.pick3][m];
      else { const r0 = T.rest[0] + ((m - 3) / 48) * (T.rest[1] - T.rest[0] - 0.35); back = [r0, r0 + 0.35]; }
      if (pick && t >= pick[0]) {
        const v = ease((t - pick[0]) / (pick[1] - pick[0])), ret = ease((t - T.cellsBack[0] - m * 0.06) / 0.42);
        const cell = CELLS[m], p = ret > 0 ? at(0, ret, cell, homeTL(m), 12) : at(0, v, cloudXY(m, pick[0]), cell, 16);
        push({ id, ...p, w: lerp(MINI.w, CARD_W, v), h: lerp(MINI.h, CARD_H, v), face: sm(v, 0.45, 1), z: ret > 0 ? m : 150 + m, lift: Math.sin(Math.PI * v) * 5 });
        continue;
      }
      if (back && t >= back[0]) {
        const v = ease((t - back[0]) / 0.35), p = at(0, v, cloudXY(m, back[0]), homeTL(m), 10);
        push({ id, ...p, w: lerp(MINI.w, CARD_W, v), h: lerp(MINI.h, CARD_H, v), face: sm(v, 0.5, 1), z: v < 1 ? 120 + m : m, lift: Math.sin(Math.PI * v) * 4 });
        continue;
      }
      const p = at(0, u, homeTL(m), cl, 14);
      push({ id, ...p, w: lerp(CARD_W, MINI.w, u), h: lerp(CARD_H, MINI.h, u), face: 1 - sm(u, 0, 0.55), z: 60 + m, lift: 2 + Math.sin(Math.PI * u) * 4 });
    }
    return L;
  }
  // ---------- one riffle, spread out with its two runs; gathered back
  if (t < T.over0 - 0.22) {
    const tintA = sm(t, EV.still - 0.15, EV.still + 0.3) * (1 - sm(t, EV.in1992 - 0.25, EV.in1992 + 0.35));
    const runIdx = RIFFLE.from.map((f) => f[1]);
    for (let m = 0; m < 52; m++) {
      const id = RIFF[m], s0 = T.spreadR[0] + m * 0.012, u = ease((t - s0) / 0.32);
      const g0 = sweepStart(m, T.gatherR[0], 0.5), g = ease((t - g0) / 0.35);
      const p = g > 0 ? at(0, g, slot(m), homeTL(m), 10) : at(0, u, homeTL(m), slot(m), 12);
      const hiT = EV.keeps + 0.05 + runIdx[m] * 0.045, hi = t > hiT && t < hiT + 0.35 ? Math.sin((Math.PI * (t - hiT)) / 0.35) : 0;
      push({ id, ...p, z: m, tint: TINT_RIFF(m), tintA, hi, lift: Math.sin(Math.PI * (g > 0 ? g : u)) * 3 });
    }
    return L;
  }
  // ---------- overhand, then the deck swap
  if (t < T.spreadP[0]) {
    const toR = ease((t - (T.over0 - 0.22)) / 0.2), outK = ease((t - T.swapOut[0]) / (T.swapOut[1] - T.swapOut[0]));
    // the old deck: RIFF in the right hand, packets go to the left pile (OVERHAND.moves), then the pile slides off right
    OVERHAND.moves.forEach((mv, j) => {
      const tj = OVER_T[j], v = ease((t - tj) / T.overDur);
      mv.cards.forEach((id, i) => {
        const m = RIFF.indexOf(id), from = homeTL(m, { x: lerp(HOME.x, UPK.x, toR), y: HOME.y }), pileIdx = mv.pileBase + i;
        const pileAt = { x: lerp(LPK.x, 640, outK), y: LPK.y }, to = homeTL(pileIdx, pileAt);
        const p = v > 0 ? at(0, v, from, to, 9) : from;
        if (p.x > 560) return;
        push({ id, ...p, z: v >= 1 ? pileIdx : v > 0 ? 200 + pileIdx : 100 + m, lift: Math.sin(Math.PI * v) * 4 });
      });
    });
    // the fresh deck slides in from the left
    const inK = ease((t - T.swapIn[0]) / (T.swapIn[1] - T.swapIn[0]));
    if (t > T.swapIn[0]) for (let k = 0; k < 52; k++) { const p = homeTL(k, { x: lerp(-40, HOME.x, inK), y: HOME.y }); if (p.x < -40) continue; push({ id: START[k], ...p, z: 400 + k }); }
    return L;
  }
  // ---------- the fresh deck: spread, cut 26 | 26, weave, 7 more perfect shuffles → START
  const tintA = sm(t, EV.cut + 0.15, EV.cut + 0.6) * (1 - sm(t, EV.startedEnd + 0.35, EV.startedEnd + 0.95));
  const apart = ease((t - T.cutApart[0]) / (T.cutApart[1] - T.cutApart[0]));
  let j = 0; while (j < 8 && t >= perfAt(j + 1)) j++;          // shuffles started so far
  const posOf = (order) => { const p = new Array(52); order.forEach((id, i) => (p[id] = i)); return p; };
  const P0 = posOf(PERF[Math.max(0, j - 1)]), P1 = posOf(PERF[j]);
  for (let id = 0; id < 52; id++) {
    const s0 = T.spreadP[0] + id * 0.011, u = ease((t - s0) / 0.32);
    if (j === 0) {
      const off = (id < 26 ? -8 : 8) * apart, sl = slot(id), p = at(0, u, homeTL(id), { x: sl.x, y: sl.y + off }, 12);
      push({ id, ...p, z: id, tint: tintStart(id), tintA, lift: Math.sin(Math.PI * u) * 3 }); continue;
    }
    const a = P0[id], b = P1[id];
    let k, from = slot(a), to = slot(b);
    if (j === 1) { const pair = a < 26 ? a : a - 26; k = ease((t - (perfAt(1) + pair * T.zipStep)) / T.zipDur); from = { x: from.x, y: from.y + (a < 26 ? -8 : 8) }; }
    else k = ease((t - perfAt(j) - (a / 51) * 0.03) / T.morphDur);
    const p = at(0, k, from, to, a < 26 === b < 26 ? 6 : 0), glow = j === 8 && t > perfAt(8) + 0.36 ? (() => { const h0 = EV.started + 0.05 + (b / 51) * 0.5; return t > h0 && t < h0 + 0.35 ? Math.sin((Math.PI * (t - h0)) / 0.35) : 0; })() : 0;
    push({ id, ...p, z: k > 0 && k < 1 ? 60 + lerp(a, b, k) : b, tint: tintStart(id), tintA, hi: glow, lift: Math.sin(Math.PI * k) * 3 });
  }
  return L;
}

/** Shadows (one soft dithered offset rectangle per card) then the cards, in z order. */
export function drawDeck(c, t) {
  const L = cardsAt(t).sort((a, b) => a.z - b.z);
  for (const q of L) { const o = 2 + R(q.lift), x0 = R(q.x) + o, y0 = R(q.y) + o + 1, w = R(q.w), h = R(q.h);
    c.tint(Math.max(0, x0), Math.max(0, y0), Math.min(w, c.w - Math.max(0, x0)), Math.min(h, c.h - Math.max(0, y0)), () => 0.42, "#04140C", 3); }
  for (const q of L) drawCard(c, q.id, q.x, q.y - R(q.lift * 0.5), q);
  return L;
}
export { ROW_Y };
