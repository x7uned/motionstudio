// Our own side-view platform level (not an original map or tileset): sky, far hills, clouds, bushes, ground blocks to
// the bottom edge of the frame, brick and gold blocks, a pipe. World units = game px (a block is 16), y down, ground top
// at y = 0. Drawn through a camera V = { z, X(wx), Y(wy) }; every tile is evaluated per screen pixel (crisp at any zoom).
import { bayer, hex, mix } from "./lib/raster.mjs";
import { rnd } from "./lib/ui.mjs";

export const B = 16;
const R = Math.round;
const SKY = ["#5C8CF8", "#6C9CFA", "#80ACFC", "#98C0FE"];
const HILL = ["#2E8A3A", "#3EA84A", "#5CC25E", "#8CDC7A"], HILL_FAR = ["#4E8EC8", "#5E9ED4", "#74B0DE"];
const GROUND = { top: "#E07A30", mid: "#C25A20", low: "#8E3A14", line: "#5A2008", hi: "#F8B070" };
const BRICK = { a: "#C8501C", b: "#A23A10", m: "#F0A070", line: "#4A1A06" };
const GOLD = { a: "#F8B830", b: "#D08A10", hi: "#FFE890", line: "#6A3A06", spark: "#FFFFFF" };
const PIPE = { a: "#3CB83C", b: "#2A8A2A", hi: "#A8F08A", line: "#0E3A10" };

// the level: blocks placed in tile coords (tx, ty) with ty negative above the ground
// The world repeats every NT tiles (the loop): every lookup and every background layer is periodic.
export let NT = 47;
export const SOLID = new Map();
const put = (tx, ty, kind) => SOLID.set(tx + "," + ty, kind);
const wrapT = (tx) => ((tx % NT) + NT) % NT;
export function buildLevel(spec, nt) { NT = nt; SOLID.clear(); for (const [tx, ty, kind] of spec) put(wrapT(tx), ty, kind); }
export const at = (tx, ty) => (ty >= 0 ? "ground" : SOLID.get(wrapT(tx) + "," + ty));

function skyCol(X, Y, V) { const wy = (Y - V.Y(0)) / V.z, k = Math.max(0, Math.min(1, (wy + 260) / 260)), q = k * 3, lo = Math.floor(q); return SKY[Math.min(3, q - lo > bayer(X, Y) ? lo + 1 : lo)]; }

export function drawLevel(c, V, t, END = 49.5) {
  const d = c.d, W = c.w, H = c.h;
  for (let Y = 0; Y < H; Y++) {
    const wy = (Y + 0.5 - V.Y(0)) / V.z;
    for (let X = 0; X < W; X++) {
      const wx = (X + 0.5 - V.X(0)) / V.z;
      let col = null;
      const tx = Math.floor(wx / B), ty = Math.floor(wy / B), u = wx - tx * B, v = wy - ty * B, kind = at(tx, ty), txw = wrapT(tx), wxw = ((wx % (NT * B)) + NT * B) % (NT * B);
      if (kind === "ground") {
        const depth = wy;
        if (depth < B * 2) { // top two rows: blocks with a bevel and cracks (our own pattern)
          col = GROUND.mid; if (v < 1.2 || u < 1.2) col = GROUND.hi; else if (v > B - 1.2 || u > B - 1.2) col = GROUND.line;
          else { const h = rnd(txw * 31 + ty * 7); if (Math.abs(u - (5 + h * 6) - (v - 8) * 0.4) < 0.7 && v > 3 && v < 12) col = GROUND.low; if (v < 4) col = col === GROUND.mid ? GROUND.top : col; }
        } else { // deeper: soil bands with pebbles, darker with depth (to the bottom edge)
          const k = Math.min(1, (depth - 32) / 300), q = 1 + k * 2, lo = Math.floor(q), ramp = [GROUND.mid, GROUND.low, "#6A2A10", "#4A1C0A"];
          col = ramp[Math.min(3, q - lo > bayer(X, Y) ? lo + 1 : lo)];
          const pu = Math.floor(wxw / 8), pv = Math.floor(wy / 8), h = rnd(pu * 977 + pv * 131); if (h > 0.86 && Math.hypot((wxw % 8) - 4, ((wy % 8) - 4) * 1.3) < 2) col = mix(col, "#000000", 0.35);
        }
      } else if (kind === "brick") {
        col = BRICK.a; const row = Math.floor(v / 4), off = row % 2 ? 4 : 0; if (v % 4 < 0.9 || ((u + off) % 8) < 0.9) col = BRICK.line; else if (v % 4 < 1.8) col = BRICK.m; else if (v % 4 > 3.1) col = BRICK.b;
      } else if (kind === "gold" || kind === "used") {
        const g = kind === "used" ? { a: "#B07A3A", b: "#8A5A2A", hi: "#D0A060", line: "#4A2A0A" } : GOLD;
        col = g.a; if (u < 1 || v < 1 || u > B - 1 || v > B - 1) col = g.line; else if (u < 2 || v < 2) col = g.hi; else if (u > B - 2.2 || v > B - 2.2) col = g.b;
        else if (kind === "gold") { const r = Math.hypot(u - 8, v - 8), ang = Math.atan2(v - 8, u - 8), star = 3.2 + 1.8 * Math.cos(ang * 4 + (2 * Math.PI * 16 * t) / END); if (r < star) col = r < 1.6 ? GOLD.spark : GOLD.hi; }
        if ((u > 2.5 && u < 3.8 && v > 2.5 && v < 3.8) || (u > 12.2 && u < 13.5 && v > 2.5 && v < 3.8) || (u > 2.5 && u < 3.8 && v > 12.2 && v < 13.5) || (u > 12.2 && u < 13.5 && v > 12.2 && v < 13.5)) col = g.line;
      } else if (kind === "pipe" || kind === "pipeTop") {
        const lip = kind === "pipeTop", x0 = lip ? 0 : 2, x1 = lip ? B : B - 2; if (u >= x0 && u < x1) { const k = (u - x0) / (x1 - x0); col = k < 0.12 || k > 0.92 ? PIPE.line : k < 0.3 ? PIPE.hi : k < 0.62 ? PIPE.a : PIPE.b; if (lip && (v < 1 || v > B - 1.2)) col = PIPE.line; } // a pipe tile is half of a 2-tile pipe (left/right handled by spec)
      } else if (kind === "pipeL" || kind === "pipeR" || kind === "pipeTopL" || kind === "pipeTopR") {
        const lip = kind.startsWith("pipeTop"), left = kind.endsWith("L"), gx = left ? u : u + B, x0 = lip ? 0 : 3, x1 = lip ? 2 * B : 2 * B - 3;
        if (gx >= x0 && gx < x1) { const k = (gx - x0) / (x1 - x0); col = k < 0.06 || k > 0.95 ? PIPE.line : k < 0.22 ? PIPE.hi : k < 0.55 ? PIPE.a : PIPE.b; if (lip && (v < 1 || v > B - 1.2)) col = PIPE.line; }
      }
      if (!col) col = backdrop(X, Y, wx, wy, V, t);
      const q = hex(col), i = (Y * W + X) * 3; d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2];
    }
  }
}
// sky, far hills, near hills, clouds, bushes — all ours. Parallax shifts each layer by p·cx; every layer is periodic
// with period p·(NT·16), so the picture at the end of the loop (camera one period further) is the picture at the start.
const wrapP = (v, P) => ((v % P) + P) % P;
function backdrop(X, Y, wx, wy, V, t) {
  const LW = NT * B, off = (X + 0.5 - 270) / V.z;
  // clouds (p 0.4): three per period
  { const P = LW * 0.4, lx = wrapP(V.cx * 0.4 + off, P), sp = P / 3;
    for (let k0 = Math.floor(lx / sp) - 1; k0 <= Math.floor(lx / sp) + 1; k0++) { const k = ((k0 % 3) + 3) % 3, ox = k0 * sp + rnd(k * 17 + 3) * sp * 0.4, oy = -190 - rnd(k * 29 + 5) * 80, s2 = 0.8 + rnd(k * 43 + 7) * 0.5, dx = (lx - ox) / s2, dy = (wy - oy) / s2;
      const puff = Math.min(Math.hypot(dx / 18, dy / 10), Math.hypot((dx - 16) / 14, (dy + 4) / 11), Math.hypot((dx + 16) / 13, (dy - 1) / 8));
      if (puff < 1 && dy < 7) return puff > 0.84 && dy < 2 ? "#D8E8FF" : dy > 4 ? "#C8DCFA" : "#FFFFFF"; } }
  // far hills (p 0.5): soft blue ridge, periodic
  { const P = LW * 0.5, lx = wrapP(V.cx * 0.5 + off, P), fh = 64 + 30 * Math.sin((2 * Math.PI * lx) / P) + 18 * Math.sin((2 * Math.PI * 3 * lx) / P + 1.3);
    if (wy > -fh && wy < 0) { const k = (wy + fh) / fh; if (k > 0.35 || true) { /* below the near hills */ } }
    // near hills (p 0.75): three rounded green humps per period, drawn over the far ridge
    const P2 = LW * 0.75, lx2 = wrapP(V.cx * 0.75 + off, P2), sp = P2 / 3;
    for (let k0 = Math.floor(lx2 / sp) - 1; k0 <= Math.floor(lx2 / sp) + 1; k0++) { const k = ((k0 % 3) + 3) % 3, hx = k0 * sp + sp * 0.3 + rnd(k * 7 + 3) * sp * 0.4, hr = 36 + rnd(k * 11 + 1) * 26, dx = lx2 - hx, top = -Math.sqrt(Math.max(0, hr * hr - dx * dx)) * 1.15;
      if (wy > top && wy < 0 && Math.abs(dx) < hr) { const lit = (-dx / hr) * 0.6 + 0.5; return wy < top + 2.2 ? HILL[3] : HILL[Math.max(0, Math.min(2, Math.floor(lit * 2.6 + bayer(X, Y) * 0.7)))]; } }
    if (wy > -fh && wy < 0) { const k = (wy + fh) / fh; return HILL_FAR[Math.min(2, Math.floor(k * 3 + bayer(X, Y) * 0.8))]; } }
  // bushes on the ground line (p 1): five per period
  { const P = LW, lx = wrapP(V.cx + off, P), sp = P / 5;
    for (let k0 = Math.floor(lx / sp) - 1; k0 <= Math.floor(lx / sp) + 1; k0++) { const k = ((k0 % 5) + 5) % 5, bx = k0 * sp + sp * 0.5 + (rnd(k * 5 + 2) - 0.5) * sp * 0.5, dx = lx - bx, br = 20 + rnd(k * 13 + 4) * 10;
      const top = -Math.max(Math.sqrt(Math.max(0, (br * 0.6) ** 2 - (dx - br * 0.4) ** 2)), Math.sqrt(Math.max(0, (br * 0.5) ** 2 - (dx + br * 0.45) ** 2)), Math.sqrt(Math.max(0, (br * 0.75) ** 2 - dx * dx)));
      if (wy > top && wy < 0) return wy < top + 1.8 ? "#A8F08A" : wy < top + 6 ? "#5CC25E" : "#3EA84A"; } }
  return skyCol(X, Y, V);
}
