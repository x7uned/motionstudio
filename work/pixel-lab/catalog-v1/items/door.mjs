// catalog-v1 item «door»: the interior door of the cat-zoomies apartment (cat-zoomies/film/apartment-props.mjs#drawDoor:
// pale painted leaf with two recessed panels, brass knob, white casing, dim hallway behind the opening). The film drew the
// leaf at one fixed open angle in the apartment scratch buffer; here the same parts are drawn straight through the canvas
// view and the leaf swings continuously: its free edge sweeps in from the closed front view (full width) to a narrow
// foreshortened slab, nearer edge taller (perspective), panels/knob follow. Palette = the film's PAL.trim / PAL.brass.

const trim = ["#5A5048", "#9A9084", "#BEB4A6", "#D8D0C2", "#ECE6DA", "#F8F4EC", "#FFFFFF"];
const brass = ["#3A2A10", "#664A1A", "#946E26", "#BE9438", "#DCB856", "#F0D888", "#FBEFC0"];
const O = "#0B0812", R = Math.round;
const HALF = 34, TOPL = -108, BOT = 114;       // opening half width, leaf top / bottom (door units at z 1, y up = negative)
const MAXA = 1.38;                             // radians of swing at ang = 1 (~79 deg)

export default {
  kind: "door",
  covers: ["door"],
  source: "cat-zoomies/film/apartment-props.mjs#drawDoor",
  desc: "tall white interior door in a casing; swings closed, ajar or wide open, and shakes when knocked",
  hw: 44, hh: 120, start: "stands closed",
  states: {
    closed: [0.6, "the door is shut"],
    ajar: [0.8, "the door swings open a little, the dim hallway shows", "creak"],
    open: [0.9, "the door swings wide open", "creak"],
    knock: [0.5, "the shut door shakes under knocking", "thump"],
  },
  base: { ang: 0 },
  st: { closed: { ang: 0 }, ajar: { ang: 0.33 }, open: { ang: 1 }, knock: { ang: 0 } },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Economy port. Film door had one fixed open pose; swing is interpolated from the film parts (leaf, two panels, brass knob, casing, dim doorway). Hallway behind is a plain warm-grey recess with a dithered side shade (film: doorway recess). Knock = a damped 2-3 px shake of the free edge on a sine of t, enveloped by s.acc (ramps in/out).",
  draw(c, cx, cy, z, t, s) {
    const a = s.v.ang, th = a * MAXA, cs = Math.cos(th), sn = Math.sin(th);
    const k = s.acc("knock", 0, 0.9), env = Math.sin(Math.PI * k) * (1 - 0.35 * k);
    const sh = env * Math.sin(t * 46) * 1.8;                     // knock shake (door units)
    const X = (u) => R(cx + u * z), Y = (v) => R(cy + v * z);
    // doorway recess (hallway): warm grey, darker toward the hinge side, bayer-dithered seam
    const x0 = X(-HALF), x1 = X(HALF), yT = Y(TOPL - 4), yB = Y(BOT);
    c.rect(x0, yT, x1 - x0, yB - yT, "#8C7A70");
    c.tint(x0, yT, x1 - x0, yB - yT, (x) => 0.5 - 0.5 * (x - x0) / Math.max(1, x1 - x0), "#2A2030", 4);
    c.tint(x0, yT, x1 - x0, yB - yT, (x, y) => (y - yT) / Math.max(1, yB - yT) * 0.25, "#2A2030", 4);
    // leaf: hinge on the left; free edge x and height follow the swing
    const hx = -HALF, fx = hx + 2 * HALF * cs + sh, ph = 1 + 0.09 * sn;       // free edge is nearer -> taller
    const ht = TOPL - 2, hb = BOT - 2, ft = ht * ph + 3 * sn, fb = hb * ph + 3 * sn - 1 * sn;
    const edge = (u, v0) => [hx + (fx - hx) * u, (ht + (ft - ht) * u) + 0, (hb + (fb - hb) * u)]; // x, top, bottom at u
    const P = (u, yy) => { const e = edge(u); const top = e[1], bot = e[2]; return [X(e[0]), Y(top + (bot - top) * yy)]; };   // yy 0..1 along leaf height
    const body = trim[2], face = trim[4];
    c.poly([P(0, 0), P(1, 0), P(1, 1), P(0, 1)], face);
    // hinge-side shade strip and free-edge thickness (leaf edge, visible as it opens)
    c.poly([P(0, 0), P(0.1, 0), P(0.1, 1), P(0, 1)], trim[3]);
    if (sn > 0.04) {
      const th2 = 2.2 * sn * z;
      c.poly([P(1, 0), [P(1, 0)[0] + th2, P(1, 0)[1] - 1], [P(1, 1)[0] + th2, P(1, 1)[1] + 1], P(1, 1)], body);
    }
    // two recessed panels
    for (const [ya, yb] of [[0.1, 0.46], [0.54, 0.9]]) {
      const q = [P(0.22, ya), P(0.84, ya), P(0.84, yb), P(0.22, yb)];
      c.poly(q, trim[3]);
      for (let i = 0; i < 4; i++) { const p = q[i], n = q[(i + 1) % 4]; c.line(p[0], p[1], n[0], n[1], i < 2 ? trim[1] : trim[5]); }
    }
    // outline
    const o = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
    for (let i = 0; i < 4; i++) { const p = o[i], n = o[(i + 1) % 4]; c.line(p[0], p[1], n[0], n[1], i === 3 ? trim[1] : O); }
    // brass knob on the free-edge side (disappears behind the edge only by sliding with it)
    const kp = P(0.9, 0.58), kr = Math.max(1, R(2.4 * z));
    c.disc(kp[0], kp[1], kr, brass[4]); c.px(kp[0] - Math.max(1, R(0.6 * z)), kp[1] - Math.max(1, R(0.6 * z)), brass[6]);
    // casing (jambs + head), drawn over the leaf like the film
    const cas = (ax, ay, bx, by) => {
      const xa = X(ax), ya = Y(ay), w = Math.max(2, X(bx) - xa), h = Y(by) - ya;
      c.rect(xa, ya, w, h, trim[4]); c.rect(xa + 1, ya + 1, w - 2, 1, trim[6]); c.rect(xa + 1, ya + 1, 1, h - 2, trim[6]);
      c.rect(xa + w - 2, ya + 1, 1, h - 2, trim[2]); c.rect(xa + 1, ya + h - 2, w - 2, 1, trim[2]); c.frame(xa, ya, w, h, O);
    };
    cas(-HALF - 6, TOPL - 10, -HALF + 1, BOT + 2);
    cas(HALF - 1, TOPL - 10, HALF + 6, BOT + 2);
    cas(-HALF - 6, TOPL - 10, HALF + 6, TOPL - 3);
    return { box: { x0: X(-HALF - 6), y0: Y(TOPL - 10), x1: X(HALF + 6), y1: Y(BOT + 2) }, pt: [X(0), Y(0)] };
  },
};
