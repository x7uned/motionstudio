// Geometry + timeline for «Акварель и маркер». Pure functions of time (seconds) — no randomness.

export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  paper: "#F2E9D8",
  ink: "#2B2733",
  graphite: "#4A4450",
  indigo: "#3F4F8A",
  terracotta: "#C8694F",
  sage: "#7F9A77",
  mustard: "#D9A441",
  rose: "#D98C8F",
  cream: "#F5E6C4",
  badgeText: "#FBF6EC",
};

export const PACKET_COLORS = [C.terracotta, C.sage, C.mustard, C.rose];
export const FRAGS = ["Пр", "ив", "ет", "!"];
export const MESSAGE = "Привет!";

// --- layout ---
export const LAPTOP = {x: 60, y: 1218}; // sprite top-left
export const BUTTON_C = {x: 320, y: 1428};
export const CARD_SCREEN = {x: 320, y: 1332, s: 0.68};
export const CARD_SPLIT = {x: 440, y: 1150, s: 1};
export const CARD_FINAL = {x: 360, y: 660, s: 1};
export const CARD_W = 480;
export const CARD_H = 120;
export const PACKET = 120;
export const ROW_Y = 1150;
export const ROW_X = [206, 362, 518, 674];
export const ROUTERS = [
  {x: 190, y: 930},
  {x: 540, y: 985},
  {x: 880, y: 930},
];
export const SERVER_C = {x: 800, y: 650};
export const ORB_C = {x: 800, y: 584};
export const TRAY_Y = 660;
export const SLOT_X = [128, 276, 424, 572];
export const CHECK_C = {x: 628, y: 606};

// --- easing ---
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const prog = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeIn = (x: number) => x * x * x;
export const easeOutBack = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (t: number, a: number, b: number) => easeInOut(prog(t, a, b));
// one-shot bump 0→1→0 between a and b
export const bump = (t: number, a: number, b: number) => {
  const k = prog(t, a, b);
  return k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k);
};
// standard reveal (MOTION-RULES: 0.88→1, 18 px → 0, easeOut)
export const reveal = (t: number, start: number, dur = 0.45) => {
  const k = easeOut(prog(t, start, start + dur));
  return {a: k, s: 0.88 + 0.12 * k, dy: 18 * (1 - k)};
};

// --- routes ---
export type Pt = {x: number; y: number};
export type Route = {
  pts: Pt[];
  cum: number[];
  len: number;
  dep: number;
  arr: number;
  slot: number;
  via: number[];
  viaFrac: number[];
};

const catmull = (ctrl: Pt[], perSeg = 60): Pt[] => {
  const out: Pt[] = [];
  const P = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    for (let j = 0; j < perSeg; j++) {
      const t = j / perSeg;
      const t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
};

const ROUTE_DEF = [
  // packet 1 → R1 → slot 1 (arrives 2nd)
  {via: [0], slot: 1, dep: 8.6, arr: 10.2},
  // packet 2 → R2 → R3 → slot 3 (arrives 4th)
  {via: [1, 2], slot: 3, dep: 8.45, arr: 11.25},
  // packet 3 → R2 → slot 0 (arrives 1st)
  {via: [1], slot: 0, dep: 8.05, arr: 9.7},
  // packet 4 → R3 → slot 2 (arrives 3rd)
  {via: [2], slot: 2, dep: 8.3, arr: 10.7},
];

export const ROUTES: Route[] = ROUTE_DEF.map((d, i) => {
  const start = {x: ROW_X[i], y: ROW_Y};
  const end = {x: SLOT_X[d.slot], y: TRAY_Y};
  const ctrl: Pt[] = [start, {x: start.x, y: start.y - 55}, ...d.via.map((r) => ROUTERS[r]), {x: end.x, y: end.y + 85}, end];
  const pts = catmull(ctrl);
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  const len = cum[cum.length - 1];
  const viaFrac = d.via.map((r) => {
    let best = 0;
    let bd = Infinity;
    pts.forEach((p, k) => {
      const dd = Math.hypot(p.x - ROUTERS[r].x, p.y - ROUTERS[r].y);
      if (dd < bd) {
        bd = dd;
        best = k;
      }
    });
    return cum[best] / len;
  });
  return {pts, cum, len, dep: d.dep, arr: d.arr, slot: d.slot, via: d.via, viaFrac};
});

export const routeFrac = (r: Route, t: number) => easeInOut(prog(t, r.dep, r.arr));

export const pointAt = (r: Route, frac: number): {p: Pt; ang: number} => {
  const target = frac * r.len;
  let lo = 0;
  let hi = r.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (r.cum[mid] < target) lo = mid;
    else hi = mid;
  }
  const seg = r.cum[hi] - r.cum[lo] || 1;
  const k = clamp01((target - r.cum[lo]) / seg);
  const a = r.pts[lo];
  const b = r.pts[hi];
  return {p: {x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k)}, ang: Math.atan2(b.y - a.y, b.x - a.x)};
};

// time at which the eased route reaches a given fraction (bisection; deterministic)
export const timeAtFrac = (r: Route, frac: number) => {
  let lo = r.dep;
  let hi = r.arr;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (routeFrac(r, mid) < frac) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

export const ROUTER_PASSES: {router: number; time: number; packet: number}[] = ROUTES.flatMap((r, i) =>
  r.via.map((router, j) => ({router, time: timeAtFrac(r, r.viaFrac[j]), packet: i})),
);
