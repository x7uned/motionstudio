// Explainer overlays over the room (our usual cards, our pixel fonts): the electron beam painting the glass line by line
// (beamAt feeds crt.mjs; the dot + trail are drawn here), RED · GREEN · BLUE, two neighbour pixels whose glows overlap
// (BLUR), the waterfall frame, NO SEE-THROUGH WATER, the AS DRAWN lens (WATER · BACK stripes) that melts into the CRT
// view (ON A TV), the quote card, the two checkerboard tiles (NEW COLOR, SOFT LIGHT), the two loupes (OLD TV / NEW
// SCREEN: clear water vs stripes), the CRT FILTER toggle, the COLLECTORS tag and SAME GAME. Every element dissolves.
import { fade, mix, MAIN, TINY, bayer } from "../../../../renderer/pixel/raster.mjs";
import { C, panel, tag } from "./cute.mjs";
import { drawPicture, look } from "./crt.mjs";
import { MACRO_PX, WATER_X, WATER_Y } from "./game.mjs";
import { X, Y, tvWorld, STV, SFL, FLATG, flatDX, filterK, flatOn } from "./room.mjs";
import { EV, SWEEP, BLURDEMO, MACRO, WF, LENS, QUOTE, CHECK, LOUPE, FILTER, COLL, ENDW, sm, ease } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const gs = (V, u, v) => { const [wx, wy] = tvWorld(u, v); return [X(V, wx), Y(V, wy)]; };   // game point on the TV → screen

function pill(c, text, cx, y, a, col = C.Y, font = MAIN) {
  if (a <= 0) return; const g = fade(c, a), w = c.measure(font, text, { scale: 2 }) + 20, x = R(cx - w / 2);
  g.rrect(x, y, w, 22, col, 2); g.rrect(x + 2, y + 2, w - 4, 18, C.CARD, 2); g.text(font, text, x + 10, y + (font === MAIN ? 5 : 6), col, { scale: 2 });
}
function popTag(c, lines, cx, y, t, a0, a1, col = C.Y, scale = 2) {
  const a = win(t, a0, a1, 0.22, 0.25); if (a <= 0) return; const k = back((t - a0) / 0.32); tag(c, lines, cx, R(y + (1 - k) * 6), a, col, scale);
}
function dashRect(c, x0, y0, x1, y1, col, a, ph = 0) {
  if (a <= 0) return; const g = fade(c, a); x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); const on = (k) => (k + ph) % 8 < 5;
  for (let x = x0; x <= x1; x++) { if (on(x)) { g.rect(x, y0, 1, 2, col); g.rect(x, y1 - 1, 1, 2, col); } }
  for (let y = y0; y <= y1; y++) { if (on(y)) { g.rect(x0, y, 2, 1, col); g.rect(x1 - 1, y, 2, 1, col); } }
}
function frameBox(c, x0, y0, x1, y1, col, a, w = 2) {
  if (a <= 0) return; const g = fade(c, a); x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
  g.rect(x0 - w, y0 - w, x1 - x0 + 2 * w, w, col); g.rect(x0 - w, y1, x1 - x0 + 2 * w, w, col); g.rect(x0 - w, y0, w, y1 - y0, col); g.rect(x1, y0, w, y1 - y0, col);
  g.rect(x0 - w - 1, y0 - w - 1, x1 - x0 + 2 * w + 2, 1, C.O); g.rect(x0 - w - 1, y1 + w, x1 - x0 + 2 * w + 2, 1, C.O);
}
function dots(c, ax, ay, bx, by, col, a) { if (a <= 0) return; const g = fade(c, a), L = Math.hypot(bx - ax, by - ay); for (let q = 0; q < L; q += 4) g.rect(R(ax + ((bx - ax) * q) / L), R(ay + ((by - ay) * q) / L), 2, 2, col); }

// ---------------------------------------------------------------- the beam (macro): rows 0..27 painted left → right, one game row per sweep line
const ROWS = 41, UL = MACRO_PX.u - 12.6, UR = MACRO_PX.u + 12.6, ROWDUR = (SWEEP.b - SWEEP.a) / ROWS;
const paintT = (r, u) => SWEEP.a + (r + (u - UL) / (UR - UL)) * ROWDUR;
export function beamAt(t) {
  if (t < SWEEP.a - 0.4 || t > SWEEP.b + 0.6) return null;
  const dim = sm(t, SWEEP.a - 0.4, SWEEP.a);
  return (r, u) => { const tau = t - paintT(r, Math.max(UL, Math.min(UR, u))); if (tau < 0) return 1 - 0.78 * dim; return 1 + 0.55 * Math.exp(-tau / 0.09); };
}
function beamDot(c, V, t) {
  if (t < SWEEP.a || t > SWEEP.b) return; const k = (t - SWEEP.a) / ROWDUR, r = Math.floor(k), u = UL + (k - r) * (UR - UL), v = r + 0.5;
  const [x, y] = gs(V, u, v), a = Math.min(sm(t, SWEEP.a, SWEEP.a + 0.15), 1 - sm(t, SWEEP.b - 0.15, SWEEP.b));
  // trail along the row (behind the dot)
  for (let q = 0; q < 70; q++) { const tx = x - q, al = a * (1 - q / 70) * 0.8; if (tx < 0) break; for (let dy = -2; dy <= 2; dy++) if (al * (1 - Math.abs(dy) / 3) > bayer(R(tx), R(y + dy))) c.px(R(tx), R(y + dy), mix("#BFE8FF", "#FFFFFF", 1 - q / 70)); }
  for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) { const dd = Math.hypot(dx, dy); if (dd > 9) continue; const al = a * (dd < 3.2 ? 1 : 0.85 * (1 - (dd - 3.2) / 5.8)); if (al > bayer(R(x + dx), R(y + dy))) c.px(R(x + dx), R(y + dy), dd < 3.2 ? "#FFFFFF" : "#CDEBFF"); }
}

// ---------------------------------------------------------------- two neighbour pixels (white cloud | blue sky) and their overlapping glows
const PA = { u: Math.floor(MACRO_PX.u) - 1, v: Math.floor(MACRO_PX.v) }, PB = { u: Math.floor(MACRO_PX.u), v: Math.floor(MACRO_PX.v) };
function blurDemo(c, V, t) {
  const a = win(t, BLURDEMO.a, BLURDEMO.b, 0.3, 0.35); if (a <= 0) return;
  const s = STV * V.z, [ax, ay] = gs(V, PA.u, PA.v), [bx] = gs(V, PB.u, PB.v);
  dashRect(c, ax + 1, ay + 1, ax + s - 1, ay + s - 1, "#FFFFFF", a, R(t * 12)); dashRect(c, bx + 1, ay + 1, bx + s - 1, ay + s - 1, "#7FE3F0", a, R(t * 12));
  const lab = win(t, EV.pixels - 0.05, BLURDEMO.b, 0.25, 0.35); pill(c, "2 PIXELS", R(bx), R(ay - 44), Math.min(a, lab), C.L, TINY);
  // glow curves: each pixel's light spreads past its square and overlaps the neighbour's (sigma = the CRT's beam blur)
  const g = sm(t, EV.blurred - 0.1, EV.together + 0.2), base = R(ay + s + 16), amp = 46 * ease(g), sg = 0.65 * s;
  if (g > 0) {
    const fg = fade(c, a);
    for (let x = R(ax - 2.6 * s); x <= R(bx + 3.6 * s); x++) {
      const ga = Math.exp(-((x - (ax + s / 2)) ** 2) / (2 * sg * sg)), gb = Math.exp(-((x - (bx + s / 2)) ** 2) / (2 * sg * sg)), ov = Math.min(ga, gb);
      if (ov > 0.04) for (let y = R(base - amp * ov); y < base; y++) if (0.75 > bayer(x, y)) fg.px(x, y, "#9AC8F0");
      fg.rect(x, R(base - amp * ga), 1, 2, "#FFFFFF"); fg.rect(x, R(base - amp * gb), 1, 2, "#5AA8FF");
    }
    fg.rect(R(ax - 2.6 * s), base, R(3.6 * s + bx - ax + 2.6 * s), 2, "#E0CDF8");
  }
  pill(c, "BLUR", R(ax + s), base + 10, Math.min(a, sm(t, EV.together - 0.1, EV.together + 0.2)), C.Y);
}

// ---------------------------------------------------------------- waterfall frame + the AS DRAWN lens
const LU = [WATER_X[0] - 3, WATER_X[1] + 4], LV = [WATER_Y[0] - 3, WATER_Y[1] + 1];
function lens(c, V, t, img) {
  const a = win(t, LENS.in, LENS.out + 0.35, 0.3, 0.35); if (a <= 0) return;
  const s = STV * V.z, [x0, y0] = gs(V, LU[0], LV[0]), [x1, y1] = gs(V, LU[1], LV[1]), k = ease((t - LENS.melt0) / (LENS.melt1 - LENS.melt0));
  const open = ease((t - LENS.in) / 0.4), cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, hx = ((x1 - x0) / 2) * (0.6 + 0.4 * open), hy = ((y1 - y0) / 2) * (0.6 + 0.4 * open);
  const fr = 1 - sm(t, LENS.out, LENS.out + 0.35);                         // the frame dissolves after the melt; the lens content = the TV by then
  const [ox, oy] = gs(V, 0, 0);
  drawPicture(c, img, { clip: [cxm - hx, cym - hy, cxm + hx, cym + hy], map: { ox, oy, gu: 0, gv: 0, s }, ...look(k, s), alpha: a });
  frameBox(c, cxm - hx, cym - hy, cxm + hx, cym + hy, C.Y, a * fr, 2);
  const lab = (1 - sm(t, LENS.melt0, LENS.melt0 + 0.3)), lab2 = sm(t, LENS.melt0 + 0.15, LENS.melt0 + 0.45);
  pill(c, "AS DRAWN", R(cxm), R(cym + hy + 8), a * fr * lab, C.Y); pill(c, "ON A TV", R(cxm), R(cym + hy + 8), a * fr * lab2, C.CY);
  // WATER · BACK: highlight the spoken column, labels above with leader lines
  const steps = [[EV.water2, 0], [EV.back1, 1], [EV.water3, 2], [EV.back2, 3]], la = win(t, EV.water2 - 0.1, LENS.melt0 + 0.2, 0.2, 0.3) * a;
  if (la > 0) {
    let cur = -1; for (const [tt, i] of steps) if (t >= tt - 0.05) cur = i; if (cur < 0) return;
    const pair = Math.floor(cur / 2), shift = ease((t - EV.water3 + 0.05) / 0.25), col0 = WATER_X[0] + 2 * shift;
    for (const [i, name, lx, colr] of [[0, "WATER", cxm - 92, "#E6F6FF"], [1, "BACK", cxm + 92, "#B08AE8"]]) {
      const on = i === 0 ? 1 : sm(t, EV.back1 - 0.05, EV.back1 + 0.15); if (on <= 0) continue;
      const colX = gs(V, col0 + i + 0.5, 0)[0], [, ty] = gs(V, 0, WATER_Y[0]);
      const hl = i === cur % 2 ? 1 : 0.45, g = fade(c, la * on);
      // column outline (the whole stripe)
      const cx0 = colX - s / 2, [, cy1] = gs(V, 0, WATER_Y[1] - 1);
      frameBox(c, cx0 + 1, ty, cx0 + s - 1, cy1, mix(colr, "#000000", 1 - hl), la * on, 1);
      dots(c, lx, R(cym - hy - 22), colX, ty - 3, colr, la * on * hl);
      const w = c.measure(MAIN, name, { scale: 2 }) + 16; g.rrect(R(lx - w / 2), R(cym - hy - 46), w, 22, colr, 2); g.rrect(R(lx - w / 2) + 2, R(cym - hy - 44), w - 4, 18, C.CARD, 2); g.text(MAIN, name, R(lx - w / 2) + 8, R(cym - hy - 41), colr, { scale: 2 });
    }
    void pair;
  }
}
function waterFrame(c, V, t) {
  const a = win(t, EV.waterfalls - 0.1, EV.couldnt + 0.1, 0.3, 0.3); if (a <= 0) return;
  const [x0, y0] = gs(V, WATER_X[0] - 0.5, WATER_Y[0] - 3.5), [x1, y1] = gs(V, WATER_X[1] + 1.5, WATER_Y[1] + 0.5), k = back((t - EV.waterfalls + 0.1) / 0.35), p = (1 - k) * 10;
  dashRect(c, x0 - p, y0 - p, x1 + p, y1 + p, C.Y, a, R(t * 14));
  pill(c, "WATERFALL", R((x0 + x1) / 2), R(y0 - p - 30), a, C.Y);
}

// ---------------------------------------------------------------- quote card
const QUOTE_Y = 152;
function quoteMarks(g, x, y, col) { for (const dx of [0, 7]) { g.rect(x + dx, y, 5, 5, col); g.rect(x + dx + 2, y + 5, 3, 3, col); g.rect(x + dx + 1, y + 8, 2, 2, col); } }
function quote(c, t) {
  const a = win(t, QUOTE.in, QUOTE.out, 0.3, 0.3); if (a <= 0) return; const k = back((t - QUOTE.in) / 0.35), dy = R((1 - k) * 10);
  const x = 66, w = 408, y = QUOTE_Y + dy, h = 126; panel(c, x, y, w, h, a, C.Y); const g = fade(c, a);
  quoteMarks(g, x + 14, y + 14, C.Y);
  const l1 = sm(t, QUOTE.in + 0.15, QUOTE.in + 0.45), l2 = sm(t, EV.said - 0.1, EV.said + 0.2), l3 = sm(t, EV.naoto - 0.1, EV.naoto + 0.25);
  if (l1 > 0) fade(c, a * l1).text(MAIN, "WE MADE USE OF THE", x + 40, y + 16, C.IV, { scale: 2 });
  if (l2 > 0) fade(c, a * l2).text(MAIN, "CRT'S BLURRINESS", x + 40, y + 40, C.Y, { scale: 3 });
  if (l3 > 0) { const f = fade(c, a * l3); f.rect(x + 40, y + 80, 24, 2, C.L); f.text(MAIN, "NAOTO OHSHIMA", x + 70, y + 74, C.IV, { scale: 2 }); f.text(TINY, "SONIC DESIGNER", x + 70, y + 96, C.L, { scale: 2 }); }
}

// ---------------------------------------------------------------- checkerboards: two colours → a new colour, a dithered spotlight → soft light
const CKW = 16, CKH = 10;
const CK1 = (() => { const im = new Float32Array(CKW * CKH * 3); for (let y = 0; y < CKH; y++) for (let x = 0; x < CKW; x++) { const p = (y * CKW + x) * 3, on = (x + y) % 2; im[p] = on ? 0.94 : 0.16; im[p + 1] = on ? 0.2 : 0.3; im[p + 2] = on ? 0.3 : 0.95; } return im; })();
const CK2 = (() => { const im = new Float32Array(CKW * CKH * 3); for (let y = 0; y < CKH; y++) for (let x = 0; x < CKW; x++) { const p = (y * CKW + x) * 3, inCone = Math.abs(x + 0.5 - CKW / 2) < 1.5 + y * 0.55, floor = y >= CKH - 2;
  let col = floor ? [0.3, 0.2, 0.36] : [0.12, 0.08, 0.2]; if (inCone && (x + y) % 2 === 0) col = [1, 0.9, 0.55]; if (y === 0 && Math.abs(x + 0.5 - CKW / 2) < 2) col = [1, 0.97, 0.8]; im[p] = col[0]; im[p + 1] = col[1]; im[p + 2] = col[2]; } return im; })();
function checker(c, t) {
  const a = win(t, CHECK.in, CHECK.out, 0.3, 0.3); if (a <= 0) return; const k = back((t - CHECK.in) / 0.35), dy = R((1 - k) * 10);
  const x = 52, w = 436, y = 150 + dy, h = 142; panel(c, x, y, w, h, a, C.L);
  fade(c, a).text(MAIN, "CHECKERBOARDS", x + 12, y + 9, C.L, { scale: 2 });
  const S = 10, tiles = [[x + 30, CK1, CHECK.m1, "NEW COLOR"], [x + 246, CK2, CHECK.m2, "SOFT LIGHT"]];
  for (const [tx, im, m, lab] of tiles) {
    const ty = y + 28, kk = ease((t - m) / 0.6);
    drawPicture(c, im, { iw: CKW, ih: CKH, clip: [tx, ty, tx + CKW * S, ty + CKH * S], map: { ox: tx, oy: ty, gu: 0, gv: 0, s: S }, ...look(kk, S), alpha: a });
    frameBox(c, tx, ty, tx + CKW * S, ty + CKH * S, C.O, a, 1);
    const la = Math.min(a, sm(t, m + 0.2, m + 0.5)); if (la > 0) { const tw = c.measure(MAIN, lab, { scale: 2 }); fade(c, la).text(MAIN, lab, R(tx + (CKW * S) / 2 - tw / 2), ty + CKH * S + 6, C.Y, { scale: 2 }); }
  }
}

// ---------------------------------------------------------------- loupes over both screens (wide shot)
const LP = [{ x0: 96, x1: 276, label: "OLD TV", col: C.Y }, { x0: 288, x1: 468, label: "NEW SCREEN", col: C.CY }], LY0 = 178, LY1 = 384, LS = 9;
const focus = (t) => { const k = ease((t - LOUPE.pan0) / (LOUPE.pan1 - LOUPE.pan0)); return { u: 14 + (42.5 - 14) * k, v: 30 + (24 - 30) * k }; };
function loupes(c, V, t, img) {
  const a = win(t, LOUPE.in, LOUPE.out + 0.35, 0.3, 0.35); if (a <= 0) return; const f = focus(t), open = back((t - LOUPE.in) / 0.4);
  LP.forEach((L, i) => {
    const cx = (L.x0 + L.x1) / 2, cy = (LY0 + LY1) / 2, hw = ((L.x1 - L.x0) / 2) * (0.7 + 0.3 * open), hh = ((LY1 - LY0) / 2) * (0.7 + 0.3 * open);
    // where the loupe looks on its own screen
    let sx, sy; if (i === 0) [sx, sy] = gs(V, f.u, f.v); else { const dx = flatDX(t); sx = X(V, FLATG.x0 + dx + f.u * SFL); sy = Y(V, FLATG.y0 + f.v * SFL); }
    dots(c, cx, cy + hh + 3, sx, sy, L.col, a * 0.9);
    const g = fade(c, a); g.rect(R(sx) - 3, R(sy) - 3, 7, 7, C.O); g.rect(R(sx) - 2, R(sy) - 2, 5, 5, L.col);
    const k = i === 0 ? 1 : filterK(t);
    fade(c, a).rect(R(cx - hw), R(cy - hh), R(2 * hw), R(2 * hh), "#000000");
    drawPicture(c, img, { clip: [cx - hw, cy - hh, cx + hw, cy + hh], map: { ox: cx, oy: cy, gu: f.u, gv: f.v, s: LS }, ...look(k, LS), alpha: a * (i === 1 ? flatOn(t) : 1) });
    frameBox(c, cx - hw, cy - hh, cx + hw, cy + hh, L.col, a, 2);
    pill(c, L.label, R(cx), R(cy - hh - 12), a, L.col);
  });
  const sq = win(t, EV.hard - 0.1, LOUPE.pan0 + 0.1, 0.25, 0.3) * a, st = win(t, EV.stay - 0.1, FILTER.flip0, 0.25, 0.3) * a;
  pill(c, "HARD SQUARES", 378, LY1 - 30, sq * (1 - filterK(t)), C.CY);
  pill(c, "STRIPES", 378, LY1 - 30, st, C.CY); pill(c, "CLEAR WATER", 186, LY1 - 30, st, C.Y);
}

// ---------------------------------------------------------------- CRT FILTER toggle, COLLECTORS tag, SAME GAME
function toggle(c, V, t) {
  const a = win(t, FILTER.in, FILTER.out, 0.3, 0.3); if (a <= 0) return; const k = filterK(t), x = 302, y = 392 + R((1 - back((t - FILTER.in) / 0.35)) * 6), g = fade(c, a), w = 134;
  g.rrect(x, y, w, 24, C.CY, 2); g.rrect(x + 2, y + 2, w - 4, 20, C.CARD, 2); g.text(TINY, "CRT FILTER", x + 9, y + 7, C.IV, { scale: 2 });
  g.rrect(x + 94, y + 5, 32, 14, mix("#3A3448", "#2E9A58", k), 3); g.rect(R(x + 96 + 18 * ease(k)), y + 7, 10, 10, "#FDFEED");
}
function collectors(c, V, t) {
  const a = win(t, COLL.in, COLL.out, 0.3, 0.3); if (a <= 0) return; const ax = X(V, 70), ay = Y(V, 348), sw = Math.sin((t - COLL.in) * 5) * Math.exp(-(t - COLL.in) * 1.6) * 6;
  const g = fade(c, a), tx = R(ax - 34 + sw), ty = R(ay - 46), w = c.measure(MAIN, "COLLECTORS", { scale: 2 }) + 22;
  g.line(R(ax), R(ay), tx + 12, ty + 11, "#E0CDF8");
  g.rrect(tx, ty, w, 24, "#F4CA50", 3); g.rrect(tx + 2, ty + 2, w - 4, 20, "#3A2A18", 3); g.rect(tx + 8, ty + 9, 4, 4, "#F4CA50"); g.text(MAIN, "COLLECTORS", tx + 16, ty + 7, "#FDE07A", { scale: 2 });
}

export function drawOverlays(c, t, V, img) {
  beamDot(c, V, t);
  if (t > EV.beam && t < MACRO.out0 + 0.4) {
    popTag(c, ["ELECTRON BEAM"], 270, 168, t, EV.beam - 0.05, EV.onto + 0.1);
    const a = win(t, EV.tiny - 0.1, BLURDEMO.a + 0.1, 0.25, 0.3);
    if (a > 0) { const words = [["RED", "#FF5A5A", EV.red], ["GREEN", "#65DA41", EV.green], ["BLUE", "#5A9CFF", EV.blue]], o = { scale: 3 }, w = words.reduce((s, [wd]) => s + c.measure(MAIN, wd, o), 0) + 2 * 18, x0 = R(270 - w / 2);
      panel(c, x0 - 14, 160, w + 28, 40, a, C.L); let x = x0; for (const [wd, col, tt] of words) { const k = sm(t, tt - 0.08, tt + 0.15); if (k > 0) fade(c, a * k).text(MAIN, wd, x, R(170 + (1 - k) * 4), col, o); x += c.measure(MAIN, wd, o) + 18; } }
  }
  blurDemo(c, V, t);
  popTag(c, ["ARTISTS USED IT"], 270, 168, t, EV.artists2 - 0.05, EV.look - 0.1, C.L);
  waterFrame(c, V, t);
  popTag(c, ["NO SEE-THROUGH", "WATER"], 270, 158, t, EV.couldnt - 0.1, EV.so2 - 0.2, C.PK);
  lens(c, V, t, img);
  quote(c, t);
  checker(c, t);
  loupes(c, V, t, img);
  toggle(c, V, t);
  collectors(c, V, t);
  pill(c, "SAME GAME", 270, 318, win(t, EV.game2 - 0.05, EV.follow - 0.3, 0.25, 0.3), C.Y);
}
