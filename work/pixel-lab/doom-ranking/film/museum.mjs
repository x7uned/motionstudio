// The museum stand (static layer): a dark gallery wall with pilasters and a dado rail, a ceiling light track with one
// spot per pedestal, ten plinths with brass name plaques, and a polished floor with soft reflections. Built once into two
// full-width layers — lights off / all spots on — and composited per frame column by column with a dithered spot level
// (so a spotlight comes on as a dissolve, never in one frame).
import { Canvas, hex, bayer, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { PED, ORDER, WORLD_W, TOP, FLOOR } from "./timeline.mjs";

const H = 960, W = WORLD_W, R = Math.round;
export const NAMES = { info: "THE GAME", pc: "NORMAL PC", mower: "ROBOT MOWER", bulb: "SMART BULB", pdf: "PDF FILE", test: "PREGNANCY TEST", mc: "MINECRAFT", bact: "BACTERIA", ts: "TYPESCRIPT", q: "NEXT ?" };
export const PLAQUE_Y = 572;

let BG = null;
export function buildBG() {
  if (BG) return BG;
  const c = new Canvas(W, H, "#000000"), d = c.d;
  const wallTop = hex("#130F26"), wallLow = hex("#1C1734"), ceil = hex("#08060F"), lowWall = hex("#17122C"), floorA = hex("#120E20"), floorB = hex("#0A0814");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col;
    if (y < 64) col = ceil;
    else if (y < 470) { const k = (y - 64) / 406; col = [wallTop[0] + (wallLow[0] - wallTop[0]) * k, wallTop[1] + (wallLow[1] - wallTop[1]) * k, wallTop[2] + (wallLow[2] - wallTop[2]) * k]; }
    else if (y < FLOOR) col = lowWall;
    else { const k = (y - FLOOR) / (H - FLOOR); col = k + 0.15 * bayer(x, y) > 0.55 ? floorB : floorA; }
    const i = (y * W + x) * 3; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  // ceiling track, wall panels, pilasters, dado rail, baseboard, floor seams
  c.rect(0, 50, W, 6, "#262038"); c.rect(0, 50, W, 1, "#3A3254"); c.rect(0, 56, W, 2, "#05040A");
  for (let i = 0; i < ORDER.length; i++) {
    const cx = PED[ORDER[i]];
    for (const px of [cx - 150]) { c.rect(px - 9, 64, 18, FLOOR - 64, "#221C3C"); c.rect(px - 9, 64, 2, FLOOR - 64, "#30294E"); c.rect(px + 7, 64, 2, FLOOR - 64, "#120E22"); c.rect(px - 12, 64, 24, 8, "#2A2446"); c.rect(px - 12, FLOOR - 30, 24, 30, "#1A1530"); }
    c.rframe(cx - 128, 96, 256, 356, "#211B3A", 2); c.rframe(cx - 127, 97, 254, 354, "#100C1E", 2);   // recessed wall panel
    c.rframe(cx - 128, 490, 256, 228, "#1D1834", 2);
  }
  c.rect(0, 466, W, 6, "#2A2346"); c.rect(0, 466, W, 1, "#3C3460"); c.rect(0, 472, W, 2, "#0C0A18");
  c.rect(0, FLOOR - 20, W, 20, "#0D0A18"); c.rect(0, FLOOR - 20, W, 1, "#2A2446");
  for (let y = FLOOR + 8, k = 0; y < H; k++, y += 10 + k * 7) c.rect(0, y, W, 1, "#1A1530");
  // plinths with plaques
  for (const k of ORDER) {
    const cx = PED[k];
    c.rect(cx - 100, TOP + 14, 200, FLOOR - TOP - 14, "#2A2544"); c.rect(cx - 100, TOP + 14, 8, FLOOR - TOP - 14, "#38315A"); c.rect(cx + 92, TOP + 14, 8, FLOOR - TOP - 14, "#1E1A36");
    c.rect(cx - 100, TOP + 14, 200, 3, "#120E20");
    c.rect(cx - 104, FLOOR - 14, 208, 14, "#221D3C"); c.rect(cx - 104, FLOOR - 14, 208, 1, "#3A3358");
    c.rect(cx - 110, TOP, 220, 14, "#4A4268"); c.rect(cx - 110, TOP, 220, 2, "#6E6396"); c.rect(cx - 110, TOP + 12, 220, 2, "#2E2848");
    const txt = NAMES[k], tw = c.measure(TINY, txt, { scale: 2 }), pw = tw + 20, px = R(cx - pw / 2);
    c.rrect(px, PLAQUE_Y, pw, 26, "#5A4012", 2); c.rrect(px + 1, PLAQUE_Y + 1, pw - 2, 24, "#B8873A", 2); c.rect(px + 2, PLAQUE_Y + 2, pw - 4, 2, "#E2B460");
    c.px(px + 4, PLAQUE_Y + 13, "#5A4012"); c.px(px + pw - 5, PLAQUE_Y + 13, "#5A4012");
    c.text(TINY, txt, px + 10, PLAQUE_Y + 9, "#E8C07A", { scale: 2 }); c.text(TINY, txt, px + 10, PLAQUE_Y + 8, "#2A1A06", { scale: 2 });
    // spot fixture on the track
    c.rect(cx - 3, 56, 6, 6, "#2A2438"); c.rrect(cx - 10, 62, 20, 12, "#3A3352", 2); c.rect(cx - 10, 62, 20, 1, "#544A74"); c.rect(cx - 7, 73, 14, 2, "#1A1628");
  }
  // floor reflection of the plinths (squashed, dim)
  for (let y = FLOOR; y < FLOOR + 110; y++) { const sy = FLOOR - 1 - Math.floor((y - FLOOR) * 1.8); if (sy < TOP) break; const k = 0.28 * (1 - (y - FLOOR) / 110);
    for (let x = 0; x < W; x++) { const s = (sy * W + x) * 3, o = (y * W + x) * 3; if (k > bayer(x, y) * 0.6) { d[o] = d[o] * 0.6 + d[s] * 0.4; d[o + 1] = d[o + 1] * 0.6 + d[s + 1] * 0.4; d[o + 2] = d[o + 2] * 0.6 + d[s + 2] * 0.4; } } }
  const d0 = d.slice(), d1 = d.slice();
  // lit layer: beam, wall pool, plinth, floor pool — warm, quantised in dithered steps
  for (const k of ORDER) {
    const cx = PED[k];
    for (let y = 60; y < H; y++) for (let x = Math.max(0, cx - 170); x < Math.min(W, cx + 170); x++) {
      let I = 0; const dx = x - cx;
      if (y > 74 && y < TOP) { const hw = 16 + ((y - 74) / (TOP - 74)) * 116, q = Math.abs(dx) / hw; if (q < 1) I += 0.2 * (1 - q * q); }
      if (y < FLOOR) { const p = 1 - (dx / 160) ** 2 - ((y - 390) / 330) ** 2; if (p > 0) I += 0.6 * p; }
      else { const p = 1 - (dx / 175) ** 2 - ((y - FLOOR - 26) / 44) ** 2; if (p > 0) I += 0.7 * p; }
      if (y >= TOP && y < TOP + 14 && Math.abs(dx) < 110) I += 0.25;
      I = Math.min(0.85, I); const q = Math.floor(I * 5 + bayer(x, y)) / 5; if (q <= 0) continue;
      const o = (y * W + x) * 3;
      for (let ch = 0; ch < 3; ch++) { const b = d0[o + ch], lit = Math.min(255, b * 2.2 + [40, 28, 8][ch]); d1[o + ch] = b + (lit - b) * q; }
    }
    // lens on / off
    for (let x = cx - 6; x < cx + 6; x++) for (let y = 72; y < 76; y++) { const o = (y * W + x) * 3; d1[o] = 255; d1[o + 1] = 240; d1[o + 2] = 190; d0[o] = 40; d0[o + 1] = 34; d0[o + 2] = 52; }
  }
  BG = { d0, d1 };
  return BG;
}

/** Copy the stand into canvas c (any width) with world x ox at canvas x 0; light(k) → 0..1 for pedestal k. */
export function drawBG(c, ox, light) {
  const { d0, d1 } = buildBG(), d = c.d, cw = c.w, L = ORDER.map(light);
  for (let x = 0; x < cw; x++) {
    const wx = Math.max(0, Math.min(W - 1, Math.round(x + ox)));
    let best = 0, bd = 1e9; for (let i = 0; i < ORDER.length; i++) { const dd = Math.abs(PED[ORDER[i]] - wx); if (dd < bd) { bd = dd; best = i; } }
    const l = bd < 175 ? L[best] : 0;
    for (let y = 0; y < H; y++) { const s = (y * W + wx) * 3, o = (y * cw + x) * 3, src = l > 0 && l > bayer(wx, y) ? d1 : d0; d[o] = src[s]; d[o + 1] = src[s + 1]; d[o + 2] = src[s + 2]; }
  }
}
