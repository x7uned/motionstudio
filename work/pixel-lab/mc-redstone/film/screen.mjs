// «Computers inside Minecraft» — what the lamp screen of the big computer shows (one lamp = one pixel, on or off).
// A little blocky landscape (the kind of picture the famous builds draw): hills of blocks, a tree, a square sun and
// drifting clouds; plus text frames for the story beats. Every motion repeats a whole number of times over the film.
import { SCREEN_W, SCREEN_H } from "./world.mjs";
import { hash } from "./noise.mjs";

// a 3×5 digit/letter font for the screen
const F35 = {
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"], "2": ["111", "001", "111", "100", "111"], "+": ["000", "010", "111", "010", "000"],
  "=": ["000", "111", "000", "111", "000"], "H": ["101", "101", "111", "101", "101"], "I": ["111", "010", "010", "010", "111"], " ": ["000", "000", "000", "000", "000"],
};
function textBits(str, scale = 2) {
  const w = str.length * 4 * scale - scale, h = 5 * scale, bits = new Uint8Array(w * h);
  [...str].forEach((ch, i) => { const g = F35[ch] || F35[" "]; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (g[y][x] === "1") for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) bits[(y * scale + b) * w + i * 4 * scale + x * scale + a] = 1; });
  return { w, h, bits };
}
const SUM = textBits("1+1=10", 4);

/** the landscape at screen pixel (u, v) — u ∈ [0, W), v ∈ [0, H) from the top. cloud drift d (screen px). */
function landscape(u, v, d) {
  const W = SCREEN_W, H = SCREEN_H;
  // ground: blocky hills (columns 4 px wide), grass line on top, dirt below with a dither of "stone"
  const col = Math.floor(u / 4), hgt = 9 + Math.round(4 * Math.sin(col * 0.55) + 3 * Math.sin(col * 0.21 + 1)) + (hash(col, 1, 7) < 0.25 ? 1 : 0);
  const gy = H - hgt * 1.5;
  if (v >= gy) { const depth = v - gy; if (depth < 2) return 1; return (u + v) % 3 === 0 && depth > 4 ? 1 : 0; }
  // a tree on the hill at u ≈ 30
  { const tx = 30, ty = H - (9 + Math.round(4 * Math.sin(Math.floor(tx / 4) * 0.55) + 3 * Math.sin(Math.floor(tx / 4) * 0.21 + 1))) * 1.5; if (u >= tx && u < tx + 2 && v >= ty - 8 && v < ty) return 1; if (Math.abs(u - tx - 1) <= 4 && v >= ty - 15 && v < ty - 7) return (u + v) % 2 === 0 || Math.abs(u - tx - 1) < 3 ? 1 : 0; }
  // the square sun (outline + dither)
  { const sx = 88, sy = 7, s = 8; if (u >= sx && u < sx + s && v >= sy && v < sy + s) return u === sx || u === sx + s - 1 || v === sy || v === sy + s - 1 || (u + v) % 2 === 0 ? 1 : 0; }
  // clouds: flat blocks drifting right, wrapping
  { const cu = ((u - d) % W + W) % W; for (const [cx, cy, cw] of [[10, 6, 16], [52, 10, 22], [80, 22, 12]]) if (cu >= cx && cu < cx + cw && v >= cy && v < cy + 3) return v === cy + 2 && (cu + v) % 2 ? 0 : 1; }
  return 0;
}
/** lamp state 0/1 at (u, v); mode blends handled by the caller */
export function screenBit(u, v, t, mode, LOOP) {
  if (mode === "sum") { const x0 = Math.floor((SCREEN_W - SUM.w) / 2), y0 = Math.floor((SCREEN_H - SUM.h) / 2), x = u - x0, y = v - y0; return x >= 0 && y >= 0 && x < SUM.w && y < SUM.h ? SUM.bits[y * SUM.w + x] : 0; }
  const cyc = Math.max(1, Math.round(LOOP / 25)), d = (t / LOOP) * cyc * SCREEN_W;       // clouds cross the screen a whole number of times
  return landscape(u, v, d);
}
