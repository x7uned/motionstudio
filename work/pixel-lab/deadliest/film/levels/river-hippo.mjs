// The chubby hippo of LV3 (the finished hippo of ../../animals-weight/film/levels/river.mjs, copied and extended): it
// stands chest-deep in the river facing the camera, head held high under the sun disc. The head is split into an upper
// head (cranium, eye bumps, upper muzzle with nostrils) and a lower jaw, so the mouth can open into a huge lazy yawn /
// a threatening gape (pink mouth, two lower tusks). Body, ears, upper head and jaw are cached sprites; the mouth
// interior and the face (eyes, lids, brows, nostrils, blush) are drawn per frame. Also the ~56 px ICON head.
import { blob, flat, ell, tube, eye, blush, mix, bayer, fade } from "../cute.mjs";
import { spriteCache, xf, R, clamp01, sm, lerp } from "./river-kit.mjs";

export const HIP = ["#1E1428", "#33243E", "#4A3858", "#624C72", "#7C668C", "#9682A6", "#B4A2C0", "#D4C6DC"];
export const MUZ = ["#3A2436", "#5E3C54", "#845A74", "#A87A94", "#C69AB0", "#DCB8C8", "#EED4DE", "#FAEEF2"];
const IRIS = ["#0A0606", "#1A1010", "#2E1C1A", "#4A2E26", "#6A4432", "#8E5E40", "#B47E52", "#D8A06A"];
const LIT = "#FFE2A8";                                   // warm afternoon rim light from the sun behind the head
export const FEET = 222;                                  // local y of the feet below the head centre

const SPR = spriteCache(60);
const toes = (g, P, x, y, s) => { for (const dx of [-9, 0, 9]) { const p = P(x + dx * s, y); g.px(R(p[0]) - 1, R(p[1]), MUZ[6]); g.px(R(p[0]), R(p[1]), MUZ[7]); g.px(R(p[0]) + 1, R(p[1]), MUZ[6]); g.px(R(p[0]), R(p[1]) - 1, MUZ[5]); } };
/** Neck + barrel body + belly + four stubby legs; lf / rf = lift of the left / right legs (px, quantised to 2). */
function bodySprite(lf, rf) {
  const a = 2 * R(lf / 2), b = 2 * R(rf / 2);
  return SPR(`b${a}|${b}`, 232, 260, 116, 20, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    for (const sd of [-1, 1]) {   // hind legs (behind, a little higher)
      const up = sd < 0 ? b : a;
      blob(g, [tube([P(sd * 66, 168), P(sd * 70, FEET - 12 - up)], 15, 14), P.poly(ell(sd * 70, FEET - 13 - up, 16, 7))], { ramp: HIP, thick: 9, base: 2.2, gain: 1.4, litOutline: HIP[5] });
      toes(g, P, sd * 70, FEET - 10 - up, 0.8);
    }
    blob(g, [P.poly(ell(0, 94, 78, 34)), P.poly(ell(0, 142, 92, 64))], { ramp: HIP, thick: 40, base: 2.6, gain: 2.2, slope: 0.6, litOutline: LIT });
    blob(g, [P.poly(ell(0, 164, 56, 36))], { ramp: MUZ, thick: 20, base: 3.2, gain: 1.6, outline: HIP[2] });
    for (const sd of [-1, 1]) {   // front legs
      const up = sd < 0 ? a : b;
      blob(g, [tube([P(sd * 38, 170), P(sd * 38, FEET - 4 - up)], 17, 16), P.poly(ell(sd * 38, FEET - 5 - up, 18, 8))], { ramp: HIP, thick: 10, base: 2.9, gain: 1.6, litOutline: LIT });
      toes(g, P, sd * 38, FEET - 2 - up, 1);
    }
  });
}
/** Ears; ang = flick angle (rad, quantised). */
function earsSprite(ang) {
  const q = R(ang / 0.06);
  return SPR(`e${q}`, 150, 60, 75, 70, (g, ox, oy) => {
    for (const sd of [-1, 1]) { const P = xf(ox + sd * 46, oy - 36, 1, sd * (0.35 + q * 0.06));
      blob(g, [P.poly(ell(0, -8, 9, 12))], { ramp: HIP, thick: 6, base: 3.0, gain: 1.6, litOutline: LIT });
      flat(g, [P.poly(ell(0, -7, 4.5, 7.5))], "#E890A4"); }
  });
}
/** Upper head: cranium with eye bumps, the upper muzzle (its bottom outline is the mouth line), nostril bumps. */
const upperHead = () => SPR("uh", 172, 120, 86, 62, (g, ox, oy) => {
  const P = xf(ox, oy, 1, 0);
  blob(g, [P.poly(ell(0, -10, 58, 36)), P.poly(ell(-28, -30, 21, 19)), P.poly(ell(28, -30, 21, 19))], { ramp: HIP, thick: 22, base: 3.0, gain: 2.0, slope: 0.4, litOutline: LIT });
  blob(g, [P.poly(ell(0, 20, 76, 30)), P.poly(ell(-24, -2, 17, 13)), P.poly(ell(24, -2, 17, 13))], { ramp: MUZ, thick: 22, base: 3.1, gain: 2.0, slope: 0.6, litOutline: "#FFE8D0", outline: HIP[1] });
  for (const sd of [-1, 1]) for (let k = -9; k <= 9; k++) { const p = P(sd * 24 + k, 9 + (k * k) / 30); g.px(R(p[0]), R(p[1]), MUZ[3]); }
  for (const [x, y] of [[-42, 24], [-36, 31], [-46, 33], [42, 24], [36, 31], [46, 33]]) { const p = P(x, y); g.px(R(p[0]), R(p[1]), MUZ[2]); }
});
/** Lower jaw (chin): only its lower part shows under the upper muzzle when the mouth is closed. */
const jawSprite = () => SPR("jw", 150, 90, 75, 14, (g, ox, oy) => {
  const P = xf(ox, oy, 1, 0);
  const pts = []; for (let i = 0; i <= 40; i++) { const a = -0.2 + ((Math.PI + 0.4) * i) / 40; pts.push(P(Math.cos(a) * 76, 30 + Math.sin(a) * 40)); }
  blob(g, [pts], { ramp: MUZ, thick: 18, base: 2.8, gain: 1.6, slope: 0.7, litOutline: "#FFE8D0", outline: HIP[1] });
});

/** Open mouth for a head centred at (x, y) whose upper head is lifted by `up` and jaw dropped by `drop` (px): stretched
 *  cheeks between the jaws, a U-shaped pink mouth inside the lower lip (palate, throat, tongue), tusks and pegs. */
function mouth(g, x, y, up, drop) {
  const open = up + drop; if (open < 0.5) return;
  const top = y - up + 49, y0 = R(y - up + 22), y1 = R(y + drop + 30);
  for (let Y = y0; Y <= y1; Y++) for (let X = R(x - 74); X <= R(x + 74); X++) {   // cheeks (the jaw and upper head cover their ends)
    const e = Math.abs(X - x); g.px(X, Y, e > 72.5 ? HIP[1] : e > 66 ? MUZ[3] : X < x ? (e > 60 ? MUZ[4] : MUZ[5]) : MUZ[4]);
  }
  const k = Math.min(1, open / 8), rx = 40 + Math.min(24, open * 0.55), ry = open + 6 * k, tcy = top + ry * 0.66;
  for (let Y = R(top - ry); Y <= R(top + ry); Y++) for (let X = R(x - rx); X <= R(x + rx); X++) {
    const u = (X + 0.5 - x) / rx, v = (Y + 0.5 - top) / ry, d = u * u + v * v; if (d > 1) continue;
    const rim = d > 1 - 2.4 / Math.max(3, Math.min(rx, ry));
    let col = rim ? "#3A1426" : v < 0.12 ? (v < -0.2 ? "#F2A8BA" : "#E2849C") : Math.abs(u) < 0.42 && v < 0.55 ? "#5E1630" : "#7E2442";
    const tu = (X + 0.5 - x) / (rx * 0.56), tv = (Y + 0.5 - tcy) / (ry * 0.4), td = tu * tu + tv * tv;
    if (!rim && td <= 1) col = td > 0.8 ? "#C8506E" : tv < -0.25 && tu < 0.15 ? "#FFB8CA" : Math.abs(tu) < 0.07 && tv < 0.45 ? "#D86884" : "#F48CA6";   // tongue
    g.px(X, Y, col);
  }
  // two big lower tusks standing on the lower lip (curving inward), incisor pegs, small upper tusks under the upper muzzle
  const th = Math.min(17, 2 + open * 0.26);
  for (const sd of [-1, 1]) {
    const bx = x + sd * rx * 0.66, base = top + ry * Math.sqrt(1 - 0.66 * 0.66) - 1;
    for (let kk = 0; kk <= th; kk++) { const f = kk / th, w = R(lerp(3.4, 0.6, f)), tx = R(bx - sd * f * f * 5), ty = R(base - kk); for (let j = -w; j <= w; j++) g.px(tx + j, ty, j === -w || j === w ? "#6A5A50" : j * sd < 0 ? "#FFFFFF" : "#E4DCCC"); }
    g.px(R(bx - sd * 5), R(base - th - 1), "#6A5A50");
    const pk = Math.min(5, open * 0.12), pb = R(top + ry * 0.97) - 1; for (let kk = 0; kk < pk; kk++) g.rect(R(x + sd * 9) - 1, pb - kk, 3, 1, kk >= pk - 1 ? "#C8C0B0" : "#F8F4E8");
    const ut = Math.min(6, open * 0.1), ux = sd * rx * 0.5, uy = y - up + 20 + 30 * Math.sqrt(1 - (ux / 76) ** 2);
    if (ut > 1) for (let kk = 0; kk < ut; kk++) { const w = kk < ut - 2 ? 1 : 0; g.rect(R(x + ux) - w, R(uy + kk), 2 * w + 1, 1, "#F4F0E4"); }
  }
}

/**
 * Draw the hippo with its head centre at screen (x, y); wly = screen row of the water surface (rows below are tinted).
 * o: lf/rf leg lifts · ear (flick angle) · gap (mouth opening px: the upper head lifts 72 %, the jaw drops 28 %) ·
 *    look [x, y] · blink 0..1 · low (lower lids) 0..1 · wide 0..1 (eyes pop) · brow 0..1 + browTilt (−1 sly … +1 angry) ·
 *    happy 0..1 (^ ^ eyes) · nos (nostril flare) · grin 0..1 (mouth corners) · tint/k (underwater look).
 */
export function drawHippo(c, uw, x, y, wly, o) {
  const below = { below: wly, tint: o.tint, k: o.k }, gap = Math.max(0, o.gap ?? 0), up = R(gap * 0.72), drop = R(gap * 0.28);
  bodySprite(o.lf ?? 0, o.rf ?? 0).blit(c, x, y, below);
  earsSprite(o.ear ?? 0).blit(c, x, y - up, below);
  jawSprite().blit(c, x, y + drop, below);
  mouth(uw, x, y, up, drop);
  upperHead().blit(c, x, y - up, below);
  face(uw, x, y - up, o);
}
function face(g, x, y, o) {
  const wide = o.wide ?? 0, happy = clamp01(o.happy ?? 0), r = 10 + 2.6 * wide, ry = 11 + 2.8 * wide;
  for (const sd of [-1, 1]) {
    const ex = x + sd * 28, ey = y - 30;
    if (happy < 1) eye(fade(g, 1 - happy), ex, ey, r, { ry, iris: IRIS, pupil: "round", look: o.look, blink: o.blink ?? 0, lid: HIP[4] });
    const low = clamp01(o.low ?? 0) * (1 - happy);
    if (low > 0.02) {   // lower lid rises (squint): fill the bottom of the eye with lid colour, outline its edge
      const ly = ey + ry - 2 * ry * low * 0.5;
      for (let Y = R(ly); Y <= R(ey + ry + 1); Y++) for (let X = R(ex - r - 1); X <= R(ex + r + 1); X++) { const d = ((X + 0.5 - ex) / (r + 0.6)) ** 2 + ((Y + 0.5 - ey) / (ry + 0.6)) ** 2; if (d <= 1) g.px(X, Y, Y === R(ly) ? "#07060E" : HIP[4]); }
    }
    if (happy > 0) {    // ^ ^ closed happy eyes, dissolving in
      const gh = fade(g, happy); for (let X = -r + 1; X <= r - 1; X++) { const u = X / r, yy = ey + 3 - 7 * (1 - u * u); for (const dy of [0, 1]) gh.px(R(ex + X), R(yy) + dy, "#07060E"); }
    }
    const br = clamp01(o.brow ?? 0);
    if (br > 0.02) {    // brows: tilt +1 angry (inner ends down), −1 sly (outer ends down), 0 level
      const gb = fade(g, br), tilt = o.browTilt ?? 0, by = ey - ry - 4 + (1 - br) * 3;
      for (let k = -9; k <= 9; k++) { const yy = R(by + (sd * k / 9) * 3.5 * tilt * -1); gb.px(R(ex + k), yy, HIP[0]); gb.px(R(ex + k), yy + 1, HIP[1]); if (Math.abs(k) < 8) gb.px(R(ex + k), yy - 1, HIP[2]); }
    }
    blush(g, x + sd * 52, y + 26, 10, 4.5, "#F27A9A");
    const nx = x + sd * 24, ny = y - 4, nos = o.nos ?? 0.2, nrx = 3.4 + nos * 2.2, nry = 2 + nos * 2;
    for (let Y = R(ny - nry - 0.5); Y <= R(ny + nry + 0.5); Y++) for (let X = R(nx - nrx - 0.5); X <= R(nx + nrx + 0.5); X++) { const d = ((X - nx) / (nrx + 0.5)) ** 2 + ((Y - ny) / (nry + 0.5)) ** 2; if (d <= 1) g.px(X, Y, d > 0.5 ? "#5A2A40" : "#1E0E18"); }
    g.px(R(nx - sd), R(ny - nry - 1), MUZ[7]);
    // mouth corners: little upturned dimples (grin), drawn on the muzzle at the ends of the mouth line
    const gr = clamp01(o.grin ?? 0.5); if (gr > 0.05) { const gg = fade(g, gr); const mx = x + sd * 61, my = y + 37; gg.px(R(mx), my, HIP[1]); gg.px(R(mx + sd), my - 1, HIP[1]); gg.px(R(mx + sd * 2), my - 2, HIP[1]); gg.px(R(mx + sd * 2), my - 3, HIP[2]); }
    const nub = 1 - clamp01((o.gap ?? 0) / 4); if (nub > 0) { const gn = fade(g, nub), tx = R(x + sd * 37), ty = y + 47; gn.rect(tx - 1, ty, 3, 3, "#F8F4E4"); gn.px(tx - sd, ty, "#FFFFFF"); gn.px(tx + sd, ty + 2, "#B8B0A0"); }
  }
}

// ---------------------------------------------------------------- ICON (~56 px head portrait, facing the camera)
const iconSprite = () => SPR("icon", 64, 60, 32, 30, (g, ox, oy) => {
  for (const sd of [-1, 1]) { const P = xf(ox + sd * 19, oy - 15, 1, sd * 0.4); blob(g, [P.poly(ell(0, -3, 4.5, 5.5))], { ramp: HIP, thick: 3, base: 3.2, gain: 1.2, litOutline: HIP[6] }); flat(g, [P.poly(ell(0, -3, 2, 3))], "#E890A4"); }
  blob(g, [ell(ox, oy - 5, 23, 15), ell(ox - 11, oy - 12, 9, 8), ell(ox + 11, oy - 12, 9, 8)], { ramp: HIP, thick: 9, base: 3.2, gain: 1.8, slope: 0.4, litOutline: HIP[6] });
  blob(g, [ell(ox, oy + 9, 28, 11), ell(ox - 9, oy + 1, 7, 5), ell(ox + 9, oy + 1, 7, 5)], { ramp: MUZ, thick: 8, base: 3.2, gain: 1.6, slope: 0.6, litOutline: MUZ[7], outline: HIP[1] });
  blob(g, [ell(ox, oy + 19, 22, 6)], { ramp: MUZ, thick: 4, base: 2.6, gain: 1.0, outline: HIP[1] });
  for (const sd of [-1, 1]) {
    eye(g, ox + sd * 11, oy - 11, 5.2, { ry: 5.6, iris: IRIS, pupil: "round", lid: HIP[4] });
    g.px(ox + sd * 9, oy + 1, "#1E0E18"); g.px(ox + sd * 9 + sd, oy + 1, "#1E0E18"); g.px(ox + sd * 9, oy + 2, "#5A2A40");
    blush(g, ox + sd * 20, oy + 10, 4, 2, "#F27A9A");
    g.rect(ox + sd * 8 - (sd < 0 ? 1 : 0), oy + 18, 2, 2, "#F8F4E4");
  }
});
export function ICON(c, cx, cy, a = 1) { if (a > 0) iconSprite().blit(c, R(cx), R(cy) + 2, { a }); }
