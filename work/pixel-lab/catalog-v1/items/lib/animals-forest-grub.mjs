// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/forest.mjs#drawGrub (5 round cream segments, wriggle
// sin(t*9 + i*0.9)*1.5, a brown cap and two dot eyes). Changes: drawn at scale s (the film's grub is 11 px wide): each segment is a
// shaded blob in the grub colours (extended to an 8-step ramp), dot eyes become bead eyes + a small smile, and the options
// wig (wriggle), bend (lean toward the look), rear (stretch up), squash, happy, wide, open, blink are continuous.
import { blob, ell, eye, smile, mix, lerp } from "./cute.mjs";

const R = Math.round;
const GRUB = ["#6A4A2A", "#B49464", "#E2CC9C", "#F6E8C6", "#FFF8E4"];
const RAMP8 = ["#3A2410", "#6A4A2A", "#8E6E44", "#B49464", "#CDB180", "#E2CC9C", "#F6E8C6", "#FFF8E4"];
const CAP = ["#140A06", "#2A180C", "#4A2E16", "#6A4A2A", "#80603A", "#977648", "#B49464", "#C8AA78"];
const IRIS = ["#0B0812", "#1A100C", "#2A1A12", "#5A3A26", "#8A6040"];

/** o: s scale, t, look [x,y], blink, wig 0..1, bend -1..1 (lean), rear 0..1, squash 0..1, happy, wide, open */
export function drawGrub(c, gx, gy, o) {
  const S = o.s, t = o.t, sp = 4 * (1 + 0.4 * (o.rear || 0) - 0.18 * (o.squash || 0)), amp = 1.5 + 2.2 * (o.wig || 0), bend = o.look[0] * 1.0;
  const pos = [];
  for (let i = 0; i < 5; i++) {
    const w = Math.sin(t * 9 + i * 0.9) * amp, up = (4 - i) / 4;
    pos.push([gx + (w * (i / 4) + bend * 9 * up * up * (1 + (o.rear || 0) * 0.3)) * S, gy - (3 + (4 - i) * sp - 0.8 * (o.squash || 0) * (4 - i) * 0.0) * S, 4 - Math.abs(i - 2) * 0.4 + 1]);
  }
  for (let i = 4; i >= 0; i--) {
    const [x, y, rx] = pos[i], r = i === 0 ? 1 : 1;
    blob(c, [ell(x, y, rx * S * (0.98 + 0.06 * (o.wide || 0) * (i === 0)), 3.5 * S * r)], { ramp: RAMP8, thick: 7 * S, base: 3.4, gain: 1.9, slope: 0.6, outline: GRUB[0], litOutline: "#FFF1C8" });
  }
  const [hx, hy] = pos[0], er = (1.25 + 0.3 * (o.wide || 0)) * S, ex = 1.9 * S;
  blob(c, [ell(hx, hy - 3.2 * S, 2.9 * S, 1.5 * S)], { ramp: CAP, thick: 3 * S, base: 3.3, outline: "#140A06", litOutline: "#B49464" });
  const blink = Math.max(o.blink || 0, o.happy || 0), look = o.look;
  for (const s of [-1, 1]) {
    eye(c, hx + s * ex + look[0] * 0.6 * S, hy - 0.2 * S + look[1] * 0.4 * S, er, { ry: er * 1.12, iris: IRIS, pupil: "bead", look, blink, lid: GRUB[2], outline: "#2A1A12" });
    if (o.happy > 0.3) for (let u = -er; u <= er; u += 0.5) { const f = Math.min(1, (o.happy - 0.3) / 0.5), yy = -er * 0.55 * (1 - (u / er) ** 2); if (f > (((R(hx + s * ex + u) * 5 + R(hy + yy)) % 4) / 4)) c.px(R(hx + s * ex + u + look[0] * 0.6 * S), R(hy - 0.2 * S + yy), "#2A1A12"); }
  }
  smile(c, hx + look[0] * 0.8 * S, hy + 2.4 * S, 1.3 * S, { col: "#4A2210", open: 0.5, a: Math.min(1, (o.open || 0) * 2.5) });
  smile(c, hx + look[0] * 0.8 * S, hy + 2.4 * S, 1.3 * S, { col: "#4A2210", a: 1 - Math.min(1, (o.open || 0) * 2.5) });
  return { hx, hy };
}
