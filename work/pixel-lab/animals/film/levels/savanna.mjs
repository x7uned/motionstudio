// LV8 · elephant — the savanna at golden hour (RANGE BIOME.savanna = 3240..3780). Flat golden plain to a low horizon
// (screen y ≈ 465) under the huge orange sun, acacia silhouettes, far giraffes and zebras, a watering hole. A chubby
// elephant faces the camera with its head in the sun. "Then a twist": "!?" and a head tilt. Two pixel brains: the
// elephant's 257 billion cells vs our 86 billion ("3×"); then almost all the elephant's dots slide into the cerebellum
// and light lines run into its trunk and legs. "Still": a mirror by the water, a white mark on the forehead, the
// elephant looks and touches the mark with its trunk; "+SELF". Pure functions of t.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, flat, ell, tube, bez, eye, blush, smile, nose, shadow, sign, pickup, tag, RAMP, C, MAIN, sm, ease, lerp, win, rnd, fade, mix, bayer, blinkAt, clamp01, smooth } from "../cute.mjs";
import { worldLayer, spriteCache, xf, thick, Layer, gaze } from "./bay-kit.mjs";

export const RANGE = BIOME.savanna;
const R = Math.round, [X0, X1] = RANGE, EX = 3510, HZ = -195;    // elephant x, horizon (world y)
const POND_X = 3372, POND_Y = -58, MIRROR_X = 3308;

// ---------------------------------------------------------------- palette
const GRAY = RAMP.gray;
const EAR_IN = ["#2A1E2A", "#46303E", "#664452", "#865A66", "#A4727C", "#BE8C92", "#D4A8AA", "#E8C8C6"];
const TUSK = ["#3A3020", "#6A5A40", "#9A8A68", "#C4B490", "#DED2B0", "#EEE6CC", "#F8F4E4", "#FFFFFF"];
const SOIL = ["#B4602E", "#A65428", "#BE6E3A", "#9A4C26", "#AE5C2E", "#C47640"];
const BRAIN = ["#3A0E22", "#6A1E3C", "#9C3458", "#C8547A", "#E07A98", "#F09EB4", "#F8C4D2", "#FFE6EE"];

// ---------------------------------------------------------------- static scenery (drawn once into a masked layer)
const TOP = -720, LH = 1720;
function acacia(g, x, y, h, w, col, lit) {
  // flat-top umbrella tree: forked trunk, layered canopy
  const tr = Math.max(1, R(h / 34));
  for (const [dx, k] of [[-w * 0.32, 0.62], [w * 0.28, 0.7], [0, 0.5]]) { const pts = bez([x, y], [x + dx * 0.15, y - h * 0.45], [x + dx, y - h * k], 10); thick(g, pts, tr, col); }
  const cy = y - h * 0.78;
  for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.16], [-w * 0.45, w * 0.05, w * 0.5, w * 0.13], [w * 0.5, w * 0.06, w * 0.48, w * 0.12], [w * 0.1, -w * 0.07, w * 0.6, w * 0.12]]) {
    for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) { const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1) continue; const edge = (xx * 7 + yy * 3) % 5 === 0 && d > 0.75; if (edge) continue; g.px(xx, yy, lit && yy < cy + dy - ry * 0.4 ? lit : col); }
  }
}
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // backlit plain: hazy and bright at the horizon, darker warm olive toward us, glowing grass tips; rows of far bushes
  const hz = (wx) => HZ + Math.sin(wx * 0.021) * 2 + Math.sin(wx * 0.09);
  const plain = ["#FFC88A", "#F6B276", "#E89E62", "#D68A52", "#C27846", "#AC683E", "#965A36", "#7E4C30"];
  for (let wx = X0 - 4; wx < X1 + 44; wx++) {
    const top = R(hz(wx));
    for (let wy = top; wy < LAND; wy++) {
      const v = (wy - top) / (LAND - top), s2 = Math.pow(v, 0.75) * (plain.length - 1), lo = Math.floor(s2), f = s2 - lo;
      let col = plain[Math.min(plain.length - 1, f > bayer(wx, wy) ? lo + 1 : lo)];
      if (wy - top < 1) col = "#FFE4B0";
      const row = Math.floor(Math.pow(v, 0.5) * 22);                        // perspective rows of grass tufts
      if (rnd(wx * 31 + row * 977) < 0.18 && ((wy - top) - Math.pow(row / 22, 2) * (LAND - top)) ** 2 < 1 + v * 4) col = mix(col, "#FFE08A", 0.35 + v * 0.3);
      if (rnd(wx * 7 + wy * 131) < 0.012 + v * 0.03) col = mix(col, "#4A2A1C", 0.2 + v * 0.2);
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 60; i++) { const v = Math.pow(rnd(i * 3 + 1), 1.6), wy = HZ + 4 + v * (LAND - HZ - 30), wx = X0 + rnd(i * 7) * (X1 - X0), r = 1.2 + v * 7, col = mix("#C88060", "#4A3020", v); for (let y = -r * 0.7; y <= 0; y++) for (let x = -r * 1.5; x <= r * 1.5; x++) if ((x / (r * 1.5)) ** 2 + (y / (r * 0.7)) ** 2 <= 1) px(R(wx + x), R(wy + y), y < -r * 0.45 ? mix(col, "#FFC890", 0.35) : col); }
  // granite kopje on the left: rounded boulders where the bay rocks meet the plain
  const KO = ["#2A1A1E", "#46303A", "#664A4E", "#8A645E", "#AE806C", "#CC9C7C", "#E4BA90", "#F6D6A8"];
  for (const [wx, wy, rx, ry] of [[3228, -40, 34, 26], [3262, -34, 26, 20], [3236, -92, 30, 28], [3246, -150, 24, 34], [3226, -190, 22, 22], [3270, -78, 20, 18], [3286, -36, 18, 14]]) blob(g, [ell(L(wx), T(wy), rx, ry)], { ramp: KO, thick: 12, base: 3.6, gain: 2.0, litOutline: "#FFD0A0", light: [0.4, -0.9] });
  for (let i = 0; i < 6; i++) { const wx = 3250 + i * 7, wy = -184 + (i % 2) * 3; for (let k = 0; k < 8 + (i % 3) * 3; k++) px(wx + R(Math.sin(k * 0.5 + i) * 1.5), wy - k, k > 6 ? "#FCE08A" : "#C8963A"); }
  // distant acacias on the horizon, one bigger mid-ground tree on the right
  for (const [wx, h, w] of [[3268, 26, 22], [3300, 18, 14], [3428, 22, 18], [3612, 20, 16], [3690, 30, 24]]) acacia(g, L(wx), T(HZ + 2), h, w, "#9A5050", "#B06058");
  acacia(g, L(3742), T(-92), 120, 78, "#4A2434", "#6A3440");
  // watering hole (sky reflection is drawn per frame on top), muddy rim
  for (let wy = POND_Y - 12; wy <= POND_Y + 12; wy++) for (let wx = POND_X - 108; wx <= POND_X + 108; wx++) { const d = ((wx - POND_X) / 104) ** 2 + ((wy - POND_Y) / 10.5) ** 2; if (d <= 1) px(wx, wy, d > 0.78 ? (d > 0.9 ? "#6A3A22" : "#8A5230") : "#C07070"); }
  // ground: golden grass on top, red earth strata below
  for (let wx = X0 - 4; wx < X1 + 44; wx++) {
    for (let wy = LAND; wy < TOP + LH; wy++) {
      const d = wy - LAND, b = bayer(wx, wy); let col;
      if (d < 3) col = d < 1 ? "#F4C862" : "#D89A3C";
      else if (d < 9 + Math.sin(wx * 0.4) * 2) col = d < 6 ? "#8A5A24" : "#7A4A20";
      else {
        const wv = Math.sin(wx * 0.027) * 6 + Math.sin(wx * 0.13) * 2, v = (wy + wv + 400) / 24, band = Math.floor(v), f = v - band;
        col = SOIL[band % SOIL.length]; if (f < 0.09 && b > 0.35) col = mix(col, "#4A2210", 0.28);
        const bayK = clamp01((3320 - wx) / 80); if (bayK > 0) col = mix(col, ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"][band % 6], bayK);
        const jun = clamp01((wx - 3700) / 80); if (jun > 0) col = mix(col, "#5A3A2A", jun * 0.5);
        if (wy > 120) col = mix(col, "#5A2A18", Math.min(0.5, (wy - 120) / 600));
        if (rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#F0C8A0", 0.5); else if (rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#3A1A0C", 0.5);
      }
      px(wx, wy, col);
    }
  }
  // roots hanging into the top soil, a few buried stones
  for (let i = 0; i < 18; i++) { let x = X0 + 10 + rnd(i * 3) * 520, y = LAND + 6; for (let k = 0; k < 10 + rnd(i) * 22; k++) { px(R(x), R(y), "#5A3216"); x += (rnd(i * 50 + k) - 0.5) * 2; y += 1; } }
  for (let i = 0; i < 9; i++) { const wx = X0 + 30 + rnd(i * 7 + 1) * 480, wy = 30 + rnd(i * 5) * 200, r = 4 + rnd(i) * 6; blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#2A1A14", "#4A3024", "#6A4A38", "#8A6650", "#A6826A", "#C09E84", "#D6B89E", "#EAD2B8"], thick: 4 }); }
  // green bushes where the jungle begins
  for (const [wx, r] of [[3748, 14], [3770, 20], [3790, 16]]) blob(g, [ell(L(wx), T(LAND - r * 0.7), r * 1.3, r)], { ramp: ["#0E2A18", "#163A22", "#1E4E2A", "#2A6634", "#3A7E40", "#52964C", "#70AE5C", "#94C870"], thick: 8, base: 3.2 });
}
let BACK = null;
const backLayer = () => BACK ??= worldLayer(X0 - 4, TOP, X1 - X0 + 48, LH, paintBack);

// ---------------------------------------------------------------- elephant (head centre at (x, y); feet at y + 268)
const SPR = spriteCache(60);
const EAR = [[-52, -46], [-98, -74], [-146, -54], [-164, -6], [-152, 48], [-118, 86], [-80, 92], [-58, 60], [-50, 20]];
const EAR_IN_P = [[-60, -34], [-96, -56], [-134, -42], [-148, -4], [-138, 40], [-110, 70], [-82, 74], [-64, 48], [-58, 14]];
function earPoly(P, sd, flap, pts) { const a = flap * sd, ax = sd * 56, ay = 0, cs = Math.cos(a), sn = Math.sin(a); return smooth(pts.map(([x, y]) => { x *= sd; const dx = x - ax, dy = y - ay; return P(ax + (dx * cs - dy * sn) * (1 + flap * 0.25), ay + dx * sn + dy * cs); }), new Set(), 5); }
function bodySprite(s) {
  return SPR(`B${s}`, R(300 * s), R(220 * s), R(150 * s), R(20 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, 0);                        // anchor = head centre + (0, 110)
    for (const sd of [-1, 1]) blob(g, [smooth(P.poly([[sd * 66, 50], [sd * 104, 54], [sd * 108, 150], [sd * 100, 158], [sd * 70, 158], [sd * 64, 150]]), new Set(), 4)], { ramp: GRAY, thick: 12, base: 2.4, gain: 1.6, litOutline: "#E89A6A" });
    blob(g, [P.poly(ell(0, 60, 112, 78))], { ramp: GRAY, thick: 40, base: 2.8, gain: 2.4, slope: 0.8, litOutline: "#F0A070" });
    for (const sd of [-1, 1]) {
      blob(g, [smooth(P.poly([[sd * 14, 50], [sd * 60, 50], [sd * 64, 152], [sd * 60, 160], [sd * 14, 160], [sd * 10, 152]]), new Set(), 4)], { ramp: GRAY, thick: 16, base: 3.0, gain: 2.0, litOutline: "#F0A070" });
      for (const k of [-1, 0, 1]) { const p = P(sd * 37 + k * 14, 156); for (let j = -4; j <= 4; j++) { g.px(R(p[0] + j * s), R(p[1]), TUSK[j * j < 9 ? 6 : 4]); g.px(R(p[0] + j * s), R(p[1] - 1), j * j < 4 ? TUSK[7] : TUSK[5]); } g.px(R(p[0] - 5 * s), R(p[1]), GRAY[1]); g.px(R(p[0] + 5 * s), R(p[1]), GRAY[1]); }
      for (let j = 0; j < 3; j++) { const p = P(sd * 37, 100 + j * 10); for (let k = -12; k <= 12; k += 1) if (Math.abs(k) < 10 - j) g.px(R(p[0] + k * s), R(p[1] + Math.abs(k) * 0.1), GRAY[2]); }
    }
  });
}
function earSprite(s, rot, flap) {
  const qr = R(rot / 0.02), qf = R(flap / 0.025);
  return SPR(`E${s}|${qr}|${qf}`, R(380 * s), R(240 * s), R(190 * s), R(110 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, qr * 0.02);
    for (const sd of [-1, 1]) { blob(g, [earPoly(P, sd, qf * 0.025, EAR)], { ramp: GRAY, thick: 14, base: 3.0, gain: 1.8, litOutline: "#F4A878" }); blob(g, [earPoly(P, sd, qf * 0.025, EAR_IN_P)], { ramp: EAR_IN, thick: 12, base: 3.4, gain: 1.6, outline: GRAY[2] }); }
  });
}
function headSprite(s, rot) {
  const qr = R(rot / 0.02);
  return SPR(`H${s}|${qr}`, R(220 * s), R(200 * s), R(110 * s), R(100 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, qr * 0.02);
    blob(g, [P.poly(ell(0, 4, 74, 64)), P.poly(ell(0, -16, 62, 56)), P.poly(ell(-40, 30, 32, 28)), P.poly(ell(40, 30, 32, 28))], { ramp: GRAY, thick: 30, base: 3.1, gain: 2.4, slope: 0.6, litOutline: "#F4B080" });
    // forehead wrinkles
    for (const [y, w] of [[-44, 16], [-38, 22]]) for (let k = -w; k <= w; k++) { const p = P(k, y + (k * k) / 120); g.px(R(p[0]), R(p[1]), GRAY[3]); }
    // tusks
    for (const sd of [-1, 1]) blob(g, [tube([P(sd * 20, 42), P(sd * 26, 56), P(sd * 24, 70)], 6 * s, 3 * s)], { ramp: TUSK, thick: 4, base: 4.2, outline: TUSK[1] });
  });
}
const TR_HANG = [[0, 6], [-2, 60], [0, 100], [6, 132], [16, 150], [28, 150], [32, 140]];
const TR_UP = [[0, 6], [-16, 58], [-44, 70], [-66, 42], [-62, 2], [-52, -24], [-40, -36]];
function trunkPts(P, k, t, sway) {
  const pts = TR_HANG.map(([x, y], i) => { const [ux, uy] = TR_UP[i], e = ease(k), sw = Math.sin(t * 1.7 + i * 0.5) * sway * (i / 6); return [lerp(x, ux, e) + sw * 8, lerp(y, uy, e) + Math.abs(sw) * 2]; });
  const sm2 = []; for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < 4; j++) { const u = j / 4, a = pts[Math.max(0, i - 1)], b = pts[i], c2 = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)]; sm2.push([0, 1].map((q) => 0.5 * (2 * b[q] + (-a[q] + c2[q]) * u + (2 * a[q] - 5 * b[q] + 4 * c2[q] - d[q]) * u * u + (-a[q] + 3 * b[q] - 3 * c2[q] + d[q]) * u * u * u))); }
  sm2.push(pts[pts.length - 1]); return sm2.map(([x, y]) => P(x, y));
}
/** The elephant: head centre (x, y). o: rot, flap, blink, look, trunk (0 hang → 1 touch the mark), mark 0..1, glow 0..1, a. */
function elephant(c, x, y, s, t, o = {}) {
  const rot = o.rot ?? 0, pv = [x, y + 60 * s], P0 = xf(x, y, s, 0);
  // head transform: rotate about the neck pivot
  const cs = Math.cos(rot), sn = Math.sin(rot), P = (dx, dy) => { const px = dx * s, py = dy * s - 60 * s; return [pv[0] + px * cs - py * sn, pv[1] + px * sn + py * cs]; };
  if (!o.noBody) bodySprite(s).blit(c, x, y + 110 * s, { a: o.a ?? 1 });
  const hx = P(0, 0); earSprite(s, rot, o.flap ?? 0).blit(c, hx[0], hx[1], { a: o.a ?? 1 }); headSprite(s, rot).blit(c, hx[0], hx[1], { a: o.a ?? 1 });
  const g = fade(c, o.a ?? 1);
  // face: big eyes with lashes, blush, smile corners beside the trunk
  const lk = o.look ?? [0, 0.1], bl = o.blink ?? 0;
  for (const sd of [-1, 1]) {
    const e = P(sd * 32, -4); eye(g, e[0], e[1], 12.5 * s, { iris: RAMP.amber, pupil: "round", ry: 13.5 * s, look: lk, blink: bl, lid: GRAY[4] });
    for (const [lx, ly] of [[13, -12], [15, -9], [16, -5]]) { const p = P(sd * (32 + lx), -4 + ly); g.px(R(p[0]), R(p[1]), GRAY[0]); g.px(R(p[0] + sd), R(p[1] - 1), GRAY[0]); }
    const b = P(sd * 48, 20); blush(g, b[0], b[1], 9 * s, 4 * s, "#F27A9A");
    for (let k = 0; k <= 7; k++) { const p = P(sd * (20 + k), 48 - (k > 4 ? k - 4 : 0) * 0.8 + (o.happy ?? 0) * 1); g.px(R(p[0]), R(p[1]), GRAY[0]); }
  }
  // white mark on the forehead (above the left eye), for the mirror test
  if ((o.mark ?? 0) > 0) { const m = P(-34, -38), mg = fade(c, o.mark); for (let j = -7; j <= 7; j++) for (let i = -9; i <= 9; i++) { const d = (i / 9 / s) ** 2 + (j / 6.5 / s) ** 2; if (d <= 1 && (d < 0.6 || bayer(R(m[0]) + i, R(m[1]) + j) > d - 0.4)) mg.px(R(m[0]) + i, R(m[1]) + j, d < 0.3 ? "#FFFFFF" : "#F4F2EC"); } }
  // trunk (in front), with wrinkle rings; a soft glow when the brain's light lines reach it
  const tp = trunkPts(P, o.trunk ?? 0, t, o.sway ?? 1);
  const root = P(0, 8);
  blob(g, [tube(tp, 19 * s, 8.5 * s), ell(root[0], root[1], 18 * s, 15 * s)], { ramp: GRAY, thick: 9, base: 3.3, gain: 1.6, outline: GRAY[1], litOutline: "#F4B080" });
  for (let i = 3; i < tp.length - 2; i += 2) { const [ax, ay] = tp[i - 1], [bx, by] = tp[i + 1], dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1, r = lerp(19, 8.5, i / (tp.length - 1)) * s * 0.75; for (let k = -r; k <= r; k++) g.px(R(tp[i][0] - (dy / n) * k), R(tp[i][1] + (dx / n) * k), GRAY[2]); }
  const tip = tp[tp.length - 1]; g.px(R(tip[0]), R(tip[1]), GRAY[0]); g.px(R(tip[0]) + 1, R(tip[1]), GRAY[0]);
  return { P, tp };
}

// ---------------------------------------------------------------- brains (side view, facing left) with cell dots
const BR_OUT = [[-84, 8], [-80, -22], [-60, -44], [-28, -54], [8, -54], [42, -46], [70, -28], [84, -4], [82, 18], [66, 30], [40, 30], [20, 38], [-8, 40], [-40, 36], [-66, 28]];
const inPoly = (pts, x, y) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
const CB = { x: 52, y: 40, rx: 28, ry: 16 };
function brainSprite(s) {
  return SPR(`BR${s}`, R(200 * s), R(150 * s), R(100 * s), R(68 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, 0);
    blob(g, [tube([P(26, 40), P(32, 66), P(36, 76)], 7 * s, 5 * s)], { ramp: BRAIN, thick: 4, base: 3 });
    blob(g, [P.poly(ell(CB.x, CB.y, CB.rx, CB.ry))], { ramp: BRAIN, thick: 8, base: 3.2 });
    for (let j = -2; j <= 2; j++) for (let k = -CB.rx + 6; k <= CB.rx - 6; k++) { const p = P(CB.x + k, CB.y + j * 5 + (k * k) / 120 - 2); g.px(R(p[0]), R(p[1]), BRAIN[2]); }
    blob(g, [smooth(P.poly(BR_OUT), new Set(), 5)], { ramp: BRAIN, thick: 22, base: 3.4, gain: 2.2 });
    // gyri: wandering grooves
    for (let i = 0; i < 9; i++) { let x = -66 + rnd(i * 5) * 130, y = -40 + rnd(i * 7) * 66, a = rnd(i * 11) * 6.28; const pts = []; for (let k = 0; k < 26; k++) { if (inPoly(BR_OUT, x, y)) pts.push(P(x, y)); a += Math.sin(k * 0.9 + i) * 0.9; x += Math.cos(a) * 2.6; y += Math.sin(a) * 2.6; } for (const [px, py] of pts) g.px(R(px), R(py), BRAIN[2]); }
    for (let k = -40; k <= 40; k++) { const p = P(k, -4 + Math.sin(k * 0.12) * 3); if (inPoly(BR_OUT, k, -4)) g.px(R(p[0]), R(p[1]), BRAIN[2]); }
  });
}
function brainDots(n, seed, cereb) {
  const out = []; let i = 0;
  while (out.length < n && i < 20000) { i++; const x = -80 + rnd(seed + i * 3) * 160, y = -50 + rnd(seed + i * 7) * 90; if (!inPoly(BR_OUT, x, y) || ((x - CB.x) / (CB.rx + 4)) ** 2 + ((y - CB.y) / (CB.ry + 4)) ** 2 < 1) continue; if (out.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < 26)) continue; out.push([x, y]); }
  if (cereb) { let j = 0; for (const d of out) { let tx, ty; do { j++; tx = CB.x + (rnd(seed * 3 + j * 5) * 2 - 1) * (CB.rx - 3); ty = CB.y + (rnd(seed * 3 + j * 11) * 2 - 1) * (CB.ry - 2); } while (((tx - CB.x) / (CB.rx - 3)) ** 2 + ((ty - CB.y) / (CB.ry - 2)) ** 2 > 1); d.push(tx, ty, rnd(seed + j)); } }
  return out;
}
const DOTS_E = brainDots(257, 11, true), DOTS_H = brainDots(86, 29, false);

// ---------------------------------------------------------------- choreography
const T_IN = EV.elephant - 0.1, T_HUMAN = EV.three - 0.1, T_3X = EV.times, T_MOVE = EV.almost, T_LINES = EV.control - 0.05, T_OUT = EV.still - 0.05;
const T_MIRROR = EV.still, T_MARK = EV.still + 0.15, T_TURN = EV.still + 0.45, T_TOUCH = EV.know;
/** motion spans [t0, t1] (seconds) used by the drawing below and by levels/bay-motions.mjs (sounds last exactly as long) */
export const SPAN = {
  twistPop: [EV.twist - 0.05, EV.twist + 0.3], twistOut: [EV.elephant + 0.25, EV.elephant + 0.55], tilt: [EV.twist, EV.twist + 1.3],
  brainE: [T_IN, T_IN + 0.35], dotsE: [T_IN + 0.2, T_IN + 0.95], brainH: [T_HUMAN, T_HUMAN + 0.35], dotsH: [T_HUMAN + 0.15, T_HUMAN + 0.8], times3: [T_3X - 0.05, T_3X + 0.2],
  humanOut: [T_MOVE, T_MOVE + 0.35], slide: [T_MOVE, T_MOVE + 0.95], fill: [T_MOVE + 0.3, T_MOVE + 1.0], glow: [EV.control - 0.1, EV.control + 0.2],
  lines: [T_LINES, EV.body + 0.1], linesIn: [T_LINES, T_LINES + 0.1], tag97: [EV.body - 0.05, EV.body + 0.2], linesOut: [T_OUT, T_OUT + 0.3], brainOut: [T_OUT, T_OUT + 0.4],
  mirror: [T_MIRROR - 0.05, T_MIRROR + 0.35], mirrorOut: [EV.mirror + 1.6, EV.mirror + 2.0], mark: [T_MARK, T_MARK + 0.35], turn: [T_TURN, T_TURN + 0.4], look: [T_TURN, T_TURN + 0.3],
  touch: [T_TOUCH - 0.05, T_TOUCH + 0.45], trunkDown: [EV.mirror + 0.7, EV.mirror + 1.2], unlook: [EV.mirror + 0.6, EV.mirror + 1.0], unturn: [EV.mirror + 0.6, EV.mirror + 1.1],
  self: [EV.know, EV.know + 1.6], happy: [EV.know, EV.know + 0.3],
};
function linesPaths(V, brain, P) {   // from the cerebellum down into the elephant: trunk and the four legs
  const neck = [V.X(EX), V.Y(-312)], mid = [V.X(EX), V.Y(-212)];
  const legs = [[-37, 1], [37, 1], [-86, 0.92], [86, 0.92]].map(([dx, k]) => [[V.X(EX + dx * 0.55), V.Y(-150)], [V.X(EX + dx), V.Y(-108)], [V.X(EX + dx), V.Y(-22 - (1 - k) * 30)]]);
  return { start: brain, trunk: [brain, neck, mid], legs: legs.map((l) => [brain, neck, mid, ...l]) };
}
function polyAt(pts, u) { // point at fraction u along a polyline, plus the partial polyline
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let want = clamp01(u) * tot; const part = [pts[0]];
  for (let i = 1; i < pts.length; i++) { if (want <= L[i - 1]) { const k = want / (L[i - 1] || 1); const p = [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; part.push(p); return { p, part }; } want -= L[i - 1]; part.push(pts[i]); }
  return { p: pts[pts.length - 1], part };
}

// ---------------------------------------------------------------- level exports
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0 - 4))), x1: Math.min(540, R(V.X(X1 + 44))) });
  // watering hole: the orange sky and the sun mirrored, with slow ripples and glints
  const px0 = V.X(POND_X), py0 = V.Y(POND_Y);
  for (let y = R(py0 - 10); y <= R(py0 + 10); y++) for (let x = R(px0 - 100); x <= R(px0 + 100); x++) { const d = ((x - px0) / 101) ** 2 + ((y - py0) / 10) ** 2; if (d > 0.74 || x < 0 || x >= 540 || y < 0 || y >= 960) continue; const v = (y - py0 + 10) / 20, rip = Math.sin(x * 0.21 + t * 2 + y * 1.3) > 0.86; let col = v < 0.35 ? "#F6B678" : v < 0.7 ? (v - 0.35) / 0.35 > bayer(x, y) ? "#C46E78" : "#E8946E" : "#A05A7A"; if (rip) col = mix(col, "#FFF0C8", 0.55); c.px(x, y, col); }
  // far giraffes and a small zebra herd drifting along the horizon
  const hy = V.Y(HZ + 1);
  for (let i = 0; i < 2; i++) { const wx = 3292 + i * 16 + Math.sin(t * 0.2 + i) * 3, x = R(V.X(wx)), y = R(hy) + 1, nod = R(Math.sin(t * 1.4 + i * 2) * 1), h = i ? 0.82 : 1, col = "#8A4A44";
    c.rect(x - 5, y - R(12 * h), 10, R(5 * h), col); for (const lx of [-4, -1, 2, 4]) c.rect(x + lx, y - R(7 * h), 1, R(7 * h), col); for (let k = 0; k < R(13 * h); k++) c.px(x + 4 + R(k * 0.25), y - R(12 * h) - k, col); c.rect(x + 6 + nod, y - R(26 * h), 4, 2, col); c.px(x + 7, y - R(28 * h), col); }
  for (let i = 0; i < 5; i++) { const wx = 3592 + i * 11 + rnd(i) * 5 + Math.sin(t * 0.3) * 2, x = R(V.X(wx)), y = R(hy) + 2 + (i % 2), dir = i % 2 ? 1 : -1;
    c.rect(x - 3, y - 6, 7, 3, "#F4E2C8"); c.px(x - 1, y - 6, "#3A2A2A"); c.px(x + 1, y - 5, "#3A2A2A"); c.px(x + 3 * dir, y - 7, "#3A2A2A"); c.px(x + 4 * dir, y - 7, "#3A2A2A"); for (const lx of [-3, -1, 1, 3]) c.rect(x + lx, y - 3, 1, 3, "#3A2A2A"); }
  // a few birds gliding home across the evening sky
  for (let i = 0; i < 4; i++) { const u = ((t * 0.035 + i * 0.07) % 1), x = R(V.X(3290 + u * 520 + i * 9)), y = R(V.Y(-420 + i * 6 - u * 40)), f = Math.sin(t * 6 + i) > 0 ? 1 : 0; c.px(x, y, "#4A2A44"); c.px(x - 1, y - f, "#4A2A44"); c.px(x + 1, y - f, "#4A2A44"); c.px(x - 2, y - f, "#4A2A44"); c.px(x + 2, y - f, "#4A2A44"); }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const ex = R(V.X(EX)), bob = Math.sin(t * 2.4) * 1.5, ey = V.Y(-288) + bob;
  // twist beat: the head tilts; mirror test: the head turns a little toward the mirror
  const tilt = Math.sin(Math.PI * clamp01((t - SPAN.tilt[0]) / (SPAN.tilt[1] - SPAN.tilt[0]))) * 0.14 * (t > SPAN.tilt[0] ? 1 : 0) - sm(t, ...SPAN.turn) * 0.07 * (1 - sm(t, ...SPAN.unturn));
  const flap = Math.sin(t * 2.2) * 0.07 + Math.sin(t * 0.7) * 0.03;
  // the mirror (with the elephant's reflection) stands by the watering hole
  const ma = sm(t, ...SPAN.mirror) * (1 - sm(t, ...SPAN.mirrorOut));
  shadow(c, ex, V.Y(LAND) - 2, 150, 9, "#4A1A10", 0.5);
  const trunkK = sm(t, ...SPAN.touch) * (1 - sm(t, ...SPAN.trunkDown));
  const lookAt = sm(t, ...SPAN.look) * (1 - sm(t, ...SPAN.unlook));
  const g0 = gaze(t, [[0, [0, 0.12]], [EV.twist, [0.6, -0.2]], [EV.elephant + 0.3, [0, 0.12]], [EV.three, [-0.5, -0.6]], [EV.weDo, [0.5, -0.6]], [EV.almost, [-0.4, -0.7]], [EV.body, [0, 0.4]], [EV.still - 0.2, [0, 0.12]]], 0.25), look = [lerp(g0[0], -1, lookAt), lerp(g0[1], -0.1, lookAt)];
  const mark = sm(t, ...SPAN.mark);
  const opts = { rot: tilt, flap, blink: blinkAt(t, 3.9, 0.6), look, trunk: trunkK, mark, sway: 1 - trunkK, happy: sm(t, ...SPAN.happy) };
  if (ma > 0) mirror(c, V, t, ma, opts);
  elephant(c, ex, ey, 1, t, opts);
  // light lines from the cerebellum glow inside the trunk and legs (drawn over the body)
  const la = sm(t, ...SPAN.linesIn) * (1 - sm(t, ...SPAN.linesOut));
  if (la > 0) {
    const B = brainPos(V), cb = [B.x + CB.x, B.y + CB.y], paths = linesPaths(V, cb), grow = ease(clamp01((t - SPAN.lines[0]) / (SPAN.lines[1] - SPAN.lines[0])));
    const all = [[paths.trunk[0], paths.trunk[1], ...trunkPts(xf(ex, ey, 1, 0), 0, t, 1).filter((_, i) => i % 3 === 0 || i === 24)], ...paths.legs];
    for (const [pi, pts] of all.entries()) {
      const { part } = polyAt(pts, grow); thick(fade(c, la * 0.35), part, 3, "#FFC860"); thick(fade(c, la * 0.8), part, 1, "#FFE9A0");
      thick(fade(c, la), part, 0, "#FFFFFF");
      for (let q = 0; q < 3; q++) { const u = ((t * 0.9 + q / 3 + pi * 0.13) % 1) * grow; const { p } = polyAt(pts, u); const pg = fade(c, la); pg.rect(R(p[0]) - 1, R(p[1]) - 1, 3, 3, "#FFFFFF"); pg.px(R(p[0]) - 2, R(p[1]), "#FFE07A"); pg.px(R(p[0]) + 2, R(p[1]), "#FFE07A"); }
    }
  }
  // LV 8 wooden sign at the right of the elephant
  sign(c, R(V.X(3676)), R(V.Y(LAND)) + 1, "LV 8", "wood", 1, t);
}
function mirror(c, V, t, a, o) {
  const x0 = R(V.X(MIRROR_X - 42)), y0 = R(V.Y(-238)), w = 84, h = 172, g = fade(c, a);
  // stand: two legs and a little foot bar
  for (const dx of [10, w - 13]) { g.rect(x0 + dx, y0 + h - 8, 3, 36, "#4A2A18"); g.rect(x0 + dx, y0 + h - 8, 1, 36, "#7A4A2A"); }
  g.rect(x0 + 4, y0 + h + 24, w - 8, 4, "#3A2014");
  // frame
  g.rrect(x0 - 3, y0 - 3, w + 6, h + 6, "#2A160C", 2); g.rrect(x0 - 2, y0 - 2, w + 4, h + 4, "#8A5A30", 2); g.rect(x0 - 1, y0 - 2, w + 2, 1, "#C08A50"); g.rrect(x0 + 2, y0 + 2, w - 4, h - 4, "#5A3418", 1);
  // glass: warm sky behind, then the flipped reflection of the elephant's head
  const gx = x0 + 4, gy = y0 + 4, gw = w - 8, gh = h - 8;
  for (let y = gy; y < gy + gh; y++) for (let x = gx; x < gx + gw; x++) { if (a < 1 && a <= bayer(x, y)) continue; const v = (y - gy) / gh; c.px(x, y, v < 0.55 ? mix("#8A70B0", "#F0A080", v / 0.55) : v < 0.7 ? "#F8C080" : mix("#E8A050", "#B87038", (v - 0.7) / 0.3)); }
  const L = new Layer(gw, gh); const s = 0.46;
  elephant(L.g, gw / 2 + 2, gh * 0.4, s, t, { ...o, noBody: true, look: [-(o.look?.[0] ?? 0), o.look?.[1] ?? 0], rot: -(o.rot ?? 0) });
  bodySprite(s).blit(L.g, gw / 2 + 2, gh * 0.4 + 110 * s);
  L.blit(c, gx, gy, { a, flip: true });
  // glass shine
  for (let k = 0; k < 40; k++) { const x = gx + 8 + k, y = gy + 10 + k * 2; if (x < gx + gw && y < gy + gh) { g.px(x, y, "#FFFFFF"); g.px(x + 1, y, "#F4ECF8"); } }
  for (let k = 0; k < 18; k++) { const x = gx + gw - 18 + R(k * 0.5), y = gy + gh - 40 + k * 2; g.px(x, y, "#FFF4F8"); }
}
const brainPos = (V) => ({ x: V.X(EX - 140), y: V.Y(-446) });

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // golden grass blades along the ground line and big tufts at the bottom of the frame, swaying in the evening breeze
  const gy = R(V.Y(LAND));
  for (let i = 0; i < 46; i++) {
    const wx = X0 + 6 + i * 11.7 + rnd(i * 3) * 6, x = V.X(wx); if (x < -10 || x > 550) continue; if (Math.abs(wx - EX) < 70 && rnd(i) < 0.6) continue;
    const n = 3 + (i % 3);
    for (let b = 0; b < n; b++) { const h = 8 + rnd(i * 7 + b) * 14, lean = (b - n / 2) * 0.35, sw = Math.sin(t * 1.8 + i * 0.6 + b) * 0.25;
      for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x + b * 2 + (lean + sw) * k * 0.9 * u), gy + 3 - k, u > 0.75 ? "#FCE08A" : u > 0.4 ? "#E8B850" : "#B8822E"); } }
  }
  for (let i = 0; i < 14; i++) {
    const wx = X0 + 10 + i * 40 + rnd(i * 9) * 20, x = V.X(wx), base = R(V.Y(LAND + 300 + (i % 3) * 8)); if (x < -20 || x > 560 || wx > X1 - 30) continue;
    for (let b = 0; b < 7; b++) { const h = 26 + rnd(i * 13 + b) * 30, lean = (b - 3) * 0.3, sw = Math.sin(t * 1.5 + i + b * 0.4) * 0.3;
      for (let k = 0; k < h; k++) { const u = k / h; const xx = R(x + b * 3 + (lean + sw) * k * u); c.px(xx, base - k, u > 0.8 ? "#F0C060" : u > 0.4 ? "#C88A34" : "#8A5420"); c.px(xx + 1, base - k, u > 0.6 ? "#D89A40" : "#6A3E18"); } }
  }
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  // "!?" on the twist, over the elephant's head
  const ta = win(t, SPAN.twistPop[0], SPAN.twistOut[0], 0.15, 0.3);
  if (ta > 0) { const x = R(V.X(EX - 118)), y = R(V.Y(-430) - 10 * ease(clamp01((t - EV.twist) / (SPAN.twistPop[1] - EV.twist)))), g = fade(c, ta); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 2], [1, 2]]) g.text(MAIN, "!?", x + dx, y + dy, C.O, { scale: 4 }); g.text(MAIN, "!?", x, y, "#FFE070", { scale: 4 }); }
  // two brains: the elephant's (big) and ours, cell dots, "3×"
  const bA = sm(t, ...SPAN.brainE) * (1 - sm(t, ...SPAN.brainOut)), B = brainPos(V);
  if (bA > 0) {
    brainSprite(1).blit(c, B.x, B.y, { a: bA });
    const fill = sm(t, ...SPAN.fill) * bA;
    if (fill > 0) { const cgx = R(B.x + CB.x), cgy = R(B.y + CB.y); for (let j = -CB.ry + 1; j <= CB.ry - 1; j++) for (let i = -CB.rx + 1; i <= CB.rx - 1; i++) if ((i / CB.rx) ** 2 + (j / CB.ry) ** 2 < 0.9 && fill * 0.45 > bayer(cgx + i, cgy + j)) c.px(cgx + i, cgy + j, (i + j) & 1 ? "#FFD860" : "#FFF0A0"); }
    const mv = (d) => ease(clamp01((t - SPAN.slide[0] - d[4] * 0.45) / 0.5)), g = fade(c, bA);
    for (const [i, d] of DOTS_E.entries()) {
      const k = i < 249 ? mv(d) : 0, x = R(B.x + lerp(d[0], d[2], k)), y = R(B.y + lerp(d[1], d[3], k)), on = sm(t, SPAN.dotsE[0] + d[4] * 0.6, SPAN.dotsE[0] + 0.15 + d[4] * 0.6); if (on <= 0) continue;
      const gg = fade(c, bA * on); gg.px(x, y, "#FFFFFF"); const sg = fade(c, bA * on * (1 - k * 0.5)); sg.px(x + 1, y, "#FFE070"); sg.px(x, y + 1, k > 0.5 ? "#FFD040" : "#FFE070"); if (k < 0.5) sg.px(x + 1, y + 1, "#E0A030");
    }
    const glow = sm(t, ...SPAN.glow);
    if (glow > 0) { const cgx = B.x + CB.x, cgy = B.y + CB.y; for (let j = -CB.ry - 6; j <= CB.ry + 6; j++) for (let i = -CB.rx - 6; i <= CB.rx + 6; i++) { const d = (i / (CB.rx + 6)) ** 2 + (j / (CB.ry + 6)) ** 2; if (d < 1 && d > 0.62 && glow * bA * (1 - d) * 2.2 > bayer(R(cgx) + i, R(cgy) + j)) c.px(R(cgx) + i, R(cgy) + j, "#FFE9A0"); } }
    tag(c, ["257 BILLION"], R(B.x), R(B.y - 84), bA, C.Y, 2);
  }
  const hA = sm(t, ...SPAN.brainH) * (1 - sm(t, ...SPAN.humanOut));
  if (hA > 0) {
    const hx = V.X(EX + 132), hy = V.Y(-454); brainSprite(0.6).blit(c, hx, hy, { a: hA });
    for (const [i, d] of DOTS_H.entries()) { const on = sm(t, SPAN.dotsH[0] + rnd(i * 3) * 0.5, SPAN.dotsH[0] + 0.15 + rnd(i * 3) * 0.5); if (on <= 0) continue; const x = R(hx + d[0] * 0.6), y = R(hy + d[1] * 0.6), gg = fade(c, hA * on); gg.px(x, y, "#FFFFFF"); gg.px(x + 1, y, "#FFE070"); gg.px(x, y + 1, "#FFE070"); gg.px(x + 1, y + 1, "#E0A030"); }
    tag(c, ["86 BILLION"], R(hx), R(hy - 66), hA, "#7FE3F0", 2);
    const xa = sm(t, ...SPAN.times3) * hA; if (xa > 0) tag(c, ["3×"], R(V.X(EX + 12)), R(V.Y(-494)), xa, C.Y, 3);
  }
  // "97% MOVE THE BODY" when the light lines arrive
  const ba = sm(t, ...SPAN.tag97) * (1 - sm(t, ...SPAN.linesOut));
  if (ba > 0) tag(c, ["97% OF THEM", "MOVE ITS BODY"], R(V.X(EX + 128)), R(V.Y(-506)), ba, C.Y, 2);
  pickup(c, V.X(EX), V.Y(-456), "+SELF", (t - SPAN.self[0]) / (SPAN.self[1] - SPAN.self[0]));
}
