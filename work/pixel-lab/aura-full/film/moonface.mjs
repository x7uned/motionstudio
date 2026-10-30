// «Infinite aura» · builder C — the moon stares. On "moon" two closed-eye creases appear on the moon (X.moon), and the
// eyes open over ≈0.3 s: big cartoon eyes that follow him (X.hero.head), heavy brows. On "staring" the eyes widen,
// the pupils shrink, one brow shoots up (sus), a little smirk appears and the moon slowly creeps closer (it grows
// 44 → 54 px and drifts toward him). Blinks now and then. Runs on world time τ = X.T (frozen by the time stop).
import { oval, heroHead, fade, mix, bayer, sm, lerp, clamp01, ease, easeOut, backOut, R, PI } from "./C-kit.mjs";
import { EV } from "./timeline.mjs";

const ON = EV.moon - 0.05, OPEN0 = EV.moon + 0.12, OPEN1 = OPEN0 + 0.32, STARE = EV.staring - 0.04;
const INK = "#1E1236", WHITE = "#FFFDF8", WHITE_S = "#D8D0EE", BROW = "#2A1A48", LID = ["#B8AEDC", "#CCC4EA", "#DCD6F4"];
const CRATERS = [[-14, -10, 9], [12, 6, 12], [-4, 18, 6], [16, -18, 5], [-22, 12, 4]];

export function sky(c, X) {
  const m = X.moon; if (!m) return;
  const T = X.T, show = sm(T, ON, ON + 0.25); if (show <= 0) return;
  const dark = clamp01(X.L / 6) * 0.9, ma = sm(dark, 0.25, 0.85) * show; if (ma <= 0) return;
  const g = fade(c, ma);
  // creep: grows and drifts toward him after "staring"
  const z = ease((T - STARE) / 3.6), r = m.r * (1 + 0.23 * z), cx = m.x - 6 * z, cy = m.y + 5 * z;
  if (z > 0) {
    // redraw the moon bigger (same look as world.mjs drawSunMoon) with a soft extra halo
    g.dither(R(cx - r - 9), R(cy - r - 9), R(2 * r + 19), R(2 * r + 19), (x, y) => { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); return d > r && d < r + 9 ? 0.3 * (1 - (d - r) / 9) : 0; }, "#D8CCFF");
    g.disc(R(cx), R(cy), R(r), "#E6E0FA"); g.disc(R(cx + 4 * r / 44), R(cy + 4 * r / 44), R(r - 6 * r / 44), "#D2CAF0");
    for (const [ox, oy, cr] of CRATERS) { const k = r / 44; g.disc(R(cx + ox * k), R(cy + oy * k), R(cr * k), "#BCB2E0"); g.disc(R(cx + (ox - 1) * k), R(cy + (oy - 1) * k), Math.max(1, R((cr - 3) * k)), "#C8BFEA"); }
  }
  // look target: his head; when the world freezes the gaze holds still
  const tgt = heroHead(X);
  const open = easeOut((T - OPEN0) / (OPEN1 - OPEN0)), wide = backOut((T - STARE) / 0.35, 2.2), crease = sm(T, ON, ON + 0.2);
  const bp = ((T - OPEN1 - 1.6) % 3.1 + 3.1) % 3.1, blink = T > OPEN1 + 1 && bp < 0.22 ? Math.sin((PI * bp) / 0.22) : 0;
  const k = r / 44, ery = (13 + 2.5 * wide) * k, erx = (11.5 + 1.2 * wide) * k, gap = 16.5 * k;
  for (const side of [-1, 1]) {
    const ex = cx + side * gap, ey = cy - 7 * k;
    // eyelid opening: 0 = closed crease, 1 = open; the upper lid covers the top part (lidY)
    const o = open * (1 - blink), lidY = ey + ery - 2 * ery * o * (0.8 + 0.2 * wide);
    // shadow socket
    g.dither(R(ex - erx - 3), R(ey - ery - 3), R(2 * erx + 7), R(2 * ery + 7), (x, y) => { const d = Math.hypot((x + 0.5 - ex) / (erx + 3), (y + 0.5 - ey) / (ery + 3)); return d < 1 && d > 0.8 ? 0.45 * crease : 0; }, "#A89CD0");
    if (o > 0.02) {
      const dx = tgt[0] - ex, dy = tgt[1] - ey, dl = Math.hypot(dx, dy) || 1, pr = (5.4 - 1.6 * wide) * k, px = ex + (dx / dl) * erx * 0.5, py = ey + (dy / dl) * ery * 0.45;
      oval(g, ex, ey, erx + 1, ery + 1, (x, y) => {
        if (y + 0.5 < lidY) return null;
        const dp = Math.hypot(x + 0.5 - px, y + 0.5 - py);
        if (dp < pr) return "#0B0812";
        if (dp < pr + 1.6 * k) return "#3A2A6A";                    // a thin dark-violet iris ring
        return y < ey - ery * 0.35 ? WHITE_S : WHITE;
      }, null);
      // outline only where the eye is open, plus the lid line
      for (let a = 0; a < 2 * PI; a += 0.04) { const x = R(ex + Math.cos(a) * (erx + 1)), y = R(ey + Math.sin(a) * (ery + 1)); if (y + 0.5 >= lidY - 0.5) g.px(x, y, INK); }
      for (let x = R(ex - erx); x <= R(ex + erx); x++) { const u = (x - ex) / (erx + 1); if (Math.abs(u) <= 1) { const y = R(Math.max(lidY, ey - (ery + 1) * Math.sqrt(1 - u * u))); g.px(x, y, INK); g.px(x, y - 1, LID[0]); } }
      // glints
      const gx = R(px - pr * 0.45), gy = R(py - pr * 0.5); if (gy > lidY) { g.rect(gx, gy, 2, 2, "#FFFFFF"); g.px(R(px + pr * 0.5), R(py + pr * 0.4), "#FFFFFF"); }
    }
    // the closed crease (before the eyes open / during a blink): a curved lash line
    const cl = crease * (1 - open) + blink * open;
    if (cl > 0.05) { const f = fade(g, Math.min(1, cl * 1.5)); for (let x = R(ex - erx); x <= R(ex + erx); x++) { const u = (x - ex) / erx; f.px(x, R(ey + 3 * k + 3 * k * (1 - u * u)), INK); if (Math.abs(u) < 0.85) f.px(x, R(ey + 3 * k + 3 * k * (1 - u * u)) + 1, INK); } }
    // brows: heavy arcs; on the stare the left one (from his side the far one) shoots up, the other knits down
    // left brow (side −1) shoots up in an arch (sus); right brow knits down toward the middle
    const up = side < 0 ? 10 * wide : -2 * wide, bw = 13.5 * k, by = ey - ery - 6 * k - up * k - 4 * (1 - open) * k;
    const browA = sm(T, ON + 0.05, OPEN0 + 0.1);
    if (browA > 0) {
      const f = fade(g, browA);
      for (let x = -bw; x <= bw; x += 0.5) {
        const u = x / bw, inner = side < 0 ? u : -u;                  // inner = +1 at the end near the middle of the face
        const y = by - (4 + 2.5 * (side < 0 ? wide : 0)) * k * (1 - u * u) + (side > 0 ? 6 * wide * k * Math.max(0, inner) : 0), th = (3.4 - 1.2 * Math.abs(u)) * k;
        f.rect(R(ex + x), R(y), 1, Math.max(1, R(th)), BROW);
      }
    }
  }
  // the smirk (after "staring")
  const sk = sm(T, STARE + 0.15, STARE + 0.5);
  if (sk > 0) { const f = fade(g, sk), mx = cx + 4 * k, my = cy + 22 * k, w = 10 * k; for (let x = -w; x <= w; x += 0.5) { const u = x / w, y = my + (u > -0.3 ? -2.6 * k * (u + 0.3) * (u + 0.3) : 0) + 1.6 * k * (1 - u * u) * 0.4; f.px(R(mx + x), R(y), INK); } f.px(R(mx + w), R(my - 2.6 * k * 1.69) - 1, INK); }
}

export const MOTIONS = [
  { t0: OPEN0, t1: OPEN1, kind: "blip", level: 0.5, note: "the moon opens its eyes" },
  { t0: STARE, t1: STARE + 0.35, kind: "blip", level: 0.45, note: "eyes widen, one brow shoots up (sus)" },
  { t0: STARE, t1: STARE + 3.6, kind: "whoosh", level: 0.2, note: "slow creepy creep: the moon grows toward him (optional low drone)" },
];
