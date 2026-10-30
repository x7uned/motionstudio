// catalog-v1 item «power-line»: the wooden utility pole with two crossarms, insulators and sagging wires of the
// zombie-mouse town street (zombie-mouse/film/town-street.mjs#powerPole, #wire; colours from town-art.mjs). Copied as
// drawing code with its palette inline (no film import). Changes: the film draws it on a town layout (world x → px);
// here the pole stands on the slot centre and the film's pixel scale is the prop's z. The wires are the film's sagging
// line, extended to both sides, with a sway that changes the sag (drop) on an eased amount with a slow sine.
// Spark is a one-off flash on an insulator (sin of the key's progress, so it swells and dies), hum is an eased
// dithered glow that breathes along the wires.
const R = Math.round;

const OUT = "#0B0812";
const WOOD = ["#1E1418", "#2E1E20", "#402A28", "#543830", "#6A4A3A", "#806048"];   // town-art.mjs WOOD
const RIM0 = "#7A3A50";                                                              // town-art.mjs RIM[0]
const MET = ["#2A2538", "#383246", "#484058", "#5C526C", "#6A6080", "#8A80A0"];     // town-art.mjs METAL (insulators)
const WIRE = "#140F1C";
const GLOW = ["#F4CA50", "#FFE88A", "#FFF6CC"];

const TOP = -85, BASE = 85;        // pole top and foot, local px (the slot centre is the middle of the pole)
const ARM_A = -77, ARM_B = -67;    // crossarm rows (film: top + 8 and top + 18 at 0.6 scale)
const HALF = 118;                  // wire half span
const INS = [-16, -6, 6, 16];      // insulator columns on each arm

export default {
  kind: "power-line",
  covers: ["power-line"],
  source: "zombie-mouse/film/town-street.mjs#powerPole (+ #wire; colours town-art.mjs)",
  desc: "wooden utility pole with two crossarms and sagging wires running off both sides; wires can sway, spark or hum",
  hw: 134, hh: 90,
  start: "stands still, wires hanging straight",
  states: {
    still: [0.5, "stands still, wires hang straight"],
    sway: [0.9, "the wires sway and sag in a breeze", "swish"],
    spark: [0.45, "a short electric flash jumps at an insulator", "zap"],
    hum: [0.8, "a faint glow breathes along the wires", "whirr"],
  },
  // sway: 0..1 wire sway (sag changes) · hum: 0..1 breathing glow along the wires
  base: { sway: 0, hum: 0 },
  st: { still: { sway: 0, hum: 0 }, sway: { sway: 1, hum: 0 }, spark: {}, hum: { sway: 0, hum: 1 } },
  linear: [],
  notes: "Film pole, crossarms, insulators and wire colours kept; the prop is one pole with wires to both sides (the film's wire joins two poles). Sway changes only the sag, not the wire ends. Spark is a one-off flash (dithered halo, four short rays) and returns to rest at its end. Pixel scale follows the zoom; the pole width is 5 px at z 1, as in the film.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, X = (u) => cx + u * z, Y = (w) => cy + w * z;
    const drop = 12 + 6 * v.sway * Math.sin(t * 2.2);               // sag at the far end (always hangs: 6..18 px)
    const wireY = (sg, arm, d) => arm - 3 + drop * (Math.abs(d) / HALF) ** 2;   // d = distance from the pole, sg = side
    // wires: from the outer insulator of each arm straight out to both sides, sagging toward the far end
    for (const sg of [-1, 1]) for (const arm of [ARM_A, ARM_B]) {
      const x0 = sg * 16;
      for (let d = 0; d <= HALF; d++) { const u = x0 + sg * d; c.px(R(X(u)), R(Y(wireY(sg, arm, d))), WIRE); }
    }
    // hum: a dithered glow on the wires, breathing with t, gated by the eased amount
    if (v.hum > 0) {
      const x0 = X(-HALF), x1 = X(HALF), yy0 = Y(ARM_A - 6), yy1 = Y(ARM_B + 24);
      const k = (px, py) => {
        const u = (px - cx) / z, w = (py - cy) / z;
        let best = 9;
        for (const sg of [-1, 1]) for (const arm of [ARM_A, ARM_B]) {
          const d = Math.abs(u - sg * 16); if (d > HALF || (u - sg * 16) * sg < 0) continue;
          best = Math.min(best, Math.abs(w - wireY(sg, arm, d)));
        }
        return best < 9 ? v.hum * 0.42 * (0.6 + 0.4 * Math.sin(t * 3 + u * 0.05)) * (1 - best / 9) : 0;
      };
      c.tint(R(x0), R(yy0), R(x1 - x0), R(yy1 - yy0), k, GLOW[1], 3);
    }
    // pole: 5 px wide with the film's rim light on the left and a dark outline
    const yTop = R(Y(TOP)), yBase = R(Y(BASE));
    for (let yy = yTop; yy < yBase; yy++) {
      c.px(R(X(-2)), yy, OUT); c.px(R(X(-1)), yy, RIM0); c.px(R(X(0)), yy, WOOD[2]); c.px(R(X(1)), yy, WOOD[1]); c.px(R(X(2)), yy, OUT);
    }
    // crossarms: a wood bar with a dark underside, and four insulators on each
    for (const arm of [ARM_A, ARM_B]) {
      const ya = R(Y(arm));
      for (let u = -20; u <= 20; u++) { c.px(R(X(u)), ya, WOOD[2]); c.px(R(X(u)), ya + 1, OUT); }
      for (const ix of INS) {
        const px = R(X(ix)); c.px(px, ya - 1, MET[4]); c.px(px, ya - 2, MET[5]); c.px(px, ya - 3, MET[3]);
      }
    }
    // spark: a one-off flash at the right outer insulator of the upper arm, swelling and dying (sin of the key)
    // cubed envelope: the flash starts with a flat slope, so its first frames stay below the dither levels
    const fl = Math.pow(Math.sin(Math.PI * s.acc("spark")), 3);
    let pt = [X(0), Y(TOP)];
    if (fl > 0) {
      const sx = X(16), sy = Y(ARM_A - 5);
      c.tint(R(sx - 10), R(sy - 10), 21, 21, (px, py) => { const q = Math.hypot(px - sx, py - sy) / 10; return q < 1 ? fl * 0.9 * (1 - q) : 0; }, GLOW[1], 3);
      // rays grow with the flash: each ray adds a pixel as its length passes it (no snap to a long ray)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
        const len = 6 * fl * (dx && dy ? 0.7 : 1);
        for (let i = 1; i <= Math.floor(len); i++) c.px(R(sx + dx * i), R(sy + dy * i), i < 3 ? GLOW[2] : GLOW[0]);
      }
      c.px(R(sx), R(sy), GLOW[2]);
    }
    return { box: { x0: X(-HALF) - 1, y0: yTop - 1, x1: X(HALF) + 1, y1: yBase + 1 }, pt };
  },
};
