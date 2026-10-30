// Screen-space cards of «You've been pressing fake buttons» (lead's layer; all continuous: dissolves, eased drops, sweeps):
// · the hook title FAKE BUTTONS? with a red FAKE stamp on "fake";
// · NEW YORK · 2004: 3,250 dots = the city's walk buttons; 2,500 of them go grey while "2,500" is spoken; DID NOTHING stamp;
// · US LAW (US flag): DOORS STAY OPEN · FOR SLOW WALKERS; then FIREFIGHTER KEY;
// · POLL · 70 HEATING TECHNICIANS: 70 little technicians, 51 turn magenta while "51" is spoken → INSTALLED FAKE THERMOSTATS;
// · X-RAY · YOUR PHONE: no shutter (crossed-out iris), no moving parts, a speaker playing CLICK.WAV;
// · FEELING OF CONTROL bar (fills with every press) → LIGHT: NO CHANGE / YOU: FEEL BETTER ♥.
// Flags: Wikimedia Commons (NYC flag CC BY-SA 3.0 Zscout370; US flag public domain), rasterised to the grid in media/.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { EV, PRESSES } from "../timeline.mjs";
import { fade, mix, sm, ease, panel, rnd, C, MAIN, TINY, bayer } from "../cute.mjs";

const MEDIA = fileURLToPath(new URL("../media/", import.meta.url));
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
async function load(file) { const { data, info } = await sharp(MEDIA + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, d: data }; }
const NYC = await load("Flag_of_New_York_City-60.png"), USA = await load("Flag_of_the_United_States-60.png");

/** Flag tile with a dark 1-px frame and a dithered dissolve. */
function flag(c, img, x0, y0, a) {
  if (a <= 0) return;
  for (let j = -1; j <= img.h; j++) for (let i = -1; i <= img.w; i++) {
    const X = x0 + i, Y = y0 + j; if (a < 1 && a <= bayer(X, Y)) continue;
    if (i < 0 || j < 0 || i >= img.w || j >= img.h) { c.px(X, Y, "#0B0812"); continue; }
    const k = (j * img.w + i) * 4; c.px(X, Y, [img.d[k], img.d[k + 1], img.d[k + 2]]);
  }
}
function txt(c, font, s, str, x, y, col, a, { center = false, shadow = true, outline = false } = {}) {
  if (a <= 0) return 0; const g = fade(c, a), w = c.measure(font, str, { scale: s }), x0 = center ? R(x - w / 2) : R(x);
  if (outline) for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [3, 3], [2, 3], [3, 2]]) g.text(font, str, x0 + dx, y + dy, C.O, { scale: s });
  else if (shadow) for (const [dx, dy] of [[1, 1], [2, 2]]) g.text(font, str, x0 + dx, y + dy, C.O, { scale: s });
  g.text(font, str, x0, y, col, { scale: s }); return w;
}
/** A rubber stamp: a thick rounded frame + text, slammed in (scale-like pop by a shrinking offset shadow). */
function stamp(c, str, cx, cy, s, col, k, a) {
  if (a <= 0 || k <= 0) return; const g = fade(c, a * sm(k, 0, 0.25)), w = c.measure(MAIN, str, { scale: s }) + 20, h = 8 * s + 14, pop = R((1 - ease(clamp01(k / 0.35))) * 10);
  const x = R(cx - w / 2) - pop, y = R(cy - h / 2) - pop, W2 = w + 2 * pop, H2 = h + 2 * pop;
  g.rrect(x, y, W2, H2, col, 3); g.rrect(x + 3, y + 3, W2 - 6, H2 - 6, "#1A0610", 2);
  for (let j = y + 3; j < y + H2 - 3; j++) for (let i = x + 3; i < x + W2 - 3; i++) if (bayer(i, j) > 0.86) g.px(i, j, mix(col, "#1A0610", 0.6));   // worn ink
  txt(c, MAIN, s, str, cx, R(cy - 4 * s), col, a * sm(k, 0, 0.25), { center: true, shadow: false });
}
/** A pill tag with text. */
function pill(c, str, x, y, edge, fill, col, a, s = 2) { if (a <= 0) return 0; const g = fade(c, a), w = c.measure(MAIN, str, { scale: s }) + 18; g.rrect(x, y, w, 8 * s + 8, edge, 2); g.rrect(x + 1, y + 1, w - 2, 8 * s + 6, fill, 2); g.text(MAIN, str, x + 9, y + 4, col, { scale: s }); return w; }

// ---------------------------------------------------------------- timings (exported for the sound)
export const HOOK = [0.12, EV.start - 0.05];
export const NYC_TAG = [EV.newYork - 0.1, EV.y2004 + 0.1];        // a small flag tag: NEW YORK · LIGHTS ON TIMERS
export const NYC_CARD = [EV.y2004 - 0.3, EV.allEnd + 0.35];
export const LAW = [EV.us - 0.1, EV.slowlyEnd + 0.25];
export const FIRE = [EV.firefighters - 0.1, EV.keyEnd + 0.35];
export const POLL = [EV.poll - 0.1, EV.ones + 0.85];
export const PHONE = [EV.phones - 0.1, EV.soundEnd + 0.3];
export const CONTROL = [EV.pressing2 - 0.1, EV.liked - 0.2];
export const GREY = [EV.n2500 + 0.02, EV.n2500 + 1.25];         // 2,500 dots go grey while the number is spoken
export const TECH = [EV.n51 + 0.02, EV.n51 + 0.5];             // 51 technicians flip while "51" is spoken

// ---------------------------------------------------------------- the 3,250 dots: a fixed random order picks the 2,500
const COLS = 65, ROWS = 50, N = COLS * ROWS;
const ORDER = (() => { const ids = [...Array(N).keys()].sort((a, b) => rnd(a * 7 + 3) - rnd(b * 7 + 3)), rank = new Int32Array(N).fill(-1); ids.slice(0, 2500).forEach((id, r) => (rank[id] = r)); return rank; })();
const TECH_ORDER = (() => { const ids = [...Array(70).keys()].sort((a, b) => rnd(a * 13 + 5) - rnd(b * 13 + 5)), rank = new Int32Array(70).fill(-1); ids.slice(0, 51).forEach((id, r) => (rank[id] = r)); return rank; })();

function hookCard(c, t) {
  const a = win(t, ...HOOK, 0.2, 0.35); if (a <= 0) return;
  const k = clamp01((t - HOOK[0]) / 0.45), y = R(150 - (1 - back(k)) * 34 + Math.sin(t * 2.6) * 1.5);
  txt(c, MAIN, 6, "FAKE", 300, y, "#FF5468", a, { center: true, outline: true });
  txt(c, MAIN, 5, "BUTTONS?", 300, y + 58, C.IV, a, { center: true, outline: true });
  // the stamp slams on "fake"
  const sk = clamp01((t - EV.fake1 + 0.02) / 0.5); if (sk > 0) stamp(c, "100% FAKE", 300, y + 130, 3, "#FF5468", sk, a);
}

function nycTag(c, t) {
  const a = win(t, ...NYC_TAG, 0.3, 0.3); if (a <= 0) return;
  const k = clamp01((t - NYC_TAG[0]) / 0.4), x0 = 24, y0 = R(104 - (1 - back(k)) * 14), lk = sm(t, EV.computers - 0.1, EV.computers + 0.35), w = R(186 + 100 * lk), h = R(62 + 30 * lk);
  panel(c, x0, y0, w, h, a, C.Y);
  flag(c, NYC, x0 + 12, y0 + 13, a);
  txt(c, MAIN, 2, "NEW YORK", x0 + 82, y0 + 24, C.IV, a);
  if (lk > 0) { txt(c, MAIN, 2, "LIGHTS ON TIMERS", x0 + 12, y0 + 62, "#8CFF7A", a * sm(lk, 0.5, 1)); }
}
function nycCard(c, t) {
  const a = win(t, ...NYC_CARD, 0.3, 0.35); if (a <= 0) return;
  const k = clamp01((t - NYC_CARD[0]) / 0.4), y0 = R(100 - (1 - back(k)) * 16), x0 = 26, w = 488, h = 226;
  panel(c, x0, y0, w, h, a, C.Y);
  flag(c, NYC, x0 + 14, y0 + 12, a);
  txt(c, MAIN, 3, "NEW YORK", x0 + 86, y0 + 16, C.IV, a);
  const ya = a * sm(t, EV.y2004 - 0.05, EV.y2004 + 0.25); if (ya > 0) pill(c, "2004", x0 + w - 96, y0 + 14, C.Y, "#2A1A08", C.Y, ya, 3);
  // the grid of 3,250 walk buttons (2×2 dots, 3 px pitch), appears row by row on "2004"
  const gx = x0 + 16, gy = y0 + 60, ga = a * sm(t, EV.y2004, EV.y2004 + 0.5);
  if (ga > 0) {
    const g = fade(c, 1), grey = (t - GREY[0]) / (GREY[1] - GREY[0]);
    for (let r = 0; r < ROWS; r++) {
      const rowA = clamp01((t - EV.y2004 - (r / ROWS) * 0.45) / 0.12) * a; if (rowA <= 0) continue;
      for (let q = 0; q < COLS; q++) {
        const id = r * COLS + q, X = gx + q * 3, Y = gy + r * 3; if (rowA < 1 && rowA <= bayer(X, Y)) continue;
        const rk = ORDER[id], off = rk >= 0 && grey * 2500 > rk;
        const col = off ? "#4A4458" : "#65DA41";
        g.rect(X, Y, 2, 2, col); if (!off) g.px(X, Y, "#B8F6A0");
      }
    }
  }
  // the counters on the right
  const rx = gx + COLS * 3 + 18;
  const ta = a * sm(t, EV.n3250 - 0.1, EV.n3250 + 0.2); if (ta > 0) { txt(c, MAIN, 3, "3,250", rx, y0 + 64, "#65DA41", ta); txt(c, TINY, 2, "WALK BUTTONS", rx, y0 + 92, C.L, ta); }
  const ca = a * sm(t, GREY[0] - 0.05, GREY[0] + 0.15);
  if (ca > 0) { const n = R(2500 * ease(clamp01((t - GREY[0]) / (GREY[1] - GREY[0])))), s = (n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, "0")}` : String(n)) + (n >= 2500 ? "+" : "");
    txt(c, MAIN, 3, s, rx, y0 + 118, "#B8B0CC", ca); txt(c, TINY, 2, "DID NOTHING", rx, y0 + 146, "#B8B0CC", ca); }
  const sk = clamp01((t - EV.nothing + 0.02) / 0.5); if (sk > 0) stamp(c, "77% FAKE", rx + 88, y0 + 192, 2, "#FF5468", sk, a);
}

function lawCard(c, t) {
  const a = win(t, ...LAW, 0.3, 0.3); if (a <= 0) return;
  const k = clamp01((t - LAW[0]) / 0.4), y0 = R(104 - (1 - back(k)) * 14), x0 = 96, w = 348, h = 160;
  panel(c, x0, y0, w, h, a, "#7FB2FF");
  flag(c, USA, x0 + 14, y0 + 14, a);
  txt(c, MAIN, 3, "US LAW", x0 + 88, y0 + 18, C.IV, a);
  // CLOSE ◀|▶ … BLOCKED (on "can't do anything")
  { const ca = a * sm(t, EV.first - 0.1, EV.first + 0.2); if (ca > 0) { const g = fade(c, ca), bx = x0 + 16, by = y0 + 58; g.rrect(bx, by, 38, 22, "#0B0812", 3); g.rrect(bx + 1, by + 1, 36, 20, "#C8C4DC", 3);
      g.poly([[bx + 8, by + 11], [bx + 16, by + 5], [bx + 16, by + 17]], "#2A2440"); g.poly([[bx + 30, by + 11], [bx + 22, by + 5], [bx + 22, by + 17]], "#2A2440"); g.rect(bx + 18, by + 5, 2, 13, "#2A2440");
      txt(c, MAIN, 2, "CLOSE", bx + 48, by + 4, C.IV, ca);
      const ba = a * sm(t, EV.cant - 0.05, EV.cant + 0.2); if (ba > 0) txt(c, MAIN, 2, "BLOCKED", bx + 132, by + 4, "#FF8A9A", ba); } }
  const da = a * sm(t, EV.doors - 0.05, EV.doors + 0.25); if (da > 0) {
    txt(c, MAIN, 2, "DOORS STAY OPEN", x0 + 16, y0 + 94, C.Y, da);
    // a little countdown ring that fills while the doors wait
    const cx = x0 + w - 34, cy = y0 + 104, u = clamp01((t - EV.doors) / (EV.slowlyEnd - EV.doors)), g = fade(c, da);
    for (let i = 0; i < 40; i++) { const an = -Math.PI / 2 + (i / 40) * Math.PI * 2, on = i / 40 < u; g.rect(R(cx + Math.cos(an) * 14) - 1, R(cy + Math.sin(an) * 14) - 1, 2, 2, on ? C.Y : "#3B2C5C"); }
    g.rect(cx - 1, cy - 8, 2, 9, C.IV); g.rect(cx - 1, cy, 7, 2, C.IV);
  }
  const sa = a * sm(t, EV.slowly - 0.15, EV.slowly + 0.2); if (sa > 0) txt(c, MAIN, 2, "FOR SLOW WALKERS", x0 + 16, y0 + 124, "#B8D8FF", sa);
}

function fireCard(c, t) {
  const a = win(t, ...FIRE, 0.3, 0.3); if (a <= 0) return;
  const k = clamp01((t - FIRE[0]) / 0.4), y0 = R(108 - (1 - back(k)) * 14), x0 = 110, w = 320, h = 70;
  panel(c, x0, y0, w, h, a, "#FF7A4A");
  // a key icon that turns on "key"
  const g = fade(c, a), kx = x0 + 34, ky = y0 + 35, turn = sm(t, EV.key - 0.05, EV.key + 0.3);
  const L = (u, v) => [R(kx + u * Math.cos(turn * Math.PI / 2) - v * Math.sin(turn * Math.PI / 2)), R(ky + u * Math.sin(turn * Math.PI / 2) + v * Math.cos(turn * Math.PI / 2))];
  g.disc(kx, ky, 9, "#0B0812"); g.disc(kx, ky, 7, "#F4CA50"); g.disc(kx, ky, 3, "#0B0812");
  for (let u = 8; u < 26; u++) { const [X, Y] = L(u, 0); g.rect(X - 1, Y - 1, 3, 3, "#F4CA50"); }
  for (const u of [18, 23]) { const [X, Y] = L(u, 4); g.rect(X - 1, Y - 1, 3, 3, "#F4CA50"); }
  txt(c, MAIN, 2, "FIREFIGHTERS", x0 + 70, y0 + 16, C.IV, a);
  txt(c, MAIN, 2, "WITH A KEY", x0 + 70, y0 + 40, "#FFB08A", a * sm(t, EV.special - 0.1, EV.special + 0.2));
}

/** One little technician (12 × 15): hard hat, face, overalls. col = overalls; fake = magenta badge. */
function tech(c, x, y, col, hat, a) { const g = fade(c, a); g.rect(x + 3, y, 6, 3, hat); g.rect(x + 2, y + 2, 8, 2, hat); g.rect(x + 4, y + 4, 4, 3, "#F3CBAA"); g.rect(x + 2, y + 7, 8, 7, col); g.rect(x + 3, y + 14, 2, 1, "#0B0812"); g.rect(x + 7, y + 14, 2, 1, "#0B0812"); }
function pollCard(c, t) {
  const a = win(t, ...POLL, 0.3, 0.35); if (a <= 0) return;
  const k = clamp01((t - POLL[0]) / 0.4), y0 = R(100 - (1 - back(k)) * 16), x0 = 26, w = 488, h = 222;
  panel(c, x0, y0, w, h, a, "#E06AD8");
  txt(c, MAIN, 2, "POLL", x0 + 16, y0 + 14, "#F2A8EC", a);
  txt(c, MAIN, 2, "HEATING TECHNICIANS", x0 + 80, y0 + 14, C.IV, a * sm(t, EV.technicians - 0.1, EV.technicians + 0.2));
  const flip = (t - TECH[0]) / (TECH[1] - TECH[0]);
  for (let i = 0; i < 70; i++) {
    const q = i % 10, r = Math.floor(i / 10), X = x0 + 18 + q * 19, Y = y0 + 44 + r * 24, ia = a * clamp01((t - POLL[0] - 0.15 - i * 0.008) / 0.15);
    if (ia <= 0) continue; const fake = TECH_ORDER[i] >= 0 && flip * 51 > TECH_ORDER[i];
    tech(c, X, Y, fake ? "#C83C9E" : "#3C7AD0", fake ? "#FF7AE0" : "#F4CA50", ia);
    if (fake) fade(c, ia).rect(X + 10, Y + 1, 2, 2, "#FFFFFF");
  }
  const rx = x0 + 18 + 10 * 19 + 20;
  const na = a * sm(t, EV.n51 - 0.1, EV.n51 + 0.15); if (na > 0) { const n = R(51 * ease(clamp01(flip))); txt(c, MAIN, 6, String(n), rx, y0 + 52, "#FF7AE0", na); }
  const oa = a * sm(t, EV.n70 - 0.1, EV.n70 + 0.2); if (oa > 0) txt(c, MAIN, 3, "OUT OF 70", rx, y0 + 112, C.IV, oa);
  const fa = a * sm(t, EV.installed - 0.1, EV.installed + 0.25); if (fa > 0) { txt(c, MAIN, 2, "INSTALLED", rx, y0 + 150, "#F2A8EC", fa); }
  const sk = clamp01((t - EV.fake2 + 0.02) / 0.5); if (sk > 0) stamp(c, "FAKE ONES", rx + 96, y0 + 190, 2, "#FF5468", sk, a);
}

function phoneCard(c, t) {
  const a = win(t, ...PHONE, 0.3, 0.35); if (a <= 0) return;
  const k = clamp01((t - PHONE[0]) / 0.4), y0 = R(100 - (1 - back(k)) * 16), x0 = 26, w = 488, h = 222;
  panel(c, x0, y0, w, h, a, "#5AC8FF");
  txt(c, MAIN, 2, "X-RAY", x0 + 16, y0 + 14, "#5AC8FF", a); txt(c, MAIN, 2, "YOUR PHONE", x0 + 92, y0 + 14, C.IV, a);
  // the phone in X-ray: cyan outlines on dark blue, scanning line
  const g = fade(c, a), px = x0 + 26, py = y0 + 42, pw = 96, ph = 168, line = "#7FE3F0", dim = "#2F7FC0";
  g.rrect(px, py, pw, ph, line, 8); g.rrect(px + 2, py + 2, pw - 4, ph - 4, "#0A1838", 7);
  g.rrect(px + 8, py + 30, pw - 16, 64, dim, 2); g.rrect(px + 9, py + 31, pw - 18, 62, "#0E2250", 2);        // the battery
  txt(c, TINY, 1, "BATTERY", px + 30, py + 58, dim, a, { shadow: false });
  g.rrect(px + 12, py + 100, 34, 22, dim, 2); g.rrect(px + 52, py + 100, 32, 22, dim, 2);                     // chips
  // the camera module, top left: lens rings
  const lx = px + 22, ly = py + 16; g.disc(lx, ly, 9, line); g.disc(lx, ly, 7, "#0A1838"); g.disc(lx, ly, 4, dim); g.disc(lx - 1, ly - 1, 1, "#FFFFFF");
  // scanning line
  const sy = py + R(((t - PHONE[0]) * 70) % ph); g.rect(px + 3, sy, pw - 6, 1, mix(line, "#FFFFFF", 0.4));
  // no shutter: an iris icon next to the lens, crossed out on "shutter"
  const sa = a * sm(t, EV.shutter - 0.12, EV.shutter + 0.2);
  if (sa > 0) {
    const gs = fade(c, sa), ix = x0 + 188, iy = y0 + 84, rot = (t - EV.shutter) * 2;
    gs.disc(ix, iy, 22, "#0B0812"); gs.disc(ix, iy, 20, "#5A6684");
    for (let b = 0; b < 6; b++) { const an = rot + (b / 6) * Math.PI * 2, p = [[ix, iy], [R(ix + Math.cos(an) * 20), R(iy + Math.sin(an) * 20)], [R(ix + Math.cos(an + 1.0) * 20), R(iy + Math.sin(an + 1.0) * 20)]]; gs.poly(p, b % 2 ? "#8A96B4" : "#A8B4D0"); }
    gs.disc(ix, iy, 5, "#0B0812");
    const xk = sm(t, EV.shutter + 0.1, EV.shutter + 0.35); for (let i = -22; i <= 22; i++) if ((i + 22) / 44 < xk) { gs.rect(ix + i - 1, iy + i - 1, 3, 3, "#FF5468"); gs.rect(ix + i - 1, iy - i - 1, 3, 3, "#FF5468"); }
    txt(c, MAIN, 2, "NO SHUTTER", ix + 34, iy - 16, "#FF8A9A", sa);
    txt(c, TINY, 2, "NO MOVING PARTS", ix + 34, iy + 8, C.L, a * sm(t, EV.moving - 0.1, EV.moving + 0.2));
  }
  // the speaker plays CLICK.WAV on "recorded sound"
  const ra = a * sm(t, EV.recorded - 0.12, EV.recorded + 0.2);
  if (ra > 0) {
    const gr = fade(c, ra), sx = px + pw / 2, sy2 = py + ph - 14;
    gr.rrect(sx - 14, sy2 - 3, 28, 6, line, 2);
    for (let i = 1; i <= 3; i++) { const u = ((t - EV.recorded) * 1.6 + i / 3) % 1; for (let an = -0.7; an <= 0.7; an += 0.08) { const X = R(sx + 18 + u * 30 * Math.cos(an) * 1.6), Y = R(sy2 + u * 30 * Math.sin(an)); if (u < 0.95) gr.px(X, Y, mix(line, "#0A1838", u)); } }
    const tx = x0 + 160, ty = y0 + 150; pill(c, "CLICK.WAV", tx, ty, C.Y, "#2A1A08", C.Y, ra, 2);
    // a little waveform of the recorded click
    const gw = fade(c, ra); for (let i = 0; i < 120; i++) { const u = i / 120, env = Math.exp(-u * 9) * (u > 0.04 ? 1 : u / 0.04), hgt = R(env * 14 * Math.abs(Math.sin(i * 1.7) + 0.5 * Math.sin(i * 0.53))); gw.rect(tx + 140 + i, ty + 12 - hgt, 1, Math.max(1, hgt * 2), u < (t - EV.recorded) / 0.6 ? C.Y : "#5A4A28"); }
    txt(c, TINY, 2, "A RECORDED SOUND", tx, ty + 34, C.L, a * sm(t, EV.sound - 0.1, EV.sound + 0.2));
  }
}

function controlCard(c, t) {
  const a = win(t, ...CONTROL, 0.3, 0.3); if (a <= 0) return;
  const k = clamp01((t - CONTROL[0]) / 0.4), y0 = R(104 - (1 - back(k)) * 14), x0 = 56, w = 428, h = 150;
  panel(c, x0, y0, w, h, a, "#65DA41");
  txt(c, MAIN, 2, "FEELING OF CONTROL", x0 + 16, y0 + 14, C.IV, a);
  // the bar: each press adds a chunk, "good" tops it up
  const presses = PRESSES.filter((p) => p > CONTROL[0]); let fill = 0; for (const p of presses) fill += 0.24 * sm(t, p, p + 0.25);
  fill = Math.min(1, fill + 0.4 * sm(t, EV.good - 0.1, EV.good + 0.4)); const g = fade(c, a), bx = x0 + 16, by = y0 + 40, bw = w - 32, bh = 18;
  g.rrect(bx, by, bw, bh, "#0B0812", 2); g.rrect(bx + 2, by + 2, R((bw - 4) * fill), bh - 4, "#65DA41", 1);
  for (let i = bx + 2; i < bx + 2 + R((bw - 4) * fill); i += 6) g.rect(i, by + 3, 2, 2, "#B8F6A0");
  if (fill > 0.98) txt(c, MAIN, 2, "MAX", bx + bw - 44, by + 2, "#0B0812", a, { shadow: false });
  const la = a * sm(t, EV.change - 0.1, EV.change + 0.2); if (la > 0) { txt(c, MAIN, 2, "LIGHT:", x0 + 16, y0 + 76, C.L, la); txt(c, MAIN, 2, "NO CHANGE", x0 + 118, y0 + 76, "#8A84A0", la); const gx = fade(c, la), cx = x0 + 300, cy = y0 + 82; for (let i = -6; i <= 6; i++) { gx.rect(cx + i, cy + i, 2, 2, "#FF5468"); gx.rect(cx + i, cy - i, 2, 2, "#FF5468"); } }
  const ya = a * sm(t, EV.changes - 0.1, EV.changes + 0.2); if (ya > 0) { txt(c, MAIN, 2, "YOU:", x0 + 16, y0 + 106, C.L, ya); txt(c, MAIN, 2, "FEEL BETTER", x0 + 118, y0 + 106, "#FF9AD0", ya); const gh = fade(c, ya), hx = x0 + 300, hy = y0 + 112, b = 1 + 0.15 * Math.sin((t - EV.changes) * 9) * (1 - sm(t, EV.changes + 0.6, EV.changes + 1.2)); for (let j = -6; j <= 6; j++) for (let i = -8; i <= 8; i++) { const X = i / (7 * b), Y = j / (7 * b); if ((X * X + Y * Y - 0.35) ** 3 - X * X * Y * Y * Y * 1.2 < 0) gh.px(hx + i, hy - j, "#FF5A9A"); } }
}

export function hud(c, V, t) { hookCard(c, t); nycTag(c, t); nycCard(c, t); lawCard(c, t); fireCard(c, t); pollCard(c, t); phoneCard(c, t); controlCard(c, t); }
