// steve-real film2 · backdrop-street (new, 2026-10-28, drawn for this film): a warm European city street in late-afternoon
// sun seen from a 3/4 high angle (lib/view.mjs) that fills the 9:16 frame top to bottom — sky with a low sun glow and
// drifting clouds → two hazy layers of distant roofs, domes and spires (the far slot for big skyline things) → tiled
// and slate roofs with chimneys, dormers and pigeons → painted facades (plaster, brick, ashlar) with cornices, shuttered
// windows, balconies with flowers, shopfronts with striped awnings and pictogram signs (no brands, no words), a café, a
// bank with columns and a round vault door, a bus stop → a wide paved sidewalk with setts by the curb → granite curb,
// gutter with grates → asphalt with patches, a dashed centre line, a crosswalk, a manhole and two puddles that mirror the
// sky; the lower road lies in the cool shadow of the houses behind the camera with sun gaps. Long warm shadows fall to the
// right. Everything is drawn per frame at the camera's scale in world texels (no stretched bitmaps).
import { U, Y0, R, TAU, clamp01, lerp, sm, rnd, h2, kZ, OL, makeView, ramp, band, wfill, wrect, wpoly, gpoly, box, tintPx, gshadow, castShadow, SHADOW, bayer, hex, mix } from "../lib/view.mjs";

// ---------------------------------------------------------------- palette
export const PAL = {
  sky: ["#4F7FC0", "#5E8ECB", "#6E9DD2", "#82AED8", "#9ABEDC", "#B6CCD8", "#D6D2C8", "#EED2AE", "#F6C994"],
  haze1: ["#9A8FB4", "#AA9EBE", "#BCAEC4", "#D2BCC2"], haze2: ["#8378A2", "#8E83AC", "#A090B4", "#C2A8B6"],
  sun: "#FFE8B8", sunGlow: "#FBD49A",
  cloud: ["#C9B4C4", "#E2CCCC", "#F4E0D2", "#FFF2E2"],
  pave: ["#8C7A6C", "#A8968A", "#B9A898", "#C8B8A6", "#D6C8B4", "#E2D6C2"], joint: "#7C6C62",
  sett: ["#8A7E7C", "#9C908C", "#AEA29C", "#C0B4AA"],
  curb: ["#9E968E", "#BDB6AC", "#D6D0C6", "#E8E2D8"], curbFace: "#6E6670",
  gutter: ["#9C9490", "#ACA49E", "#BCB4AC"],
  asph: ["#5A525C", "#665D66", "#726870", "#7E7479", "#8A7F82", "#9A8E8E"], line: ["#D8D2C6", "#EEE8DC", "#FBF6EA"],
  tileRoof: ["#6A2E26", "#8A3C2C", "#A64C34", "#C0623E", "#D47A4E", "#E6965E"], slate: ["#3C3E56", "#4A4E68", "#5A6080", "#6C7494", "#8088A6"],
  glass: ["#2C3450", "#3C4C6C", "#5A7090", "#8AA6C0", "#BCD2DC"],
  iron: ["#1E2A26", "#2C3C36", "#3E544A", "#567066"],
};
const RAMPS = {
  cream: ["#B8946C", "#D2B086", "#E6C89C", "#F2DCB2", "#FAEAC8"], terra: ["#9A5A3C", "#B66E4A", "#CC845A", "#DE9C70", "#ECB488"],
  sage: ["#7E8C6A", "#96A47E", "#AEBC94", "#C4D0A8", "#D8E0BC"], blue: ["#7C8A9E", "#94A2B4", "#AABACA", "#C0CEDA", "#D6E0E6"],
  ochre: ["#B07A34", "#C8903E", "#DCA84C", "#EAC066", "#F4D488"], pink: ["#B46E70", "#CA8486", "#DC9C98", "#EAB4AC", "#F4CCC0"],
  brick: ["#7A3428", "#94422E", "#AC5236", "#C26642", "#D27E56"], stone: ["#A49A8C", "#BAB0A0", "#CCC2B0", "#DCD4C2", "#EAE4D4"],
  mint: ["#6E9A8E", "#84B0A2", "#9CC4B4", "#B4D6C6", "#CCE4D6"],
};
const AWN = { red: ["#A82C30", "#F4E8D8"], green: ["#2E6E4E", "#F0E6D0"], blue: ["#2E4E8C", "#F0E8D8"], ochre: ["#C07A1E", "#F6EAD2"], plum: ["#6E3A6E", "#F2E4D8"] };
const SHUT = { green: ["#2E5A3E", "#3E7450", "#548E64"], blue: ["#2E4A6E", "#3E5E88", "#5478A0"], brown: ["#5A3A26", "#704A30", "#8A5E3E"], grey: ["#4E5660", "#626C76", "#7C8690"] };

// ---------------------------------------------------------------- the buildings (X range, eave height, look)
// shop: café | bakery | flowers | books | bank | busstop | shop | door. roof: tile | slate | flat
export const BUILD = [
  { x0: -24, x1: -14.5, h: 13.2, wall: "blue", tex: "plaster", roof: "slate", shut: "grey", shop: "shop", awn: "blue", sign: "glasses", bal: [2] },
  { x0: -14.5, x1: -4, h: 12.4, wall: "ochre", tex: "plaster", roof: "tile", shut: "green", shop: "café", awn: "green", sign: "cup", bal: [1, 3] },
  { x0: -4, x1: 5.6, h: 13.8, wall: "cream", tex: "plaster", roof: "slate", shut: "blue", shop: "bakery", awn: "red", sign: "bread", bal: [2], dormers: 2 },
  { x0: 5.6, x1: 11.2, h: 11.6, wall: "terra", tex: "plaster", roof: "tile", shut: "green", shop: "flowers", awn: "ochre", sign: "flower", bal: [1] },
  { x0: 11.2, x1: 16.8, h: 11.2, wall: "stone", tex: "ashlar", roof: "flat", shop: "bank" },
  { x0: 16.8, x1: 24.2, h: 13.0, wall: "sage", tex: "plaster", roof: "tile", shut: "brown", shop: "books", awn: "plum", sign: "book", bal: [1, 2, 3] },
  { x0: 24.2, x1: 30.6, h: 12.2, wall: "brick", tex: "brick", roof: "slate", shut: "grey", shop: "shop", awn: "blue", sign: "key", bal: [2], dormers: 1 },
  { x0: 30.6, x1: 38.4, h: 13.4, wall: "pink", tex: "plaster", roof: "tile", shut: "green", shop: "café", awn: "red", sign: "cup", bal: [1, 3] },
  { x0: 38.4, x1: 45, h: 12.0, wall: "mint", tex: "plaster", roof: "slate", shut: "brown", shop: "shop", awn: "green", sign: "shoe", bal: [2] },
  { x0: 45, x1: 56, h: 13.0, wall: "ochre", tex: "plaster", roof: "tile", shut: "blue", shop: "bakery", awn: "plum", sign: "bread", bal: [1, 2] },
];
const GF = 3.7, FL = 3.0;                       // ground floor / upper floor heights (m)
export const LAMPS = [-9.5, 1.2, 11.9, 29.6, 44.0];   // lamp posts at Z 4.25
export const LAMP_Z = 4.25;
export const CROSS = [24.6, 28.4];               // crosswalk X range
export const PUDDLES = [[15.4, 6.0, 0.9], [36.2, 6.8, 1.1]];
export const MANHOLE = [8.6, 7.1, 0.36];

// ---------------------------------------------------------------- sky + far skyline
function sky(c, V, t) {
  const S = PAL.sky, sunX = 270 + (-22 - V.cx) * 6 * V.z, sunY = 480 + V.z * (60 - V.fy);           // the low sun far to the left
  for (let y = 0; y < c.h; y++) {
    const by = V.fy + (y - 480) / V.z, v = clamp01((by + 360) / 470);                         // base row −360 … 110 → top … horizon
    for (let x = 0; x < c.w; x++) {
      const dx = (x - sunX) / (260 * V.z), dy = (y - sunY) / (200 * V.z), g = Math.exp(-(dx * dx + dy * dy));
      c.px(x, y, ramp(S, v * 0.86 + g * 0.18, x, y));
    }
  }
  // clouds: flat-bottomed puffs lit warm from below-left (parallax 0.15, slow drift)
  for (let q = 0; q < 7; q++) {
    const wx = q * 170 - 260 + ((t * 2.2 + q * 37) % 1200) - V.cx * 30 * 0.15, wy = -250 + 70 * rnd(q + 3) - (q % 3) * 30, w = 70 + 60 * rnd(q + 9), h = 18 + 10 * rnd(q + 11);
    const x0 = 270 + (wx - 270) * V.z * 0.9, y0 = 480 + V.z * (wy - V.fy) * 0.9;
    for (let j = -R(h * V.z); j <= 0; j++) for (let i = -R(w * V.z / 2); i <= R(w * V.z / 2); i++) {
      const u = i / (w * V.z / 2), vv = -j / (h * V.z), bump = 0.55 + 0.25 * Math.sin(u * 5 + q) + 0.2 * Math.sin(u * 11 + q * 2);
      if (vv > bump * (1 - u * u) + 0.02) continue;
      const lit = clamp01(0.85 - vv * 0.9 + u * 0.15 - (vv > bump * (1 - u * u) - 0.08 ? 0.25 : 0));
      c.px(R(x0 + i), R(y0 + j), ramp(PAL.cloud, lit, R(x0 + i), R(y0 + j)));
    }
  }
}
/** distant city: two hazy silhouette layers (parallax p) — roofs, domes, spires, a few chimneys. far = optional fn drawn between them. */
function skyline(c, V, t, far) {
  if (far) far(c, V, t, 0);                                                                 // behind everything (towers, gold piles)
  for (const [p, base, H, pal, seed] of [[0.32, 70, 70, PAL.haze1, 1], [0.5, 92, 64, PAL.haze2, 2]]) {
    const z = 1 + (V.z - 1) * p, cx = V.cx * U * p;
    const top = new Float32Array(c.w), lit = new Uint8Array(c.w);
    for (let x = 0; x < c.w; x++) {
      const wx = cx + (x - 270) / z, cell = Math.floor(wx / 26), f = wx / 26 - cell, r = rnd(cell * 7 + seed * 101);
      let h = H * (0.35 + 0.45 * r);
      if (r > 0.86) { const d = Math.abs(f - 0.5) * 2; h += d < 0.55 ? H * 0.5 * Math.sqrt(1 - (d / 0.55) ** 2) : 0; if (d < 0.06) h += H * 0.42; }  // dome + lantern
      else if (r < 0.1) { const d = Math.abs(f - 0.5) * 2; h += Math.max(0, H * 1.1 * (1 - d / 0.22)); }                     // spire
      else { h += (f < 0.12 || f > 0.88 ? -4 : 0) + (rnd(cell * 13 + seed) > 0.6 && f > 0.62 && f < 0.7 ? 9 : 0); h -= Math.abs(f - 0.5) * 10 * (r > 0.5 ? 1 : 0); }
      top[x] = h; lit[x] = f < 0.45 ? 1 : 0;
    }
    const by0 = base;
    for (let x = 0; x < c.w; x++) {
      const yb = 480 + z * (by0 - V.fy), yt = yb - top[x] * z;
      for (let y = Math.max(0, R(yt)); y < Math.min(c.h, R(yb + 40 * z)); y++) {
        const d = (y - yt) / Math.max(1, top[x] * z), win = (x + seed * 3) % 9 < 2 && (y % 11 < 3) && d > 0.25 && rnd(x * 3 + y) > 0.55;
        c.px(x, y, y - yt < 1 ? pal[3] : win ? pal[2] : ramp(pal, (lit[x] ? 0.62 : 0.32) - d * 0.25, x, y));
      }
    }
    if (far && p < 0.4) far(c, V, t, 1);                                                   // between the two layers
  }
  if (far) far(c, V, t, 2);                                                               // in front of the far city (cover only)
}

// ---------------------------------------------------------------- facade pieces
const wallShade = (b) => {
  const Rm = RAMPS[b.wall];
  if (b.tex === "brick") return (X, Y, x, y) => {
    const j = Math.floor(Y * 13.3), i = Math.floor(X * 4 + (j % 2) * 0.5), fy = Y * 13.3 - j, fx = X * 4 + (j % 2) * 0.5 - i;
    if (fy < 0.16 || fx < 0.06) return "#C9B6A0";
    const r = h2(i, j, 3); return band(Rm, 0.35 + r * 0.45 + 0.06 * Math.sin(X * 0.7 + Y), x, y);
  };
  if (b.tex === "ashlar") return (X, Y, x, y) => {
    const j = Math.floor(Y / 0.55), i = Math.floor(X / 1.1 + (j % 2) * 0.5), fy = Y / 0.55 - j, fx = X / 1.1 + (j % 2) * 0.5 - i;
    if (fy < 0.05 || fx < 0.025) return Rm[1];
    if (fy > 0.9) return Rm[3];
    return band(Rm, 0.5 + 0.18 * h2(i, j, 4) + (h2(Math.floor(X * 30), Math.floor(Y * 30), 5) > 0.93 ? -0.25 : 0), x, y);
  };
  return (X, Y, x, y) => {
    const n = h2(Math.floor(X * 30), Math.floor(Y * 30), 7), big = 0.5 + 0.5 * Math.sin(X * 0.9 + Math.sin(Y * 0.7) * 2);
    return band(Rm, 0.52 + 0.1 * big + (n > 0.94 ? 0.18 : n < 0.05 ? -0.2 : 0) - clamp01((1.2 - Y) / 1.2) * 0.25, x, y);
  };
};
/** a shadow on the wall below/right of an element (sun from the upper left) */
function wallShadow(c, V, X0, X1, Ya, Yb, depth, k = 0.45) {
  const dx = depth * 0.6, dy = depth * 0.9;
  const pts = [[X0, Yb], [X1, Yb], [X1 + dx, Yb - dy], [X1 + dx, Ya - dy], [X0 + dx, Ya - dy]].map(([X, Y]) => [V.sx(X), V.sy(Y)]);
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(c.h - 1, Math.ceil(y1)); y++) { const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b); for (let q = 0; q + 1 < xs.length; q += 2) for (let x = Math.max(0, R(xs[q])); x < Math.min(c.w, R(xs[q + 1])); x++) tintPx(c, x, y, SHADOW, k, 3); }
}
function frameR(c, V, X0, X1, Ya, Yb, col, Z = 0) { const x0 = R(V.sx(X0, Z)), x1 = R(V.sx(X1, Z)), y0 = R(V.sy(Yb, Z)), y1 = R(V.sy(Ya, Z)); c.rect(x0, y0, x1 - x0, 1, col); c.rect(x0, y1 - 1, x1 - x0, 1, col); c.rect(x0, y0, 1, y1 - y0, col); c.rect(x1 - 1, y0, 1, y1 - y0, col); }
/** glass with a sky reflection and a diagonal glint */
const glassShade = (seed, inside) => (X, Y, x, y) => {
  const d = (X * 0.8 + Y * 0.5 + seed) % 1.6, glint = d > 0.2 && d < 0.32 ? 0.35 : d > 0.36 && d < 0.4 ? 0.2 : 0;
  if (inside) { const r = inside(X, Y); if (r) return r; }
  return ramp(PAL.glass, 0.25 + 0.35 * clamp01((Y % 3) / 2.5) + glint, x, y);
};
function window(c, V, b, X, Yb, w, h, i) {
  const S = SHUT[b.shut || "green"], trim = "#F2E8D6", trimD = "#C8B89E", seed = i * 0.37;
  // shutters (open, beside the window)
  if (b.shut && i % 3 !== 1) for (const sd of [-1, 1]) { const sx0 = sd < 0 ? X - w / 2 - 0.42 : X + w / 2 + 0.06;
    wfill(c, V, sx0, sx0 + 0.36, Yb, Yb + h, 0, (XX, YY, x, y) => (Math.floor(YY * 14) % 2 ? S[1] : S[2]));
    frameR(c, V, sx0, sx0 + 0.36, Yb, Yb + h, OL); }
  wrect(c, V, X - w / 2 - 0.1, X + w / 2 + 0.1, Yb - 0.06, Yb + h + 0.12, 0, trim);                       // trim
  wrect(c, V, X - w / 2 - 0.1, X + w / 2 + 0.1, Yb + h + 0.06, Yb + h + 0.22, 0, trimD);                  // lintel
  const curtain = rnd(i * 5 + b.x0) > 0.55;
  wfill(c, V, X - w / 2, X + w / 2, Yb, Yb + h, 0, glassShade(seed, curtain ? (XX, YY) => (Math.abs(XX - X) > w * 0.3 && YY > Yb + h * 0.25 ? (Math.floor(XX * 20) % 2 ? "#F2E6D8" : "#E2D2C4") : null) : null));
  wrect(c, V, X - 0.03, X + 0.03, Yb, Yb + h, 0, trim); wrect(c, V, X - w / 2, X + w / 2, Yb + h * 0.62, Yb + h * 0.62 + 0.06, 0, trim);
  frameR(c, V, X - w / 2 - 0.1, X + w / 2 + 0.1, Yb - 0.06, Yb + h + 0.22, OL);
  // sill with a top face and a flower box on some
  box(c, V, X - w / 2 - 0.18, X + w / 2 + 0.18, Yb - 0.16, Yb - 0.04, 0, 0.18, { top: "#FAF2E2", front: trimD });
  wallShadow(c, V, X - w / 2 - 0.18, X + w / 2 + 0.18, Yb - 0.2, Yb - 0.04, 0.18, 0.4);
  if (rnd(i * 11 + b.x0 * 3) > 0.5) { box(c, V, X - w / 2, X + w / 2, Yb - 0.02, Yb + 0.22, 0.02, 0.3, { top: "#3E5E2E", front: "#8A4E2E" });
    for (let q = 0; q < 7; q++) { const fx = X - w / 2 + 0.08 + q * (w - 0.16) / 6, [px, py] = V.P(fx, Yb + 0.28 + 0.06 * Math.sin(q * 2.3), 0.2), r = Math.max(1, R(0.07 * V.s(0)));
      c.rect(R(px) - r, R(py) - r, 2 * r, 2 * r, ["#E0485A", "#F2E2F0", "#F4B23C", "#D85A9E"][(q + i) % 4]); c.px(R(px) - r, R(py) - r, "#FFF4E8"); } }
}
function balcony(c, V, X, Yb, w) {
  box(c, V, X - w / 2, X + w / 2, Yb - 0.16, Yb, 0, 0.85, { top: "#E8DCC8", front: "#BCAE98", side: "#A89A86" });
  wallShadow(c, V, X - w / 2, X + w / 2, Yb - 0.9, Yb - 0.16, 0.85, 0.45);
  // wrought-iron railing on the front edge (Z 0.85) and pots
  const Z = 0.85, top = Yb + 0.95; wrect(c, V, X - w / 2, X + w / 2, top - 0.05, top, Z, PAL.iron[0]);
  for (let q = 0; q <= Math.round(w / 0.16); q++) { const xx = X - w / 2 + q * 0.16; wrect(c, V, xx, xx + 0.035, Yb, top, Z, PAL.iron[q % 4 === 0 ? 2 : 0]); }
  for (let q = 0; q < 3; q++) { const px = X - w / 2 + 0.3 + q * (w - 0.6) / 2; box(c, V, px - 0.14, px + 0.14, Yb, Yb + 0.26, 0.3, 0.55, { top: "#5A3A24", front: "#C46A3E" });
    const [fx, fy] = V.P(px, Yb + 0.45, 0.45), r = Math.max(2, R(0.2 * V.s(0.4)));
    for (let j = -r; j <= r; j++) for (let ii = -r; ii <= r; ii++) if (ii * ii + j * j <= r * r) c.px(R(fx) + ii, R(fy) + j, (ii + j * 2 + q) % 5 === 0 ? ["#F05A6A", "#F4D04A", "#F2F2F2"][q] : j < 0 && ii < 0 ? "#6EA048" : "#3E6E2E"); }
}
/** pictogram on a sign (no words): cup, bread, flower, book, key, glasses, shoe */
function picto(c, x, y, s, kind, col) {
  const P = {
    cup: ["..........", ".#.#.#....", "..#.#.....", "#######...", "#######.##", "#######..#", "#######.##", ".#####....", "..###.....", "#########."],
    bread: ["..........", "...####...", ".##....##.", "#..#..#..#", "#.#..#..##", "#........#", ".########.", "..........", "..........", ".........."],
    flower: ["...##.....", "..#..#....", ".#.##.#...", "..#..#....", "...##.....", "....#..##.", "....#.#...", "....##....", "....#.....", "...###...."],
    book: ["..........", ".####.####", ".#..#.#..#", ".#..#.#..#", ".#..#.#..#", ".#..#.#..#", ".####.####", "..........", "..........", ".........."],
    key: ["..........", ".###......", "#...#.....", "#...######", "#...#.#.#.", ".###......", "..........", "..........", "..........", ".........."],
    glasses: ["..........", "..........", "##......##", "#.######.#", "###.##.###", "#.#....#.#", "###....###", "..........", "..........", ".........."],
    bus: ["..........", ".########.", ".#......#.", ".#.##.#.#.", ".#......#.", ".########.", ".##....##.", "..........", "..........", ".........."],
    shoe: ["..........", "..........", "..##......", "..#.#.....", "..#..##...", "..#....##.", ".#.......#", ".#########", "..........", ".........."],
  }[kind]; if (!P) return;
  P.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") c.rect(R(x + i * s), R(y + j * s), Math.max(1, R(s)), Math.max(1, R(s)), col); }));
}
function shopfront(c, V, b, t) {
  const W = b.x1 - b.x0, mid = (b.x0 + b.x1) / 2, Rm = RAMPS[b.wall];
  // pilasters + fascia band
  wrect(c, V, b.x0, b.x1, GF - 0.55, GF - 0.05, 0, Rm[3]); frameR(c, V, b.x0 + 0.1, b.x1 - 0.1, GF - 0.55, GF - 0.05, Rm[0]);
  // display window(s) and a door
  const doorX = b.x0 + W * (b.shop === "café" ? 0.72 : 0.3), dw = 1.1;
  const goods = (kind) => (X, Y) => {               // a hint of goods / tables / shelves inside, in warm interior tones
    if (Y < 0.95 && Y > 0.88) return "#5A3A2A";
    if (kind === "bakery" && Y > 0.95 && Y < 1.35) { const q = Math.floor(X * 4); return h2(q, 1, 9) > 0.35 ? ((X * 4) % 1 < 0.8 ? ["#D8964A", "#C47E36", "#E8B060"][q % 3] : null) : null; }
    if (kind === "flowers" && Y < 1.5) { const q = Math.floor(X * 7), r = Math.floor(Y * 7); return h2(q, r, 4) > 0.45 ? ["#E04860", "#F4C030", "#F2F2F2", "#E070B0", "#4E8E3A"][(q + r) % 5] : "#3E6A30"; }
    if (kind === "books" && Y > 0.9 && Y < 2.4) { const q = Math.floor(X * 9), r = Math.floor(Y / 0.5); return (Y / 0.5) % 1 < 0.12 ? "#6A4A34" : ["#8A3A3A", "#3A5A8A", "#C8A040", "#3E6E4E", "#6E4A7A"][(q * 3 + r) % 5]; }
    if (kind === "café" && Y < 1.1) { const q = (X * 1.2) % 1; return q > 0.2 && q < 0.25 && Y < 0.75 ? "#3A2A22" : Y > 0.72 && Y < 0.78 && q > 0.05 && q < 0.4 ? "#F2E8DA" : null; }
    if (kind === "shop" && Y > 0.8 && Y < 1.9) { const q = Math.floor(X * 3); return (Y * 3) % 1 < 0.1 ? "#8A7A6A" : h2(q, Math.floor(Y * 3), 2) > 0.5 ? ["#C85A48", "#4A7AA8", "#E8D070", "#6E9A6A"][q % 4] : null; }
    return null;
  };
  for (const [a, e] of [[b.x0 + 0.35, doorX - dw / 2 - 0.2], [doorX + dw / 2 + 0.2, b.x1 - 0.35]]) { if (e - a < 0.6) continue;
    wrect(c, V, a - 0.1, e + 0.1, 0.25, GF - 0.62, 0, "#3A2A26");
    wfill(c, V, a, e, 0.35, GF - 0.7, 0, glassShade(a, goods(b.shop)));
    for (let m = a + 1.6; m < e - 0.4; m += 1.6) wrect(c, V, m - 0.04, m + 0.04, 0.35, GF - 0.7, 0, "#3A2A26");
    wrect(c, V, a - 0.1, e + 0.1, 0.12, 0.35, 0, Rm[1]); }
  wrect(c, V, doorX - dw / 2 - 0.1, doorX + dw / 2 + 0.1, 0, 2.55, 0, "#3A2A26");
  wfill(c, V, doorX - dw / 2, doorX + dw / 2, 0.05, 2.45, 0, (X, Y, x, y) => Math.abs(X - doorX) < 0.04 ? "#3A2A26" : Y > 0.9 ? glassShade(1)(X, Y, x, y) : SHUT[b.shut || "brown"][1]);
  { const [hx, hy] = V.P(doorX - 0.12, 1.1, 0); c.rect(R(hx) - 1, R(hy), 2, 2, "#E8C060"); }
  // the sign board with a pictogram
  if (b.sign) { const sw = Math.min(2.6, W * 0.42), [sx, sy] = V.P(mid - sw / 2, GF - 0.1, 0), s = V.s(0);
    wrect(c, V, mid - sw / 2, mid + sw / 2, GF - 0.5, GF - 0.1, 0.05, AWN[b.awn][0]); frameR(c, V, mid - sw / 2, mid + sw / 2, GF - 0.5, GF - 0.1, OL, 0.05);
    picto(c, sx + sw * s / 2 - 5 * s * 0.032, sy + 0.04 * s, s * 0.032, b.sign, AWN[b.awn][1]); }
  return doorX;
}
/** a striped awning over the shopfront: slopes from the wall (Y 3.25) out to Z 1.35 (Y 2.55), scalloped valance */
export function awning(c, V, x0, x1, kind, t) {
  const [A, Bc] = AWN[kind], Ya = 3.25, Yf = 2.62, Zf = 1.35;
  gpoly(c, V, [[x0, Ya, 0], [x1, Ya, 0], [x1, Yf, Zf], [x0, Yf, Zf]], null, (x, y) => {
    const Z = V.rowZ(y), X = V.colX(x, 0); const st = Math.floor((X - x0) / 0.38) % 2; return st ? Bc : A;
  });
  // valance: a front strip with scallops
  const n = Math.round((x1 - x0) / 0.38);
  for (let q = 0; q < n; q++) { const a = x0 + q * (x1 - x0) / n, e = a + (x1 - x0) / n, col = q % 2 ? Bc : A;
    wfill(c, V, a, e, Yf - 0.26, Yf, Zf, (X, Y) => { const u = (X - a) / (e - a) - 0.5; return Y > Yf - 0.18 - 0.08 * (1 - 4 * u * u) ? col : null; }); }
  const [lx, ly] = V.P(x0, Yf, Zf), [rx] = V.P(x1, Yf, Zf); c.rect(R(lx), R(ly) - 1, R(rx - lx), 1, mix(A, "#000000", 0.4));
}
function awningShadow(c, V, x0, x1) { wallShadow(c, V, x0, x1, 1.2, 3.25, 1.35, 0.5); }

function roof(c, V, b) {
  const H = b.h, x0 = b.x0, x1 = b.x1;
  if (b.roof === "flat") {
    box(c, V, x0, x1, H, H + 0.9, -2.2, 0.05, { top: "#C8C0B0", front: RAMPS.stone[2], side: RAMPS.stone[1] });
    return;
  }
  const slate = b.roof === "slate", Rm = slate ? PAL.slate : PAL.tileRoof, rise = slate ? 3.2 : 2.6, back = slate ? -2.6 : -3.4;
  const pts = [[x0 - 0.15, H, 0.35], [x1 + 0.15, H, 0.35], [x1 + 0.15, H + rise, back], [x0 - 0.15, H + rise, back]];
  const ya = V.sy(H, 0.35), yb = V.sy(H + rise, back);
  gpoly(c, V, pts, null, (x, y) => {
    const s = clamp01((ya - y) / Math.max(1, ya - yb)), Z = lerp(0.35, back, s), X = V.colX(x, Z) , row = Math.floor(s * (slate ? 14 : 11)), fr = s * (slate ? 14 : 11) - row;
    const col = Math.floor((X + (row % 2) * 0.17) / (slate ? 0.4 : 0.34)), fx = (X + (row % 2) * 0.17) / (slate ? 0.4 : 0.34) - col;
    if (!slate) { const sc = 0.35 + 0.65 * Math.sqrt(Math.max(0, 1 - (2 * fx - 1) ** 2)); if (fr > sc) return Rm[1]; return band(Rm, 0.45 + 0.35 * fr + 0.15 * h2(col, row, 1) - 0.15 * s, x, y); }
    if (fr < 0.12 || fx < 0.05) return Rm[0]; return band(Rm, 0.5 + 0.3 * fr + 0.18 * h2(col, row, 2) - 0.1 * s, x, y);
  });
  // eave edge (gutter) and ridge
  const [ex0, ey] = V.P(x0 - 0.15, H, 0.35), [ex1] = V.P(x1 + 0.15, H, 0.35); c.rect(R(ex0), R(ey) - 1, R(ex1 - ex0), 2, "#5A5660"); c.rect(R(ex0), R(ey) + 1, R(ex1 - ex0), 1, OL);
  { const [rx0, ry] = V.P(x0 - 0.15, H + rise, back), [rx1] = V.P(x1 + 0.15, H + rise, back); c.rect(R(rx0), R(ry) - 1, R(rx1 - rx0), 2, Rm[0]); }
  // chimneys and dormers
  for (let q = 0; q < 2; q++) { const cxm = lerp(x0, x1, 0.22 + 0.55 * q + 0.1 * rnd(b.x0 + q)), Zc = back + 0.6;
    box(c, V, cxm - 0.35, cxm + 0.35, H + rise - 0.5, H + rise + 1.3, Zc - 0.6, Zc, { top: "#2A2428", front: (X, Y, x, y) => (Math.floor(Y * 8) % 2 === 0 && (X * 4) % 1 < 0.1) || (Y * 8) % 1 < 0.15 ? "#8A5A48" : ramp(RAMPS.brick, 0.6, x, y), side: RAMPS.brick[0] });
    box(c, V, cxm - 0.42, cxm + 0.42, H + rise + 1.3, H + rise + 1.45, Zc - 0.68, Zc + 0.08, { top: "#6A6466", front: "#4A4446" }); }
  for (let q = 0; q < (b.dormers || 0); q++) { const dx = lerp(x0, x1, (q + 0.5) / b.dormers), Zd = -0.8, Yd = H + rise * 0.32;
    box(c, V, dx - 0.6, dx + 0.6, Yd - 0.3, Yd + 1.4, Zd - 1, Zd, { top: Rm[1], front: RAMPS.cream[3], side: RAMPS.cream[1] });
    wfill(c, V, dx - 0.35, dx + 0.35, Yd + 0.05, Yd + 1.05, Zd, glassShade(q)); frameR(c, V, dx - 0.45, dx + 0.45, Yd - 0.05, Yd + 1.15, OL, Zd);
    gpoly(c, V, [[dx - 0.75, Yd + 1.4, Zd + 0.1], [dx + 0.75, Yd + 1.4, Zd + 0.1], [dx, Yd + 2.0, Zd + 0.1]], Rm[2]); }
}
function bankFront(c, V, b, t, st) {
  const x0 = b.x0, x1 = b.x1, mid = (x0 + x1) / 2, Rm = RAMPS.stone;
  // steps (3, protruding to Z 0.9)
  for (let q = 0; q < 3; q++) box(c, V, x0 + 0.3 + q * 0.12, x1 - 0.3 - q * 0.12, q * 0.16, (q + 1) * 0.16, 0, 0.9 - q * 0.3, { top: Rm[4 - (q % 2)], front: Rm[2], side: Rm[1] });
  // the doorway: dark interior with the round vault door (st.open 0..1) and a gold glow
  const dw = 1.6, dTop = 3.4;
  wfill(c, V, mid - dw / 2, mid + dw / 2, 0.48, dTop, 0, (X, Y, x, y) => {
    const dx = (X - mid) / 0.62, dy = (Y - 1.55) / 0.62, d = Math.hypot(dx, dy), open = st.open;
    const glow = open * clamp01(1 - d * 0.7);
    if (d < 1) { // the vault: an open round hole full of gold light, or the closed steel door
      if (open > 0.05 && Math.abs(dx) < 1 - open * 0.9 + (dx < 0 ? 2 : 0) && dx > -1 + open * 1.85 - 0.0001) return d > 0.88 ? "#3A4050" : ramp(["#5A6478", "#7A86A0", "#9CA8C0", "#C4CCDC"], 0.55 - dy * 0.3 - dx * 0.2, x, y);
      if (open > 0.05) return ramp(["#C88A1E", "#E8B030", "#F8D458", "#FFF0A0"], 0.45 + glow * 0.6 + (Math.floor(X * 12) + Math.floor(Y * 12)) % 3 * 0.08, x, y);
      if (d > 0.88) return "#2E3442"; if (d < 0.18) return "#C4CCDC";
      return Math.abs(Math.atan2(dy, dx) % (Math.PI / 3)) < 0.06 ? "#4A5266" : ramp(["#5A6478", "#7A86A0", "#9CA8C0", "#C4CCDC"], 0.6 - dy * 0.3 - dx * 0.2, x, y);
    }
    return ramp(["#18141E", "#241E2C", "#302838"], 0.3 + glow * 0.8 + (Y > 2.9 ? 0.4 : 0), x, y);
  });
  // open leaves of the outer doors (bronze), pilaster frame
  for (const sd of [-1, 1]) wrect(c, V, sd < 0 ? mid - dw / 2 - 0.42 : mid + dw / 2 + 0.02, sd < 0 ? mid - dw / 2 - 0.02 : mid + dw / 2 + 0.42, 0.48, dTop - 0.1, 0.02, "#8A5E2E");
  frameR(c, V, mid - dw / 2 - 0.45, mid + dw / 2 + 0.45, 0.48, dTop + 0.15, OL);
  // four columns (shaded cylinders) with capitals and bases, entablature, pediment with a gold coin
  const top = 7.2;
  for (const cxm of [x0 + 0.75, x0 + 1.75, x1 - 1.75, x1 - 0.75]) {
    wfill(c, V, cxm - 0.32, cxm + 0.32, 0.48, top - 0.4, 0.7, (X, Y, x, y) => { const u = (X - cxm) / 0.32; return (Math.abs(u * 4) % 1 < 0.12) ? Rm[1] : ramp(Rm, 0.85 - 0.6 * Math.abs(u + 0.35) + 0.1 * u, x, y); });
    box(c, V, cxm - 0.45, cxm + 0.45, top - 0.4, top, 0.5, 0.9, { top: Rm[4], front: Rm[3] }); box(c, V, cxm - 0.42, cxm + 0.42, 0.48, 0.75, 0.5, 0.9, { top: Rm[4], front: Rm[2] });
    castWallCol(c, V, cxm + 0.35, 0.48, top - 0.4);
  }
  box(c, V, x0 + 0.2, x1 - 0.2, top, top + 0.8, 0, 0.95, { top: Rm[4], front: (X, Y, x, y) => ((X * 2.5) % 1 < 0.12 && Y < top + 0.4 ? Rm[1] : ramp(Rm, 0.75, x, y)) });
  gpoly(c, V, [[x0 + 0.1, top + 0.8, 0.95], [x1 - 0.1, top + 0.8, 0.95], [mid, top + 2.6, 0.95]], Rm[3]);
  gpoly(c, V, [[x0 + 0.5, top + 0.95, 0.96], [x1 - 0.5, top + 0.95, 0.96], [mid, top + 2.35, 0.96]], Rm[1]);
  { const [gx, gy] = V.P(mid, top + 1.5, 0.97), r = Math.max(3, R(0.5 * V.s(0.97)));
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = (i * i + j * j) / (r * r); if (d <= 1) c.px(R(gx) + i, R(gy) + j, d > 0.75 ? "#8A5A10" : d < 0.3 && i < 0 ? "#FFF2A0" : (i - j) % 4 === 0 ? "#F8D458" : "#E8B030"); } }
  // upper windows of the bank (tall, arched hint)
  for (const wx of [x0 + 1.25, mid, x1 - 1.25]) { wfill(c, V, wx - 0.35, wx + 0.35, 4.3, 6.4, 0, glassShade(wx)); frameR(c, V, wx - 0.42, wx + 0.42, 4.25, 6.45, OL); }
}
function castWallCol(c, V, X, Ya, Yb) { wallShadow(c, V, X - 0.1, X + 0.1, Ya, Yb, 0.7, 0.35); }
export function busStop(c, V, x0, x1, t) {
  // a glass shelter on the sidewalk near the curb (Z 3.2–4.3) — drawn as a backdrop piece
  const Za = 3.3, Zb = 4.25, H = 2.5;
  box(c, V, x0, x1, H, H + 0.14, Za, Zb, { top: "#5E6A78", front: "#3E4A58", side: "#4E5A68" });
  wfill(c, V, x0 + 0.05, x1 - 0.05, 0.25, H, Za + 0.02, (X, Y, x, y) => ramp(["#7E9AB0", "#9AB4C6", "#BCD0DA"], 0.4 + 0.2 * ((X + Y) % 1.3 < 0.2 ? 1 : 0), x, y));
  for (const px of [x0, x1 - 0.08]) box(c, V, px, px + 0.08, 0, H, Zb - 0.08, Zb, { front: "#3E4A58" });
  box(c, V, x0 + 0.4, x1 - 0.4, 0.42, 0.5, Za + 0.1, Za + 0.5, { top: "#A0784E", front: "#7A5A3A" });
  // the stop sign on a pole: round plate with a bus pictogram
  const sx = x1 + 0.4; box(c, V, sx - 0.04, sx + 0.04, 0, 2.7, Zb - 0.05, Zb + 0.03, { front: "#5A6470" });
  const [px, py] = V.P(sx, 2.75, Zb), r = Math.max(4, R(0.32 * V.s(Zb)));
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = i * i + j * j; if (d <= r * r) c.px(R(px) + i, R(py) + j, d > (r - 1) * (r - 1) ? OL : d > (r - 2) * (r - 2) ? "#2E9A4E" : "#F4F0E2"); }
  picto(c, px - r * 0.55, py - r * 0.5, r * 0.11, "bus", "#2E9A4E");
}

// ---------------------------------------------------------------- the ground (per pixel)
function ground(c, V, t, st) {
  const Zs = new Float32Array(c.h), y0 = Math.max(0, Math.floor(V.sy(0, 0)));
  const prevId = new Int32Array(c.w).fill(-1);
  const crack = st.crack;                                                    // { X, Z, k, R } the final step
  for (let y = y0; y < c.h; y++) {
    const Z = V.rowZ(y + 0.5), k = V.s(Z);
    let lastId = -2;
    for (let x = 0; x < c.w; x++) {
      const X = V.cx + (x + 0.5 - 270) / k;
      let col, id = 0;
      if (Z < 0.22) { col = band(PAL.pave, 0.18 + Z * 1.2 + 0.08 * h2(Math.floor(X * 30), 0, 3), x, y); id = -5; }
      else if (Z < 4.0) {                                                    // paving slabs 0.6 × 0.45, staggered
        const r = Math.floor((Z - 0.22) / 0.45), q = Math.floor(X / 0.6 + (r % 2) * 0.5); id = r * 100003 + q;
        const v = 0.48 + 0.16 * h2(q, r, 1) + 0.07 * Math.sin(X * 0.21 + r) + (h2(Math.floor(X * 34), Math.floor(Z * 34), 5) > 0.95 ? 0.14 : 0);
        col = band(PAL.pave, v, x, y);
      } else if (Z < 4.6) { const r = Math.floor((Z - 4) / 0.15), q = Math.floor(X / 0.18 + (r % 2) * 0.5); id = 900000 + r * 1000 + q; col = band(PAL.sett, 0.4 + 0.4 * h2(q, r, 6), x, y); }
      else if (Z < 4.8) { const q = Math.floor(X / 1.2); id = 950000 + q; col = band(PAL.curb, 0.62 + 0.15 * h2(q, 0, 8) - (Z - 4.6) * 0.6, x, y); }
      else if (Z < 4.88) { col = PAL.curbFace; id = -7; }
      else if (Z < 5.15) { const q = Math.floor(X / 0.9); id = 960000 + q; const grate = ((X + 900) % 9) < 0.7; col = grate ? (Math.floor(X * 14) % 2 ? "#3A3640" : "#6A6470") : band(PAL.gutter, 0.5 + 0.2 * h2(q, 1, 9), x, y); }
      else {                                                                  // asphalt
        id = -9; const n = h2(Math.floor(X * 34), Math.floor(Z * 34), 11), patch = h2(Math.floor(X / 3.1), Math.floor(Z / 1.7), 12) > 0.8 ? 0.08 : 0;
        let v = 0.42 + patch + (n > 0.9 ? 0.16 : n < 0.08 ? -0.14 : 0) + 0.04 * Math.sin(X * 0.13 + Z);
        const cw = X > CROSS[0] && X < CROSS[1] && Z > 5.3 && Math.floor((X - CROSS[0]) / 0.5) % 2 === 0 && X < CROSS[1] - 0.1;
        const dash = Math.abs(Z - 8.5) < 0.07 && ((X + 1000) % 6) < 3 && !(X > CROSS[0] - 1 && X < CROSS[1] + 1);
        const stop = Z > 5.2 && Z < 6.9 && Math.abs(((X + 1000) % 5.4) - 0.1) < 0.06 && !(X > CROSS[0] - 0.5 && X < CROSS[1] + 0.5);
        const edgeL = Math.abs(Z - 7.0) < 0.05 && !(X > CROSS[0] - 0.5 && X < CROSS[1] + 0.5) && ((X + 1000) % 1.2) < 0.7;
        if (cw || dash || stop || edgeL) col = band(PAL.line, 0.55 + (n > 0.85 ? -0.3 : 0), x, y);
        else col = band(PAL.asph, v, x, y);
        // tar seams
        if (Math.abs(Z - 6.3 - 0.25 * Math.sin(X * 0.8) - 0.1 * Math.sin(X * 2.3)) < 0.025 && h2(Math.floor(X * 2), 1, 13) > 0.4) col = PAL.asph[0];
        // manhole
        const md = Math.hypot(X - MANHOLE[0], Z - MANHOLE[1]); if (md < MANHOLE[2]) col = md > MANHOLE[2] - 0.05 ? "#2A2630" : (Math.floor((X - MANHOLE[0]) * 14) + Math.floor((Z - MANHOLE[1]) * 14)) % 2 ? "#4A4450" : "#5E5866";
        // puddles mirror the sky
        for (const [px, pz, pr] of PUDDLES) { const d = Math.hypot((X - px) / pr, (Z - pz) / (pr * 0.55)) + 0.12 * Math.sin(Math.atan2(Z - pz, X - px) * 3 + px); if (d < 1) {
          const rip = Math.abs(((Math.hypot(X - px, Z - pz) - t * 0.18) % 0.45)) < 0.03 && d < 0.85;
          col = d > 0.9 ? PAL.asph[0] : rip ? "#E8E4DE" : ramp(["#6E8EBE", "#86A6CC", "#A8BED4", "#D8C8B0"], 0.15 + (Z - pz + pr * 0.55) / (pr * 1.1) * 0.7, x, y); } }
      }
      // slab joints: where the slab id changes from the pixel to the left or above
      if (id > 0 && ((lastId !== id && lastId > 0) || (prevId[x] !== id && prevId[x] > 0))) col = PAL.joint;
      prevId[x] = id; lastId = id;
      // the street breaks under Steve: crater + radial cracks + lifted slabs
      if (crack && crack.k > 0) { const dx = X - crack.X, dz = (Z - crack.Z) * 1.25, d = Math.hypot(dx, dz), Rr = crack.R * crack.k;
        if (d < crack.R * 1.05) { const a = Math.atan2(dz, dx), px1 = 1 / k;
          let ray = false; for (let i = 0; i < 11; i++) { const ai = (i / 11) * TAU + rnd(i + 40) * 0.5, L = crack.R * (0.55 + 0.45 * rnd(i + 70)), jag = 0.16 * Math.sin(d * 5.3 + i * 2) + 0.06 * Math.sin(d * 17 + i);
            let da = a - ai - jag / Math.max(0.3, d); da = Math.atan2(Math.sin(da), Math.cos(da)); const w = Math.max(px1 * 0.9, 0.05 * (1 - d / L));
            if (d < L * crack.k && Math.abs(d * Math.sin(da)) < w && Math.cos(da) > 0) { ray = true; break; }
            if (i % 2 === 0 && d > L * 0.45 && d < L * 0.8 * crack.k) { const bb = ai + 0.5 * (i % 4 ? 1 : -1); let db = Math.atan2(Math.sin(a - bb), Math.cos(a - bb)); if (Math.abs((d - L * 0.45) * Math.sin(db)) < px1 * 0.9 && Math.cos(db) > 0.9) { ray = true; break; } } }
          const cr = 0.62 * Math.min(1, crack.k * 1.5);
          if (d < cr) col = ramp(["#100C14", "#1C1620", "#2C2430", "#4A3E48", "#7A6A6A"], dz < 0 ? 0.2 + 0.75 * Math.pow(d / cr, 3) : 0.1 + 0.25 * (d / cr), x, y);
          else if (d < cr + 0.08 && dz > 0) col = "#E8DCCC";
          else if (ray && d < Rr) col = "#120E16";
          else if (d < Rr && id > 0) { const lift = (h2(id, 7, 1) - 0.5) * 0.5 * (1 - d / crack.R); col = mix(col, lift > 0 ? "#F4EADA" : "#2A2230", Math.abs(lift)); }
        } }
      c.px(x, y, col);
    }
    Zs[y] = Z;
  }
  // the cool shadow of the houses behind the camera over the lower road (sun gaps between them), and the soft wall-foot AO
  for (let y = y0; y < c.h; y++) { const Z = Zs[y]; if (Z < 6) continue; const k = V.s(Z);
    for (let x = 0; x < c.w; x++) { const X = V.cx + (x + 0.5 - 270) / k, gap = ((X + 300) % 15.5), edge = 7.4 + 0.9 * Math.sin(X * 0.42) + (gap > 4 && gap < 7.2 ? 3.6 * Math.sin(Math.PI * (gap - 4) / 3.2) : 0);
      if (Z > edge + 1.4) tintPx(c, x, y, "#3A3466", Math.min(0.3, (Z - edge - 1.4) * 0.5), 3); } }
}

// ---------------------------------------------------------------- street furniture drawn by the scene in depth order
export function lampPost(c, V, X, t, o = {}) {
  const Z = LAMP_Z, s = V.s(Z);
  if (o.shadow) castShadowPost(c, V, X, Z, 4.6);
  box(c, V, X - 0.16, X + 0.16, 0, 0.5, Z - 0.16, Z + 0.16, { top: PAL.iron[2], front: PAL.iron[1], side: PAL.iron[0] });
  wfill(c, V, X - 0.07, X + 0.07, 0.5, 4.2, Z, (XX, Y, x, y) => (XX < X - 0.02 ? PAL.iron[3] : PAL.iron[1]));
  for (let q = 0; q < 3; q++) wrect(c, V, X - 0.1, X + 0.1, 1.2 + q * 1.1, 1.26 + q * 1.1, Z, PAL.iron[2]);
  // lantern: a tapered glass box with a cap and a warm glow
  const ly = 4.2;
  wpoly(c, V, [[X - 0.22, ly + 0.05], [X + 0.22, ly + 0.05], [X + 0.3, ly + 0.75], [X - 0.3, ly + 0.75]], Z, PAL.iron[0]);
  wpoly(c, V, [[X - 0.17, ly + 0.12], [X + 0.17, ly + 0.12], [X + 0.23, ly + 0.68], [X - 0.23, ly + 0.68]], Z, "#F8DC96");
  wrect(c, V, X - 0.02, X + 0.02, ly + 0.12, ly + 0.68, Z, PAL.iron[0]);
  wpoly(c, V, [[X - 0.36, ly + 0.75], [X + 0.36, ly + 0.75], [X, ly + 1.05]], Z, PAL.iron[1]);
  // a flower basket hanging from an arm
  wrect(c, V, X, X + 0.55, 3.5, 3.55, Z, PAL.iron[1]);
  const [bx, by] = V.P(X + 0.5, 3.15, Z), r = Math.max(2, R(0.26 * s));
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r && j > -r * 0.6) c.px(R(bx) + i, R(by) + j, (i * 3 + j * 5) % 7 === 0 ? ["#F05A7A", "#F4D040", "#F6F2F0"][(i + j + 9) % 3] : j < 0 ? "#5E9A3E" : j > r * 0.5 ? "#6A4228" : "#3E7230");
}
function castShadowPost(c, V, X, Z, H) { const ex = X + 0.95 * H, ez = Math.max(0.1, Z - 0.42 * H); gshadow(c, V, [[X - 0.1, Z + 0.05], [X + 0.1, Z - 0.05], [ex + 0.12, ez - 0.05], [ex - 0.12, ez + 0.05]], 0.32); }
/** bunting wire between two lamps (drawn over everything at its depth) */
export function bunting(c, V, Xa, Xb, t) {
  const Z = LAMP_Z, ya = 4.0, n = 40, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, X = lerp(Xa, Xb, u), Y = ya - 0.9 * Math.sin(Math.PI * u) + 0.03 * Math.sin(t * 1.4 + u * 6); pts.push([V.sx(X, Z), V.sy(Y, Z), X, Y]); }
  for (let i = 0; i < n; i++) c.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), "#3A2E2A");
  const cols = ["#E84A4A", "#F4C83C", "#3E9AD8", "#F2F2F2", "#5AB45A"];
  for (let i = 2; i < n - 1; i += 3) { const [x, y] = pts[i], s = V.s(Z), w = 0.13 * s, h = 0.32 * s * (1 + 0.06 * Math.sin(t * 3 + i));
    c.poly([[x - w, y], [x + w, y], [x + 0.15 * w * Math.sin(t * 2 + i), y + h]], cols[(i / 3) % 5 | 0]); }
}

// ---------------------------------------------------------------- pigeons on cornices
const PIGEONS = [[-1.2, 2], [7.4, 1], [19.5, 3], [21.8, 3], [33.1, 1], [27.4, 2]];
function pigeons(c, V, t, st) {
  for (const [X, f] of PIGEONS) { const Yb = GF + (f - 1) * FL + FL - 0.06; const fly = st.pigeonFly ?? 0;
    const up = fly > 0 ? Math.max(0, fly - rnd(X) * 0.2) : 0, ox = up * 3 * (1 + rnd(X + 1)), oy = up * up * 5;
    const [x, y] = V.P(X + ox, Yb + 0.08 + oy, 0.25), s = V.s(0.25) * 0.032, bob = Math.sin(t * 3 + X * 3) > 0.7 ? 1 : 0;
    const B = ["....##..", "...#oo#.", "..#gggg#", ".#ggggggW", "#gggggg#.", ".#####...", "..#..#..."], flap = up > 0 && Math.sin(t * 24 + X) > 0;
    B.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === ".") return; const col = ch === "#" ? "#2E2A36" : ch === "o" ? "#6E7488" : ch === "W" ? "#E8A040" : j < 3 ? "#9AA0B4" : "#7E8498";
      c.rect(R(x + (i - 4) * s), R(y + (j - 7 + (j < 3 ? bob : 0) - (flap && j > 2 && j < 5 ? 2 : 0)) * s), Math.max(1, R(s)), Math.max(1, R(s)), col); }));
  }
}

// ---------------------------------------------------------------- draw the backdrop
/** st: { vault: 0..1, crack: { X, Z, R, k } | null, pigeonFly, far(c, V, t, layer) } → returns V */
export function drawBackdrop(c, cam, t, st = {}) {
  const V = makeView(cam);
  sky(c, V, t);
  skyline(c, V, t, st.far);
  const vis = BUILD.filter((b) => V.sx(b.x1) > -20 && V.sx(b.x0) < c.w + 20).map((b) => (st.lower ? { ...b, h: b.h - st.lower, bal: b.bal?.filter((f) => f < 3) } : b));
  for (const b of vis) roof(c, V, b);
  ground(c, V, t, st);
  for (const b of vis) {
    const shade = wallShade(b), H = b.h;
    wfill(c, V, b.x0, b.x1, 0, H, 0, shade);
    // cornice and string courses (top faces visible)
    box(c, V, b.x0 - 0.05, b.x1 + 0.05, H - 0.45, H, 0, 0.32, { top: "#F4EADA", front: (X, Y, x, y) => (Y > H - 0.18 ? "#E6DACA" : (X * 5) % 1 < 0.35 ? "#BFB09A" : "#D6C8B4") });
    wallShadow(c, V, b.x0, b.x1, H - 0.95, H - 0.45, 0.32, 0.38);
    if (b.shop === "bank") { bankFront(c, V, b, t, { open: st.vault ?? 0 }); }
    else {
      box(c, V, b.x0, b.x1, GF - 0.05, GF + 0.12, 0, 0.14, { top: "#EEE2CE", front: "#CDBEA6" });
      const floors = Math.max(2, Math.floor((H - GF - 0.6) / FL)), W = b.x1 - b.x0, nw = Math.max(2, Math.round(W / 2.3));
      for (let f = 0; f < floors; f++) { const Yb = GF + f * FL + 0.75;
        for (let i = 0; i < nw; i++) window(c, V, b, b.x0 + (i + 0.5) * W / nw, Yb, 0.95, 1.65, i + f * 7 + Math.round(b.x0));
        if (b.bal?.includes(f + 1)) balcony(c, V, b.x0 + W / 2, Yb - 0.2, Math.min(W * 0.5, 3.2)); }
      shopfront(c, V, b, t);
      if (b.awn) { awningShadow(c, V, b.x0 + 0.3, b.x1 - 0.3); awning(c, V, b.x0 + 0.3, b.x1 - 0.3, b.awn, t); }
    }
    // a downpipe between houses
    wrect(c, V, b.x1 - 0.12, b.x1 - 0.02, 0, H - 0.2, 0.05, "#6E6876"); wrect(c, V, b.x1 - 0.12, b.x1 - 0.09, 0, H - 0.2, 0.05, "#9A94A0");
  }
  pigeons(c, V, t, st);
  return V;
}
export const GROUND_FLOOR = GF;
