// «This slot machine already knows if you won»: the film's own layer over the casino kit — a row of slot machines in the same
// casino, the big hero machine (casino-slot.mjs) with its interior, the hero «you» at it, and the story overlays (the grabbed
// number, the locked result, the SHOW curtains, DUE? / NO MEMORY, the near miss, the virtual reel ribbon, $1 → 50¢, WIN!,
// −50¢, the heart, the two bars, the STOP that changes nothing). Everything is a pure function of t and the timeline.
import { MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, win, rnd, mix, fade, glow, makeView, camAt, drawCasino } from "./casino.mjs";
import { stool } from "./casino-props.mjs";
import { drawPerson, idlePose, cheerPose, walkPose, LOOKS } from "./casino-people.mjs";
import { drawSlot, reelPos, reelSpeed, STRIPS, blitSym, rollingDigits, digitValues, padlock, heart, musicNote, speaker, moneyText, moneyWidth } from "./casino-slot.mjs";
import { EV, END, SPINS, P0, RES1, RES4, PRESS1, PRESS2, PRESS4, STOP_PRESS, REACH, CUT, AWAY, DIM, GRAB, SHOW, DUE, NEAR, RIBBON, MUSIC, BET, PAY, WIN, HALF, HEART, BARS, LOCK4, CAM } from "./timeline.mjs";

export const M = { x: 0, z: 300, body: RAMP.red, seed: 1 };
const NEIGH = [{ x: -184, body: RAMP.purple, seed: 5 }, { x: -92, body: RAMP.blue, seed: 7 }, { x: 92, body: RAMP.teal, seed: 9 }, { x: 184, body: RAMP.purple, seed: 11 }];
const HERO_X = -64, HERO_Z = 334, TICK = { seed: 3, speed: 3.5, n: 6 };
const deckW = (u, f, lift = 2.4) => [M.x + u, lerp(70, 86, f) + lift * 0.83, M.z + lerp(24, 0, f) + lift * 0.55];
const SPIN_PT = deckW(-23, 0.5), STOP_PT = deckW(-10, 0.48), SLOT_PT = deckW(-33.5, 0.52, 0.4);
export const reels = (t) => [0, 1, 2].map((r) => reelPos(t, r, SPINS, P0[r]));
const speeds = (t) => [0, 1, 2].map((r) => reelSpeed(t, r, SPINS, P0[r]));

// ---------------------------------------------------------------- neighbours: idle spins on whole symbols
function idleReel(seed, r, t) {
  const per = 6 + rnd(seed) * 4, ph = rnd(seed + 7) * per, x = t + ph, cyc = Math.floor(x / per), u = x - cyc * per, dur = 1.1 + r * 0.35;
  const at = (k) => k * 24 + 2 * Math.floor(rnd(seed * 31 + k * 7 + r) * 6);
  const v = clamp01(u / dur), e = v < 1 ? 1 - Math.pow(1 - v, 3) : 1; return at(cyc) + (at(cyc + 1) - at(cyc)) * e;
}

// ---------------------------------------------------------------- the hero's pose
const press = (t, tp) => win(t, tp - 0.08, tp + 0.12, 0.08, 0.16);
function reachTo(p, G, V, pt, k, dy = 0) { if (k <= 0) return p; const [sx, sy] = V.P(pt[0], pt[1] + dy, pt[2]), tg = V.toRig(G, sx, sy); return { ...p, near: [lerp(p.near[0], tg[0], k), lerp(p.near[1], tg[1], k)] }; }
function heroX(t) {
  const out = ease(clamp01((t - AWAY.t0) / (AWAY.t1 - AWAY.t0))), back = ease(clamp01((t - AWAY.back0) / (AWAY.back1 - AWAY.back0)));
  const lean = sm(t, STOP_PRESS - 0.7, STOP_PRESS - 0.3) * (1 - sm(t, LOCK4.link + 0.4, LOCK4.link + 1));
  return HERO_X - 120 * (out - back) + 8 * lean;
}
function heroPose(t, G, V) {
  const x = heroX(t), moving = Math.abs(heroX(t + 0.02) - heroX(t - 0.02)) / 0.04;
  let p = idlePose(t, 3, { near: [12, -44], far: [6, -37] });
  if (moving > 4) { const w = walkPose(Math.abs(x - HERO_X) * 1.0 + 3, clamp01(moving / 60)); p = { ...p, ph: w.ph, amp: w.amp, bob: w.bob, far: [lerp(p.far[0], w.far[0], 0.6), w.far[1]] }; }
  // frame 0: the mitten already reaching for SPIN, hovering above it; back to rest on "Inside"
  const hov = Math.min(ease(clamp01((t - REACH.t0) / (REACH.t1 - REACH.t0))), 1 - ease(clamp01((t - REACH.back0) / (REACH.back1 - REACH.back0))));
  p = reachTo(p, G, V, SPIN_PT, hov, 9 + 1.5 * Math.sin(t * 3.2));
  // presses: SPIN (three times), STOP once
  for (const tp of [PRESS1, PRESS2, PRESS4]) { const k = win(t, tp - 0.42, tp + 0.3, 0.3, 0.4); if (k > 0) { p = reachTo(p, G, V, SPIN_PT, k, 6 * (1 - press(t, tp)) + 1.5); p.press = press(t, tp); } }
  { const k = win(t, STOP_PRESS - 0.45, LOCK4.link + 0.2, 0.3, 0.5); if (k > 0) { p = reachTo(p, G, V, STOP_PT, k, 6 * (1 - press(t, STOP_PRESS)) + 1.5); p.press = press(t, STOP_PRESS); p.lean = lerp(p.lean, 0.1, k); } }
  // the $1 coin goes into the slot
  { const k = win(t, BET.take, BET.slot + 0.15, 0.35, 0.4); if (k > 0) { const dip = sm(t, BET.drop - 0.1, BET.slot); p = reachTo(p, G, V, SLOT_PT, k, 10 - 8 * dip); } }
  // the near miss: hands to the head
  { const k = win(t, NEAR.gasp, NEAR.gaspOut, 0.25, 0.45); if (k > 0) { p.near = [lerp(p.near[0], 10, k), lerp(p.near[1], -86, k)]; p.far = [lerp(p.far[0], -5, k), lerp(p.far[1], -88, k)]; p.mouth = Math.max(p.mouth, k); p.brows = 1.6 * k; p.lean = lerp(p.lean, -0.08, k); p.headTilt = lerp(p.headTilt, -0.15, k); } }
  // the fake win: cheers; the heart: a smaller happy bounce
  { const k = win(t, WIN.t0 + 0.15, HALF.t0 + 0.3, 0.3, 0.5); if (k > 0) p = cheerPose(t, p, k, 0.3); }
  { const k = 0.55 * win(t, HEART.t0, HEART.t1, 0.3, 0.5); if (k > 0) p = cheerPose(t * 0.7, p, k, 1.1); }
  return { x, p };
}

// ---------------------------------------------------------------- the machine's top screen
function screenContent(c, s, t) {
  const w = s.x1 - s.x0, h = s.y1 - s.y0, cx = (s.x0 + s.x1) / 2, cy = (s.y0 + s.y1) / 2;
  const lockW = Math.max(win(t, GRAB.sym0, SHOW.out + 0.4, 0.4, 0.4), win(t, LOCK4.t0, LOCK4.out, 0.3, 0.4));
  const winW = win(t, WIN.t0, HALF.out, 0.12, 0.4), q = Math.max(0, 1 - lockW - winW);
  const sub = Object.create(c); sub.px = (x, y, col) => { if (x >= s.x0 && x < s.x1 && y >= s.y0 && y < s.y1) c.px(x, y, col); };
  if (q > 0) { const pulse = 0.5 + 0.5 * Math.sin(t * 5.5), sc = Math.max(1, Math.floor(h / 9)), tw = c.measure(MAIN, "?", { scale: sc }); fade(sub, q).text(MAIN, "?", R(cx - tw / 2), R(cy - 3.5 * sc), mix("#8A6A20", "#FFE27A", pulse), { scale: sc }); glow(c, cx, cy, h * 0.9, h * 0.6, "#FFD060", 0.25 * q * pulse); }
  if (lockW > 0) { const res = t < LOCK4.t0 - 0.5 ? RES1 : RES4, S = Math.min(h * 0.86, w * 0.2);
    res.forEach((idx, r) => blitSym(fade(sub, lockW), STRIPS[r][idx], s.x0 + w * (0.14 + r * 0.22), cy, S, 1));
    const closed = t < LOCK4.t0 - 0.5 ? sm(t, GRAB.lock, GRAB.lock + 0.3) : sm(t, LOCK4.t0 + 0.15, LOCK4.t0 + 0.45), ps = Math.max(1, h / 13);
    padlock(sub, R(s.x0 + w * 0.84), R(cy + ps * 0.5), ps, closed, lockW);
    if (closed > 0.5) glow(c, s.x0 + w * 0.84, cy, h * 0.7, h * 0.6, "#FFD060", 0.3 * lockW * (0.6 + 0.4 * Math.sin(t * 6))); }
  if (winW > 0) { const half = sm(t, HALF.t0, HALF.t1), sc = Math.max(1, Math.floor(h / 9)), tw = c.measure(MAIN, "WIN!", { scale: sc }), fl = 0.5 + 0.5 * Math.sin(t * 22);
    fade(sub, winW).text(MAIN, "WIN!", R(cx - tw / 2), R(cy - 3.5 * sc), mix(mix("#FFF2A0", "#FF60A0", fl * (1 - half)), "#5A4A30", half * 0.65), { scale: sc }); }
}

// ---------------------------------------------------------------- the world for this frame
export function drawWorld(c, t) {
  const V = makeView(camAt(CAM, t));
  const dimK = win(t, DIM.in0, DIM.out1, DIM.in1 - DIM.in0, DIM.out1 - DIM.out0);
  const lights = (1 - 0.55 * dimK) * (1 - 0.5 * sm(t, HALF.t0, HALF.t1) * (1 - sm(t, HALF.out, HALF.out + 0.6))) + 0.0;
  const items = [];
  NEIGH.forEach((n) => { items.push({ x: n.x, z: 270, draw: () => drawSlot(c, V, t, { x: n.x, z: M.z, body: n.body, seed: n.seed }, { reels: [0, 1, 2].map((r) => idleReel(n.seed, r, t)), speeds: [0, 1, 2].map((r) => Math.abs(idleReel(n.seed, r, t + 0.017) - idleReel(n.seed, r, t - 0.017)) * 30), lights: lights * 0.8 }) });
    if (n.x !== -92) items.push({ x: n.x + 6, z: 352, draw: () => stool(c, V, n.x + 6, 352) }); });
  let geo = null;
  const st = {
    reels: reels(t), speeds: speeds(t), lights: lights + 0.35 * win(t, MUSIC.t0, WIN.t0, 0.5, 0.3), win: win(t, WIN.t0, HALF.t0, 0.12, 0.35) * (0.75 + 0.25 * Math.sin(t * 25)),
    cut: Math.min(sm(t, CUT.in0, CUT.in1), 1 - sm(t, CUT.out0, CUT.out1)), press: { spin: Math.max(press(t, PRESS1), press(t, PRESS2), press(t, PRESS4)), stop: press(t, STOP_PRESS) },
    line: Math.max(win(t, NEAR.ring, NEAR.ringOut, 0.3, 0.4) * 0.6, win(t, LOCK4.link, LOCK4.out, 0.2, 0.4)), screen: screenContent, coins: payCoins(t),
    glow: nearGlow(t),
  };
  items.push({ x: M.x, z: 271, draw: () => { geo = drawSlot(c, V, t, M, st); } });
  items.push({ x: heroX(t), z: HERO_Z, draw: () => { const G = V.bill(heroX(t), HERO_Z, 1.75, 0.86, false), hp = heroPose(t, G, V); drawPerson(c, V, hp.x, HERO_Z, t, hp.p, LOOKS.hero); V.hand = [G.X(hp.p.near[0]), G.Y(hp.p.near[1] + (hp.p.bob || 0))]; V.head = [G.X(2), G.Y(-104)]; } });
  // a guest at the far-left machine (facing it)
  items.push({ x: -124, z: 350, draw: () => drawPerson(c, V, -124, 350, t, { ...idlePose(t, 21, { near: [16, -47] }), press: 0 }, LOOKS.suit, { mirror: true }) });
  drawCasino(c, V, t, { skip: ["c-front-l", "c-front-r"], items, rope: false });
  V.geo = geo; V.dimK = dimK;
  return V;
}
function payCoins(t) {
  const out = [];
  // the 50¢ coin: out of the chute, a little arc, it lands and lies in the tray
  if (t > PAY.t0 - 0.05) { const u = clamp01((t - PAY.t0) / (PAY.land - PAY.t0)), e = ease(u), bounce = t > PAY.land ? 1.4 * Math.abs(Math.sin((t - PAY.land) * 14)) * Math.exp(-(t - PAY.land) * 7) : 0;
    out.push({ u: lerp(0, 5, e), v: lerp(28, 25.2, e) + Math.sin(Math.PI * u) * 3 + bounce, d: lerp(1, 8, e), a: sm(t, PAY.t0 - 0.05, PAY.t0 + 0.08), spin: u < 1 ? u * 9 : 0, silver: true, flat: u >= 1 && bounce < 0.3, r: 3.6 }); }
  return out;
}
function nearGlow(t) {
  const out = [], k = win(t, NEAR.ring, NEAR.ringOut, 0.3, 0.4) * (0.65 + 0.35 * Math.sin(t * 7));
  if (k > 0) for (let r = 0; r < 3; r++) out.push([r, STRIPS[r].indexOf("seven"), k]);
  const l = win(t, LOCK4.link, LOCK4.out, 0.2, 0.4); if (l > 0) RES4.forEach((idx, r) => out.push([r, idx, l]));
  return out;
}

// ---------------------------------------------------------------- overlays (screen space)
function plaque(c, x, y, w, h, a, edge = RAMP.gold) {
  const g = fade(c, a); g.rrect(x, y + 3, w, h, "#05030A", 3); g.rrect(x, y, w, h, edge[2], 3); g.rrect(x + 2, y + 2, w - 4, h - 4, edge[5], 2); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 2);
  g.rect(x + 8, y + 5, w - 16, 1, "#2A1E3A");
}
function bigText(c, txt, cx, y, scale, col, a, shadowCol = "#05030A") { const g = fade(c, a), w = c.measure(MAIN, txt, { scale }); g.text(MAIN, txt, R(cx - w / 2) + Math.max(1, scale / 2 | 0), y + Math.max(1, scale / 2 | 0), shadowCol, { scale }); g.text(MAIN, txt, R(cx - w / 2), y, col, { scale }); return w; }
function tinyText(c, txt, cx, y, col, a, scale = 2) { const g = fade(c, a), w = c.measure(TINY, txt, { scale }); g.text(TINY, txt, R(cx - w / 2), y, col, { scale }); }
function bulbsFrame(c, x0, y0, w, h, t, a, n = 30) {
  const g = fade(c, a), per = 2 * (w + h);
  for (let i = 0; i < n; i++) { const s = (i / n) * per; let x, y; if (s < w) { x = x0 + s; y = y0 + 1; } else if (s < w + h) { x = x0 + w - 2; y = y0 + s - w; } else if (s < 2 * w + h) { x = x0 + w - (s - w - h); y = y0 + h - 2; } else { x = x0 + 1; y = y0 + h - (s - 2 * w - h); }
    const br = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * 1.2 - (i / n) * 4)); g.rect(R(x) - 1, R(y) - 1, 3, 3, mix("#7A4A10", "#FFF6C8", br)); if (br > 0.7) glow(c, x, y, 6, 6, "#FFD060", 0.35 * a * br); }
}

/** The ticker digits, the grabbed number flying to the screen, the dim of the hall. */
function insideStory(c, V, t) {
  const geo = V.geo; if (!geo) return;
  if (V.dimK > 0) { c.tint(0, 0, 540, 960, () => 0.62 * V.dimK, "#05030A", 6); }
  const cut = Math.min(sm(t, CUT.in0 + 0.2, CUT.in1), 1 - sm(t, CUT.out0, CUT.out1 - 0.2));
  if (cut > 0) { const tr = geo.ticker, sc = Math.max(2, Math.round((tr.y1 - tr.y0) / 9)), w = 6 * 6 * sc, x = R((tr.x0 + tr.x1) / 2 - w / 2), y = R((tr.y0 + tr.y1) / 2 - 4.5 * sc);
    rollingDigits(c, x, y, t, { ...TICK, scale: sc, a: cut }); glow(c, (tr.x0 + tr.x1) / 2, (tr.y0 + tr.y1) / 2, w * 0.8, 12 * sc, "#60F0A0", 0.25 * cut);
    if (V.dimK > 0) glow(c, geo.chip[0], geo.chip[1], 40, 26, "#60F0C0", 0.3 * V.dimK * cut);
    // the grabbed number: a gold copy pops out on "grabs" and flies up into the top screen
    if (t > GRAB.t0 && t < GRAB.sym1 + 0.1) { const vals = digitValues(GRAB.t0, TICK).join(""), pop = sm(t, GRAB.t0, GRAB.t0 + 0.2), fly = ease(clamp01((t - GRAB.fly0) / (GRAB.fly1 - GRAB.fly0))), a = pop * (1 - sm(t, GRAB.sym0, GRAB.sym1));
      const s = geo.screen, x0 = (tr.x0 + tr.x1) / 2, y0 = (tr.y0 + tr.y1) / 2 - 22 * pop, x1 = (s.x0 + s.x1) / 2, y1 = (s.y0 + s.y1) / 2, cx = lerp(x0, x1, fly) - Math.sin(Math.PI * fly) * 40, cy = lerp(y0, y1, fly), bw = w + 14, bh = 9 * sc + 12;
      const g = fade(c, a); g.rrect(R(cx - bw / 2) - 1, R(cy - bh / 2) - 1, bw + 2, bh + 2, "#05030A", 3); g.rrect(R(cx - bw / 2), R(cy - bh / 2), bw, bh, RAMP.gold[5], 3); g.rrect(R(cx - bw / 2) + 2, R(cy - bh / 2) + 2, bw - 4, bh - 4, "#1A1206", 2);
      g.text(MAIN, vals.split("").join(""), R(cx - w / 2) + sc, R(cy - 3.5 * sc), "#FFE27A", { scale: sc, spacing: sc }); glow(c, cx, cy, bw * 0.8, bh, "#FFD060", 0.4 * a);
      for (let i = 0; i < 6; i++) { const u = clamp01((t - GRAB.fly0) / (GRAB.fly1 - GRAB.fly0)) - i * 0.06; if (u <= 0 || u >= 1) continue; const e2 = ease(u), px = lerp(x0, x1, e2) - Math.sin(Math.PI * e2) * 40, py = lerp(y0, y1, e2); fade(c, a * 0.6 * (1 - i / 6)).rect(R(px) - 1, R(py) + R(bh / 2) + 2, 3, 3, "#FFE27A"); } }
  }
  // "LOCKED": a small gold tag under the top screen while the result is locked
  const lk = Math.max(win(t, GRAB.lock, SHOW.out + 0.4, 0.3, 0.4), win(t, LOCK4.t0 + 0.2, LOCK4.out, 0.3, 0.4));
  if (lk > 0) { const s = geo.screen, x = R(s.x1 - 6), y = R(s.y1 - 2), tw = c.measure(TINY, "LOCKED", { scale: 2 }), g = fade(c, lk); g.rrect(x - tw - 10, y, tw + 12, 16, "#05030A", 2); g.rrect(x - tw - 9, y + 1, tw + 10, 14, RAMP.gold[5], 2); g.text(TINY, "LOCKED", x - tw - 4, y + 4, "#2A1A06", { scale: 2 }); }
}

/** The SHOW curtains and marquee over the reel window. */
function showCurtains(c, V, t) {
  const geo = V.geo; if (!geo) return; const a = win(t, SHOW.in, SHOW.out, 0.35, 0.45); if (a <= 0) return;
  const w = geo.win, W = w.x1 - w.x0, H = w.y1 - w.y0, slide = ease(clamp01((t - SHOW.in) / 0.5)) * (1 - ease(clamp01((t - SHOW.out) / 0.5))), g = fade(c, a);
  for (const s of [-1, 1]) { const xe = s < 0 ? w.x0 : w.x1, cw = W * 0.2 * slide, pts = [[xe - s * 14, w.y0 - 10], [xe + s * cw, w.y0 - 10], [xe + s * cw * 0.55, w.y0 + H * 0.55], [xe + s * cw * 0.85, w.y1 + 8], [xe - s * 14, w.y1 + 8]];
    g.poly(pts, null, (x, y) => { const f = Math.sin(((x - xe) / Math.max(4, cw)) * 9 + 1) * 0.5 + 0.5; return RAMP.red[Math.max(1, Math.min(6, R(2 + f * 3 + (bayer2(x, y) - 0.5))))]; });
    g.rect(R(xe + s * cw * 0.55) - 4, R(w.y0 + H * 0.55) - 2, 8, 5, RAMP.gold[5]); }
  // valance with gold fringe
  const vy = R(w.y0 - 14), vh = R(H * 0.16);
  g.poly([[w.x0 - 16, vy], [w.x1 + 16, vy], [w.x1 + 16, vy + vh], ...Array.from({ length: 9 }, (_, i) => { const x = w.x1 + 16 - ((i + 0.5) / 9) * (W + 32); return [x, vy + vh + (i % 2 ? 0 : 7)]; }), [w.x0 - 16, vy + vh]], null, (x, y) => RAMP.red[(y - vy) % 6 < 3 ? 4 : 3]);
  for (let x = R(w.x0 - 14); x < w.x1 + 14; x += 3) g.rect(x, vy + vh - 1 + ((x >> 2) % 2) * 2, 2, 4, RAMP.gold[(x >> 1) % 2 ? 5 : 6]);
  g.rect(R(w.x0 - 16), vy, R(W + 32), 3, RAMP.gold[4]);
  // marquee sign "SHOW"
  const sc = 3, tw = c.measure(MAIN, "SHOW", { scale: sc }), bw = tw + 26, bh = 34, bx = R((w.x0 + w.x1) / 2 - bw / 2), by = R(vy - bh + 10 + (1 - slide) * -10);
  g.rrect(bx, by + 2, bw, bh, "#05030A", 3); g.rrect(bx, by, bw, bh, RAMP.gold[3], 3); g.rrect(bx + 3, by + 3, bw - 6, bh - 6, "#2A0610", 2);
  g.text(MAIN, "SHOW", bx + 13, by + 7, "#FFF2C8", { scale: sc }); bulbsFrame(c, bx, by, bw, bh, t, a, 16);
}
const bayer2 = (x, y) => ((x * 7 + y * 13) % 16) / 16;

/** DUE? crossed out → past games fade → NO MEMORY. */
function duePlaque(c, V, t) {
  const a = win(t, DUE.in, DUE.out, 0.3, 0.35); if (a <= 0) return;
  const cx = R(V.geo ? (V.geo.win.x0 + V.geo.win.x1) / 2 : 330), x = Math.max(150, Math.min(272, cx - 108)), y = 152 + R((1 - sm(t, DUE.in, DUE.in + 0.3)) * 8), w = 216, h = 100;
  plaque(c, x, y, w, h, a);
  const swap = sm(t, DUE.swap, DUE.swap + 0.35), mid = x + w / 2;
  if (swap < 1) { const a1 = a * (1 - swap); bigText(c, "DUE?", mid, y + 26, 6, UI.Y, a1);
    const k = ease(clamp01((t - DUE.strike) / 0.35)); if (k > 0) { const g = fade(c, a1), x0 = mid - 70, y0 = y + 76, x1 = x0 + 140 * k, y1 = y0 - 52 * k; for (let d = -2; d <= 2; d++) g.line(R(x0), R(y0) + d, R(x1), R(y1) + d, d === 2 ? "#5A0810" : UI.PK); } }
  if (swap > 0) { const a2 = a * swap, rows = [["cherry", "bar", "bell"], ["seven", "bell", "bar"], ["bell", "bell", "cherry"]];
    rows.forEach((row, j) => { const gone = sm(t, DUE.gone[j], DUE.gone[j] + 0.35), ra = a2 * (1 - gone); if (ra <= 0) return; const yy = y + 22 + j * 24; fade(c, ra).rrect(x + 26, yy - 10, 116, 21, "#2A1E3A", 2); row.forEach((s, i) => blitSym(c, s, x + 46 + i * 38, yy, 19, ra)); });
    const m = sm(t, DUE.memo, DUE.memo + 0.3) * a2; if (m > 0) { const g = fade(c, m); bigText(c, "NO", mid, y + 22, 4, UI.IV, m); bigText(c, "MEMORY", mid, y + 58, 3, UI.L, m); void g; } }
}

/** Near miss: the third 7 just above the payline. */
function nearMiss(c, V, t) {
  const geo = V.geo; if (!geo) return; const k = win(t, NEAR.flag, NEAR.ringOut, 0.25, 0.4); if (k <= 0) return;
  const r = geo.reels[2], ySym = r.cy - Math.sin(Math.PI / 6) * ((r.y1 - r.y0) / 2 / Math.sin(1.2)), half = (r.x1 - r.x0) / 2 + 3, pulse = 0.5 + 0.5 * Math.sin(t * 8), g = fade(c, k), hh = R(r.cell * 0.42);
  for (let d = 0; d < 2; d++) g.rframe(R(r.cx - half) - d, R(ySym - hh) - d, R(half * 2) + 2 * d, hh * 2 + 2 * d, mix(RAMP.gold[4], "#FFF6C8", pulse), 2);
  for (let y = R(ySym + hh + 3); y < r.cy - 3; y += 4) g.rect(R(r.cx) - 1, y, 3, 2, UI.Y);
  g.poly([[r.cx - 6, r.cy - 9], [r.cx + 6, r.cy - 9], [r.cx, r.cy - 2]], UI.Y);
  glow(c, r.cx, ySym, half * 1.4, hh * 1.4, "#FFD060", 0.3 * k * pulse);
}

/** The virtual reel: reel 3 unrolls into a long ribbon; the blanks next to the 7 light up. */
const RIB = (() => { const out = []; for (let i = -7; i <= 7; i++) { if (i === 0) out.push("seven"); else if (Math.abs(i) <= 3) out.push(null); else out.push(Math.abs(i) % 2 ? null : ["cherry", "bar", "bell", "cherry"][(i + 7) % 4]); } return out; })();
function ribbon(c, V, t) {
  const geo = V.geo; if (!geo) return; const a = win(t, RIBBON.in0, RIBBON.out1, 0.3, 0.4); if (a <= 0) return;
  const open = ease(clamp01((t - RIBBON.in0) / (RIBBON.in1 - RIBBON.in0))) * (1 - ease(clamp01((t - RIBBON.out0) / (RIBBON.out1 - RIBBON.out0)))), cw = 28, n = RIB.length, W = cw * n, y0 = 178, h = 72;
  const px0 = 46, pw = 448, py = 156, ph = 148;
  plaque(c, px0, py + R((1 - sm(t, RIBBON.in0, RIBBON.in0 + 0.3)) * 8), pw, ph, a);
  const r3 = geo.reels[2], cx = lerp(r3.cx, 270, open), x0 = R(cx - W / 2), vis = (W / 2) * open, g = fade(c, a);
  // the feed band from reel 3 up to the ribbon
  const fa = a * Math.min(1, open * 3) * (1 - sm(open, 0.85, 1)); if (fa > 0) fade(c, fa).poly([[r3.x0 + 4, r3.y0], [r3.x1 - 4, r3.y0], [cx + cw / 2, y0 + h], [cx - cw / 2, y0 + h]], null, (x, y) => mix("#D8D0B8", "#7A705A", ((x + y) % 4) / 8));
  const lit = sm(t, RIBBON.lit, RIBBON.lit + 0.35), pulse = 0.6 + 0.4 * Math.sin(t * 8);
  RIB.forEach((s, i) => { const x = x0 + i * cw; if (x + cw < cx - vis || x > cx + vis) return; const d = Math.abs(i - (n - 1) / 2), near = s === null && d <= 3 && d > 0;
    const sub = Object.create(g); sub.px = (px, py2, col) => { if (px >= cx - vis && px <= cx + vis) g.px(px, py2, col); };
    for (let yy = 0; yy < h; yy++) { const curl = Math.abs(yy / h - 0.5) * 2, base = near ? mix("#F4EEDC", "#F59A3A", lit * (0.55 + 0.35 * pulse)) : "#F4EEDC"; sub.rect(x, y0 + yy, cw - 1, 1, mix(base, "#2A1A20", curl * curl * 0.45)); }
    sub.rect(x + cw - 1, y0, 1, h, "#B8AE98");
    if (s) blitSym(sub, s, x + cw / 2, y0 + h / 2, cw - 2, 1);
    if (s === "seven") { glow(c, x + cw / 2, y0 + h / 2, cw * 1.6, h * 0.7, "#FFD060", 0.12 * a); for (let dd = 0; dd < 2; dd++) sub.rframe(x - dd, y0 - dd, cw + 2 * dd, h + 2 * dd, RAMP.gold[5], 1); } });
  g.rect(R(cx - vis), R(y0 + h / 2), R(vis * 2), 1, "#E02838");
  // the blanks next to the 7 are marked, and the label
  if (lit > 0) { const la = a * lit; for (const [i0, i1] of [[n / 2 - 3.5, n / 2 - 0.5], [n / 2 + 0.5, n / 2 + 3.5]]) fade(c, la).rect(R(x0 + i0 * cw) + 2, y0 + h + 5, R((i1 - i0) * cw) - 4, 3, UI.OR);
    bigText(c, "ALMOST", 270, y0 + h + 15, 3, UI.OR, la); }
}

/** Music notes floating out of the topper; $1 → 50¢; WIN!; −50¢; the heart. */
function winStory(c, V, t) {
  const geo = V.geo; if (!geo) return;
  // notes
  const na = win(t, MUSIC.t0, MUSIC.t1, 0.3, 0.6); if (na > 0) { const rate = 2.5 + 7 * win(t, WIN.t0, HALF.t0, 0.1, 0.3), cols = [UI.Y, "#FF8AC0", UI.CY, "#B8F088"];
    for (let i = 0; i < 26; i++) { const life = 1.6, t0 = MUSIC.t0 + i * 0.22, ph = ((t - t0) % (life * 2.6)), u = ph / life; if (t < t0 || u > 1 || (i % 3 === 2 && rate < 5)) continue;
      const side = i % 2 ? 1 : -1, x = geo.top[0] + side * (30 + u * (70 + 40 * rnd(i))) + Math.sin(u * 6 + i) * 8, y = geo.top[1] + 130 - u * 120;
      musicNote(c, x, y, 3 + (i % 2), cols[i % 4], na * Math.min(1, Math.sin(Math.PI * u) * 1.6)); } }
  // $1 coin in the mitten + tag
  const ca = win(t, BET.take, BET.slot, 0.2, 0.1); if (ca > 0 && V.hand) { const [hx, hy] = V.hand, sink = sm(t, BET.drop, BET.slot), g = fade(c, ca * (1 - sink * 0.9)), cx = hx + 4, cy = hy - 6 + sink * 6, r = 8;
    g.ellipse(R(cx), R(cy) + 1, r, r, RAMP.gold[2]); g.ellipse(R(cx), R(cy), r, r, RAMP.gold[5]); g.ellipse(R(cx), R(cy), r - 3, r - 3, RAMP.gold[4]); g.text(MAIN, "$", R(cx) - 2, R(cy) - 3, RAMP.gold[1]); glow(c, cx, cy, 16, 16, UI.Y, 0.35 * ca); }
  const ta = win(t, BET.tag0, BET.tag1, 0.25, 0.35); if (ta > 0) { const w = geo.win, bw = moneyWidth(c, "$1", 4) + 34, x = R((w.x0 + w.x1) / 2 - bw / 2), y = R(w.y0 - 12 + (1 - sm(t, BET.tag0, BET.tag0 + 0.3)) * 8); plaque(c, x, y, bw, 58, ta); moneyText(c, "$1", x + 17, y + 15, 4, UI.Y, ta); }
  const pa = win(t, PAY.tag, HALF.out, 0.25, 0.4); if (pa > 0) { const [tx, ty] = geo.tray, x = R(Math.min(330, tx + 30)), y = R(Math.min(560, ty - 70)), w = moneyWidth(c, "50¢", 3) + 24; plaque(c, x, y, w, 44, pa, RAMP.chrome); moneyText(c, "50¢", x + 12, y + 12, 3, "#E6E6F0", pa);
    const g = fade(c, pa * 0.8); for (let k = 0; k < 6; k++) g.rect(R(lerp(x + 6, tx + 6, k / 6)), R(lerp(y + 44, ty - 6, k / 6)), 2, 2, "#BCBCCC"); }
  // WIN! burst over the reel window
  const wa = win(t, WIN.t0, HALF.t0 + 0.2, 0.15, 0.45); if (wa > 0) { const w = geo.win, cx = (w.x0 + w.x1) / 2, cy = w.y0 + 8, pop = 1 + 0.25 * (1 - ease(clamp01((t - WIN.t0) / 0.3))), s = R(6 * pop), fl = 0.5 + 0.5 * Math.sin(t * 20);
    const g = fade(c, wa); for (let i = 0; i < 16; i++) { const ang = (i / 16) * Math.PI * 2 + t * 0.7, r0 = 46, r1 = 92 + 12 * Math.sin(t * 9 + i); for (let k = 0; k < 3; k++) g.line(R(cx + Math.cos(ang) * r0), R(cy + Math.sin(ang) * r0 * 0.6) + k - 1, R(cx + Math.cos(ang) * r1), R(cy + Math.sin(ang) * r1 * 0.6), i % 2 ? "#FFE27A" : "#FF8AC0"); }
    glow(c, cx, cy, 130, 70, "#FFD060", 0.45 * wa);
    const tw = c.measure(MAIN, "WIN!", { scale: s }); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 3]]) g.text(MAIN, "WIN!", R(cx - tw / 2) + dx, R(cy - 3.5 * s) + dy, "#5A0820", { scale: s });
    g.text(MAIN, "WIN!", R(cx - tw / 2), R(cy - 3.5 * s), mix("#FFF2A0", "#FFFFFF", fl * 0.6), { scale: s });
    for (let i = 0; i < 14; i++) { const u = ((t - WIN.t0) * 0.9 + rnd(i)) % 1, ang = rnd(i * 3) * Math.PI * 2, rr = 30 + u * 130, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr * 0.7, sz = R(Math.sin(Math.PI * u) * 4); if (sz < 1) continue; const gg = fade(c, wa * Math.sin(Math.PI * u)); gg.rect(R(x) - sz, R(y), sz * 2 + 1, 1, "#FFF6C8"); gg.rect(R(x), R(y) - sz, 1, sz * 2 + 1, "#FFF6C8"); } }
  // −50¢
  const ha = win(t, HALF.t0 + 0.1, HALF.out, 0.3, 0.4); if (ha > 0) { const w = geo.win, cx = (w.x0 + w.x1) / 2, bw = moneyWidth(c, "-50¢", 4) + 30, x = R(cx - bw / 2), y = R(w.y0 - 12 + (1 - sm(t, HALF.t0 + 0.1, HALF.t0 + 0.4)) * 8);
    plaque(c, x, y, bw, 58, ha, RAMP.red); moneyText(c, "-50¢", x + 15, y + 15, 4, "#FF6070", ha); }
  // the heart over the hero's head
  const hk = win(t, HEART.t0, HEART.t1, 0.25, 0.4); if (hk > 0 && V.head) { const ph = ((t - HEART.t0) * 2.3) % 1, beat = Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.22) * 12) * (ph > 0.22 ? 1 : 0), s = 4.4 + 1.4 * beat, x = V.head[0] + 6, y = V.head[1] - 26 - 6 * sm(t, HEART.t0, HEART.t0 + 0.4);
    glow(c, x, y, 34 + 12 * beat, 30 + 10 * beat, "#FF4070", 0.45 * hk); fade(c, hk).disc(R(x), R(y), R(s * 5.2), "#05030A"); fade(c, hk).disc(R(x), R(y), R(s * 4.8), "#3A0A1E"); heart(c, x, y, s, hk);
    for (let k = 0; k < 2; k++) { const u = (((t - HEART.t0) * 2.3 + k * 0.5) % 1), rr = 18 + u * 26; fade(c, hk * (1 - u) * 0.8).ering(R(x), R(y), R(rr), R(rr * 0.9), "#FF8AA0"); } }
}

/** The two bars: what people with the win sounds thought vs what really happened. */
function bars(c, V, t) {
  const a = win(t, BARS.in, BARS.out, 0.35, 0.4); if (a <= 0) return;
  const x = 76, y = 158 + R((1 - sm(t, BARS.in, BARS.in + 0.35)) * 10), w = 364, h = 300; plaque(c, x, y, w, h, a); bulbsFrame(c, x, y, w, h, t, a, 40);
  const base = y + h - 62, full = 146, k1 = ease(clamp01((t - BARS.sound) / (BARS.soundEnd - BARS.sound))), k2 = ease(clamp01((t - BARS.real) / (BARS.realEnd - BARS.real))), g = fade(c, a);
  g.rect(x + 30, base, w - 60, 2, "#5A4A6E");
  const bar = (bx, val, ramp, label, k) => { const hh = R(full * val * k), bw = 96; if (hh > 0) { g.rect(bx - 2, base - hh - 2, bw + 4, hh + 2, "#05030A"); g.poly([[bx, base - hh], [bx + bw, base - hh], [bx + bw, base], [bx, base]], null, (px, py) => ramp[Math.max(2, Math.min(7, R(6.4 - Math.abs(px - bx - bw * 0.35) / bw * 4 + (bayer2(px, py) - 0.5))))]); g.rect(bx + 8, base - hh + 3, 4, Math.max(0, hh - 6), ramp[7]); }
    tinyText(c, label, bx + bw / 2, base + 12, "#E8D8A8", a); };
  // the test players: a little row of people appear on "people", notes bounce over them on "heard"
  { const cols = [RAMP.teal, RAMP.yellow, RAMP.purple, RAMP.green, RAMP.blue, RAMP.red], skins = ["#E6AD8A", "#9A5A38", "#F3CBAA", "#B4744A", "#DCA27E", "#CA9064"];
    for (let i = 0; i < 6; i++) { const pa = a * sm(t, EV.people - 0.1 + i * 0.05, EV.people + 0.2 + i * 0.05); if (pa <= 0) continue; const g2 = fade(c, pa), px = x + 52 + i * 52, py = y + 58 + R(Math.sin(t * 3 + i) * 1.5);
      g2.rrect(px - 13, py + 8, 26, 22, "#05030A", 4); g2.rrect(px - 12, py + 8, 24, 21, cols[i][5], 4); g2.rect(px - 10, py + 10, 20, 2, cols[i][6]);
      g2.disc(px, py, 10, "#05030A"); g2.disc(px, py, 9, skins[i]); g2.rect(px - 9, py - 9, 18, 5, cols[(i + 3) % 6][2]); g2.rect(px - 4, py - 1, 2, 3, "#1A1018"); g2.rect(px + 3, py - 1, 2, 3, "#1A1018"); g2.rect(px - 2, py + 4, 5, 1, "#7A3A30");
      const nk = pa * win(t, EV.heard - 0.1 + i * 0.07, BARS.out, 0.25, 0.3); if (nk > 0) { const u = ((t * 1.1 + i * 0.37) % 1); musicNote(c, px + 10, py - 14 - u * 12, 1.5, [UI.Y, "#FF8AC0", UI.CY][i % 3], nk * Math.sin(Math.PI * u)); } } }
  bar(x + 52, 24 / 24, RAMP.yellow, "WITH SOUND", k1); bar(x + 216, 14 / 24, RAMP.teal, "REAL", k2);
  const sk = a * sm(t, BARS.in + 0.2, BARS.in + 0.6); speaker(c, x + 100, base + 40, 2, sk, 0.5 + 0.5 * Math.sin(t * 8));
  for (let i = 0; i < 3; i++) { const u = ((t * 0.8 + i / 3) % 1); musicNote(c, x + 114 + u * 30, base + 38 - u * 26 - i * 2, 1.5, [UI.Y, "#FF8AC0", UI.CY][i], sk * Math.sin(Math.PI * u)); }
  if (k1 > 0.95) glow(c, x + 100, base - full, 60, 18, "#FFD060", 0.3 * a);
}

/** STOP changes nothing: gold links from the locked symbols to the reels. */
function stopLink(c, V, t) {
  const geo = V.geo; if (!geo) return; const k = win(t, LOCK4.link, LOCK4.out, 0.3, 0.4); if (k <= 0) return;
  const s = geo.screen, w = s.x1 - s.x0, g = fade(c, k), draw = ease(clamp01((t - LOCK4.link) / 0.45));
  [0, 1, 2].forEach((r) => { const x0 = s.x0 + w * (0.14 + r * 0.22), y0 = s.y1 + 2, rr = geo.reels[r], x1 = rr.cx, y1 = rr.cy - 4, n = 10;
    for (let i = 0; i < n * draw; i++) { const u = i / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u); g.rect(R(x) - 1, R(y) - 1, 3, 3, i % 2 ? "#FFE27A" : RAMP.gold[4]); } });
  const tick = sm(t, LOCK4.link + 0.35, LOCK4.link + 0.6); if (tick > 0) { const gg = fade(c, k * tick), cx = geo.win.x1 + 12, cy = geo.win.y0 + 10, sz = 3; const T = [[0, 3], [1, 4], [2, 5], [3, 4], [4, 3], [5, 2], [6, 1], [7, 0]];
    gg.disc(R(cx + 10), R(cy + 6), 16, "#05030A"); gg.disc(R(cx + 10), R(cy + 6), 14, "#1E7A3A"); for (const [dx, dy] of T) gg.rect(R(cx) + dx * sz - 2, R(cy) + dy * sz - 2, sz + 1, sz + 1, "#B8FFC8"); }
}

/** Screen-space story layer (between the world and the follow card). */
export function drawStory(c, V, t) { insideStory(c, V, t); showCurtains(c, V, t); nearMiss(c, V, t); duePlaque(c, V, t); ribbon(c, V, t); winStory(c, V, t); bars(c, V, t); stopLink(c, V, t); }
export { END, EV };
