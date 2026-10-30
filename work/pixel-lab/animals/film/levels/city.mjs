// LV10 · human — the night city on the harbour (RANGE BIOME.city). The hero stands on the waterfront promenade under the
// full moon (the shared sky disc), the city's windows light up on "eighty-six billion", his phone shows the ranked list
// on "lists like this one", then the camera dives over the quay edge into the harbour (the wrapped sea column).
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { BIOME, LAND, EV, LV, WORLD_W } from "../timeline.mjs";
import { sign, pickup, tag, panel, sm, win, ease, lerp, rnd, fade, mix, bayer, blinkAt, C, MAIN, TINY } from "../cute.mjs";
import { drawHero } from "../hero.mjs";
import { LAYERS_DIVE, texel } from "./sea-terrain.mjs";
import { dcol } from "./sea-common.mjs";

export const RANGE = [BIOME.city[0], WORLD_W + 120];
const R = Math.round, X0 = BIOME.city[0], QUAY = WORLD_W + 100;  // promenade runs over the sea cliff's top to the quay edge, water beyond
const HERO_X = 4590, TOP = -760;                                  // cached layer spans world y TOP..LAND

// ---------------------------------------------------------------- cached static layer (buildings, lamps, railing) with a mask
const LW = RANGE[1] - X0, LH = LAND - TOP;
const layer = (() => {
  const c = new Canvas(LW, LH, "#000000"), m = new Uint8Array(LW * LH);
  const put = (x, y, col) => { x = R(x); y = R(y); if (x < 0 || y < 0 || x >= LW || y >= LH) return; c.px(x, y, col); m[y * LW + x] = 1; };
  const box = (x, y, w, h, col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, col); };
  const L = (wx) => wx - X0, Ty = (wy) => wy - TOP;
  // far skyline: dark silhouettes, low in the middle so the moon shows
  for (let k = 0; k < 26; k++) { const wx = X0 - 40 + k * 26 + rnd(k) * 10, mid = Math.abs(wx - HERO_X) < 150, h = mid ? 70 + rnd(k * 3) * 50 : 150 + rnd(k * 3) * 230, w = 24 + rnd(k * 5) * 22; box(L(wx), Ty(LAND - h), w, h, "#211A46"); for (let j = Ty(LAND - h) + 6; j < Ty(LAND) - 10; j += 9) for (let i = L(wx) + 4; i < L(wx) + w - 4; i += 7) if (rnd(i * 31 + j * 7) < 0.18) box(i, j, 2, 3, "#5A4A9A"); }
  // near buildings left and right of the moon: brick and glass, lit later (windows are dynamic, not cached)
  const B = [[X0 - 10, 150, 330, "#2E2458", "#3E3274"], [X0 + 130, 70, 210, "#35295E", "#463A7E"], [X0 + 360, 120, 250, "#2A2252", "#3A3070"], [X0 + 470, 100, 380, "#30265C", "#40347A"]];
  for (const [wx, w, h, col, edge] of B) { box(L(wx), Ty(LAND - h), w, h, col); box(L(wx), Ty(LAND - h), w, 3, edge); box(L(wx) + w - 3, Ty(LAND - h), 3, h, "#1E1840"); box(L(wx), Ty(LAND - h) - 6, w, 6, "#1A1438"); for (let i = L(wx) + 6; i < L(wx) + w - 6; i += 14) box(i, Ty(LAND - h) - 12, 6, 6, "#1A1438"); }
  // water tower and antenna on the right building, for a skyline accent
  box(L(X0 + 492), Ty(LAND - 420), 30, 26, "#1A1438"); for (const dx of [495, 518]) box(L(X0 + dx), Ty(LAND - 394), 3, 14, "#1A1438");
  // promenade: lamp posts, railing at the quay edge, bench, planters
  for (const wx of [X0 + 40, X0 + 200, X0 + 420]) { box(L(wx) - 1, Ty(LAND - 120), 3, 120, "#141026"); box(L(wx) - 6, Ty(LAND - 126), 13, 6, "#141026"); box(L(wx) - 4, Ty(LAND - 120), 9, 3, "#FFE3A0"); }
  for (let wx = X0 + 470; wx < QUAY; wx += 16) box(L(wx), Ty(LAND - 26), 2, 26, "#5A5288");
  box(L(X0 + 470), Ty(LAND - 28), QUAY - X0 - 470, 3, "#8A82B8");
  box(L(X0 + 90), Ty(LAND - 18), 56, 4, "#6A4024"); box(L(X0 + 90), Ty(LAND - 30), 56, 4, "#6A4024"); box(L(X0 + 94), Ty(LAND - 14), 3, 14, "#2E1A10"); box(L(X0 + 139), Ty(LAND - 14), 3, 14, "#2E1A10");
  // jungle edge → park: two round bushes at the left seam
  for (const [wx, r] of [[X0 + 6, 26], [X0 + 34, 18]]) for (let j = -r; j <= 0; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) put(L(wx) + i, Ty(LAND) + j - 1, (i + j) % 7 === 0 ? "#2E6A3A" : j < -r * 0.5 ? "#2A5A34" : "#1E4428");
  return { c, m };
})();
function blitLayer(c, V) {
  const sx = R(V.X(X0)), sy = R(V.Y(TOP)), d = c.d, s = layer.c.d, m = layer.m;
  for (let j = Math.max(0, -sy); j < LH; j++) { const y = sy + j; if (y >= 960) break; const i0 = Math.max(0, -sx), i1 = Math.min(LW, 540 - sx); for (let i = i0; i < i1; i++) { const k = j * LW + i; if (!m[k]) continue; const o = (y * 540 + sx + i) * 3, q = k * 3; d[o] = s[q]; d[o + 1] = s[q + 1]; d[o + 2] = s[q + 2]; } }
}

// ---------------------------------------------------------------- windows: dark until "eighty-six billion", then a wave of light from the hero outward
const WINDOWS = (() => { const out = [], B = [[X0 - 10, 150, 330], [X0 + 130, 70, 210], [X0 + 360, 120, 250], [X0 + 470, 100, 380]];
  for (const [wx, w, h] of B) for (let y = LAND - h + 12; y < LAND - 44; y += 16) for (let x = wx + 8; x < wx + w - 12; x += 13) out.push({ x, y, k: rnd(x * 13 + y * 7), d: Math.hypot(x - HERO_X, y + 200) }); return out; })();
function drawWindows(c, V, t) {
  const t0 = EV.eightySix - 0.1;
  for (const w of WINDOWS) {
    const sx = R(V.X(w.x)), sy = R(V.Y(w.y)); if (sx < -10 || sx > 550 || sy < -10 || sy > 970) continue;
    const base = w.k < 0.3 ? 1 : 0, on = Math.max(base, sm(t, t0 + w.d / 420, t0 + w.d / 420 + 0.25)), col = w.k < 0.5 ? "#F4CA50" : w.k < 0.8 ? "#FFE3A0" : "#9AD8F0";
    c.rect(sx, sy, 6, 8, "#17122E"); if (on > 0) { const g = fade(c, on); g.rect(sx, sy, 6, 8, col); g.rect(sx, sy, 6, 1, mix(col, "#FFFFFF", 0.4)); g.rect(sx + 2, sy, 1, 8, mix(col, "#000000", 0.25)); }
  }
}

// ---------------------------------------------------------------- terrain: promenade tiles, then rock under the city down to any depth
export function back(c, V, t) {
  blitLayer(c, V); drawWindows(c, V, t);
  const x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(QUAY))), gy = R(V.Y(LAND));
  if (x1 <= x0 || gy >= 960) return;
  // pavement down to y 40, then the same rock strata as the sea cliff (so the dive passes one continuous wall);
  // right of WORLD_W only the part above the water is ours — the sea column's cliff draws everything below y 0
  const xw = R(V.X(WORLD_W));
  for (let y = Math.max(0, gy); y < 960; y++) {
    const wy = y - 480 + V.cy, L = wy >= 40 ? LAYERS_DIVE.at(wy) : null;
    for (let x = x0; x < x1; x++) {
      if (x >= xw && wy >= 0) break;
      const wx = x - 270 + V.cx; let col;
      if (wy < LAND + 6) col = wy < LAND + 2 ? "#8A82B8" : "#5A5288";                         // curb
      else if (wy < 40) { const tile = ((Math.floor(wx / 18) + Math.floor((wy - LAND) / 9)) & 1) === 0; col = tile ? "#3A3266" : "#342C5C"; if ((wx % 18) === 0 || ((wy - LAND) % 9) === 0) col = "#2A2250"; if (wy >= 0 && wy < 6) col = "#241C46"; }
      else { const cc = dcol(texel(L, wx, wy), wy, true); const i = (y * 540 + x) * 3; c.d[i] = cc[0]; c.d[i + 1] = cc[1]; c.d[i + 2] = cc[2]; continue; }
      if (wy >= LAND + 6 && wy < 40) for (const lx of [X0 + 40, X0 + 200, X0 + 420]) { const dd = ((wx - lx) / 70) ** 2 + ((wy - 6) / 14) ** 2; if (dd < 1 && (1 - dd) * 0.7 > bayer(x, y)) { col = mix(col, "#FFE3A0", 0.35); break; } }
      const i = (y * 540 + x) * 3, cc = typeof col === "string" ? [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)] : col; c.d[i] = cc[0]; c.d[i + 1] = cc[1]; c.d[i + 2] = cc[2];
    }
  }
  // the quay wall face at the water's edge
  const qx = R(V.X(QUAY)), qy = Math.min(960, R(V.Y(0))); if (qx >= 0 && qx < 540) for (let y = Math.max(0, gy); y < qy; y++) { c.px(qx, y, "#0E0A1E"); c.px(qx - 1, y, "#2A2250"); }
}

// ---------------------------------------------------------------- the hero, his phone list, the level sign
const LIST = ["10 HUMAN", "9 CHIMP", "8 ELEPHANT", "7 DOLPHIN", "6 CROW", "5 DOG", "4 BEE", "3 OCTOPUS", "2 JELLYFISH", "1 SPONGE"];
export function actors(c, V, t) {
  if (t < LV.chimp[0] - 1) return;
  sign(c, V.X(X0 + 104), V.Y(LAND - 210), "LV 10", "neon", 1, t);
  const hx = V.X(HERO_X), hy = V.Y(LAND);
  if (hx < -120 || hx > 660) return;
  const look = t < EV.lists ? [0, 0] : t < EV.here ? [0.2, 0.7] : [0, 0];
  const phone = t >= EV.plan - 0.2 && t < EV.here + 0.4 ? "phone" : "stand";
  const screen = mix("#3A6A9A", "#9AE8FF", 0.5 + 0.5 * Math.sin(t * 3));
  // a little wave on "us" (smile wider), then the phone comes up
  drawHero(c, hx, hy, { pose: phone, scale: 2, look, blink: blinkAt(t, 3.3, 0.7), mouth: t > EV.top && t < EV.plan ? "o" : "smile", screen: toHex(screen) });
  // contact shadow
  c.tint(R(hx - 60), R(hy - 4), 120, 8, (x, y) => { const d = ((x - hx) / 60) ** 2 + ((y - hy) / 4) ** 2; return d < 1 ? 0.45 * (1 - d) : 0; }, "#000000", 3);
}
const toHex = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

export function hud(c, V, t) {
  if (t < LV.human[0] - 0.5 || t > LV.dive[0] + 2) return;
  // 86 billion, on "eighty-six billion brain cells"
  { const a = win(t, EV.eightySix, EV.plan + 0.2, 0.3, 0.35); if (a > 0) tag(c, ["86,000,000,000", "BRAIN CELLS"], 270, 142, a, C.Y, 3); }
  if (t >= EV.plan && t < EV.plan + 1.6) pickup(c, 270, 236, "+PLAN", (t - EV.plan) / 1.6);
  // the list pops out of the phone: rows dissolve in from the bottom (sponge) up to the top (human)
  const a = win(t, EV.lists - 0.15, LV.dive[0], 0.25, 0.4); if (a <= 0) return;
  const x = 296, y = 104, w = 226, h = 232, hx = V.X(HERO_X);
  panel(c, x, y, w, h, a, C.L);
  fade(c, a).text(MAIN, "MY LIST", x + 12, y + 8, C.L, { scale: 2 });
  LIST.forEach((row, i) => { const k = sm(t, EV.lists + (9 - i) * 0.06, EV.lists + (9 - i) * 0.06 + 0.2) * a; if (k <= 0) return; const ry = y + 30 + i * 19, me = i === 0;
    if (me) fade(c, k).rect(x + 6, ry - 3, w - 12, 20, "#3A2A6A");
    fade(c, k).text(MAIN, row, x + 12, ry, me ? C.Y : i === 9 ? C.CY : C.IV, { scale: 2 }); });
  // a dotted leader line from the phone to the list
  const g = fade(c, a); for (let k = 0; k < 14; k++) { const u = k / 13, px = lerp(hx + 4, x, u), py = lerp(V.Y(LAND) - 150, y + h - 10, u); if (k % 2 === 0) g.px(R(px), R(py), C.L); }
}
