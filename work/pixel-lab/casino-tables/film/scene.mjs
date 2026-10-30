// «In blackjack, you can both bust and you still lose»: the film's own layer over the casino kit (Casino secrets 5/5). One warm
// casino at night through one perspective camera that travels right along the tables: the blackjack table (both 22, BUST over
// both, the hero's chips still go, YOU LOSE; the replay in the real order 1 YOU → 2 DEALER with the dealer's cards face down),
// the table signs 6 TO 5 / 3 TO 2 with their payout stacks, the roulette table with its tall last-numbers board (five reds,
// chips rushing to BLACK, the board going dark, NO MEMORY), the dice table (a hard shake, BIG NUMBER!, the throw, the calm die,
// the clear red casino die in macro, a fake die that can't get in), the dealer's open palms and the ceiling camera domes.
// Everything is a pure function of t and the timeline.
import { MAIN as MAIN0, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, win, rnd, mix, fade, glow, shadow, makeView, camAt } from "./casino-core.mjs";
import { drawCasino } from "./casino.mjs";
import { chipStack, CHIP_RAMPS, stool } from "./casino-props.mjs";
import { drawPerson, drawDealer, idlePose, cheerPose, walkPose, LOOKS } from "./casino-people.mjs";
import { drawRouletteTable, ballState, cellLocal, TOP } from "./casino-roulette.mjs";
import * as Gm from "./casino-games.mjs";
import { EV, END, CAM, BJ, SIGN, SIGN2, RT, BOARD, CR, DEALER_CR, DIE_POS, HERO_X, HERO_ZK, HOOK, REW, SIGNB, ROUL, DICE, PALMS, DOMES } from "./timeline.mjs";

const MAIN = { ...MAIN0, glyphs: { ...MAIN0.glyphs, "→": [".......", "....#..", ".....#.", "#######", ".....#.", "....#..", "......."], "◀": ["....#", "..###", "#####", "..###", "....#", ".....", "....."] } };
const O = "#0B0812";
const P2 = (V, x, y, z) => { const p = V.P(x, y, z); return [p[0], p[1]]; };
const clampX = (x, w, x0 = 40, x1 = 436) => Math.max(x0, Math.min(x1 - w, x));
const BT = Gm.BJ_TOP;

// ---------------------------------------------------------------- walks: [t, x] keys, eased (a short ramp at both ends)
const trapEase = (u, r = 0.22) => { u = clamp01(u); const v = 1 / (1 - r); if (u < r) return (v * u * u) / (2 * r); if (u > 1 - r) { const w = 1 - u; return 1 - (v * w * w) / (2 * r); } return v * (r / 2 + (u - r)); };
export function keyX(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) { const [t0, x0] = keys[i - 1], [t1, x1] = keys[i]; if (t <= t1) return x0 === x1 ? x0 : lerp(x0, x1, trapEase((t - t0) / (t1 - t0))); }
  return keys[keys.length - 1][1];
}
const speedOf = (keys, t) => (keyX(keys, t + 0.02) - keyX(keys, t - 0.02)) / 0.04;
export const heroX = (t) => keyX(HERO_X, t);
export const heroZ = (t) => keyX(HERO_ZK, t);

// ---------------------------------------------------------------- blackjack: cards, chips
const SHOE = { x: BJ.x + 94, y: BT + 8, z: BJ.z - 42 };
const HAND_H = { x: BJ.x + 16, z: BJ.z + 16 }, HAND_D = { x: BJ.x + 14, z: BJ.z - 30 }, BET = { x: BJ.x - 8, z: BJ.z + 46 }, RACK = { x: BJ.x - 6, z: BJ.z - 51 };
export const HERO_CARDS = [["K", "♠"], ["5", "♥"], ["7", "♣"]], DEALER_CARDS = [["10", "♦"], ["6", "♠"], ["6", "♥"]];
const slot = (hand, i) => ({ x: hand.x + (i - 1) * 17, z: hand.z - (i - 1) * 1.5 });
/** A card dealt from the shoe during [t0, t1] (slides + flips), or already in place. */
function dealt(t, t0, t1, to, faceUp = true) {
  const u = ease(clamp01((t - t0) / (t1 - t0))), x = lerp(SHOE.x, to.x, u), z = lerp(SHOE.z + 6, to.z, u), lift = Math.sin(Math.PI * u) * 5 + (1 - u) * 6;
  return { x, z, lift, up: faceUp ? sm(u, 0.35, 0.95) : 0, a: sm(t, t0 - 0.12, t0 + 0.04), u };
}
// card events of the two passes: [t0, t1] slide windows
export const HOOK_DEAL = { hero: [[-9, -8], [-9, -8], HOOK.heroCard], dealer: [[-9, -8], [-9, -8], HOOK.dealerCard] };
const REP = REW.deal; const step = (REP[1] - REP[0] - 0.3) / 3;
export const REP_DEAL = { hero: [[REP[0], REP[0] + 0.3], [REP[0] + 2 * step, REP[0] + 2 * step + 0.3], REW.hit], dealer: [[REP[0] + step, REP[0] + step + 0.3], [REP[0] + 3 * step, REP[0] + 3 * step + 0.3]] };
/** Rewind factor 0..1: everything of pass 1 flies back to the shoe. */
const rewU = (t) => ease(clamp01((t - REW.t0) / (REW.t1 - REW.t0)));
const BET_N = 6, chipToRack = (u) => ({ x: lerp(BET.x, RACK.x + 10, u), z: lerp(BET.z, RACK.z + 4, u), y: BT + 0.6 + Math.sin(Math.PI * u) * 6 });
function bjCards(c, V, t) {
  const out = { hero: null, dealer: null };
  const pass1 = t < REW.t1, ru = rewU(t), cleared = 1 - sm(t, REW.out, REW.out + 0.5);
  if (cleared <= 0) return out;
  const draw = (hand, cards, wins, faceUp, which) => {
    let ctr = null;
    cards.forEach(([rk, su], i) => {
      if (!wins[i]) return; const d = dealt(t, wins[i][0], wins[i][1], slot(hand, i), faceUp(i));
      let { x, z, lift, up, a } = d;
      if (pass1 && ru > 0) { x = lerp(x, SHOE.x, ru); z = lerp(z, SHOE.z + 6, ru); lift += Math.sin(Math.PI * ru) * 8; up = up * (1 - sm(ru, 0.2, 0.7)); a *= 1 - sm(ru, 0.75, 1); }
      a *= cleared; if (t < wins[i][0] - 0.12) return;
      const busted = which === "hero" ? (pass1 ? sm(t, HOOK.bustHero, HOOK.bustHero + 0.3) : sm(t, REW.bust, REW.bust + 0.3)) : pass1 ? sm(t, HOOK.bustDealer, HOOK.bustDealer + 0.3) : 0;
      const wait = !pass1 && which === "dealer" ? win(t, REW.wait[0], REW.wait[1], 0.3, 0.3) * (0.6 + 0.4 * Math.sin(t * 7)) : 0;
      const r = Gm.bigCard(c, V, x, BT + 0.8, z, rk, su, { up, lift, a, rot: (i - 1) * 0.06, red: busted * (1 - ru), glow: wait, glowCol: UI.Y });
      if (r && i === 1) ctr = r;
    });
    return ctr;
  };
  if (pass1) {
    out.hero = draw(HAND_H, HERO_CARDS, HOOK_DEAL.hero.map((w) => (w[0] < -5 ? [-9, -8] : w)), () => true, "hero");
    out.dealer = draw(HAND_D, DEALER_CARDS, HOOK_DEAL.dealer.map((w) => (w[0] < -5 ? [-9, -8] : w)), () => true, "dealer");
  } else {
    out.hero = draw(HAND_H, HERO_CARDS, REP_DEAL.hero, () => true, "hero");
    out.dealer = draw(HAND_D, DEALER_CARDS.slice(0, 2), REP_DEAL.dealer, () => false, "dealer");
  }
  return out;
}
function bjChips(c, V, t) {
  const cleared = 1 - sm(t, REW.out, REW.out + 0.5); if (cleared <= 0) return;
  const pass1 = t < REW.t1;
  let u;
  if (pass1) { u = ease(clamp01((t - HOOK.chips[0]) / (HOOK.chips[1] - HOOK.chips[0]))); u = u * (1 - rewU(t)); }
  else u = ease(clamp01((t - REW.chips[0]) / (REW.chips[1] - REW.chips[0])));
  const p = chipToRack(u), a = (1 - sm(u, 0.85, 1)) * cleared;
  if (a > 0) chipStack(c, V, p.x, p.y, p.z, BET_N, CHIP_RAMPS.red, { r: 5.6, h: 1.6, a, glow: pass1 ? 0 : win(t, REW.chips[0] - 0.4, REW.chips[0] + 0.1, 0.2, 0.2) });
  // a second, ghosted stack where the bet was (the empty spot glints after the chips go)
}
// payout stacks next to the signs (from «Some tables…» on)
const STACK3 = { x: SIGN2.x, z: SIGN2.z + 50 }, STACK6 = { x: SIGN.x, z: SIGN.z + 50 };
function payStacks(c, V, t) {
  const A = 1 - sm(t, SIGNB.out, SIGNB.out + 0.5); if (A <= 0 || t < SIGNB.other - 0.2) return;
  // 3 TO 2: grows to 15 with its sign
  const n3 = 15 * ease(clamp01((t - SIGNB.other - 0.25) / 0.5)), n6grow = 15 * ease(clamp01((t - SIGNB.payGrow[0]) / (SIGNB.payGrow[1] - SIGNB.payGrow[0]))), cut = clamp01((t - SIGNB.payCut[0]) / (SIGNB.payCut[1] - SIGNB.payCut[0]));
  const glowShort = win(t, SIGNB.glow, SIGNB.out, 0.25, 0.4), ghostK = win(t, SIGNB.payCut[1] - 0.1, SIGNB.out, 0.3, 0.4);
  const st = { r: 6.2, h: 1.55 };
  if (n3 > 0.05) chipStack(c, V, STACK3.x, BT + 0.6, STACK3.z, Math.ceil(n3), CHIP_RAMPS.green, { ...st, a: A });
  if (n6grow > 0.05) { const keep = 15 - 3 * sm(cut, 0, 1), full = Math.floor(keep), part = keep - full;
    chipStack(c, V, STACK6.x, BT + 0.6, STACK6.z, Math.min(Math.ceil(n6grow), full), CHIP_RAMPS.green, { ...st, a: A, glow: glowShort });
    // the chips that leave: dissolve upward one by one
    if (ghostK > 0) chipStack(c, V, STACK6.x, BT + 0.6 + 12 * st.h, STACK6.z, 3, CHIP_RAMPS.red, { ...st, a: A * ghostK * (0.35 + 0.15 * Math.sin(t * 6)) });
    if (n6grow >= 14.9 && cut > 0 && cut < 1) for (let k = full; k < 15; k++) { const kk = clamp01((15 - k) - 3 * cut), lift = (1 - kk) * 10; if (kk > 0) chipStack(c, V, STACK6.x, BT + 0.6 + k * st.h + lift, STACK6.z, 1, CHIP_RAMPS.green, { ...st, a: A * kk }); } void part; }
  // a blackjack (A + K) in front of each stack: «same game»
  const hA = sm(t, SIGNB.hands - 0.1, SIGNB.hands + 0.3) * A;
  if (hA > 0) for (const s of [STACK3, STACK6]) { const u = ease(clamp01((t - SIGNB.hands + 0.1) / 0.45)); Gm.bigCard(c, V, s.x - 8, BT + 0.8, lerp(s.z + 34, s.z + 22, u), "A", "♠", { a: hA, rot: -0.08 }); Gm.bigCard(c, V, s.x + 8, BT + 1, lerp(s.z + 34, s.z + 22, u), "K", "♥", { a: hA, rot: 0.08 }); }
}

// ---------------------------------------------------------------- the people
function heroPose(t, G, V) {
  const x = heroX(t), spd = Math.abs(speedOf(HERO_X, t));
  let p = idlePose(t, 3, { near: [13, -46], far: [6, -37] });
  if (spd > 4) { const w = walkPose(x + 1000, clamp01(spd / 90)); p = { ...p, ph: w.ph, amp: w.amp, bob: w.bob, near: w.near, far: w.far }; }
  const reach = (pt, k) => { if (k <= 0 || !pt) return; const [sx, sy] = V.P(pt[0], pt[1], pt[2]), tg = V.toRig(G, sx, sy); p.near = [lerp(p.near[0], tg[0], k), lerp(p.near[1], tg[1], k)]; };
  // hook: watching the cards, shock at BUST, sad as the chips go
  { const k = win(t, HOOK.bustHero - 0.1, REW.t0, 0.3, 0.4); if (k > 0) { p.brows = 1.6 * k; p.headTilt = lerp(p.headTilt, 0.08, k); } }
  { const k = win(t, HOOK.chips[0] - 0.1, HOOK.chips[1], 0.2, 0.3); reach([BET.x, BT + 4, BET.z], 0.7 * k); }
  // replay: a tap on the felt for one more card, then the same sad face
  { const k = win(t, REW.hit[0] - 0.35, REW.hit[0] + 0.15, 0.25, 0.3); reach([HAND_H.x + 22, BT + 2, HAND_H.z + 10], k); if (k > 0) p.press = sm(t, REW.hit[0] - 0.12, REW.hit[0]) * (1 - sm(t, REW.hit[0] + 0.05, REW.hit[0] + 0.15)); }
  { const k = win(t, REW.bust - 0.05, REW.out, 0.3, 0.4); if (k > 0) { p.brows = 1.6 * k; p.headTilt = lerp(p.headTilt, 0.1, k); } }
  // roulette: a push of chips to BLACK
  { const k = win(t, RUSH[3].t0 - 0.25, RUSH[3].t0 + 0.5, 0.25, 0.35); if (k > 0) { const u = ease(clamp01((t - RUSH[3].t0) / 0.55)); reach(rushPos(RUSH[3], Math.min(u, 0.22)), k); } }
  // dice: lift the fist, shake hard, throw, proud
  { const k = win(t, DICE.lift, DICE.throw + 0.05, 0.3, 0.12); if (k > 0) { const sh = win(t, DICE.shake[0], DICE.shake[1], 0.15, 0.1), w = Math.sin(t * 2 * Math.PI * 6.5); p.near = [lerp(p.near[0], 15 + 5 * w * sh, k), lerp(p.near[1], -88 + 7 * Math.cos(t * 2 * Math.PI * 6.5) * sh, k)]; p.mouth = Math.max(p.mouth || 0, sh * 0.8); p.brows = -0.8 * sh; p.lean = -0.04 * k; } }
  { const k = win(t, DICE.throw, DICE.throw + 0.45, 0.06, 0.3); if (k > 0) p.near = [lerp(p.near[0], 30, k), lerp(p.near[1], -64, k)]; }
  { const k = win(t, DICE.proud[0], DICE.proud[1], 0.3, 0.4); if (k > 0) p = { ...cheerPose(t * 0.7, p, 0.75 * k, 2), mouth: k }; }
  return p;
}
// roulette bettors: four pushes of chips to BLACK
const BLACK_LOCAL = [48, 51];
export const RUSH = [
  { gx: RT.x + 102, gz: RT.z + 28, mirror: true, look: "suit", ramp: CHIP_RAMPS.blue, n: 5, t0: EV.people + 0.05 },
  { gx: RT.x + 104, gz: RT.z - 62, mirror: true, look: "dress", ramp: CHIP_RAMPS.purple, n: 4, t0: EV.rush - 0.1 },
  { gx: RT.x - 100, gz: RT.z - 40, mirror: false, look: "mustard", ramp: CHIP_RAMPS.yellow, n: 4, t0: EV.rush + 0.25 },
  { gx: null, gz: null, mirror: false, look: "hero", ramp: CHIP_RAMPS.red, n: 6, t0: EV.bet - 0.05 },
];
function rushPos(r, u) { const [bx, bz] = [RT.x + BLACK_LOCAL[0], RT.z + BLACK_LOCAL[1]], i = RUSH.indexOf(r), dx = [-3, 3, -2, 2][i], dz = [-4, -1, 2, 5][i];
  const sx = r.gx === null ? RT.x - 58 : r.gx + (r.mirror ? -42 : 42), sz = r.gx === null ? RT.z + 56 : r.gz - 6;
  return [lerp(sx, bx + dx, u), TOP + 0.6 + Math.sin(Math.PI * u) * 3, lerp(sz, bz + dz, u)]; }
function rushChips(c, V, t) {
  for (const r of RUSH) { if (t < r.t0 - 0.3) continue; const u = ease(clamp01((t - r.t0) / 0.55)), [x, y, z] = rushPos(r, u), a = sm(t, r.t0 - 0.3, r.t0) * (1 - sm(t, ROUL.out + 2, ROUL.out + 2.5));
    chipStack(c, V, x, y, z, r.n, r.ramp, { a, r: 4.2, h: 1.2, glow: win(t, r.t0 + 0.5, r.t0 + 1.2, 0.1, 0.4) }); }
}
function rushGuest(c, V, t, r, i) {
  let p = idlePose(t, 20 + i, { near: [14, -46], far: [6, -38] });
  const G0 = V.bill(r.gx, r.gz, 1.75, 0.86, r.mirror);
  { const k = win(t, r.t0 - 0.3, r.t0 + 0.75, 0.3, 0.4); if (k > 0) { const u = ease(clamp01((t - r.t0) / 0.55)), [x, y, z] = rushPos(r, Math.min(u, 0.45)), [sx, sy] = V.P(x, y + 2, z), tg = V.toRig(G0, sx, sy); p.near = [lerp(p.near[0], tg[0], k), lerp(p.near[1], tg[1], k)]; p.lean = 0.06 * k; p.mouth = k * 0.6; } }
  { const k = win(t, ROUL.reds[0], ROUL.rush[0] + 0.2, 0.3, 0.3); if (k > 0) p.headTilt = lerp(p.headTilt, -0.1, k); }
  drawPerson(c, V, r.gx, r.gz, t, p, LOOKS[r.look], { mirror: r.mirror });
}

// ---------------------------------------------------------------- dice: flight, roll, rest (pure functions of t)
const HIT = { x: CR.x - 28, y: Gm.CR_FELT + 12, z: CR.z - CR.hd + 20 };
export const DICE_END = [{ x: DIE_POS.x, z: DIE_POS.z, ang: [0.3, 0, 0] }, { x: CR.x - 36, z: CR.z + 22, ang: [-0.35, Math.PI / 2, 0] }];
const LAND = DICE.land + 1.75; // the dice roll to a stop on «feel»
export const DICE_T = { throw: DICE.throw, hit: DICE.hit, land: LAND };
function diceState(t, i, hand) {
  const d = DICE_END[i], S = hand ?? { x: CR.x - 108, y: 150, z: CR.z + 84 }, off = i ? 5 : 0;
  if (t < DICE.throw) return null;
  const spin = (u) => 1 - Math.pow(1 - u, 2.2);
  let x, y, z, k;
  if (t < DICE.hit) { const u = (t - DICE.throw) / (DICE.hit - DICE.throw); x = lerp(S.x + off, HIT.x - off * 2, u); z = lerp(S.z, HIT.z + off, u); y = lerp(S.y, HIT.y, u) + Math.sin(Math.PI * u) * 34; k = u * 0.25; }
  else { const u = clamp01((t - DICE.hit) / (LAND - DICE.hit)), e = 1 - Math.pow(1 - u, 2.6); x = lerp(HIT.x - off * 2, d.x, e); z = lerp(HIT.z + off, d.z, e); y = Gm.CR_FELT + (u < 0.02 ? lerp(HIT.y - Gm.CR_FELT, 0, u / 0.02) : 0) + 9 * Math.abs(Math.sin(Math.PI * 3.5 * Math.min(1, u * 1.15))) * Math.pow(1 - Math.min(1, u * 1.15), 2); k = 0.25 + 0.75 * spin(u); }
  const r = 1 - clamp01(k); const ang = [d.ang[0] + r * Math.PI * 4 * (i ? -1 : 1), d.ang[1] + r * Math.PI * 6, d.ang[2] + r * Math.PI * 4 * (i ? 1 : -1)];
  return { x, y, z, ang, rolling: t < LAND };
}
const DIE_S = 6.4; // larger than life so it reads on a phone
function macroAng(t) { const y = lerp(0.3, -0.85, ease(clamp01((t - DICE.glass) / (DICE.serial + 0.2 - DICE.glass)))); return [y, 0, 0]; }

export const SPIN = { t0: ROUL.spin0, tDrop: ROUL.spin0 + 1.3, tLand: ROUL.spin0 + 2.6, from: 34, to: 17, turns: 5 };
// ---------------------------------------------------------------- the world
export function drawWorld(c, t) {
  const camK = camAt(CAM, t), V = makeView(camK), items = [];
  V.marks = {};
  // ---- blackjack
  const dAside = -62 * ease(clamp01((t - REW.out + 0.2) / 0.9)), dX = BJ.x + dAside;
  items.push({ x: dX, z: BJ.z - 92, draw: () => {
    const take = Math.max(win(t, HOOK.chips[0] + 0.2, HOOK.chips[1] + 0.4, 0.25, 0.4) * (1 - rewU(t)), win(t, REW.chips[0] + 0.2, REW.chips[1] + 0.3, 0.25, 0.4));
    const dealHand = (() => { const ws = [...HOOK_DEAL.dealer, ...HOOK_DEAL.hero, ...REP_DEAL.dealer, ...REP_DEAL.hero].filter((w) => w[0] > -1); let k = 0; for (const w of ws) k = Math.max(k, win(t, w[0] - 0.25, w[0] + 0.12, 0.2, 0.25)); return k; })();
    const R0 = [dX - 28, BT + 2, BJ.z - 58], R1 = [lerp(dX + 28, SHOE.x - 6, dealHand), BT + 2 + 6 * dealHand, lerp(BJ.z - 58, SHOE.z, dealHand)];
    const R0t = [lerp(R0[0], RACK.x + 6, take), R0[1], lerp(R0[2], RACK.z + 6, take)];
    V.marks.bjDealer = drawDealer(c, V, dX, BJ.z - 92 + 3 * Math.abs(Math.sin(Math.PI * 3 * clamp01((t - REW.out + 0.2) / 0.9))) * 0, t, { hands: [R0t, R1], smile: 0.4 + 0.5 * win(t, HOOK.edge - 0.2, REW.t0, 0.3, 0.3) + 0.4 * win(t, REW.chips[0], REW.out, 0.3, 0.3) });
  } });
  items.push({ z: BJ.z, draw: () => Gm.bjTable(c, V, BJ, { rack: win(t, HOOK.edge - 0.15, REW.t0, 0.25, 0.3) + win(t, REW.chips[1] - 0.2, REW.out, 0.2, 0.4), rackGrow: sm(t, HOOK.chips[1] - 0.2, HOOK.chips[1] + 0.2) * (1 - rewU(t)) + sm(t, REW.chips[1] - 0.2, REW.chips[1] + 0.2),
    onFelt: (cc, VV) => {
      // the signs: this table's 6 TO 5, then «some tables'» 3 TO 2 rising beside it
      const lookK = win(t, SIGNB.look, SIGNB.out, 0.3, 0.5);
      V.marks.sign6 = Gm.placard(cc, VV, SIGN.x, SIGN.z, [{ text: "BLACKJACK" }, { text: "PAYS" }, { text: "6 TO 5", col: "#FF7A7A", s: 3 }], { w: 17, h: 18, glow: win(t, SIGNB.payGrow[0], SIGNB.payCut[1] + 0.3, 0.2, 0.4) * 0.8 + 0.4 * lookK * win(t, SIGNB.look, SIGNB.look + 1.2, 0.2, 0.5), glowCol: "#FF6060" });
      const r2 = ease(clamp01((t - SIGNB.other) / 0.45)) * (1 - sm(t, SIGNB.out, SIGNB.out + 0.5));
      if (r2 > 0) V.marks.sign3 = Gm.placard(cc, VV, SIGN2.x, SIGN2.z, [{ text: "BLACKJACK" }, { text: "PAYS" }, { text: "3 TO 2", col: "#8AF0A0", s: 3 }], { w: 17, h: 18, rise: r2, a: sm(r2, 0, 0.3), glow: win(t, SIGNB.other + 0.3, SIGNB.other + 1.3, 0.2, 0.5) * 0.7, glowCol: "#80FF90" });
      payStacks(cc, VV, t);
      bjChips(cc, VV, t);
      const h = bjCards(cc, VV, t); V.marks.handH = h.hero; V.marks.handD = h.dealer;
      V.marks.betTop = P2(VV, BET.x, BT + 16, BET.z);
    } }) });
  // a quiet player at the far seat
  items.push({ x: BJ.x + 124, z: BJ.z + 52, draw: () => drawPerson(c, V, BJ.x + 124, BJ.z + 52, t, { ...idlePose(t, 41), near: [14, -45] }, LOOKS.navy, { mirror: true }) });
  // ---- roulette
  const wheelAng = (tt) => 1.15 * tt, spin = SPIN;
  items.push({ x: RT.x, z: RT.z - 200, draw: () => drawDealer(c, V, RT.x, RT.z - 205, t, { hands: [[RT.x - 30, TOP + 2, RT.z - 168], [RT.x + 30, TOP + 2 + 10 * win(t, spin.t0 - 0.4, spin.t0 + 0.2, 0.2, 0.3), RT.z - 160 + 40 * win(t, spin.t0 - 0.4, spin.t0 + 0.2, 0.2, 0.3)]], smile: 0.5 }) });
  items.push({ x: RT.x, z: RT.z, draw: () => {
    drawRouletteTable(c, V, RT, { wheel: { ang: wheelAng(t), ball: ballState(t, spin, wheelAng) }, chips: [{ n: 7, count: 3, ramp: CHIP_RAMPS.blue }, { n: 23, count: 2 }], cells: {} });
    rushChips(c, V, t);
    const [bx, bz] = [RT.x + BLACK_LOCAL[0], RT.z + BLACK_LOCAL[1]]; V.marks.black = P2(V, bx, TOP, bz);
  } });
  items.push({ x: BOARD.x, z: BOARD.z, draw: () => {
    const lit = [0, 1, 2, 3, 4].map((i) => sm(t, ROUL.reds[0] + i * 0.13, ROUL.reds[0] + i * 0.13 + 0.15) * (1 - sm(t, ROUL.dim[0], ROUL.dim[1]))).concat([0, 0, 0]);
    V.marks.board = Gm.lastBoard(c, V, BOARD, { on: 1, lit, dim: sm(t, ROUL.dim[0], ROUL.dim[1]), t, pulse: win(t, ROUL.board, ROUL.board + 1.2, 0.2, 0.5) });
  } });
  RUSH.slice(0, 3).forEach((r, i) => items.push({ x: r.gx, z: r.gz, draw: () => rushGuest(c, V, t, r, i) }));
  // ---- dice table: dealers on the far side, the dice
  const dStep = ease(clamp01((t - PALMS.step[0]) / (PALMS.step[1] - PALMS.step[0])));
  for (const [dx, seed] of [[60, 51], [-190, 53]]) items.push({ x: CR.x + dx, z: CR.z - CR.hd - 30, draw: () => drawDealer(c, V, CR.x + dx, CR.z - CR.hd - 30, t + seed, { hands: [[CR.x + dx - 26, Gm.CR_RAIL + 1, CR.z - CR.hd - 4], [CR.x + dx + 26, Gm.CR_RAIL + 1, CR.z - CR.hd - 4]], smile: 0.5 }) });
  items.push({ x: DEALER_CR.x, z: DEALER_CR.z - 1, draw: () => drawPalmDealer(c, V, t, dStep) });
  items.push({ z: CR.z, draw: () => Gm.crapsTable(c, V, CR, { onFelt: (cc, VV) => drawDice(cc, VV, t) }) });
  // a guest at the far end of the dice table
  items.push({ x: CR.x + CR.hw + 40, z: CR.z + 20, draw: () => drawPerson(c, V, CR.x + CR.hw + 40, CR.z + 20, t, { ...idlePose(t, 61), near: [14, -48] }, LOOKS.sweater, { mirror: true }) });
  // ---- the hero
  const hx = heroX(t), hz = heroZ(t);
  items.push({ x: hx, z: hz, draw: () => {
    const G = V.bill(hx, hz, 1.75, 0.86, false), p = heroPose(t, G, V);
    drawPerson(c, V, hx, hz, t, p, LOOKS.hero);
    V.hand = [G.X(p.near[0]), G.Y(p.near[1] + (p.bob || 0))]; V.head = [G.X(3), G.Y(-100 + (p.bob || 0))]; V.heroG = G;
    // dice in the fist while shaking
    const da = win(t, DICE.lift - 0.1, DICE.throw, 0.25, 0.05); if (da > 0) { const s = G.z / 1.75; for (let i = 0; i < 2; i++) miniDie(c, V.hand[0] + (i ? 7 : -1) * s, V.hand[1] - (i ? 5 : 8) * s, 6 * s, t * 9 + i, da); }
  } });
  drawCasino(c, V, t, { skip: ["r-right", "c-front-l", "c-front-r", "hero"], items, rope: false, walkerMaxZ: 0,
    back: (cc, VV, tt) => Gm.ceilingPass(cc, VV, tt, { lights: 0.55 + 0.45 * sm(t, DOMES.lights, DOMES.all + 0.6), look: [DIE_POS.x, Gm.CR_FELT, DIE_POS.z], lookK: win(t, DOMES.dice[0], END + 1, 0.5, 0.1) }) });
  return V;
}
function miniDie(c, x, y, s, ph, a) { const g = fade(c, a), r = Math.max(2, R(s / 2)), X = R(x), Y = R(y);
  g.rect(X - r - 1, Y - r - 1, 2 * r + 2, 2 * r + 2, O); g.rect(X - r, Y - r, 2 * r, 2 * r, "#C41628"); g.rect(X - r, Y - r, 2 * r, 1, "#FF7A80"); g.rect(X - r, Y - r, 1, 2 * r, "#E04050");
  const n = 1 + (Math.floor(ph) % 6); if (r >= 3) { g.px(X, Y, "#FFF4F0"); if (n > 1) { g.px(X - r + 1, Y - r + 1, "#FFF4F0"); g.px(X + r - 2, Y + r - 2, "#FFF4F0"); } } }
function drawDice(c, V, t) {
  const hand = null;
  // in the macro the die stays where it stopped and turns slowly (yaw only)
  const macro = t > DICE.macro - 0.4;
  for (let i = 1; i >= 0; i--) {
    const s = diceState(t, i, hand); if (!s) continue;
    let { x, y, z, ang } = s;
    if (i === 0 && macro) ang = macroAng(t);
    const eyes = i === 0 ? win(t, LAND - 0.1, DICE.macro + 0.15, 0.4, 0.4) : 0, blink = i === 0 ? win(t, LAND + 0.55, LAND + 0.8, 0.1, 0.12) : 0;
    const glint = i === 0 ? (t > DICE.edges[0] && t < DICE.edges[1] + 0.4 ? clamp01((t - DICE.edges[0]) / (DICE.edges[1] + 0.4 - DICE.edges[0])) : -1) : -1;
    const r = Gm.die3D(c, V, x, y, z, DIE_S, ang, { eyes, blink, glint, serial: 1, glass: i === 0 ? sm(t, DICE.glass, DICE.glass + 0.4) : 0 });
    if (i === 0) V.die = r;
  }
  // the fake die: opaque, rounded, no number — it slides in and is turned away
  const k = win(t, DICE.swap[0], DICE.swap[1], 0.45, 0.4); if (k > 0) { const u = ease(clamp01((t - DICE.swap[0]) / 0.5)), back = sm(t, DICE.swap[1] - 0.45, DICE.swap[1] + 0.3);
    const gx = DIE_POS.x + lerp(22, 8.6, u) + 16 * back; Gm.die3D(c, V, gx, Gm.CR_FELT, DIE_POS.z + 2, DIE_S, [0.2, 0, 0], { ghost: true, a: k }); V.ghost = P2(V, gx, Gm.CR_FELT + DIE_S / 2, DIE_POS.z + 2); V.ghostK = k; }
}
// the dice-table dealer who shows his open palms
function drawPalmDealer(c, V, t, step) {
  const z = DEALER_CR.z - 22 * step, x = DEALER_CR.x;
  const up = ease(clamp01((t - PALMS.up[0]) / (PALMS.up[1] - PALMS.up[0]))) * (1 - ease(clamp01((t - PALMS.down[0]) / (PALMS.down[1] - PALMS.down[0]))));
  const hy = lerp(Gm.CR_RAIL + 1, 128, up), hz = lerp(CR.z - CR.hd - 4, z + 18, Math.max(step, up)), spread = lerp(26, 30, up);
  const G = drawDealer(c, V, x, z, t, { hands: [[x - spread, hy, hz], [x + spread, hy, hz]], smile: 0.45 + 0.3 * up });
  if (up > 0.05) {
    // big palms over the little rig hands: palm → back → palm on «hands … cameras»
    const fl = clamp01((t - PALMS.flip[0]) / (PALMS.flip[1] - PALMS.flip[0])), turn = Math.cos(Math.PI * 2 * fl), side = turn >= 0 ? 1 : -1;
    for (const [s, hx] of [[-1, x - spread], [1, x + spread]]) { const [sx, sy, k] = V.P(hx, hy, hz); Gm.palm(c, sx, sy + 3 * k, k * 0.95, side, sm(up, 0.05, 0.4), { squeeze: turn, mirror: s > 0 }); }
    V.palmsAt = P2(V, x, hy + 12, hz);
  }
  return G;
}

// ---------------------------------------------------------------- overlays (screen space)
function sparkle(c, x, y, u, a, r0 = 8) { const g = fade(c, a); for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + u * 2, r = r0 + 16 * clamp01(u * 2); g.rect(R(x + Math.cos(an) * r) - 1, R(y + Math.sin(an) * r * 0.8) - 1, 2, 2, i % 2 ? "#FFFFFF" : UI.Y); } }
const popIn = (t, t0, d = 0.22) => { const u = clamp01((t - t0) / d); return { a: sm(u, 0, 0.6), s: 1 + 0.6 * (1 - ease(u)) }; };
function panelBox(c, x, y, w, h, a, edge = RAMP.gold) { const g = fade(c, a); g.rrect(x + 2, y + 3, w, h, "#05030A", 5); g.rrect(x, y, w, h, edge[2], 5); g.rrect(x + 2, y + 2, w - 4, h - 4, edge[5], 4); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 3); }

// 1. hand totals, BUST over both, YOU LOSE
function bjSigns(c, V, t) {
  const pass1 = t < REW.t1, ru = rewU(t), out = 1 - sm(t, REW.out, REW.out + 0.4); if (out <= 0) return;
  const H = V.marks.handH, D = V.marks.handD;
  const heroDone = pass1 ? HOOK.heroCard[1] : REW.hit[1], dealerDone = pass1 ? HOOK.dealerCard[1] : 1e9;
  const fadeP1 = pass1 ? 1 - sm(ru, 0, 0.4) : 1;
  if (H) { const k = sm(t, heroDone, heroDone + 0.25) * fadeP1 * out; Gm.badge(c, "22", Math.min(H.cx + 76, 424), H.cy - 40, k, "#FF8A8A"); }
  if (D && pass1) { const k = sm(t, dealerDone, dealerDone + 0.25) * fadeP1 * out; Gm.badge(c, "22", Math.min(D.cx + 76, 424), D.cy - 36, k, "#FF8A8A"); }
  const bH = pass1 ? HOOK.bustHero : REW.bust;
  if (H && t > bH) { const p = popIn(t, bH); Gm.stamp(c, "BUST", H.cx, H.cy - 40, 3, "#FFFFFF", p.a * fadeP1 * out, -0.12, { fill: "#D8202E", clean: true }); }
  if (D && pass1 && t > HOOK.bustDealer) { const p = popIn(t, HOOK.bustDealer); Gm.stamp(c, "BUST", D.cx, D.cy - 36, 3, "#FFFFFF", p.a * fadeP1 * out, 0.1, { fill: "#D8202E", clean: true }); }
  if (pass1 && t > HOOK.stamp) { const p = popIn(t, HOOK.stamp, 0.25), sc = p.s > 1.3 ? 6 : p.s > 1.1 ? 5 : 4; Gm.stamp(c, "YOU LOSE", 262, 374, sc, "#FFF6E8", p.a * fadeP1, -0.08, { fill: "#C81828", clean: true }); if (t < HOOK.stamp + 0.8) sparkle(c, 262, 374, (t - HOOK.stamp) / 0.8, 1 - (t - HOOK.stamp) / 0.8, 60); }
}
// 2. rewind icon + the order panel 1 YOU → 2 DEALER
function orderPanel(c, V, t) {
  const rw = win(t, REW.t0 - 0.05, REW.t1 + 0.1, 0.12, 0.2);
  if (rw > 0) { const g = fade(c, rw), x = 70, y = 176; g.rrect(x - 4, y - 4, 64, 40, "#05030A", 5); g.rrect(x - 6, y - 6, 64, 40, "#160E22", 5); for (const dx of [0, 24]) { g.poly([[x + dx + 22, y], [x + dx + 22, y + 28], [x + dx, y + 14]], UI.W); } }
  const a = win(t, REW.order, REW.out, 0.3, 0.4); if (a <= 0) return;
  const s = 3, x = 92, y = 166, w = 356, h = 60, drop = R((1 - ease(clamp01((t - REW.order) / 0.35))) * -12);
  panelBox(c, x, y + drop, w, h, a);
  const g = fade(c, a), t1 = "1 YOU", t2 = "2 DEALER", w1 = c.measure(MAIN, t1, { scale: s }), w2 = c.measure(MAIN, t2, { scale: s }), ar = c.measure(MAIN, "→", { scale: s });
  const tot = w1 + 14 + ar + 14 + w2, x0 = R(x + (w - tot) / 2), yy = y + drop + 19;
  const youHi = win(t, REW.deal[0], REW.chips[1], 0.2, 0.4), dealerDim = win(t, REW.wait[0], REW.out, 0.3, 0.4);
  g.text(MAIN, t1, x0 + 1, yy + 1, "#000000", { scale: s }); g.text(MAIN, t1, x0, yy, mix(UI.W, UI.Y, youHi), { scale: s });
  g.text(MAIN, "→", x0 + w1 + 14, yy, UI.L, { scale: s });
  const dc = mix(UI.W, "#6A5A80", 0.7 * dealerDim * (0.6 + 0.4 * Math.sin(t * 6)));
  g.text(MAIN, t2, x0 + w1 + 28 + ar + 1, yy + 1, "#000000", { scale: s }); g.text(MAIN, t2, x0 + w1 + 28 + ar, yy, dc, { scale: s });
  if (youHi > 0) { const ux = x0 + w1 / 2; fade(c, a * youHi).rect(R(ux - w1 / 2), yy + 24, R(w1), 2, UI.Y); }
}
// 3. the sign beat: a gap marker between the tall and the short stack
function stackGap(c, V, t) {
  const a = win(t, SIGNB.glow, SIGNB.out, 0.3, 0.4); if (a <= 0) return;
  const [x3, y3] = P2(V, STACK3.x, BT + 0.6 + 15 * 1.55, STACK3.z), [x6, y6] = P2(V, STACK6.x, BT + 0.6 + 12 * 1.55, STACK6.z), [, y6b] = P2(V, STACK6.x, BT + 0.6 + 15 * 1.55, STACK6.z);
  const g = fade(c, a), u = ease(clamp01((t - SIGNB.glow) / 0.5));
  g.line(R(x3 + 30), R(y3), R(lerp(x3 + 30, x6 + 36, u)), R(y6b), UI.Y, [4, 3]);
}
// 4. roulette: BLACK label, NO MEMORY plate
function roulSigns(c, V, t) {
  const bk = win(t, ROUL.rush[0], ROUL.dim[1] + 0.3, 0.3, 0.4); if (bk > 0 && V.marks.black) { const [bx, by] = V.marks.black; Gm.plate(c, "BLACK", clampX(bx - 20, 0, 90, 360), by - 56, 3, bk, UI.W, RAMP.chrome); }
  const nm = win(t, ROUL.plate, ROUL.out, 0.25, 0.4); if (nm > 0 && V.marks.board) { const p = popIn(t, ROUL.plate, 0.25), b = V.marks.board; Gm.plate(c, "NO MEMORY", clampX(b.x + b.w / 2, 0, 140, 330) + 60, R(b.y + b.h * 0.45), 3, nm * p.a, UI.W); }
}
// 5. dice: motion lines, BIG NUMBER!, swap cross
function diceSigns(c, V, t) {
  const sh = win(t, DICE.shake[0], DICE.shake[1], 0.15, 0.1);
  if (sh > 0 && V.hand) { const g = fade(c, sh), [hx, hy] = V.hand; for (let i = 0; i < 5; i++) { const an = -1.2 + i * 0.6 + 0.15 * Math.sin(t * 40 + i), r0 = 26 + 5 * Math.sin(t * 33 + i * 2), r1 = r0 + 18; for (const sd of [-1, 1]) for (const w of [0, 1]) g.line(R(hx + sd * Math.cos(an) * r0) + w, R(hy + Math.sin(an) * r0 * 0.8), R(hx + sd * Math.cos(an) * r1) + w, R(hy + Math.sin(an) * r1 * 0.8), w ? "#F4CA50" : "#FFF6DA"); } }
  const bb = win(t, DICE.bubble[0], DICE.bubble[1], 0.18, 0.35); if (bb > 0 && V.hand) { const p = popIn(t, DICE.bubble[0], 0.2), [hx, hy] = V.hand; Gm.bubble(c, "BIG NUMBER!", 296, 252, 3, bb * p.a, hx + 10, hy - 14); }
  const sw = V.ghostK ?? 0, crossK = win(t, DICE.swap[0] + 0.45, DICE.swap[1], 0.2, 0.35); if (sw > 0 && crossK > 0 && V.ghost) { const [gx, gy] = V.ghost, g = fade(c, crossK), r = 54; for (let w = -6; w <= 6; w++) { const col = Math.abs(w) > 4 ? O : "#FF2A3C"; g.line(R(gx - r + w), R(gy - r), R(gx + r + w), R(gy + r), col); g.line(R(gx + r + w), R(gy - r), R(gx - r + w), R(gy + r), col); } }
  // serial highlight ring
  const sk = win(t, DICE.serial, DICE.swap[0], 0.25, 0.4); if (sk > 0 && V.die) { const f = V.die.faces.find((q) => q.val === 1 && q.facing > 0); if (f) { const [p0, p1, p2, p3] = f.q, bx = lerp(lerp(p3[0], p2[0], 0.5), lerp(p0[0], p1[0], 0.5), 0.2), by = lerp(lerp(p3[1], p2[1], 0.5), lerp(p0[1], p1[1], 0.5), 0.2); fade(c, sk).ering(R(bx), R(by), 58, 20, UI.Y); fade(c, sk).ering(R(bx), R(by), 59, 21, UI.Y); } }
}
// 6. ceiling: dashed sight lines from the nearest domes toward the dice
function domeLines(c, V, t) {
  const a = win(t, DOMES.dice[0] + 0.2, END + 1, 0.4, 0.1); if (a <= 0) return;
  const list = Gm.DOME_SPOTS.filter((s) => s.screen && s.screen[2] > 14 && s.screen[0] > 40 && s.screen[0] < 500 && s.screen[1] > 260 && s.screen[1] < 640).slice(0, 5);
  for (const s of list) { const [bx, by] = s.screen, ex = 270 + (bx - 270) * 0.3, ey = 960; const u = ease(clamp01((t - DOMES.dice[0] - 0.2) / 0.6)); fade(c, a * 0.8).line(R(bx), R(by + 6), R(lerp(bx, ex, u)), R(lerp(by + 6, ey, u)), "#FF4A5A", [3, 4]); }
}

export function drawStory(c, V, t) {
  bjSigns(c, V, t); orderPanel(c, V, t); stackGap(c, V, t); roulSigns(c, V, t); diceSigns(c, V, t); domeLines(c, V, t);
}
export { END, EV };
