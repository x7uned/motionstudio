// «Pumpkin face» — the picture. One persistent night scene: a carved-looking pumpkin on a dark field, a face-area brain
// at the top left, a timer card on «sixth». Pure function of t (no Math.random, no wall clock). Everything fades by
// dithered alpha (raster.mjs bayer) or moves on eased curves; nothing changes in one frame.
import { Canvas, bayer, hex, fade, MAIN, TINY } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, EV, BEAT, WORDS, VOICE_TEXT, CAP_SHOW, END, clamp01, sm, ease, lerp, frac, rnd } from "./timeline.mjs";

const C = {
  IV: "#FDFEED", K: "#0B0812", ORANGE: "#F08A3C", OUT: "#2A1006", HOLE: "#1C0A03",
  GLOW0: "#F4A23C", GLOW1: "#FFE7A3", MOON: "#E8EEFF", MOONS: "#B9C8F0", MOONC: "#9AAAD8",
  SKY: ["#130C24", "#1A1130", "#21173C", "#281E48", "#30245A", "#3B2C5C", "#48366A", "#55407A"],
  FIELD: ["#2A1A3E", "#22163A", "#1A1032", "#130C26"],
  PUMP: ["#3A1205", "#6E2A0C", "#9C4214", "#C85E1E", "#E97F30", "#F6A24E", "#FFD08A"],
  STEM: ["#1E0E05", "#3E2010", "#5E3418", "#7C4A22"],
  BRAIN: ["#3A1A36", "#6A2F5A", "#9A4E7C", "#C97AA0", "#E9A6BE", "#F8D3DD"],
  PATCH_DARK: "#4A2550", FOG: "#8C7BB0", BAT: "#0B0814", WEB: "#4A3F6E", SHADOW: "#120A22", STAR: "#CFC6F0", TUFT: "#1A0E2A",
};
const H = (k) => hex(k);
const mixc = (a, b, k) => { const x = hex(a), y = hex(b); return [0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * k)); };
const rampAt = (ramp, v) => { const f = clamp01(v) * (ramp.length - 1), lo = Math.floor(f); return { lo, f: f - lo }; };
// Direct pixel write (alpha by ordered dither, so partial alpha dissolves instead of blending).
function put(c, x, y, rgb, a = 1) {
  x = Math.floor(x); y = Math.floor(y);
  if (a <= 0 || x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  if (a < 1 && !(a > bayer(x, y))) return;
  const i = (y * c.w + x) * 3, d = c.d; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2];
}
const cc = (h) => H(h);

// ---------------------------------------------------------------- baked blobs (silhouette + shading, local coords)
// A blob is a lit ellipsoid with a slightly lobed outline. Local (lx, ly) run from -ox..ox-1, -oy..oy-1 relative to the centre.
function bakeBlob({ rx, ry, lobe = 0.02, lobeK = 6, ribs = 0, light = [-0.5, -0.62, 0.6], pre = null }) {
  const ox = rx + 12, oy = ry + 12, w = ox * 2, h = oy * 2;
  const inside = new Uint8Array(w * h), shade = new Float32Array(w * h), outline = new Uint8Array(w * h), extra = new Uint8Array(w * h);
  const L = Math.hypot(...light), Ln = light.map((v) => v / L);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const lx = i - ox, ly = j - oy, u = lx / rx, v = ly / ry, r2 = u * u + v * v, th = Math.atan2(v, u);
    const lb = 1 + lobe * Math.cos(lobeK * th) ; if (r2 > lb * lb) continue;
    const k = j * w + i; inside[k] = 1;
    const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, r2))), nu = Math.max(-1, Math.min(1, u)), nv = v;
    let s = 0.1 + 0.92 * Math.max(0, nu * Ln[0] + nv * Ln[1] + nz * Ln[2]);
    if (ribs) { const phi = Math.asin(nu), rd = Math.pow(Math.abs(Math.cos(ribs * phi)), 14); s *= 1 - 0.32 * rd; }
    s *= 0.62 + 0.38 * Math.sqrt(Math.max(0, nz));
    shade[k] = Math.min(1, Math.max(0, s));
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; if (!inside[k]) continue;
    const edge = i === 0 || j === 0 || i === w - 1 || j === h - 1 || !inside[k - 1] || !inside[k + 1] || !inside[k - w] || !inside[k + w]; if (edge) outline[k] = 1; }
  if (pre) pre({ w, h, ox, oy, inside, shade, extra, outline });
  return { w, h, ox, oy, inside, shade, outline, extra };
}

// ---------------------------------------------------------------- the pumpkin (local coords: centre = pumpkin centre)
const PR = { rx: 100, ry: 84 };
const HOLES = { L: [[-62, -34], [-32, -34], [-47, -8]], R: [[32, -34], [62, -34], [47, -8]] };
const inTri = (x, y, [a, b, c2]) => {
  const d = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [x, y], d1 = d(p, a, b), d2 = d(p, b, c2), d3 = d(p, c2, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const mouthY = (lx) => 22 - 0.010 * lx * lx;   // a smile: the ends turn up
let PUMP = null;
function bakePumpkin() {
  const B = bakeBlob({ rx: PR.rx, ry: PR.ry, lobe: 0.025, lobeK: 6, ribs: 6.2,
    pre: ({ w, h, ox, oy, inside, extra, outline, shade }) => {
      // holes (1 left, 2 right, 3 mouth) and the rim around each hole, the glow halo, the stem
      const hole = new Uint8Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i, lx = i - ox, ly = j - oy;
        if (!inside[k]) continue;
        if (inTri(lx, ly, HOLES.L)) hole[k] = 1; else if (inTri(lx, ly, HOLES.R)) hole[k] = 2;
        else if (lx >= -46 && lx <= 46 && Math.abs(ly - mouthY(lx)) <= 2.2) hole[k] = 3; }
      const near = new Uint8Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; if (!hole[k]) continue;
        for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= w || y >= h) continue; const kk = y * w + x; if (inside[kk] && !hole[kk] && Math.abs(a) + Math.abs(b) <= 4) near[kk] = 1; } }
      // rim = the 1-px dark outline of each hole, owned by that hole (1, 2 or 3); halo = the glowing edge around the holes
      const rim = new Uint8Array(w * h), halo = new Uint8Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; if (!inside[k] || hole[k]) continue;
        const nb = [i > 0 ? hole[k - 1] : 0, i < w - 1 ? hole[k + 1] : 0, j > 0 ? hole[k - w] : 0, j < h - 1 ? hole[k + w] : 0].find((v) => v);
        if (nb) rim[k] = nb;
        if (near[k]) halo[k] = 1; }
      // spill distance to the three glow centres
      const cen = [[-47, -21], [47, -21], [0, 22]], dC = new Float32Array(w * h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i, lx = i - ox, ly = j - oy; dC[k] = Math.min(...cen.map(([x, y]) => Math.hypot(lx - x, ly - y))); }
      extra.set(hole.map((v, k) => v), 0); PUMP_EXTRA = { hole, rim, halo, dC };
    } });
  // stem: a small curved stalk above the top of the body
  const stem = new Uint8Array(B.w * B.h), stemS = new Float32Array(B.w * B.h);
  for (let j = 0; j < B.h; j++) for (let i = 0; i < B.w; i++) { const k = j * B.w + i, lx = i - B.ox, ly = j - B.oy;
    if (ly < -PR.ry - 16 || ly > -PR.ry + 6) continue; const bend = 0.04 * (ly + PR.ry + 16) * (ly + PR.ry + 16) / 10;
    if (Math.abs(lx - bend) <= 5.5) { stem[k] = 1; stemS[k] = 0.25 + 0.55 * (1 - Math.pow((lx - bend) / 5.5, 2)); } }
  return { ...B, ...PUMP_EXTRA, stem, stemS };
}
let PUMP_EXTRA = null;

// ---------------------------------------------------------------- the brain (face area at the underside, back-right)
const BR = { rx: 52, ry: 38 };
const BRAIN_PATCH = { x: 10, y: 22, rx: 10, ry: 6 }, BRAIN_CB = { x: -26, y: 20, rx: 14, ry: 9 };
let BRAIN = null;
function bakeBrain() {
  return bakeBlob({ rx: BR.rx, ry: BR.ry, lobe: 0.05, lobeK: 5, light: [-0.55, -0.7, 0.45], pre: ({ w, h, ox, oy, inside, extra }) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i, lx = i - ox, ly = j - oy; if (!inside[k]) continue;
      const pe = ((lx - BRAIN_PATCH.x) / BRAIN_PATCH.rx) ** 2 + ((ly - BRAIN_PATCH.y) / BRAIN_PATCH.ry) ** 2;
      const ce = ((lx - BRAIN_CB.x) / BRAIN_CB.rx) ** 2 + ((ly - BRAIN_CB.y) / BRAIN_CB.ry) ** 2;
      if (pe <= 1) extra[k] = 1; else if (pe <= 1.9 && pe > 1) extra[k] = 2; // patch, halo ring
      if (ce <= 1) extra[k] = 3; // cerebellum
      if (ly > 26 && ly < 46 && lx > -6 && lx < 6 && !ce) extra[k] = 4 // stem below
    } } });
}

// ---------------------------------------------------------------- the static world (sky, moon, halo, web, field, tufts, shadow)
let STATIC = null;
const TOP_FIELD = (x) => 500 + 6 * Math.sin(x / 58) + 3 * Math.sin(x / 19 + 1);
function bakeStatic() {
  const c = new Canvas(GW, GH, C.SKY[0]);
  const hs = C.SKY.length - 1, horizon = 540;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const f = clamp01(y / horizon) * hs, lo = Math.floor(f), k = Math.min(hs, lo + ((f - lo) > bayer(x, y) ? 1 : 0));
    const i = (y * GW + x) * 3; const col = hex(C.SKY[k]); c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2];
  }
  // warm light from the pumpkin (dithered tint in steps)
  c.tint(40, 170, 460, 470, (x, y) => { const d = Math.hypot(x - 270, y - 400) / 200; return d < 1 ? 0.3 * (1 - d) ** 1.6 : 0; }, C.ORANGE, 4);
  // moon (top left, background zone) with a dithered halo
  const mx = 84, my = 84;
  for (let y = my - 40; y <= my + 40; y++) for (let x = mx - 40; x <= mx + 40; x++) { const d = Math.hypot(x - mx, y - my);
    if (d > 20 && d < 34) put(c, x, y, hex(C.MOONS), 0.38 * (1 - (d - 20) / 14)); }
  for (let y = my - 22; y <= my + 22; y++) for (let x = mx - 22; x <= mx + 22; x++) { const d = Math.hypot(x - mx, y - my); if (d <= 20) put(c, x, y, hex(C.MOONS)); }
  for (let y = my - 20; y <= my + 20; y++) for (let x = mx - 20; x <= mx + 20; x++) { const d = Math.hypot(x - mx, y - my); if (d <= 19) put(c, x, y, hex(C.MOON)); }
  for (const [ox, oy, r] of [[-7, -5, 4], [5, 6, 3], [-2, 9, 2], [8, -8, 2]]) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) put(c, mx + ox + x, my + oy + y, hex(C.MOONC));
  // spider web in the top-right corner (background zone)
  for (let s = 0; s < 6; s++) { const a = Math.PI / 2 + (s / 5) * (Math.PI / 2 + 0.25); for (let r = 0; r < 128; r++) put(c, GW + Math.cos(a) * r, Math.sin(a) * r, hex(C.WEB), 0.9); }
  for (const R of [26, 52, 80, 110]) for (let s = 0; s <= 200; s++) { const a = Math.PI / 2 + (s / 200) * (Math.PI / 2 + 0.25) ; put(c, GW + Math.cos(a) * R, Math.sin(a) * R, hex(C.WEB), 0.9); }
  // the field: a dark slope with a dithered depth gradient
  for (let x = 0; x < GW; x++) { const yt = TOP_FIELD(x); for (let y = Math.floor(yt); y < GH; y++) { const f = clamp01((y - yt) / 460) * (C.FIELD.length - 1), lo = Math.floor(f), k = Math.min(C.FIELD.length - 1, lo + ((f - lo) > bayer(x, y) ? 1 : 0)); put(c, x, y, hex(C.FIELD[k])); } }
  // grass tufts along the top edge and a denser row of foreground blades at the bottom (background only)
  for (let n = 0; n < 150; n++) { const x = Math.floor(rnd(n * 3 + 1) * GW), yt = TOP_FIELD(x), hgt = 2 + Math.floor(rnd(n * 3 + 2) * 4);
    for (let q = 0; q < hgt; q++) put(c, x + (q % 2), yt - q, hex(C.TUFT)); }
  for (let n = 0; n < 260; n++) { const x = Math.floor(rnd(n * 5 + 9) * GW), y0 = 860 + Math.floor(rnd(n * 5 + 11) * 100), hgt = 10 + Math.floor(rnd(n * 5 + 13) * 16), lean = rnd(n * 5 + 17) * 2 - 1;
    for (let q = 0; q < hgt; q++) put(c, x + lean * q * q / hgt, y0 - q, hex("#0C0718")); }
  // the pumpkin's ground shadow
  for (let y = 476; y <= 496; y++) for (let x = 146; x <= 394; x++) { const d = ((x - 270) / 124) ** 2 + ((y - 486) / 11) ** 2; if (d <= 1) put(c, x, y, hex(C.SHADOW), 0.55 * (1 - d * 0.5)); }
  return c;
}

// ---------------------------------------------------------------- helpers
const STARS = (() => { const out = []; for (let n = 0; n < 34; n++) { const x = Math.floor(rnd(n * 7 + 3) * GW), y = Math.floor(rnd(n * 7 + 5) * 130); if (x > 40 && x < 140 && y > 50 && y < 120) continue; out.push({ x, y, ph: rnd(n * 7 + 9) * 6.28 }); } return out; })();
const BATS = [{ y: 66, v: 22, off: 60, s: 1 }, { y: 104, v: 17, off: 330, s: 0.8 }, { y: 52, v: 30, off: 470, s: 0.7 }];
function drawBat(c, x, y, s, t, ph) {
  const f = 3 * Math.sin(2 * Math.PI * 1.4 * t + ph), col = hex(C.BAT);
  const wing = (dir) => [[0, -1], [-4 * dir, -3 + f * 0.6], [-9 * dir, -5 + f * 1.2], [-12 * dir, -3 + f], [-10 * dir, 1], [-6 * dir, 0], [-3 * dir, 3], [0, 1]].map(([px, py]) => [x + px * s, y + py * s]);
  c.poly(wing(1), col); c.poly(wing(-1), col);
  c.disc(x, y, 1, col); c.px(x - 2, y - 2, col); c.px(x + 2, y - 2, col);
}
// dotted eased arc from the left eye to the face-area patch (the light travels «for this pumpkin»)
const ARC = { A: [223, 379], Q: [160, 332], B: [130, 254] };
const bez = (s) => { const { A, Q, B } = ARC; const u = 1 - s; return [u * u * A[0] + 2 * u * s * Q[0] + s * s * B[0], u * u * A[1] + 2 * u * s * Q[1] + s * s * B[1]]; };

// ---------------------------------------------------------------- frame
const at = (t, [a, b]) => sm(t, a, b);
export function frame(t) {
  if (!STATIC) STATIC = bakeStatic();
  if (!PUMP) PUMP = bakePumpkin();
  if (!BRAIN) BRAIN = bakeBrain();
  const c = new Canvas(GW, GH, "#000000");
  c.d.set(STATIC.d);
  // stars twinkle slowly (smooth alpha), bats fly across the top
  for (const s of STARS) put(c, s.x, s.y, hex(C.STAR), 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.1 + s.ph)));
  for (let i = 0; i < BATS.length; i++) { const b = BATS[i], x = ((b.off + b.v * t) % 600 + 600) % 600 - 30; drawBat(c, x, b.y, b.s, t, i * 1.7); }
  // fog low over the field (dithered tint), behind the pumpkin
  const fogK = (x, y) => { const band = sm(y, 470, 520) * (1 - sm(y, 640, 700)); return 0.26 * band * clamp01(0.5 + 0.28 * Math.sin(x * 0.021 + t * 0.31) + 0.22 * Math.sin(x * 0.047 - t * 0.23 + y * 0.02)); };
  c.tint(0, 470, GW, 230, fogK, C.FOG, 5);

  // ----- the pumpkin: bob from the first frame (hero already moving before 0.5 s)
  const cx = Math.round(270 + 0.6 * Math.sin((2 * Math.PI * t) / 5.1)), cy = Math.round(400 + 2.5 * Math.sin((2 * Math.PI * t) / 3.4));
  const aL = at(t, BEAT.eyeL), aR = at(t, BEAT.eyeR), aM = at(t, BEAT.mouth);
  const gUp = sm(t, ...BEAT.glowUp), gDim = sm(t, ...BEAT.dim), gBack = sm(t, ...BEAT.back);
  const g = clamp01(gUp - gDim + gBack) * (0.96 + 0.04 * Math.sin(2 * Math.PI * 0.9 * t));
  const gP = sm(t, ...BEAT.pumpkinGlow) * (1 - gDim);
  const mouthP = ease(clamp01((t - BEAT.mouth[0]) / (BEAT.mouth[1] - BEAT.mouth[0])));
  const { w: PW, h: PH, ox, oy, inside, shade, outline, hole, rim, halo, dC, stem, stemS } = PUMP;
  // stem first (the body overlaps its foot)
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) { const k = j * PW + i; if (!stem[k]) continue; const r = rampAt(C.STEM, stemS[k]); put(c, cx + i - ox, cy + j - oy, hex(C.STEM[r.lo + (r.f > bayer(cx + i, cy + j) ? 1 : 0)])); }
  for (let j = 0; j < PH; j++) for (let i = 0; i < PW; i++) {
    const k = j * PW + i, X = cx + i - ox, Y = cy + j - oy;
    if (!inside[k]) continue;
    const hm = hole[k];
    if (hm) {
      const a = hm === 1 ? aL : hm === 2 ? aR : aM;
      if (hm === 3 && (i - ox) > -46 + 92 * mouthP) { /* not drawn yet: body */ }
      else if (a > bayer(X, Y)) {
        const lx = i - ox, ly = j - oy, cen = hm === 1 ? [-47, -21] : hm === 2 ? [47, -21] : [0, 22];
        const dd = Math.hypot(lx - cen[0], ly - cen[1]), tr = clamp01(1 - dd / 22);
        put(c, X, Y, mixc(C.HOLE, mixc(C.GLOW0, C.GLOW1, tr), g));
        continue;
      }
    }
    if (rim[k]) { const a = rim[k] === 1 ? aL : rim[k] === 2 ? aR : aM; if (a > bayer(X, Y)) { put(c, X, Y, hex(C.OUT)); continue; } }
    if (halo[k] && g > 0 && 0.55 * g > bayer(X, Y)) { put(c, X, Y, hex(C.GLOW0)); continue; }
    if (outline[k]) { put(c, X, Y, hex(C.OUT)); continue; }
    const spill = 0.3 * g + 0.2 * gP;
    const v = shade[k] + spill * Math.exp(-(dC[k] * dC[k]) / (2 * 26 * 26));
    const r = rampAt(C.PUMP, v), col = hex(C.PUMP[Math.min(C.PUMP.length - 1, r.lo + (r.f > bayer(X, Y) ? 1 : 0))]);
    put(c, X, Y, col);
  }

  // ----- the face-area brain (upper left), its patch lights up at 165 ms
  const bA = at(t, BEAT.brainIn) * (1 - sm(t, BEAT.outOut[0] + 0.3, BEAT.outOut[1] + 0.5));
  const pl = clamp01(sm(t, BEAT.patchLit[0], BEAT.patchLit[1]) - gDim + gBack);
  const bx = 120, by = 232;
  if (bA > 0) {
    const { w: BW, h: BH, ox: bxo, oy: byo, inside: bin, shade: bsh, outline: bou, extra: bex } = BRAIN;
    for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
      const k = j * BW + i; if (!bin[k]) continue;
      const X = bx + i - bxo, Y = by + j - byo, e = bex[k];
      if (bou[k]) { put(c, X, Y, hex(C.OUT), bA); continue; }
      if (e === 2) { if (pl > 0) put(c, X, Y, hex(C.GLOW0), 0.55 * pl * bA); continue; }
      if (e === 1) { const col = mixc(C.PATCH_DARK, C.GLOW0, pl), core = pl > 0.6 ? mixc(col, C.GLOW1, (pl - 0.6) / 0.4 * 0.7) : col; put(c, X, Y, core, bA); continue; }
      let v = bsh[k];
      const lx = i - bxo, ly = j - byo;
      if (e === 3) v = 0.42 + 0.14 * Math.sin(lx * 1.3);
      if (e === 4) v = 0.25;
      const gyri = Math.sin(0.34 * lx + 2.2 * Math.sin(0.21 * ly + 0.7)) * Math.sin(0.29 * ly - 1.1 * Math.sin(0.25 * lx));
      if (gyri > 0.9 && e === 0) v -= 0.34;
      // the lateral sulcus: one dark fold across the lobe
      if (e === 0 && lx > -34 && lx < 30 && Math.abs(ly - (2 + 9 * Math.sin((lx + 34) * 0.07))) < 0.9) v -= 0.45;
      const r = rampAt(C.BRAIN, v), col = hex(C.BRAIN[Math.min(C.BRAIN.length - 1, r.lo + (r.f > bayer(X, Y) ? 1 : 0))]);
      put(c, X, Y, col, bA);
    }
    // ring pulse on «lights up» (grows out of the patch and fades)
    const pu = sm(t, BEAT.pulse[0], BEAT.pulse[0] + 0.02) * (1 - sm(t, BEAT.pulse[1] - 0.04, BEAT.pulse[1]));
    if (t >= BEAT.pulse[0] && t <= BEAT.pulse[1] + 0.02) { const k2 = ease(clamp01((t - BEAT.pulse[0]) / (BEAT.pulse[1] - BEAT.pulse[0]))); const R = lerp(3, 26, k2), A = (1 - k2) * 0.95 * (0.3 + 0.7 * sm(t, BEAT.pulse[0], BEAT.pulse[0] + 0.08));
      for (let y = -R - 2; y <= R + 2; y++) for (let x = -R - 2; x <= R + 2; x++) { const d = Math.hypot(x, y); if (Math.abs(d - R) < 0.7) put(c, bx + 10 + x, by + 22 + y, hex(C.GLOW1), A * bA); } }
  }

  // ----- the light travels from the pumpkin's eye to the face area ("for this pumpkin")
  for (let n = 0; n < 7; n++) {
    const p = (t - BEAT.arc[0] - n * 0.045) / (BEAT.arc[1] - BEAT.arc[0]);
    if (p < 0 || p > 1) continue;
    const [x, y] = bez(ease(p)), a = Math.sin(Math.PI * p) ** 0.6;
    for (let q = 0; q < 2; q++) for (let r2 = 0; r2 < 2; r2++) put(c, x + q, y + r2, hex(C.GLOW1), a);
  }

  // ----- the face box snaps around the face (corners shrink in, then stay)
  const bk = at(t, BEAT.brackets) * (1 - sm(t, BEAT.outOut[0], BEAT.outOut[1]));
  if (bk > 0.01) {
    const s = lerp(1.35, 1.0, ease(sm(t, BEAT.brackets[0], BEAT.brackets[1])));
    const x0 = cx - 70 * s, x1 = cx + 70 * s, y0 = cy - 40 * s, y1 = cy + 46 * s, L = 12;
    for (const [px, py, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      for (let q = 0; q < L; q++) for (let w2 = 0; w2 < 2; w2++) { put(c, px + dx * q, py + dy * w2, hex(C.IV), bk); put(c, px + dx * w2, py + dy * q, hex(C.IV), bk); }
    }
  }

  // ----- the timer card (tombstone) on «sixth»: 0 → 165 ms, then the label FACE AREA
  const cardA = at(t, BEAT.cardIn) * (1 - sm(t, BEAT.outOut[0], BEAT.outOut[1]));
  if (cardA > 0.01) {
    const X0 = 292, Y0 = 196, CW = 140, CH = 70, R = 30;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      let inn = true; if (x < R && y < R) inn = (x - R) ** 2 + (y - R) ** 2 <= R * R; if (x >= CW - R && y < R) inn = (x - (CW - R - 1)) ** 2 + (y - R) ** 2 <= R * R;
      if (!inn) continue; const edge = x === 0 || y === 0 || x === CW - 1 || y === CH - 1 || !(x > 0 && y > 0);
      put(c, X0 + x, Y0 + y, hex(edge ? C.ORANGE : "#241838"), cardA);
    }
    const f = fade(c, cardA);
    const v = Math.round(165 * clamp01((t - BEAT.count[0]) / (BEAT.count[1] - BEAT.count[0])));
    const label = `${v} MS`, wN = f.measure(MAIN, label, { scale: 3 });
    f.text(MAIN, label, X0 + Math.round((CW - wN) / 2), Y0 + 20, C.IV, { scale: 3 });
    const sub = "1/6 SECOND", wS = f.measure(TINY, sub, { scale: 2 });
    f.text(TINY, sub, X0 + Math.round((CW - wS) / 2), Y0 + 46, C.ORANGE, { scale: 2 });
  }
  const labA = at(t, BEAT.labelIn) * (1 - sm(t, BEAT.outOut[0], BEAT.outOut[1]));
  if (labA > 0.01) {
    const f = fade(c, labA);
    f.text(TINY, "FACE AREA", 40, 286, C.IV, { scale: 2, shadow: C.K, shadowOffset: 1 });
    for (let s = 0; s < 14; s++) { const x = 112 + (130 - 112) * (s / 13), y = 292 + (258 - 292) * (s / 13); if (s % 2 === 0) put(c, x, y, hex(C.IV), labA); }
  }

  // ----- captions: karaoke, orange highlight, over a soft dithered shade
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- captions (karaoke, same mechanics as the earlier pixel films)
const CLEAN = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, "");
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, "");
  const len = (ws) => ws.map(CLEAN).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || (/,$/.test(last.text) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: CLEAN(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - CAP_SHOW); g.hide = next ? Math.min(next.start - 0.2, e + 0.5) : Math.min(END - 0.5, e + 0.5); });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + Math.round((1 - a) * 6);
    let x = Math.round(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, C.K, { scale: 3, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : C.K) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Y) => (a < 1 && a <= bayer(X, Y) ? null : t < wd.start || X >= fillX ? mixc(C.IV, "#000000", 0.62) : toIv > bayer(X + 3, Y + 1) ? C.IV : C.ORANGE) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}
export { GROUPS };
