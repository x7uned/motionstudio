// The exhibits on the stand (our own drawings, no brands or game graphics). Each draw(c, X, t) gets X = screen x of its
// pedestal centre in the world canvas; the pedestal top is y = TOP (540). Every screen shows corridor.mjs's picture.
// info: the 1993 floppy and the code stream · pc: CRT + tower · mower: robot mower on a lawn patch · bulb: cut-away smart
// bulb + added screen · pdf: a page on an easel, the corridor in characters at 12 fps · test: the pregnancy-test shell
// opening like a clam, SHELL ONLY · mc: a block computer with a redstone-lamp screen drawn row by row · bact: a petri
// dish of 48×32 glowing dots (COMPUTER MODEL), 70 MIN clock, 600 YEARS calendar · ts: a wall of code with rule gears,
// a tear-off calendar to DAY 12, then the first frame out of the text · q: the empty 8th pedestal with a glowing «?».
import { Canvas, hex, bayer, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { fade, mix, sm, ease, win, rnd, panel, C } from "./cute.mjs";
import { corridor, drawCorridor, cellLum, phase } from "./corridor.mjs";
import { EV, TOP } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), O = "#0B0812";
export const MAINX = { ...MAIN, glyphs: { ...MAIN.glyphs, "~": [".....", ".....", ".#...", "#.#.#", "...#.", ".....", "....."] } };
/** Tag panel with MAINX (has «~»), centred at cx; lines[0] in col, the rest ivory. */
let NEAR = 1;
export const setNear = (v) => { NEAR = v; };
export function tagX(c, lines, cx, y, a, col = C.Y, scale = 2) {
  a *= NEAR; if (a <= 0) return; const tw = (s) => c.measure(MAINX, s, { scale }), w = Math.max(...lines.map(tw)) + 20, h = lines.length * (8 * scale + 4) + 10, x = R(cx - w / 2), yy = R(y + (1 - a) * 6);
  panel(c, x, yy, w, h, a, col); lines.forEach((l, i) => fade(c, a).text(MAINX, l, x + 10, yy + 7 + i * (8 * scale + 4), i ? C.IV : col, { scale }));
}
const label = (c, txt, x, y, a, col = C.IV) => { a *= NEAR; if (a <= 0) return; const g = fade(c, a), w = c.measure(TINY, txt, { scale: 2 }); g.rrect(x - 4, y - 3, w + 8, 16, O, 2); g.text(TINY, txt, x, y, col, { scale: 2 }); };
const bezel = (c, x, y, w, h, a = 1) => { const g = fade(c, a); g.rrect(x - 4, y - 4, w + 8, h + 8, "#16141C", 2); g.rect(x - 1, y - 1, w + 2, h + 2, "#050407"); };

// ---------------------------------------------------------------- info: the floppy (1993) and the code stream
export function info(c, X, t) {
  const rise = sm(t, EV.doom2 - 0.25, EV.doom2 + 0.55), bob = Math.sin(t * 2.2) * 2 * rise, x = R(X - 48), y = R(TOP - 108 - rise * 46 + bob);
  if (rise > 0) c.tint(x - 18, y - 18, 132, 136, (i, j) => rise * 0.35 * Math.max(0, 1 - Math.hypot((i - x - 48) / 66, (j - y - 50) / 68)), "#7FE3F0", 4);
  if (rise < 1) { const g = fade(c, 1 - rise); g.rect(X - 30, TOP - 6, 60, 6, "#3A3352"); }                   // the little stand it lifts off
  c.rrect(x, y, 96, 100, O, 3); c.rrect(x + 1, y + 1, 94, 98, "#2C3A5C", 3); c.rect(x + 2, y + 2, 2, 96, "#3E5078"); c.rect(x + 92, y + 3, 2, 95, "#1C2640");
  c.poly([[x, y + 1], [x + 7, y + 1], [x, y + 8]], O);                                                             // corner notch
  c.rect(x + 26, y + 2, 46, 34, "#8E96A6"); c.rect(x + 26, y + 2, 46, 2, "#C8CED8"); c.rect(x + 58, y + 8, 9, 22, "#2A3048"); c.rect(x + 26, y + 34, 46, 2, "#5A6274");
  c.rect(x + 8, y + 86, 6, 7, "#151C30");                                                                          // write-protect hole
  c.rect(x + 11, y + 44, 74, 50, "#F2EEE4"); c.rect(x + 11, y + 44, 74, 2, "#FFFFFF"); for (let k = 0; k < 2; k++) c.rect(x + 15, y + 78 + k * 7, 66, 1, "#C8C2B4");
  c.text(MAIN, "DOOM", x + 25, y + 51, "#A8201C", { scale: 2 });
  const yk = sm(t, EV.y1993 - 0.1, EV.y1993 + 0.25) * (1 - sm(t, EV.code1, EV.code1 + 0.4));
  c.text(TINY, "1993", x + 33, y + 68, yk > 0 ? mix("#2A2436", "#E0443C", yk) : "#2A2436", { scale: 2 });
  tagX(c, ["FREE CODE"], X, 252, sm(t, EV.free - 0.1, EV.free + 0.25), C.GR);
  tagX(c, ["SMALL"], X, 290, sm(t, EV.small - 0.1, EV.small + 0.25), C.CY);
  // the code stream: 0/1 bits pour out of the shutter and run off along the stand on "people put it on everything"
  for (let i = 0; i < 46; i++) {
    const ts = EV.people - 0.2 + i * 0.034, k = (t - ts) / 1.6; if (k <= 0 || k >= 1) continue;
    const e = ease(k), px = R(x + 48 + e * (760 + rnd(i) * 140)), py = R(y + 18 - Math.sin(e * Math.PI) * (50 + 60 * rnd(i + 9)) + (rnd(i + 4) - 0.5) * 50 * e);
    const a = Math.min(sm(k, 0, 0.08), 1 - sm(k, 0.8, 1)), g = fade(c, a), ch = rnd(i + 3) < 0.5 ? "0" : "1";
    g.text(TINY, ch, px + 1, py + 1, O, { scale: 2 }); g.text(TINY, ch, px, py, i % 3 ? C.GR : "#C8FFB0", { scale: 2 });
  }
}

// ---------------------------------------------------------------- pc: beige CRT, tower, keyboard; the corridor at full speed
export function pc(c, X, t) {
  const mx = X - 30;
  c.rrect(mx - 22, TOP - 14, 104, 14, O, 2); c.rrect(mx - 21, TOP - 13, 102, 12, "#B8AE92", 2);                     // base
  c.rect(mx + 14, TOP - 34, 30, 22, O); c.rect(mx + 15, TOP - 34, 28, 21, "#A89E84");                               // neck
  c.rrect(mx - 72, TOP - 186, 174, 154, O, 4); c.rrect(mx - 71, TOP - 185, 172, 152, "#CFC6AA", 4); c.rect(mx - 69, TOP - 183, 168, 3, "#E6DEC4"); c.rect(mx - 69, TOP - 40, 168, 6, "#A89E84");
  c.rect(mx - 62, TOP - 176, 154, 120, "#2A2A30"); c.rect(mx - 60, TOP - 174, 150, 116, "#1A1A20");
  drawCorridor(c, mx - 57, TOP - 171, 144, 108, phase(t), { scan: true });
  for (let i = 0; i < 6; i++) c.rect(mx - 50 + i * 10, TOP - 49, 6, 2, "#A89E84");                                  // vents
  c.rect(mx + 84, TOP - 50, 4, 3, "#65DA41");                                                                       // power LED
  // tower
  c.rrect(X + 70, TOP - 160, 36, 160, O, 2); c.rrect(X + 71, TOP - 159, 34, 158, "#C8BFA4", 2); c.rect(X + 72, TOP - 158, 2, 156, "#E2DAC0");
  for (let i = 0; i < 2; i++) { c.rect(X + 76, TOP - 148 + i * 16, 26, 10, "#A89E84"); c.rect(X + 78, TOP - 144 + i * 16, 22, 2, "#3A362E"); }
  c.rect(X + 76, TOP - 112, 26, 6, "#A89E84"); c.rect(X + 80, TOP - 110, 18, 1, "#2A2620");                         // floppy slot
  c.disc(X + 89, TOP - 30, 4, "#8A8270"); c.px(X + 89, TOP - 44, mix("#6A2020", "#E0443C", 0.5 + 0.5 * Math.sin(t * 6)));  // drive light, smooth blink
  // keyboard in front
  c.rrect(mx - 60, TOP - 12, 120, 12, O, 2); c.rrect(mx - 59, TOP - 11, 118, 10, "#BDB398", 2);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 14; i++) c.rect(mx - 55 + i * 8, TOP - 9 + j * 4, 6, 2, "#E2DAC0");
  tagX(c, ["35 FPS"], X - 10, 252, sm(t, EV.f35 - 0.1, EV.f35 + 0.25), C.CY);
}

// ---------------------------------------------------------------- mower: robot mower driving on its lawn patch
export function mower(c, X, t) {
  // lawn on the plinth, scrolling under the mower (it drives forward on the spot, like a treadmill)
  const scroll = Math.floor(t * 54);
  for (let x = X - 108; x < X + 108; x++) { const wx = x + scroll, h = 8 + R(rnd(wx * 7) * 7), sway = Math.sin(t * 2.4 + wx * 0.3) > 0.6 ? 1 : 0; c.rect(x, TOP - h, 1, h, (wx & 1) ? "#3E8A2A" : "#4E9E34"); c.px(x + sway, TOP - h - 1, "#7AC84A"); }
  c.rect(X - 108, TOP - 4, 216, 4, "#2E6A20");
  const mx = R(X + 3 * Math.sin(t * 1.7)), by = TOP - 20, bob = Math.sin(t * 9) > 0.7 ? 1 : 0;
  // grass clippings thrown out behind
  for (let i = 0; i < 10; i++) { const k = ((t * 1.6 + i * 0.1) % 1), px = R(mx - 80 - k * 46), py = R(by - 2 - Math.sin(k * Math.PI) * 26 - rnd(i) * 8); fade(c, 1 - k).rect(px, py, 2, 1, i % 2 ? "#7AC84A" : "#9AE05A"); }
  const wheel = (cx, cy, r) => { c.disc(cx, cy, r, O); c.disc(cx, cy, r - 2, "#2A2A30"); c.disc(cx, cy, r - 7, "#5A5A66"); const a = (t * 54) / r; for (let k = 0; k < 4; k++) { const an = a + (k * Math.PI) / 2; c.line(cx, cy, R(cx + Math.cos(an) * (r - 3)), R(cy + Math.sin(an) * (r - 3)), "#1A1A20"); } c.disc(cx, cy, 3, "#8A8A96"); };
  wheel(mx - 64, TOP - 22, 22); wheel(mx + 72, TOP - 14, 14);
  // shell
  const shell = []; for (let i = 0; i <= 28; i++) { const a = Math.PI * (i / 28); shell.push([mx - 112 * Math.cos(a), by - bob - 104 * Math.pow(Math.sin(a), 0.8) * (1 - 0.1 * i / 28)]); }
  c.poly(shell, O); const inner = shell.map(([x, y]) => [x + (x < mx ? 2 : -2), y + 2]); c.poly(inner, "#3C4450");
  c.poly(inner.filter((p, i) => i > 16).concat([[mx + 6, by - 2]]), "#323A46");
  for (let i = 0; i < 12; i++) c.rect(R(mx - 80 + i * 3), R(by - 86 - i * 1.2 - bob), 2, 1, "#5E6878");
  c.rect(mx - 110, by - 8 - bob, 220, 7, "#9AD43A"); c.rect(mx - 110, by - 8 - bob, 220, 1, "#C8F07A"); c.rect(mx - 110, by - 2 - bob, 220, 1, "#5A8A20");
  // the screen + dial on top
  const sx = mx - 50, sy = by - 84 - bob;
  bezel(c, sx, sy, 76, 50); drawCorridor(c, sx, sy, 76, 50, phase(t));
  const hl = win(t, EV.own - 0.1, EV.screen1 + 0.6, 0.2, 0.4); if (hl > 0) fade(c, hl).rframe(sx - 8, sy - 8, 92, 66, C.Y, 2);
  c.disc(mx + 62, sy + 22, 12, O); c.disc(mx + 62, sy + 22, 10, "#5A6272"); c.disc(mx + 62, sy + 22, 6, "#48505E"); { const an = t * 1.6; c.line(mx + 62, sy + 22, R(mx + 62 + Math.cos(an) * 8), R(sy + 22 + Math.sin(an) * 8), C.Y); }
  // tag + the update progress
  tagX(c, ["OFFICIAL UPDATE · 2024"], X, 252, sm(t, EV.official - 0.1, EV.official + 0.25), C.GR);
  const ua = win(t, EV.official + 0.05, EV.screen1 + 0.2, 0.25, 0.4) * NEAR;
  if (ua > 0) { const g = fade(c, ua), p = sm(t, EV.official + 0.2, EV.update + 0.55); panel(c, X - 70, 300, 140, 30, ua, C.p7); g.rect(X - 60, 310, 104, 10, "#0B0812"); g.rect(X - 59, 311, R(102 * p), 8, C.GR);
    const ok = sm(t, EV.update + 0.5, EV.update + 0.8); if (ok > 0) fade(c, ua * ok).text(MAIN, "✓", X + 50, 309, C.GR, { scale: 2 }); }
}

// ---------------------------------------------------------------- bulb: cut-away smart bulb, chip inside, added screen
export function bulb(c, X, t) {
  const bx = X - 34, cy = TOP - 128;
  c.rrect(bx - 26, TOP - 30, 52, 30, O, 2); c.rrect(bx - 25, TOP - 29, 50, 28, "#3A3550", 2); c.rect(bx - 23, TOP - 27, 46, 2, "#544C74");   // socket
  for (let i = 0; i < 5; i++) { c.rect(bx - 20, TOP - 64 + i * 7, 40, 6, i % 2 ? "#9AA2B0" : "#C8CED8"); c.rect(bx - 20, TOP - 64 + i * 7, 40, 1, "#E8ECF2"); }   // screw base
  c.rect(bx - 22, TOP - 66, 44, 3, O);
  // glass globe: warm glow inside, faint glass, cut line
  const glow = 0.55 + 0.1 * Math.sin(t * 3.1);
  c.tint(bx - 66, cy - 66, 132, 132, (i, j) => { const d = Math.hypot(i - bx, j - cy); return d < 62 ? glow * (0.5 - d / 140) + 0.12 : 0; }, "#FFE9A0", 5);
  c.ering(bx, cy, 63, 63, O); c.ering(bx, cy, 62, 62, "#BFE8FF", Math.PI * 0.9, Math.PI * 1.75); c.ering(bx, cy, 62, 62, "#6A8AA8", Math.PI * 1.75, Math.PI * 2.9);
  c.rect(bx - 24, TOP - 70, 48, 6, "#BFE8FF"); c.rect(bx - 24, TOP - 70, 48, 1, O);
  for (let k = 0; k < 4; k++) { c.px(bx - 40 + k * 2, cy - 42 + k, "#FFFFFF"); c.px(bx - 44 + k, cy - 36 + k * 2, "#E8F6FF"); }   // glass glint
  // the chip board inside
  const cx0 = bx - 17, cy0 = cy - 6; c.rect(cx0, cy0, 34, 22, O); c.rect(cx0 + 1, cy0 + 1, 32, 20, "#2E7A3A"); c.rect(cx0 + 1, cy0 + 1, 32, 1, "#4EA05A");
  c.rect(cx0 + 10, cy0 + 5, 14, 12, "#141418"); for (let i = 0; i < 4; i++) { c.px(cx0 + 12 + i * 3, cy0 + 4, "#C8CED8"); c.px(cx0 + 12 + i * 3, cy0 + 17, "#C8CED8"); }
  c.line(cx0 + 3, cy0 + 3, cx0 + 3, cy0 - 18, "#C8963C"); c.line(cx0 + 3, cy0 - 18, cx0 + 8, cy0 - 22, "#C8963C");     // antenna trace
  c.line(bx - 6, cy0 + 22, bx - 6, TOP - 70, "#7A7A86"); c.line(bx + 6, cy0 + 22, bx + 6, TOP - 70, "#7A7A86");
  const ch = win(t, EV.chip1 - 0.1, EV.f30 - 0.2, 0.2, 0.3);
  if (ch > 0) { fade(c, ch).rframe(cx0 - 3, cy0 - 3, 40, 28, C.Y, 1); fade(c, ch).line(cx0 - 3, cy0 + 4, cx0 - 26, cy0 - 22, C.Y); label(c, "CHIP", cx0 - 54, cy0 - 34, ch, C.Y); }
  // the added screen on a small bracket, wired to the base
  const sx = X + 50, sy = TOP - 150;
  c.line(bx + 22, TOP - 40, sx + 6, TOP - 40, "#E0443C"); c.line(sx + 6, TOP - 40, sx + 6, sy + 46, "#E0443C"); c.line(bx + 22, TOP - 36, sx + 12, TOP - 36, "#3A3A46"); c.line(sx + 12, TOP - 36, sx + 12, sy + 46, "#3A3A46");
  c.rect(sx + 14, sy + 44, 6, TOP - sy - 44, "#3A3550"); c.rect(sx - 2, TOP - 6, 38, 6, "#3A3550");
  bezel(c, sx - 6, sy, 46, 36); drawCorridor(c, sx - 6, sy, 46, 36, phase(t));
  const sa = win(t, EV.added - 0.1, EV.screen2 + 0.9, 0.2, 0.4);
  if (sa > 0) { fade(c, sa).rframe(sx - 13, sy - 7, 60, 50, C.CY, 2); label(c, "+ SCREEN", sx - 12, sy - 26, sa, C.CY); }
  tagX(c, ["~30 FPS"], X, 252, sm(t, EV.f30 - 0.1, EV.f30 + 0.25), C.Y);
}

// ---------------------------------------------------------------- pdf: a page on an easel; the corridor in characters at 12 fps
const GL = [["###", "#.#", "###", "#.#", "###"], ["#.#", ".#.", "#.#", ".#.", "#.#"], ["...", "###", "...", "###", "..."], ["...", ".#.", "###", ".#.", "..."], ["...", "...", ".#.", "...", "..."], null];
export function pdf(c, X, t) {
  c.line(X - 52, TOP, X - 24, TOP - 250, "#5A3A1E"); c.line(X - 51, TOP, X - 23, TOP - 250, "#8A5A30"); c.line(X + 52, TOP, X + 24, TOP - 250, "#5A3A1E"); c.line(X + 51, TOP, X + 23, TOP - 250, "#8A5A30");
  c.line(X, TOP - 240, X + 4, TOP, "#4A2E16"); c.rect(X - 70, TOP - 22, 140, 5, "#6A4426"); c.rect(X - 70, TOP - 22, 140, 1, "#9A6A3E");
  const x = X - 86, y = TOP - 250, w = 172, h = 226;
  c.rect(x + 4, y + 4, w, h, "#07060E");
  c.rect(x, y, w, h, O); c.rect(x + 1, y + 1, w - 2, h - 2, "#F2EEE4"); c.poly([[x + w - 18, y + 1], [x + w - 1, y + 18], [x + w - 18, y + 18]], "#C8C2B4"); c.poly([[x + w - 17, y], [x + w, y], [x + w, y + 17]], "#1C1834");
  c.rect(x + 10, y + 10, 44, 20, "#D8443C"); c.text(MAIN, "PDF", x + 15, y + 13, "#FFFFFF", { scale: 2 });
  for (let k = 0; k < 2; k++) c.rect(x + 62, y + 13 + k * 8, 70 - k * 24, 3, "#B8B2A6");
  // ASCII corridor: 38×24 cells of 4×6 px, redrawn 12 times a second
  const cols = 38, rows = 24, ax = x + 10, ay = y + 40, ph = phase(t, 12);
  c.rect(ax - 2, ay - 2, cols * 4 + 3, rows * 6 + 3, "#ECE6D8");
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const l = cellLum(i / cols, j / rows, 1 / cols, 1 / rows, ph), lv = Math.max(0, Math.min(5, Math.floor((l * 1.9 - 0.04) * 5 + 0.5))), g = GL[lv]; if (!g) continue;
    for (let b = 0; b < 5; b++) for (let a = 0; a < 3; a++) if (g[b][a] === "#") c.px(ax + i * 4 + a, ay + j * 6 + b, "#1A1626");
  }
  for (let k = 0; k < 3; k++) c.rect(x + 12, y + 192 + k * 9, [140, 120, 86][k], 3, "#B8B2A6");
  tagX(c, ["~12 FPS"], X, 252, sm(t, EV.f12 - 0.1, EV.f12 + 0.25), C.OR);
}

// ---------------------------------------------------------------- test: the shell opens; new chip + new screen inside
export function test(c, X, t) {
  // velvet cushion
  c.rrect(X - 124, TOP - 32, 248, 32, O, 6); c.rrect(X - 123, TOP - 31, 246, 30, "#5A2A4A", 6); c.rect(X - 118, TOP - 29, 236, 3, "#7A3E66");
  const x0 = X - 122, x1 = X + 112, H2 = 30, yb = TOP - 34, yl = yb - H2;     // tray: yl..yb; lid closed: yl-H2..yl
  const op = ease(clamp01((t - (EV.plastic - 0.35)) / 0.95)), th = 0.5 * op; // the lid hinges at its right end and swings up
  // the new board inside (stands up into the lid space): green PCB, the new chip, the new LCD
  c.rect(x0 + 46, yl - H2 + 4, x1 - x0 - 58, H2 + 2, O); c.rect(x0 + 47, yl - H2 + 5, x1 - x0 - 60, H2, "#2E7A3A"); c.rect(x0 + 47, yl - H2 + 5, x1 - x0 - 60, 1, "#4EA05A");
  const scx = X - 50, scy = yl - H2 + 7; c.rect(scx - 2, scy - 2, 60, 28, "#141418"); drawCorridor(c, scx, scy, 56, 24, phase(t), { mono: ["#1E3A24", "#A8E8A0"] });
  const chx = X + 44, chy = yl - H2 + 9; c.rect(chx, chy, 26, 20, "#141418"); for (let i = 0; i < 6; i++) { c.px(chx + 2 + i * 4, chy - 1, "#C8CED8"); c.px(chx + 2 + i * 4, chy + 20, "#C8CED8"); }
  for (let i = 0; i < 6; i++) c.line(scx + 58, scy + 4 + i * 3, chx - 1, chy + 3 + i * 3, "#C8963C");
  // tray + absorbent end with its cap (left)
  c.rrect(x0, yl, x1 - x0, H2, O, 6); c.rrect(x0 + 1, yl + 1, x1 - x0 - 2, H2 - 2, "#DAD6E4", 5); c.rect(x0 + 6, yb - 5, x1 - x0 - 12, 2, "#B4AEC4"); c.rect(x0 + 6, yl + 2, x1 - x0 - 12, 1, "#F4F2FA");
  c.rrect(x0 - 4, yl - H2 - 2, 54, 2 * H2 + 4, O, 8); c.rrect(x0 - 3, yl - H2 - 1, 52, 2 * H2 + 2, "#B08AE8", 8); c.rect(x0 + 2, yl - H2 + 2, 40, 2, "#D4B8F8"); c.rect(x0 + 44, yl - H2 + 2, 2, 2 * H2 - 4, "#7A58B8");
  // the lid (per pixel: inverse-rotate into lid space; the window is a hole that shows the LCD while closed)
  const px0 = x1 - 4, py0 = yl, L = x1 - (x0 + 50), d = c.d, cs = Math.cos(th), sn = Math.sin(th), lit = hex("#ECEAF2"), top = hex("#FFFFFF"), low = hex("#C4C0D2"), ol = hex(O);
  const wx0 = scx - (x0 + 50) - 3, wx1 = wx0 + 62, wy0 = 5, wy1 = H2 - 3;
  for (let yy = py0 - H2 - 110; yy < py0 + 2; yy++) for (let xx = x0 + 40; xx < x1 + 2; xx++) { if (xx < 0 || xx >= c.w || yy < 0 || yy >= c.h) continue;
    const rx = xx - px0, ry = yy - py0, lx = rx * cs + ry * sn + L, ly = -rx * sn + ry * cs + H2;        // lid space: x 0..L (hinge at L), y 0..H2 (0 = top)
    if (lx < 0 || lx > L + 3 || ly < 0 || ly > H2) continue;
    const corner = (lx < 5 && (ly < 5 - lx || ly > H2 - 5 + lx)), edge = lx < 1.2 || ly < 1.2 || ly > H2 - 1.2 || (lx < 6 && (ly < 6.2 - lx || ly > H2 - 6.2 + lx));
    if (corner) continue; const inWin = lx > wx0 && lx < wx1 && ly > wy0 && ly < wy1, winEdge = inWin && (lx < wx0 + 1.5 || lx > wx1 - 1.5 || ly < wy0 + 1.5 || ly > wy1 - 1.5);
    if (inWin && !winEdge) continue;
    const col = edge || winEdge ? ol : ly < 3.5 ? top : ly > H2 - 5 ? low : lit, k = (yy * c.w + xx) * 3; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; }
  // labels (below, over the cushion) and the stamp
  const na = sm(t, EV.chip2 - 0.1, EV.chip2 + 0.25), sa = sm(t, EV.screen3 - 0.1, EV.screen3 + 0.25);
  if (na > 0) { fade(c, na * NEAR).line(chx + 13, chy + 21, chx + 13, yb + 8, C.Y); label(c, "NEW CHIP", chx - 18, yb + 10, na, C.Y); }
  if (sa > 0) { fade(c, sa * NEAR).line(scx + 28, scy + 25, scx + 28, yb + 8, C.CY); label(c, "NEW SCREEN", scx - 20, yb + 10, sa, C.CY); }
  const st = clamp01((t - (EV.shell - 0.12)) / 0.3);
  if (st > 0 && NEAR > 0) { const a = sm(st, 0, 0.6) * NEAR, dy = R((1 - ease(st)) * -14), g = fade(c, a), txt = "SHELL ONLY", tw = c.measure(MAIN, txt, { scale: 3 }), sx = R(X - tw / 2), sy = 304 + dy;
    g.rrect(sx - 12, sy - 9, tw + 24, 39, "#E0443C", 3); g.rrect(sx - 9, sy - 6, tw + 18, 33, "#1A0C14", 2); g.rframe(sx - 7, sy - 4, tw + 14, 29, "#E0443C", 2);
    g.text(MAIN, txt, sx, sy + 1, "#E0443C", { scale: 3, colorAt: (xx, yy) => (bayer(xx * 3, yy * 2) > 0.9 ? null : "#F05A50") }); }
}

// ---------------------------------------------------------------- mc: a block computer with a redstone-lamp screen
const hx = (h) => hex(h);
const LOFF = [hx("#5A3C22"), hx("#704C2C"), hx("#3A2416"), hx("#4A3020")], LON = [hx("#C88A3A"), hx("#E8B058"), hx("#FFE8A8"), hx("#FFF6D8")];
const STONE = [hx("#6A6A72"), hx("#7C7C84"), hx("#8E8E96"), hx("#5A5A62"), hx("#4A4A52")];
const LS = 6, lampTex = (set, u, v, s) => (u === 0 || v === 0 || u === LS - 1 || v === LS - 1 ? set[0] : u === 2 || v === 2 ? set[1] : rnd(s * 64 + v * 8 + u) < 0.3 ? set[3] : set[2]);
const LW = 29, LH = 18;
const MC_A = { clear: [EV.minecraft - 0.25, EV.minecraft + 0.45], build: [EV.redstone - 0.2, EV.server + 0.2] };
function lampsOn(phs) { const out = new Uint8Array(LW * LH); for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) out[j * LW + i] = cellLum(i / LW, j / LH, 1 / LW, 1 / LH, phs) > 0.2 + 0.08 * (rnd(i * 31 + j) - 0.5) ? 1 : 0; return out; }
const FRAME_OLD = lampsOn(phase(0.7)), FRAME_NEW = lampsOn(phase(0));
export function mc(c, X, t) {
  const x0 = X - 104, y0 = TOP - 240, d = c.d;
  // stone blocks (16 px) around and under the screen
  for (let by = 0; by < 15; by++) for (let bx = 0; bx < 13; bx++) {
    const inScreen = by >= 1 && by < 8 && bx >= 1 && bx < 12; if (inScreen) continue;
    for (let v = 0; v < 16; v++) for (let u = 0; u < 16; u++) { const X2 = x0 + bx * 16 + u, Y2 = y0 + by * 16 + v; if (X2 < 0 || X2 >= c.w || Y2 < 0 || Y2 >= c.h) continue;
      const col = u === 0 || v === 0 ? STONE[2] : u === 15 || v === 15 ? STONE[4] : STONE[Math.floor(rnd((bx * 16 + u) * 977 + (by * 16 + v) * 131 + 7) * 3.2) % 4], k = (Y2 * c.w + X2) * 3; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; }
  }
  c.frame(x0 - 1, y0 - 1, 210, 242, O);
  // redstone dust lines on the lower blocks, with pulses running along them while the frame is drawn
  const pulse = sm(t, MC_A.build[0], MC_A.build[0] + 0.3) * (1 - sm(t, MC_A.build[1], MC_A.build[1] + 0.4));
  for (let r = 0; r < 4; r++) { const yy = y0 + 136 + r * 24 + 8; c.rect(x0 + 8, yy, 192, 2, "#5A0C0C");
    for (let k = 0; k < 4; k++) { const p = ((t * 0.9 + k * 0.25 + r * 0.13) % 1), px = R(x0 + 8 + p * 186); if (pulse > bayer(px, yy)) { c.rect(px, yy - 1, 8, 4, "#FF3A2A"); c.rect(px + 2, yy, 4, 2, "#FFB0A0"); } }
    c.rect(x0 + 40 + r * 30, yy - 3, 10, 7, "#8A8A92"); c.rect(x0 + 42 + r * 30, yy - 5, 2, 3, "#D82A1A"); }
  // the lamp screen: 22×14 lamps of 8 px. Old frame clears, the new frame is built row by row.
  const sx = x0 + 17, sy = y0 + 18;
  for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
    const s = j * LW + i, rClear = MC_A.clear[0] + ((MC_A.clear[1] - MC_A.clear[0]) * j) / LH, rBuild = MC_A.build[0] + ((MC_A.build[1] - MC_A.build[0] - 0.3) * (j + i / LW)) / LH;
    const kOld = FRAME_OLD[s] * (1 - clamp01((t - rClear) / 0.25)), kNew = FRAME_NEW[s] * clamp01((t - rBuild) / 0.25), k = Math.max(kOld, kNew);
    for (let v = 0; v < LS; v++) for (let u = 0; u < LS; u++) { const X2 = sx + i * LS + u, Y2 = sy + j * LS + v; if (X2 < 0 || X2 >= c.w) continue;
      const col = lampTex(k > 0 && k > bayer(X2, Y2) ? LON : LOFF, u, v, s), q = (Y2 * c.w + X2) * 3; d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; }
  }
  // the row being drawn: a thin redstone cursor at the right edge of the screen
  const bk = (t - MC_A.build[0]) / (MC_A.build[1] - MC_A.build[0] - 0.3);
  if (bk > 0 && bk < 1.05) { const a = Math.min(sm(bk, 0, 0.05), 1 - sm(bk, 1, 1.05)), ry = R(sy + clamp01(bk) * LH * LS); fade(c, a).rect(sx + LW * LS + 1, ry - 4, 6, 8, "#FF3A2A"); fade(c, a).rect(sx - 7, ry - 4, 6, 8, "#FF3A2A"); }
  tagX(c, ["23 S / FRAME"], X, 252, sm(t, EV.s23 - 0.1, EV.s23 + 0.25), "#F0584C");
  const ba = sm(t, EV.sped - 0.1, EV.sped + 0.25); if (ba > 0) tagX(c, [">> SPED-UP SERVER"], X, TOP - 86, ba, C.CY);
}

// ---------------------------------------------------------------- bact: petri dish of glowing dots (a computer model)
const DW = 48, DH = 32, GLOWR = [hx("#3A3418"), hx("#2E5A22"), hx("#4E9A2E"), hx("#7AD040"), hx("#C8FF80")];
const DISH = (() => { const old = new Float32Array(DW * DH), nw = new Float32Array(DW * DH); for (let j = 0; j < DH; j++) for (let i = 0; i < DW; i++) { old[j * DW + i] = cellLum(i / DW, j / DH, 1 / DW, 1 / DH, phase(0.6)); nw[j * DW + i] = cellLum(i / DW, j / DH, 1 / DW, 1 / DH, phase(0)); } return { old, nw }; })();
export function bact(c, X, t) {
  const cx = X, cy = TOP - 132, d = c.d;
  c.rect(cx - 26, TOP - 34, 52, 34, O); c.rect(cx - 25, TOP - 33, 50, 32, "#3A3550"); c.rect(cx - 36, TOP - 6, 72, 6, "#3A3550"); c.rect(cx - 25, TOP - 33, 50, 2, "#544C74");   // holder
  c.disc(cx, cy, 98, O); c.disc(cx, cy, 96, "#6AB0C0"); c.disc(cx, cy, 93, "#1C2830"); c.disc(cx, cy, 90, "#2A2414");
  c.ering(cx, cy, 95, 95, "#C8F0FF", Math.PI * 1.05, Math.PI * 1.45);
  const fadeOld = 1 - sm(t, EV.glowing - 0.75, EV.glowing - 0.2), x0 = cx - 72, y0 = cy - 48;
  for (let j = 0; j < DH; j++) for (let i = 0; i < DW; i++) {
    const s = j * DW + i, t0 = EV.glowing - 0.3 + Math.pow(rnd(s * 13 + 5), 1.3) * (EV.frame2 - EV.glowing + 0.4), kNew = clamp01((t - t0) / 0.9);
    const lv = Math.max(DISH.old[s] * fadeOld * 0.85, DISH.nw[s] * kNew), q = lv * 1.8 * 4;
    for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) { const X2 = x0 + i * 3 + a, Y2 = y0 + j * 3 + b; if (X2 < 0 || X2 >= c.w) continue; const lo = Math.floor(q), idx = Math.min(4, q - lo > bayer(X2, Y2) ? lo + 1 : lo), col = GLOWR[idx], k = (Y2 * c.w + X2) * 3; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; }
  }
  // 70 MIN clock (time-lapse hand) and the 600 YEARS calendar
  const ka = sm(t, EV.m70 - 0.15, EV.m70 + 0.25) * NEAR;
  if (ka > 0) { const g = fade(c, ka), kx = X - 150, ky = cy - 40; panel(c, kx - 40, ky - 40, 80, 118, ka, C.GR); g.disc(kx, ky, 27, O); g.disc(kx, ky, 25, "#F2EEE4");
    for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; g.px(R(kx + Math.cos(an) * 21), R(ky + Math.sin(an) * 21), O); }
    const an = (t - EV.m70) * 5 - Math.PI / 2; g.line(kx, ky, R(kx + Math.cos(an) * 19), R(ky + Math.sin(an) * 19), "#E0443C"); g.line(kx, ky, R(kx + Math.cos(an / 12) * 12), R(ky + Math.sin(an / 12) * 12), O); g.disc(kx, ky, 2, O);
    g.text(TINY, "70 MIN", kx - 23, ky + 38, C.IV, { scale: 2 }); g.text(TINY, "/ FRAME", kx - 27, ky + 54, C.GR, { scale: 2 }); }
  const ya = sm(t, EV.six - 0.15, EV.six + 0.25) * NEAR;
  if (ya > 0) { const g = fade(c, ya), kx = X + 150, ky = cy - 80; panel(c, kx - 42, ky, 84, 110, ya, C.Y); g.rect(kx - 32, ky + 10, 64, 84, "#F2EEE4"); g.rect(kx - 32, ky + 10, 64, 16, "#D8443C"); g.text(TINY, "GAME", kx - 15, ky + 15, "#FFFFFF", { scale: 2 });
    for (let i = 0; i < 4; i++) g.rect(kx - 26 + i * 16, ky + 6, 4, 8, "#3A3550");
    g.text(MAIN, "600", kx - 26, ky + 36, O, { scale: 3 }); g.text(TINY, "YEARS", kx - 19, ky + 72, "#A8201C", { scale: 2 }); }
  tagX(c, ["COMPUTER MODEL"], X, 252, sm(t, EV.model - 0.1, EV.model + 0.25), C.GR);
}

// ---------------------------------------------------------------- ts: the wall of code, the rule gears, DAY 1 → 12, the first frame
const TOK = ["#B08AE8", "#7FE3F0", "#FDFEED", "#959595", "#F4CA50", "#65DA41"].map(hx);
function gear(c, cx, cy, r, teeth, an, col, a) {
  const g = fade(c, a), pts = []; for (let i = 0; i < teeth * 2; i++) { const q = an + (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r - 5; pts.push([cx + Math.cos(q) * rr, cy + Math.sin(q) * rr]); pts.push([cx + Math.cos(q + Math.PI / teeth) * rr, cy + Math.sin(q + Math.PI / teeth) * rr]); }
  g.poly(pts.map(([x, y]) => [x, y]), O); g.poly(pts.map(([x, y]) => [cx + (x - cx) * 0.9, cy + (y - cy) * 0.9]), col); g.disc(cx, cy, Math.max(2, R(r * 0.3)), O); g.disc(cx, cy, Math.max(1, R(r * 0.3) - 2), mix(col, "#FFFFFF", 0.3));
}
export const TS_T = { flip: [EV.its - 0.05, EV.days2 - 0.05], emerge: [EV.twelve3 + 0.2, EV.days2End + 0.35] };
export function ts(c, X, t) {
  const x0 = X - 106, y0 = TOP - 244, w = 198, h = 224, d = c.d;
  c.rect(x0 - 2, y0 - 2, w + 4, h + 4, O); c.rect(x0 - 1, y0 - 1, w + 2, h + 2, "#3A3260"); c.rect(x0, y0, w, h, "#120E1E");
  c.rect(x0, y0, w, 20, "#2A2448"); for (let i = 0; i < 3; i++) c.disc(x0 + 10 + i * 9, y0 + 10, 2, ["#E0443C", "#F4CA50", "#65DA41"][i]); c.text(MAIN, "TYPE RULES", x0 + 52, y0 + 4, C.L, { scale: 2 });
  // code lines (pseudo-code blocks, not real text) scrolling up; the scroll eases to a stop as the frame appears
  const em = sm(t, TS_T.emerge[0], TS_T.emerge[1]), te = TS_T.emerge[0], sc = 12 * (t < te ? t : te + (1 - Math.pow(1 - clamp01((t - te) / 1.2), 2)) * 0.6);
  const cx0 = x0 + 6, cy0 = y0 + 26, cw = w - 12, ch = h - 32, line0 = Math.floor(sc / 8), off = sc - line0 * 8;
  for (let yy = 0; yy < ch; yy++) { const Y2 = cy0 + yy, ly = yy + off, li = line0 + Math.floor(ly / 8), inRow = ly % 8 < 4;
    const ind = Math.floor(rnd(li * 7 + 1) * 4) * 8; let xs = ind, tk = 0;
    for (let xx = 0; xx < cw; xx++) { const X2 = cx0 + xx; if (X2 < 0 || X2 >= c.w) continue;
      let col = null; if (inRow && xx >= ind) { while (xx >= xs + Math.floor(rnd(li * 31 + tk) * 18 + 6) + 4) { xs += Math.floor(rnd(li * 31 + tk) * 18 + 6) + 4; tk++; } const len = Math.floor(rnd(li * 31 + tk) * 18 + 6); if (xx < xs + len && tk < 2 + Math.floor(rnd(li * 5) * 5)) col = TOK[Math.floor(rnd(li * 17 + tk * 3) * 6)]; }
      const k = (Y2 * c.w + X2) * 3;
      if (em > 0) { const pc = corridor(xx / cw, yy / ch, phase(0), X2, Y2); if ((col && em > bayer(X2, Y2)) || (!col && em * 1.25 - 0.25 > bayer(X2 + 1, Y2 + 2))) { d[k] = pc[0]; d[k + 1] = pc[1]; d[k + 2] = pc[2]; continue; } }
      if (col) { d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; } } }
  // rule gears turning
  gear(c, X + 92, TOP - 40, 22, 10, t * 1.1, "#C8963C", 1); gear(c, X + 122, TOP - 70, 14, 7, -t * 1.6 + 0.2, "#B08AE8", 1);
  // tear-off calendar: DAY 1 … 12 (11 flips between "Its" and "days")
  const kx = X + 126, ky = TOP - 214, fk = clamp01((t - TS_T.flip[0]) / (TS_T.flip[1] - TS_T.flip[0])) * 11, day = Math.min(12, 1 + Math.floor(fk)), f = fk >= 11 ? 0 : fk - Math.floor(fk);
  const page = (n, dy, a) => { const g = fade(c, a); g.rect(kx - 34, ky + 12 + dy, 68, 78, O); g.rect(kx - 33, ky + 13 + dy, 66, 76, "#F2EEE4"); g.rect(kx - 33, ky + 13 + dy, 66, 16, "#D8443C"); g.text(TINY, "DAY", kx - 11, ky + 18 + dy, "#FFFFFF", { scale: 2 }); const s = String(n), tw = c.measure(MAIN, s, { scale: 4 }); g.text(MAIN, s, R(kx - tw / 2), ky + 40 + dy, O, { scale: 4 }); };
  c.rect(kx - 36, ky + 6, 72, 10, "#3A3550"); for (let i = 0; i < 3; i++) c.rect(kx - 22 + i * 20, ky + 2, 4, 12, "#9AA2B0");
  page(Math.min(12, day + (f > 0 ? 1 : 0)), 0, 1); if (f > 0) page(day, R(-f * 16), 1 - ease(f));
  const ring = win(t, EV.days2 - 0.05, EV.days2End + 0.6, 0.15, 0.5); if (ring > 0) fade(c, ring).rframe(kx - 38, ky + 8, 76, 86, C.Y, 2);
  const sa = 1 - sm(t, EV.twelve3 - 0.35, EV.twelve3 - 0.1), la = sm(t, EV.slowest - 0.1, EV.slowest + 0.25);
  if (sa > 0) tagX(c, ["THE SLOWEST"], X, 252, Math.min(sa, la), "#B08AE8");
  tagX(c, ["12 DAYS / FRAME"], X, 252, sm(t, EV.twelve3 - 0.1, EV.twelve3 + 0.2), "#B08AE8");
}

// ---------------------------------------------------------------- q: the empty 8th pedestal and its «?»
export function q(c, X, t) {
  const a = sm(t, EV.something - 0.25, EV.stranger + 0.2); if (a <= 0) return;
  const pulse = 0.7 + 0.3 * Math.sin((t - EV.stranger) * 4.2), y0 = R(330 + Math.sin(t * 2) * 3);
  c.tint(X - 70, y0 - 40, 140, 150, (i, j) => a * pulse * 0.5 * Math.max(0, 1 - Math.hypot((i - X) / 70, (j - y0 - 32) / 75)), "#F4CA50", 4);
  const g = fade(c, a), tw = c.measure(MAIN, "?", { scale: 10 });
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [3, 3]]) g.text(MAIN, "?", R(X - tw / 2) + dx, y0 + dy, O, { scale: 10 });
  g.text(MAIN, "?", R(X - tw / 2), y0, mix(C.Y, "#FFF6C8", 0.5 * pulse), { scale: 10 });
  for (let i = 0; i < 6; i++) { const an = i * 1.047 + t * 1.3, rr = 52 + 6 * Math.sin(t * 3 + i); const px = R(X + Math.cos(an) * rr), py = R(y0 + 34 + Math.sin(an) * rr * 0.9); fade(c, a * (0.5 + 0.5 * Math.sin(t * 5 + i))).rect(px, py, 2, 2, "#FFFFFF"); }
}

export const DRAW = { info, pc, mower, bulb, pdf, test, mc, bact, ts, q };
