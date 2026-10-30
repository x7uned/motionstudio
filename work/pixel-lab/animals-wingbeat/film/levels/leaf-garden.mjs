// Kitchen-garden painters for LV6 · leaf (deterministic, drawn once into cached world layers): a bamboo bean teepee with
// twining scarlet runner beans (trifoliate leaves, red flower sprays, hanging pods), a staked tomato plant with trusses
// of red/orange/green fruit, a white picket fence, a little greenhouse, a raised bed with lettuces, giant mottled squash
// leaves with a yellow blossom, a pumpkin, a watering can, aphids.
import { mix, bayer, rnd, ell, blob, bez, tube } from "../cute.mjs";
import { thick, leafBall } from "./meadow-kit.mjs";
import { leaf, stalk, P } from "./tropic-plants.mjs";

const R = Math.round;
export const G = {
  bean: ["#122C12", "#1C4018", "#28561E", "#366E26", "#468630", "#5A9E3C", "#76B44E", "#9ACA6A"],
  tomato: ["#10281A", "#183A22", "#22502C", "#2E6636", "#3C7E42", "#50964E", "#6CAE60", "#92C47E"],
  cane: ["#3A3018", "#5A4A24", "#7A6632", "#9A8240", "#B89E54", "#D0B86C", "#E2CE88", "#F0E2AE"],
  wood: ["#2A1A0E", "#4A2E18", "#6A4424", "#8A5C32", "#A87642", "#C29058", "#D8AC74", "#EAC896"],
  fruit: ["#3A0608", "#6A0E10", "#9C1A16", "#CC2A1E", "#EE4628", "#FF6E3E", "#FFA070", "#FFD2B0"],
  orange: ["#3A1604", "#6A2C08", "#9C460E", "#CC6416", "#EE8422", "#FCA43A", "#FFC466", "#FFE2A4"],
  green: ["#1A3008", "#2A480C", "#3C6214", "#527C1E", "#6A962A", "#86AE3C", "#A4C656", "#C6DC80"],
  paint: ["#6A6A70", "#8C8C92", "#ACACB0", "#C8C8C8", "#DEDCD6", "#ECEAE2", "#F6F4EE", "#FFFFFF"],
};
const shadeAt = (g, X, Y, ramp, t) => { const fl = Math.floor(t); g.px(X, Y, ramp[Math.max(1, Math.min(ramp.length - 1, t - fl > bayer(X, Y) ? fl + 1 : fl))]); };

/** Shaded ball (fruit, pumpkin rib, lettuce) lit from the upper left. */
export function ball(g, x, y, r, ramp, o = {}) {
  const ribs = o.ribs ?? 0, sy = o.sy ?? 1;
  for (let Y = R(y - r * sy - 1); Y <= R(y + r * sy + 1); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const dx = (X + 0.5 - x) / r, dy = (Y + 0.5 - y) / (r * sy), d = Math.hypot(dx, dy); if (d > 1) continue;
    if (d > 1 - 1.2 / r) { g.px(X, Y, ramp[0]); continue; }
    let t = 3.6 - dx * 1.4 - dy * 1.6 - d * d * 0.8;
    if (ribs) { const rib = Math.abs(Math.sin((Math.asin(Math.max(-1, Math.min(1, dx / Math.sqrt(Math.max(0.01, 1 - dy * dy))))) * ribs))); t -= (1 - rib) ** 6 * 1.6; }
    const hx = dx + 0.38, hy = dy + 0.42; if (hx * hx + hy * hy < 0.03) t = 7.2; else if (hx * hx + hy * hy < 0.07) t += 1.2;
    shadeAt(g, X, Y, ramp, t);
  }
}

/** One bamboo cane from p0 to p1 with nodes. */
function cane(g, p0, p1) {
  const n = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])), pts = [];
  for (let i = 0; i <= n; i += 4) pts.push([p0[0] + ((p1[0] - p0[0]) * i) / n, p0[1] + ((p1[1] - p0[1]) * i) / n]);
  stalk(g, pts, 3.2, 2.4, G.cane, 0);
  for (let i = 30; i < n; i += 38 + (i % 7)) { const k = i / n, x = p0[0] + (p1[0] - p0[0]) * k, y = p0[1] + (p1[1] - p0[1]) * k; for (let d = -3; d <= 3; d++) g.px(R(x + d), R(y), d < 0 ? G.cane[6] : G.cane[2]); }
}
/** Trifoliate bean leaf at (x, y) pointing ang. */
export function beanLeaf(g, x, y, ang, L, seed = 0, ramp = G.bean) {
  const ex = x + Math.cos(ang) * L * 0.35, ey = y + Math.sin(ang) * L * 0.35;
  g.line(R(x), R(y), R(ex), R(ey), ramp[2]);
  leaf(g, ex, ey, ang - 1.05, L * 0.62, { shape: "ovate", W: 0.42, ramp, veins: 4, vk: 0.9, seed: seed + 1, bend: -2 });
  leaf(g, ex, ey, ang + 1.05, L * 0.62, { shape: "ovate", W: 0.42, ramp, veins: 4, vk: 0.9, seed: seed + 2, bend: 2 });
  leaf(g, ex, ey, ang, L * 0.78, { shape: "ovate", W: 0.44, ramp, veins: 4, vk: 0.9, seed: seed + 3, gloss: 0.3 });
}
/** Scarlet runner flower spray: small red pea flowers on a short stalk. */
export function beanFlowers(g, x, y, dir, n = 5) {
  for (let i = 0; i < n; i++) {
    const fx = R(x + dir * i * 3), fy = R(y - i * 2.4);
    g.px(fx, fy + 2, "#3A6A22");
    g.rect(fx - 1, fy - 1, 4, 3, "#8A1418"); g.rect(fx, fy - 2, 3, 3, "#E0302A"); g.px(fx, fy - 2, "#FF7A5A"); g.px(fx + 2, fy, "#B01C1E");
  }
}
/** Hanging bean pod. */
export function pod(g, x, y, L, curve = 0) {
  const pts = bez([x, y], [x + curve, y + L * 0.5], [x + curve * 0.4, y + L], 10);
  blob(g, [tube(pts, 2.2, 1.4)], { ramp: G.green, thick: 2, base: 4.2, gain: 1.2, litOutline: G.green[2] });
  for (let i = 2; i < pts.length - 1; i += 2) g.px(R(pts[i][0]), R(pts[i][1]), G.green[6]);
}
/** Bean teepee: canes from the base points to the apex, twining vines with leaves, flowers and pods. */
export function beanTeepee(g, bases, apex, seed = 0, avoid = null) {
  for (const b of bases) cane(g, b, apex);
  // twine wrap at the apex
  for (let j = -4; j <= 4; j++) for (let i = -5; i <= 5; i++) if (Math.abs(j) < 3 || (i + j) % 2 === 0) g.px(R(apex[0] + i), R(apex[1] + 6 + j), j % 2 ? "#C8A870" : "#9A7A48");
  bases.forEach((b, ci) => {
    const n = Math.hypot(apex[0] - b[0], apex[1] - b[1]), turns = n / 30, ph = rnd(seed + ci) * 6;
    let prev = null;
    for (let i = 0; i <= n * 0.92; i += 1) {
      const k = i / n, x = b[0] + (apex[0] - b[0]) * k, y = b[1] + (apex[1] - b[1]) * k, w = Math.sin((i / n) * turns * Math.PI * 2 + ph), cx = x + w * 4.2, front = Math.cos((i / n) * turns * Math.PI * 2 + ph) > 0;
      if (prev) { g.line(R(prev[0]), R(prev[1]), R(cx), R(y), front ? G.bean[4] : G.bean[1]); if (front) g.px(R(cx) + 1, R(y), G.bean[2]); }
      prev = [cx, y];
    }
    for (let i = 26; i < n * 0.94; i += 22 + R(rnd(seed + ci * 31 + i) * 10)) {
      const k = i / n, x = b[0] + (apex[0] - b[0]) * k, y = b[1] + (apex[1] - b[1]) * k, side = (Math.floor(i / 22) + ci) % 2 ? 1 : -1;
      if (avoid && avoid(x + side * 18, y - 8)) continue;
      const L = 30 + rnd(seed + i * 3 + ci) * 12, ang = -Math.PI / 2 + side * (0.9 + rnd(seed + i) * 0.5);
      beanLeaf(g, x, y, ang, L, seed * 7 + ci * 100 + i);
      const r2 = rnd(seed + ci * 13 + i * 5);
      if (r2 < 0.33) beanFlowers(g, x - side * 4, y - 4, -side, 4 + R(r2 * 6));
      else if (r2 < 0.6) pod(g, x - side * 3, y + 2, 26 + r2 * 20, side * 4);
    }
  });
}
/** Staked tomato plant: stem along the stake, compound serrated leaves, fruit trusses and little yellow flowers. */
export function tomatoPlant(g, x, y, h, seed = 0, trusses = []) {
  for (let yy = R(y - h - 8); yy <= y; yy++) { g.rect(x + 5, yy, 3, 1, yy % 9 === 0 ? G.cane[2] : G.cane[4]); g.px(x + 5, yy, G.cane[6]); }
  const stem = []; for (let i = 0; i <= h; i += 3) stem.push([x + Math.sin(i * 0.05 + seed) * 3, y - i]);
  stalk(g, stem, 2.4, 1.6, G.tomato);
  for (let i = 12; i < h - 6; i += 16) { const [sx, sy] = stem[Math.min(stem.length - 1, R(i / 3))]; for (let j = -2; j <= 2; j++) g.px(R(sx) + 4 + j, R(sy) + (j & 1), "#E8D8A8"); }   // ties
  for (let i = 0; i < 9; i++) {
    const [sx, sy] = stem[Math.min(stem.length - 1, R((10 + i * (h - 20) / 9) / 3))], side = i % 2 ? 1 : -1, ang = -Math.PI / 2 + side * (1.0 + rnd(seed + i) * 0.5), L = 52 - i * 2.5;
    const pts = bez([sx, sy], [sx + Math.cos(ang) * L * 0.5, sy + Math.sin(ang) * L * 0.5 - 6], [sx + Math.cos(ang) * L, sy + Math.sin(ang) * L + 10], 12);
    for (let k = 1; k < pts.length; k++) g.line(R(pts[k - 1][0]), R(pts[k - 1][1]), R(pts[k][0]), R(pts[k][1]), G.tomato[3]);
    for (let k = 3; k < pts.length; k += 3) {
      const [px, py] = pts[k], [qx, qy] = pts[k - 1], a = Math.atan2(py - qy, px - qx);
      for (const sd of [-1, 1]) leaf(g, px, py, a + sd * 1.1, 12 + rnd(seed + i * 7 + k) * 5, { shape: "ovate", W: 0.42, ramp: G.tomato, veins: 3, serr: 0.12, seed: seed + i * 31 + k * 3 + sd, bend: sd * 2 });
    }
    const [tx, ty] = pts[pts.length - 1]; leaf(g, tx, ty, Math.atan2(pts[11][1] - pts[10][1], pts[11][0] - pts[10][0]), 16, { shape: "ovate", W: 0.42, ramp: G.tomato, veins: 3, serr: 0.12, seed: seed + i });
  }
  for (const [fx, fy, list] of trusses) {
    for (const [dx, dy, r, ramp] of list) { g.line(R(fx), R(fy), R(fx + dx), R(fy + dy - r), G.tomato[3]); }
    for (const [dx, dy, r, ramp] of list) {
      ball(g, fx + dx, fy + dy, r, ramp);
      const cx = R(fx + dx), cy = R(fy + dy - r + 1); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; g.line(cx, cy, R(cx + Math.cos(a) * 4), R(cy + Math.sin(a) * 2.2), G.tomato[4]); } g.px(cx, cy - 1, G.tomato[2]);
    }
  }
  for (let i = 0; i < 6; i++) { const [sx, sy] = stem[R(stem.length * (0.3 + rnd(seed + i * 3) * 0.6))], fx = R(sx + (rnd(i + seed) - 0.5) * 30), fy = R(sy - 4); for (let k = 0; k < 5; k++) { const a = (k * 2 * Math.PI) / 5; g.px(R(fx + Math.cos(a) * 2), R(fy + Math.sin(a) * 2), "#FFE040"); } g.px(fx, fy, "#E0A010"); }
}
/** White picket fence from x0 to x1 standing on y (h tall). */
export function picketFence(g, x0, x1, y, h, seed = 0) {
  for (const ry of [y - h * 0.75, y - h * 0.3]) for (let x = x0; x <= x1; x++) { g.px(x, R(ry), G.paint[5]); g.px(x, R(ry) + 1, G.paint[3]); g.px(x, R(ry) + 2, G.paint[1]); }
  for (let x = x0; x <= x1 - 6; x += 11) {
    const ph = (rnd(seed + x) - 0.5) * 2;
    for (let yy = R(y - h + ph); yy <= y; yy++) for (let i = 0; i < 7; i++) {
      const top = yy - (y - h + ph); if (top < 4 && Math.abs(i - 3) > top) continue;
      g.px(x + i, yy, i === 0 || i === 6 ? G.paint[1] : i < 3 ? G.paint[7] : i < 5 ? G.paint[5] : G.paint[3]);
    }
    g.px(x + 3, R(y - h * 0.75) - 2, G.paint[2]); g.px(x + 3, R(y - h * 0.3) - 2, G.paint[2]);
  }
}
/** A little greenhouse (white frame, glass panes with reflections, plants inside) on the ground line y. */
export function greenhouse(g, x0, x1, y, h, roof) {
  const mid = (x0 + x1) / 2, top = y - h;
  for (let yy = R(top - roof); yy <= y; yy++) for (let x = x0; x <= x1; x++) {
    const rt = top - roof * (1 - Math.abs(x - mid) / ((x1 - x0) / 2)); if (yy < rt) continue;
    const pane = (x - x0) % 22 < 2 || yy === R(top) || yy === R(top) + 1 || yy > y - 2 || Math.abs(yy - rt) < 1.5 || Math.abs(x - mid) < 1;
    if (pane) { g.px(x, yy, yy > y - 2 ? G.paint[1] : (x - x0) % 22 === 0 ? G.paint[7] : G.paint[4]); continue; }
    const refl = ((x + (yy - top) * 0.7) % 26 + 26) % 26 < 3, inside = yy > y - 34 && Math.sin(x * 0.21) * 6 + Math.sin(x * 0.07) * 4 > yy - (y - 26);
    g.px(x, yy, refl ? "#EAFAF6" : inside ? (bayer(x, yy) > 0.5 ? "#7EAE8E" : "#8EBC9C") : yy < top ? "#CFEAF0" : bayer(x, yy) > 0.5 ? "#B6DCDA" : "#C4E4E2");
  }
}
/** Raised wooden bed: front planks from x0 to x1 (top edge y, height h), soil, lettuces and carrot tops. */
export function raisedBed(g, x0, x1, y, h, seed = 0) {
  for (let yy = y - 6; yy < y; yy++) for (let x = x0 + 2; x < x1 - 2; x++) g.px(x, yy, bayer(x, yy) > 0.6 ? "#4A3020" : "#3A2418");
  for (let yy = y; yy < y + h; yy++) for (let x = x0; x <= x1; x++) {
    const plank = Math.floor((yy - y) / (h / 2)), v = ((yy - y) % (h / 2)) / (h / 2), grain = Math.sin(x * 0.11 + plank * 3 + Math.sin(x * 0.03) * 2) > 0.92;
    let t = v < 0.12 ? 6 : v > 0.88 ? 2 : 4.6 - v * 1.2; if (grain) t -= 1.1; if (x === x0 || x === x1) t = 1; if ((x - x0) % 60 === 0 || (x1 - x) % 60 === 0) t -= 0.8;
    shadeAt(g, x, yy, G.wood, t);
  }
  for (let x = x0; x <= x1; x += 60) for (const dy of [3, h / 2 + 3]) g.px(x + 4, R(y + dy), "#2A1A0E");
}
export function lettuce(g, x, y, r, seed = 0) {
  const LT = ["#24440E", "#3A6414", "#548A1E", "#70A82A", "#8EC23C", "#AAD656", "#C6E67C", "#E2F4AA"];
  for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI, rr = r * (0.55 + rnd(seed + i) * 0.25); leafBall(g, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.35, rr, LT.slice(1), seed + i, { amp: 0.22, bumps: 13 }); }
  leafBall(g, x, y - r * 0.3, r * 0.55, LT.slice(2), seed + 50, { amp: 0.18, bumps: 11, lift: 0.1 });
}
export function carrotTops(g, x, y, seed = 0) {
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.3, L = 10 + rnd(seed + i) * 6; for (let k = 0; k < L; k++) { const px = R(x + Math.cos(a) * k), py = R(y + Math.sin(a) * k); g.px(px, py, "#3A7A2A"); if (k > 3 && k % 2) { g.px(px - 1, py, "#5AA040"); g.px(px + 1, py - 1, "#4A8A34"); } } }
  g.rect(R(x) - 2, R(y), 4, 2, "#E87A1E"); g.px(R(x) - 1, R(y), "#FFA040");
}
/** Big yellow squash blossom (star trumpet) opening up, at (x, y). */
export function squashFlower(g, x, y, s = 1) {
  const PET = ["#6A3A04", "#A85E08", "#D88A10", "#F2AE1C", "#FCCA34", "#FFE060", "#FFF0A0"];
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5 + 0.3, L = 17 * s;
    const poly = [[x, y], [x + Math.cos(a - 0.5) * L * 0.7, y + Math.sin(a - 0.5) * L * 0.5], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.62], [x + Math.cos(a + 0.5) * L * 0.7, y + Math.sin(a + 0.5) * L * 0.5]];
    blob(g, [poly], { ramp: ["#5A3004", ...PET], thick: 6 * s, base: 4.2, gain: 1.8, outline: PET[0], litOutline: PET[2] });
    g.line(R(x), R(y), R(x + Math.cos(a) * L * 0.85), R(y + Math.sin(a) * L * 0.53), PET[2]);
  }
  ball(g, x, y, 4.5 * s, ["#5A2A04", "#8A4A06", "#C27010", "#E8961C", "#F8B830", "#FFD458", "#FFEA90", "#FFF8C8"]);
}
export function pumpkin(g, x, y, r) {
  ball(g, x, y, r, G.orange, { ribs: 4, sy: 0.82 });
  blob(g, [tube([[x, y - r * 0.78], [x + 2, y - r * 1.05], [x + 6, y - r * 1.2]], 3, 2)], { ramp: ["#1E2A0E", "#34461A", "#4A6224", "#62802E", "#7A9A3C", "#96B254", "#B2C872", "#D0DE98"], thick: 2, base: 3.6 });
}
export function wateringCan(g, x, y, s = 1) {
  const M = ["#1E3A4A", "#2E566A", "#3E7088", "#5A8EA8", "#7AAEC4", "#9CC8DA", "#C4E2EE", "#EAF8FF"];
  blob(g, [[[x - 14 * s, y], [x - 13 * s, y - 20 * s], [x + 12 * s, y - 20 * s], [x + 13 * s, y]]], { ramp: M, thick: 10 * s, base: 3.6, gain: 2.2, litOutline: M[3] });
  thick(g, [[x + 11 * s, y - 6 * s], [x + 22 * s, y - 18 * s], [x + 27 * s, y - 24 * s]], Math.max(1, R(1.6 * s)), M[2]);
  g.rect(R(x + 25 * s), R(y - 27 * s), R(6 * s), R(4 * s), M[4]);
  for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; g.px(R(x - 2 * s + Math.cos(a) * 10 * s), R(y - 20 * s + Math.sin(a) * 9 * s), M[1]); g.px(R(x - 2 * s + Math.cos(a) * 10 * s), R(y - 21 * s + Math.sin(a) * 9 * s), M[5]); }
}
/** Aphid (tiny pale-green sap sucker), dir ±1. */
export function aphid(g, x, y, dir = 1) {
  x = R(x); y = R(y);
  g.rect(x - 2, y - 1, 5, 3, "#7AB43A"); g.rect(x - 1, y - 2, 3, 1, "#A8D85E"); g.px(x - 1, y - 1, "#D0F08A");
  g.px(x + 3 * dir, y, "#5A8A2A"); g.px(x + 3 * dir, y - 1, "#3A2A1A"); g.px(x - 3 * dir, y - 2, "#4A7A22");
  g.px(x - 1, y + 2, "#3A5A1A"); g.px(x + 1, y + 2, "#3A5A1A");
}
export { leaf, stalk, P };
