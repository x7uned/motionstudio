// STREET life for «Fake buttons»: small continuous details that keep the corner alive without stealing the beats —
// pigeons pecking on the front sidewalk (head bobs, a little hop now and then) and steam rising from a manhole in the
// avenue's near lane (soft dithered puffs that drift up and fade). Pure functions of t.
import { R, rnd, bayer, mix } from "./street-kit.mjs";
import { FORE_P, KERB } from "./street-art.mjs";

const INK = "#1A0E1C";
// [world x, world y, facing, phase]
const PIGEONS = [[-546, 116, 1, 0.3], [-520, 128, -1, 1.7], [-196, 108, -1, 2.9]];
function pigeon(c, x, y, dir, t, ph) {
  const cyc = ((t + ph) % 2.6 + 2.6) % 2.6, peck = cyc < 0.5 ? Math.sin(Math.PI * cyc / 0.5) : cyc > 1.4 && cyc < 1.7 ? 0.6 * Math.sin(Math.PI * (cyc - 1.4) / 0.3) : 0;
  const hop = 0, bob = R(peck * 3);
  const P = (dx, dy, col) => c.px(x + dx * dir, y + dy - hop, col);
  // body (grey-blue), wing (darker with two bars), tail, legs
  for (let j = -6; j <= 0; j++) for (let i = -7; i <= 4; i++) { const q = (i / 7.5) ** 2 + ((j + 3) / 3.6) ** 2; if (q <= 1) P(i, j, j < -4 ? "#C4C8DA" : i < -3 ? "#7E8298" : "#9EA2B8"); }
  for (let i = -5; i <= 1; i++) { P(i, -4, "#6E7288"); if (i < -1) P(i, -2, "#4A4E62"); }
  for (let i = -10; i <= -7; i++) { P(i, -3 + (i < -8 ? 1 : 0), "#5A5E74"); }
  P(-1, 1, "#E06A6A"); P(1, 1, "#E06A6A");
  // neck + head (iridescent green/violet), pecks down
  const hx = 4 + R(peck * 2), hy = -7 + bob;
  for (let k = 0; k < 3; k++) { P(3 + R(peck * k * 0.6), -5 + R(bob * k / 3), k === 1 ? "#5AA88A" : "#8A6AB0"); }
  for (let j = -2; j <= 0; j++) for (let i = 0; i <= 2; i++) P(hx + i, hy + j, "#8A8EA6");
  P(hx + 1, hy - 1, INK); P(hx + 3, hy, "#3A3040");
  // outline above the back
  for (let i = -6; i <= 3; i++) P(i, -7, INK);
}
export function drawPigeons(c, V, t, clipX) {
  for (const [x, y, dir, ph] of PIGEONS) {
    const X = R(V.X(x)), Y = R(V.Y(y)); if (X < -20 || X > clipX - 12) continue;
    // a little hop forward every ~5 s (continuous, eased)
    const u = ((t + ph * 1.9) % 5.3) / 5.3, hopK = u > 0.86 && u < 0.94 ? Math.sin(Math.PI * (u - 0.86) / 0.08) : 0;
    const dx = R(5 * Math.sin((2 * Math.PI * t) / 13 + ph * 2.1) * dir);   // a slow continuous wander (no resets)
    c.tint(X - 8, Y, 16, 3, (Xx, Yy) => (Yy === Y + 1 ? 0.35 : 0.15), "#3A2238", 2);
    pigeon(c, X + dx, Y - R(hopK * 4), dir, t, ph);
  }
}

// ---------------------------------------------------------------- steam from a manhole in the near lane (parallax 1.15)
const HOLE = { lx: -470, y: KERB + 52 };
export function drawSteam(c, V, t) {
  const X = R(HOLE.lx + 570 - (V.cx + 300) * FORE_P), Y = R(V.Y(HOLE.y)); if (X < -60 || X > 600) return;
  // the cover
  for (let j = -3; j <= 3; j++) for (let i = -12; i <= 12; i++) if ((i / 12.5) ** 2 + (j / 3.6) ** 2 <= 1) c.px(X + i, Y + j, (i + j) % 3 === 0 ? "#2E2632" : "#4A4050");
  for (let i = -9; i <= 9; i++) c.px(X + i, Y - 3, "#7A6E7C");
  // puffs: each rises ~70 px over 3.4 s, grows, drifts right, fades
  for (let k = 0; k < 7; k++) {
    const life = 3.4, u = (((t + k * life / 7) % life) + life) % life / life, px = X + R(Math.sin(u * 3 + k) * 3 + u * 22), py = Y - 4 - R(u * 72), r = 4 + u * 12, a = 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.35);
    for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r * 1.3); i <= Math.ceil(r * 1.3); i++) {
      const q = (i / (r * 1.3)) ** 2 + (j / r) ** 2; if (q > 1) continue; const xx = px + i, yy = py + j;
      if (a * (1 - q * 0.7) > bayer(xx, yy) * 0.9) c.px(xx, yy, mix(c.get(xx, yy), j < -r * 0.3 ? "#FFF6EE" : "#EADFE8", 0.72));
    }
  }
}

// ---------------------------------------------------------------- sky extras: a high jet with a contrail, distant birds
/** A tiny jet crossing the very top of the sky (above the card zone) with a fading contrail; parallax 0.08. */
export function drawJet(c, V, t) {
  const x = R(452 - t * 6.4 - (V.cx + 300) * 0.08), y = R(54 + t * 0.4 + (-160 - V.cy) * 0.08);
  if (x < -40 || x > 600 || y < 2 || y > 94) return;
  // contrail: two thin lines behind (to the right), widening and fading
  for (let d = 4; d < 150; d++) {
    const k = 1 - d / 150, X = x + d, Y = y - R(d * 0.05), spread = d > 40 ? 1 : 0;
    for (const dy of spread ? [-1, 1] : [0]) if (k * 0.85 > bayer(X, Y + dy) && X >= 0 && X < c.w) c.px(X, Y + dy, mix(c.get(X, Y + dy), "#FFE8D8", 0.55 * k + 0.2));
  }
  c.px(x, y, "#FFF6EE"); c.px(x + 1, y, "#FFF6EE"); c.px(x + 2, y, "#D8C8D8"); c.px(x + 1, y - 1, "#E8D8E8"); c.px(x + 1, y + 1, "#E8D8E8");
  if (Math.sin(t * 9) > 0.6) c.px(x - 1, y, "#FF6A6A");
}
/** A few distant birds gliding in a loose loop in front of the low sun (dark silhouettes; FAR depth, parallax 0.3). */
const BIRDS = [[0, 0.0], [1, 0.9], [2, 1.7], [3, 2.6], [4, 3.3]];
export function drawBirds(c, V, t) {
  const ox = 104 - (V.cx + 300) * 0.3, oy = 232 + (-160 - V.cy) * 0.4;
  for (const [i, ph] of BIRDS) {
    const a = t * 0.3 + ph * 0.6, x = R(ox + Math.cos(a) * (46 + i * 5) + Math.sin(t * 0.21 + i) * 8), y = R(oy + Math.sin(a * 1.3) * 22 + i * 4);
    if (x < -6 || x > 546 || y < 0 || y > c.h) continue;
    const flap = Math.sin(t * 6 + i * 1.7), wy = flap > 0.3 ? -1 : flap < -0.3 ? 1 : 0, col = "#2A1428";
    c.px(x, y, col); c.px(x - 1, y + wy, col); c.px(x + 1, y + wy, col); c.px(x - 2, y + wy + (wy ? 0 : 1), col); c.px(x + 2, y + wy + (wy ? 0 : 1), col);
  }
}
