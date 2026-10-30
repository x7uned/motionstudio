// ed138 backdrop «night-mountain» (new, 2026-10-28): a high desert summit at night under the Milky Way — after the Andes look
// of Cerro Pachón, not a map: a faint warm airglow on the horizon, a far snow-capped range, a sea of clouds drifting in the
// valley, a darker middle range and the near summit plateau (a prop such as the observatory stands at x 270, y 600 at the wide
// shot), all with craggy lit facets (light from the upper left), flat bands and dithered seams. The sky is backdrop-milky-way.
// draw(c, cam, t); drawLand(c, cam, t) draws only the land (the film pans the sky separately). Pure.
import { layer, band, tintPx, clamp01 } from "../lib/layout.mjs";
import { RGB, fbm, vn, sstep, R } from "../lib/bd1-kit.mjs";
import { drawSky } from "./backdrop-milky-way.mjs";

const FAR = RGB(["#0C0B20", "#131130", "#1B1842", "#252052", "#302A64", "#3E3878", "#524C8E", "#6C66A6"]);
const SNOW = RGB(["#2A2850", "#3A3866", "#4E4C7E", "#666498", "#8280B2", "#A09ECA", "#C0BEE0", "#E2E0F4"]);
const CLOUD = RGB(["#16142E", "#201E40", "#2C2A54", "#3A386A", "#4C4A80", "#625F98", "#7E7BB2", "#A09DCC"]);
const MID = RGB(["#07070F", "#0C0B18", "#121022", "#19162E", "#211D3A", "#2A2548", "#352F58", "#433C6A"]);
const NEAR = RGB(["#060510", "#0B0918", "#110E22", "#18142E", "#201A3A", "#2A2248", "#352C58", "#443A6C"]);
export const SUMMIT = { x: 270, y: 600 };                              // the plateau top where a prop stands (p = 1)

const ridgeFar = (x) => 492 - 74 * Math.pow(fbm(x / 190, 3.1, 61, 3), 1.5) - 18 * vn(x / 30, 1.7, 62);
const ridgeMid = (x) => { const side = sstep(70, 250, Math.abs(x - SUMMIT.x)); return 660 - 120 * side - 34 * fbm(x / 110, 5.3, 71, 3) - 8 * vn(x / 20, 2.2, 72); };
const ridgeNear = (x) => { const d = Math.abs(x - SUMMIT.x) - 118, sl = d > 0 ? 0.0036 * d * d + 0.18 * d : 0; return SUMMIT.y + sl + (d > -8 ? 4 * (vn(x / 11, 4.4, 81) - 0.5) * clamp01((d + 8) / 30) : 0); };
const cloudTop = (x, t) => 532 + 7 * Math.sin((x + t * 4) / 41) + 9 * (fbm((x + t * 6) / 90, 1.2, 91, 2) - 0.5);

/** craggy facet shading: lit where the local height field rises to the right (faces the light on the left) */
/** rock strata facets: sheared cells, each lit / mid / shadow; the lit ones only on their left (light) part */
function strata(wx, wy, s, seed) {
  const v = wy / (17 * s) + 0.9 * vn(wx / (36 * s), 0, seed), iv = Math.floor(v), u = wx / (46 * s) + wy / (60 * s) + 7.3 * vn(iv * 3.1, 1, seed + 2), iu = Math.floor(u), h = vn(iu * 1.7, iv * 2.3, seed + 5);
  const fu = u - iu, fv = v - iv, calm = vn(wx / (120 * s), wy / (90 * s), seed + 9);
  if (calm < 0.38) return (h - 0.5) * 0.06;                                         // smooth scree between the ledges
  if (fv < 0.14 && h > 0.4) return -0.12;                                           // the dark seam under each ledge
  return h > 0.62 ? (fu < 0.55 ? 0.17 : 0.06) : h < 0.36 ? -0.08 : 0.02;
}
function crag(wx, wy, s, seed) { const h = (x, y) => fbm(x / (26 * s) + y / (70 * s), y / (44 * s), seed, 2); const g = (h(wx + 2, wy) - h(wx - 2, wy)) * 6; return g > 0.04 ? 0.16 : g < -0.04 ? -0.1 : 0; }

function range(c, cam, p, ridge, ramp, o) {
  const V = layer(cam, p);
  for (let x = 0; x < c.w; x++) {
    const wx = V.wx(x + 0.5), ry = ridge(wx), sy = Math.max(0, Math.round(V.Y(ry)));
    for (let y = sy; y < c.h; y++) {
      const wy = V.wy(y + 0.5), depth = wy - ry;
      let v = o.base + o.lift * Math.exp(-depth / o.fall) + o.crag * (o.strata ? strata(wx, wy, o.s, o.seed) : crag(wx, wy, o.s, o.seed)) - o.down * clamp01(depth / 260);
      if (depth < 1.2 / V.z) v = o.edge;                                       // lit rim on the ridge line
      let rp = ramp;
      if (o.snow) { const peak = clamp01((o.snow - ry) / 50), sd = 22 * peak * (0.6 + 0.6 * vn(wx / 9, wy / 9, 66)); if (depth < sd) { rp = SNOW; v = 0.42 + 0.32 * clamp01(crag(wx, wy, o.s, o.seed) + 0.4) - 0.2 * (depth / Math.max(1, sd)); } }
      c.px(x, y, band(rp, v, x, y, 0.4));
    }
  }
}
function clouds(c, cam, t, p) {
  const V = layer(cam, p);
  for (let x = 0; x < c.w; x++) {
    const wx = V.wx(x + 0.5), ct = cloudTop(wx, t), sy = Math.max(0, Math.round(V.Y(ct))), y1 = Math.min(c.h, Math.round(V.Y(ct + 120)));
    for (let y = sy; y < y1; y++) {
      const wy = V.wy(y + 0.5), depth = wy - ct, bill = fbm((wx + t * 6) / 34, wy / 18, 93, 3);
      let v = 0.7 - depth / 120 + 0.32 * (bill - 0.5) + (depth < 1.5 ? 0.12 : 0);
      c.px(x, y, band(CLOUD, v, x, y, 0.45));
    }
  }
}
// the switchback road down the near slope (dusty pale line, two dim car lights crawling up), at p = 1
const ROAD = [[300, 604], [372, 640], [210, 700], [420, 780], [150, 880], [360, 990]];
function road(c, cam, t) {
  const V = layer(cam, 1);
  for (let k = 0; k + 1 < ROAD.length; k++) { const [ax, ay] = ROAD[k], [bx, by] = ROAD[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) * V.z);
    for (let i = 0; i <= n; i++) { const u = i / n, wx = ax + (bx - ax) * u, wy = ay + (by - ay) * u + 6 * Math.sin(u * Math.PI), X = R(V.X(wx)), Y = R(V.Y(wy)); if (Y < 0 || Y >= c.h) continue;
      c.px(X, Y, "#3E3658"); c.px(X, Y + 1, "#2A2440"); if (V.z > 1.4) c.px(X + 1, Y, "#3E3658"); } }
  for (const [ph, col] of [[0.1, "#F4CA50"], [0.55, "#F29050"]]) { const u = ((t * 0.018 + ph) % 1) * (ROAD.length - 1), k = Math.floor(u), f = u - k, [ax, ay] = ROAD[ROAD.length - 1 - k], [bx, by] = ROAD[Math.max(0, ROAD.length - 2 - k)], X = R(V.X(ax + (bx - ax) * f)), Y = R(V.Y(ay + (by - ay) * f + 6 * Math.sin(f * Math.PI)) - 1);
    c.px(X, Y, col); tintPx(c, X - 1, Y, col, 0.5, 4); tintPx(c, X + 1, Y, col, 0.5, 4); tintPx(c, X, Y - 1, col, 0.35, 4); }
}
export function drawLand(c, cam, t) {
  // warm faint airglow over the far range
  { const V = layer(cam, 0.5); for (let x = 0; x < c.w; x++) { const sy = V.Y(ridgeFar(V.wx(x + 0.5))); for (let y = Math.max(0, Math.round(sy - 120 * V.z)); y < Math.min(c.h, sy); y++) { const k = Math.pow(clamp01(1 - (sy - y) / (120 * V.z)), 2); tintPx(c, x, y, y > sy - 40 * V.z ? "#5A3E62" : "#3A2E62", 0.42 * k, 4); } } }
  range(c, cam, 0.5, ridgeFar, FAR, { base: 0.42, lift: 0.16, fall: 40, crag: 0.9, down: 0.2, edge: 0.72, s: 1.2, seed: 63, snow: 470 });
  clouds(c, cam, t, 0.62);
  range(c, cam, 0.78, ridgeMid, MID, { base: 0.38, lift: 0.22, fall: 30, crag: 1, down: 0.22, edge: 0.78, s: 1.1, seed: 73, strata: true });
  range(c, cam, 1, ridgeNear, NEAR, { base: 0.44, lift: 0.26, fall: 30, crag: 1, down: 0.2, edge: 0.9, s: 1.3, seed: 83, strata: true });
  road(c, cam, t);
}

export default {
  kind: "night-mountain",
  backdrop: true,
  covers: ["mountain at night", "night mountains", "andes", "summit", "observatory site", "chile mountains", "sea of clouds"],
  source: "ed138 (new)",
  desc: "a summit at night: Milky Way sky, far snowy range, sea of clouds, dark plateau top",
  theme: { accent: "#9CC8FF", gold: "#F4D88A", hot: "#FFF0C0", core: "#FFFFFF", stone: ["#0C0A24", "#1A1442", "#07061A"], beam: "#8CA8F0" },
  draw(c, cam, t) { drawSky(c, cam, t); drawLand(c, cam, t); },
  notes: "props stand on the plateau at y 600 (x 150–390); the slope below fills the frame to the bottom edge; clouds drift slowly",
};
