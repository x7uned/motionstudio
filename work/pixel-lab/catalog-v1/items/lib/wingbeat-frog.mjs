// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-wingbeat/film/levels/pond-kit.mjs#peekFrog (lines 117–133, verbatim) with its R const; changes: imports re-pointed to ./cute.mjs (leafBall and the other pond painters are not needed).
import { blob, ell, eye, blush, fade, mix, bayer } from "./cute.mjs";

const R = Math.round;
export function peekFrog(c, x, y, o = {}) {
  const a = o.a ?? 1, g = fade(c, a); x = R(x); y = R(y);
  const F = ["#0E2A10", "#1A4418", "#2A6020", "#3E7E2A", "#56983A", "#74B24C", "#98CA6A", "#C4E296"];
  // the submerged body: a darker, dithered shape under the waterline
  for (let Y = y + 1; Y <= y + 16; Y++) for (let X = x - 24; X <= x + 24; X++) { const d = ((X - x) / 24) ** 2 + ((Y - y - 4) / 13) ** 2; if (d < 1 && 0.45 > bayer(X, Y)) g.px(X, Y, mix("#2A6A6A", F[2], 0.5)); }
  // head dome + eye bumps (volume shaded), cut at the waterline
  const throat = o.throat ?? 0;
  const head = ell(x, y + 2, 22, 11 + throat * 0.8, 0, 40), bumps = [ell(x - 11, y - 9, 9, 8, 0, 24), ell(x + 11, y - 9, 9, 8, 0, 24)];
  blob(c, [head, ...bumps], { ramp: F, base: 3.8, gain: 2.0, thick: 7, litOutline: F[2], outline: F[0], a });
  // waterline: cover the lower half of the dome with a light ring (the meniscus)
  for (let X = x - 24; X <= x + 24; X++) { const k = (X - x) / 24; if (Math.abs(k) > 1) continue; g.px(X, y + 3, "#E8FCFF"); if (Math.abs(k) < 0.92) g.px(X, y + 4, "#9AD8E8"); }
  for (let Y = y + 5; Y <= y + 14; Y++) for (let X = x - 24; X <= x + 24; X++) { const d = ((X - x) / 24) ** 2 + ((Y - y - 2) / 12) ** 2; if (d < 1) g.px(X, Y, ((X + Y) & 1) ? "#4AA0B8" : "#3A8AA4"); }
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) eye(c, x + sd * 11, y - 9, 6, { ry: 6.5, iris: ["#3A2A04", "#7A5A0C", "#C8961C", "#F0C040", "#FFE47A"], pupil: "round", look, blink, lid: F[4], a });
  blush(c, x - 15, y - 1, 4, 2, "#FF7FA6", a); blush(c, x + 15, y - 1, 4, 2, "#FF7FA6", a);
  for (let X = -9; X <= 9; X++) { const k = X / 9; g.px(x + X, R(y + 0 + 1.6 * (1 - k * k)), F[0]); }
}
