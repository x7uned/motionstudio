// «The ghast's cry» — the block creatures and studio props, drawn as projected boxes into the iso views (box math from
// actors.mjs, the frozen copy of mc-redstone/film/actors.mjs). All our own designs, no game textures:
//   ghast   — a floating white 4-block cube with nine swaying tentacles; face on its front: eyes (closed → open), grey tear
//             streaks, a mouth that opens with the measured envelope of the sound it makes;
//   cat     — a grey tabby block cat: curled asleep → head up, awake → grumbling → purring with happy closed eyes; the same
//             model ×7 is the "sleeping cat" silhouette the ghast turns into at the start;
//   props   — stool, desk chair, monitor (REC dot), synth keyboard, headphones, the microphone on a stand;
//   creeper-like and spider-like block critters (ours) for "Minecraft hides more sounds".
// Every state is a continuous parameter (eye opening, mouth opening, head pose, alpha) — never a one-frame swap.
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { drawBox, quadUV } from "./actors.mjs";

const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function basis(f) { return { F: [Math.sin(f), 0, Math.cos(f)], R: [Math.cos(f), 0, -Math.sin(f)], U: [0, 1, 0] }; }
// front-face coordinates: s = left → right as seen, h = bottom → top (quadUV: u runs up, v runs along R)
const front = (q, X, Y) => { const [u, v] = quadUV(q, X, Y); return [v, u]; };
const W_ = 540, H_ = 960;
/** whiten toward a silhouette (k 0..1) */
const sil = (col, k, to) => (k > 0 ? mixc(col, to, k) : col);

// ================================================================ the ghast
const GH = { white: hx("#F0EEEC"), white2: hx("#DADADE"), grey: hx("#B8B8C0"), eye: hx("#1A1418"), glint: hx("#F4F0F0"), mouth: hx("#24141A"), inner: hx("#6A1E24"), tear: hx("#A8A8B2") };
/** st: {x, y, z (body centre), s (scale, 1 = 4 blocks), face (rad), eo 0..1, mo 0..1, t, alpha, white 0..1 (silhouette), bob} */
export function drawGhast(c, cam, st, depth) {
  const a = st.alpha ?? 1; if (a <= 0) return; const k = st.s ?? 1, { F, R, U } = basis(st.face ?? Math.PI / 2), t = st.t;
  const o = [st.x, st.y + (st.bob ?? 0), st.z], wk = st.white ?? 0, WHITE = hx("#FDFEED");
  // tentacles (3 × 3 under the body), far ones first
  const tents = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const lx = (i - 1) * 1.3, lz = (j - 1) * 1.3, L = 1.9 + 1.5 * hash(i * 3 + j, 7);
    const ph = hash(i, j * 5 + 1) * 6.283, a1 = 0.16 * Math.sin(t * 1.9 + ph), a2 = 0.13 * Math.sin(t * 1.5 + ph * 1.7);
    const wx = o[0] + (R[0] * lx + F[0] * lz) * k, wz = o[2] + (R[2] * lx + F[2] * lz) * k; tents.push({ lx, lz, L, a1, a2, key: wx + wz }); }
  tents.sort((p, q) => p.key - q.key);
  for (const tn of tents) {
    const d = [Math.sin(tn.a2), -1, Math.sin(tn.a1)], n = Math.hypot(...d), dl = d.map((v) => v / n);       // local (R, U, F)
    const Uw = [-(R[0] * dl[0] + U[0] * dl[1] + F[0] * dl[2]), -(R[1] * dl[0] + U[1] * dl[1] + F[1] * dl[2]), -(R[2] * dl[0] + U[2] * dl[1] + F[2] * dl[2])];
    const Rw = R, Fw = [Uw[1] * Rw[2] - Uw[2] * Rw[1], Uw[2] * Rw[0] - Uw[0] * Rw[2], Uw[0] * Rw[1] - Uw[1] * Rw[0]];
    const piv = [o[0] + (R[0] * tn.lx + F[0] * tn.lz) * k, o[1] - 1.95 * k, o[2] + (R[2] * tn.lx + F[2] * tn.lz) * k];
    drawBox(c, cam, W_, H_, piv, Rw, Uw, Fw, [0, -tn.L * k / 2, 0], [0.22 * k, tn.L * k / 2, 0.22 * k], (nn, X, Y, q) => { const [u] = quadUV(q, X, Y); return sil(nn[1] ? GH.white : u < 0.25 ? GH.white2 : GH.white, wk, WHITE); }, depth, a);
  }
  // the body; its front face carries the face
  const eo = clamp01(st.eo ?? 0), mo = clamp01(st.mo ?? 0);
  drawBox(c, cam, W_, H_, o, R, U, F, [0, 0, 0], [2 * k, 2 * k, 2 * k], (n, X, Y, q) => {
    let col = GH.white;
    const [u, v] = quadUV(q, X, Y), pu = Math.floor(u * 16), pv = Math.floor(v * 16);
    if (hash(pu + n[0] * 31 + n[1] * 57, pv + n[2] * 13) < 0.13) col = GH.white2;
    if (n[2] === 1) { // the face, on a 16 × 16 pixel grid
      const [s0, h0] = front(q, X, Y), s = (Math.floor(s0 * 16) + 0.5) / 16, h = (Math.floor(h0 * 16) + 0.5) / 16;
      for (const ex of [0.28, 0.72]) {
        if (Math.abs(s - ex) < 0.12) {
          const top = 0.66 + 0.03 * eo, bot = 0.62 - 0.1 * eo;
          if (h > bot && h < top) { col = eo > 0.55 && h > top - 0.07 && s < ex - 0.03 && s > ex - 0.1 ? GH.glint : GH.eye; break; }
          if (eo < 0.9 && h < 0.6 && h > 0.36 && (Math.abs(s - (ex - 0.06)) < 0.032 || (Math.abs(s - (ex + 0.05)) < 0.032 && h > 0.46))) col = mixc(col, GH.tear, 1 - eo * 0.7);
        }
      }
      if (Math.abs(s - 0.5) < 0.17 + 0.03 * mo) { const top = 0.33, bot = 0.3 - 0.19 * mo; if (h > bot && h < top) col = mo > 0.25 && h > bot + 0.04 && h < top - 0.04 && Math.abs(s - 0.5) < 0.13 ? GH.inner : GH.mouth; }
    }
    return sil(col, wk, WHITE);
  }, depth, a);
}
/** screen point of the ghast's mouth (for the fireball, sound rings and labels) */
export function ghastMouth(cam, st, isoProject) {
  const k = st.s ?? 1, { F, U } = basis(st.face ?? Math.PI / 2), o = [st.x, st.y + (st.bob ?? 0), st.z];
  return isoProject(cam, W_, H_, o[0] + F[0] * 2.02 * k, o[1] - 0.8 * k, o[2] + F[2] * 2.02 * k);
}

// ================================================================ the cat
const CT = { fur: hx("#8E8994"), furD: hx("#615D68"), furL: hx("#C9C3CC"), nose: hx("#E08A9A"), eye: hx("#C8D850"), pupil: hx("#141016"), lid: hx("#3A3640"), mouth: hx("#2A1A20") };
/** st: {x, y (belly floor), z, s (scale), face, up 0..1 (head raised), eo 0..1 (eyes open), mo 0..1 (mouth), happy 0..1 (^ ^ eyes),
 *      t, alpha, white 0..1, purr 0..1 (tiny vibration)} */
export function drawCat(c, cam, st, depth) {
  const a = st.alpha ?? 1; if (a <= 0) return; const k = st.s ?? 1, f = st.face ?? Math.PI / 2, { F, R, U } = basis(f), t = st.t ?? 0;
  const up = clamp01(st.up ?? 0), eo = clamp01(st.eo ?? 0), mo = clamp01(st.mo ?? 0), hp = clamp01(st.happy ?? 0), wk = st.white ?? 0, WHITE = hx("#FDFEED");
  const vib = (st.purr ?? 0) * 0.006 * Math.sin(t * 90), o = [st.x + vib, st.y, st.z], br = 1 + 0.035 * Math.sin(t * 2.2) * (1 - up * 0.6);
  const B = (cen, half, colFn) => drawBox(c, cam, W_, H_, o, R, U, F, cen.map((v) => v * k), half.map((v) => v * k), (n, X, Y, q) => { const col = colFn(n, X, Y, q); return col ? sil(col, wk, WHITE) : null; }, depth, a);
  const stripes = (n, X, Y, q) => { const [u, v] = quadUV(q, X, Y); if (n[1] === -1) return CT.furL; if (n[1] === 1) return Math.floor(v * 7) % 2 && u > 0.15 && u < 0.85 ? CT.furD : CT.fur; return Math.floor(u * 6 + v * 2) % 3 === 0 ? CT.furD : CT.fur; };
  // tail: sleeping it wraps the right side to the front; awake it curls up behind
  const tailS = [[-0.12, 0.08, -0.36], [-0.25, 0.07, -0.12], [-0.25, 0.07, 0.14], [-0.12, 0.06, 0.36]];
  const tailA = [[0, 0.22, -0.38], [0, 0.36, -0.5], [0, 0.52, -0.52], [0.02, 0.62, -0.44]];
  const tw = 0.06 * Math.sin(t * 1.3);
  const tail = tailS.map((p, i) => lerp3(p, tailA[i], up)).map((p, i) => [p[0] + (up > 0.5 ? tw * i * 0.4 : 0), p[1], p[2]]);
  for (let i = 0; i < tail.length; i++) B(tail[i], [0.055, 0.055, 0.07], (n) => (i === tail.length - 1 ? CT.furD : i % 2 ? CT.furD : CT.fur));
  // body (a loaf), back legs as haunch blocks
  B([0, 0.19 * br, -0.04], [0.2, 0.18 * br, 0.34], stripes);
  B([0.12, 0.08, -0.22], [0.08, 0.08, 0.12], () => CT.fur); B([-0.12, 0.08, -0.22], [0.08, 0.08, 0.12], () => CT.fur);
  // front paws
  B([0.09, 0.05 + 0.04 * up, 0.33], [0.055, 0.05 + 0.04 * up, 0.07], () => CT.furL); B([-0.09, 0.05 + 0.04 * up, 0.33], [0.055, 0.05 + 0.04 * up, 0.07], () => CT.furL);
  // head
  const hc = lerp3([0, 0.21, 0.4], [0, 0.46, 0.36], up), hh = [0.19, 0.155, 0.15];
  B(hc, hh, (n, X, Y, q) => {
    if (n[2] !== 1) { const [u, v] = quadUV(q, X, Y); return n[1] === 1 && Math.floor(v * 5) % 2 ? CT.furD : CT.fur; }
    const [s0, h0] = front(q, X, Y), s = (Math.floor(s0 * 12) + 0.5) / 12, h = (Math.floor(h0 * 12) + 0.5) / 12;
    // forehead stripes
    if (h > 0.8 && (Math.abs(s - 0.5) < 0.05 || Math.abs(s - 0.32) < 0.05 || Math.abs(s - 0.68) < 0.05)) return CT.furD;
    for (const ex of [0.27, 0.73]) if (Math.abs(s - ex) < 0.11) {
      if (hp > 0.5 && eo < 0.5) { // happy ^ ^
        const peak = 0.6, dy = Math.abs(s - ex) * 0.9; if (Math.abs(h - (peak - dy)) < 0.05) return CT.lid;
      } else {
        const top = 0.6 + 0.09 * eo, bot = 0.58 - 0.08 * eo;
        if (h > bot && h < top) return eo < 0.3 ? CT.lid : Math.abs(s - ex) < 0.035 ? CT.pupil : CT.eye;
      }
    }
    if (Math.abs(s - 0.5) < 0.07 && h > 0.36 && h < 0.46) return CT.nose;
    if (h < 0.36 && h > 0.04) { // muzzle and mouth
      if (Math.abs(s - 0.5) < 0.2) { const mbot = 0.3 - 0.2 * mo; if (Math.abs(s - 0.5) < 0.07 + 0.05 * mo && h > mbot && h < 0.32) return CT.mouth; return CT.furL; }
    }
    return CT.fur;
  });
  // ears (perk up with the head)
  for (const sx of [-1, 1]) B([hc[0] + sx * 0.11, hc[1] + 0.19, hc[2] - 0.02], [0.055, 0.055 + 0.015 * up, 0.035], (n, X, Y, q) => { if (n[2] !== 1) return CT.furD; const [s, h] = front(q, X, Y); return Math.abs(s - 0.5) < 0.22 && h < 0.7 ? hx("#B88A92") : CT.furD; });
  // a light muzzle block with the nose (gives the face some depth)
  B([hc[0], hc[1] - 0.075, hc[2] + 0.17], [0.085, 0.05, 0.025], (n, X, Y, q) => { if (n[2] !== 1) return CT.furL; const [s, h] = front(q, X, Y); if (h > 0.55 && Math.abs(s - 0.5) < 0.18) return CT.nose; if (mo > 0.15 && h < 0.45 - 0.0 && Math.abs(s - 0.5) < 0.12 + 0.1 * mo && h > 0.42 - 0.6 * mo) return CT.mouth; return CT.furL; });
}
/** screen point of the cat's mouth */
export function catMouth(cam, st, isoProject) {
  const k = st.s ?? 1, { F, U } = basis(st.face ?? Math.PI / 2), up = clamp01(st.up ?? 0), hc = lerp3([0, 0.21, 0.4], [0, 0.46, 0.36], up);
  return isoProject(cam, W_, H_, st.x + F[0] * (hc[2] + 0.16) * k, st.y + (hc[1] - 0.06) * k, st.z + F[2] * (hc[2] + 0.16) * k);
}

// ================================================================ studio props
const PR = { wood: hx("#8A5A34"), woodD: hx("#5E3C22"), metal: hx("#3A3A44"), metalL: hx("#6A6A78"), cushion: hx("#3E5E9A"), black: hx("#18181E"), screen: hx("#1E3A5A"), screenL: hx("#3E7AB0"), red: hx("#F03A3A"), keyW: hx("#ECEAE4"), keyB: hx("#202026"), grille: hx("#9A9AA8"), grilleD: hx("#5A5A66") };
const Z = [0, 1, 0];
export function drawStool(c, cam, x, y0, z, depth, a = 1) {
  const R = [1, 0, 0], F = [0, 0, 1], o = [x, y0, z];
  for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) drawBox(c, cam, W_, H_, o, R, Z, F, [dx, 0.25, dz], [0.05, 0.25, 0.05], () => PR.woodD, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.52, 0], [0.42, 0.04, 0.42], (n) => (n[1] === 1 ? PR.cushion : PR.wood), depth, a);
}
export function drawChair(c, cam, x, y0, z, depth, a = 1) {
  const R = [1, 0, 0], F = [0, 0, 1], o = [x, y0, z];
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.22, 0], [0.06, 0.22, 0.06], () => PR.metal, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.05, 0], [0.3, 0.03, 0.06], () => PR.metal, depth, a); drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.05, 0], [0.06, 0.03, 0.3], () => PR.metal, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.5, 0], [0.32, 0.06, 0.32], () => PR.black, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.95, -0.3], [0.3, 0.38, 0.05], () => PR.black, depth, a);
}
/** monitor on the desk; rec 0..1 lights a red REC dot, wave: a tiny level meter on the screen */
export function drawMonitor(c, cam, m, rec, t, depth, a = 1) {
  const R = [1, 0, 0], F = [0, 0, 1], o = [m.x, m.y, m.z];
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.06, 0], [0.18, 0.06, 0.14], () => PR.metal, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.62, 0.05], [0.62, 0.42, 0.14], (n, X, Y, q) => {
    if (n[2] !== 1) return PR.black; const [s, h] = front(q, X, Y);
    if (s < 0.06 || s > 0.94 || h < 0.08 || h > 0.94) return PR.black;
    // a DAW-like screen: tracks as bars, a red dot top-left once recording
    if (rec > 0 && Math.hypot((s - 0.16) * 1.4, h - 0.82) < 0.07 && rec > bayer(X, Y)) return PR.red;
    const row = Math.floor((h - 0.1) * 6); if (row >= 0 && row < 4 && s > 0.12 && s < 0.12 + 0.76 * (0.4 + 0.6 * hash(row, 3))) return (Math.floor(s * 30) % 3) ? PR.screenL : PR.screen;
    return PR.screen;
  }, depth, a);
}
export function drawKeyboard(c, cam, x, y, z, depth, a = 1) {
  const R = [1, 0, 0], F = [0, 0, 1], o = [x, y, z];
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.05, 0], [0.75, 0.05, 0.2], (n, X, Y, q) => { if (n[1] !== 1) return PR.black; const [u, v] = quadUV(q, X, Y); if (u < 0.4) return PR.black; const key = Math.floor(v * 22); return u < 0.7 && key % 7 !== 2 && key % 7 !== 6 && (Math.floor(v * 44) % 2) ? PR.keyB : PR.keyW; }, depth, a);
}
export function drawHeadphones(c, cam, x, y, z, depth, a = 1) {
  const R = [1, 0, 0], F = [0, 0, 1], o = [x, y, z];
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.07, -0.16], [0.09, 0.07, 0.04], () => PR.black, depth, a); drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.07, 0.16], [0.09, 0.07, 0.04], () => PR.black, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.17, 0], [0.03, 0.03, 0.17], () => PR.metalL, depth, a);
}
/** the microphone on a stand: base, pole, capsule with a grille; glow 0..1 brightens the capsule (tagged on cue) */
export function drawMic(c, cam, m, glow, depth, a = 1) {
  const R = [1, 0, 0], F = [0, 0, 1], o = [m.x, m.y, m.z], top = m.top - m.y;
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, 0.03, 0], [0.24, 0.03, 0.24], () => PR.metal, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, top / 2, 0], [0.035, top / 2, 0.035], () => PR.metalL, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, top + 0.16, 0], [0.11, 0.18, 0.11], (n, X, Y, q) => { const [u, v] = quadUV(q, X, Y); const g = (Math.floor(u * 8) + Math.floor(v * 6)) % 2 ? PR.grille : PR.grilleD; return glow > 0 ? mixc(g, hx("#FFF0B0"), glow * 0.6) : g; }, depth, a);
  drawBox(c, cam, W_, H_, o, R, Z, F, [0, top - 0.04, 0], [0.08, 0.04, 0.08], () => PR.black, depth, a);
}

// ================================================================ critters (ours) for "more sounds"
const scaled = (k) => (c, cam, W, H, o, R, U, F, cen, half, fn, depth, a) => drawBox(c, cam, W, H, o, R, U, F, cen.map((v) => v * k), half.map((v) => v * k), fn, depth, a);
export function drawCreeperish(c, cam, st, depth) {
  const drawBox = scaled(st.s ?? 1);
  const a = st.alpha ?? 1; if (a <= 0) return; const { F, R, U } = basis(st.face ?? 0), o = [st.x, st.y, st.z], g1 = hx("#4E9A3E"), g2 = hx("#3A7A2E"), g3 = hx("#6AB852"), dk = hx("#121A10");
  const mott = (n, X, Y, q) => { const [u, v] = quadUV(q, X, Y), p = hash(Math.floor(u * 6) + n[0] * 7 + n[1] * 11, Math.floor(v * 6) + n[2] * 5); return p < 0.3 ? g2 : p > 0.82 ? g3 : g1; };
  for (const [dx, dz] of [[-0.13, -0.13], [0.13, -0.13], [-0.13, 0.13], [0.13, 0.13]]) drawBox(c, cam, W_, H_, o, R, U, F, [dx, 0.15, dz], [0.12, 0.15, 0.12], mott, depth, a);
  drawBox(c, cam, W_, H_, o, R, U, F, [0, 0.62, 0], [0.24, 0.34, 0.14], mott, depth, a);
  drawBox(c, cam, W_, H_, o, R, U, F, [0, 1.2, 0], [0.24, 0.24, 0.24], (n, X, Y, q) => { if (n[2] !== 1) return mott(n, X, Y, q); const [s0, h0] = front(q, X, Y), s = Math.floor(s0 * 8), h = Math.floor(h0 * 8);
    if (h >= 4 && h <= 5 && (s === 1 || s === 2 || s === 5 || s === 6)) return dk; if (h >= 1 && h <= 3 && s >= 3 && s <= 4) return dk; return mott(n, X, Y, q); }, depth, a);
}
export function drawSpiderish(c, cam, st, depth) {
  const drawBox = scaled(st.s ?? 1);
  const a = st.alpha ?? 1; if (a <= 0) return; const { F, R, U } = basis(st.face ?? 0), o = [st.x, st.y, st.z], t = st.t ?? 0, b1 = hx("#4A4038"), b2 = hx("#62564A"), eye = hx("#FF4A4A");
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const lz = -0.25 + i * 0.17, wig = 0.03 * Math.sin(t * 6 + i + sx); drawBox(c, cam, W_, H_, o, R, U, F, [sx * 0.42, 0.2 + wig, lz], [0.26, 0.03, 0.03], () => b1, depth, a); drawBox(c, cam, W_, H_, o, R, U, F, [sx * 0.66, 0.1, lz], [0.03, 0.11, 0.03], () => b1, depth, a); }
  drawBox(c, cam, W_, H_, o, R, U, F, [0, 0.24, -0.25], [0.26, 0.18, 0.28], () => b2, depth, a);
  drawBox(c, cam, W_, H_, o, R, U, F, [0, 0.24, 0.2], [0.2, 0.15, 0.17], (n, X, Y, q) => { if (n[2] !== 1) return b1; const [s, h] = front(q, X, Y); if (h > 0.5 && h < 0.72 && (Math.abs(s - 0.3) < 0.09 || Math.abs(s - 0.7) < 0.09)) return eye; if (h > 0.78 && (Math.abs(s - 0.42) < 0.05 || Math.abs(s - 0.58) < 0.05)) return eye; return b1; }, depth, a);
}
