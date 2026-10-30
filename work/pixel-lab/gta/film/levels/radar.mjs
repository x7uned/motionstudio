// GTA-style radar minimap (screen space, top left): a top-down schematic of the same street — the road, building blocks
// on the far side, palms on the front side — with the player's arrow and the game camera's view cone. Blocks are lit
// where the main picture is DRAWN (drawnAt) and dark wireframe where it is NOT, so the radar repeats the idea from above.
// On "a whole state" it zooms out to a whole (made-up) peninsula with the tiny cone, then back. Continuous: dissolves,
// eased zoom, the arrow turns with camDir (through "facing the viewer" = south).
import { EV, camDir, drawnAt, HERO_X, CULL_ON } from "../timeline.mjs";
import { fade, mix, sm, bayer, rnd, TINY } from "../cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const SHOW = [EV.camera - 0.2, EV.liked - 0.45];
const X = 14, Y = 100, S = 112, CX = X + S / 2, CY = Y + S / 2;
// street blocks (world x ranges) for the schematic: far side = buildings, front side = palms/benches
const BLOCKS = []; { let x = -40; let i = 0; while (x < 1120) { const w = 50 + Math.floor(rnd(i * 7 + 1) * 60); BLOCKS.push([x, x + w, 0.5 + rnd(i * 3) * 0.5]); x += w + 10 + Math.floor(rnd(i * 5) * 14); i++; } }
const PAL = ["#F48AB4", "#7EE0C0", "#B89AF0", "#FFD68A", "#8AC8FF"];
const ZOOM = [EV.whole - 0.15, EV.state + 0.55, EV.so2 + 0.05];   // out, hold, back

function map(c, a, t, z) {
  // z: 1 = street scale (1 radar px = 10 world px), 0 = state scale
  const g = fade(c, a), sc = 0.1 * z + 0.004 * (1 - z), wx = (sx) => HERO_X + (sx - CX) / sc;
  // road (horizontal through the centre), far-side blocks, front-side palms
  if (z > 0.02) {
    const zz = fade(c, a * z);
    zz.rect(X + 2, CY - 4, S - 4, 7, "#3A3E52"); for (let x = X + 4; x < X + S - 4; x += 6) zz.rect(x, CY - 1, 3, 1, "#C8C8D8");
    BLOCKS.forEach(([x0, x1, h], i) => {
      const sx0 = R(CX + (x0 - HERO_X) * sc), sx1 = R(CX + (x1 - HERO_X) * sc), d = drawnAt((x0 + x1) / 2, t), hh = R(10 + h * 16);
      for (let sx = Math.max(X + 2, sx0); sx < Math.min(X + S - 2, sx1); sx++) for (let sy = CY - 7 - hh; sy < CY - 7; sy++) {
        const edge = sx === sx0 || sx === sx1 - 1 || sy === CY - 7 - hh || sy === CY - 8;
        zz.px(sx, sy, d > bayer(sx, sy) ? (edge ? mix(PAL[i % 5], "#0B0812", 0.35) : PAL[i % 5]) : edge ? "#3AA8E8" : "#101A3A");
      }
      const px = R((sx0 + sx1) / 2); if (px > X + 4 && px < X + S - 4) { const dd = drawnAt((x0 + x1) / 2 + 20, t); zz.px(px, CY + 9, dd > 0.5 ? "#4ACA6A" : "#3AA8E8"); zz.px(px - 1, CY + 10, dd > 0.5 ? "#2E8A4A" : "#1A4A7A"); zz.px(px + 1, CY + 10, dd > 0.5 ? "#2E8A4A" : "#1A4A7A"); }
    });
    zz.rect(X + 2, CY + 14, S - 4, S / 2 - 16, "#E8D8A8"); zz.rect(X + 2, CY + 28, S - 4, S / 2 - 30, "#3A8AC8");   // beach + sea
  }
  if (z < 0.98) {
    // the whole (made-up) state: a peninsula with keys, lakes and the tiny cone near its south-east coast
    const st = fade(c, a * (1 - z));
    st.rect(X + 2, Y + 2, S - 4, S - 4, "#2A6AA8");
    for (let sy = Y + 6; sy < Y + S - 4; sy++) { const u = (sy - Y) / S, half = 30 - u * 18 + Math.sin(u * 9) * 3, cx0 = CX - 8 + u * 14; for (let sx = R(cx0 - half); sx <= R(cx0 + half); sx++) if (sx > X + 2 && sx < X + S - 2) st.px(sx, sy, u < 0.15 ? "#5AAA5A" : (sx + sy) % 9 === 0 ? "#4A9A4A" : "#6ABA5A"); }
    for (let i = 0; i < 7; i++) st.px(R(CX + 18 + i * 3), R(Y + S - 16 + i), "#6ABA5A");
    st.disc(R(CX - 6), R(Y + 58), 4, "#3A8AC8");
    st.text(TINY, "LEONIDA", X + 30, Y + 8, "#FDFEED", { scale: 1 });
  }
}

export function hud(c, V, t) {
  const a = Math.min(sm(t, SHOW[0], SHOW[0] + 0.35), 1 - sm(t, SHOW[1], SHOW[1] + 0.3)); if (a <= 0) return;
  const g = fade(c, a);
  // frame: dark rounded square with a thin light rim, like the game's radar
  g.rrect(X - 3, Y - 3, S + 6, S + 6, "#0B0812", 4); g.rrect(X - 1, Y - 1, S + 2, S + 2, "#5A6488", 3); g.rrect(X, Y, S, S, "#0A1020", 3);
  const z = 1 - sm(t, ZOOM[0], ZOOM[0] + 0.45) + sm(t, ZOOM[1], ZOOM[2]);
  map(c, a, t, clamp01(z));
  // the view cone + the player arrow (scaled down when zoomed out)
  const d = camDir(t), ang = Math.acos(Math.max(-1, Math.min(1, d))), half = 0.62, on = sm(t, CULL_ON[0], CULL_ON[1]);
  const len = (14 + 46 * clamp01(z)) * (0.6 + 0.4 * on), cz = fade(c, a * 0.5);
  const cx = clamp01(z) > 0.5 ? CX : R(CX + 12), cy = clamp01(z) > 0.5 ? CY + 4 : R(Y + S - 22);
  for (let sy = R(cy - len); sy <= R(cy + len); sy++) for (let sx = R(cx - len); sx <= R(cx + len); sx++) {
    const dx = sx - cx, dy = sy - cy, r = Math.hypot(dx, dy); if (r > len || r < 2 || sx < X + 1 || sx > X + S - 2 || sy < Y + 1 || sy > Y + S - 2) continue;
    let da = Math.atan2(dy, dx) - ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) < half && (1 - r / len) * 0.9 + 0.1 > bayer(sx, sy)) cz.px(sx, sy, "#FFF6D0");
  }
  const P = (u, v) => [R(cx + u * Math.cos(ang) - v * Math.sin(ang)), R(cy + u * Math.sin(ang) + v * Math.cos(ang))];
  g.poly([P(6, 0), P(-4, -4), P(-2, 0), P(-4, 4)], "#0B0812"); g.poly([P(5, 0), P(-3, -3), P(-1, 0), P(-3, 3)], "#FDFEED");
  g.text(TINY, "N", X + S / 2 - 2, Y + 2, "#B8C0E0", { scale: 1 });
}
