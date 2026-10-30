// catalog-v1 copy (2026-10-26) of work/pixel-lab/trial-10s/engine/night.mjs#drawWeb (the corner spider web: six spokes
// fanning from a window-corner anchor, six sagging rings, alternating two violets). Changes: the film's layer(cam, 0.55)
// projection is replaced by a plain screen mapping at scale S (the item's z), the sway, ring sag and a shake jitter are
// parameters, and a glint mixes both violets toward a pale silver (a colour state, no new parts). Nothing is imported
// from the trial folder.
const R = Math.round;
const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// mix two #RRGGBB colours by k (0 = a, 1 = b)
export function mixHex(a, b, k) {
  const x = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), y = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * clamp01(k)).toString(16).padStart(2, "0")).join("").toUpperCase();
}
export const WEB = { ax: -6, ay: -6, Rmax: 120, spokes: [0.08, 0.36, 0.66, 0.98, 1.3, 1.5], col: "#5C5490", col2: "#3E3868", glint: "#D9D3FF" };

// P: { t, amp (sway, 1 = the film's 1.5 px), jit (shake amplitude, film px), jph (shake phase), sag (0 = film sag), glint 0..1 }
export function drawWebAt(c, ox, oy, S, P) {
  const { ax, ay, Rmax, spokes } = WEB, k = clamp01(P.glint) * 0.8;
  const col = mixHex(WEB.col, WEB.glint, k), col2 = mixHex(WEB.col2, WEB.glint, k);
  const sway = 1.5 * P.amp * Math.sin(1.1 * P.t) + P.jit * Math.sin(P.jph);
  const pt = (a, r) => [ox + (ax + Math.cos(a) * r + sway * r / Rmax) * S, oy + (ay + Math.sin(a) * r) * S];
  for (const a of spokes) { const [x0, y0] = pt(a, 0), [x1, y1] = pt(a, Rmax); c.line(R(x0), R(y0), R(x1), R(y1), col2); }
  const sagK = 1 + 1.6 * clamp01(P.sag);
  for (let ring = 1; ring <= 6; ring++) { const r = ring * 19; for (let k2 = 0; k2 + 1 < spokes.length; k2++) { const n = 8; let prev = null;
    for (let i = 0; i <= n; i++) { const a = lerp(spokes[k2], spokes[k2 + 1], i / n), sag = Math.sin(Math.PI * i / n) * 4 * (ring / 6) * sagK, p = pt(a, r - sag); if (prev) c.line(R(prev[0]), R(prev[1]), R(p[0]), R(p[1]), ring % 2 ? col : col2); prev = p; } } }
  return { anchor: [ox + ax * S, oy + ay * S] };
}
