// Lab-coat version of the channel character: edits the outro sprite (row 6, col 2, 100×124) pixel by pixel.
// White tee → open white lab coat: lapels + dark V opening, purple inner shirt, breast pocket with pens,
// rolled cuffs, centre opening with buttons below the crossed arms. The chain is removed (lapel lines replace it).
import sharp from "sharp";
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
export const SW = 100, SH = 124;

export async function coatSprite(opts = {}) {
  const { data } = await sharp(SHEET).extract({ left: 2 * 192 + 46, top: 6 * 208 + 4, width: SW, height: SH }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const src = Buffer.from(data), out = Buffer.from(data);
  const at = (b, x, y) => { const i = (y * SW + x) * 4; return [b[i], b[i + 1], b[i + 2], b[i + 3]]; };
  const put = (x, y, c) => { if (x < 0 || y < 0 || x >= SW || y >= SH) return; const i = (y * SW + x) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; out[i + 3] = 255; };
  const kind = (b, x, y) => {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return "none";
    const [r, g, bl, a] = at(b, x, y); if (a < 128) return "none";
    const L = (r + g + bl) / 3, sat = Math.max(r, g, bl) - Math.min(r, g, bl);
    if (L < 60) return "line";
    if (r > g + 25) return "skin";
    if (sat < 50) return L > 238 ? "white" : "shade";
    return "other";
  };
  const cloth = (x, y) => { const k = kind(src, x, y); return k === "white" || k === "shade"; };

  const WHITE = [250, 250, 252], SOFT = [226, 226, 238], MID = [176, 170, 196], DEEP = [118, 108, 142], INK = [40, 22, 52];
  const SHIRT = [[104, 66, 168], [78, 46, 136], [56, 30, 104], [36, 18, 70]];

  // 1) wipe the chain/pendant: greyish pixels on the chest between the collar and the arms become white
  for (let y = 81; y <= 98; y++) for (let x = 43; x <= 64; x++) if (kind(src, x, y) === "shade") put(x, y, WHITE);

  // 2) open V: left line (45,83)->(53,97), right line (62,83)->(54,97)
  const lx = (y) => 45 + (y - 83) * (8 / 14), rx = (y) => 62 - (y - 83) * (8 / 14);
  for (let y = 82; y <= 99; y++) for (let x = 40; x <= 67; x++) {
    if (!cloth(x, y) && kind(src, x, y) !== "white") continue;
    const L = lx(y), R = rx(y);
    if (x > L + 0.5 && x < R - 0.5) { // inner shirt, darker near the collar and the edges
      const edge = Math.min(x - L, R - x), top = y - 82;
      put(x, y, SHIRT[top < 2 ? 3 : edge < 1.6 ? 2 : (x + y) % 7 === 0 ? 0 : 1]);
    } else if (Math.abs(x - L) <= 0.5 || Math.abs(x - R) <= 0.5) put(x, y, INK);
    else {
      const d = x < L ? L - x : x - R; // lapel band outside the opening
      if (y <= 96 && d <= 3.2) put(x, y, d <= 1.2 ? SOFT : WHITE);
      if (y <= 95 && d > 3.2 && d <= 4.2) put(x, y, DEEP);
    }
  }
  // collar: stand-up points beside the neck
  for (const [x, y, c] of [[43, 81, MID], [44, 82, SOFT], [42, 82, MID], [64, 81, MID], [63, 82, SOFT], [65, 82, MID]]) if (kind(src, x, y) !== "skin") put(x, y, c);

  // 3) breast pocket (viewer's left) with two pens
  for (let x = 34; x <= 42; x++) { put(x, 89, DEEP); put(x, 90, SOFT); }
  for (let y = 90; y <= 96; y++) { put(34, y, MID); put(42, y, MID); }
  const BLUE = [[86, 150, 255], [46, 96, 214], [24, 52, 140]], RED = [[255, 120, 96], [222, 64, 60], [140, 30, 40]];
  for (let y = 84; y <= 88; y++) { put(37, y, y === 84 ? BLUE[2] : BLUE[1]); put(38, y, y === 84 ? BLUE[2] : BLUE[0]); }
  for (let y = 85; y <= 88; y++) { put(40, y, y === 85 ? RED[2] : RED[1]); put(41, y, y === 85 ? RED[2] : RED[0]); }
  put(38, 85, [210, 214, 226]); put(41, 86, [210, 214, 226]); // clips

  // 4) rolled cuffs: cloth within 2 px of a forearm (skin) on each upper sleeve gets a folded band
  const nearSkin = (x, y, r) => { for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (kind(src, x + a, y + b) === "skin") return Math.hypot(a, b); return 99; };
  for (const [x0, x1, y0, y1] of [[30, 47, 98, 112], [74, 86, 90, 109]]) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!cloth(x, y)) continue; const d = nearSkin(x, y, 4);
    if (d <= 2.2) put(x, y, WHITE); else if (d <= 3.2) put(x, y, DEEP); else if (d <= 4.2) put(x, y, SOFT);
  }

  // 5) centre opening below the arms with buttons on the left panel
  for (let y = 111; y < SH; y++) {
    const L = 52 - (y - 111) * 0.18, R = 57 + (y - 111) * 0.18;
    for (let x = 46; x <= 64; x++) {
      if (!cloth(x, y)) continue;
      if (x > L + 0.5 && x < R - 0.5) put(x, y, SHIRT[Math.min(x - L, R - x) < 1.6 ? 2 : 1]);
      else if (Math.abs(x - L) <= 0.5 || Math.abs(x - R) <= 0.5) put(x, y, INK);
      else if (x === Math.round(R) + 1 || x === Math.round(L) - 1) put(x, y, SOFT);
    }
  }
  for (const by of [115, 120]) { put(49, by, DEEP); put(49, by - 1, MID); }

  // 6) safety goggles pushed up on the hair, tilted like the head (slope of the sunglasses)
  if (opts.goggles !== false) {
    const ang = Math.atan2(-9, 20), ca = Math.cos(ang), sa = Math.sin(ang), O = [45, 26];
    const FRAME = [44, 30, 62], STRAP = [70, 52, 104], STRAP_HI = [104, 82, 148];
    const GLASS = [[214, 252, 255], [120, 226, 240], [56, 178, 206], [30, 112, 150]];
    for (let y = 0; y < 60; y++) for (let x = 0; x < SW; x++) {
      const dx = x - O[0], dy = y - O[1], u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const hair = kind(src, x, y) !== "none";
      const vb = v - 0.006 * u * u; // the strap bends round the head
      if (hair && Math.abs(u) > 12 && u > -21 && u < 34 && Math.abs(vb) <= 2.2) put(x, y, Math.abs(vb) > 1.5 ? FRAME : vb < 0 ? STRAP_HI : STRAP);
      for (const uc of [-7.6, 7.6]) {
        const du = Math.abs(u - uc), r = Math.hypot(Math.max(0, du - 2.6), Math.max(0, Math.abs(v) - 1.4));
        if (r <= 4.4) put(x, y, r > 3.2 ? FRAME : r > 2.6 ? [92, 72, 128] : v < -1.2 && u < uc ? GLASS[0] : v < 0.2 ? GLASS[1] : v < 2 ? GLASS[2] : GLASS[3]);
      }
      if (Math.abs(u) <= 1.2 && Math.abs(v + 0.5) <= 1.0) put(x, y, FRAME); // bridge
    }
  }
  return out;
}

if (process.argv[2] === "preview") {
  const buf = await coatSprite();
  await sharp(buf, { raw: { width: SW, height: SH, channels: 4 } }).resize(SW * 8, SH * 8, { kernel: "nearest" }).flatten({ background: "#20203a" }).png().toFile(process.argv[3]);
}
