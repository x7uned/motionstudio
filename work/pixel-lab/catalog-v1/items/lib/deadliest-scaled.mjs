// catalog-v1 new (2026-10-26): the deadliest croc and lion drawings have no scale option (their film scale is fixed), so
// drawScaled paints the film-scale drawing into an offscreen Layer and copies it into the frame at scale K with
// nearest-neighbour sampling (the same approach as items/shark.mjs). The film point (AX, AY) lands on screen (ax, ay).
// Pixels are written through c.px, so the engine's dissolve view applies. Pure function of its arguments.
import { Layer } from "./roofs-kit.mjs";

export function drawScaled(c, ax, ay, K, W, H, AX, AY, paint) {
  const L = new Layer(W, H);
  paint(L.g, AX, AY);
  const d = L.c.d;
  const x0 = Math.max(0, Math.floor(ax - AX * K)), x1 = Math.min(c.w, Math.ceil(ax + (W - AX) * K));
  const y0 = Math.max(0, Math.floor(ay - AY * K)), y1 = Math.min(c.h, Math.ceil(ay + (H - AY) * K));
  for (let Y = y0; Y < y1; Y++) {
    const py = AY + Math.floor((Y + 0.5 - ay) / K);
    if (py < 0 || py >= H) continue;
    for (let X = x0; X < x1; X++) {
      const px = AX + Math.floor((X + 0.5 - ax) / K);
      if (px < 0 || px >= W || !L.has(px, py)) continue;
      const i = (py * W + px) * 3;
      c.px(X, Y, [d[i], d[i + 1], d[i + 2]]);
    }
  }
}
