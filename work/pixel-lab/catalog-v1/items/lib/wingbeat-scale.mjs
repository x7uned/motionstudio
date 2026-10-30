// catalog-v1 (2026-10-26): block view for film pixel art drawn at an arbitrary scale k (a new helper, not a film copy).
// Every film pixel (x, y) written through the view fills the screen block [ox + x·k, ox + (x+1)·k) × [oy + y·k, …), so the
// film's own pixel drawing (blobs, eyes, Bayer dithering on grid coordinates) keeps its look at any zoom. Pure: the view
// only forwards px() to the canvas underneath; blits of cached sprites must be painted through it, not blitted through it.
export function blockView(g, k, ox = 0, oy = 0) {
  const v = Object.create(g);
  v.px = (x, y, col) => {
    if (!col) return;
    const X0 = Math.floor(ox + x * k), Y0 = Math.floor(oy + y * k);
    const X1 = Math.max(X0 + 1, Math.floor(ox + (x + 1) * k)), Y1 = Math.max(Y0 + 1, Math.floor(oy + (y + 1) * k));
    for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) g.px(X, Y, col);
  };
  return v;
}
