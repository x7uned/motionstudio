// A cute chibi Thomson's gazelle (side view, facing left) who comes to drink at the swamp's shore in LV4: tan back,
// white belly and rump, a dark side stripe, a big glossy eye with a white face stripe, two ringed horns, leaf ears, thin
// legs with dark hooves, a flicking black tail. Drawn per frame from small shaded shapes (cheap at this size).
// drawGazelle(c, x, y, o): (x, y) = ground point under the body; o.z size (default 1.35), o.phase (walk cycle),
// o.neck 0 up → 1 drinking, o.lean (front dips), o.air (hop height, px), o.tuck (legs tucked in a pronk),
// o.startle (ears up, eye wide), o.blink, o.t (tail flick), o.a dissolve.
import { blob, ell, tube, eye, blush, fade } from "../cute.mjs";
import { R, lerp, thick } from "./river-kit.mjs";

const TAN = ["#3A1C08", "#6A3814", "#9A5A22", "#C27C34", "#DC9A4C", "#ECB86C", "#F6D296", "#FCE8C4"];
const WHITE = ["#5A4A40", "#8A7A6C", "#B4A898", "#D2C8BA", "#E8E0D4", "#F4EEE6", "#FBF8F2", "#FFFFFF"];
const LIT = "#FFE0A0";

export function drawGazelle(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return; const g = fade(c, a), z = o.z ?? 1.35;
  const air = o.air ?? 0, lean = o.lean ?? 0, neck = o.neck ?? 0, tuck = o.tuck ?? 0, ph = 2 * Math.PI * (o.phase ?? 0), st = o.startle ?? 0;
  const Q = (lx, ly) => [x + lx * z, y - air + ly * z];                          // local (feet line = 0) → screen
  const by = -30, sh = [-13, by - 4 + 7 * lean], hip = [12, by - 2];
  const leg = (hx, hy, swg, far) => {
    const knee = [hx + swg * 0.4 - tuck * 3, lerp(hy + 12, hy + 8, tuck)], foot = [hx + swg * (1 - tuck), lerp(air / z, hy + 13, tuck)];
    const pts = [Q(hx, hy), Q(...knee), Q(foot[0], foot[1] - 2)]; thick(g, pts, 1, far ? TAN[2] : TAN[4]); if (!far) thick(g, pts.map(([u, v]) => [u - 1, v]), 0, TAN[6]);
    const f = Q(foot[0], foot[1]); g.rect(R(f[0]) - 1, R(f[1]) - 2, 3, 2, "#2A1608");
  };
  const sw = (k) => Math.sin(ph + k) * 4 * (o.stride ?? 1);
  leg(sh[0] + 3, sh[1] + 8, sw(Math.PI), true); leg(hip[0] - 2, hip[1] + 6, sw(0), true);
  const tw = Math.sin((o.t ?? 0) * 13) * 2; thick(g, [Q(19, by - 7), Q(23, by - 5 + tw)], 1, "#1E1008");
  // body: tan with a white belly, a dark side stripe, a white rump patch
  blob(g, [ell(...Q(0, by - 2 + 3 * lean), 21 * z, 11 * z, -0.18 * lean), ell(...Q(13, by - 3), 10 * z, 9 * z)], { ramp: TAN, thick: 9, base: 3.6, gain: 1.6, litOutline: LIT, outline: TAN[0] });
  for (let k = -15; k <= 14; k += 1 / z) { const yy = by + 2 + 3 * lean * (1 - (k + 15) / 30) + (k * k) / 120, p = Q(k, yy); g.px(R(p[0]), R(p[1]), "#2A1A10"); g.px(R(p[0]), R(p[1]) + 1, "#3A2414"); for (let j = 2; j < 6; j++) if (Math.abs(k) < 13 - j * 0.8) g.px(R(p[0]), R(p[1]) + j, j > 2 ? WHITE[6] : WHITE[4]); }
  { const c0 = Q(19, by - 2); for (let j = -8; j <= 6; j++) for (let k = -3; k <= 3; k++) if ((j * j) / 64 + (k * k) / 9 < 1) g.px(R(c0[0] + k), R(c0[1] + j), WHITE[6]); }
  leg(sh[0], sh[1] + 9, sw(0), false); leg(hip[0] + 2, hip[1] + 7, sw(Math.PI), false);
  // neck and head: the neck swings from up (looking ahead) down to the water; the head tilts muzzle-down to drink
  const ang = lerp(-2.05, -3.95, neck), L = lerp(20, 30, neck), hl = [sh[0] + Math.cos(ang) * L, sh[1] - 4 + Math.sin(ang) * L], [hx, hy] = Q(...hl);
  blob(g, [tube([Q(sh[0] + 2, sh[1] - 2), Q(lerp(sh[0], hl[0], 0.5), lerp(sh[1], hl[1], 0.5)), [hx, hy]], 6 * z, 4.5 * z)], { ramp: TAN, thick: 6, base: 3.6, gain: 1.4, litOutline: LIT, outline: TAN[0] });
  const md = lerp(Math.PI + 0.1, 2.0, neck), mx = Math.cos(md), my = Math.sin(md);
  const P = (u, v) => [hx + (mx * u + my * v) * z, hy + (my * u - mx * v) * z];   // u along the muzzle, v across (− = top)
  for (const [dx, col] of [[2.5, "#4A3422"], [-1, "#2E2014"]]) for (let k = 0; k <= 16; k++) { const f = k / 16, p = P(-3 + dx - 7 * f + 4 * f * f, -6 - 15 * f); g.px(R(p[0]), R(p[1]), k % 4 === 2 ? "#9A7E58" : col); g.px(R(p[0]) + 1, R(p[1]), col); }
  const ear = (k) => { const e0 = P(-7, -4 - k), e1 = P(-15 - 3 * st, -9 - 5 * st - k); blob(g, [tube([e0, e1], 2.6 * z, 1.5 * z)], { ramp: TAN, thick: 2, base: 3.6, gain: 1, outline: TAN[0] }); const m = P(-11 - st, -6.5 - 2.5 * st - k); g.px(R(m[0]), R(m[1]), "#F0A0A0"); };
  ear(0);
  const hp = []; for (let i = 0; i < 24; i++) { const q = (i / 24) * Math.PI * 2, u = Math.cos(q) * 10 + 2, v = Math.sin(q) * (Math.cos(q) > 0 ? 5.5 : 7.5); hp.push(P(u, v)); }
  blob(g, [hp], { ramp: TAN, thick: 6, base: 3.8, gain: 1.4, litOutline: LIT, outline: TAN[0] });
  for (let u = -2; u <= 9; u += 0.5) { const p = P(u, -2.5 + u * 0.15), q2 = P(u, -0.6 + u * 0.15); g.px(R(p[0]), R(p[1]), WHITE[6]); if (u > 0) g.px(R(q2[0]), R(q2[1]), TAN[1]); }
  const n = P(11, 0.5); g.rect(R(n[0]) - 1, R(n[1]) - 1, 3, 2, "#1A0E08");
  const e = P(-1, -1.8); eye(g, e[0], e[1], (3.6 + 0.6 * st) * z, { ry: (3.9 + 0.6 * st) * z, pupil: "bead", iris: ["#0A0606", "#1A1010", "#2E1C1A", "#5A3A2A"], lid: TAN[5], blink: o.blink ?? 0, outline: "#1A0E08" });
  const b = P(-3, 3.8); blush(g, b[0], b[1], 3 * z, 1.5 * z, "#F28A9A");
  ear(1.5);
  return { head: [hx, hy], top: P(-6, -22) };
}
