// Trial 10 s · HUD cards. stopwatch = the tombstone stopwatch from effort-exp-2026-10-25/xhigh/film/hud.mjs, generalised:
// header = label or value+unit, the hand sweeps a fraction (value "1/6") or one turn, the counter counts 0 → value.
// counter = a wider plate with big digits counting up. Screen space (the camera never moves them). Values are validated
// script numbers; the text never comes from anywhere else.
import { Canvas, MAIN, bayer } from "../../../../renderer/pixel/raster.mjs";
import { TAU, R, clamp01, sm, lerp, ease, easeOut, rnd } from "../engine/layout.mjs";
import { parseValue } from "../contract.mjs";

const O = "#0B0812", IV = "#FDFEED";
const easeOut3 = (x) => { x = clamp01(x); return x < 0.85 ? x / 0.85 * 0.93 : 0.93 + 0.07 * easeOut((x - 0.85) / 0.15); };
/** "100,000" style grouping of an integer counting value; fractions are typed in as they are. */
export function shownValue(value, k) {
  const p = parseValue(value); if (!p) return "";
  if (p.frac) return k > 0.5 ? p.frac : "";
  const dec = String(value).includes(".") ? String(value).split(".")[1].length : 0, v = p.num * k;
  const s = dec ? v.toFixed(dec) : String(Math.round(v));
  return String(value).includes(",") ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s;
}
function composite(c, card, m, bx, by, s, a, CW, CH) {
  const x0 = Math.floor(bx - (CW / 2) * s), x1 = Math.ceil(bx + (CW / 2) * s), y0 = Math.floor(by - CH * s), y1 = Math.ceil(by);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const u = Math.floor((x + 0.5 - bx) / s + CW / 2), v = Math.floor((y + 0.5 - by) / s + CH);
    if (u < 0 || v < 0 || u >= CW || v >= CH || !m[v * CW + u] || a <= bayer(x, y)) continue; c.px(x, y, card.get(u, v)); }
}
function fitScale(c, txt, maxW, sc) { while (sc > 1 && c.measure(MAIN, txt, { scale: sc }) > maxW) sc--; return sc; }

// ---------------------------------------------------------------- stopwatch (tombstone card 126×150)
const CW = 126, CH = 150, CR = 63;
const inStone = (x, y) => (y >= CR ? x >= 0 && x < CW && y < CH : Math.hypot(x + 0.5 - CW / 2, y + 0.5 - CR) <= CR);
/** st: { a (alpha), rise 0..1, sweep 0..1, flash 0..1 }, P: resolved prop (x, y = card centre on screen, s, value, unit, label) */
export function drawStopwatch(c, t, P, st, th) {
  const card = new Canvas(CW, CH, "#000000"), m = new Uint8Array(CW * CH);
  const Pt = (x, y, col) => { if (x < 0 || y < 0 || x >= CW || y >= CH || !col) return; card.px(x, y, col); m[y * CW + x] = 1; };
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { if (!inStone(x, y)) continue;
    const edge = !inStone(x - 1, y) || !inStone(x + 1, y) || !inStone(x, y - 1) || !inStone(x, y + 1);
    const inner = inStone(x - 4, y) && inStone(x + 4, y) && inStone(x, y - 4) && inStone(x, y + 4), frame = !inner && inStone(x - 3, y) && inStone(x + 3, y) && inStone(x, y - 3) && inStone(x, y + 3);
    const tex = rnd(x * 17 + y * 131) > 0.86 ? 1 : rnd(x * 7 + y * 53) > 0.93 ? -1 : 0, lit = (x < 10 || y < 10) && !frame ? 1 : 0;
    Pt(x, y, edge ? O : frame ? th.accent : tex > 0 ? th.stone[1] : tex < 0 ? th.stone[2] : lit ? th.stone[1] : th.stone[0]); }
  const mark = (y0, y1) => { for (let y = y0; y < y1; y++) for (let x = 6; x < CW - 6; x++) { const p = card.get(x, y); if (p[0] || p[1] || p[2]) m[y * CW + x] = 1; } };
  const p = parseValue(P.value), unit = P.unit === "%" ? "%" : P.unit || "";
  // header: the label, else the value with its unit (fractions are known from the start: "1/6 S")
  { const txt = P.label || (p?.frac ? `${p.frac} ${unit}`.trim() : ""), sc = fitScale(card, txt, CW - 24, 2), w = card.measure(MAIN, txt, { scale: sc });
    if (txt) { card.text(MAIN, txt, R(CW / 2 - w / 2) + 1, 25, O, { scale: sc }); card.text(MAIN, txt, R(CW / 2 - w / 2), 24, th.gold, { scale: sc }); mark(24, 40); } }
  const frac = p?.frac ? p.num : 1, theta = TAU * frac * easeOut3(st.sweep), flash = st.flash;
  const dcx = 63, dcy = 83, dr = 30;
  for (let y = dcy - dr - 2; y <= dcy + dr + 2; y++) for (let x = dcx - dr - 2; x <= dcx + dr + 2; x++) {
    const d = Math.hypot(x + 0.5 - dcx, y + 0.5 - dcy); if (d > dr + 1.5) continue;
    let ang = Math.atan2(x + 0.5 - dcx, -(y + 0.5 - dcy)); if (ang < 0) ang += TAU;
    let col = d > dr - 0.5 ? (d > dr + 0.6 ? O : "#6E6AA8") : "#120E22";
    if (d <= dr - 2.5 && (ang <= theta || theta >= TAU - 1e-3)) col = flash > 0 ? (flash * 0.9 > bayer(x, y) ? th.hot : th.accent) : (0.78 > bayer(x, y) ? th.accent : "#5A2A30");
    Pt(x, y, col);
  }
  for (let k = 0; k < 12; k++) { const an = (k / 12) * TAU, x = R(dcx + Math.sin(an) * (dr - 4.5)), y = R(dcy - Math.cos(an) * (dr - 4.5)), key = k === 0 || (p?.frac && Math.abs(k / 12 - frac) < 1e-6); Pt(x, y, key ? th.gold : "#4A4070"); if (key) { Pt(x + 1, y, th.gold); Pt(x, y + 1, th.gold); Pt(x + 1, y + 1, th.gold); } }
  if (p?.frac && st.sweep > 0) for (let r = 4; r < dr - 3; r += 2) { const x = R(dcx + Math.sin(TAU * frac) * r), y = R(dcy - Math.cos(TAU * frac) * r); if (sm(st.sweep, 0, 0.3) > bayer(x + 2, y)) Pt(x, y, th.gold); }
  for (let r = 0; r <= dr - 5; r += 0.5) { const x = R(dcx + Math.sin(theta) * r - 0.5), y = R(dcy - Math.cos(theta) * r - 0.5); Pt(x, y, th.core); Pt(x + 1, y, r < 3 ? th.core : "#C9B8E0"); }
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) Pt(dcx + i, dcy + j, i * i + j * j <= 1 ? th.core : th.gold);
  // counter (only for plain numbers; a fraction is the header)
  if (p && !p.frac) { const digits = shownValue(P.value, easeOut3(st.sweep)), txt = `${digits}${unit ? " " + unit : ""}`, sc = fitScale(card, txt, CW - 16, 2), w = card.measure(MAIN, txt, { scale: sc }), x = R(CW / 2 - w / 2), cy0 = 124, col = flash > 0.2 ? th.hot : IV;
    card.text(MAIN, txt, x + 1, cy0 + 1, O, { scale: sc }); card.text(MAIN, txt, x, cy0, col, { scale: sc }); mark(cy0, cy0 + 16); }
  const s = lerp(0.88, 1, easeOut(st.rise)) * P.s, dy = (1 - easeOut(st.rise)) * 9;
  composite(c, card, m, P.x, P.y + (CH / 2) * P.s + dy, s, st.a, CW, CH);
  return { x0: P.x - (CW / 2) * s, y0: P.y - (CH / 2) * s + dy, x1: P.x + (CW / 2) * s, y1: P.y + (CH / 2) * s + dy };
}

// ---------------------------------------------------------------- counter plate (220×124): label line, big number, unit
const KW = 220, KH = 124;
export function drawCounter(c, t, P, st, th) {
  const card = new Canvas(KW, KH, "#000000"), m = new Uint8Array(KW * KH);
  for (let y = 0; y < KH; y++) for (let x = 0; x < KW; x++) {
    const corner = (x < 3 || x > KW - 4) && (y < 3 || y > KH - 4) && Math.hypot(x < 3 ? 3 - x : x - (KW - 4), y < 3 ? 3 - y : y - (KH - 4)) > 3; if (corner) continue;
    const edge = x === 0 || y === 0 || x === KW - 1 || y === KH - 1 || ((x < 3 || x > KW - 4) && (y < 3 || y > KH - 4) && Math.hypot(x < 3 ? 3 - x : x - (KW - 4), y < 3 ? 3 - y : y - (KH - 4)) > 2);
    const frame = !edge && (x === 3 || y === 3 || x === KW - 4 || y === KH - 4);
    card.px(x, y, edge ? O : frame ? th.accent : rnd(x * 13 + y * 71) > 0.88 ? th.stone[1] : y < 10 ? th.stone[1] : th.stone[0]); m[y * KW + x] = 1; }
  const p = parseValue(P.value), unit = P.unit === "%" ? "%" : P.unit || "", k = easeOut3(st.sweep);
  if (P.label) { const sc = fitScale(card, P.label, KW - 24, 2), w = card.measure(MAIN, P.label, { scale: sc }); card.text(MAIN, P.label, R(KW / 2 - w / 2) + 1, 15, O, { scale: sc }); card.text(MAIN, P.label, R(KW / 2 - w / 2), 14, th.gold, { scale: sc }); }
  const digits = p ? (p.frac ? (st.sweep > 0.3 ? p.frac : "") : shownValue(P.value, k)) : "", sc = fitScale(card, p ? (p.frac ? p.frac : String(P.value)) : "0", KW - 24, 6), w = card.measure(MAIN, digits, { scale: sc });
  const y0 = P.label ? 38 : 26, col = st.flash > 0.25 ? th.hot : IV;
  // a soft glow behind the number while it counts / flashes
  const glow = Math.max(0.25 * Math.sin(Math.PI * clamp01(st.sweep)), 0.6 * st.flash);
  if (glow > 0) for (let y = y0 - 4; y < y0 + 7 * sc + 4; y++) for (let x = 12; x < KW - 12; x++) if (glow * 0.5 > bayer(x, y)) card.px(x, y, th.stone[1]);
  card.text(MAIN, digits, R(KW / 2 - w / 2) + 2, y0 + 2, O, { scale: sc }); card.text(MAIN, digits, R(KW / 2 - w / 2), y0, col, { scale: sc });
  if (unit) { const uw = card.measure(MAIN, unit, { scale: 2 }); card.text(MAIN, unit, R(KW / 2 - uw / 2) + 1, KH - 25, O, { scale: 2 }); card.text(MAIN, unit, R(KW / 2 - uw / 2), KH - 26, th.gold, { scale: 2 }); }
  const s = lerp(0.88, 1, easeOut(st.rise)) * P.s, dy = (1 - easeOut(st.rise)) * 9;
  composite(c, card, m, P.x, P.y + (KH / 2) * P.s + dy, s, st.a, KW, KH);
  return { x0: P.x - (KW / 2) * s, y0: P.y - (KH / 2) * s + dy, x1: P.x + (KW / 2) * s, y1: P.y + (KH / 2) * s + dy };
}
