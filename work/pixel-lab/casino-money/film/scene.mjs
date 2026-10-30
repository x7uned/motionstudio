// «That free drink in a casino isn't free»: the film's own layer over the casino kit (Casino secrets 4/5). One warm casino at
// night through one perspective camera that travels right along one aisle: the cashier cage (cash in → chips out), the gift
// shop (the bill that hesitates, the card that pays at once), the hero's slot machine (the player card in a gift ribbon, the
// three icons, the EXPECTED LOSS board, the slice that becomes dinner / room / show and upgrades), the roulette table (the big
// player, his REBATE envelope; the free drink and the bigger bet), and the machines with the NO FREE DRINKS sign. The
// waitress with her tray and the FREE tag opens the film. Everything is a pure function of t and the timeline.
import { MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, win, rnd, mix, fade, glow, shadow, makeView, camAt } from "./casino-core.mjs";
import { drawCasino } from "./casino.mjs";
import { chipStack, CHIP_RAMPS } from "./casino-props.mjs";
import { drawPerson, drawDealer, idlePose, cheerPose, clapPose, walkPose, LOOKS } from "./casino-people.mjs";
import { drawSlot, reelPos, reelSpeed } from "./casino-slot.mjs";
import { drawRouletteTable, ballState, TOP } from "./casino-roulette.mjs";
import * as X from "./casino-extras.mjs";
import { EV, END, CAM, CAGE, SHOP, SLOTM, TABLE, BANK, SIGN, HERO_Z, HERO_Z_CAGE, HERO_X, WAITRESS_Z, WAIT_X, WAIT2_X, WAIT, TAG, CASH, TOY, SHOPB, CARD, ICONS, BOARD, GIFT, BIG, DRINK, LAW } from "./timeline.mjs";

const O = "#0B0812";
const P2 = (V, x, y, z) => { const p = V.P(x, y, z); return [p[0], p[1]]; };
const clampX = (x, w, x0 = 40, x1 = 436) => Math.max(x0, Math.min(x1 - w, x));
const clampY = (y, h, y0 = 156, y1 = 620) => Math.max(y0, Math.min(y1 - h, y));

// ---------------------------------------------------------------- walks: [t, x] keys, eased (a short ramp at both ends)
const trapEase = (u, r = 0.22) => { u = clamp01(u); const v = 1 / (1 - r); if (u < r) return (v * u * u) / (2 * r); if (u > 1 - r) { const w = 1 - u; return 1 - (v * w * w) / (2 * r); } return v * (r / 2 + (u - r)); };
export function keyX(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [t0, x0] = keys[i - 1], [t1, x1] = keys[i]; if (t <= t1) return x0 === x1 ? x0 : lerp(x0, x1, trapEase((t - t0) / (t1 - t0))); }
  return keys[keys.length - 1][1];
}
const speedOf = (keys, t) => (keyX(keys, t + 0.02) - keyX(keys, t - 0.02)) / 0.04;
export const heroX = (t) => keyX(HERO_X, t);
export const heroZ = (t) => lerp(HERO_Z_CAGE, HERO_Z, trapEase((t - HERO_X[3][0]) / (HERO_X[4][0] - HERO_X[3][0])));
export const waitX = (t) => (t < (WAIT_X[WAIT_X.length - 1][0] + WAIT2_X[0][0]) / 2 ? keyX(WAIT_X, t) : keyX(WAIT2_X, t));

// ---------------------------------------------------------------- the hero's slot machine: presses and reel spins
export const PRESSES = [19.0, 19.85, 20.55, 21.0, 21.42, 21.82];
export const SPINS = PRESSES.map((p, i) => { const gap = (PRESSES[i + 1] ?? p + 1.2) - p, d = Math.min(0.75, gap - 0.08); return { t0: p + 0.04, stop: [p + d * 0.6, p + d * 0.8, p + d], to: [(i * 5 + 1) % 12, (i * 7 + 3) % 12, (i * 3 + 5) % 12], rate: 22 }; });
const reels = (t) => [0, 1, 2].map((r) => reelPos(t, r, SPINS, [2, 5, 9][r]));
const speeds = (t) => [0, 1, 2].map((r) => reelSpeed(t, r, SPINS, [2, 5, 9][r]));
const idleReel = (seed, r, t) => { const per = 5 + rnd(seed) * 3, ph = rnd(seed + 7) * per, cyc = Math.floor((t + ph) / per), u = (t + ph) - cyc * per; return Math.floor(rnd(seed * 31 + cyc * 7 + r) * 12) + cyc * 24 + 24 * ease(clamp01(u / (0.9 + r * 0.3))) - 24; };
const NEIGH = [{ x: SLOTM.x + 92, body: RAMP.purple, seed: 5 }, { x: SLOTM.x + 184, body: RAMP.blue, seed: 7 }];
const BANK_BODIES = [RAMP.teal, RAMP.purple, RAMP.red];
/** Card reader on the hero's machine (machine-local u, v on the lower front, just under the deck). */
const READER = { u0: -34, u1: -14, v0: 52, v1: 62 };
const readerPt = () => [SLOTM.x + (READER.u0 + READER.u1) / 2, (READER.v0 + READER.v1) / 2, SLOTM.z + 1];
function drawReader(c, V, t) {
  const q = [[READER.u0, READER.v1], [READER.u1, READER.v1], [READER.u1, READER.v0], [READER.u0, READER.v0]].map(([u, v]) => P2(V, SLOTM.x + u, v, SLOTM.z + 0.8));
  X.outlined(c, q, RAMP.black[3], O); const k = V.k(SLOTM.x, 57, SLOTM.z);
  const [sx, sy] = P2(V, SLOTM.x + READER.u0 + 3, 59, SLOTM.z + 1), [ex] = P2(V, SLOTM.x + READER.u1 - 3, 59, SLOTM.z + 1); c.rect(R(sx), R(sy), R(ex - sx), Math.max(1, R(k * 0.9)), "#05030A"); c.rect(R(sx), R(sy) + 1, R(ex - sx), 1, RAMP.chrome[5]);
  const on = sm(t, CARD.insert1 - 0.1, CARD.insert1 + 0.15), [lx, ly] = P2(V, SLOTM.x + READER.u1 - 4, 55, SLOTM.z + 1);
  c.rect(R(lx) - 1, R(ly) - 1, 3, 3, on > bayerish(lx, ly) ? UI.GR : "#4A2020"); if (on > 0) glow(c, lx, ly, 10, 8, UI.GR, 0.5 * on);
  const [tx, ty] = P2(V, SLOTM.x + READER.u0 + 3, 54, SLOTM.z + 1); c.rect(R(tx), R(ty), Math.max(3, R(6 * k)), Math.max(2, R(2 * k)), mix("#1E2A4A", "#7FE3F0", 0.6 * on));
}
const bayerish = (x, y) => (((R(x) * 5 + R(y) * 3) % 8) + 0.5) / 8;

// ---------------------------------------------------------------- the hero
function heroPose(t, G, V) {
  const x = heroX(t), spd = Math.abs(speedOf(HERO_X, t));
  let p = idlePose(t, 3, { near: [12, -44], far: [6, -37] });
  if (spd > 4) { const w = walkPose(x + 1000, clamp01(spd / 90)); p = { ...p, ph: w.ph, amp: w.amp, bob: w.bob, near: w.near, far: w.far }; }
  const reach = (pt, k, dy = 0) => { if (k <= 0 || !pt) return; const [sx, sy] = V.P(pt[0], pt[1] + dy, pt[2]), tg = V.toRig(G, sx, sy); p.near = [lerp(p.near[0], tg[0], k), lerp(p.near[1], tg[1], k)]; };
  const hold = (pt, k) => { if (k > 0) p.near = [lerp(p.near[0], pt[0], k), lerp(p.near[1], pt[1], k)]; };
  // hook: a happy reach for the free drink, then a puzzled look when the tag turns
  { const k = win(t, WAIT.stop - 0.2, TAG.flip0 + 0.1, 0.4, 0.35); if (k > 0 && V.glass) { const tg = V.toRig(G, V.glass[0] - 4, V.glass[1] - 8); p.near = [lerp(p.near[0], tg[0], 0.75 * k), lerp(p.near[1], tg[1], 0.75 * k)]; p.mouth = k; } }
  { const k = win(t, TAG.flip0, CASH.reach - 0.2, 0.3, 0.3); if (k > 0) { p.brows = 1.5 * k; p.headTilt = lerp(p.headTilt, -0.1, k); } }
  // cage: hold the cash, push it through the hole
  { const k = win(t, CASH.reach - 0.3, CASH.push0, 0.35, 0.1); hold([16, -54], k); }
  { const k = win(t, CASH.push0 - 0.05, CASH.push1 - 0.1, 0.3, 0.35); reach([CAGE.win - 10, 110, CAGE.z1 + 8], k); }
  { const k = win(t, TOY.hop0, TOY.hop0 + 1.4, 0.2, 0.3); if (k > 0) p = { ...clapPose(t, p, k), mouth: k }; }
  { const k = win(t, TOY.bill0 - 0.5, TOY.bill1 + 0.4, 0.3, 0.3); hold([16, -54], k); }
  // shop: the bill hesitates (forward, back), the card taps at once
  { const k = win(t, SHOPB.bill - 0.1, SHOPB.swap, 0.3, 0.12); if (k > 0) { const doubt = win(t, SHOPB.doubt0, SHOPB.doubt1, 0.1, 0.1), wob = 0.5 + 0.5 * Math.cos((t - SHOPB.doubt0) * Math.PI * 2 / 0.62); reach([SHOP.reg - 30, 110, SHOP.z1 + 6], k * (doubt > 0 ? lerp(0.85, 0.3 + 0.55 * wob, doubt) : 0.85)); p.brows = 1.4 * doubt; } }
  { const k = win(t, SHOPB.swap - 0.05, SHOPB.tap + 0.3, 0.2, 0.3); reach([SHOP.reg - 32, 116, SHOP.z1 + 8], k); }
  { const k = win(t, SHOPB.tap + 0.2, SHOPB.items[4] + 0.4, 0.3, 0.4); if (k > 0) { p = { ...cheerPose(t * 0.8, p, 0.55 * k, 1), mouth: k }; } }
  // the player card: delight, then the card goes into the reader; then spin presses
  { const k = win(t, CARD.bow - 0.3, CARD.untie + 0.1, 0.3, 0.3); if (k > 0) p = cheerPose(t * 0.7, p, 0.8 * k, 2); }
  { const k = win(t, CARD.insert0 - 0.2, CARD.insert1 + 0.15, 0.3, 0.3); reach(readerPt(), k); }
  if (V.slotGeo?.spin) for (const tp of PRESSES) { const k = win(t, tp - 0.22, tp + 0.08, 0.16, 0.18); if (k > 0) { const tg = V.toRig(G, V.slotGeo.spin[0], V.slotGeo.spin[1]); p.near = [lerp(p.near[0], tg[0], k), lerp(p.near[1], tg[1] - 1, k)]; p.press = sm(t, tp - 0.06, tp) * (1 - sm(t, tp + 0.04, tp + 0.14)); } }
  // gifts: looking up happily at them
  { const k = win(t, GIFT.dinner, GIFT.out, 0.4, 0.4); if (k > 0) { p.headTilt = lerp(p.headTilt, -0.16, k); p.mouth = Math.max(p.mouth || 0, k * (t > GIFT.up[0] ? 1 : 0.6)); } }
  // the drink: take it, sip, hold it
  { const k = win(t, DRINK.hand0, DRINK.sip0, 0.35, 0.3); if (k > 0 && V.tray2) { const tg = V.toRig(G, V.tray2[0], V.tray2[1] - 4); p.near = [lerp(p.near[0], tg[0], k * sm(t, DRINK.hand0, DRINK.hand0 + 0.35) * (1 - sm(t, DRINK.hand0 + 0.5, DRINK.hand1))), lerp(p.near[1], tg[1], k * sm(t, DRINK.hand0, DRINK.hand0 + 0.35) * (1 - sm(t, DRINK.hand0 + 0.5, DRINK.hand1)))]; } }
  { const k = win(t, DRINK.hand1 - 0.2, END + 1, 0.4, 0.1); hold([16, -56], k); }
  { const k = win(t, DRINK.sip0, DRINK.sip1, 0.3, 0.35); hold([13.5, -73], k); if (k > 0) p.headTilt = lerp(p.headTilt, -0.12, k); }
  { const k = win(t, DRINK.stack0 + 0.2, DRINK.stack1 + 1.2, 0.3, 0.5); if (k > 0) p.mouth = k; }
  return p;
}
/** What the hero holds and where, as a screen-space prop at his near hand. */
function heroProp(c, V, t, G) {
  const [hx, hy] = V.hand, s = G.z / 1.75;
  // cash at the cage (dissolves into the hole), the bill that greys out, the bill and the card in the shop
  const cashA = Math.min(sm(t, CASH.reach - 0.35, CASH.reach), 1 - sm(t, CASH.push1 - 0.25, CASH.push1 - 0.05));
  if (cashA > 0) { X.banknote(c, hx + 2 * s, hy - 5 * s, 22 * s, cashA, { ang: -0.5 }); X.banknote(c, hx + 4 * s, hy - 3 * s, 22 * s, cashA, { ang: -0.35 }); }
  const greyA = Math.min(sm(t, TOY.bill0 - 0.45, TOY.bill0 - 0.15), 1 - sm(t, TOY.bill1 + 0.05, TOY.bill1 + 0.4));
  if (greyA > 0) X.banknote(c, hx + 3 * s, hy - 4 * s, 22 * s, greyA, { ang: -0.45, grey: sm(t, TOY.bill0, TOY.bill1) });
  const billA = Math.min(sm(t, SHOPB.bill - 0.25, SHOPB.bill), 1 - sm(t, SHOPB.swap - 0.05, SHOPB.swap + 0.2));
  if (billA > 0) X.banknote(c, hx + 3 * s, hy - 4 * s, 22 * s, billA, { ang: -0.3 + 0.12 * Math.sin(t * 9) * win(t, SHOPB.doubt0, SHOPB.doubt1, 0.1, 0.1) });
  const cardA = Math.min(sm(t, SHOPB.swap, SHOPB.swap + 0.25), 1 - sm(t, SHOPB.items[2], SHOPB.items[2] + 0.3));
  if (cardA > 0) X.plasticCard(c, hx + 4 * s, hy - 3 * s, 15 * s, cardA, { ang: -0.25 });
  // the drink after he takes it
  if (t > DRINK.hand1 - 0.25) { const sip = win(t, DRINK.sip0, DRINK.sip1, 0.3, 0.35); X.cocktail(c, hx + 2 * s, hy + 3 * s, s * 1.5, 1, { level: 1 - 0.4 * sm(t, DRINK.sip0 + 0.3, DRINK.sip1), tilt: -0.5 * sip }); }
}

// ---------------------------------------------------------------- the waitress
function waitressPose(t, x2) {
  const keys = t < 20 ? WAIT_X : WAIT2_X, spd = speedOf(keys, t), x = keyX(keys, t);
  let p = idlePose(t, 9, { near: [16, -62], far: [5, -37] });
  if (Math.abs(spd) > 4) { const w = walkPose(Math.abs(x - 2000), clamp01(Math.abs(spd) / 90)); p = { ...p, ph: w.ph, amp: w.amp, bob: w.bob * 0.6, far: w.far }; }
  p.near = [16, -62 + (p.bob || 0) * 0.3]; p.mouth = 0.6; void x2;
  return p;
}
function drawWaitress(c, V, t, items) {
  const first = t < WAIT.gone + 0.2, second = t > WAIT2_X[0][0] - 0.1 && t < WAIT2_X[WAIT2_X.length - 1][0] + 0.2;
  if (!first && !second) return;
  const keys = first ? WAIT_X : WAIT2_X, x = keyX(keys, t), mirror = first ? true : speedOf(keys, t) < 1 ? true : true;
  items.push({ x, z: WAITRESS_Z, draw: () => {
    const wa = first ? 1 : sm(t, WAIT2_X[0][0], WAIT2_X[0][0] + 0.35), p = waitressPose(t), G = drawPerson(c, V, x, WAITRESS_Z, t, p, X.LOOKS_X.waitress, { mirror, a: wa });
    const tp = X.tray(c, G, [G.X(p.near[0]), G.Y(p.near[1] + (p.bob || 0))], wa), s = G.z / 1.75;
    if (first) { V.glass = [tp[0] - 3 * s, tp[1] - 22 * s]; X.cocktail(c, tp[0] - 3 * s, tp[1], s * 1.6, 1); V.glassBase = [tp[0] - 3 * s, tp[1]]; V.glassS = s; }
    else { V.tray2 = [tp[0] - 3 * s, tp[1]]; if (t < DRINK.hand0 + 0.6) { const k = sm(t, DRINK.hand0 + 0.25, DRINK.hand0 + 0.6); if (k < 1) X.cocktail(c, lerp(tp[0] - 3 * s, V.hand2?.[0] ?? tp[0], ease(k)), lerp(tp[1], V.hand2?.[1] ?? tp[1], ease(k)) - 4 * s * Math.sin(Math.PI * k), s * 1.6, wa); } }
  } });
}

// ---------------------------------------------------------------- the cage: bills in, chips out, chips hopping
const ZB = CAGE.z1, LEDGE_Y = 104.5;
function flatBill(c, V, x, y, z, a, rot = 0) {
  if (a <= 0) return; const g = fade(c, a), w = 8, l = 3.6, cr = Math.cos(rot), sr = Math.sin(rot);
  const pts = [[-w, -l], [w, -l], [w, l], [-w, l]].map(([u, v]) => P2(V, x + u * cr - v * sr, y, z + u * sr + v * cr));
  g.poly(pts.map(([px, py]) => [px, py + 1]), "#123A1C"); X.outlined(g, pts, "#7CC88A", "#1E5A2C");
  const m = P2(V, x, y, z); g.disc(R(m[0]), R(m[1]), Math.max(1, R(V.k(x, y, z) * 1.4)), "#B8E8C0");
}
export const CHIP_OUT = [{ dx: -33, n: 5, ramp: CHIP_RAMPS.red }, { dx: -11, n: 4, ramp: CHIP_RAMPS.blue }, { dx: 11, n: 6, ramp: CHIP_RAMPS.green }, { dx: 33, n: 3, ramp: CHIP_RAMPS.purple }];
function chipZ(t, i) { const u = ease(clamp01((t - CASH.chips0 - i * 0.1) / 0.6)); return lerp(ZB - 24, ZB + 24, u); }
const TOYCHIP = { r: 6.2, h: 1.7 };
function hop(t, i) { const k = win(t, TOY.hop0, TOY.hop1, 0.15, 0.3); if (k <= 0) return 0; const ph = (t - TOY.hop0) / 0.46 - i * 0.22; if (ph < 0) return 0; return 9 * k * Math.abs(Math.sin(Math.PI * ph)); }
function cageInside(c, V, t) {
  // bills slide in under the arch and the cashier gathers them
  for (const [i, dx] of [[0, -6], [1, 6]]) { const u = clamp01((t - CASH.push1 + 0.15 - i * 0.08) / 0.6), z = lerp(ZB + 4, ZB - 26, ease(u)), a = (t > CASH.push1 - 0.2 ? 1 : 0) * (1 - sm(t, CASH.chips0 - 0.1, CASH.chips0 + 0.3)); if (z < ZB) flatBill(c, V, CAGE.win + dx, LEDGE_Y, z, a, 0.15 * i); }
  for (const [i, ch] of CHIP_OUT.entries()) { const z = chipZ(t, i); if (t > CASH.chips0 - 0.4 && z < ZB) chipStack(c, V, CAGE.win + ch.dx, LEDGE_Y, z, ch.n, ch.ramp, { ...TOYCHIP, a: sm(t, CASH.chips0 - 0.4, CASH.chips0 - 0.1) }); }
}
function cageLedge(c, V, t) {
  for (const [i, dx] of [[0, -6], [1, 6]]) { const u = clamp01((t - CASH.push1 + 0.15 - i * 0.08) / 0.6), z = lerp(ZB + 4, ZB - 26, ease(u)); if (t > CASH.push1 - 0.2 && z >= ZB) flatBill(c, V, CAGE.win + dx, LEDGE_Y, z, 1, 0.15 * i); }
  for (const [i, ch] of CHIP_OUT.entries()) { const z = chipZ(t, i); if (t > CASH.chips0 && z >= ZB) { const h = hop(t, i); chipStack(c, V, CAGE.win + ch.dx, LEDGE_Y + h, z, ch.n, ch.ramp, { ...TOYCHIP, spin: h > 0 ? t * 5 + i : 0, glow: win(t, CASH.chips1 - 0.3, CASH.chips1 + 0.6, 0.2, 0.4) });
    if (h > 0.5) { const [sx, sy, k] = V.P(CAGE.win + ch.dx, LEDGE_Y, z); shadow(c, sx, sy, 7 * k, 2.5 * k, 0.4 * (1 - h / 12)); } } }
}

// ---------------------------------------------------------------- the shop: items fly into the bag
const SHELF_SRC = [[SHOP.x0 + 40, 128], [SHOP.x0 + 110, 178], [SHOP.x0 + 150, 128], [SHOP.x0 + 190, 178], [SHOP.x0 + 230, 128]];
const BAG = { x: SHOP.reg + 50, z: SHOP.z1 + 8 };
function shopTop(c, V, t) {
  const kinds = ["teddy", "mug", "cap", "globe", "mug2"], ba = sm(t, SHOPB.tap - 0.1, SHOPB.tap + 0.2);
  if (ba <= 0) return;
  // paper bag on the counter (fills: items sit in its mouth)
  const [bx, by, k] = V.P(BAG.x, 100, BAG.z), w = 15 * k, h = 20 * k, g = fade(c, ba), n = SHOPB.items.filter((ti) => t > ti + 0.35).length;
  const bulge = n * 0.6 * k;
  g.rect(R(bx - w) + 2, R(by - h) + 2, R(2 * w), R(h), "#05030A");
  X.outlined(g, [[bx - w - bulge * 0.3, by - h], [bx + w + bulge * 0.3, by - h], [bx + w, by], [bx - w, by]], "#C89A62", "#4A2E14");
  g.rect(R(bx - w * 0.9), R(by - h * 0.55), R(w * 1.8), 1, "#A87A44"); g.text(TINY, "GIFTS", R(bx - 9), R(by - h * 0.4), "#6A4420", { scale: 1 });
  for (const s of [-1, 1]) g.ering(R(bx + s * w * 0.4), R(by - h), Math.max(2, R(w * 0.25)), Math.max(2, R(h * 0.22)), "#4A2E14", Math.PI, Math.PI * 2);
  SHOPB.items.forEach((ti, i) => {
    const u = clamp01((t - ti) / 0.42); if (u <= 0) return;
    const [sx0, sy0] = P2(V, SHELF_SRC[i][0], SHELF_SRC[i][1], SHOP.z0 + 8), ex = bx - w * 0.5 + (i % 3) * w * 0.5, ey = by - h - 2 * k + (i > 2 ? -3 * k : 0);
    const x = lerp(sx0, ex, ease(u)), y = lerp(sy0, ey, ease(u)) - Math.sin(Math.PI * u) * 40;
    X.shopItem(fade(c, sm(u, 0, 0.15)), kinds[i], x, y, k * (1.2 + 0.6 * Math.sin(Math.PI * u)));
  });
}

// ---------------------------------------------------------------- the big player's table
const PLAYER = { x: TABLE.x + 98, z: TABLE.z + 84 };
const WHEEL_SPIN = { t0: EV.some1 - 2.5, tDrop: EV.some1 + 0.6, tLand: EV.losses - 0.1, from: 17, to: 26, turns: 5 };
const wheelAng = (t) => 1.1 * t;
export const BIG_STACKS = [{ dx: -18, dz: -6, n: 12, ramp: CHIP_RAMPS.black }, { dx: -6, dz: 4, n: 10, ramp: CHIP_RAMPS.purple }, { dx: -24, dz: 12, n: 8, ramp: CHIP_RAMPS.yellow }];
function drawTable(c, V, t, items) {
  items.push({ x: TABLE.x, z: TABLE.z - 200, draw: () => drawDealer(c, V, TABLE.x, TABLE.z - 205, t, { hands: [[TABLE.x - 30, TOP + 2, TABLE.z - 168], [TABLE.x + 30 + 20 * win(t, BIG.lose1 - 0.4, BIG.env0 + 0.3, 0.3, 0.3), TOP + 2, TABLE.z - 168 + 60 * win(t, BIG.env0 - 0.2, BIG.env0 + 0.4, 0.3, 0.3)]], smile: 0.6 }) });
  items.push({ x: TABLE.x, z: TABLE.z, draw: () => {
    drawRouletteTable(c, V, TABLE, { wheel: { ang: wheelAng(t), ball: ballState(t, WHEEL_SPIN, wheelAng) }, chips: [{ n: 7, count: 3, ramp: CHIP_RAMPS.blue }, { n: 23, count: 2 }] });
    // the big player's tall stacks: they slide to the dealer on «losses» (gone), then the REBATE comes back
    for (const [i, st] of BIG_STACKS.entries()) { const u = ease(clamp01((t - BIG.lose0 - i * 0.12) / 0.7)), x = lerp(PLAYER.x - 40 + st.dx, TABLE.x + 10, u), z = lerp(PLAYER.z - 40 + st.dz, TABLE.z - 150, u), a = 1 - sm(u, 0.7, 1);
      if (a > 0) chipStack(c, V, x, TOP + 0.6, z, st.n, st.ramp, { a, r: 3.8 }); }
    // the hero's bet: two chips, then a bigger stack after the drink (chips drop in)
    if (t > EV.and2 - 0.5) { const n0 = 2, nGrow = 7, k = clamp01((t - DRINK.stack0) / (DRINK.stack1 - DRINK.stack0)), n = n0 + Math.floor(nGrow * k), a = sm(t, EV.and2 - 0.5, EV.and2 - 0.1);
      chipStack(c, V, TABLE.x - 38, TOP + 0.6, TABLE.z + 108, n, CHIP_RAMPS.red, { a, r: 5.4, h: 1.5, glow: win(t, DRINK.stack1 - 0.2, DRINK.stack1 + 1.2, 0.2, 0.5) });
      if (k > 0 && k < 1) { const f = nGrow * k - Math.floor(nGrow * k), y = TOP + 0.6 + (n0 + Math.floor(nGrow * k)) * 1.5 + (1 - f) * 22; chipStack(c, V, TABLE.x - 38, y, TABLE.z + 108, 1, CHIP_RAMPS.red, { r: 5.4, h: 1.5, a: sm(f, 0, 0.3) }); }
      V.betTop = P2(V, TABLE.x - 38, TOP + 0.6 + n * 1.5 + 4, TABLE.z + 108); }
  } });
  items.push({ x: PLAYER.x, z: PLAYER.z, draw: () => {
    let p = idlePose(t, 11, { near: [14, -46], far: [6, -38] });
    { const k = win(t, BIG.lose0 - 0.3, BIG.lose1, 0.3, 0.3); if (k > 0) { p.brows = 1.2 * k; p.headTilt = lerp(p.headTilt, 0.12, k); } }
    { const k = win(t, BIG.env1 - 0.3, BIG.happy1 + 0.6, 0.3, 0.5); if (k > 0) p = { ...cheerPose(t * 0.6, p, 0.7 * k, 4), mouth: k }; }
    const G = drawPerson(c, V, PLAYER.x, PLAYER.z, t, p, X.LOOKS_X.highroller, { mirror: true, unit: 1.84 });
    V.bigHead = [G.X(2), G.Y(-104)]; V.bigHand = [G.X(p.near[0]), G.Y(p.near[1])];
  } });
}

// ---------------------------------------------------------------- the world
export function drawWorld(c, t) {
  const V = makeView(camAt(CAM, t)), items = [];
  // kiosks
  items.push({ x: (CAGE.x0 + CAGE.x1) / 2, z: CAGE.z0 + 40, draw: () => X.cashierCage(c, V, t, CAGE, { inside: (cc, VV) => cageInside(cc, VV, t), ledge: (cc, VV) => cageLedge(cc, VV, t), cashierHands: [[CAGE.win - 16, 106, ZB - 20 + 14 * win(t, CASH.push1 - 0.1, CASH.chips0 + 0.5, 0.3, 0.3)], [CAGE.win + 24, 106, ZB - 20 + 22 * win(t, CASH.chips0 - 0.2, CASH.chips1, 0.3, 0.3)]] }) });
  items.push({ x: (SHOP.x0 + SHOP.x1) / 2, z: SHOP.z0 + 40, draw: () => X.giftShop(c, V, t, SHOP, { beep: win(t, SHOPB.tap + 0.05, SHOPB.out, 0.12, 0.5), top: (cc, VV) => shopTop(cc, VV, t) }) });
  // the hero's machine and its neighbours
  for (const nb of NEIGH) items.push({ x: nb.x, z: SLOTM.z - 1, draw: () => drawSlot(c, V, t, { x: nb.x, z: SLOTM.z, body: nb.body, seed: nb.seed }, { reels: [0, 1, 2].map((r) => idleReel(nb.seed, r, t)), speeds: [0, 1, 2].map((r) => Math.abs(idleReel(nb.seed, r, t + 0.017) - idleReel(nb.seed, r, t - 0.017)) * 30), lights: 0.8 }) });
  items.push({ x: SLOTM.x, z: SLOTM.z, draw: () => { V.slotGeo = drawSlot(c, V, t, { x: SLOTM.x, z: SLOTM.z, body: RAMP.red, seed: 1 }, { reels: reels(t), speeds: speeds(t), lights: 1, line: 0.3 * win(t, ICONS.in, BOARD.lock, 0.5, 0.5) }); drawReader(c, V, t); } });
  // the NO FREE DRINKS machines with a guest
  BANK.forEach((m, i) => items.push({ x: m.x, z: m.z, draw: () => drawSlot(c, V, t, { x: m.x, z: m.z, body: BANK_BODIES[i], seed: 20 + i }, { reels: [0, 1, 2].map((r) => idleReel(20 + i, r, t)), speeds: [0, 1, 2].map((r) => Math.abs(idleReel(20 + i, r, t + 0.017) - idleReel(20 + i, r, t - 0.017)) * 30), lights: 0.9 }) }));
  items.push({ x: BANK[2].x - 66, z: BANK[2].z + 36, draw: () => drawPerson(c, V, BANK[2].x - 66, BANK[2].z + 36, t, { ...idlePose(t, 31), near: [16, -50 + Math.sin(t * 2.2) * 2] }, LOOKS.sweater) });
  drawTable(c, V, t, items);
  // where the waitress's tray will be (the hero, drawn before her, reaches for it)
  { const first = t < WAIT.gone + 0.2, keys = first ? WAIT_X : WAIT2_X, G = V.bill(keyX(keys, t), WAITRESS_Z, 1.75, 0.86, true), p = waitressPose(t), z = G.z, hx = G.X(p.near[0]), hy = G.Y(p.near[1] + (p.bob || 0)), tx = hx - 4 * z, ty = hy - 2.5 * z, s = z / 1.75;
    if (first) V.glass = [tx - 3 * s, ty - 22 * s]; else V.tray2 = [tx - 3 * s, ty]; }
  drawWaitress(c, V, t, items);
  // the hero
  const hx = heroX(t), hz = heroZ(t);
  items.push({ x: hx, z: hz, draw: () => {
    const G = V.bill(hx, hz, 1.75, 0.86, false), p = heroPose(t, G, V);
    drawPerson(c, V, hx, hz, t, p, LOOKS.hero);
    V.hand = [G.X(p.near[0]), G.Y(p.near[1] + (p.bob || 0))]; V.head = [G.X(3), G.Y(-100 + (p.bob || 0))]; V.heroG = G; V.hand2 = [V.hand[0] + 2 * G.z / 1.75, V.hand[1] + 3 * G.z / 1.75];
    heroProp(c, V, t, G);
  } });
  drawCasino(c, V, t, { skip: ["hero", "r-left", "r-right", "c-front-l", "c-front-r", "r-far-l"], items, rope: false });
  return V;
}

// ---------------------------------------------------------------- overlays (screen space)
function plaque(c, x, y, w, h, a, edge = RAMP.gold) { const g = fade(c, a); g.rrect(x + 2, y + 3, w, h, "#05030A", 4); g.rrect(x, y, w, h, edge[2], 4); g.rrect(x + 2, y + 2, w - 4, h - 4, edge[5], 3); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 2); }
function sparkle(c, x, y, u, a, r0 = 8) { const g = fade(c, a); for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + u * 2, r = r0 + 16 * clamp01(u * 2); g.rect(R(x + Math.cos(an) * r) - 1, R(y + Math.sin(an) * r * 0.8) - 1, 2, 2, i % 2 ? "#FFFFFF" : UI.Y); } }
function dashed(c, a, b, col, al) { fade(c, al).line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), col, [3, 3]); fade(c, al).line(R(a[0]) + 1, R(a[1]), R(b[0]) + 1, R(b[1]), col, [3, 3]); }

// 1. the FREE tag over the glass: flips to «?» and a counter that keeps rolling
function freeTag(c, V, t) {
  const a = Math.min(1, 1 - sm(t, TAG.out, TAG.out + 0.4)); if (a <= 0 || !V.glass) return;
  const s = 1.7, cx = clampX(V.glass[0] + 10, 0, 100, 400), cy = clampY(V.glass[1] - 96 + Math.sin(t * 2.2) * 2, 0, 190, 600), flip = ease(clamp01((t - TAG.flip0) / (TAG.flip1 - TAG.flip0)));
  X.priceTag(c, cx, cy, s, flip, a, { t, string: [V.glass[0] + 6, V.glass[1] + 4] });
  if (flip > 0.95) { const k = win(t, TAG.flip1, TAG.flip1 + 0.8, 0.05, 0.5); if (k > 0) sparkle(c, cx, cy, t - TAG.flip1, k * a, 30); }
}
// 2. the shop: a «?» and a sweat drop while the bill hesitates; ✓ beeps with the card
function doubt(c, V, t) {
  if (!V.head) return; const k = win(t, SHOPB.doubt0 - 0.1, SHOPB.swap + 0.1, 0.2, 0.25); if (k <= 0) return;
  const [hx, hy] = V.head, g = fade(c, k), bx = R(clampX(hx + 6, 40)), by = R(clampY(hy - 74, 44)), bob = R(Math.sin(t * 5) * 2);
  g.rrect(bx + 2, by + 3 + bob, 40, 40, "#05030A", 4); g.rrect(bx, by + bob, 40, 40, O, 4); g.rrect(bx + 2, by + 2 + bob, 36, 36, "#FFF8E8", 3);
  g.text(MAIN, "?", bx + 13, by + 9 + bob, "#B82030", { scale: 3 });
  g.poly([[bx + 6, by + 38 + bob], [bx + 16, by + 38 + bob], [hx + 2, hy - 18]], "#FFF8E8");
  // sweat drop sliding down the forehead
  const u = ((t - SHOPB.doubt0) / 0.7) % 1, dx = hx - 10, dy = hy + 2 + u * 14; g.disc(R(dx), R(dy), 3, "#2A6A8A"); g.disc(R(dx), R(dy), 2, "#9AE6F0"); g.px(R(dx) - 1, R(dy) - 1, "#FFFFFF");
}
// 3. the player card in its gift ribbon → into the reader
function giftCard(c, V, t) {
  const a = Math.min(sm(t, CARD.in0, CARD.in0 + 0.4), 1 - sm(t, CARD.insert1 - 0.12, CARD.insert1 + 0.05)); if (a <= 0 || !V.head) return;
  const fl = ease(clamp01((t - CARD.in0) / (CARD.in1 - CARD.in0))), fx = clampX(V.head[0] + 140, 0, 120, 360), fy = clampY(V.head[1] - 40 - 30 * (1 - fl) + Math.sin(t * 2.4) * 3, 0, 220, 600);
  const [rx, ry] = P2(V, ...readerPt()), u = ease(clamp01((t - CARD.insert0) / (CARD.insert1 - CARD.insert0)));
  const x = lerp(fx, rx, u), y = lerp(fy, ry, u) - Math.sin(Math.PI * u) * 30, w = lerp(130, 24, u), ang = lerp(Math.sin(t * 1.8) * 0.06, 0, u);
  X.playerCard(c, x, y, w, a, { ribbon: 1 - sm(t, CARD.untie, CARD.untie + 0.35), t, sparkle: win(t, CARD.in0 + 0.2, CARD.untie + 0.2, 0.3, 0.3) * (1 + win(t, CARD.bow, CARD.bow + 0.6, 0.1, 0.4)), ang });
}
// 4. three icons fill; they merge with the game's edge into the EXPECTED LOSS board; a slice becomes the gifts
const ICX = [150, 270, 390], ICY = 222, ICR = 34;
function icons(c, V, t) {
  const A = Math.min(sm(t, ICONS.in, ICONS.in + 0.4), 1 - sm(t, ICONS.merge0 + 0.4, ICONS.merge1)); if (A <= 0) return;
  const m = ease(clamp01((t - ICONS.merge0) / (ICONS.merge1 - ICONS.merge0))), base = clamp01((t - ICONS.in) / 2.4) * 0.25;
  const fills = [sm(t, ICONS.much, ICONS.much + 0.55), sm(t, ICONS.fast, ICONS.fast + 0.55), sm(t, ICONS.long, ICONS.long + 0.65)];
  ["$", "bolt", "timer"].forEach((k, i) => { const pop = ease(clamp01((t - ICONS.in - i * 0.12) / 0.3)), f = Math.max(base, fills[i]), x = lerp(ICX[i], 270, m), y = lerp(ICY, ICY + 10, m) + (1 - pop) * 10;
    X.badge(c, x, y, R(ICR * (1 - 0.4 * m)), k, f, A * pop, t); X.fillBar(c, x, R(y + ICR + 8), 60, f, A * pop * (1 - m), [UI.GR, UI.Y, UI.CY][i]);
    if (fills[i] > 0.02 && fills[i] < 0.98) sparkle(c, x, y, fills[i], 0.8 * A, 24); });
}
function board(c, V, t) {
  const A = Math.min(sm(t, BOARD.in, BOARD.in + 0.35), 1 - sm(t, BOARD.out, BOARD.out + 0.4)); if (A <= 0) return null;
  const roll = t < BOARD.roll ? 1 : 1 - win(t, BOARD.roll, BOARD.lock, 0.15, 0.25), grow = sm(t, GIFT.grow0, GIFT.grow1);
  const geo = X.lossBoard(c, 60, 166, 420, t, A, { roll, bar: 0.62 + 0.36 * grow, cut: sm(t, BOARD.cut, BOARD.cut + 0.3) });
  // the game's edge: a green wheel badge flies in from the right and drops into the board
  const e = clamp01((t - ICONS.edge0) / (ICONS.edge1 - ICONS.edge0)); if (e > 0 && e < 1.2) { const k = ease(e), ea = A * (1 - sm(e, 0.8, 1)); X.badge(c, lerp(470, 270, k), lerp(330, 230, k) - Math.sin(Math.PI * k) * 40, R(lerp(30, 18, k)), "edge", 0, ea, t); if (e < 1) X.fillBar(c, lerp(470, 270, k), R(lerp(330, 230, k) + 38), 0, 0, 0); }
  if (e >= 1) { const k = win(t, ICONS.edge1, ICONS.edge1 + 0.6, 0.05, 0.4); if (k > 0) sparkle(c, 270, 222, t - ICONS.edge1, k * A, 40); }
  return geo;
}
const GIFT_POS = [[136, 334], [278, 334], [420, 334]];
function gifts(c, V, t, geo) {
  const A = 1 - sm(t, GIFT.out, GIFT.out + 0.4); if (A <= 0 || t < GIFT.dinner - 0.6 || !geo) return;
  // the slice falls from the gold bar, glowing, and splits into three on the words
  const sl = geo.slice, sx = (sl.x0 + sl.x1) / 2, cut = sm(t, BOARD.cut, BOARD.cut + 0.3);
  const fall = ease(clamp01((t - BOARD.cut - 0.1) / 0.4)), sy = lerp(sl.y + 5, 300, fall), g = fade(c, A * cut * (1 - sm(t, GIFT.show + 0.2, GIFT.show + 0.5)));
  g.rect(R(sx - sl.w / 2), R(sy - 5), R(sl.w), 10, RAMP.gold[6]); g.rect(R(sx - sl.w / 2), R(sy - 5), R(sl.w), 2, RAMP.gold[7]); glow(c, sx, sy, 30, 18, UI.Y, 0.5 * A * cut);
  const kinds = [["burger", "steak"], ["key", "suite"], ["ticket", "vip"]], times = [GIFT.dinner, GIFT.room, GIFT.show];
  for (let i = 0; i < 3; i++) {
    const u = ease(clamp01((t - times[i]) / 0.4)); if (u <= 0) continue;
    const [gx, gy] = GIFT_POS[i], x = lerp(sx, gx, u), y = lerp(sy, gy, u) - Math.sin(Math.PI * u) * 30, a = A * sm(u, 0, 0.3), up = sm(t, GIFT.up[i], GIFT.up[i] + 0.3);
    const gg = fade(c, a), r = R(lerp(14, 44, u)); gg.disc(R(x) + 2, R(y) + 3, r, "#05030A"); gg.disc(R(x), R(y), r, mix(RAMP.gold[3], "#F6DE8A", up)); gg.disc(R(x), R(y), r - 3, "#160E22");
    if (up > 0) glow(c, x, y, r * 1.5, r * 1.5, UI.Y, 0.35 * up * a);
    const sc = lerp(0.5, 1.75, u); X.giftIcon(c, kinds[i][0], x, y, sc, a * (1 - up)); X.giftIcon(c, kinds[i][1], x, y, sc, a * up);
    { const lab = ["DINNER", "ROOM", "SHOW"][i], k = a * sm(u, 0.7, 1); if (k > 0) { const w = c.measure(TINY, lab, { scale: 2 }); fade(c, k).text(TINY, lab, R(x - w / 2) + 1, R(y + r + 7), O, { scale: 2 }); fade(c, k).text(TINY, lab, R(x - w / 2), R(y + r + 6), "#FFF6DA", { scale: 2 }); } }
    if (up > 0 && up < 1) sparkle(c, x, y, up, 1 - up, r);
    // «paid from a small part»: dashed lines from the slice's place on the bar to each gift
    const br = win(t, GIFT.bracket0, GIFT.bracket1, 0.25, 0.4) * A; if (br > 0) dashed(c, [sx, sl.y + 12], [x, y - r - 2], UI.Y, br * sm(t, GIFT.bracket0 + i * 0.15, GIFT.bracket0 + i * 0.15 + 0.25));
  }
  const br = win(t, GIFT.bracket0, GIFT.bracket1, 0.25, 0.4) * A; if (br > 0) { const gg = fade(c, br); gg.rframe(R(sl.x0) - 3, R(sl.y) - 3, R(sl.w) + 6, 16, UI.Y, 1); }
  // more expected loss → better gifts: an up arrow next to the bar
  const ga = win(t, GIFT.grow0, GIFT.out, 0.25, 0.4) * A; if (ga > 0) { const gg = fade(c, ga), ax = 448, ay = 300 - R(8 * sm(t, GIFT.grow0, GIFT.grow1)); gg.poly([[ax - 12, ay + 10], [ax + 12, ay + 10], [ax, ay - 6]], UI.GR); gg.rect(ax - 5, ay + 10, 10, 14, UI.GR); }
}
// 5. the REBATE envelope slides back to the big player
function rebate(c, V, t) {
  const a = Math.min(sm(t, BIG.env0, BIG.env0 + 0.25), 1 - sm(t, BIG.happy1, BIG.happy1 + 0.5)); if (a <= 0) return;
  const u = ease(clamp01((t - BIG.env0) / (BIG.env1 - BIG.env0))), [ax, ay] = P2(V, TABLE.x + 10, TOP + 30, TABLE.z - 150), [bx, by] = V.bigHand ? [V.bigHand[0] - 46, V.bigHand[1] + 50] : P2(V, PLAYER.x - 40, TOP + 30, PLAYER.z - 30);
  const x = clampX(lerp(ax, bx, u), 0, 80, 400), y = clampY(lerp(ay, by, u) - Math.sin(Math.PI * u) * 50 - 70, 0, 200, 560);
  X.envelope(c, x, y, 112, a, { open: sm(t, BIG.env1, BIG.env1 + 0.4), ang: Math.sin(t * 2) * 0.05 });
  const k = win(t, BIG.just, BIG.again + 0.4, 0.2, 0.4); if (k > 0) sparkle(c, x, y, t - BIG.just, k * a, 50);
}
// 6. the bigger bet: an up arrow over the stack
function biggerBet(c, V, t) {
  const k = win(t, DRINK.stack0, DRINK.stack1 + 1.1, 0.2, 0.4); if (k <= 0 || !V.betTop) return;
  const [x, y] = V.betTop, g = fade(c, k), lift = R(10 * ease(clamp01((t - DRINK.stack0) / 0.8))), ax = R(clampX(x + 36, 0)), ay = R(clampY(y - 44 - lift, 0));
  g.poly([[ax - 19, ay + 17], [ax + 19, ay + 17], [ax, ay - 6]], O); g.poly([[ax - 15, ay + 14], [ax + 15, ay + 14], [ax, ay - 2]], UI.GR); g.rect(ax - 8, ay + 14, 16, 22, O); g.rect(ax - 6, ay + 14, 12, 20, UI.GR); g.rect(ax - 6, ay + 14, 2, 20, "#B8F0A0");
}
// 7. the NO FREE DRINKS sign comes down on two chains
function lawSign(c, V, t) {
  const a = sm(t, LAW.drop0, LAW.drop0 + 0.3); if (a <= 0) return;
  const [px] = P2(V, BANK[1].x - 40, 0, BANK[1].z), cx = Math.max(176, Math.min(300, px)), d = ease(clamp01((t - LAW.drop0) / (LAW.drop1 - LAW.drop0))), sw = Math.sin((t - LAW.drop1) * 5) * 3 * Math.exp(-Math.max(0, t - LAW.drop1) * 2.2) * (t > LAW.drop1 ? 1 : 0);
  const cy = lerp(-100, 404, d) + sw;
  X.noDrinksSign(c, cx + sw * 0.6, cy, 272, a, { cross: clamp01((t - LAW.cross) / 0.45), chainTop: -4, swing: sw });
  if (t > LAW.cross + 0.4) { const k = win(t, LAW.cross + 0.4, LAW.cross + 1.2, 0.05, 0.5); if (k > 0) sparkle(c, cx - 80, cy, t - LAW.cross - 0.4, k, 40); }
}

export function drawStory(c, V, t) {
  freeTag(c, V, t); doubt(c, V, t); giftCard(c, V, t); icons(c, V, t);
  const geo = board(c, V, t); gifts(c, V, t, geo); rebate(c, V, t); biggerBet(c, V, t); lawSign(c, V, t);
}
export { END, EV };
