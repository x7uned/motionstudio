// Time of day for the apartment (cat-zoomies film): one continuous function of the hour `tod` (0..24, float) →
// sky colours, interior grading (ambient multiplier, saturation, lift), sun / moon positions in the sky layer, the
// sunlit / moonlit patch on the floor and the light shaft that feeds it. Pure: no state, no randomness.
import { hex } from "../../../../renderer/pixel/raster.mjs";

const c = (s) => hex(s);
const sm01 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const smr = (t, a, b) => sm01((t - a) / (b - a));

// Key moods. Colours are [r,g,b]; amb = per-channel light multiplier on albedo; sat = colour saturation kept;
// add = lift added after the multiply (keeps the night purple instead of black); patch = additive light of the sun patch.
const NIGHT = { sky: [c("#0A0F2E"), c("#121B48"), c("#1F2C66")], amb: [0.15, 0.14, 0.29], sat: 0.45, add: [12, 8, 28], stars: 1,
  cloud: [c("#2E3264"), c("#252A56"), c("#1C2048")], cloudA: 0.45, far: c("#18204C"), near: c("#0C1130"), lit: 0.55,
  sun: c("#FFF4D0"), glow: c("#FFE6A0"), patch: [0.5, 0.3, 0.2], shaft: 0.55 };
const DAWN = { sky: [c("#28336E"), c("#8870A8"), c("#F2A486")], amb: [0.42, 0.36, 0.48], sat: 0.7, add: [10, 6, 18], stars: 0.25,
  cloud: [c("#FAC4B4"), c("#C890A8"), c("#7A6090")], cloudA: 0.75, far: c("#5A5A8E"), near: c("#2E2C58"), lit: 0.25,
  sun: c("#FFC8A0"), glow: c("#FF9A80"), patch: [0.45, 0.28, 0.22], shaft: 0.5 };
const MORNING = { sky: [c("#4A82D4"), c("#8CC2EE"), c("#F6DCB4")], amb: [0.88, 0.84, 0.82], sat: 0.95, add: [4, 3, 8], stars: 0,
  cloud: [c("#FFFFFF"), c("#F2EAF2"), c("#C8C8E2")], cloudA: 0.9, far: c("#A2B6DA"), near: c("#7088BA"), lit: 0.04,
  sun: c("#FFF6D8"), glow: c("#FFE8B0"), patch: [0.7, 0.54, 0.32], shaft: 0.45 };
const DAY = { sky: [c("#3A7CD8"), c("#6AAEEE"), c("#BCE2F8")], amb: [1.0, 0.97, 0.92], sat: 1, add: [0, 0, 0], stars: 0,
  cloud: [c("#FFFFFF"), c("#E6F0FA"), c("#B2CAEA")], cloudA: 1, far: c("#A6C2E6"), near: c("#7A9ACC"), lit: 0,
  sun: c("#FFFAE0"), glow: c("#FFF0B4"), patch: [0.82, 0.56, 0.26], shaft: 0.42 };
const GOLDEN = { sky: [c("#4872C2"), c("#BCB2BA"), c("#F8C474")], amb: [0.95, 0.74, 0.52], sat: 1, add: [6, 2, 0], stars: 0,
  cloud: [c("#FFF2D0"), c("#F8C890"), c("#CE8E80")], cloudA: 1, far: c("#B89EAE"), near: c("#7A6288"), lit: 0.08,
  sun: c("#FFE490"), glow: c("#FFC860"), patch: [0.95, 0.52, 0.16], shaft: 0.62 };
const DUSK = { sky: [c("#2A2A72"), c("#B05A88"), c("#F88E4A")], amb: [0.52, 0.37, 0.46], sat: 0.85, add: [10, 4, 16], stars: 0.12,
  cloud: [c("#FFB49A"), c("#D0708A"), c("#6A4078")], cloudA: 0.95, far: c("#5A3C6E"), near: c("#2A1C44"), lit: 0.38,
  sun: c("#FFA858"), glow: c("#FF7A48"), patch: [0.75, 0.32, 0.2], shaft: 0.6 };
const BLUE = { sky: [c("#14194E"), c("#2C3478"), c("#6C4E90")], amb: [0.25, 0.22, 0.4], sat: 0.6, add: [12, 8, 26], stars: 0.6,
  cloud: [c("#5A4A88"), c("#3E3A70"), c("#2A2A58")], cloudA: 0.55, far: c("#252B5C"), near: c("#10122E"), lit: 0.52,
  sun: c("#FF9050"), glow: c("#FF7040"), patch: [0.5, 0.3, 0.2], shaft: 0.55 };

const KEYS = [[0, NIGHT], [4.6, NIGHT], [5.9, DAWN], [7.3, MORNING], [9, DAY], [16, DAY], [17.5, GOLDEN], [19.5, DUSK], [20.6, BLUE], [21.6, NIGHT], [24, NIGHT]];

function blend(a, b, k) {
  if (typeof a === "number") return a + (b - a) * k;
  if (typeof a[0] === "number") return a.map((v, i) => v + (b[i] - v) * k);
  return a.map((v, i) => blend(v, b[i], k));
}

/** Sun position in the sky layer (p = SKY_P) and how high it is (0 at the horizon, 1 at noon). */
export function sunPos(tod) {
  const u = (tod - 6) / 14, up = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
  return { x: 30 + 150 * u, y: -96 - 140 * Math.pow(up, 0.8), up, vis: smr(tod, 5.6, 6.6) * (1 - smr(tod, 19.9, 20.5)) };
}
/** Moon position in the sky layer and its visibility (night only). */
export function moonPos(tod) {
  const h = ((tod - 19.5) % 24 + 24) % 24, v = h / 11; // 19:30 → 06:30
  const up = v > 0 && v < 1 ? Math.sin(Math.PI * v) : 0;
  return { x: 46 + 120 * v, y: -118 - 112 * Math.pow(up, 0.7), vis: v < 1 ? smr(v, 0.04, 0.14) * (1 - smr(v, 0.86, 0.97)) : 0, v };
}

/** Floor patch geometry shared by the sun and the moon: x range at the wall base, skew per unit of floor depth. */
const PATCH_Y0 = -14, PATCH_Y1 = 54;
function patchFrom(srcX, a, wide) {
  const cx = 105 - (srcX - 105) * 3.5, w = 168 + 72 * wide;
  return { x0: cx - w / 2, x1: cx + w / 2, skew: Math.max(-0.7, Math.min(0.7, (cx - 105) / 180)), y0: PATCH_Y0, y1: PATCH_Y1, a };
}

/** The sunlit patch on the floor for hour tod, measured on the actors' line (wy = 0): { x0, x1, a } (a = strength 0..1). */
export function sunPatch(tod) {
  tod = ((tod % 24) + 24) % 24;
  const s = sunPos(tod), a = smr(tod, 7, 8.6) * (1 - 0.78 * smr(tod, 18.1, 19.6)) * (1 - smr(tod, 19.4, 20.1));
  const p = patchFrom(s.x, a, 1 - s.up), dx = p.skew * (0 - p.y0);
  return { x0: p.x0 + dx, x1: p.x1 + dx, a };
}

/** Everything that depends on the hour. Cheap (~µs); call once per frame. */
export function environment(tod) {
  tod = ((tod % 24) + 24) % 24;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= tod) i++;
  const [ha, A] = KEYS[i], [hb, B] = KEYS[i + 1], k = sm01((tod - ha) / (hb - ha || 1));
  const E = {};
  for (const key of Object.keys(A)) E[key] = blend(A[key], B[key], k);
  E.tod = tod;
  E.sunP = sunPos(tod); E.moonP = moonPos(tod);
  const sa = smr(tod, 7, 8.6) * (1 - 0.78 * smr(tod, 18.1, 19.6)) * (1 - smr(tod, 19.4, 20.1));
  const ma = E.moonP.vis * (1 - smr(tod, 5.0, 6.0)) * 0.6;
  E.beams = [];
  if (sa > 0.002) E.beams.push({ ...patchFrom(E.sunP.x, sa, 1 - E.sunP.up), col: E.patch, shaft: E.shaft * (1 - 0.62 * E.sunP.up), motes: 1 });
  if (ma > 0.002) E.beams.push({ ...patchFrom(E.moonP.x, ma, 0.2), col: [0.24, 0.27, 0.5], shaft: 0.6, motes: 0.4 });
  // how much "night" there is (0 day … 1 deep night): luminous clock marks, star twinkle, lit windows
  E.dark = Math.max(0, Math.min(1, 1 - (E.amb[0] + E.amb[1] + E.amb[2]) / 2.2));
  return E;
}
