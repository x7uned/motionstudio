// The auction room's live parts (2005): the year tag, two face-down cards on the auction table (no house names or
// logos on screen — the names are only spoken), the cards bobbing "rock, paper, scissors" on "made them play", the left
// card flipping to SCISSORS, the two eleven-year-old twin girls (our own cute drawing) whispering "SCISSORS!", the right
// card flipping to PAPER, the scissors flying over and cutting the paper in two, and the gavel on "won".
// All x are auction-screen x; dx = the camera offset (0 while the camera rests in the auction room).
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { EV } from "./timeline.mjs";
import { moveIcon } from "./hands.mjs";
import { panel, blob, ell, tube, eyes, blinkAt, blush, smile, RAMP, shadow } from "./cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const O = "#0B0812", IV = "#FDFEED", Y = "#F4CA50";

export const CARDS = { L: { x: 208, y: 464, seal: "#C82A30", flip: EV.scissors1 - 0.12, face: "S", glow: [EV.christies - 0.1, EV.advice] },
  R: { x: 338, y: 464, seal: "#3C6AD0", flip: EV.paper1 - 0.12, face: "P", glow: [EV.sothebys - 0.1, EV.paperEnd + 0.3] } };
export const FLY = [EV.scissors2 - 0.05, EV.scissors2 + 0.38];   // the scissors fly to the paper
export const CUT = FLY[1], GAVEL = EV.won + 0.02;
const CW = 80, CH = 100;

function tagTop(c, lines, cx, y, a, col) {
  if (a <= 0) return; const s = 2, w = Math.max(...lines.map((l) => c.measure(MAIN, l, { scale: s }))) + 22, h = lines.length * 20 + 10, x = R(Math.max(36, Math.min(504 - w, cx - w / 2)));
  panel(c, x, y, w, h, a, col); const g = fade(c, a); lines.forEach((l, i) => { const lw = c.measure(MAIN, l, { scale: s }), lx = R(x + (w - lw) / 2); g.text(MAIN, l, lx + 1, y + 9 + i * 20, O, { scale: s }); g.text(MAIN, l, lx, y + 8 + i * 20, i ? IV : col, { scale: s }); });
}

function card(c, K, t, dx, cut = 0) {
  const kin = clamp01((t - EV.choose + 0.15) / 0.4); if (kin <= 0) return;
  const a = sm(kin, 0, 0.6), drop = R((1 - back(kin)) * -26);
  // "made them play": the two cards bob three times like pumping fists
  const pu = (t - EV.made + 0.05) / (EV.playEnd - EV.made + 0.15), bob = pu > 0 && pu < 1 ? -10 * Math.abs(Math.sin(Math.PI * 3 * pu)) : 0;
  const u = clamp01((t - K.flip) / 0.32), sx = Math.abs(Math.cos(Math.PI * u)), faceUp = u >= 0.5, cx = K.x + dx, cy = K.y + drop + R(bob);
  const w = Math.max(1, R(CW * sx)), x = R(cx - w / 2), y = R(cy - CH / 2), gl = win(t, K.glow[0], K.glow[1], 0.2, 0.3);
  const halves = cut > 0 ? [[-1, -R(14 * ease(cut)), R(26 * cut * cut), -0.25 * cut], [1, R(14 * ease(cut)), R(30 * cut * cut), 0.25 * cut]] : [[0, 0, 0, 0]];
  for (const [side, ox, oy] of halves) {
    const ga = cut > 0 ? a * (1 - sm(cut, 0.5, 1)) : a, g = fade(c, ga);
    const rect = (rx, ry, rw, rh, col) => { for (let j = ry; j < ry + rh; j++) for (let i = rx; i < rx + rw; i++) { const zig = side ? ((j >> 2) % 2 ? 2 : -2) : 0; if (side < 0 ? i - ox <= cx + zig : side > 0 ? i - ox > cx + zig : true) g.px(i, j + oy, col); } };
    if (gl > 0.05) rect(x - 3, y - 3, w + 6, CH + 6, mix("#5A1A28", Y, gl * (0.7 + 0.3 * Math.sin(t * 12))));
    rect(x - 1, y - 1, w + 2, CH + 2, O);
    if (!faceUp) { rect(x, y, w, CH, "#E8DCC0"); rect(x + 3, y + 3, Math.max(0, w - 6), CH - 6, "#D8C8A4"); if (w > 30) { rect(R(cx - 9), y + CH - 22, 18, 12, K.seal); rect(R(cx - 7), y + CH - 20, 14, 2, mix(K.seal, "#FFFFFF", 0.4)); } }
    else { rect(x, y, w, CH, "#FBF6E8"); rect(x + 3, y + 3, Math.max(0, w - 6), 2, "#FFFFFF"); }
  }
  if (!faceUp && w > 36) { const q = fade(c, a), s = 4, qw = c.measure(MAIN, "?", { scale: s }); q.text(MAIN, "?", R(cx - qw / 2) + 1, y + 16 + 1, "#8A7A5A", { scale: s }); q.text(MAIN, "?", R(cx - qw / 2), y + 18, "#5A4A30", { scale: s }); }
  if (faceUp && w > 36 && cut <= 0) { // the move: icon + word (the scissors icon leaves the card when it flies)
    const fly = K.face === "S" ? sm(t, FLY[0], FLY[0] + 0.05) : 0;
    if (fly < 1) moveIcon(c, cx, y + 42, K.face, a * (1 - fly), 0.74);
    const word = K.face === "S" ? "SCISSORS" : "PAPER", ww = c.measure(TINY, word, { scale: 2 }); fade(c, a).text(TINY, word, R(cx - ww / 2), y + CH - 18, "#3A2A20", { scale: 2 });
  }
  if (cut > 0) { // paper icon split with the card halves
    for (const sd of [-1, 1]) { const ox = sd * R(14 * ease(cut)), oy = R((sd < 0 ? 26 : 30) * cut * cut), ga = a * (1 - sm(cut, 0.5, 1));
      moveIconHalf(c, cx + ox, y + 42 + oy, sd, ga); }
  }
}
// paper icon half (for the cut): draw the full icon into a scratch canvas and keep one side of the zigzag cut
const SCR = new Canvas(120, 120, "#FF00FE");
function moveIconHalf(c, x, y, sd, a) {
  SCR.rect(0, 0, 120, 120, "#FF00FE"); moveIcon(SCR, 60, 60, "P", 1, 0.74);
  for (let j = 0; j < 120; j++) for (let i = 0; i < 120; i++) { const p = (j * 120 + i) * 3; if (SCR.d[p] === 0xff && SCR.d[p + 1] === 0 && SCR.d[p + 2] === 0xfe) continue; const zig = (j >> 2) % 2 ? 2 : -2; if (sd < 0 ? i - 60 > zig : i - 60 <= zig) continue;
    const X = R(x - 60 + i), Yy = R(y - 60 + j); if (X < 0 || Yy < 0 || X >= c.w || Yy >= c.h || (a < 1 && a <= bayer(X, Yy))) continue; const q = (Yy * c.w + X) * 3; c.d[q] = SCR.d[p]; c.d[q + 1] = SCR.d[p + 1]; c.d[q + 2] = SCR.d[p + 2]; }
}

// ---------------------------------------------------------------- the twin girls (our own cute drawing)
function girl(c, x, feet, t, dress, ph) {
  const hop = Math.max(0, Math.sin(Math.PI * clamp01((t - EV.advice - ph) / 0.35))) * 8, y = feet - R(hop), skin = RAMP.skin, hair = ["#120A06", "#1E120A", "#2E1C10", "#3E2818", "#523620", "#6A4628", "#806040", "#9A7A58"];
  shadow(c, x, feet + 2, 16, 4, "#2A0A10", 0.5);
  blob(c, [tube([[x - 5, y - 26], [x - 5, y]], 3.2, 3)], { ramp: skin }); blob(c, [tube([[x + 5, y - 26], [x + 5, y]], 3.2, 3)], { ramp: skin });
  c.rect(x - 9, y - 2, 8, 4, "#3A2A40"); c.rect(x + 2, y - 2, 8, 4, "#3A2A40");
  blob(c, [[[x - 9, y - 58], [x + 9, y - 58], [x + 17, y - 22], [x - 17, y - 22]]], { ramp: dress, base: 4.4 });
  blob(c, [tube([[x - 10, y - 52], [x - 17, y - 36]], 3.4, 3)], { ramp: skin }); blob(c, [tube([[x + 10, y - 52], [x + 17, y - 36]], 3.4, 3)], { ramp: skin });
  for (const s of [-1, 1]) blob(c, [ell(x + s * 22, y - 82, 6, 9, s * 0.4)], { ramp: hair, base: 3 });
  blob(c, [ell(x, y - 78, 19, 18)], { ramp: skin, base: 4.6 });
  blob(c, [[[x - 20, y - 80], [x - 16, y - 94], [x, y - 99], [x + 16, y - 94], [x + 20, y - 80], [x + 12, y - 86], [x, y - 88], [x - 12, y - 86]]], { ramp: hair, base: 3 });
  eyes(c, x, y - 76, 14, 4.2, { iris: RAMP.brown, blink: blinkAt(t, 3.1, ph * 7), look: [0.3, 0] }); blush(c, x - 11, y - 69, 3, 2); blush(c, x + 11, y - 69, 3, 2);
  smile(c, x, y - 67, 3, { open: win(t, EV.eleven - 0.1, EV.girlsEnd + 0.3, 0.15, 0.2) * 0.6 });
}

function gavel(c, t, dx) {
  const u = (t - GAVEL + 0.12) / 0.45, ang = u > 0 && u < 1 ? (u < 0.27 ? -0.7 + 0.7 * ease(u / 0.27) : -0.7 * ease((u - 0.27) / 0.73)) : -0.7;
  const px = 420 + dx, py = 500, P = (a, b) => [px + a * Math.cos(ang) - b * Math.sin(ang), py + a * Math.sin(ang) + b * Math.cos(ang)];
  c.poly([P(0, -3), P(0, 3), P(34, 3), P(34, -3)], "#5A3418"); c.poly([P(0, -1), P(0, 1), P(34, 1), P(34, -1)], "#8A5834");
  c.poly([P(-14, -10), P(-14, 10), P(4, 10), P(4, -10)], "#3A2210"); c.poly([P(-12, -8), P(-12, 8), P(2, 8), P(2, -8)], "#7A4A20"); c.poly([P(-12, -8), P(-12, -5), P(2, -5), P(2, -8)], "#A86A2C");
  const s = (t - GAVEL) / 0.35; if (s > 0 && s < 1) { const g = fade(c, 1 - s); for (let i = 0; i < 5; i++) { const an = -Math.PI * (0.15 + 0.17 * i), r0 = 10 + 14 * s, r1 = r0 + 8; g.line(R(387 + dx + Math.cos(an) * r0), R(506 + Math.sin(an) * r0), R(387 + dx + Math.cos(an) * r1), R(506 + Math.sin(an) * r1), Y); } }
}

export function auctionDraw(c, t, dx) {
  if (dx > 560) return;
  // year tag and the question
  tagTop(c, ["2005 · JAPAN"], 270 + dx, 150, win(t, EV.y2005 - 0.1, EV.christies - 0.3, 0.3, 0.3), Y);
  { const a = win(t, EV.paintings - 0.1, EV.made - 0.1, 0.2, 0.3); if (a > 0) for (let i = 0; i < 8; i++) { const an = t * 1.4 + i * 0.785, x = R(270 + dx + Math.cos(an) * 170), y = R(284 + Math.sin(an) * 104); fade(c, a * (0.5 + 0.5 * Math.sin(t * 9 + i))).rect(x - 1, y - 1, 3, 3, "#FFF1B8"); } }
  // the girls (left of the table) and their whisper
  const ga = sm(t, EV.advice - 0.1, EV.advice + 0.25); if (ga > 0) {
    const g2 = [[72, "#F4CA50", 0], [114, "#7FE3F0", 0.12]];
    for (const [x, col, ph] of g2) { const ramp = col === "#F4CA50" ? RAMP.bee : ["#0E2A2E", "#18464E", "#246A74", "#3490A0", "#4EB4C4", "#7AD4E0", "#A8E8F0", "#D8F8FC"]; if (ga >= 1) girl(c, x + dx, 640, t, ramp, ph); else { const tmp = Object.create(c); tmp.px = (X, Yy, cc) => { if (ga > bayer(Math.floor(X), Math.floor(Yy))) c.px(X, Yy, cc); }; girl(tmp, x + dx, 640, t, ramp, ph); } }
  }
  { const k = clamp01((t - EV.eleven + 0.1) / 0.3), a = Math.min(sm(k, 0, 0.6), 1 - sm(t, EV.sothebys + 0.2, EV.sothebys + 0.5)); if (a > 0) {
    const s = 2, txt = "SCISSORS!", w = c.measure(MAIN, txt, { scale: s }) + 22, x = 38 + dx, y = 486 + R((1 - back(k)) * 8), g = fade(c, a);
    g.rrect(x - 1, y - 1, w + 2, 32, O, 3); g.rrect(x, y, w, 30, IV, 3); g.poly([[x + 40, y + 29], [x + 58, y + 29], [x + 46, y + 42]], O); g.poly([[x + 42, y + 28], [x + 56, y + 28], [x + 47, y + 38]], IV);
    g.text(MAIN, txt, x + 11, y + 9, "#C82A30", { scale: s }); } }
  // the two cards; the right one is cut in two after the scissors arrive
  const cut = clamp01((t - CUT) / 0.55);
  card(c, CARDS.L, t, dx); card(c, CARDS.R, t, dx, cut);
  // the flying scissors: an arc from the left card to the right one, snipping on arrival, then dissolving
  { const u = clamp01((t - FLY[0]) / (FLY[1] - FLY[0])); if (t > FLY[0] && t < CUT + 0.6) { const e = ease(u), x = 208 + (338 - 208) * e + dx, y = 464 - 8 - 70 * Math.sin(Math.PI * e) + (t > CUT ? 0 : 0), snip = t > CUT ? 1 + 0.12 * Math.sin((t - CUT) * 40) : 1;
      moveIcon(c, x, y, "S", 1 - sm(t, CUT + 0.25, CUT + 0.6), 0.74 * snip * (1 + 0.3 * Math.sin(Math.PI * e))); } }
  gavel(c, t, dx);
  // a win burst over the left card on "won"
  { const s = (t - GAVEL) / 0.6; if (s > 0 && s < 1) { const g = fade(c, 1 - s); for (let i = 0; i < 12; i++) { const an = (i / 12) * 2 * Math.PI, r = 30 + 30 * ease(s); g.rect(R(208 + dx + Math.cos(an) * r), R(464 + Math.sin(an) * r * 1.1), 3, 3, i % 2 ? Y : IV); } } }
}
