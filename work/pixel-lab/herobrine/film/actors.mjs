// Minecraft film — blocky characters drawn into the iso views (our own designs, not the game's skins):
//   hero     — our recurring hero as a block figure: coral puffer, purple bobble hat, blue scarf, yellow mittens;
//   friend   — the "Pixel Buddy" look as a block figure: brown hoodie, dark cap, glasses;
//   streamer — a generic block figure in a teal hoodie with headphones (stands in for the streamer; not a likeness);
//   dog      — a small block dog.
// Boxes are projected with the iso camera, faces shaded flat, occluded by the voxel depth buffer (x+y+z of each pixel).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { isoProject, perspProject } from "./voxel.mjs";

// projection mode: iso (default) or first person (persp: a rect, depth = −distance, an optional fog tint by distance)
let MODE = null;
export function usePersp(rect, fog = null) { MODE = { rect, fog }; }
export function useIso() { MODE = null; }

const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const LOOK = {
  hero: { skin: "#E8AE8E", shirt: "#E0565A", shirtD: "#B83A50", legs: "#3E4284", shoes: "#4A2C18", hat: "#6E4FB0", hatD: "#523D82", pom: "#B08AE8", scarf: "#5470B8", mitt: "#F4CA50", hair: "#4A2A1C" },
  friend: { skin: "#C98E6A", shirt: "#7A5034", shirtD: "#5E3A24", legs: "#2E3550", shoes: "#1E1A22", hat: "#2A2838", hatD: "#1A1826", brim: "#2A2838", glasses: "#141018", mitt: "#C98E6A", hair: "#241812" },
  // the "normal player" look of the legend: a generic block man in a teal shirt and blue jeans, with empty white eyes
  herobrine: { skin: "#B98C68", shirt: "#2A9E9E", shirtD: "#1E7C7C", legs: "#3A3E9A", shoes: "#4A4A52", hair: "#3A2414", mitt: "#B98C68" },
  player: { skin: "#B98C68", shirt: "#2A9E9E", shirtD: "#1E7C7C", legs: "#3A3E9A", shoes: "#4A4A52", hair: "#3A2414", mitt: "#B98C68" },
  streamer: { skin: "#E6B48E", shirt: "#2A9C9A", shirtD: "#1E7472", legs: "#30344A", shoes: "#20202A", hat: "#3A2A20", hatD: "#2A1E16", phones: "#1A1A22", mitt: "#E6B48E", hair: "#3A2A20" },
};

// ---------------------------------------------------------------- box math
function boxCorners(o, R, F, U, c, s) { // centre c (local), half sizes s, basis R (right), U (up), F (forward); returns 8 world points
  const pts = []; for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) { const l = [c[0] + dx * s[0], c[1] + dy * s[1], c[2] + dz * s[2]]; pts.push([o[0] + R[0] * l[0] + U[0] * l[1] + F[0] * l[2], o[1] + R[1] * l[0] + U[1] * l[1] + F[1] * l[2], o[2] + R[2] * l[0] + U[2] * l[1] + F[2] * l[2]]); }
  return pts;
}
// faces as corner index quads + local normal axis; corner index = (dx>0)*4 + (dy>0)*2 + (dz>0)
const FACES = [[[4, 5, 7, 6], [1, 0, 0]], [[0, 2, 3, 1], [-1, 0, 0]], [[2, 6, 7, 3], [0, 1, 0]], [[0, 1, 5, 4], [0, -1, 0]], [[1, 3, 7, 5], [0, 0, 1]], [[0, 4, 6, 2], [0, 0, -1]]];
function fillQuad(c, pts, col, depthAt, depth, W, alpha) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  y0 = Math.max(0, Math.ceil(y0 - 0.5)); y1 = Math.min(c.h - 1, Math.floor(y1 - 0.5));
  for (let Y = y0; Y <= y1; Y++) {
    const yc = Y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.max(0, Math.ceil(xs[k] - 0.5)); X <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); X++) {
      if (depth && depth[Y * W + X] > depthAt + 0.6) continue; if (alpha < 1 && alpha <= bayer(X, Y)) continue;
      const q = typeof col === "function" ? col(X, Y) : col; if (!q) continue; const i = (Y * W + X) * 3; c.d[i] = q[0]; c.d[i + 1] = q[1]; c.d[i + 2] = q[2];
    }
  }
}
function drawBox(c, cam, W, H, o, R, U, F, center, half, colFn, depth, alpha) {
  const pts = boxCorners(o, R, F, U, center, half);
  let sc, cx, dist = 0;
  if (MODE) { sc = []; for (const p of pts) { const q = perspProject(cam, MODE.rect, p[0], p[1], p[2]); if (!q) return; sc.push([q[0], q[1]]); }
    const m = pts.reduce((a, p) => [a[0] + p[0] / 8, a[1] + p[1] / 8, a[2] + p[2] / 8], [0, 0, 0]); dist = Math.hypot(m[0] - cam.x, m[1] - cam.y, m[2] - cam.z); cx = -dist; }
  else { sc = pts.map((p) => isoProject(cam, W, H, p[0], p[1], p[2])); cx = pts.reduce((a, p) => a + p[0] + p[1] + p[2], 0) / 8; }
  const fogK = MODE && MODE.fog ? MODE.fog(dist) : null;
  for (const [idx, n] of FACES) {
    const wn = [R[0] * n[0] + U[0] * n[1] + F[0] * n[2], R[1] * n[0] + U[1] * n[1] + F[1] * n[2], R[2] * n[0] + U[2] * n[1] + F[2] * n[2]];
    if (MODE) { const fc = idx.reduce((a, k) => [a[0] + pts[k][0] / 4, a[1] + pts[k][1] / 4, a[2] + pts[k][2] / 4], [0, 0, 0]); if (wn[0] * (cam.x - fc[0]) + wn[1] * (cam.y - fc[1]) + wn[2] * (cam.z - fc[2]) <= 0) continue; }
    else if (wn[0] + wn[1] + wn[2] <= 0.02) continue;
    const L = wn[1] > 0.5 ? 1 : 0.62 + 0.2 * Math.max(0, wn[0]) + 0.05 * Math.max(0, wn[2]);
    const q = idx.map((k) => sc[k]);
    fillQuad(c, q, (X, Y) => { const col = colFn(n, X, Y, q); if (!col) return null; let r = [col[0] * L, col[1] * L, col[2] * L]; if (col.glow) r = [col[0], col[1], col[2]];
      if (fogK) { const k = Math.floor(fogK.k * (col.glow ? 0.3 : 1) * 5 + bayer(X + 1, Y + 2)) / 5; r = [r[0] + (fogK.col[0] - r[0]) * k, r[1] + (fogK.col[1] - r[1]) * k, r[2] + (fogK.col[2] - r[2]) * k]; } return r; }, cx, depth, W, alpha);
  }
}
const lerpQ = (q, u, v) => { const a = [q[0][0] + (q[1][0] - q[0][0]) * u, q[0][1] + (q[1][1] - q[0][1]) * u], b = [q[3][0] + (q[2][0] - q[3][0]) * u, q[3][1] + (q[2][1] - q[3][1]) * u]; return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v]; };
// face-local (u, v) of a screen point inside a quad (approximate inverse via the quad's two edges)
function quadUV(q, X, Y) {
  const ex = [q[1][0] - q[0][0], q[1][1] - q[0][1]], ey = [q[3][0] - q[0][0], q[3][1] - q[0][1]], d = [X + 0.5 - q[0][0], Y + 0.5 - q[0][1]];
  const det = ex[0] * ey[1] - ex[1] * ey[0]; if (Math.abs(det) < 1e-6) return [0.5, 0.5];
  return [(d[0] * ey[1] - d[1] * ey[0]) / det, (ex[0] * d[1] - ex[1] * d[0]) / det];
}

/** a block person. st: {x, y (feet), z, face (rad, 0 → +z), walk (phase, rad) | null, wave 0..1, alpha, scale} */
export function drawPerson(c, cam, who, st, depth = null) {
  const L = LOOK[who], W = c.w, H = c.h, k = st.scale ?? 1, a = st.alpha ?? 1; if (a <= 0) return;
  const f = st.face ?? 0, F = [Math.sin(f), 0, Math.cos(f)], R = [Math.cos(f), 0, -Math.sin(f)], U = [0, 1, 0], o = [st.x, st.y, st.z];
  const sw = st.walk == null ? 0 : Math.sin(st.walk) * 0.6, col = (h) => hx(h);
  const solid = (h) => () => col(h);
  // a limb rotated about its top pivot by angle ang (about the local right axis)
  const limb = (px, py, ang, len, w, colTop, colBot, split = 0.3) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), F2 = [F[0] * ca - U[0] * sa, F[1] * ca - U[1] * sa, F[2] * ca - U[2] * sa], U2 = [U[0] * ca + F[0] * sa, U[1] * ca + F[1] * sa, U[2] * ca + F[2] * sa];
    const piv = [o[0] + R[0] * px * k + U[0] * py * k, o[1] + R[1] * px * k + U[1] * py * k, o[2] + R[2] * px * k + U[2] * py * k];
    drawBox(c, cam, W, H, piv, R, U2, F2, [0, -len * k / 2, 0], [w * k / 2, len * k / 2, w * k / 2], (n, X, Y, q) => { if (n[1] !== 0) return col(colTop); const [u, v] = quadUV(q, X, Y); return col(v > 1 - split ? colBot : colTop); }, depth, a);
  };
  // draw order: back parts first (far from the camera = smaller x+y+z); simple: legs, back arm, body, head, front arm
  const armA = st.wave ? -2.6 * st.wave : sw, armB = -sw;
  limb(-0.125, 0.75, sw, 0.75, 0.25, L.legs, L.shoes, 0.18); limb(0.125, 0.75, -sw, 0.75, 0.25, L.legs, L.shoes, 0.18);
  limb(-0.375, 1.5, armB, 0.72, 0.24, L.shirt, L.mitt, 0.25);
  drawBox(c, cam, W, H, o, R, U, F, [0, 1.125 * k, 0], [0.25 * k, 0.375 * k, 0.125 * k], (n, X, Y, q) => { if (n[2] === 1) { const [u, v] = quadUV(q, X, Y); if (who === "hero" && v > 0.8) return col(L.scarf); if (who === "friend" && Math.abs(u - 0.5) < 0.18 && v > 0.55) return col(L.shirtD); } return col(n[1] ? L.shirt : L.shirtD); }, depth, a);
  // head
  drawBox(c, cam, W, H, o, R, U, F, [0, 1.75 * k, 0], [0.25 * k, 0.25 * k, 0.25 * k], (n, X, Y, q) => {
    if (n[1] === 1) return col(L.hat ?? L.hair);
    let [u, v] = quadUV(q, X, Y);
    if (n[2] === 1) { [u, v] = [v, u]; } // the front quad's corner order runs up first: swap so u = across, v = up
    if (n[2] === 1) { // the face
      if (v > 0.72) return col(who === "hero" ? L.hat : L.hair);
      if (who === "player" && v > 0.4 && v < 0.53 && (Math.abs(u - 0.33) < 0.05 || Math.abs(u - 0.67) < 0.05)) return col("#3A3E9A");
      if (v > 0.38 && v < 0.55 && (Math.abs(u - 0.28) < 0.1 || Math.abs(u - 0.72) < 0.1)) { if (who === "herobrine") { const e = [255, 255, 255]; e.glow = true; return e; } return col(who === "friend" ? "#F4F4FA" : who === "player" ? "#F4F4FA" : "#1A1020"); }
      if (who === "friend" && v > 0.36 && v < 0.58 && (Math.abs(u - 0.28) < 0.17 || Math.abs(u - 0.72) < 0.17 || (v > 0.48 && v < 0.54))) return col(L.glasses);
      if (v > 0.16 && v < 0.24 && Math.abs(u - 0.5) < 0.16) return col("#9E4A44");
      return col(L.skin);
    }
    if (who === "streamer" && Math.abs(v - 0.5) < 0.22 && Math.abs(u - 0.5) < 0.3 && n[0] !== 0) return col(L.phones);
    return col(v > 0.6 ? (L.hat ?? L.hair) : n[0] !== 0 && who !== "hero" ? L.hair : who === "hero" && v > 0.6 ? L.hat : L.skin);
  }, depth, a);
  // hats: the bobble (hero), the cap with a brim (friend), headphones band (streamer)
  if (who === "hero") { drawBox(c, cam, W, H, o, R, U, F, [0, 2.06 * k, 0], [0.26 * k, 0.07 * k, 0.26 * k], solid(L.hatD), depth, a); drawBox(c, cam, W, H, o, R, U, F, [0, 2.2 * k, 0], [0.09 * k, 0.08 * k, 0.09 * k], solid(L.pom), depth, a); }
  if (who === "friend") { drawBox(c, cam, W, H, o, R, U, F, [0, 2.03 * k, 0], [0.26 * k, 0.05 * k, 0.26 * k], solid(L.hat), depth, a); drawBox(c, cam, W, H, o, R, U, F, [0, 1.99 * k, 0.32 * k], [0.24 * k, 0.025 * k, 0.12 * k], solid(L.brim), depth, a); }
  if (who === "streamer") drawBox(c, cam, W, H, o, R, U, F, [0, 2.03 * k, 0], [0.28 * k, 0.04 * k, 0.06 * k], solid(L.phones), depth, a);
  limb(0.375, 1.5, armA, 0.72, 0.24, L.shirt, L.mitt, 0.25);
}

/** a small block dog: {x, y, z, face, walk, alpha} */
export function drawDog(c, cam, st, depth = null) {
  const W = c.w, H = c.h, a = st.alpha ?? 1; if (a <= 0) return; const f = st.face ?? 0, F = [Math.sin(f), 0, Math.cos(f)], R = [Math.cos(f), 0, -Math.sin(f)], U = [0, 1, 0], o = [st.x, st.y, st.z];
  const fur = hx("#B07A48"), furD = hx("#8A5A34"), white = hx("#EFE6D8"), nose = hx("#1A1210"), sw = st.walk == null ? 0 : Math.sin(st.walk) * 0.12;
  const leg = (lx, lz, ph) => drawBox(c, cam, W, H, o, R, U, F, [lx, 0.17, lz + ph], [0.07, 0.17, 0.07], () => furD, depth, a);
  leg(-0.12, -0.28, sw); leg(0.12, -0.28, -sw); leg(-0.12, 0.25, -sw); leg(0.12, 0.25, sw);
  drawBox(c, cam, W, H, o, R, U, F, [0, 0.45, 0], [0.16, 0.13, 0.36], (n) => (n[1] === -1 ? white : fur), depth, a);
  drawBox(c, cam, W, H, o, R, U, F, [0, 0.4, -0.42], [0.04, 0.04, 0.12], () => furD, depth, a);
  drawBox(c, cam, W, H, o, R, U, F, [0, 0.66, 0.44], [0.15, 0.14, 0.14], (n, X, Y, q) => { if (n[2] === 1) { const [u, v] = quadUV(q, X, Y); if (v > 0.5 && v < 0.65 && (Math.abs(u - 0.25) < 0.09 || Math.abs(u - 0.75) < 0.09)) return nose; return white; } return fur; }, depth, a);
  drawBox(c, cam, W, H, o, R, U, F, [0, 0.58, 0.62], [0.07, 0.06, 0.06], (n) => (n[2] === 1 ? nose : white), depth, a);
  drawBox(c, cam, W, H, o, R, U, F, [-0.1, 0.84, 0.42], [0.04, 0.05, 0.03], () => furD, depth, a); drawBox(c, cam, W, H, o, R, U, F, [0.1, 0.84, 0.42], [0.04, 0.05, 0.03], () => furD, depth, a);
}

/** the hero's arm in first person (coral sleeve, yellow mitten), drawn into the FP image rect */
export function drawFPArm(c, rect, clip, t, bob = 0, swing = 0) {
  const sx = (u) => rect.x + u * rect.w, sy = (v) => rect.y + v * rect.h, s = rect.h / 960;
  const dx = Math.sin(t * 6.5) * 10 * swing * s, dy = (Math.abs(Math.sin(t * 6.5)) * 14 * swing + bob * 40) * s;
  // the arm as a slanted prism from the lower-right corner
  const base = [sx(0.5) + rect.h * 0.34 + dx, sy(1.08) + dy], tip = [sx(0.5) + rect.h * 0.22 + dx, sy(0.84) + dy], w = rect.h * 0.085;
  const quad = (pts, col) => { const c2 = hx(col); fillQuad({ w: c.w, h: c.h, d: c.d }, pts.map((p) => [Math.min(clip[2] + 2, Math.max(clip[0] - 2, p[0])), p[1]]), c2, 0, null, c.w, 1); };
  const n = [-(tip[1] - base[1]), tip[0] - base[0]], L = Math.hypot(...n), nn = [n[0] / L * w / 2, n[1] / L * w / 2];
  const A = [base[0] - nn[0], base[1] - nn[1]], B = [base[0] + nn[0], base[1] + nn[1]], C = [tip[0] + nn[0], tip[1] + nn[1]], D = [tip[0] - nn[0], tip[1] - nn[1]];
  const mid = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
  // side face (darker) to give the block arm depth
  quad([B, [B[0] + w * 0.35, B[1] - w * 0.1], [C[0] + w * 0.35, C[1] - w * 0.1], C], "#8A2840");
  quad([A, B, mid(B, C, 0.72), mid(A, D, 0.72)], "#E0565A");
  quad([mid(A, D, 0.72), mid(B, C, 0.72), C, D], "#F4CA50");
  quad([[C[0], C[1]], [C[0] + w * 0.35, C[1] - w * 0.1], [D[0] + w * 0.35, D[1] - w * 0.1], D], "#FAE375");
}
