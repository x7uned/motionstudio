// catalog-v1 copy (2026-10-26) of work/pixel-lab/ping/film/world.mjs drawRoomShell (+ wrect, rnd); changes: the room is drawn
// through a scaled sub-transform of the catalog wall layer; the poster and shelf positions are parameters (st.poster,
// st.shelf) and the poster uses the floor-1 colours; the side walls are not drawn (the wall runs past the frame); the
// plank floor continues to the bottom edge (catalog addition: staggered plank rows in darkened film plank colours); above the ceiling
// slab a dark ceiling fill. drawComputerDesk composes the room with the empty desk set of lib/ping-desk.mjs.
import { mix, bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { layer } from "../../engine/layout.mjs";
import { drawDesk } from "./ping-desk.mjs";

const GW = 540, GH = 960, R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Fast clipped fill of the world rect [x0,x1)×[y0,y1) (world units). col may be a function (sx, sy) → colour. */
export function wrect(c, g, x0, y0, x1, y1, col) {
  let a = R(g.X(x0)), b = R(g.Y(y0)), e = R(g.X(x1)), f = R(g.Y(y1));
  if (e <= 0 || f <= 0 || a >= GW || b >= GH) return;
  a = Math.max(0, a); b = Math.max(0, b); e = Math.min(GW, e); f = Math.min(GH, f);
  if (typeof col === "function") { for (let y = b; y < f; y++) for (let x = a; x < e; x++) { const cc = col(x, y); if (cc) c.px(x, y, cc); } return; }
  for (let y = b; y < f; y++) for (let x = a; x < e; x++) c.px(x, y, col);
}

export function drawRoomShell(c, g, room, t, st = {}) {
  const { x0, x1, y0, y1 } = room, led = room.led, led2 = room.led2;
  // back wall: dark, lit by the monitor (cool) from the desk and by the LED strip under the ceiling
  const mx = room.chairX + 95, my = y1 - 40;
  wrect(c, g, x0, y0, x1, y1, (sx, sy) => {
    const [wx, wy] = g.inv(sx + 0.5, sy + 0.5);
    const dm = Math.hypot((wx - mx) / 70, (wy - my) / 45), mon = clamp01(1 - dm) * (st.screenGlow ?? 1), top = clamp01(1 - (wy - y0) / 26);
    let base = (Math.floor((wx - x0) / 10) % 2 ? "#1A1328" : "#1C152C");
    let col = base;
    if (top > bayer(sx, sy) * 1.3) col = mix(base, led, 0.35 * top);
    if (mon > 0.04) { const q = Math.pow(mon, 1.4) * 4, lo = Math.floor(q), k = (q - lo > bayer(sx, sy) ? lo + 1 : lo) / 4; col = mix(col, st.screenColor ?? "#5E8EC8", 0.3 * k); }
    return col;
  });
  // LED strip under the ceiling
  wrect(c, g, x0 + 2, y0 + 2, x1 - 2, y0 + 4, (sx) => mix(led, led2, 0.5 + 0.5 * Math.sin((sx * 0.08) / Math.max(0.5, g.z) + t * 1.6)));
  // floor: wooden planks
  wrect(c, g, x0, y1 - 4, x1, y1, (sx, sy) => { const [wx] = g.inv(sx + 0.5, sy); return Math.floor(wx / 16) % 2 ? "#4A2E26" : "#55362C"; });
  wrect(c, g, x0, y1 - 4, x1, y1 - 3, "#6E4A3A");
  // poster (game-themed shapes only, no text): a stylised soldier silhouette on a sand-orange sunset
  const [px0, py0] = st.poster ?? [room.chairX - 70, y0 + 18];
  if (px0 > x0 + 4) {
    wrect(c, g, px0 - 1, py0 - 1, px0 + 31, py0 + 41, "#0B0812");
    wrect(c, g, px0, py0, px0 + 30, py0 + 40, (sx, sy) => { const [, wy] = g.inv(sx, sy + 0.5), v = (wy - py0) / 40; return v < 0.55 ? "#C8784A" : "#E0A85A"; });
    wrect(c, g, px0 + 12, py0 + 12, px0 + 18, py0 + 18, "#120C1D"); wrect(c, g, px0 + 10, py0 + 18, px0 + 20, py0 + 32, "#120C1D"); wrect(c, g, px0 + 18, py0 + 21, px0 + 28, py0 + 23, "#120C1D"); wrect(c, g, px0 + 10, py0 + 32, px0 + 13, py0 + 40, "#120C1D"); wrect(c, g, px0 + 17, py0 + 32, px0 + 20, py0 + 40, "#120C1D");
  }
  // shelf on the right wall with small objects
  const [shx, shy] = st.shelf ?? [x1 - 52, y0 + 30];
  wrect(c, g, shx, shy, shx + 44, shy + 3, "#5A3E34"); wrect(c, g, shx, shy + 3, shx + 44, shy + 4, "#2A1A18");
  wrect(c, g, shx + 4, shy - 9, shx + 9, shy, "#B08AE8"); wrect(c, g, shx + 5, shy - 12, shx + 8, shy - 9, "#E0CDF8");                 // figurine
  wrect(c, g, shx + 14, shy - 12, shx + 18, shy, "#3B2C5C"); wrect(c, g, shx + 18, shy - 10, shx + 22, shy, "#6E4FB0"); wrect(c, g, shx + 22, shy - 11, shx + 25, shy, "#8A3A3A"); // books
  // ceiling slab (catalog: no side walls, the wall runs past the frame; a dark ceiling fill above the slab)
  wrect(c, g, x0 - 3, y0 - 3, x1 + 3, y0, "#4A3C6A"); wrect(c, g, x0 - 3, y0 - 400, x1 + 3, y0 - 3, (sx, sy) => (sy % 6 === 0 && bayer(sx, sy) < 0.5 ? "#1A1428" : "#120D1E"));
  return { monitorWall: [mx, my] };
}

// ---------------------------------------------------------------- catalog composition
const WALL_P = 0.85, S = 1.8, OX = 312, OY = 560;           // room units → wall-layer px: ×1.8, chair at x 312, floor line y 560
const ROOM = { x0: -260, x1: 240, y0: -304, y1: 0, chairX: 0, floor: 1, led: "#8D59DA", led2: "#5FD3F0" };
const POSTER = [-128, -232], SHELF = [44, -146];
function sub(L) {
  return { z: L.z * S, X: (wx) => L.X(OX + wx * S), Y: (wy) => L.Y(OY + wy * S), inv: (sx, sy) => [(L.wx(sx) - OX) / S, (L.wy(sy) - OY) / S] };
}
/** The film's floor strip continued to the bottom edge: staggered plank rows in the film's two plank colours, dark seams. */
function floor(c, g) {
  const y0 = Math.max(0, R(g.Y(0))), WX = new Float64Array(GW), PL = [hex("#2E1C1C"), hex("#36221F")], SEAM = hex("#1C1214"), DK = hex("#261818");
  for (let X = 0; X < GW; X++) WX[X] = g.inv(X + 0.5, 0)[0];
  for (let Y = y0; Y < GH; Y++) {
    const wy = g.inv(0, Y + 0.5)[1], row = Math.floor(wy / 10), fy = wy - row * 10, seamY = fy < 0.7, off = (rnd(row * 7 + 3) * 60) | 0;
    for (let X = 0; X < GW; X++) {
      const wx = WX[X] + off, pl = Math.floor(wx / 60), fx = wx - pl * 60;
      let col = seamY || fx < 0.7 ? SEAM : PL[rnd(row * 131 + pl * 17) > 0.5 ? 0 : 1];
      if (!seamY && fy > 8.8 && bayer(X, Y) < 0.5) col = DK;
      const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2];
    }
  }
}
export function drawComputerDesk(c, cam, t) {
  const L = layer(cam, WALL_P), g = sub(L);
  floor(c, g);
  drawRoomShell(c, g, ROOM, t, { poster: POSTER, shelf: SHELF });
  drawDesk(c, g.X(0), g.Y(0), S * L.z, { t, screen: { kind: "desktop", k: 1 } });
}
