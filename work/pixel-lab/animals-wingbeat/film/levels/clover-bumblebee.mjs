// LV7's buff-tailed bumblebee, facing the camera: rounder and fuzzier than the honeybee — a big velvety black head with
// glossy amber-brown eyes (two highlights each), pink blush and a small smile, elbowed antennae, a lemon-yellow collar
// ruff, a round body with a yellow band, a black band and a white tail, little dangling legs with orange pollen baskets.
// Fur: jagged pixel outline + short fur strokes; the low sun behind it lights the top of the silhouette (warm rim).
// Wings are small for the body: a motion-blur fan (hive-bee.mjs wingFan) whose ghost sits at the elevation e.
// The expensive shading is cached as a sprite per (scale, tilt); everything else is cheap per-frame drawing.
import { blob, ell, tube, bez, eye, blush, smile, fade, mix, bayer, rnd, sm } from "../cute.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";
import { wingFan, rimLight } from "./hive-bee.mjs";

const R = Math.round;
export const FUR_K = ["#06050A", "#0E0C16", "#181522", "#231F30", "#302A40", "#3E3752", "#524A68", "#6C6484"];
export const FUR_Y = ["#3A2404", "#6E4806", "#A87010", "#D89A1C", "#F2BE2C", "#FAD452", "#FDE68A", "#FFF6C8"];
export const FUR_W = ["#4E4640", "#746A60", "#9A8E80", "#BEB2A2", "#D8CEBE", "#EAE2D4", "#F6F0E6", "#FFFCF4"];
const IRIS = ["#120A06", "#2A1608", "#4E2C10", "#7E4E1E", "#B88040", "#E8B870"];
const SPR = spriteCache(16);

/** jagged fuzzy ellipse outline (local units → screen via T) */
const fuzz = (cx, cy, rx, ry, n, amp, ph) => { const out = []; for (let i = 0; i < n; i++) { const an = (i / n) * 6.283, k = 1 + amp * (i % 2 ? 1 : -0.5) * (0.6 + 0.4 * Math.sin(i * 2.3 + ph)); out.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return out; };

/** Short fur strokes inside a painted region: shift the ramp index of little radial dashes up/down by one step. */
function furStrokes(g, ramps, cx, cy, rx, ry, n, seed) {
  const idx = new Map(); for (const ramp of ramps) ramp.forEach((h, i) => idx.set(h, [ramp, i]));
  const key = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  for (let k = 0; k < n; k++) {
    const an = rnd(seed + k * 3) * 6.283, rr = Math.sqrt(rnd(seed + k * 3 + 1)) * 0.92, x = cx + Math.cos(an) * rx * rr, y = cy + Math.sin(an) * ry * rr;
    const hit = idx.get(key(g.get(R(x), R(y)))); if (!hit) continue; const [ramp, i] = hit, up = rnd(seed + k * 3 + 2) < 0.55, j = Math.max(1, Math.min(ramp.length - 1, i + (up ? 1 : -1)));
    const dx = Math.cos(an) * 0.9, dy = Math.sin(an) * 0.9 - 0.3, L = 2 + (k % 3);
    for (let s = 0; s < L; s++) { const X = R(x + dx * s), Y = R(y + dy * s), h2 = idx.get(key(g.get(X, Y))); if (h2 && h2[0] === ramp) g.px(X, Y, ramp[j]); }
  }
}

function bodySprite(s, tilt) {
  const key = `bb:${s.toFixed(3)}:${tilt.toFixed(2)}`, W = R(170 * s) + 12, H = R(200 * s) + 12, ox = R(W / 2), oy = R(66 * s) + 6;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => xform(pts.map(([u, v]) => [x + u * s, y + v * s]), x, y + 40 * s, tilt);
    const P = (u, v) => T([[u, v]])[0];
    // little legs with pollen baskets (behind the body)
    for (const sd of [-1, 1]) {
      for (const [u0, v0, u1, v1] of [[16, 124, 22, 140], [32, 116, 44, 131]]) { const p = P(sd * u0, v0), q = P(sd * u1, v1); blob(g, [tube([p, q], 2.6 * s, 2 * s)], { ramp: FUR_K, thick: 2, base: 4 }); }
      const [px, py] = P(sd * 45, 132); blob(g, [ell(px, py, 7 * s, 6 * s, 0, 20)], { ramp: ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"], base: 4, thick: 4 * s, litOutline: "#7A3A08" });
    }
    // round body: shaded yellow, then recoloured bands (black thorax top, yellow band, black band, white tail)
    blob(g, [T(fuzz(0, 92, 57, 48, 150, 0.04, 2))], { ramp: FUR_Y, base: 3.4, gain: 2.2, thick: 20 * s, litOutline: "#6E4806" });
    const idx = new Map(FUR_Y.map((h, i) => [h, i]));
    for (let Y = R(y + 36 * s); Y <= R(y + 146 * s); Y++) for (let X = R(x - 64 * s); X <= R(x + 64 * s); X++) {
      const u = (X - x) / (57 * s), yy = (Y - y) / s - 7 * (1 - u * u) - ((X - x) / s) * Math.tan(tilt);
      const col = g.get(X, Y), i = idx.get("#" + col.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()); if (i === undefined) continue;
      const band = yy < 72 ? FUR_K : yy < 95 ? null : yy < 112 ? FUR_K : FUR_W; if (band) g.px(X, Y, band[Math.min(band.length - 1, i + (band === FUR_W ? 1 : 0))]);
    }
    furStrokes(g, [FUR_Y, FUR_K, FUR_W], x, y + 92 * s, 55 * s, 46 * s, 260, 17);
    // lemon collar ruff
    blob(g, [T(fuzz(0, 46, 48, 16, 70, 0.09, 1))], { ramp: FUR_Y, base: 4.3, gain: 1.8, thick: 8 * s, litOutline: "#6E4806" });
    furStrokes(g, [FUR_Y], x, y + 46 * s, 45 * s, 13 * s, 60, 5);
    // big velvety head
    blob(g, [T(fuzz(0, 0, 51, 46, 130, 0.035, 0))], { ramp: FUR_K, base: 3.3, gain: 2.3, thick: 22 * s, litOutline: "#3E3752" });
    furStrokes(g, [FUR_K], x, y, 48 * s, 43 * s, 230, 9);
    // head tuft
    for (const [u, h, lean] of [[-7, 8, -3], [0, 11, 1], [7, 8, 4]]) { const p0 = P(u, -43), p1 = P(u + lean, -43 - h); blob(g, [tube([p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], p1], 2.8 * s, 1.2 * s)], { ramp: FUR_K, base: 4.6, thick: 2, litOutline: "#524A68" }); }
    // soft lighter muzzle under the eyes (keeps the smile readable on black)
    { const [mx, my] = P(0, 24); for (let Y = R(my - 9 * s); Y <= R(my + 9 * s); Y++) for (let X = R(mx - 16 * s); X <= R(mx + 16 * s); X++) { const d = ((X - mx) / (16 * s)) ** 2 + ((Y - my) / (9 * s)) ** 2; if (d < 1 && (1 - d) * 0.9 > bayer(X, Y) && g.m[(Y - 0) * g.w + X]) g.px(X, Y, FUR_K[5]); } }
    rimLight(g, ["#FFF4D0", "#F8D890", "#C8A060"], 2, 0.5, { outline: "#B87A30", outlineTop: 0.42 });
  });
}

/**
 * Bumblebee facing the camera. (x, y) = head centre (screen). o: s scale, tilt, e (wing elevation), look, blink,
 * happy 0..1 (closed "^ ^" eyes), open (mouth), antSway, a (dissolve), wingL (wing length factor).
 */
export function drawBumblebee(c, x, y, o = {}) {
  const s = o.s ?? 1, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1; if (a <= 0) return;
  x = R(x); y = R(y);
  const P = (u, v) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u * s, dy = v * s - 40 * s; return [x + dx * cs - dy * sn, y + 40 * s + dx * sn + dy * cs]; };
  // small smoky wings: blur fans behind the body
  for (const side of [-1, 1]) wingFan(c, P(side * 36, 50), side, o.e ?? 0, 46 * s * (o.wingL ?? 1), { a, tilt, hind: true, aTop: -1.2, aBot: 0.18, width: 0.4, dens: 0.34, cols: ["#F4F0FA", "#C4BCD8", "#5E5878", "#A8A0C0"] });
  bodySprite(s, tilt).blit(c, x, y, { a });
  // elbowed antennae (scape up, flagellum bending outward), blunt dark tips with a warm rim
  const sway = o.antSway ?? 0, g = fade(c, a);
  for (const sd of [-1, 1]) {
    const r0 = P(sd * 14, -39), el = P(sd * 18 + sway * 0.3, -66), tip = P(sd * 40 + sway, -76);
    blob(c, [tube([r0, el], 2.6 * s, 2.2 * s)], { ramp: FUR_K, thick: 2, base: 4, a });
    blob(c, [tube(bez(el, P(sd * 27 + sway * 0.7, -74), tip, 6), 2.2 * s, 2.6 * s)], { ramp: FUR_K, thick: 2, base: 4, a, litOutline: "#524A68" });
    g.px(R(tip[0]), R(tip[1] - 3 * s), "#F8D890"); g.px(R(tip[0]) - 1, R(tip[1] - 3 * s), "#C8A060"); g.px(R(el[0]), R(el[1] - 2), "#C8A060");
  }
  // face: lighter eye rims on the black fur, glossy amber-brown eyes, blush, smile
  const look = o.look ?? [0, 0], blink = o.blink ?? 0, happy = o.happy ?? 0;
  const eyeA = a * (1 - sm(happy, 0.55, 0.9)), arcA = a * sm(happy, 0.5, 0.85);
  for (const sd of [-1, 1]) {
    const [ex, ey] = P(sd * 21, 0), rx = 15 * s, ry = 16.5 * s;
    if (eyeA > 0) {
      const q = fade(c, eyeA); q.ering(R(ex), R(ey), R(rx + 2), R(ry + 2), "#3E3752"); q.ering(R(ex), R(ey) + 1, R(rx + 1), R(ry + 1), "#524A68", 0.3, Math.PI - 0.3);
      eye(c, ex, ey, rx, { ry, iris: IRIS, pupil: "round", look, blink: Math.max(blink, happy), lid: FUR_K[3], a: eyeA });
    }
    if (arcA > 0) { const q = fade(c, arcA); for (let i = -11; i <= 11; i++) { const u = i / 11; for (const dy of [0, 1]) q.px(R(ex + i * s), R(ey + 3 * s - (1 - u * u) * 8 * s) + dy, dy ? "#9A8AC0" : "#E8DCFA"); } }
  }
  { const [b1x, b1y] = P(-37, 21), [b2x, b2y] = P(37, 21); blush(c, b1x, b1y, 8 * s, 4 * s, "#FF96BC", a); blush(c, b2x, b2y, 8 * s, 4 * s, "#FF96BC", a); }
  const [mx, my] = P(0, 23); smile(c, mx, my, Math.max(2, 5 * s), { open: o.open ?? 0.35, col: "#07060E", a });
}
export { mix };
