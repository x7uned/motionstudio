// ============================================================================================================================
// CASINO KIT · EXTRAS (added by film 4 casino-money, 2026-10-27). Film 5: copy with the rest of the kit as a frozen copy.
// Our own drawings, no brands. World pieces go through the kit camera (casino-core.mjs makeView); hand props are drawn in
// screen space at a scale s (px per cm, usually the billboard's G.z / 1.75 or V.k at the anchor).
//
// cashierCage(c, V, t, Q, st)   kiosk with brass bars: Q = { x0, x1, z0, z1 (bar plane), win (x of the money hole) }.
//                               st = { a, inside(c, V) (things behind the bars, e.g. bills going in), ledge(c, V) (things on
//                               the outside ledge), cashierHands: [[x,y,z],[x,y,z]] }. CAGE_Y = { counter, bars, top }.
// giftShop(c, V, t, S, st)      kiosk with an awning, shelves of gifts, a clerk and a register: S = { x0, x1, z0, z1, reg }.
//                               st = { beep 0..1 (register screen), top(c, V) (things on the counter) }. SHOP_Y.counter.
// cocktail(c, x, y, s, a, o)    highball with ice, orange slice, straw, umbrella; (x, y) = bottom centre, s px per cm.
//                               o.level 1..0 (drink left), o.tilt (radians).
// priceTag(c, cx, cy, s, flip, a, o)  hanging tag on a string: front «FREE», back «?» + rolling «$» digits; flip 0..1 turns
//                               it around its string (continuous squash). o = { t, string: [x, y] (top end) }.
// banknote(c, cx, cy, w, a, o)  green bill, o = { ang, grey 0..1, squash (perspective 0..1) }.
// plasticCard(c, cx, cy, w, a, o)  generic payment card (shop scene).
// playerCard(c, cx, cy, w, a, o) our player card (purple, gold star, «PLAYER»), o = { ribbon 0..1 (gift ribbon + bow), ang,
//                               sparkle 0..1, t }.
// badge(c, cx, cy, r, kind, fill, a, t)  round icon «$» / «bolt» / «timer» / «edge» (mini wheel) with a filling bar below.
// lossBoard(c, x, y, w, t, a, o) EXPECTED LOSS board with «$$$» that rolls (o.roll 0..1 = rolling, o.cut 0..1 slice
//                               taken from the gold bar, o.bar 0..1 bar length) → geometry { bar: {x0,x1,y}, slice: {x0,x1,y} }.
// giftIcon(c, kind, cx, cy, s, a) kinds: burger, steak (plates), key, suite (keys), ticket, vip (tickets). s ≈ size px / 40.
// envelope(c, cx, cy, w, a, o)  REBATE envelope (o.open 0..1 flap, o.ang).
// noDrinksSign(c, cx, cy, w, a, o)  hanging sign «NO FREE DRINKS» with a crossed glass (o.cross 0..1).
// LOOKS_X = { waitress, highroller } for drawPerson (casino-people.mjs); tray(c, G, hand, a) draws the waitress tray.
// outlined(g, pts, fill, line)  polygon with a 1-px outline.
// ============================================================================================================================
import { MAIN, TINY, bayer } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, rnd, mix, fade, rampAt, glow, shadow } from "./casino-core.mjs";
import { chipStack, CHIP_RAMPS } from "./casino-props.mjs";
import { drawDealer } from "./casino-people.mjs";
import { box } from "./casino-house.mjs";
import { SKIN } from "./hero.mjs";

const O = "#0B0812", P2 = (V, x, y, z) => { const p = V.P(x, y, z); return [p[0], p[1]]; };
export function outlined(g, pts, fill, line = O) { g.poly(pts, fill); for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), line); } }
const lvl = (ramp, base) => (x, y) => rampAt(ramp, base, x, y);

// ---------------------------------------------------------------- looks
const RED_HAIR = ["#200806", "#3E1208", "#62200C", "#863212", "#A8461A", "#C46028", "#DA7E3E", "#EAA05C"];
const SILVER = ["#1E1E26", "#34343E", "#4C4C58", "#686874", "#868692", "#A4A4AE", "#C4C4CC", "#E2E2E8"];
const TUX = ["#05050A", "#0C0C16", "#141422", "#1E1E30", "#2A2A40", "#383852", "#4A4A68", "#60607E"];
export const LOOKS_X = {
  waitress: { coat: RAMP.vest, pants: RAMP.vest, skirt: RAMP.red, boot: RAMP.black, hands: SKIN, skin: SKIN, hair: RED_HAIR, hairStyle: "bun", shirt: RAMP.shirt, tie: RAMP.gold },
  highroller: { coat: TUX, pants: TUX, boot: RAMP.black, hands: SKIN, skin: SKIN, hair: SILVER, shirt: RAMP.shirt, tie: RAMP.gold },
};
/** The waitress's round silver tray, level, at the hand point (screen px); returns the tray top centre [x, y]. */
export function tray(c, G, hand, a = 1) {
  const g = fade(c, a), z = G.z, x = hand[0] + (G.mirror ? -4 : 4) * z, y = hand[1] - 2.5 * z, rx = Math.max(3, R(10 * z)), ry = Math.max(1, R(2.6 * z));
  g.ellipse(R(x), R(y) + Math.max(1, R(z)), rx, ry, RAMP.chrome[1]);
  g.ellipse(R(x), R(y), rx, ry, RAMP.chrome[5]); g.ellipse(R(x), R(y), Math.max(1, rx - 2), Math.max(1, ry - 1), RAMP.chrome[4]);
  g.line(R(x - rx * 0.6), R(y - ry * 0.4), R(x - rx * 0.1), R(y - ry * 0.7), RAMP.chrome[7]);
  return [x, y];
}

// ---------------------------------------------------------------- cashier cage
export const CAGE_Y = { counter: 104, holeTop: 136, bars: 232, top: 282 };
function wallTex(u, y, px, py, light) {
  if (y < 10) return rampAt(RAMP.wood, 1.4 + light, px, py);
  if (y < 100) { const pu = u / 70 - Math.floor(u / 70), fr = pu < 0.08 || pu > 0.92 || y < 18 || y > 92; return rampAt(RAMP.wood, (fr ? 2.8 : 2) + light * 1.6, px, py); }
  if (y < 106) return rampAt(RAMP.gold, 3 + light * 2, px, py);
  const uu = u / 40, v = y / 40, fu = uu - Math.floor(uu) - 0.5, fv = v - Math.floor(v) - 0.5, motif = Math.abs(Math.abs(fu) + Math.abs(fv) * 0.8 - 0.42) < 0.04;
  return rampAt(motif ? RAMP.gold : RAMP.wall, (motif ? 1.2 : 2) + light * 2.4, px, py);
}
export function cashierCage(c, V, t, Q, st = {}) {
  const a = st.a ?? 1, g = fade(c, a), zb = Q.z1, zl = zb + 30, Y = CAGE_Y, cx = (Q.x0 + Q.x1) / 2;
  const bl = V.P(Q.x0, 0, zl), br = V.P(Q.x1, 0, zl); if (br[0] < -40 || bl[0] > 580) return;
  // floor shadow + warm light spilling out
  { const [sx, sy, k] = V.P(cx, 0, zl + 20); shadow(c, sx, sy, 140 * k, 16 * k, 0.5); glow(c, sx, sy + 4 * k, 150 * k, 26 * k, "#FFC870", 0.22); }
  // outer side walls (wood), only the face turned to the camera
  const side = (x) => box(c, V, { x0: x - 10, x1: x, y0: 0, y1: Y.top, z0: Q.z0, z1: zb }, { w: lvl(RAMP.wood, 2.2), e: lvl(RAMP.wood, 2.8) }, a);
  side(Q.x0); box(c, V, { x0: Q.x1, x1: Q.x1 + 10, y0: 0, y1: Y.top, z0: Q.z0, z1: zb }, { w: lvl(RAMP.wood, 2.2), e: lvl(RAMP.wood, 2.8) }, a);
  // the opening behind the bars: dark interior, then the back wall with chip racks
  const open = [P2(V, Q.x0, Y.counter, zb), P2(V, Q.x1, Y.counter, zb), P2(V, Q.x1, Y.bars, zb), P2(V, Q.x0, Y.bars, zb)];
  g.poly(open, null, (x, y) => rampAt(RAMP.wood, 1.2, x, y));
  box(c, V, { x0: Q.x0, x1: Q.x1, y0: 0, y1: Y.top, z0: Q.z0 - 4, z1: Q.z0 }, { s: (x, y, z, px, py) => wallTex(x, y, px, py, 0.8 * Math.exp(-((x - Q.win) ** 2) / 9000)) }, a);
  // chip racks on the back wall: two shelves of small stacks
  for (const [sy, n] of [[146, 9], [188, 9]]) {
    const [ax, ay] = P2(V, Q.x0 + 14, sy, Q.z0 + 8), [bx2, by2] = P2(V, Q.x1 - 14, sy, Q.z0 + 8); g.rect(R(ax), R(ay), R(bx2 - ax), Math.max(2, R((V.k(cx, sy, Q.z0) * 3))), RAMP.gold[3]);
    for (let i = 0; i < n; i++) { const x = lerp(Q.x0 + 26, Q.x1 - 26, i / (n - 1)); chipStack(c, V, x, sy, Q.z0 + 12, 6 + ((i * 5) % 4), Object.values(CHIP_RAMPS)[i % 5], { a, r: 4.2, h: 1.6 }); }
  }
  // a lamp over the window
  { const [lx, ly, k] = V.P(Q.win, 226, zb - 30); glow(c, lx, ly + 40 * k, 90 * k, 70 * k, "#FFD890", 0.35 * a); }
  // the cashier behind the window
  drawDealer(c, V, Q.win + 6, zb - 58, t, { hands: st.cashierHands ?? [[Q.win - 18, Y.counter + 2, zb - 22], [Q.win + 26, Y.counter + 2, zb - 22]], smile: 0.7, a });
  // the inside counter (behind the bars)
  g.poly([P2(V, Q.x0, Y.counter, zb - 34), P2(V, Q.x1, Y.counter, zb - 34), P2(V, Q.x1, Y.counter, zb), P2(V, Q.x0, Y.counter, zb)], null, (x, y) => rampAt(RAMP.maple, 3.6, x, y));
  if (st.inside) st.inside(c, V);
  // brass bars (the money hole has none below holeTop), top and bottom rails, a little arch over the hole
  const k = V.k(cx, 170, zb), bw = Math.max(1, R(2.2 * k));
  for (let x = Q.x0 + 8; x < Q.x1 - 4; x += 11) {
    const hole = Math.abs(x - Q.win) < 30, y0 = hole ? Y.holeTop + 4 : Y.counter, [px0, py0] = P2(V, x, y0, zb), [, py1] = P2(V, x, Y.bars, zb);
    g.rect(R(px0) - (bw >> 1) + 1, R(py1), bw, R(py0 - py1), RAMP.gold[1]);
    g.rect(R(px0) - (bw >> 1), R(py1), bw, R(py0 - py1), RAMP.gold[4]); g.rect(R(px0) - (bw >> 1), R(py1), 1, R(py0 - py1), RAMP.gold[7]);
    if (!hole) for (const yy of [150, 196]) { const [qx, qy] = P2(V, x, yy, zb); g.disc(R(qx), R(qy), Math.max(1, R(1.8 * k)), RAMP.gold[6]); }
  }
  for (const [y0, h] of [[Y.bars - 6, 6], [Y.counter + 0.5, 4], [170, 3]]) { const [ax, ay] = P2(V, Q.x0, y0 + h, zb), [bx2, by2] = P2(V, Q.x1, y0, zb); g.rect(R(ax), R(ay), R(bx2 - ax), Math.max(1, R(by2 - ay)), RAMP.gold[3]); g.rect(R(ax), R(ay), R(bx2 - ax), 1, RAMP.gold[6]); }
  { const arch = []; for (let i = 0; i <= 16; i++) { const an = Math.PI * (i / 16); arch.push(P2(V, Q.win + Math.cos(an) * 30, Y.holeTop + Math.sin(an) * 10, zb + 0.5)); }
    for (let i = 0; i < arch.length - 1; i++) for (let d = 0; d < Math.max(2, R(2.5 * k)); d++) g.line(R(arch[i][0]), R(arch[i][1]) - d, R(arch[i + 1][0]), R(arch[i + 1][1]) - d, d ? RAMP.gold[4] : RAMP.gold[6]); }
  // the counter: front face (panels) and the outside ledge (marble top, brass edge)
  box(c, V, { x0: Q.x0 - 10, x1: Q.x1 + 10, y0: 0, y1: Y.counter - 4, z0: zb, z1: zl }, {
    s: (x, y, z, px, py) => { const pu = (x - Q.x0) / 55, fu = pu - Math.floor(pu), fr = fu < 0.08 || fu > 0.92 || y < 14 || y > Y.counter - 16; return y > Y.counter - 12 ? rampAt(RAMP.gold, 4.2, px, py) : rampAt(RAMP.wood, (fr ? 3.2 : 2.3) + 0.8 * (y / 100), px, py); },
    w: lvl(RAMP.wood, 1.8), e: lvl(RAMP.wood, 2.4) }, a);
  box(c, V, { x0: Q.x0 - 12, x1: Q.x1 + 12, y0: Y.counter - 4, y1: Y.counter, z0: zb - 2, z1: zl + 4 }, {
    s: lvl(RAMP.gold, 4.8), w: lvl(RAMP.gold, 3.6), e: lvl(RAMP.gold, 4),
    top: (x, y, z, px, py) => rampAt(RAMP.ivory, 4.6 + 0.8 * Math.sin(x * 0.05 + z * 0.11) * ((px * 3 + py) % 7 === 0 ? 1 : 0.2), px, py) }, a);
  if (st.ledge) st.ledge(c, V);
  // the fascia with the sign
  box(c, V, { x0: Q.x0 - 14, x1: Q.x1 + 14, y0: Y.bars, y1: Y.top, z0: zb - 6, z1: zb + 6 }, { s: (x, y, z, px, py) => rampAt(RAMP.wood, y > Y.top - 6 || y < Y.bars + 6 ? 4.2 : 2.6, px, py), w: lvl(RAMP.wood, 2), e: lvl(RAMP.wood, 2.4) }, a);
  { const [sx, sy, kk] = V.P(cx, (Y.bars + Y.top) / 2, zb + 6), sc = kk > 2.4 ? 3 : 2, txt = "CASHIER", w = c.measure(MAIN, txt, { scale: sc });
    glow(c, sx, sy, w * 0.8, 14 * kk, "#FFD070", 0.3 * a); g.text(MAIN, txt, R(sx - w / 2) + 1, R(sy - 3.5 * sc) + 1, "#2A1404", { scale: sc }); g.text(MAIN, txt, R(sx - w / 2), R(sy - 3.5 * sc), RAMP.gold[7], { scale: sc }); }
}

// ---------------------------------------------------------------- gift shop kiosk
export const SHOP_Y = { counter: 100, top: 250 };
function teddy(g, x, y, s) { const r = Math.max(2, R(5 * s)); g.disc(R(x), R(y), r + 1, "#3A1E0E"); g.disc(R(x), R(y), r, "#B07440"); g.disc(R(x), R(y - r * 1.4), Math.max(2, R(r * 0.8)), "#B07440"); g.disc(R(x - r * 0.6), R(y - r * 2), Math.max(1, R(r * 0.35)), "#8A5428"); g.disc(R(x + r * 0.6), R(y - r * 2), Math.max(1, R(r * 0.35)), "#8A5428"); g.px(R(x - r * 0.3), R(y - r * 1.5), O); g.px(R(x + r * 0.3), R(y - r * 1.5), O); g.rect(R(x - r * 0.5), R(y - r * 0.6), Math.max(2, R(r)), Math.max(1, R(r * 0.3)), "#E03C40"); }
function mug(g, x, y, s, col) { const w = Math.max(3, R(6 * s)), h = Math.max(3, R(7 * s)); g.rect(R(x - w / 2) - 1, R(y - h) - 1, w + 2, h + 2, O); g.rect(R(x - w / 2), R(y - h), w, h, col); g.rect(R(x - w / 2), R(y - h), 1, h, mix(col, "#FFFFFF", 0.4)); g.rect(R(x + w / 2), R(y - h * 0.75), Math.max(1, R(2 * s)), Math.max(2, R(h * 0.45)), O); g.disc(R(x), R(y - h / 2), Math.max(1, R(1.4 * s)), UI.Y); }
function cap(g, x, y, s, col) { const w = Math.max(4, R(9 * s)); g.ellipse(R(x), R(y - 2 * s), R(w / 2), Math.max(2, R(3.4 * s)), O); g.ellipse(R(x), R(y - 2 * s), R(w / 2) - 1, Math.max(1, R(3.4 * s)) - 1, col); g.rect(R(x), R(y - s), R(w * 0.6), Math.max(1, R(1.4 * s)), mix(col, "#000000", 0.3)); }
function globe(g, x, y, s) { const r = Math.max(2, R(4.4 * s)); g.rect(R(x - r), R(y - 2 * s), r * 2, Math.max(2, R(2 * s)), RAMP.wood[4]); g.disc(R(x), R(y - 2 * s - r), r + 1, O); g.disc(R(x), R(y - 2 * s - r), r, "#BFE6F0"); g.rect(R(x - 1), R(y - 2 * s - r), 3, Math.max(2, R(r * 0.8)), RAMP.green[5]); g.px(R(x - r * 0.4), R(y - 2 * s - r * 1.4), "#FFFFFF"); }
export const SHOP_ITEMS = ["teddy", "mug", "cap", "globe", "mug2"];
/** One shop item at (x, y) = its base, s px per cm. */
export function shopItem(g, kind, x, y, s) { if (kind === "teddy") teddy(g, x, y - 5 * s, s); else if (kind === "mug") mug(g, x, y, s, "#E03C40"); else if (kind === "mug2") mug(g, x, y, s, "#4060CC"); else if (kind === "cap") cap(g, x, y, s, "#8C38AC"); else globe(g, x, y, s); }
export function giftShop(c, V, t, S, st = {}) {
  const a = st.a ?? 1, g = fade(c, a), zf = S.z1 + 20, Y = SHOP_Y, cx = (S.x0 + S.x1) / 2;
  const bl = V.P(S.x0, 0, zf), br = V.P(S.x1, 0, zf); if (br[0] < -40 || bl[0] > 580) return;
  { const [sx, sy, k] = V.P(cx, 0, zf + 20); shadow(c, sx, sy, 150 * k, 16 * k, 0.5); glow(c, sx, sy + 4 * k, 160 * k, 26 * k, "#FFE0A0", 0.2); }
  for (const [x0, x1] of [[S.x0 - 10, S.x0], [S.x1, S.x1 + 10]]) box(c, V, { x0, x1, y0: 0, y1: Y.top, z0: S.z0, z1: S.z1 + 4 }, { w: lvl(RAMP.maple, 2.6), e: lvl(RAMP.maple, 3.2), s: lvl(RAMP.maple, 3.6) }, a);
  // back wall: warm cream panels with shelves
  box(c, V, { x0: S.x0, x1: S.x1, y0: 0, y1: Y.top, z0: S.z0 - 4, z1: S.z0 }, { s: (x, y, z, px, py) => rampAt(RAMP.ivory, 2.2 + 1.6 * Math.exp(-((y - 170) ** 2) / 8000) + ((x - S.x0) % 60 < 2 ? -1 : 0), px, py) }, a);
  const k0 = V.k(cx, 150, S.z0);
  for (const [sy, row] of [[128, ["teddy", "mug", "globe", "teddy", "cap", "mug2", "teddy", "globe"]], [178, ["cap", "teddy", "mug2", "globe", "mug", "cap", "teddy", "mug"]]]) {
    const [ax, ay] = P2(V, S.x0 + 6, sy, S.z0 + 6), [bx2] = P2(V, S.x1 - 6, sy, S.z0 + 6); g.rect(R(ax), R(ay), R(bx2 - ax), Math.max(2, R(3 * k0)), RAMP.maple[5]); g.rect(R(ax), R(ay) + Math.max(2, R(3 * k0)), R(bx2 - ax), 1, RAMP.maple[1]);
    row.forEach((kind, i) => { const x = lerp(S.x0 + 22, S.x1 - 22, i / (row.length - 1)), [px, py] = P2(V, x, sy, S.z0 + 8); shopItem(g, kind, px, py, k0 * 1.1); });
  }
  // the clerk
  drawDealer(c, V, S.reg + 40, S.z1 - 46, t + 3, { hands: [[S.reg + 22, Y.counter + 2, S.z1 - 4], [S.reg + 60, Y.counter + 2, S.z1 - 4]], smile: 0.8, a });
  // counter: glass-front display case with a maple top
  box(c, V, { x0: S.x0 - 8, x1: S.x1 + 8, y0: 0, y1: Y.counter - 4, z0: S.z1, z1: zf }, {
    s: (x, y, z, px, py) => { if (y < 14) return rampAt(RAMP.maple, 2.2, px, py); if (y > Y.counter - 14) return rampAt(RAMP.maple, 4.2, px, py); const sh = ((px - py * 0.5) & 31) < 3; return sh ? "#D8F0F8" : rampAt(RAMP.glass, 3 + 1.4 * ((y - 14) / 70), px, py); },
    w: lvl(RAMP.maple, 2.4), e: lvl(RAMP.maple, 3) }, a);
  // goods inside the display case
  { const kk = V.k(cx, 40, zf); for (let i = 0; i < 9; i++) { const x = lerp(S.x0 + 18, S.x1 - 18, i / 8), [px, py] = P2(V, x, 22, zf - 6); shopItem(fade(c, a * 0.85), SHOP_ITEMS[(i * 3) % 5], px, py, kk); } }
  box(c, V, { x0: S.x0 - 10, x1: S.x1 + 10, y0: Y.counter - 4, y1: Y.counter, z0: S.z1 - 30, z1: zf + 4 }, { s: lvl(RAMP.maple, 5), w: lvl(RAMP.maple, 3.6), e: lvl(RAMP.maple, 4), top: (x, y, z, px, py) => rampAt(RAMP.maple, 5.2 + 0.5 * Math.sin(x * 0.13 + z * 0.02), px, py) }, a);
  // the register on the counter (box + tilted screen + card reader)
  { const rx = S.reg, rz = S.z1 + 4, beep = st.beep ?? 0;
    box(c, V, { x0: rx - 22, x1: rx + 22, y0: Y.counter, y1: Y.counter + 18, z0: rz - 18, z1: rz + 10 }, { s: lvl(RAMP.black, 4.4), w: lvl(RAMP.black, 3), e: lvl(RAMP.black, 3.4), top: lvl(RAMP.black, 5.4) }, a);
    for (let i = 0; i < 9; i++) { const [px, py] = P2(V, rx - 14 + (i % 3) * 7, Y.counter + 18, rz - 4 + Math.floor(i / 3) * 5); g.rect(R(px), R(py), Math.max(2, R(3 * k0)), Math.max(1, R(1.6 * k0)), RAMP.chrome[6]); }
    const scr = [P2(V, rx - 18, Y.counter + 22, rz - 14), P2(V, rx + 18, Y.counter + 22, rz - 14), P2(V, rx + 18, Y.counter + 44, rz - 18), P2(V, rx - 18, Y.counter + 44, rz - 18)];
    outlined(g, scr, RAMP.black[3]); const inner = scr.map(([x, y]) => [lerp(x, (scr[0][0] + scr[1][0]) / 2, 0.12), lerp(y, (scr[0][1] + scr[2][1]) / 2, 0.15)]);
    g.poly(inner, mix("#1E4A3A", "#65DA41", 0.8 * beep)); if (beep > 0.3) { const mx = (inner[0][0] + inner[1][0]) / 2, my = (inner[0][1] + inner[2][1]) / 2; fade(c, a * sm(beep, 0.3, 0.7)).text(MAIN, "✓", R(mx - 8), R(my - 10), "#F4FFE8", { scale: 3 }); glow(c, mx, my, 40, 26, UI.GR, 0.35 * beep * a); }
    // card reader on a stand, right of the screen
    const tr = [P2(V, rx - 38, Y.counter, rz + 6), P2(V, rx - 27, Y.counter, rz + 6), P2(V, rx - 27, Y.counter + 17, rz + 2), P2(V, rx - 38, Y.counter + 17, rz + 2)]; outlined(g, tr, RAMP.chrome[2]);
    const [lx, ly] = P2(V, rx - 32.5, Y.counter + 14, rz + 3); g.rect(R(lx) - 2, R(ly), 4, 2, beep > 0.2 ? UI.GR : "#406040"); }
  if (st.top) st.top(c, V);
  // awning: scalloped red/cream stripes + sign
  { const ya = Y.top - 30, za = zf + 26;
    box(c, V, { x0: S.x0 - 14, x1: S.x1 + 14, y0: Y.top - 10, y1: Y.top + 12, z0: S.z0, z1: S.z1 }, { s: lvl(RAMP.maple, 3) }, a);
    const top = [P2(V, S.x0 - 16, Y.top, S.z1), P2(V, S.x1 + 16, Y.top, S.z1)], n = 14, pts = [top[0], top[1]];
    for (let i = n; i >= 0; i--) { const x = lerp(S.x0 - 16, S.x1 + 16, i / n); pts.push(P2(V, x, ya + (i % 1 === 0 ? 0 : 0), za)); }
    g.poly(pts, null, (px, py) => { const u = (px - pts[pts.length - 1][0]) / Math.max(1, pts[2][0] - pts[pts.length - 1][0]), band = Math.floor(u * n * 1.0) % 2; return rampAt(band ? RAMP.red : RAMP.ivory, band ? 4.4 : 5.6, px, py); });
    for (let i = 0; i < n; i++) { const x0 = lerp(S.x0 - 16, S.x1 + 16, i / n), x1 = lerp(S.x0 - 16, S.x1 + 16, (i + 1) / n), [ax, ay, kk] = V.P(x0, ya, za), [bx2] = V.P(x1, ya, za), r = (bx2 - ax) / 2;
      fade(c, a).ellipse(R(ax + r), R(ay), Math.max(1, R(r)), Math.max(1, R(r * 0.6)), i % 2 ? RAMP.red[4] : RAMP.ivory[5]); fade(c, a).ering(R(ax + r), R(ay), Math.max(1, R(r)), Math.max(1, R(r * 0.6)), i % 2 ? RAMP.red[2] : RAMP.ivory[2], 0, Math.PI); void kk; }
    const [sx, sy, kk] = V.P(cx, Y.top + 2, S.z1 + 2), sc = kk > 2.4 ? 3 : 2, txt = "GIFTS", w = c.measure(MAIN, txt, { scale: sc });
    g.rrect(R(sx - w / 2 - 8), R(sy - 3.5 * sc - 6), w + 16, 7 * sc + 12, RAMP.wood[1], 2); g.rrect(R(sx - w / 2 - 6), R(sy - 3.5 * sc - 4), w + 12, 7 * sc + 8, RAMP.wood[3], 2);
    g.text(MAIN, txt, R(sx - w / 2), R(sy - 3.5 * sc), RAMP.gold[7], { scale: sc }); }
}

// ---------------------------------------------------------------- hand props (screen space)
/** Highball cocktail, bottom centre (x, y), s px per cm (≈ 14 cm tall). */
export function cocktail(c, x, y, s, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), lv = o.level ?? 1, tl = o.tilt ?? 0, w = 3.4 * s, h = 13 * s;
  const P = (u, v) => [x + u * Math.cos(tl) + v * Math.sin(tl), y - (v * Math.cos(tl) - u * Math.sin(tl))];   // v up
  const glass = [P(-w, 0), P(w, 0), P(w * 1.08, h), P(-w * 1.08, h)];
  // straw behind the rim + umbrella
  { const p0 = P(w * 0.3, h * 0.35), p1 = P(w * 1.3, h * 1.45); for (let d = 0; d < Math.max(1, R(0.8 * s)); d++) g.line(R(p0[0]) + d, R(p0[1]), R(p1[0]) + d, R(p1[1]), d ? "#C83040" : "#F05868"); }
  { const p0 = P(-w * 0.4, h * 0.6), p1 = P(-w * 1.4, h * 1.5); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), RAMP.wood[5]); const r = 3.2 * s;
    g.poly([[p1[0] - r, p1[1] + r * 0.2], [p1[0], p1[1] - r * 0.6], [p1[0] + r, p1[1] + r * 0.2]], "#F4CA50"); g.line(R(p1[0] - r), R(p1[1] + r * 0.2), R(p1[0] + r), R(p1[1] + r * 0.2), "#C88A20"); g.line(R(p1[0]), R(p1[1] - r * 0.6), R(p1[0] - r * 0.4), R(p1[1] + r * 0.2), "#E8A030"); }
  g.poly(glass.map(([px, py]) => [px + 1, py + 1]), O);
  g.poly(glass, "#2A4458");
  // the drink: orange → red gradient, with ice cubes
  if (lv > 0.02) { const top = h * 0.88 * lv, dk = [P(-w + 1, 1), P(w - 1, 1), P(w * (1 + 0.08 * lv) - 1, top), P(-w * (1 + 0.08 * lv) + 1, top)];
    g.poly(dk, null, (px, py) => { const v = clamp01((y - py) / Math.max(1, top)); return rampAt(v > 0.5 ? RAMP.yellow : RAMP.red, v > 0.5 ? 4.2 + v * 1.4 : 4.6 + v * 1.4, px, py); });
    for (const [u, v] of [[-0.4, 0.7], [0.35, 0.55], [-0.1, 0.35]]) { if (v * h * 0.9 > top) continue; const q = P(u * w, v * h); g.rect(R(q[0] - 1.6 * s), R(q[1] - 1.6 * s), Math.max(2, R(3 * s)), Math.max(2, R(3 * s)), "#FFF4E0"); g.rect(R(q[0] - 1.6 * s), R(q[1] - 1.6 * s), Math.max(2, R(3 * s)), 1, "#FFFFFF"); } }
  // glass highlights + rim + orange slice
  { const p0 = P(-w * 0.75, h * 0.1), p1 = P(-w * 0.8, h * 0.9); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), "#DDF4FF"); }
  { const p0 = P(-w * 1.08, h), p1 = P(w * 1.08, h); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), "#E8F8FF"); }
  { const q = P(w * 1.05, h * 0.92), r = Math.max(2, R(2.6 * s)); g.disc(R(q[0]), R(q[1]), r + 1, "#7A3A08"); g.disc(R(q[0]), R(q[1]), r, "#F59A3A"); g.disc(R(q[0]), R(q[1]), Math.max(1, r - 1), "#FFC86A"); g.px(R(q[0]), R(q[1]), "#FFF0C8"); }
}
const glyph = (g, font, txt, cx, y, col, scale, sh = null) => { const w = g.measure(font, txt, { scale }); if (sh) g.text(font, txt, R(cx - w / 2) + 1, y + 1, sh, { scale }); g.text(font, txt, R(cx - w / 2), y, col, { scale }); return w; };
/** Text squashed horizontally by sq (0..1) around cx (for things turning around a vertical axis). */
export function sqText(g, font, txt, cx, y, col, scale, sq) {
  const w = g.measure(font, txt, { scale }); let x = 0;
  for (const ch of txt.toUpperCase()) { if (ch === " ") { x += (font.space + 1) * scale; continue; } const gl = font.glyphs[ch] ?? font.glyphs["?"];
    gl.forEach((row, j) => [...row].forEach((p, i) => { if (p !== "#") return; const u0 = x + i * scale - w / 2, X0 = R(cx + u0 * sq), X1 = R(cx + (u0 + scale) * sq); g.rect(X0, y + j * scale, Math.max(1, X1 - X0), scale, col); }));
    x += (gl[0].length + 1) * scale; }
}
/** Price tag hanging on a string. flip 0 = FREE front, 1 = back (a big «?» and a counter that never stops rolling). */
export function priceTag(c, cx, cy, s, flip, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), W = 62 * s, H = 30 * s, sq = Math.abs(Math.cos(Math.PI * flip)), back = flip > 0.5, w = Math.max(2, W * sq);
  if (o.string) { const [sx, sy] = o.string; g.line(R(sx), R(sy), R(cx - (W / 2 - 7 * s) * sq), R(cy), "#F4EEDC"); g.line(R(sx) + 1, R(sy), R(cx - (W / 2 - 7 * s) * sq) + 1, R(cy), "#8A7A64"); }
  const x0 = cx - w / 2, y0 = cy - H / 2, notch = 9 * s * sq, paper = back ? "#FFF2D0" : "#F4FFE8";
  const pts = [[x0 + notch, y0], [x0 + w, y0], [x0 + w, y0 + H], [x0 + notch, y0 + H], [x0, y0 + H / 2]];
  g.poly(pts.map(([x, y]) => [x + 2, y + 3]), "#05030A");
  outlined(g, pts, paper, O);
  g.ering(R(x0 + notch * 0.9), R(cy), Math.max(1, R(2.6 * s * sq)), Math.max(1, R(2.6 * s)), "#8A7A64"); g.disc(R(x0 + notch * 0.9), R(cy), Math.max(1, R(1.6 * s * sq)), O);
  if (sq < 0.2) return;
  const ta = fade(c, a * sm(sq, 0.2, 0.5)), mid = cx + 4 * s * sq;
  if (!back) { const sc = Math.max(2, Math.floor((W - 16 * s) / c.measure(MAIN, "FREE"))); sqText(ta, MAIN, "FREE", mid + 1, R(cy - 3.5 * sc) + 1, "#0E4A20", sc, sq); sqText(ta, MAIN, "FREE", mid, R(cy - 3.5 * sc), "#1C9A42", sc, sq); }
  else {
    const sc = Math.max(2, Math.floor(H / 11)); sqText(ta, MAIN, "?", cx - (W * 0.24 - 4 * s) * sq, R(cy - 3.5 * sc), "#B82030", sc, sq);
    // a little counter: «$» and three rolling digits in a dark window (keeps rolling: nobody tells you the number)
    const ds = Math.max(1, Math.floor(sc / 2)), wx = cx + W * 0.14 * sq, ww = 4 * 6 * ds, wy = R(cy - 3.5 * ds), t = o.t ?? 0;
    ta.rect(R(wx - (ww / 2 + 2) * sq), wy - 3, Math.max(1, R((ww + 4) * sq)), 7 * ds + 6, "#2A1414");
    const clip = Object.create(ta); clip.px = (px, py, col) => { if (py >= wy - 2 && py < wy + 7 * ds + 2) ta.px(px, py, col); };
    sqText(clip, MAIN, "$", wx - (ww / 2 - 3 * ds) * sq, wy, "#F2665E", ds, sq);
    for (let i = 0; i < 3; i++) { const v = t * (3 + i * 2.3) + i * 3.3, f = v - Math.floor(v), d = Math.floor(v) % 10, oy = R(f * 9 * ds), x = wx + (-ww / 2 + 6 * ds * (i + 1) + 3 * ds) * sq;
      sqText(clip, MAIN, String(d), x, wy - oy, "#FFD0A0", ds, sq); sqText(clip, MAIN, String((d + 1) % 10), x, wy - oy + 9 * ds, "#FFD0A0", ds, sq); }
  }
}
/** Green banknote centred at (cx, cy), w px wide. o = { ang, grey 0..1, squash 0..1 (vertical scale) }. */
export function banknote(c, cx, cy, w, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), h = w * 0.46 * (o.squash ?? 1), ang = o.ang ?? 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca], gr = o.grey ?? 0, col = (x) => mix(x, mix(x, "#808080", 0.85), gr);
  const pts = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)];
  g.poly(pts.map(([x, y]) => [x + 1, y + 2]), "#05030A"); outlined(g, pts, col("#7CC88A"), col("#1E5A2C"));
  const inn = [P(-w * 0.42, -h * 0.36), P(w * 0.42, -h * 0.36), P(w * 0.42, h * 0.36), P(-w * 0.42, h * 0.36)]; for (let i = 0; i < 4; i++) { const p = inn[i], q = inn[(i + 1) % 4]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), col("#3A8A4C")); }
  const m = P(0, 0); g.disc(R(m[0]), R(m[1]), Math.max(2, R(h * 0.26)), col("#B8E8C0")); g.ering(R(m[0]), R(m[1]), Math.max(2, R(h * 0.26)), Math.max(2, R(h * 0.26)), col("#3A8A4C"));
  if (w > 30 && (o.squash ?? 1) > 0.6) g.text(MAIN, "$", R(m[0] - 2), R(m[1] - 3), col("#1E5A2C"));
  for (const u of [-0.33, 0.33]) { const p = P(u * w, 0); g.rect(R(p[0]) - 1, R(p[1]) - 1, 3, 3, col("#3A8A4C")); }
}
/** A plain blue payment card (shop scene). */
export function plasticCard(c, cx, cy, w, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), h = w * 0.63, ang = o.ang ?? 0, ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const pts = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)]; g.poly(pts.map(([x, y]) => [x + 1, y + 2]), "#05030A");
  outlined(g, pts, "#3E62C8"); g.poly([P(-w / 2 + 1, -h / 2 + 1), P(w / 2 - 1, -h / 2 + 1), P(w / 2 - 1, -h * 0.1), P(-w / 2 + 1, h * 0.12)], "#5A80E0");
  const ch = [P(-w * 0.32, -h * 0.12), P(-w * 0.12, -h * 0.12), P(-w * 0.12, h * 0.12), P(-w * 0.32, h * 0.12)]; outlined(g, ch, "#F4CA50", "#8A6410");
  for (let i = 0; i < 4; i++) { const p = P(-w * 0.32 + i * w * 0.14, h * 0.3); g.rect(R(p[0]), R(p[1]), Math.max(2, R(w * 0.1)), 1, "#C8D8FF"); }
}
/** Our player card (no brand): purple, gold star, «PLAYER», magnetic stripe; o.ribbon wraps it like a present. */
export function playerCard(c, cx, cy, w, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), h = w * 0.63, ang = o.ang ?? 0, ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const pts = []; for (const [qx, qy, a0] of [[w / 2 - 4, -h / 2 + 4, -Math.PI / 2], [w / 2 - 4, h / 2 - 4, 0], [-w / 2 + 4, h / 2 - 4, Math.PI / 2], [-w / 2 + 4, -h / 2 + 4, Math.PI]]) for (let i = 0; i <= 3; i++) { const b = a0 + (Math.PI / 2) * (i / 3); pts.push(P(qx + Math.cos(b) * 4, qy + Math.sin(b) * 4)); }
  g.poly(pts.map(([x, y]) => [x + 2, y + 3]), "#05030A");
  g.poly(pts, null, (x, y) => { const u = ((x - cx) * ca + (y - cy) * sa) / w + 0.5, v = (-(x - cx) * sa + (y - cy) * ca) / h + 0.5; return rampAt(RAMP.purple, 3.2 + 2.6 * (1 - u * 0.6 - v * 0.5), x, y); });
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#F4CA50"); }
  // gold star emblem + stripe + chip + label
  { const s0 = P(-w * 0.26, -h * 0.08), r1 = h * 0.24, r0 = r1 * 0.45, st = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i * Math.PI) / 5 + ang, rr = i % 2 ? r0 : r1; st.push([s0[0] + Math.cos(an) * rr, s0[1] + Math.sin(an) * rr]); } outlined(g, st, "#F6DE8A", "#8A6410"); }
  { const sp = [P(-w / 2 + 2, h * 0.2), P(w / 2 - 2, h * 0.2), P(w / 2 - 2, h * 0.34), P(-w / 2 + 2, h * 0.34)]; g.poly(sp, "#1A1024"); }
  { const ch = [P(w * 0.08, -h * 0.26), P(w * 0.26, -h * 0.26), P(w * 0.26, -h * 0.04), P(w * 0.08, -h * 0.04)]; outlined(g, ch, "#F4CA50", "#8A6410"); }
  if (Math.abs(ang) < 0.2 && w >= 60) { const p = P(w * 0.2, h * 0.04); glyph(g, TINY, "PLAYER", p[0], R(p[1]) + 1, "#FFF6DA", w >= 100 ? 2 : 1); }
  // gift ribbon: two red bands + a bow on top
  const rb = o.ribbon ?? 0;
  if (rb > 0) { const gr = fade(c, a * rb), bw = Math.max(3, w * 0.09);
    gr.poly([P(w * 0.12 - bw / 2, -h / 2 - 1), P(w * 0.12 + bw / 2, -h / 2 - 1), P(w * 0.12 + bw / 2, h / 2 + 1), P(w * 0.12 - bw / 2, h / 2 + 1)], "#E0303C");
    gr.poly([P(-w / 2 - 1, -bw / 2), P(w / 2 + 1, -bw / 2), P(w / 2 + 1, bw / 2), P(-w / 2 - 1, bw / 2)], "#E0303C");
    gr.poly([P(w * 0.12 - bw / 2 + 1, -h / 2), P(w * 0.12 - bw / 2 + 2, -h / 2), P(w * 0.12 - bw / 2 + 2, h / 2), P(w * 0.12 - bw / 2 + 1, h / 2)], "#FF8088");
    const k = P(w * 0.12, -h / 2 - 2), L = w * 0.2, wob = Math.sin((o.t ?? 0) * 6) * 0.08 * (o.sparkle ?? 0);
    for (const s of [-1, 1]) { const loop = []; for (let i = 0; i <= 12; i++) { const an = (i / 12) * Math.PI * 2, u = s * (L * 0.55 + Math.cos(an) * L * 0.5), v = -L * 0.35 + Math.sin(an) * L * 0.32; loop.push([k[0] + u * Math.cos(ang + s * wob) - v * Math.sin(ang), k[1] + u * Math.sin(ang + s * wob) + v * Math.cos(ang)]); } outlined(gr, loop, "#F04050", "#7A0A14"); }
    gr.disc(R(k[0]), R(k[1] - L * 0.3), Math.max(2, R(L * 0.18)), "#B81828");
    for (const s of [-1, 1]) gr.poly([[k[0], k[1] - L * 0.2], [k[0] + s * L * 0.5, k[1] + L * 0.5], [k[0] + s * L * 0.25, k[1] + L * 0.55]], "#E0303C"); }
  const sp = o.sparkle ?? 0;
  if (sp > 0) for (let i = 0; i < 6; i++) { const an = (i / 6) * Math.PI * 2 + (o.t ?? 0) * 1.5, r = w * (0.62 + 0.08 * Math.sin((o.t ?? 0) * 5 + i)), x = cx + Math.cos(an) * r, y = cy + Math.sin(an) * r * 0.7, tw = 0.5 + 0.5 * Math.sin((o.t ?? 0) * 8 + i * 2);
    const gg = fade(c, a * sp * tw); gg.rect(R(x) - 1, R(y), 3, 1, "#FFF6DA"); gg.rect(R(x), R(y) - 1, 1, 3, "#FFF6DA"); gg.px(R(x), R(y), UI.Y); }
}

// ---------------------------------------------------------------- icons and boards
function boltIcon(g, cx, cy, s, col) { const p = [[0.15, -1], [-0.55, 0.12], [-0.05, 0.12], [-0.2, 1], [0.55, -0.15], [0.05, -0.15], [0.3, -1]].map(([u, v]) => [cx + u * s, cy + v * s]); outlined(g, p, col, O); }
function timerIcon(g, cx, cy, s, col, t) { const r = R(s * 0.8); g.rect(R(cx - s * 0.2), R(cy - s * 1.08), Math.max(2, R(s * 0.4)), Math.max(2, R(s * 0.2)), col); g.disc(R(cx), R(cy + s * 0.05), r + 1, O); g.disc(R(cx), R(cy + s * 0.05), r, "#FFF6DA"); g.ering(R(cx), R(cy + s * 0.05), r, r, col);
  const an = -Math.PI / 2 + t * 2.2; g.line(R(cx), R(cy + s * 0.05), R(cx + Math.cos(an) * r * 0.75), R(cy + s * 0.05 + Math.sin(an) * r * 0.75), O); g.px(R(cx), R(cy + s * 0.05), "#B82030"); }
function wheelIcon(g, cx, cy, s, t) { const r = R(s * 0.85); g.disc(R(cx), R(cy), r + 1, O); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d > r) continue; const an = Math.atan2(y, x) + t * 1.2, sec = Math.floor(((an / (Math.PI * 2)) + 1) * 12) % 12; g.px(R(cx) + x, R(cy) + y, d < r * 0.35 ? RAMP.gold[5] : sec === 0 ? "#1CA046" : sec % 2 ? "#C42430" : "#20202C"); } g.ering(R(cx), R(cy), r, r, RAMP.gold[6]); }
export function badge(c, cx, cy, r, kind, fill, a = 1, t = 0) {
  if (a <= 0) return; const g = fade(c, a), ring = kind === "edge" ? UI.GR : UI.Y;
  g.disc(R(cx) + 2, R(cy) + 3, r, "#05030A"); g.disc(R(cx), R(cy), r, O); g.disc(R(cx), R(cy), r - 2, ring); g.disc(R(cx), R(cy), r - 4, "#160E22");
  // the fill rises inside the ring (a dithered level), then the icon on top
  if (fill > 0) { const top = cy + r - 4 - (2 * r - 8) * fill; for (let y = R(top); y <= R(cy + r - 4); y++) for (let x = -r; x <= r; x++) if (x * x + (y - cy) ** 2 <= (r - 4) ** 2) g.px(R(cx) + x, y, (x + y) % 5 === 0 ? "#5A3A8A" : "#3B2C5C"); }
  const s = r * 0.62;
  if (kind === "$") { const sc = Math.max(2, R(r / 6)), w = c.measure(MAIN, "$", { scale: sc }); g.text(MAIN, "$", R(cx - w / 2) + 1, R(cy - 3.5 * sc) + 1, O, { scale: sc }); g.text(MAIN, "$", R(cx - w / 2), R(cy - 3.5 * sc), "#7CDA8A", { scale: sc }); }
  else if (kind === "bolt") boltIcon(g, cx, cy, s, UI.Y);
  else if (kind === "timer") timerIcon(g, cx, cy, s, UI.CY, t);
  else wheelIcon(g, cx, cy, s, t);
}
/** A fill bar under a badge. */
export function fillBar(c, cx, y, w, fill, a, col = UI.Y) { if (a <= 0) return; const g = fade(c, a), x = R(cx - w / 2); g.rrect(x - 1, y - 1, w + 2, 10, O, 2); g.rect(x + 1, y + 1, w - 2, 6, "#2A1E3A"); const f = R((w - 2) * clamp01(fill)); if (f > 0) { g.rect(x + 1, y + 1, f, 6, col); g.rect(x + 1, y + 1, f, 1, mix(col, "#FFFFFF", 0.5)); } }
/** EXPECTED LOSS board with «$$$»; returns the gold bar geometry. o = { roll 0..1, bar 0..1, cut 0..1, t }. */
export function lossBoard(c, x, y, w, t, a = 1, o = {}) {
  const h = 104, g = fade(c, a), out = { bar: null, slice: null }; if (a <= 0) return out;
  g.rrect(x + 2, y + 4, w, h, "#05030A", 4); g.rrect(x, y, w, h, RAMP.gold[2], 4); g.rrect(x + 2, y + 2, w - 4, h - 4, RAMP.gold[5], 3); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 2);
  for (let i = 0; i < 14; i++) { const on = (Math.floor(t * 6) + i) % 2 === 0, bx = x + 10 + (i * (w - 20)) / 13; g.rect(R(bx), y + 1, 2, 2, on ? "#FFF6C8" : RAMP.gold[3]); g.rect(R(bx), y + h - 3, 2, 2, on ? RAMP.gold[3] : "#FFF6C8"); }
  glyph(g, MAIN, "EXPECTED LOSS", x + w / 2, y + 12, "#E0CDF8", 2);
  // «$$$»: each sign rolls in its window while roll < 1, then settles
  const sc = 4, cw = 8 * sc, x0 = R(x + w / 2 - (3 * cw) / 2), yy = y + 36, roll = o.roll ?? 1;
  for (let i = 0; i < 3; i++) { const sp = (1 - roll) * (5 + i * 2), off = (t * sp + i * 0.37) % 1, oy = R(off * 9 * sc) * (roll < 1 ? 1 : 0), clip = Object.create(g);
    clip.px = (px, py, col) => { if (py >= yy - 2 && py < yy + 7 * sc + 2) g.px(px, py, col); };
    g.rect(x0 + i * cw - 2, yy - 2, cw - 2, 7 * sc + 4, "#0A0612");
    for (const dy of [0, -9 * sc]) { clip.text(MAIN, "$", x0 + i * cw + 4 + 1, yy - oy - dy + 1, "#5A0810", { scale: sc }); clip.text(MAIN, "$", x0 + i * cw + 4, yy - oy - dy, roll >= 1 ? "#F2665E" : "#E8C25A", { scale: sc }); } }
  // the gold bar = the guess; a small slice can be cut from its right end
  const bx0 = x + 14, bx1 = x + w - 14, bw = (bx1 - bx0) * clamp01(o.bar ?? 1), by = y + h - 22, cut = clamp01(o.cut ?? 0), sw = Math.max(12, bw * 0.16);
  g.rect(bx0, by, R(bx1 - bx0), 10, "#2A1E3A");
  if (bw > 1) { g.rect(bx0, by, R(bw - sw * cut), 10, RAMP.gold[5]); g.rect(bx0, by, R(bw - sw * cut), 2, RAMP.gold[7]); g.rect(bx0, by + 8, R(bw - sw * cut), 2, RAMP.gold[3]); }
  out.bar = { x0: bx0, x1: bx0 + bw, y: by }; out.slice = { x0: bx0 + bw - sw, x1: bx0 + bw, y: by, w: sw };
  return out;
}

// ---------------------------------------------------------------- gifts (s = px per unit, ≈ 1 for a 40-px icon)
export function giftIcon(c, kind, cx, cy, s, a = 1) {
  if (a <= 0) return; const g = fade(c, a), u = (v) => v * s;
  if (kind === "burger" || kind === "steak") {
    g.ellipse(R(cx), R(cy + u(8)), R(u(22)), R(u(7)), O); g.ellipse(R(cx), R(cy + u(7)), R(u(21)), R(u(6)), "#ECE6D2"); g.ellipse(R(cx), R(cy + u(7)), R(u(15)), R(u(4)), "#D4CCB4");
    if (kind === "burger") { g.ellipse(R(cx), R(cy + u(3)), R(u(12)), R(u(3)), "#C88A40"); g.rect(R(cx - u(12)), R(cy), R(u(24)), Math.max(2, R(u(3))), "#5A2E14"); g.rect(R(cx - u(13)), R(cy - u(1)), R(u(26)), Math.max(1, R(u(1.5))), "#38BE5E");
      g.ellipse(R(cx), R(cy - u(4)), R(u(12)), R(u(5)), O); g.ellipse(R(cx), R(cy - u(4)), R(u(11)), R(u(4.5)), "#E0A048"); for (let i = 0; i < 4; i++) g.px(R(cx - u(6) + i * u(4)), R(cy - u(6)), "#FFF4D0"); }
    else { const pts = [[-14, 4], [-10, -3], [2, -5], [13, -2], [14, 3], [4, 6]].map(([x, y]) => [cx + u(x), cy + u(y)]); outlined(g, pts, "#8A3A22", O); g.poly(pts.map(([x, y]) => [lerp(x, cx, 0.25), lerp(y, cy - u(1), 0.3)]), "#B04A2C");
      for (let i = -2; i <= 2; i++) g.line(R(cx + u(i * 4 - 2)), R(cy - u(2)), R(cx + u(i * 4 + 2)), R(cy + u(3)), "#3A1408"); g.disc(R(cx + u(10)), R(cy - u(5)), Math.max(1, R(u(2.4))), "#38BE5E"); g.px(R(cx + u(12)), R(cy - u(7)), "#6ADA86"); }
  } else if (kind === "key" || kind === "suite") {
    const gold = kind === "suite", col = gold ? "#F4CA50" : "#BCBCCC", dk = gold ? "#8A6410" : "#56566C";
    g.disc(R(cx - u(9)), R(cy), R(u(8)) + 1, O); g.disc(R(cx - u(9)), R(cy), R(u(8)), col); g.disc(R(cx - u(9)), R(cy), Math.max(1, R(u(3.4))), "#160E22");
    g.rect(R(cx - u(2)), R(cy - u(2.2)), R(u(18)), Math.max(2, R(u(4.4))), O); g.rect(R(cx - u(2)), R(cy - u(1.6)), R(u(17)), Math.max(1, R(u(3.2))), col);
    for (const k of [8, 13]) { g.rect(R(cx + u(k)), R(cy + u(1)), Math.max(2, R(u(2.6))), Math.max(2, R(u(5))), O); g.rect(R(cx + u(k)) + 1, R(cy + u(1)), Math.max(1, R(u(2.6)) - 2), Math.max(1, R(u(4))), col); }
    g.px(R(cx - u(12)), R(cy - u(4)), "#FFFFFF");
    // the room tag hanging from the ring (a star for the suite)
    const tx = cx - u(14), ty = cy + u(10); g.line(R(cx - u(12)), R(cy + u(6)), R(tx), R(ty), dk); g.rrect(R(tx - u(7)), R(ty), R(u(14)), R(u(10)), O, 1); g.rrect(R(tx - u(6)), R(ty + 1), R(u(12)), R(u(10)) - 2, gold ? "#8C38AC" : "#C42430", 1);
    if (gold) { const st = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? u(1.6) : u(3.6); st.push([tx + Math.cos(an) * rr, ty + u(5) + Math.sin(an) * rr]); } g.poly(st, "#F6DE8A"); }
    else g.rect(R(tx - u(2)), R(ty + u(4)), Math.max(2, R(u(4))), Math.max(1, R(u(2))), "#FFF2E4");
  } else {
    const vip = kind === "vip", w = u(40), h = u(20), x0 = cx - w / 2, y0 = cy - h / 2, col = vip ? "#F4CA50" : "#E0CDF8", ink = vip ? "#5A3A08" : "#3B2C5C";
    const pts = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h * 0.35], [x0 + w - u(3), y0 + h / 2], [x0 + w, y0 + h * 0.65], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0 + h * 0.65], [x0 + u(3), y0 + h / 2], [x0, y0 + h * 0.35]];
    g.poly(pts.map(([x, y]) => [x + 1, y + 2]), "#05030A"); outlined(g, pts, col, O);
    for (let y = R(y0 + 2); y < y0 + h - 1; y += 3) g.px(R(x0 + w * 0.72), y, ink);
    const sc = w >= 56 ? 2 : 1; glyph(g, MAIN, vip ? "VIP" : "SHOW", x0 + w * 0.38, R(cy - 3.5 * sc), ink, sc);
    if (vip) for (let i = 0; i < 3; i++) g.px(R(x0 + w * 0.86), R(y0 + u(5) + i * u(5)), "#FFFFFF"); else { g.disc(R(x0 + w * 0.86), R(cy), Math.max(1, R(u(3))), "#8D59DA"); }
  }
}
export function envelope(c, cx, cy, w, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), h = w * 0.6, ang = o.ang ?? 0, ca = Math.cos(ang), sa = Math.sin(ang), P = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  const body = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2)]; g.poly(body.map(([x, y]) => [x + 2, y + 3]), "#05030A"); outlined(g, body, "#F4EAD2", "#6A5A48");
  g.line(R(P(-w / 2, h / 2)[0]), R(P(-w / 2, h / 2)[1]), R(P(0, h * 0.05)[0]), R(P(0, h * 0.05)[1]), "#C8B898"); g.line(R(P(w / 2, h / 2)[0]), R(P(w / 2, h / 2)[1]), R(P(0, h * 0.05)[0]), R(P(0, h * 0.05)[1]), "#C8B898");
  const op = o.open ?? 0, fl = [P(-w / 2, -h / 2), P(w / 2, -h / 2), P(0, -h / 2 + h * 0.55 * (1 - 2 * op))]; outlined(g, fl, op > 0.5 ? "#E4D8BC" : "#ECE0C4", "#6A5A48");
  if (op > 0.5) { // chips peeking out of the open envelope
    for (let i = 0; i < 3; i++) { const p = P(-w * 0.22 + i * w * 0.22, -h / 2 - 2 - (op - 0.5) * 2 * h * 0.25); g.ellipse(R(p[0]), R(p[1]), Math.max(2, R(w * 0.09)), Math.max(1, R(w * 0.04)), ["#E03C40", "#4060CC", "#1CA046"][i]); } }
  { const p = P(0, h * 0.18); const sc = w >= 80 ? 2 : 1; glyph(g, MAIN, "REBATE", p[0], R(p[1] - 3.5 * sc), "#B82030", sc); }
  { const p = P(0, -h / 2 + h * 0.55 * (1 - 2 * op)); if (op < 0.5) { g.disc(R(p[0]), R(p[1]) - 1, Math.max(2, R(w * 0.06)), "#B81828"); g.px(R(p[0]) - 1, R(p[1]) - 2, "#F06070"); } }
}
/** Hanging sign «NO FREE DRINKS» with a crossed cocktail glass. */
export function noDrinksSign(c, cx, cy, w, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), h = w * 0.62, x0 = R(cx - w / 2), y0 = R(cy - h / 2), sw = o.swing ?? 0;
  if (o.chainTop !== undefined) for (const s of [-1, 1]) { const ax = cx + s * w * 0.32; for (let y = o.chainTop; y < y0; y += 4) { g.rect(R(ax + sw * (y - o.chainTop) * 0.02) - 1, y, 3, 3, RAMP.gold[3]); g.px(R(ax + sw * (y - o.chainTop) * 0.02), y + 1, "#160E22"); } }
  g.rrect(x0 + 3, y0 + 4, w, h, "#05030A", 3); g.rrect(x0, y0, w, h, "#E8384A", 3); g.rrect(x0 + 3, y0 + 3, w - 6, h - 6, "#FFF6EA", 2); g.rrect(x0 + 5, y0 + 5, w - 10, h - 10, "#E8384A", 2); g.rrect(x0 + 7, y0 + 7, w - 14, h - 14, "#FFF6EA", 2);
  const sc = w >= 200 ? 3 : 2; glyph(g, MAIN, "NO FREE", cx + w * 0.12, y0 + 16, "#B82030", sc); glyph(g, MAIN, "DRINKS", cx + w * 0.12, y0 + 16 + 10 * sc, "#B82030", sc);
  // the glass in a red circle, struck through
  const gx = x0 + w * 0.17, gy = cy, r = h * 0.3; cocktail(c, gx, gy + r * 0.62, r / 12, a, { level: 1 });
  const cr = clamp01(o.cross ?? 1);
  if (cr > 0) { const gc = fade(c, a * sm(cr, 0, 0.3)); for (let d = 0; d < 3; d++) gc.ering(R(gx), R(gy), R(r) + d, R(r) + d, "#E8384A", -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp01(cr * 1.4));
    const k = sm(cr, 0.5, 1); if (k > 0) for (let d = -1; d <= 1; d++) gc.line(R(gx - r * 0.7), R(gy - r * 0.7) + d, R(gx - r * 0.7 + r * 1.4 * k), R(gy - r * 0.7 + r * 1.4 * k) + d, "#E8384A"); }
}
export { CHIP_RAMPS };
