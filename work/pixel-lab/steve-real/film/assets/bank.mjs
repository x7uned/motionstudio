import { RP, bd, bayer, R, OL, TAU, clamp01, sm, lerp, mix, fade, sparkle, cshadow, halo, starP, cached, blit } from "../lib/money-kit.mjs";

const ST = RP.stone, COLS = [-85, -51, -17, 17, 51, 85], CW = 16, TOP = -50, BOT = 50;
const OX0 = 122, OY0 = 108;
const WD = ["#141A44", "#1C2458", "#283170", "#34407E", "#4A5A9A", "#6A7CC0"], WL = ["#E8A83A", "#FFD36A", "#FFE38E", "#FFF0B8", "#FFF6CE", "#FFFFFF"];
const DD = ["#1A0E04", "#2A1608", "#44280C", "#6A4018", "#7A4A18", "#8C5A22"];
const hx = (c) => c;
function paint(c, ox, oy, z, L, G) {
  const X = (x) => R(ox + x * z), Y = (y) => R(oy + y * z), W = (a, b) => Math.max(1, R(ox + b * z) - R(ox + a * z)), Hh = (a, b) => Math.max(1, R(oy + b * z) - R(oy + a * z));
  const rect = (x0, y0, x1, y1, col) => c.rect(X(x0), Y(y0), W(x0, x1), Hh(y0, y1), col);
  const frame = (x0, y0, x1, y1) => { c.rect(X(x0) - 1, Y(y0) - 1, W(x0, x1) + 2, Hh(y0, y1) + 2, OL); };
  // back wall (dark stone with faint courses)
  frame(-93, TOP, 93, BOT); 
  for (let y = Y(TOP); y < Y(BOT); y++) for (let x = X(-93); x < X(93); x++) c.px(x, y, bd(ST, 1.9 + ((y - Y(TOP)) % R(8 * z) === 0 ? -0.5 : 0) + (x - X(-93)) / (186 * z) * 0.4, x, y));
  // windows (gaps -68, -34, 34, 68) and door (gap 0)
  for (const gx of [-68, -34, 34, 68]) {
    frame(gx - 6, -26, gx + 6, 2); rect(gx - 7, 2, gx + 7, 4, ST[5]);
    for (let y = Y(-26); y < Y(2); y++) for (let x = X(gx - 6); x < X(gx + 6); x++) { const idx = 0.4 + (y - Y(-26)) / (28 * z) * 3.4 + (x - X(gx - 6)) / (12 * z) * 0.8; c.px(x, y, bd(L > bayer(x, y) ? WL : WD, idx, x, y)); }
    rect(gx - 0.5, -26, gx + 0.5, 2, "#10163A"); rect(gx - 6, -12, gx + 6, -11, "#10163A");
  }
  // door
  frame(-7, 12, 7, BOT);
  for (let y = Y(12); y < Y(BOT); y++) for (let x = X(-7); x < X(7); x++) {
    const dy = (y - Y(12)) / (38 * z), arch = Math.hypot((x - X(0)) / (7 * z), (y - Y(19)) / (7 * z)), cut = y < Y(19) && arch > 1;
    if (cut) { c.px(x, y, bd(ST, 1.6, x, y)); continue; }
    c.px(x, y, bd(L > bayer(x, y) ? WL : DD, 1.0 + dy * 2.2 + (x < X(0) ? 0.3 : 0), x, y, 0.3));
  }
  rect(-0.5, 22, 0.5, BOT, "#120A04"); c.rect(X(-3), Y(34), 2, 2, RP.gold[5]); c.rect(X(2), Y(34), 2, 2, RP.gold[5]);
  // steps
  const steps = [[96, 50, 54], [100, 54, 58], [104, 58, 62]];
  for (const [w, y0, y1] of steps) { frame(-w, y0, w, y1); for (let y = Y(y0); y < Y(y1); y++) for (let x = X(-w); x < X(w); x++) c.px(x, y, bd(ST, y - Y(y0) < 1.5 * z ? 6.6 : 4.2 - (x - X(-w)) / (2 * w * z) * 1.0, x, y)); }
  if (L > 0.02) { const g = fade(c, L); g.poly([[X(-7), Y(50)], [X(7), Y(50)], [X(34), Y(62)], [X(-34), Y(62)]], "#FFE9A0"); for (let i = 0; i < 3; i++) g.line(X(-5 + i * 5), Y(52), X(-26 + i * 26), Y(62), "#FFF6CE"); }
  // columns: base, shaft with flutes (cylinder shading), capital
  for (const cx0 of COLS) {
    const x0 = cx0 - CW / 2, x1 = cx0 + CW / 2;
    frame(x0 - 2, BOT - 4, x1 + 2, BOT); frame(x0, TOP + 5, x1, BOT - 4);
    for (let y = Y(TOP + 5); y < Y(BOT - 4); y++) for (let x = X(x0); x < X(x1); x++) {
      const u = (x - X(x0)) / Math.max(1, X(x1) - X(x0) - 1), prof = u < 0.18 ? 5.4 + u * 4 : 6.1 - (u - 0.18) * 4.1, fl = Math.abs(((u * 4) % 1) - 0.5) > 0.42 ? -0.7 : 0;
      c.px(x, y, bd(ST, prof + fl - (L > 0 && cx0 !== 85 ? 0 : 0), x, y));
    }
    for (let y = Y(BOT - 4); y < Y(BOT); y++) for (let x = X(x0 - 2); x < X(x1 + 2); x++) c.px(x, y, bd(ST, y - Y(BOT - 4) < z ? 6.4 : 4.4 - (x - X(x0)) / (CW * z) * 1.2, x, y));
    frame(x0 - 3, TOP, x1 + 3, TOP + 5);
    for (let y = Y(TOP); y < Y(TOP + 5); y++) for (let x = X(x0 - 3); x < X(x1 + 3); x++) c.px(x, y, bd(ST, y - Y(TOP) < z ? 6.9 : 4.8 - (x - X(x0 - 3)) / ((CW + 6) * z) * 1.3 - (y - Y(TOP)) * 0.15 / z, x, y));
  }
  // entablature: architrave + dentil frieze
  frame(-98, TOP - 6, 98, TOP); for (let y = Y(TOP - 6); y < Y(TOP); y++) for (let x = X(-98); x < X(98); x++) c.px(x, y, bd(ST, y - Y(TOP - 6) < z ? 6.9 : 5.0 - (y - Y(TOP - 6)) / (6 * z) * 1.2 - (x - X(-98)) / (196 * z) * 0.4, x, y));
  frame(-100, TOP - 14, 100, TOP - 6); for (let y = Y(TOP - 14); y < Y(TOP - 6); y++) for (let x = X(-100); x < X(100); x++) { const d = ((x - X(-100)) % R(6 * z)) < R(3 * z) && y > Y(TOP - 11); c.px(x, y, bd(ST, d ? 3.0 : 5.2 - (x - X(-100)) / (200 * z) * 0.6, x, y)); }
  // pediment: raking cornice + tympanum + medallion
  const APEX = -92, PB = TOP - 14, tri = (inset) => { const w = 104 - inset * 2.6, ay = APEX + inset * 1.0 + 0.0, by = PB - inset * 0.3; return [[X(0), Y(ay)], [X(w), Y(by)], [X(-w), Y(by)]]; };
  c.poly(tri(-1).map(([x, y]) => [x, y]), OL);
  c.poly(tri(0), RP.stone[5], (x, y) => bd(ST, 6.4 - (x - X(-100)) / (200 * z) * 1.4 - (Y(PB) - y) * 0.02 / z, x, y));
  c.poly(tri(5.5), OL);
  c.poly(tri(6.5), RP.stone[2], (x, y) => bd(ST, 3.6 - (x - X(-100)) / (200 * z) * 0.9 + (Y(PB) - y) / (28 * z) * 0.7, x, y));
  // medallion: ring + star (lights up with G)
  const mx = X(0), my = Y(-76), mr = R(9.5 * z);
  c.disc(mx, my, mr + 1, OL); c.disc(mx, my, mr, bd(RP.gold, 4.0, mx, my)); c.disc(mx, my, R(7 * z), RP.gold[1]);
  for (let y = my - mr; y <= my + mr; y++) for (let x = mx - mr; x <= mx + mr; x++) if ((x - mx) ** 2 + (y - my) ** 2 <= (7 * z) ** 2) c.px(x, y, bd(RP.gold, (G > bayer(x, y) ? 4.0 : 1.8) - ((x - mx) + (y - my)) / (14 * z) * 0.5, x, y));
  c.poly(starP(mx, my, 6 * z, 2.6 * z), RP.gold[5], (x, y) => (G > bayer(x, y) ? "#FFFFFF" : RP.gold[5]));
  // contact shadow strip is drawn live
  return {};
}
export default {
  kind: "bank",
  covers: ["bank", "bank building", "bank-building", "treasury", "finance building"],
  source: "init (new)",
  desc: "classical bank: pediment with a gold star medallion, six columns, steps, dark door and windows; no lettering",
  hw: 104, hh: 78, start: "stands in daylight, a sparkle crosses the pediment",
  states: {
    day: [0.4, "stone bank in daylight, windows dark, a glint on the pediment"],
    lights: [0.9, "windows and the door light up warm yellow, light spills on the steps", "glow"],
    glow: [0.9, "golden aura around the whole building, the medallion blazes", "glow"],
  },
  base: { lights: 0, glow: 0 },
  st: { day: { lights: 0, glow: 0 }, lights: { lights: 1, glow: 0 }, glow: { lights: 1, glow: 1 } },
  linear: [],
  demo: {},
  notes: "static facade is a cached sprite per quantised (lights, glow); aura and sparkle are live. No flags, signs or lettering.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, L = R(v.lights * 64) / 64, G = R(v.glow * 64) / 64, OX = R(OX0 * z), OY = R(OY0 * z);
    const e = cached(`b|${R(z * 40)}|${R(L * 64)}|${R(G * 64)}`, OX * 2, OY + 76 * z, (off) => paint(off, OX, OY, z, L, G));
    const X = R(cx), Y = R(cy + 15 * z), bob = 0;
    if (G > 0.01) halo(c, cx, cy, 150 * z, 112 * z, "#FFD24A", 0.95 * G);
    cshadow(c, cx, Y + 66 * z, 104 * z, 6 * z, 0.4);
    blit(c, e.cv, X - OX, Y - OY);
    const ph = (t / 4.4) % 1, sp = Math.sin(Math.PI * clamp01(ph * 3.2)) ** 2 * (ph < 0.31 ? 1 : 0);
    sparkle(c, X + (-60 + ph * 120 * 3.2 * 0.4) * z, Y + (-66 + ph * 3.2 * 8) * z, sp * 6 * z, "#FFFFFF", "#FFF2B8");
    sparkle(c, X, Y - 76 * z, G * (4 + 2.5 * Math.sin(t * 4)) * z * G, "#FFFFFF", "#FFF2B8");
    return { box: { x0: X - 104 * z, y0: Y - 92 * z, x1: X + 104 * z, y1: Y + 62 * z }, pt: [X, Y - 20 * z] };
  },
};
