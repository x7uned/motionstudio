// The claws (main and neighbour), the moving plush prizes, the coins, the players' hands and the joystick knobs.
// Every state is a pure function of t from timeline.mjs keys: carriage x, hub y, prong opening, coil voltage.
// The grabbed prize hangs from the hub and sags as the voltage fades; slips are gravity falls with a landing squash.
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { blob, flat, tube, ell, RAMP, sm, ease, lerp } from "./cute.mjs";
import { drawSprite, METAL, SPOT } from "./arcade.mjs";
import { EV, END, NX, RAIL_Y, HOME, CHUTE, SLOT, DOOR, GLASS, track, CLAW_X, CLAW_Y, CLAW_OPEN, VOLT, VOLT_EASE, GRABS, COIN_DROPS, LOW, TOP, GRIP_DY } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const lin = (x) => clamp01(x);
const { G1, G2, G3 } = GRABS;

// ---------------------------------------------------------------- state
export const volt = (t) => track(VOLT, t, VOLT_EASE);
/** Needle voltage: the coil value with a little mechanical lag + a tiny tremble while powered. */
export const needle = (t) => { let s = 0, w = 0; for (let i = 0; i < 6; i++) { const k = Math.exp(-i * 0.7); s += volt(t - i * 0.03) * k; w += k; } const v = s / w; return v + (v > 1 ? 0.35 * Math.sin(t * 41) : 0); };
export function claw(t) {
  const x = track(CLAW_X, t), y = track(CLAW_Y, t), V = volt(t);
  let open = track(CLAW_OPEN, t);
  if (t > G1.shut && t < G1.slip0 + 0.4) open += ((48 - Math.min(48, V)) / 38) * 0.42 * (V > 0 ? 1 : 0); // the grip loosens as the coil fades
  // the claw swings a little after each carriage move (damped pendulum on the measured velocity)
  const vx = (track(CLAW_X, t + 0.04) - track(CLAW_X, t - 0.04)) / 0.08, sway = Math.max(-7, Math.min(7, -vx * 0.035));
  return { x, y, open: clamp01(open), V, sway };
}
// neighbour claw (local coordinates of its own window; world x = NX + local x)
export const N_X = [[-1, 236], [EV.not1 + 0.6, 236], [EV.machine3 + 0.8, 188], [EV.way2 + 0.35, 207], [EV.aim - 0.1, 200], [END, 200]];
export const N_Y = [[-1, 262], [EV.aim, 262], [EV.aim + 0.42, LOW], [EV.matters + 0.12, LOW], [EV.matters + 0.85, TOP], [END, TOP]];
const N_OPEN = [[-1, 0.25], [EV.not1 + 0.6, 0.25], [EV.aim - 0.1, 1], [EV.aim + 0.45, 1], [EV.aim + 0.62, 0.1], [END, 0.1]];
export const N_SHUT = EV.aim + 0.62;
export function nclaw(t) {
  const x = track(N_X, t), vx = (track(N_X, t + 0.04) - track(N_X, t - 0.04)) / 0.08;
  return { x, y: track(N_Y, t), open: track(N_OPEN, t), V: t > N_SHUT - 0.1 ? 48 : 0, sway: Math.max(-6, Math.min(6, -vx * 0.035)), vx };
}

// ---------------------------------------------------------------- claw drawing
function prong(c, root, theta, side, col, out, a, len = 1.25) {
  const s = side, el = [root[0] + s * 15 * len * Math.sin(theta), root[1] + 15 * len * Math.cos(theta)];
  const phi = theta - 1.0, tip = [el[0] - s * 13 * len * Math.sin(-phi), el[1] + 13 * len * Math.cos(phi)];
  const p = tube([root, el, tip], 3, 1.8);
  flat(c, [p], col, { a, outline: out });
  const g = fade(c, a); g.line(R(root[0] + s * 1), R(root[1] + 1), R(el[0] + s * 1), R(el[1]), mix(col, "#FFFFFF", 0.45));
  return tip;
}
/** Carriage + cable + hub + prongs; `holding` draws the prize between the back and the front prongs. */
function drawClaw(c, ox, st, a, holding) {
  const x = ox + st.x, hx = x + st.sway, hy = st.y, th = 0.18 + 0.85 * st.open;
  const g = fade(c, a);
  // carriage on the rail
  g.rrect(R(x - 12), RAIL_Y - 8, 24, 11, "#0B0812", 2); g.rrect(R(x - 11), RAIL_Y - 7, 22, 9, METAL[4], 2); g.rect(R(x - 9), RAIL_Y - 6, 18, 1, METAL[6]);
  g.disc(R(x - 7), RAIL_Y + 2, 2, METAL[1]); g.disc(R(x + 7), RAIL_Y + 2, 2, METAL[1]);
  // cable (a slight curve toward the swinging hub)
  for (let yy = RAIL_Y + 3; yy < hy; yy++) { const u = (yy - RAIL_Y) / Math.max(1, hy - RAIL_Y), xx = R(x + st.sway * u * u); g.px(xx, yy, "#0B0812"); g.px(xx + 1, yy, METAL[5]); }
  // back prong (darker, behind the prize)
  const root = [hx, hy + 15];
  prong(c, [hx + 1, hy + 13], th * 0.55, 1, METAL[2], "#07060E", a, 1.1);
  if (holding) holding();
  // hub
  g.rrect(R(hx - 13), R(hy), 26, 16, "#07060E", 3); g.rrect(R(hx - 12), R(hy + 1), 24, 14, METAL[4], 2); g.rect(R(hx - 10), R(hy + 2), 20, 2, METAL[6]); g.rect(R(hx - 12), R(hy + 10), 24, 3, METAL[2]);
  g.disc(R(hx), R(hy + 7), 3, st.V > 1 ? mix("#7A3A10", "#FFD060", Math.min(1, st.V / 48)) : "#3A2A4A");   // coil lamp glows with the voltage
  // front prongs
  prong(c, [root[0] - 7, root[1] - 1], th, -1, METAL[5], "#07060E", a);
  prong(c, [root[0] + 7, root[1] - 1], th, 1, METAL[5], "#07060E", a);
}

// ---------------------------------------------------------------- prizes
const PILE_BUNNY = SPOT.bunny, LAND1 = SPOT.land1, LAND3 = SPOT.land3, PILE_BEAR = SPOT.bear;
function bunnyState(t, cs) {
  const hold = (sag) => ({ x: cs.x + cs.sway, y: cs.y + GRIP_DY + sag, held: true });
  if (t < G1.shut - 0.04) return { x: PILE_BUNNY[0], y: PILE_BUNNY[1] };
  if (t < G1.slip0) return hold(((48 - Math.min(48, cs.V)) / 38) * 6 * (cs.V > 0 ? 1 : 0));
  if (t < G1.slip1) { const s = claw(G1.slip0), y0 = s.y + GRIP_DY + 6, u = (t - G1.slip0) / (G1.slip1 - G1.slip0); return { x: lerp(s.x + s.sway, LAND1[0], u), y: lerp(y0, LAND1[1], u * u), falling: true }; }
  if (t < G3.shut - 0.04) return { x: LAND1[0], y: LAND1[1], land: t - G1.slip1 };
  if (t < G3.slip0) { const sq = sm(t, G3.shut, G3.shut + 0.14) * (1 - sm(t, G3.limp0, G3.limp1)); return { ...hold(((48 - Math.min(48, cs.V)) / 38) * 7), sq }; }
  if (t < G3.slip1) { const s = claw(G3.slip0), y0 = s.y + GRIP_DY + 7, u = (t - G3.slip0) / (G3.slip1 - G3.slip0); return { x: lerp(s.x + s.sway, LAND3[0], u), y: lerp(y0, LAND3[1], u * u), falling: true }; }
  return { x: LAND3[0], y: LAND3[1], land: t - G3.slip1 };
}
function bearState(t, cs) {
  if (t < G2.shut - 0.04) return { x: PILE_BEAR[0], y: PILE_BEAR[1] };
  if (t < G2.drop) return { x: cs.x + cs.sway, y: cs.y + GRIP_DY, held: true };
  const d0 = G2.drop, u = (t - d0) / 0.42;
  if (u < 1) { const s = claw(d0); return { x: HOME.x, y: lerp(s.y + GRIP_DY, 560, u * u), chute: true }; }
  return { door: sm(t, d0 + 0.5, d0 + 0.95) };
}
const squash = (land) => (land === undefined || land > 0.3 ? 1 : 1 - 0.16 * Math.sin(Math.PI * clamp01(land / 0.3)));

// ---------------------------------------------------------------- coins and hands
function coin(c, x, y, t, a = 1, clipY = 999) {
  const w = Math.max(1, R(6 * Math.abs(Math.cos(t * 9)))), g = fade(c, a);
  for (let j = -6; j <= 6; j++) for (let i = -w; i <= w; i++) { if ((i * i) / (w * w + 0.01) + (j * j) / 36 > 1) continue; const Y = R(y + j); if (Y >= clipY) continue; const edge = (i * i) / (w * w + 0.01) + (j * j) / 36 > 0.6; g.px(R(x + i), Y, edge ? "#8A5A10" : i < 0 ? "#FFE680" : "#F4CA50"); }
}
/** A hand from the right: fingertips at (x, y), a sleeve running off to the right. kind: player (purple sweater) | owner (blue work shirt). */
export function hand(c, x, y, a, kind = "player", pinch = 1) {
  if (a <= 0) return; const sl = kind === "owner" ? ["#0E1A2E", "#1C3456", "#2C507E", "#40709E", "#5A8CBA", "#7AAAD4", "#A0C6E8", "#C8E0F4"] : ["#140E24", "#22163C", "#33245A", "#46327A", "#5A4296", "#6E52B0", "#8A6CC8", "#A88CDC"];
  blob(c, [tube([[x + 36, y + 12], [x + 72, y + 34], [x + 130, y + 70]], 13, 17)], { ramp: sl, a, base: 3.6, thick: 12 });
  blob(c, [tube([[x + 31, y + 9], [x + 41, y + 15]], 13.5, 13.5)], { ramp: sl, a, base: 4.6, thick: 8 });
  const op = 1 - pinch;
  blob(c, [ell(x + 21, y + 9, 15, 12, -0.35), ell(x + 12, y + 18, 6, 5), ell(x + 19, y + 21, 6, 5), ell(x + 26, y + 21, 5.5, 5),
    tube([[x + 16, y - 1], [x + 8, y - 4], [x + 1, y - 2 - 3 * op]], 4.4, 3.6), tube([[x + 16, y + 13], [x + 7, y + 9], [x + 1, y + 3 + 4 * op]], 4.8, 3.8)], { ramp: RAMP.skin, a, base: 4.3, thick: 8 });
}
function keySprite(c, x, y, turn, a) {   // a small gold key held at (x, y): bow on the right, blade into the lock (turn 0..1 → rotates 90°)
  const g = fade(c, a), ang = turn * Math.PI / 2, P = (u, v) => [R(x + u * Math.cos(ang) - v * Math.sin(ang) * 0.35), R(y + v * Math.cos(ang) + u * Math.sin(ang) * 0.35)];
  g.poly([P(0, -2), P(-16, -2), P(-16, 2), P(0, 2)], "#B88A20"); g.poly([P(-10, 2), P(-10, 5), P(-13, 5), P(-13, 2)], "#B88A20");
  g.disc(R(x + 6), R(y), 6, "#5A3A08"); g.disc(R(x + 6), R(y), 5, "#F4CA50"); g.disc(R(x + 6), R(y), 2, "#5A3A08"); g.px(R(x + 4), R(y - 3), "#FFF2B0");
}
export const KEYHOLE = { x: 448, y: 300 };

// ---------------------------------------------------------------- joystick knob (live; tilts with the carriage)
function joystick(c, ox, tilt, a = 1) {
  const g = fade(c, a), bx = ox + 130, by = 545, tx = bx + tilt * 9, ty = 522;
  for (let i = 0; i <= 10; i++) { const u = i / 10, xx = R(lerp(bx, tx, u)); g.rect(xx - 1, R(lerp(by, ty, u)), 3, 1, i > 8 ? METAL[1] : METAL[3]); }
  g.disc(R(tx), ty - 4, 7, "#07060E"); g.disc(R(tx), ty - 4, 6, "#C8202C"); g.disc(R(tx) - 2, ty - 6, 2, "#FF8A80");
}

// ---------------------------------------------------------------- frame parts
/** Everything that moves inside/at the two machines; ox = −pan. */
export function machines(c, t, P) {
  const cs = claw(t), oxM = -P, oxN = NX - P;
  // ---- main machine (if on screen)
  if (oxM > -330) {
    const b = bunnyState(t, cs), br = bearState(t, cs);
    const drawBunny = () => drawSprite(c, "bunny", b.x + oxM, b.y, { sx: 1 - 0.14 * (b.sq ?? 0), sy: squash(b.land) * (1 + 0.06 * (b.sq ?? 0)) });
    const glassTint = [106, 90, 168, 0.35], drawBear = () => drawSprite(c, "bear", br.x + oxM, br.y, { clip: br.chute ? (X, Y) => Y < GLASS.y1 : null, shade: br.chute ? (X, Y) => (Y > CHUTE.top + 5 && X < CHUTE.x1 + oxM ? glassTint : null) : null });
    if (!b.held) drawBunny();
    if (!br.held && br.x !== undefined) drawBear();
    drawClaw(c, oxM, cs, 1, b.held ? drawBunny : br.held ? drawBear : null);
    // the won bear in the prize door window
    if (br.door > 0) { const k = br.door; drawSprite(c, "bear", DOOR.x + DOOR.w / 2 + oxM, DOOR.y + 4 + 26 * ease(k), { sx: 0.85, sy: 0.85, a: Math.min(1, k * 1.6), clip: (X, Y) => Y >= DOOR.y + 1 && Y < DOOR.y + DOOR.h - 6 && X > DOOR.x + oxM && X < DOOR.x + DOOR.w + oxM }); }
    joystick(c, oxM, Math.max(-1, Math.min(1, -cs.sway / 5)));
    // coins and the players' hands
    for (const d of COIN_DROPS) {
      const t0 = d.t, land = t0 + 0.5; if (t < t0 - 0.7 || t > land + 0.9) continue;
      const hk = d.hand ? ease(clamp01((t - (t0 - 0.7)) / 0.6)) : 1, out = d.hand ? ease(clamp01((t - (land + 0.1)) / 0.7)) : 0;
      const hx = SLOT.x + 2 + (1 - hk) * 70 + out * 80 + oxM, hy = 506 + (1 - hk) * 40 + out * 50;
      if (t < t0 + 0.05) { if (d.hand) coin(c, hx - 2, hy + 1, 0.1, Math.min(1, hk * 2)); }
      else if (t < land) { const u = (t - t0 - 0.05) / (land - t0 - 0.05), y0 = d.hand ? 507 : 430; coin(c, SLOT.x + oxM, lerp(y0, SLOT.y + 8, u * u), t, 1, 534); }
      if (d.hand) hand(c, hx + 2, hy - 2, Math.min(sm(t, t0 - 0.7, t0 - 0.45), 1 - sm(t, land + 0.5, land + 0.85)), "player", 1 - sm(t, t0, t0 + 0.08));
    }
  }
  // ---- neighbour machine
  if (oxN < 540) {
    const ns = nclaw(t), held = t > N_SHUT - 0.04;
    const kx = held ? ns.x + ns.sway : SPOT.kitten[0], ky = held ? ns.y + GRIP_DY : SPOT.kitten[1];
    const drawKitten = () => drawSprite(c, "kitten", kx + oxN, ky);
    if (!held) drawKitten();
    // the aim marker on the kitten: rings that tighten as the player lines up the claw
    const am = Math.min(sm(t, EV.machine3 + 0.5, EV.machine3 + 0.9), 1 - sm(t, EV.aim + 0.3, EV.aim + 0.6));
    if (am > 0) { const g = fade(c, am), rr = 12 + 22 * (1 - sm(t, EV.machine3 + 0.5, EV.aim - 0.05)), cx = SPOT.kitten[0] + oxN, cy = SPOT.kitten[1], col = "#7CFF5A";
      g.ering(R(cx), cy, R(rr + 4), R(rr * 0.6 + 3), "#0B2A08"); g.ering(R(cx), cy, R(rr + 3), R(rr * 0.6 + 2), col); g.ering(R(cx), cy, R(rr + 2), R(rr * 0.6 + 1), col);
      for (const [dx, dy, w, h] of [[-rr - 12, -1, 8, 3], [rr + 5, -1, 8, 3], [-1, -R(rr * 0.6) - 11, 3, 7], [-1, R(rr * 0.6) + 4, 3, 7]]) { g.rect(R(cx + dx) - 1, cy + dy - 1, w + 2, h + 2, "#0B2A08"); g.rect(R(cx + dx), cy + dy, w, h, col); } }
    drawClaw(c, oxN, ns, 1, held ? drawKitten : null);
    joystick(c, oxN, Math.max(-1, Math.min(1, ns.vx / 60)));
    const ha = Math.min(sm(t, EV.not1 + 0.3, EV.machine3), 1 - sm(t, EV.matters + 0.2, EV.matters + 0.6));
    if (ha > 0) hand(c, oxN + 130 + Math.max(-1, Math.min(1, ns.vx / 60)) * 9 + 4, 514, ha, "player", 0.6);
  }
}
