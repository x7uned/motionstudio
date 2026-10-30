// LV8 · NIGHT CAMP (mosquito) — the finale. A cosy clearing at the jungle's moonlit edge: a tent with a lamp, a crackling
// campfire, the marsh with reeds and a still puddle on the right (mosquitoes breed there), fireflies, the full moon.
// The channel's own character (the user's pixel avatar sprite, lit for the night, never redrawn) stands by the fire,
// thinks, gestures at the guess cards, shrugs, points at the tiny mosquito that whines in from the reeds, swats at it and
// misses; it gets a crown, lands on his arm and bites on "die"; MALARIA; he turns a little green, sways, sees dizzy stars,
// tips over (stiff as a plank) after the last word, and his cute little ghost rises from the body and waves. Comic, never
// grim: no blood, the bite is a small pink bump. Everything is anchored to the measured words (camp-time.mjs).
import { BIOME } from "../timeline.mjs";
import { fade, mix, bayer, sm, ease, lerp, clamp01, rnd, panel, MAIN, C } from "../cute.mjs";
import { S } from "./camp-kit.mjs";
import { MQ, HERO, BEAT, EV, END } from "./camp-time.mjs";
import { drawBack, drawFront, fireGlow, drawFire, drawTentLamp, drawLantern, drawSign, drawFireflies, drawPuddleLife, drawSwarm, REEDS, SIGN } from "./camp-scene.mjs";
import { drawHero, drawHeroShadow, heroState, cellToRest, drawGhost, armAnchor, HERO_POSE as heroPose, cell } from "./camp-hero.mjs";
import { drawMosquito, mosquitoIcon, crown } from "./camp-mosq.mjs";

export const RANGE = BIOME.camp;
const R = Math.round;
const onScreen = (V) => !(RANGE[1] < V.x0 - 60 || RANGE[0] > V.x1 + 60);
const backOut = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ---------------------------------------------------------------- the mosquito's flight (rest-screen coordinates)
export const HOVER = [272, 372];            // in front of the moon, centre of the frame
const bz = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };
const hoverAt = (t, base = HOVER, amp = 1) => [base[0] + amp * (3 * Math.sin(t * 1.3) + 1.2 * Math.sin(t * 3.7)), base[1] + amp * (2.5 * Math.sin(t * 2.1 + 1) + 1 * Math.sin(t * 5.3))];
const SMUG = [284, 368], AFTER = [300, 452];
/** Where the mosquito's proboscis meets his arm (rest-screen), from the current pose's arm anchor. */
function armPoint(t, st = heroState(t)) {
  const a = armAnchor(...st.A), b = armAnchor(...st.B), pa = cellToRest(st, a[0], a[1]), pb = cellToRest(st, b[0], b[1]);
  return [lerp(pa[0], pb[0], st.k), lerp(pa[1], pb[1], st.k)];
}
const SIT_ROT = 0.9, SIT_S = 1, MS = 1.2;   // MS: the mosquito's size while it owns the centre
/** Head position that puts the proboscis tip (local 0.8, 23) on point p for tilt rot. */
function headFor(p, rot, s = SIT_S) { const c = Math.cos(rot), sn = Math.sin(rot), dx = 0.8 * c - 23 * sn, dy = 0.8 * sn + 23 * c; return [p[0] - dx * s, p[1] - dy * s]; }

export function mqState(t) {
  const o = { t, s: 1, rot: 0, fly: 1, legs: 0, blink: 0, happy: 0, smug: 0, crown: 0, prob: 0, a: 1, look: [0, 0] };
  if (t < MQ.flyIn[0]) return null;
  // crown: pops on "Yes" and stays
  const ck = (t - MQ.crown[0]) / (MQ.crown[1] - MQ.crown[0]); o.crown = ck <= 0 ? 0 : ck >= 1 ? 1 : backOut(ck);
  // blinks
  o.blink = (((t + 0.7) % 3.1) < 0.18) ? Math.sin(Math.PI * ((t + 0.7) % 3.1) / 0.18) : 0;
  let p;
  if (t < MQ.flyIn[1]) {                                     // whine in from the reeds, growing as it comes closer
    const x = clamp01((t - MQ.flyIn[0]) / (MQ.flyIn[1] - MQ.flyIn[0])), u = 0.5 - 0.5 * Math.cos(Math.PI * x);
    p = bz([464, 596], [520, 470], [380, 300], HOVER, u); p = [p[0] + 3 * Math.sin(t * 17) * (1 - u), p[1] + 2.5 * Math.sin(t * 23) * (1 - u)];
    const h = hoverAt(t); p = [lerp(p[0], h[0], u * u), lerp(p[1], h[1], u * u)];
    o.s = lerp(0.36, MS, u); o.rot = -0.35 * Math.sin(Math.PI * u); o.a = sm(t, MQ.flyIn[0], MQ.flyIn[0] + 0.15); o.look = [-0.6 * (1 - u), 0];
  } else if (t < MQ.loop[0]) { p = hoverAt(t); o.s = MS; }
  else if (t < MQ.loop[1]) {                                  // a proud little loop-the-loop
    const u = ease((t - MQ.loop[0]) / (MQ.loop[1] - MQ.loop[0])), th = u * 2 * Math.PI, h = hoverAt(t);
    p = [h[0] + 24 * Math.sin(th), h[1] - 24 * (1 - Math.cos(th))]; o.rot = th; o.happy = Math.sin(Math.PI * u); o.s = MS;
  } else if (t < BEAT.buzz[1]) {                             // dives past his face, zips round his head, dodges the swat
    const u = (t - BEAT.buzz[0]) / (BEAT.buzz[1] - BEAT.buzz[0]), st = heroState(t), face = cellToRest(st, 96, 64);
    const k1 = 0.42;
    if (u < k1) { const v = ease(u / k1); p = bz(hoverAt(BEAT.buzz[0]), [250, 470], [face[0] + 60, face[1] + 10], [face[0] - 34, face[1] - 6], v); o.rot = -0.5 * Math.sin(Math.PI * v); o.look = [-1, 0.4]; }
    else { const v = ease((u - k1) / (1 - k1)); p = bz([face[0] - 34, face[1] - 6], [face[0] - 70, face[1] - 90], [face[0] + 20, face[1] - 120], SMUG, v); o.rot = 0.6 * Math.sin(Math.PI * v); o.look = [0.6, -0.3]; }
    o.smug = sm(u, 0.85, 1); o.s = lerp(MS, 1.0, Math.sin(Math.PI * Math.min(1, u * 1.4)));
  } else if (t < MQ.toArm[0]) {                              // smug hover; crowned; proud squints on the sparkles
    const base = t < EV.yes ? SMUG : [lerp(SMUG[0], HOVER[0], sm(t, EV.yes, EV.yes + 0.6)), lerp(SMUG[1], HOVER[1], sm(t, EV.yes, EV.yes + 0.6))];
    p = hoverAt(t, base); if (t < EV.yes) p[0] += 4 * Math.sin((t - BEAT.smug[0]) * 7) * sm(t, BEAT.smug[0], BEAT.smug[0] + 0.2);
    o.smug = 1 - sm(t, EV.yes, EV.yes + 0.3);
    o.happy = Math.max(sm(t, EV.yes + 0.1, EV.yes + 0.3) * (1 - sm(t, EV.yes + 0.8, EV.yes + 1.0)), sm(t, EV.mosquito2, EV.mosquito2 + 0.15) * (1 - sm(t, EV.mosquito2 + 0.6, EV.mosquito2 + 0.8)));
    o.s = MS + 0.06 * sm(t, EV.yes, EV.yes + 0.3) * (1 - sm(t, EV.every - 0.4, EV.every));
  } else if (t < MQ.sit[0]) {                                // sneaks down to his arm and lands
    const u = ease((t - MQ.toArm[0]) / (MQ.toArm[1] - MQ.toArm[0])), land = headFor(armPoint(MQ.sit[0]), SIT_ROT);
    p = bz(hoverAt(MQ.toArm[0]), [360, 470], [300, 560], land, u); p = [p[0] + 3 * Math.sin(t * 9) * (1 - u), p[1] + 2 * Math.sin(t * 13) * (1 - u)];
    o.rot = SIT_ROT * sm(u, 0.6, 1) - 0.25 * Math.sin(Math.PI * u); o.legs = sm(u, 0.7, 1); o.s = lerp(MS, SIT_S, sm(u, 0.3, 0.9)); o.fly = 1 - sm(u, 0.9, 1) * 0.6; o.look = [-0.7, 0.5];
  } else if (t < MQ.hop[0]) {                                // sits on the arm, then bites on "die"
    const pt = armPoint(t), bite = sm(t, MQ.bite[0], MQ.bite[0] + 0.08);
    p = headFor([pt[0] + 2 * (1 - bite), pt[1]], SIT_ROT); o.rot = SIT_ROT; o.legs = 1; o.fly = 0.4 * (1 - sm(t, MQ.sit[0], MQ.sit[0] + 0.3)); o.prob = bite; o.look = [-0.8, 0.6];
    o.happy = sm(t, MQ.bite[0] + 0.05, MQ.bite[0] + 0.15);
  } else if (t < MQ.hop[1]) {                                // pops off as he jerks his hands up
    const u = ease((t - MQ.hop[0]) / (MQ.hop[1] - MQ.hop[0])), from = headFor(armPoint(MQ.hop[0]), SIT_ROT);
    p = bz(from, [from[0] + 30, from[1] - 50], [AFTER[0] - 10, AFTER[1] - 30], hoverAt(t, AFTER), u); o.rot = SIT_ROT * (1 - u) + 0.4 * Math.sin(Math.PI * u); o.legs = 1 - u; o.fly = sm(u, 0, 0.25); o.happy = 1 - sm(u, 0.5, 1); o.s = lerp(SIT_S, 1.1, u);
  } else if (t < MQ.away[0]) {                               // hovers, satisfied, while the malaria tag shows
    p = hoverAt(t, AFTER); o.s = 1.1; o.look = [-0.5, 0.4]; o.happy = sm(t, EV.carries, EV.carries + 0.2) * (1 - sm(t, EV.carries + 0.6, EV.carries + 0.8));
  } else if (t < MQ.away[1]) {                               // flies off happily toward the moon, getting smaller
    const u = ease((t - MQ.away[0]) / (MQ.away[1] - MQ.away[0]));
    p = bz(hoverAt(MQ.away[0], AFTER), [380, 420], [340, 300], lapAt(MQ.away[1]), u); o.s = lerp(1.1, 0.46, u); o.rot = 0.4 * Math.sin(Math.PI * u * 2); o.happy = 1 - sm(u, 0.6, 0.8);
  } else { p = lapAt(t); o.s = 0.46 + 0.07 * Math.cos(lapPh(t)); }
  o.x = p[0]; o.y = p[1];
  return o;
}
const LAP_T = 2.3;
const lapPh = (t) => (2 * Math.PI * (t - MQ.laps[0])) / LAP_T;
function lapAt(t) { const ph = lapPh(t); return [270 + 64 * Math.sin(ph), 356 + 20 * Math.cos(ph) + 4 * Math.sin(ph * 3)]; }

// ---------------------------------------------------------------- small effects
function star4(c, x, y, r, col, a) { const g = fade(c, a); x = R(x); y = R(y); for (let i = -r; i <= r; i++) { g.px(x + i, y, col); g.px(x, y + i, col); } if (r >= 3) { g.px(x - 1, y - 1, col); g.px(x + 1, y - 1, col); g.px(x - 1, y + 1, col); g.px(x + 1, y + 1, col); } g.px(x, y, "#FFFFFF"); }
function sparkles(c, V, t, x, y) {
  for (const t0 of MQ.sparkles) {
    const u = (t - t0) / 0.6; if (u <= 0 || u >= 1) continue;
    for (let i = 0; i < 5; i++) { const ang = i * 1.257 + t0 * 3, r = 18 + 14 * ease(u) + rnd(i + t0) * 6, [sx, sy] = S(V, x + Math.cos(ang) * r, y - 6 + Math.sin(ang) * r * 0.8); star4(c, sx, sy, u < 0.5 ? 3 : 2, i % 2 ? "#FFE07A" : "#FFFFFF", Math.sin(Math.PI * u)); }
  }
}
/** Yellow dizzy star with a dark rim (5 px). */
function dizzyStar(c, x, y, a, big) { const g = fade(c, a); x = R(x); y = R(y); const r = big ? 4 : 3; for (const [dx, dy] of [[0, -r - 1], [0, r + 1], [-r - 1, 0], [r + 1, 0]]) g.px(x + dx, y + dy, "#2A1A08"); for (let i = -r; i <= r; i++) { g.px(x + i, y, "#FFD84A"); g.px(x, y + i, "#FFD84A"); } g.px(x, y, "#FFF8C8"); if (big) { g.px(x - 1, y - 1, "#FFE88A"); g.px(x + 1, y + 1, "#E8A820"); g.px(x + 1, y - 1, "#FFE88A"); g.px(x - 1, y + 1, "#E8A820"); } }
/** Swat: little swish arcs beside both hands as they snap together on empty air. */
function swatLines(c, V, t, st) {
  const u = (t - (BEAT.clap - 0.1)) / 0.32; if (u <= 0 || u >= 1) return;
  const a = Math.sin(Math.PI * u), box = st.cB.box, mid = (box[0] + box[2]) / 2;
  for (const sd of [-1, 1]) {
    const hand = cellToRest(st, mid + sd * 30, box[1] + 92);
    for (let k = 0; k < 3; k++) { const r = 10 + k * 5 + 6 * u, g = fade(c, a * (1 - k * 0.25));
      for (let q = -0.8; q <= 0.8; q += 0.08) { const [sx, sy] = S(V, hand[0] + sd * (6 + Math.cos(q) * r * 0.6), hand[1] - 4 + Math.sin(q) * r); g.px(R(sx), R(sy), k ? "#C8C0F0" : "#FFFFFF"); if (!k) g.px(R(sx) + sd, R(sy), "#FFFFFF"); } }
  }
}
function bump(c, V, t, st) {
  const k = sm(t, HERO.bumpGrow[0], HERO.bumpGrow[1]); if (k <= 0) return;
  const pulse = 1 + 0.15 * Math.sin((t - HERO.bite) * 9) * (1 - sm(t, HERO.bite + 0.4, HERO.bite + 1.2)), [x, y] = armPoint(t, st), [sx, sy] = S(V, x + 1, y), r = 2.6 * k * pulse;
  if (r < 0.6) return; const X = R(sx), Y = R(sy);
  c.disc(X, Y, Math.max(1, R(r + 0.6)), "#6A1424"); c.disc(X, Y, Math.max(0, R(r)), "#E2485A"); c.px(X - 1, Y - 1, "#FF9AA4"); if (r > 2) c.px(X, Y - 1, "#FFC8CC");
}
function sweat(c, V, t, st) {
  const u = (t - HERO.sweat[0]) / (HERO.sweat[1] - HERO.sweat[0]); if (u <= 0 || u >= 1) return;
  const tp = st.cB.temple, [x, y] = cellToRest(st, tp[0], tp[1] + 10 * ease(u)), [sx, sy] = S(V, x, y), a = Math.min(sm(u, 0, 0.2), 1 - sm(u, 0.75, 1)), g = fade(c, a), X = R(sx), Y = R(sy);
  g.poly([[X, Y - 5], [X + 3, Y], [X + 2, Y + 3], [X - 2, Y + 3], [X - 3, Y]], "#BFEFFF"); g.line(X + 3, Y, X + 1, Y + 3, "#5AA8D0"); g.px(X - 1, Y - 1, "#FFFFFF"); g.px(X, Y - 4, "#5AA8D0");
}
function dizzy(c, V, t, st, front) {
  const a = sm(t, HERO.dizzy[0], HERO.dizzy[1]); if (a <= 0) return;
  const h = st.cB.head, top = st.cB.box[1], ctr = cellToRest(st, h[0], top + 2);
  for (let i = 0; i < 3; i++) {
    const ph = t * 4.2 + (i * 2 * Math.PI) / 3, inFront = Math.sin(ph) > 0; if (inFront !== front) continue;
    const lying = st.rot > 1, rx = 28, ry = 7, ox = Math.cos(ph) * rx, oy = Math.sin(ph) * ry;
    const [sx, sy] = S(V, ctr[0] + (lying ? oy * 1.5 + 6 : ox), ctr[1] + (lying ? ox : oy - 4));
    dizzyStar(c, sx, sy, a * (inFront ? 1 : 0.7), inFront);
  }
}
function dust(c, V, t, st) {
  const b = HERO.bounce, u = (t - b[0]) / 0.7; if (u <= 0 || u >= 1) return;
  const box = st.cB.box, feet = cellToRest(st, box[0] + 20, box[3]), head = cellToRest(st, 96, box[1] + 30);
  for (const [px, py, n] of [[feet[0], 641, 4], [head[0], 641, 5], [(feet[0] + head[0]) / 2, 641, 3]]) for (let i = 0; i < n; i++) {
    const ang = Math.PI * (0.15 + 0.7 * (i / Math.max(1, n - 1))), r = 6 + 20 * ease(u), x = px + Math.cos(ang) * r * (i % 2 ? 1 : -1) * 1.4, y = py - 4 - Math.sin(ang) * r * 0.55 - 8 * u, rr = 4 + 5 * u, a = 0.95 * (1 - u * u);
    const [sx, sy] = S(V, x, y); c.tint(R(sx - rr), R(sy - rr), R(2 * rr) + 1, R(2 * rr) + 1, (X, Y) => { const d = Math.hypot(X - sx, Y - sy) / rr; return d >= 1 ? 0 : a * (1 - d * d); }, "#B4ACCC", 4);
  }
}
/** The MALARIA tag with a tiny wobbling parasite blob, near the bite (screen space, anchored to the world). */
function malariaTag(c, V, t) {
  const a = Math.min(sm(t, MQ.tag[0], MQ.tag[0] + 0.25), 1 - sm(t, MQ.tag[1] - 0.3, MQ.tag[1])); if (a <= 0) return;
  const st = heroState(t), bp = armPoint(t, st), pop = backOut(clamp01((t - MQ.tag[0]) / 0.3));
  const text = "MALARIA", s = 2, tw = c.measure(MAIN, text, { scale: s }), w = tw + 38, h = 28, [cx, cy] = S(V, 306, 522 + (1 - pop) * 8), x = R(cx - w / 2), y = R(cy);
  // dotted leader from the bite to the tag
  const [bx, by] = S(V, bp[0] + 3, bp[1]); const g = fade(c, a);
  for (let i = 0; i < 18; i++) { const q = i / 18, lx = lerp(bx + 3, x, q), ly = lerp(by, y + h / 2, q) - Math.sin(Math.PI * q) * 6; if (i % 2 === 0) g.px(R(lx), R(ly), "#FF8A9A"); }
  panel(c, x, y, w, h, a, "#FF5A7A");
  for (const [dx, dy] of [[1, 1]]) g.text(MAIN, text, x + 30 + dx, y + 7 + dy, C.O, { scale: s });
  g.text(MAIN, text, x + 30, y + 7, "#FFB4C0", { scale: s });
  // the parasite: a wobbly purple blob with a tiny tail and two dot eyes
  const px = x + 15, py = y + h / 2;
  for (let Y = -6; Y <= 6; Y++) for (let X = -8; X <= 8; X++) {
    const ang = Math.atan2(Y, X), rr = 5.2 + 0.9 * Math.sin(ang * 3 + t * 5) + 0.5 * Math.sin(ang * 5 - t * 7), d = Math.hypot(X, Y * 1.15);
    if (d <= rr) g.px(px + X, R(py + Y), d > rr - 1 ? "#3A0E40" : Y < -1 ? "#D884F0" : "#A850C8");
  }
  g.px(px - 2, R(py) - 1, "#1A0620"); g.px(px + 2, R(py) - 1, "#1A0620"); g.px(px - 2, R(py) - 2, "#FFFFFF"); g.px(px + 2, R(py) - 2, "#FFFFFF");
  for (let i = 0; i < 5; i++) g.px(px + 6 + i, R(py + 3 + Math.sin(t * 8 + i) * 1.2), "#3A0E40");
}

// ---------------------------------------------------------------- module interface
export function back(c, V, t) {
  if (!onScreen(V)) return;
  drawBack(c, V); fireGlow(c, V, t); drawTentLamp(c, V, t); drawLantern(c, V, t); drawPuddleLife(c, V, t);
  drawSwarm(c, V, t, 1);
}
export function actors(c, V, t) {
  if (!onScreen(V)) return;
  drawSign(c, V, t);
  drawFire(c, V, t);
  const st = heroState(t), mq = mqState(t), mqBehind = mq && t >= MQ.toArm[1] - 0.15 && t < MQ.hop[0] ? false : true;
  drawHeroShadow(c, V, t, st);
  dizzy(c, V, t, st, false);
  drawHero(c, V, t, st);
  bump(c, V, t, st); sweat(c, V, t, st); swatLines(c, V, t, st); dizzy(c, V, t, st, true); dust(c, V, t, st);
  // the ghost rises slowly out of the body and waves (still rising at the end)
  if (t > HERO.ghost[0]) {
    const u = t - HERO.ghost[0], body = cellToRest(st, 96, 120), a = sm(u, 0, 0.45);
    drawGhost(c, V, t, body[0] + 8 + 3 * Math.sin(u * 2.6), body[1] + 6 - 22 * u - 62 * (1 - Math.exp(-1.7 * u)) + 2 * Math.sin(u * 3.1), a);
  }
  if (mq) { const [x, y] = S(V, mq.x, mq.y); drawMosquito(c, x, y, mq); sparkles(c, V, t, mq.x, mq.y); }
}
export function front(c, V, t) {
  if (!onScreen(V)) return;
  drawFront(c, V); drawFireflies(c, V, t);
}
export function hud(c, V, t) { if (!onScreen(V)) return; malariaTag(c, V, t); }

/** Head portrait of the mosquito (~56 × 56) for the readout. */
export function ICON(c, cx, cy, a = 1) { mosquitoIcon(c, cx, cy, a); }
/** Current screen box of the channel's character {x, y, w, h}. */
export function HERO_POSE(t) { return heroPose(t); }
export { MQ, HERO };
