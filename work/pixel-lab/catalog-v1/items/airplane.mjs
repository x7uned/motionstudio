// catalog-v1 item «airplane»: the airliner from the «plane» film (plane/film/plane.mjs#drawPlane, copied and reworked here):
// the banded lilac hull, tail fin + stabiliser, cockpit windshield, near wing with the shaded engine nacelle, exhaust shimmer
// and the blinking lights. Catalog changes: the cabin cut-away is replaced by a closed hull with a row of passenger windows
// (nobody inside, no hero, no stripe lettering), everything is drawn through one rotation so the plane can pitch (climb /
// descend) and bank (far wing rises above the hull, near wing and engine drop), a dark outline reads on bright skies, the
// nav-light blinks became smooth glows and a soft contrail can stream behind the engine.
import { bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth as spline, drawPart } from "./lib/shade.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const HULL = [[-150, -62], [180, -62], [205, -58], [222, -48], [234, -32], [240, -14], [238, 0], [232, 10], [220, 16], [200, 18], [-110, 18], [-150, 12], [-185, 0], [-215, -18], [-226, -30], [-226, -40], [-200, -50], [-170, -58]];
const FIN = [[-226, -40], [-238, -150], [-214, -150], [-170, -58]];
const ENG = ["#1A1830", "#2E2A48", "#4A4466", "#6E688E", "#8C86AC", "#B4AECC", "#D8D2E8", "#F0ECF8"];
const OUT = "#1E1A3A", S0 = 0.45, AX = 0, AY = -30;
const gl = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

export default {
  kind: "airplane",
  covers: ["airplane"],
  source: "plane/film/plane.mjs#drawPlane",
  desc: "side view airliner flying right: lilac hull, tail fin, wing, engine; cruises, banks, climbs, descends, leaves a contrail",
  hw: 110, hh: 60,
  start: "cruises level, engine shimmer, lights glowing",
  states: {
    cruise: [0.7, "flies level and steady"],
    bank: [0.9, "rolls into a turn: far wing rises, near wing and engine dip", "whoosh"],
    climb: [0.9, "nose lifts and the plane climbs", "rise"],
    descend: [0.9, "nose drops and the plane descends", "swish"],
    contrail: [0.8, "a white contrail streams out behind the engine", "appear"],
  },
  // pitch: +1 nose up … -1 nose down · bank: roll into a turn · trail: contrail strength
  base: { pitch: 0, bank: 0, trail: 0 },
  st: { cruise: { pitch: 0, bank: 0 }, bank: { pitch: 0.12, bank: 1 }, climb: { pitch: 1, bank: 0 }, descend: { pitch: -0.85, bank: 0 }, contrail: { pitch: 0, bank: 0, trail: 1 } },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Film art kept (hull bands, fin, wing, nacelle with fan lines, windshield, exhaust shimmer). Banking is a side-view cheat (far wing rises behind the hull, near wing/engine drop, 0.04 rad extra roll), not a true 3D roll. Hull shading recolours the hull base tone per pixel by rotated height, so it stays in the plane's frame while pitching. Passenger windows are new small dark squares (no figures). The trail rotates with the plane. No livery/lettering.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, bob = Math.sin(t * 0.9) * 0.6;
    const ang = -0.3 * v.pitch + 0.04 * v.bank, ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (u) => { const dx = u[0] - AX, dy = u[1] + bob - AY; return [cx + (dx * ca - dy * sa) * S, cy + (dx * sa + dy * ca) * S]; };
    const Q = (u) => P(u).map(R), poly = (pts, col) => c.poly(pts.map(Q), col);
    const outline = (pts, col = OUT) => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), col); } };
    const bk = v.bank, tr = clamp01(v.trail);
    // contrail behind (drawn first)
    if (tr > 0.01) for (let k = 0; k < 16; k++) {
      const ph = (t * 0.45 + k / 16) % 1, e = Math.sin(Math.PI * Math.min(1, ph * 6)) * (1 - ph) * tr;
      const [x, y] = P([-62 - ph * 175, 37 + bk * 10 + Math.sin(t * 2 + k * 1.7) * 1.5]);
      fade(c, Math.min(0.9, e * 1.3)).disc(R(x), R(y), Math.max(1, R((2.5 + ph * 7) * S)), k % 2 ? "#E8E4F4" : "#F8F6FF");
    }
    // far wing (rises above the hull when banking)
    if (bk > 0.01) { const h = 46 * bk * bk * 0.5 + 23 * bk, fw = [[-60, -55], [52, -55], [24, -55 - h], [-70, -55 - h * 0.85]], g = c; g.poly(fw.map(Q), "#8C86AC"); const pp = fw.map(P); for (let i = 0; i < 4; i++) { const a = pp[i], b = pp[(i + 1) % 4]; g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), OUT); } }
    // tail fin + stabiliser
    poly(FIN, "#B4AECC"); outline(FIN.map(P));
    const stab = [[-232, -140], [-226, -100], [-206, -100], [-214, -140]]; poly(stab, "#6E4FB0"); outline(stab.map(P));
    // hull: banded shading (rotated height), outline
    const hp = spline(HULL.map(P), new Set([0, 1, 10, 15, 16]), 4), hq = hp.map(([x, y]) => [R(x), R(y)]);
    c.poly(hq, "#C8C4DC");
    { const xs = hq.map((p) => p[0]), ys = hq.map((p) => p[1]), x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(c.w - 1, Math.max(...xs)), y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(c.h - 1, Math.max(...ys));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const o2 = c.get(x, y); if (o2[0] !== 200 || o2[1] !== 196 || o2[2] !== 220) continue;
        const dx = (x - cx) / S, dy = (y - cy) / S, ly = dx * -sa + dy * ca + AY - bob, k = (ly + 62) / 80;
        c.px(x, y, k < 0.08 ? "#E8E4F4" : k + (bayer(x, y) - 0.5) * 0.12 < 0.55 ? "#C8C4DC" : k < 0.8 ? "#9A94B8" : "#6E688E");
      } }
    outline(hq);
    // cheatline (plain lilac stripe) and passenger windows
    { const a = P([-224, -22]), b = P([-150, -20]); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#6E4FB0"); const a2 = P([150, -20]), b2 = P([222, -22]); c.line(R(a2[0]), R(a2[1]), R(b2[0]), R(b2[1]), "#6E4FB0"); }
    for (let i = 0; i < 22; i++) { const wx = -140 + i * 13.2, [x, y] = P([wx, -36]), w = Math.max(2, R(5 * S)), h = Math.max(3, R(7 * S)); c.rect(R(x - w / 2), R(y - h / 2), w, h, "#16123A"); c.rect(R(x - w / 2), R(y - h / 2), w, 1, "#5E5478"); }
    // cockpit windshield
    poly([[202, -57], [222, -48], [230, -36], [212, -36]], "#16123A");
    for (let k = 0; k < 6; k++) { const a = P([206 + k * 3, -52 + k * 2]); c.px(R(a[0]), R(a[1]), k % 2 ? "#5E5478" : "#FDFEED"); }
    { const a = Q([212, -54]), b = Q([220, -38]); c.line(a[0], a[1], b[0], b[1], "#8C84B4"); }
    // near wing + engine (drop when banking)
    const dw = 22 * bk, wing = [[-80, 14], [64, 12], [44, 20 + dw], [-92, 24 + dw * 1.2]];
    poly(wing, "#9A94B8"); outline(wing.map(P)); { const a = Q([-80, 14]), b = Q([64, 12]); c.line(a[0], a[1], b[0], b[1], "#E8E4F4"); }
    { const ey = 10 * bk, E = ([a, b]) => [a, b + ey];
      poly([[-34, 18], [-4, 18], [2, 28 + ey], [-28, 28 + ey]], "#6E688E");
      drawPart(c, [spline([[-50, 30], [18, 27], [25, 30], [25, 43], [18, 46], [-50, 44], [-58, 40], [-58, 34]].map(E).map(P), new Set([1, 2, 3, 4]), 4)], { ramp: ENG, base: 4.2, gain: 1.5, slope: 1.6, thick: 6 * S, light: [-0.25, -0.95], outline: ENG[0] });
      const [ix, iy] = P([24, 36.5 + ey]); c.ellipse(R(ix), R(iy), Math.max(1, R(2.6 * S)), Math.max(2, R(8 * S)), "#120E20");
      for (let k = -3; k <= 3; k++) { const fy = R(iy + k * 2 * S + ((t * 30) % 2) * S); c.rect(R(ix - S), fy, Math.max(1, R(1.5 * S)), 1, "#4A4466"); }
      c.ellipse(R(ix + 0.6 * S), R(iy), Math.max(1, R(1.4 * S)), Math.max(2, R(8.4 * S)), "#D8D2E8");
      poly([[-58, 33 + ey], [-66, 36 + ey], [-66, 39 + ey], [-58, 41 + ey]], "#2E2A48");
      // exhaust shimmer
      for (let k = 0; k < 10; k++) { const ph = (t * 3 + k * 0.1) % 1, a = P([-50 - ph * 60, 36 + ey + Math.sin(t * 7 + k) * 2]); fade(c, 0.35 * (1 - ph) * Math.sin(Math.PI * Math.min(1, ph * 5))).rect(R(a[0]), R(a[1]), Math.max(1, R(3 * S)), Math.max(1, R(1.2 * S)), "#8C84B4"); } }
    // lights: smooth glows (film blinked hard)
    { const a = P([-238, -150]), k = gl((Math.sin(t * 4) - 0.2) / 0.8); fade(c, k).rect(R(a[0]) - 1, R(a[1]) - 1, 3, 3, "#FDFEED");
      const w = P([60, 14 + dw * 0.6]), k2 = gl((Math.sin(t * 2.5) + 1) / 2); c.rect(R(w[0]), R(w[1]), 2, 2, "#7A2030"); fade(c, k2).rect(R(w[0]), R(w[1]), 2, 2, "#E03056"); }
    const nose = P([240, -14]), tail = P([-238, -150]);
    return { box: { x0: R(cx - 106 * z), y0: R(cy - 54 * z), x1: R(cx + 106 * z), y1: R(cy + 50 * z) }, pt: [cx, cy], nose, tail };
  },
};
