// Pixel sprites drawn procedurally at any zoom (world units = maze tiles): the maze with neon double walls, dots and
// power pellets, Pac-Man and the four ghosts. Every pixel is evaluated in world space and shaded in steps with Bayer
// dithering, so zooming never resamples a bitmap. Our own drawings in the spirit of the 1980 arcade sprites.
import { bayer, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { MW, MH, cell } from "./maze.mjs";

export const PAL = {
  bg: "#04030A", floor: "#06040E", wallFill: "#0E0F33", wallFill2: "#15174A", line: "#3A50FF", lineHi: "#9FB0FF", lineLo: "#2230B8",
  dot: "#FFC9B5", door: "#FF9BD0",
  pac: ["#7A4A00", "#D99A00", "#FFD000", "#FFE95A", "#FFF8C8"],
  red: ["#5C0F1E", "#B81830", "#F2283C", "#FF6B6B", "#FFC2C2"],
  pink: ["#6A2350", "#C25A9A", "#FF9FD6", "#FFC6E8", "#FFF0F8"],
  blue: ["#0E3E5A", "#1F8FB8", "#35DDF5", "#93F2FF", "#E2FDFF"],
  orange: ["#5E3006", "#C26A0C", "#FFA638", "#FFC97D", "#FFF0D6"],
  eye: "#F6F7FF", eyeLo: "#B9BEE0", pupil: "#2333B8",
};
const R = Math.round;

// ---------------------------------------------------------------- camera: world (tiles) ↔ screen (540×960 grid)
export const SX = 270, SY = 380;
export const toS = (cam, x, y) => [SX + (x - cam.cx) * cam.z, SY + (y - cam.cy) * cam.z];
export const toW = (cam, X, Y) => [cam.cx + (X + 0.5 - SX) / cam.z, cam.cy + (Y + 0.5 - SY) / cam.z];

// ---------------------------------------------------------------- maze
// Visual walls: '#' only; the ghost house interior and door count as floor here so the house reads as a box.
const visWall = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || cell(x, y) === "#";
const border = (x, y) => x <= 0 || y <= 0 || x >= MW - 1 || y >= MH - 1;
// distance from a point to the nearest non-wall tile square (0 inside a corridor), searched in the 3×3 around it
function openDist(wx, wy) {
  const tx = Math.floor(wx), ty = Math.floor(wy);
  if (!visWall(tx, ty)) return 0;
  let best = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = tx + i, y = ty + j; if (visWall(x, y)) continue; const dx = Math.max(x - wx, 0, wx - (x + 1)), dy = Math.max(y - wy, 0, wy - (y + 1)); best = Math.min(best, Math.hypot(dx, dy)); }
  return best;
}
export function drawMaze(c, cam, t, dotState) {
  const W = c.w, H = c.h, z = cam.z, lw = Math.max(1.2 / z, 0.085), D1 = 0.3, D2 = 0.72, d = c.d;
  const [bgR, bgG, bgB] = hex(PAL.bg), FL = hex(PAL.floor), WF = hex(PAL.wallFill), WF2 = hex(PAL.wallFill2), LN = hex(PAL.line), LH = hex(PAL.lineHi), LL = hex(PAL.lineLo);
  for (let Y = 0; Y < H; Y++) {
    const wy = cam.cy + (Y + 0.5 - SY) / z;
    for (let X = 0; X < W; X++) {
      const wx = cam.cx + (X + 0.5 - SX) / z, i = (Y * W + X) * 3;
      let col;
      if (wx < -0.6 || wy < -0.6 || wx > MW + 0.6 || wy > MH + 0.6) { const g = Math.min(1, Math.max(0, (Math.max(-wx, -wy, wx - MW, wy - MH) - 0.6) / 4)); col = g > bayer(X, Y) * 0.9 + 0.05 ? [bgR, bgG, bgB] : FL; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; continue; }
      const od = openDist(wx, wy);
      if (od === 0) col = FL;
      else {
        const tx = Math.floor(wx), ty = Math.floor(wy), bd = border(tx, ty);
        const onLine = (dd) => Math.abs(od - dd) < lw / 2;
        if (onLine(D1) || (bd && onLine(D2))) {
          // light from the top-left: lines facing up/left are brighter
          const e = 0.002, gx = openDist(wx + e, wy) - openDist(wx - e, wy), gy = openDist(wx, wy + e) - openDist(wx, wy - e), lit = -(gx * -0.6 + gy * -0.8) / (Math.hypot(gx, gy) || 1);
          col = lit > 0.35 ? (lit > 0.75 ? LH : LN) : lit < -0.4 ? LL : LN;
        } else if (od < D1) col = FL;
        else { const k = Math.min(1, (od - D1) / 0.6); col = k * 0.8 > bayer(X, Y) ? WF : WF2; if (bd && od > D2 - lw) col = WF; }
      }
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    }
  }
  // ghost door
  { const [x0, y0] = toS(cam, 10, 9.42), [x1, y1] = toS(cam, 11, 9.58); c.rect(R(x0), R(y0), Math.max(1, R(x1 - x0)), Math.max(1, R(y1 - y0)), PAL.door); }
  // dots and power pellets
  if (dotState) for (const dt of dotState.list) {
    const a = dotState.alpha(dt, t); if (a <= 0) continue;
    const [X, Y] = toS(cam, dt.x + 0.5, dt.y + 0.5); if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) continue;
    if (dt.big) { const on = dotState.blink(t); if (on <= 0) continue; const r = Math.max(1.5, 0.36 * z); for (let y = -Math.ceil(r); y <= Math.ceil(r); y++) for (let x = -Math.ceil(r); x <= Math.ceil(r); x++) { const q = Math.hypot(x + 0.5, y + 0.5) / r; if (q > 1) continue; if (a * on < 1 && a * on <= bayer(R(X) + x, R(Y) + y)) continue; c.px(R(X) + x, R(Y) + y, q < 0.45 && x < 0 && y < 0 ? "#FFF2EA" : PAL.dot); } }
    else { const s = Math.max(1, R(0.2 * z)), x0 = R(X - s / 2), y0 = R(Y - s / 2); for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { if (a < 1 && a <= bayer(x0 + x, y0 + y)) continue; c.px(x0 + x, y0 + y, x === 0 && y === 0 && s > 2 ? "#FFF2EA" : PAL.dot); } }
  }
}

// ---------------------------------------------------------------- shading helper: 5-step ramp with dithered bands
function ramp(rampCols, v, X, Y) { const s = Math.max(0, Math.min(0.999, v)) * 4, lo = Math.floor(s), f = s - lo; return rampCols[Math.min(4, f > bayer(X, Y) ? lo + 1 : lo)]; }

// ---------------------------------------------------------------- Pac-Man: disc, mouth wedge facing `ang`, open `mouth` 0..1
export function drawPac(c, cam, x, y, ang, mouth, alpha = 1, scale = 1) {
  const z = cam.z * scale, r = 0.8, [X0, Y0] = toS(cam, x, y), Rp = r * z, out = 1.4 / z;
  const half = 0.03 + mouth * 0.82, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let Y = Math.floor(Y0 - Rp - 2); Y <= Math.ceil(Y0 + Rp + 2); Y++) for (let X = Math.floor(X0 - Rp - 2); X <= Math.ceil(X0 + Rp + 2); X++) {
    const u = (X + 0.5 - X0) / z, v = (Y + 0.5 - Y0) / z, q = Math.hypot(u, v); if (q > r) continue;
    // mouth wedge (in Pac-Man's own frame)
    const lu = u * ca + v * sa, lv = -u * sa + v * ca, a = Math.atan2(lv, lu);
    if (Math.abs(a) < half && lu > -0.05) continue;
    if (alpha < 1 && alpha <= bayer(X, Y)) continue;
    // edge (outline) : near the rim or the mouth cut
    const rim = r - q, cut = Math.abs(a) < half + 0.5 ? Math.min(Math.abs(Math.sin(a - half)), Math.abs(Math.sin(a + half))) * q : 9;
    if (rim < out || (cut < out && lu > 0)) { c.px(X, Y, PAL.pac[0]); continue; }
    const nx = u / r, ny = v / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lit = Math.max(0, -0.45 * nx - 0.6 * ny + 0.66 * nz);
    c.px(X, Y, ramp(PAL.pac, 0.18 + lit * 0.95, X, Y));
  }
}

// ---------------------------------------------------------------- ghost: dome + body + wavy skirt; eyes look along `look`
export function drawGhost(c, cam, x, y, name, look, wave, alpha = 1, scale = 1, opts = {}) {
  const z = cam.z * scale, [X0, Y0] = toS(cam, x, y), Wd = 0.76, top = -0.78, base = 0.66, out = 1.4 / z, P = opts.ramp || PAL[name];
  const inside = (u, v) => {
    if (Math.abs(u) > Wd) return false;
    if (v < top + Wd) return Math.hypot(u, v - (top + Wd)) <= Wd;   // dome
    const ph = ((u / Wd + 1) * 1.5 + wave) * Math.PI * 2, edge = base - 0.09 - 0.09 * Math.cos(ph);   // 3 scallops, sliding
    return v <= edge;
  };
  const Rb = (Wd + 0.1) * z;
  for (let Y = Math.floor(Y0 + (top - 0.1) * z); Y <= Math.ceil(Y0 + (base + 0.1) * z); Y++) for (let X = Math.floor(X0 - Rb); X <= Math.ceil(X0 + Rb); X++) {
    const u = (X + 0.5 - X0) / z, v = (Y + 0.5 - Y0) / z; if (!inside(u, v)) continue;
    if (alpha < 1 && alpha <= bayer(X, Y)) continue;
    if (!inside(u + out, v) || !inside(u - out, v) || !inside(u, v + out) || !inside(u, v - out)) { c.px(X, Y, P[0]); continue; }
    // cylinder-ish shading, lit from the top-left
    const nx = u / Wd, dome = v < top + Wd ? Math.max(0, (top + Wd - v) / Wd) : 0, lit = Math.max(0, 0.62 - 0.55 * nx + 0.35 * dome - 0.25 * Math.max(0, (v - 0.2) / 0.5));
    c.px(X, Y, ramp(P, 0.15 + lit * 0.9, X, Y));
  }
  if (opts.noEyes) return;
  // eyes: whites + pupils shifted toward `look` (a unit vector, already smoothed by the caller)
  const [lx, ly] = look;
  for (const sx of [-0.3, 0.3]) {
    const ex = sx + lx * 0.07, ey = -0.2 + ly * 0.07, rx = 0.21, ry = 0.27;
    const px = ex + lx * 0.1, py = ey + ly * 0.12, pr = 0.12;
    for (let Y = Math.floor(Y0 + (ey - ry - 0.05) * z); Y <= Math.ceil(Y0 + (ey + ry + 0.05) * z); Y++) for (let X = Math.floor(X0 + (ex - rx - 0.05) * z); X <= Math.ceil(X0 + (ex + rx + 0.05) * z); X++) {
      const u = (X + 0.5 - X0) / z, v = (Y + 0.5 - Y0) / z; if (((u - ex) / rx) ** 2 + ((v - ey) / ry) ** 2 > 1) continue;
      if (alpha < 1 && alpha <= bayer(X, Y)) continue;
      const pd = Math.hypot(u - px, v - py);
      c.px(X, Y, pd <= pr ? PAL.pupil : v - ey > ry * 0.55 ? PAL.eyeLo : PAL.eye);
    }
  }
}
