// The meadow rabbit of the heart film: a chubby wild rabbit sitting face-on like the user's reference cat — long ears
// (pink inside, dark tips; one bends over a little), big glossy dark-brown eyes with two highlights, a cream muzzle with
// a twitching pink nose and whiskers, dithered blush, a cream belly, small front paws and big hind feet.
// drawRabbit(c, x, y, o): (x, y) = head centre (screen). Body and ears are cached sprites (volume shading drawn once
// per key); the face is drawn per frame. Returns the chest point for the heart.
import { blob, flat, ell, tube, bez, eye, blush, mouthW, nose, RAMP, fade, mix } from "../cute.mjs";
import { spriteCache } from "./meadow-kit.mjs";

const R = Math.round;
export const FUR = ["#241A16", "#3E2E26", "#5A4436", "#785C4A", "#957560", "#B08E76", "#C8A88E", "#DEC4AA"];
const CREAM = ["#4E4234", "#7A6A56", "#A49278", "#C6B49A", "#DCCEB6", "#ECE2D0", "#F6F0E4", "#FFFFFF"];
const EYE = ["#0E0806", "#24140C", "#3E2414", "#5E3820", "#7E5030", "#A06C44"];
const PINK = "#E89AA6", PINK2 = "#F6BEC6";
const SPR = spriteCache(48);

function bodySprite() {
  return SPR("rabbit-body", 260, 340, 130, 80, (g, x, y) => {
    // hind feet (big ovals lying on the ground), squat round body, belly, front paws
    for (const s of [-1, 1]) blob(g, [ell(x + s * 70, y + 256, 38, 14, s * 0.08)], { ramp: FUR, thick: 10, base: 3.2, litOutline: FUR[3] });
    for (const s of [-1, 1]) flat(g, [ell(x + s * 84, y + 259, 16, 7, s * 0.1)], CREAM[4]);
    blob(g, [ell(x, y + 158, 94, 104), ell(x, y + 236, 88, 34)], { ramp: FUR, thick: 36, base: 2.8, gain: 2.4, litOutline: FUR[4] });
    blob(g, [ell(x, y + 170, 52, 74)], { ramp: CREAM, thick: 20, base: 3.4, gain: 2.2, outline: CREAM[2], litOutline: null });
    for (const s of [-1, 1]) blob(g, [ell(x + s * 24, y + 252, 17, 14)], { ramp: CREAM, thick: 8, base: 3.6, outline: FUR[1], litOutline: CREAM[3] });
    for (const s of [-1, 1]) for (const d of [-6, 0, 6]) g.line(x + s * 24 + d, y + 259, x + s * 24 + d, y + 263, CREAM[2]);
    // big head with fluffy cheeks
    blob(g, [ell(x, y, 74, 60), ell(x - 50, y + 22, 32, 26, 0.3), ell(x + 50, y + 22, 32, 26, -0.3)], { ramp: FUR, thick: 28, base: 3.0, gain: 2.4, litOutline: FUR[4] });
    // cream muzzle + chin, a pale stripe up the forehead
    blob(g, [ell(x - 15, y + 28, 19, 15), ell(x + 15, y + 28, 19, 15), ell(x, y + 38, 15, 11)], { ramp: CREAM, thick: 10, base: 3.8, gain: 1.8, outline: CREAM[2], litOutline: null });
    flat(g, [[[x - 5, y - 58], [x + 5, y - 58], [x + 3, y - 22], [x - 3, y - 22]]], FUR[5]);
  });
}
function earSprite(side, ang, bend) {
  const key = `ear:${side}:${ang.toFixed(2)}:${bend.toFixed(2)}`;
  return SPR(key, 130, 170, 65, 150, (g, x, y) => {
    // ear root at (x, y): a long soft oval leaning by `ang` (0 = straight up); a bent ear folds its top third outward
    const L = 118, cs = Math.cos(ang), sn = Math.sin(ang), at = (d) => [x + sn * d, y - cs * d];
    const [mx, my] = at(L * 0.48), polys = [ell(mx, my, 17, L * 0.52, ang, 40)];
    if (bend > 0) { const [kx, ky] = at(L * 0.7), b = ang + side * (0.35 + bend), tx = kx + Math.sin(b) * 30, ty = ky - Math.cos(b) * 30; polys[0] = ell(...at(L * 0.38), 17, L * 0.42, ang, 40); polys.push(ell((kx + tx) / 2, (ky + ty) / 2, 15, 24, b, 32)); }
    blob(g, polys, { ramp: FUR, thick: 10, base: 3.1, gain: 2.2, litOutline: FUR[4] });
    const [ix, iy] = at(L * (bend > 0 ? 0.36 : 0.46)); flat(g, [ell(ix, iy, 8.5, L * (bend > 0 ? 0.31 : 0.4), ang, 30)], PINK); flat(g, [ell(ix - cs * 2, iy - sn * 2, 4, L * (bend > 0 ? 0.24 : 0.32), ang, 24)], PINK2);
    // darker fur at the tip
    const tip = bend > 0 ? null : at(L * 0.95);
    if (tip) for (let Y = -9; Y <= 3; Y++) for (let X = -14; X <= 14; X++) { const px = R(tip[0]) + X, py = R(tip[1]) + Y; if (px >= 0 && py >= 0 && px < g.w && py < g.h && g.m[py * g.w + px] && X * X + Y * Y * 2 < 120) { const k = g.get(px, py); g.px(px, py, mix(k, FUR[1], 0.55)); } }
  });
}

/**
 * o: look [dx, dy], blink, twitch (nose 0..1), earL/earR (sway angle, rad), breathe (px), a, smile.
 * Returns { chest: [x, y] } for the heart icon.
 */
export function drawRabbit(c, x, y, o = {}) {
  x = R(x); y = R(y); const a = o.a ?? 1, by = R(o.breathe ?? 0);
  if (a > 0) {
    const eL = Math.round((o.earL ?? 0) * 100) / 100, eR = Math.round((o.earR ?? 0) * 100) / 100;
    earSprite(-1, -0.2 + eL, 0).blit(c, x - 30, y - 40 + by, { a });
    earSprite(1, 0.2 + eR, 0.3).blit(c, x + 30, y - 40 + by, { a });
    bodySprite().blit(c, x, y + by, { a });
    const g = fade(c, a), hy = y + by;
    for (const s of [-1, 1]) eye(c, x + s * 33, hy - 6, 17, { ry: 19, iris: EYE, pupil: "round", look: o.look ?? [0, 0], blink: o.blink ?? 0, lid: FUR[3], a });
    blush(c, x - 52, hy + 24, 12, 5, "#F27A9A", a); blush(c, x + 52, hy + 24, 12, 5, "#F27A9A", a);
    // nose twitches up a pixel or two, whiskers twitch with it
    const tw = R((o.twitch ?? 0) * 2);
    nose(g, x, hy + 18 - tw, 6, "#F07A92");
    g.line(x, hy + 24 - tw, x, hy + 27, "#5A3A30");
    mouthW(g, x, hy + 27, "#3A2620", 4);
    const wk = "#F4ECE0";
    for (const s of [-1, 1]) { g.line(x + s * 26, hy + 24 - tw, x + s * 72, hy + 16 - tw * 2, wk); g.line(x + s * 26, hy + 29 - tw, x + s * 74, hy + 30 - tw, wk); g.line(x + s * 26, hy + 33, x + s * 68, hy + 42 + tw, wk); }
  }
  return { chest: [x, y + by + 118] };
}
