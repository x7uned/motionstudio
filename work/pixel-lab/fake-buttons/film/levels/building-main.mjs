// BUILDING level of «You've been pressing fake buttons» (pixel film, Kagenami): the office building cut open like a
// dollhouse — lobby with the elevator, the open shaft, the office with the (fake) thermostat, the archive, the roof
// and the basement — and its people. Static art is baked once (building-static.mjs); this module draws everything
// that moves, in world coordinates, as pure functions of t. Beats: building-kit.mjs (T), all derived from EV.
import { EV, FLOOR } from "../timeline.mjs";
import { baked, P as PAL } from "./building-static.mjs";
import { G, T, CAR, CPANEL, CLOSE_BTN, HPANEL, KEYSW, THERMO_P, BOX, XSTRIP, PHONE, COLLEAGUE, DIAL_STEP, RING_LEN, carY, doorOpen, worldOf, gate, clip,
  R, sm, lerp, ease, clamp01, win, rnd, mix, bayer, fade, OUT, box, label, textW, vgrad, MAIN, TINY } from "./building-kit.mjs";
import { drawPerson, heart } from "./building-people.mjs";
import { worker, oldMan, firefighter, colleague, closeLit, jabAt, dialAngle, dialValue } from "./building-cast.mjs";

export const RANGE = [G.x0 - 10, G.x1 + 10];

// ---------------------------------------------------------------- people (with view crossfades and dissolves)
function person(g, st) {
  if (!st) return;
  const a = st.a ?? 1, base = a < 1 ? gate(g, a) : g;
  if (!st.front || st.k <= 0.001) { drawPerson(base, st.cfg, st.side); return; }
  if (st.k >= 0.999) { drawPerson(base, st.cfg, st.front); return; }
  drawPerson(gate(base, st.k, true), st.cfg, st.side);      // side where bayer ≥ k
  drawPerson(gate(base, st.k), st.cfg, st.front);           // front where bayer < k
}

// ---------------------------------------------------------------- shaft: counterweight, ropes
const CW = { x0: SH(0) + 105, x1: SH(0) + 125, h: 96, top0: G.roof + 40 };
function SH(k) { return G.sh0 + k; }
function shaft(g, t) {
  const cy = carY(t), cwTop = CW.top0 - cy, mTop = G.roof - 24;
  // counterweight ropes + the weight (stacked plates, a hazard stripe at the bottom)
  for (const dx of [6, 13]) { const x = CW.x0 + dx; g.rect(x, mTop, 1, cwTop - mTop, "#8A92A6"); for (let y = mTop + ((-cy * 1) % 9 + 9) % 9; y < cwTop; y += 9) g.px(x, R(y), "#D8DEEA"); }
  g.rect(CW.x0 - 1, cwTop - 1, CW.x1 - CW.x0 + 2, CW.h + 2, OUT);
  for (let y = cwTop; y < cwTop + CW.h; y++) { const k = (y - cwTop) % 12; g.rect(CW.x0, y, CW.x1 - CW.x0, 1, k === 0 ? "#2A2834" : k < 3 ? "#7A7A8C" : "#545466"); }
  for (let x = CW.x0; x < CW.x1; x++) for (let y = cwTop + CW.h - 8; y < cwTop + CW.h; y++) g.px(x, y, (((x + y) >> 2) & 1) ? "#F4C430" : "#1A1A1A");
  // hoist ropes from the car's crosshead up to the machine room (rope marks move with the car)
  const hitch = cy - CAR.h - 12;
  for (const x of [484, 490, 496]) { g.rect(x, mTop, 1, hitch - mTop, "#9AA2B6"); for (let y = mTop + ((cy % 11) + 11) % 11; y < hitch; y += 11) g.px(x, R(y), "#E8ECF4"); }
  // travelling cable: hangs from the car bottom in a loop to the shaft wall
  const cb = cy + 40, mid = Math.max(cb + 30, (cb + -120) / 2 + 160);
  for (let i = 0; i <= 40; i++) { const u = i / 40, x = lerp(G.sh0 + 6, G.sh0 + 16, u), y = u < 0.5 ? lerp(cb, mid, Math.sin(u * Math.PI)) : lerp(-120, mid, Math.sin(u * Math.PI)); }
}

// ---------------------------------------------------------------- the car: interior (behind people) and front (doors)
const DOOR = { x0: CAR.door[0], x1: CAR.door[1] }, WOOD = ["#5A3018", "#7A4424", "#9A5C30", "#B8783E", "#D4985A"];
function carBack(g, t) {
  const y0 = carY(t), top = y0 - CAR.h, x0 = DOOR.x0, x1 = DOOR.x1, dh = CAR.doorH;
  // back wall (warm wood panels), side walls in perspective, ceiling light, floor
  for (let y = y0 - dh; y < y0; y++) for (let x = x0; x < x1; x++) { const pn = ((x - x0) % 25 === 0), u = (y - (y0 - dh)) / dh; g.px(x, y, pn ? WOOD[1] : WOOD[u < 0.12 ? 4 : u > 0.85 ? 2 : 3]); }
  g.poly([[x0, y0 - dh], [x0 + 9, y0 - dh + 8], [x0 + 9, y0 - 6], [x0, y0]], WOOD[1]); g.poly([[x1, y0 - dh], [x1 - 9, y0 - dh + 8], [x1 - 9, y0 - 6], [x1, y0]], WOOD[1]);
  g.rect(x0 + 9, y0 - dh + 8, 1, dh - 14, WOOD[0]); g.rect(x1 - 10, y0 - dh + 8, 1, dh - 14, WOOD[0]);
  g.rect(x0, y0 - dh, x1 - x0, 8, "#E8E0D0"); g.rect(x0 + 20, y0 - dh + 2, x1 - x0 - 40, 3, "#FFFBEA");
  g.tint(x0, y0 - dh + 8, x1 - x0, 90, (X, Y) => Math.max(0, 1 - (Y - (y0 - dh + 8)) / 90) * 0.35, "#FFF4D8", 3);
  g.rect(x0 + 10, y0 - 70, x1 - x0 - 20, 3, "#E0A848"); g.rect(x0 + 10, y0 - 70, x1 - x0 - 20, 1, "#FFE0A0");          // handrail
  g.rect(x0 + 9, y0 - 6, x1 - x0 - 18, 6, "#3A3038"); g.rect(x0, y0 - 1, x1 - x0, 1, "#2A2028");                       // floor
  for (let x = x0 + 10; x < x1 - 10; x += 6) g.px(x, y0 - 3, "#5A4E58");
  // the inside button panel: floors 3 2 1, OPEN ◀|▶, CLOSE ▶|◀ (lights on every jab — and nothing happens)
  const px = CAR.x0 + CPANEL.x, py = y0 + CPANEL.y, pw = CPANEL.w, ph = CPANEL.h;
  g.rect(px - 1, py - 1, pw + 2, ph + 2, OUT); vgrad(g, px, py, pw, ph, ["#E8ECF2", "#C8CED8", "#A8B0BC"]); g.rect(px + 1, py + 1, pw - 2, 1, "#FFFFFF");
  ["3", "2", "1"].forEach((n, i) => { const by = py + 6 + i * 10; g.disc(px + 10, by, 4, OUT); g.disc(px + 10, by, 3, i === 1 ? mix("#F4F4F8", "#FFE080", win(t, EV.slowly + 0.4, T.ride[1] + 0.3, 0.2, 0.25)) : "#F4F4F8"); g.text(TINY, n, px + 9, by - 2, "#3A3A48"); });
  const lit = closeLit(t);
  icon(g, px + 10, py + 40, "open", 0); icon(g, px + 10, y0 + CLOSE_BTN.y, "close", lit);
}
/** Elevator door icons: "open" ◀|▶, "close" ▶|◀ in a small round button; lit 0..1 glows. */
function icon(g, cx, cy, kind, lit = 0, col = "#FFB030") {
  g.disc(cx, cy, 5, OUT); g.disc(cx, cy, 4, lit > 0.02 ? mix("#F4F4F8", col, lit) : "#F4F4F8");
  if (lit > 0.3) g.ring(cx, cy, 6, mix("#FFFFFF", col, 0.4));
  const ic = lit > 0.5 ? "#7A3A00" : "#3A3A48";
  if (kind === "close") { g.poly([[cx - 4, cy - 2], [cx - 1, cy], [cx - 4, cy + 3]], ic); g.poly([[cx + 4, cy - 2], [cx + 1, cy], [cx + 4, cy + 3]], ic); g.rect(cx, cy - 2, 1, 5, ic); }
  else { g.poly([[cx - 1, cy - 2], [cx - 4, cy], [cx - 1, cy + 3]], ic); g.poly([[cx + 2, cy - 2], [cx + 5, cy], [cx + 2, cy + 3]], ic); g.rect(cx, cy - 2, 1, 5, ic); }
}
function carFront(g, t) {
  const y0 = carY(t), top = y0 - CAR.h, o = doorOpen(t), x0 = CAR.x0, x1 = CAR.x1, dh = CAR.doorH;
  // doors: two brushed-steel leaves sliding behind the front posts
  const leafW = (DOOR.x1 - DOOR.x0) / 2, slide = (leafW - 3) * o;
  const steel = (x, y, lx0) => { const u = (x - lx0) / leafW; return (x + y * 0) % 7 === 0 ? "#9AA2B0" : u < 0.08 ? "#E8ECF2" : u > 0.9 ? "#8A92A2" : "#BCC4D0"; };
  for (const [lx0, lx1] of [[DOOR.x0 - slide, DOOR.x0 + leafW - slide], [DOOR.x0 + leafW + slide, DOOR.x1 + slide]]) {
    for (let y = y0 - dh; y < y0; y++) for (let x = Math.max(x0, R(lx0)); x < Math.min(x1, R(lx1)); x++) g.px(x, y, steel(x, y, lx0));
    if (R(lx0) >= x0) g.rect(R(lx0), y0 - dh, 1, dh, OUT); if (R(lx1) - 1 < x1) g.rect(R(lx1) - 1, y0 - dh, 1, dh, OUT);
    for (let k = 0; k < 14; k++) { const gx = R(lx0) + 8 + k, gy = y0 - dh + 40 + k * 2; if (gx > x0 && gx < x1) { g.px(gx, gy, "#FFFFFF"); g.px(gx, gy + 1, "#F4F8FC"); } }
  }
  // front posts + transom (with the door timer arc and the car's floor digit), sill, crosshead above
  const postC = ["#6E7686", "#9AA2B2", "#C4CAD6", "#E2E6EE"];
  for (const [a, b] of [[x0, DOOR.x0], [DOOR.x1, x1]]) { g.rect(a, top, b - a, CAR.h, OUT); vgrad(g, a + 1, top + 1, b - a - 2, CAR.h - 1, [postC[3], postC[2], postC[2], postC[1]]); g.rect(a + 2, top + 1, 1, CAR.h - 2, "#FFFFFF"); g.rect(b - 3, top + 1, 1, CAR.h - 2, postC[0]); }
  g.rect(DOOR.x0, top, DOOR.x1 - DOOR.x0, CAR.h - dh, OUT); vgrad(g, DOOR.x0, top + 1, DOOR.x1 - DOOR.x0, CAR.h - dh - 2, [postC[3], postC[2], postC[1]]);
  g.rect(DOOR.x0, y0 - dh - 1, DOOR.x1 - DOOR.x0, 1, OUT);
  g.rect(x0 - 2, y0, x1 - x0 + 4, 6, OUT); g.rect(x0 - 1, y0 + 1, x1 - x0 + 2, 4, "#8A92A2"); g.rect(x0 - 1, y0 + 1, x1 - x0 + 2, 1, "#E2E6EE");
  g.rect(DOOR.x0, y0 + 6, DOOR.x1 - DOOR.x0, 34, OUT); g.rect(DOOR.x0 + 1, y0 + 6, DOOR.x1 - DOOR.x0 - 2, 33, "#4A5060");     // toe guard under the car
  g.rect(x0 + 4, top - 12, x1 - x0 - 8, 12, OUT); g.rect(x0 + 5, top - 11, x1 - x0 - 10, 10, "#5A6070"); g.rect(x0 + 5, top - 11, x1 - x0 - 10, 1, "#9AA2B2");
  g.rect(478, top - 16, 24, 6, OUT); g.rect(479, top - 15, 22, 4, "#8A92A6");
  // car floor digit (left of the transom): 1 → 2 during the ride, with a lit ▲
  const fl = 1 + clamp01(-y0 / FLOOR), dx = DOOR.x0 + 4, dy = top + 10;
  g.rect(dx, dy, 16, 14, OUT); g.rect(dx + 1, dy + 1, 14, 12, "#1A0E10");
  digitX(g, String(Math.floor(fl)), String(Math.ceil(fl)), fl - Math.floor(fl), dx + 6, dy + 4, "#FFB040");
  const goingUp = win(t, T.ride[0] - 0.1, T.ride[1] - 0.05, 0.15, 0.25);
  if (goingUp > 0.02) { const gg = fade(g, goingUp); gg.poly([[dx + 1, dy - 2], [dx + 15, dy - 2], [dx + 8, dy - 8]], "#FFB040"); }
  // door timer arc ("WAIT"), centred above the doors
  timerArc(g, t, R((DOOR.x0 + DOOR.x1) / 2) + 2, top + 23);
}
/** Two digits crossfading (ordered dither) by k: a → b. */
function digitX(g, a, b, k, x, y, col, font = MAIN, scale = 1) {
  if (a === b || k <= 0.02) { g.text(font, a, x, y, col, { scale }); return; }
  if (k >= 0.98) { g.text(font, b, x, y, col, { scale }); return; }
  fade(g, 1 - k).text(font, a, x, y, col, { scale }); fade(g, k).text(font, b, x, y, col, { scale });
}
function timerArc(g, t, cx, cy) {
  const [a0, a1] = T.arc, vis = Math.min(sm(t, a0, a0 + 0.3), 1 - sm(t, T.doorsClose[1] - 0.1, T.doorsClose[1] + 0.25));
  if (vis <= 0) return;
  const gg = fade(g, vis), p = clamp01((t - a0 - 0.15) / (a1 - a0 - 0.15)), done = sm(t, a1 - 0.05, a1 + 0.12), r = 15;
  gg.disc(cx, cy, r + 3, OUT); gg.disc(cx, cy, r + 2, "#2A2230");
  const fillC = mix("#FFB030", "#5AD86A", done);
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x, y); if (d > r + 0.5 || d < r - 4) continue; let ang = Math.atan2(x, -y); if (ang < 0) ang += 2 * Math.PI; gg.px(cx + x, cy + y, ang / (2 * Math.PI) <= p ? fillC : "#4A3E52"); }
  if (done < 1) { const s = 0.75 + 0.25 * Math.sin(t * 9); fade(gg, 1 - done).text(TINY, "WAIT", cx - 7, cy - 2, mix("#8A7A90", "#FFE0A0", s)); }
  { const c2 = fade(g, vis * sm(t, a1, a1 + 0.15)); c2.line(cx - 5, cy, cx - 2, cy + 3, "#5AD86A"); c2.line(cx - 2, cy + 3, cx + 5, cy - 4, "#5AD86A"); c2.line(cx - 5, cy + 1, cx - 2, cy + 4, "#5AD86A"); c2.line(cx - 2, cy + 4, cx + 5, cy - 3, "#5AD86A"); }
}

// ---------------------------------------------------------------- lobby: hall panel lamps, floor indicators
function hallPanel(g, t) {
  // keyswitch slot (OFF vertical → ON horizontal) and the red CLOSE icon lamp under it
  const k = ease((t - T.ffTurn[0]) / (T.ffTurn[1] - T.ffTurn[0])), a = -Math.PI / 2 + (Math.PI / 2) * k;
  g.line(R(KEYSW.x - Math.cos(a) * 3), R(KEYSW.y - Math.sin(a) * 3), R(KEYSW.x + Math.cos(a) * 3), R(KEYSW.y + Math.sin(a) * 3), OUT);
  const red = Math.min(sm(t, T.ffRed[0], T.ffRed[1]), 1 - sm(t, T.ride[1] - 0.2, T.ride[1] + 0.3));
  const lx = HPANEL.x + HPANEL.w / 2, ly = HPANEL.y + HPANEL.h - 11;
  if (red > 0.01) { const gg = fade(g, red); gg.rect(lx - 7, ly + 1, 14, 9, "#FF3A2A"); gg.rect(lx - 7, ly + 1, 14, 1, "#FFB0A0"); g.tint(lx - 20, ly - 12, 40, 34, (X, Y) => Math.max(0, 1 - Math.hypot(X - lx, Y - ly - 5) / 18) * 0.5 * red, "#FF5A3A", 3); }
  const ic = red > 0.5 ? "#4A0A08" : "#6A4A50";
  g.poly([[lx - 5, ly + 3], [lx - 1, ly + 5], [lx - 5, ly + 8]], ic); g.poly([[lx + 5, ly + 3], [lx + 1, ly + 5], [lx + 5, ly + 8]], ic); g.rect(lx, ly + 3, 1, 6, ic);
}
function indicators(g, t) {
  const fl = 1 + clamp01(-carY(t) / FLOOR), goingUp = win(t, T.ride[0] - 0.1, T.ride[1] - 0.05, 0.15, 0.25);
  for (const F of G.floors) {
    const y = F - 270 + 3, x = 479;
    digitX(g, String(Math.floor(fl)), String(Math.ceil(fl)), fl - Math.floor(fl), x + 11, y + 1, "#FFB040");
    const gg = fade(g, 0.25 + 0.75 * goingUp); gg.poly([[x + 2, y + 6], [x + 8, y + 6], [x + 5, y + 2]], goingUp > 0.5 ? "#FFB040" : "#5A3A20");
  }
}

// ---------------------------------------------------------------- office: thermostat, building computer, X-ray, phone
function thermostat(g, t) {
  const { x, y, r } = THERMO_P, a = dialAngle(t), v = dialValue(t);
  // ring knob with grip notches (rotates), the round LCD in the middle
  g.disc(x, y, r + 1, OUT); g.disc(x, y, r, "#D8D2C4");
  for (let i = 0; i < 16; i++) { const b = a + (i / 16) * Math.PI * 2; g.px(R(x + Math.cos(b) * (r - 1)), R(y + Math.sin(b) * (r - 1)), "#A8A090"); }
  g.ering(x, y, r - 2, r - 2, "#EEE8DA", Math.PI * 1.05, Math.PI * 1.6);
  g.disc(R(x + Math.cos(a) * (r - 3)), R(y + Math.sin(a) * (r - 3)), 1, "#C8302E");          // the pointer notch
  g.disc(x, y, r - 5, OUT); g.disc(x, y, r - 6, "#2A4A3E");
  const lo = Math.floor(v + 1e-6), k = 1 - (v - lo);          // crossfade "22" → "21" …
  const s0 = String(Math.ceil(v - 1e-6)), s1 = String(lo);
  const tw = textW(TINY, "22") + 4, tx = x - R(tw / 2), ty = y - 2;
  if (s0 === s1 || k >= 0.98) { g.text(TINY, s1, tx, ty, "#9AF0B0"); }
  else { fade(g, 1 - k).text(TINY, s0, tx, ty, "#9AF0B0"); fade(g, k).text(TINY, s1, tx, ty, "#9AF0B0"); }
  g.text(TINY, "°", tx + 8, ty - 1, "#9AF0B0");
}
function computerBox(g, t) {
  const { x, y, w, h } = BOX, hl = win(t, T.xray[1] - 0.05, T.xrayOut[1] - 0.6, 0.25, 0.4);
  label(g, MAIN, "AUTO", x + 6, y + 7, "#7CF0A0", 1, "#0E2A22"); label(g, MAIN, "22°", x + 36, y + 7, "#7CF0A0", 1, "#0E2A22");
  g.px(x + w - 8, y + 6, mix("#5A2A28", "#FF6A50", 0.5 + 0.5 * Math.sin(t * Math.PI * 2)));
  if (hl > 0.02) { const pulse = 0.6 + 0.4 * Math.sin(t * 7); const gg = fade(g, hl * pulse); gg.rframe(x - 3, y - 3, w + 6, h + 6, "#7CF0A0", 2); gg.rframe(x - 4, y - 4, w + 8, h + 8, "#2A8A5A", 2); }
}
const XRAY_C = { bg: "#0E1838", grid: "#16244E", line: "#6FD6FF", dim: "#2F6FB0" };
function xray(g, t) {
  const open = sm(t, T.xray[0], T.xray[1]) * (1 - sm(t, T.xrayOut[0], T.xrayOut[1])); if (open <= 0) return;
  const { x0, x1, y0, y1 } = XSTRIP, yy = R(lerp(y1, y0, ease(open)));     // the slot opens upward from the thermostat
  const keep = clip(g, (X, Y) => Y >= yy && Y < y1 && X >= x0 && X < x1);
  for (let y = yy; y < y1; y++) for (let x = x0; x < x1; x++) keep.px(x, y, (x - x0) % 8 === 0 || (y - y0) % 8 === 0 ? XRAY_C.grid : XRAY_C.bg);
  // studs inside the wall, the real duct-side cable going away (dim), the thermostat's wire ending in a cap
  for (const sx of [x0 + 4, x1 - 9]) { keep.rect(sx, y0, 5, y1 - y0, XRAY_C.dim); keep.rect(sx + 1, y0, 3, y1 - y0, XRAY_C.bg); }
  const wx = THERMO_P.x, capY = y0 + 30;
  for (let y = capY + 6; y < y1; y++) { keep.px(wx, y, "#E8F4FF"); keep.px(wx + 1, y, XRAY_C.line); }
  keep.rect(wx - 3, capY, 8, 7, OUT); keep.rect(wx - 2, capY + 1, 6, 5, "#E8443A"); keep.rect(wx - 2, capY + 1, 6, 1, "#FF9A8A");   // the capped stub
  const sp = win(t, T.notConnected[0], T.notConnected[0] + 0.6, 0.1, 0.4);
  if (sp > 0) { const gg = fade(keep, sp); for (const [dx, dy] of [[-6, -4], [7, -5], [-7, 3], [8, 4], [0, -8]]) gg.px(wx + dx, capY + 3 + dy, "#FFE080"); }
  // frame of the slot
  const fr = fade(g, open); fr.rect(x0 - 2, yy - 2, x1 - x0 + 4, 2, XRAY_C.line); fr.rect(x0 - 2, yy, 2, y1 - yy, XRAY_C.line); fr.rect(x1, yy, 2, y1 - yy, XRAY_C.line);
  fr.rect(x0 - 3, yy - 3, x1 - x0 + 6, 1, OUT); fr.rect(x0 - 3, yy - 2, 1, y1 - yy + 2, OUT); fr.rect(x1 + 2, yy - 2, 1, y1 - yy + 2, OUT);
  if (open > 0.5) fade(g, sm(open, 0.5, 1)).text(TINY, "X-RAY", x0 + 2, yy + 3, XRAY_C.line);
}
function notConnected(g, t) {
  const a = sm(t, T.notConnected[0], T.notConnected[1]) * (1 - sm(t, T.xrayOut[0], T.xrayOut[1])); if (a <= 0) return;
  const gg = fade(g, a), x1 = XSTRIP.x0 - 8, y = XSTRIP.y0 + 4, s = 2, l1 = "NOT", l2 = "CONNECTED";
  const w2 = textW(MAIN, l2, s), w1 = textW(MAIN, l1, s), bx = x1 - w2 - 8, pop = R((1 - ease(clamp01((t - T.notConnected[0]) / 0.25))) * 4);
  gg.rrect(bx - 1, y - 1 + pop, w2 + 14, 42, OUT, 2); gg.rrect(bx, y + pop, w2 + 12, 40, "#3A0A12", 2); gg.rect(bx + 2, y + 1 + pop, w2 + 8, 1, "#8A2A34");
  for (const [txt, ty, w] of [[l1, y + 5, w1], [l2, y + 23, w2]]) { gg.text(MAIN, txt, bx + 6 + R((w2 - w) / 2) + 1, ty + 1 + pop, OUT, { scale: s }); gg.text(MAIN, txt, bx + 6 + R((w2 - w) / 2), ty + pop, "#FF5A4A", { scale: s }); }
  // pointer to the cap
  gg.line(x1 + 6, y + 20 + pop, THERMO_P.x - 4, XSTRIP.y0 + 33, "#FF5A4A"); gg.line(x1 + 6, y + 21 + pop, THERMO_P.x - 4, XSTRIP.y0 + 34, OUT);
}
function phone(g, t) {
  // the desk phone on desk B rings in bursts (complaints) and stops on "stop"
  let ring = 0; for (const tr of T.ring) ring = Math.max(ring, win(t, tr, tr + RING_LEN, 0.05, 0.1));
  ring *= 1 - sm(t, T.ringStop[0], T.ringStop[1]);
  const shake = ring > 0.02 ? R(Math.sin(t * 2 * Math.PI * 14) * 1.2 * ring) : 0, { x, y } = PHONE;
  g.rect(x - 9, y + 4, 20, 8, OUT); g.rect(x - 8, y + 5, 18, 6, "#3A3A48"); g.rect(x - 8, y + 5, 18, 1, "#6A6A7E");
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.px(x - 5 + i * 3, y + 7 + j * 2, "#B8B8C8");
  g.rect(x - 11 + shake, y - 1 - (ring > 0.02 ? R(Math.abs(Math.sin(t * 2 * Math.PI * 7)) * 2 * ring) : 0), 24, 5, OUT); g.rect(x - 10 + shake, y - (ring > 0.02 ? R(Math.abs(Math.sin(t * 2 * Math.PI * 7)) * 2 * ring) : 0), 22, 3, "#4A4A5A");
  g.px(x + 8, y + 9, mix("#5A2A2A", "#FF4A3A", ring * (0.5 + 0.5 * Math.sin(t * Math.PI * 8))));
  if (ring > 0.05) { const gg = fade(g, ring); for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { const r = 14 + k * 5 + ((t * 10) % 1) * 2; g.ering && gg.ering(x + 1, y + 2, r, r * 0.8, k ? "#FFD060" : "#FFF0A0", s > 0 ? -0.6 : Math.PI - 0.4, s > 0 ? 0.4 : Math.PI + 0.6); } }
}

// ---------------------------------------------------------------- bubbles, hearts, the X-ray lens over the car's panel
function bubble(g, x, y, w, h, a, tailX) {
  const gg = fade(g, a); gg.rrect(x - 1, y - 1, w + 2, h + 2, OUT, 2); gg.rrect(x, y, w, h, "#FFFFFF", 2); gg.rect(x + 2, y + h - 3, w - 4, 2, "#E4E8F0");
  gg.poly([[tailX - 4, y + h - 1], [tailX + 3, y + h - 1], [tailX - 6, y + h + 7]], OUT); gg.poly([[tailX - 3, y + h - 1], [tailX + 2, y + h - 1], [tailX - 5, y + h + 5]], "#FFFFFF");
}
function brr(g, t) {
  const a = Math.min(sm(t, T.brrIn[0], T.brrIn[1]), 1 - sm(t, BACK_OUT, BACK_OUT + 0.4)); if (a <= 0) return;
  const k = sm(t, T.brrHeart[0], T.brrHeart[1]), x = COLLEAGUE.x + 22, y = COLLEAGUE.y - 196, w = 46, h = 24;
  const wob = (1 - k) * Math.sin(t * 2 * Math.PI * 5);
  bubble(g, x, y, w, h, a, x + 8);
  if (k < 0.999) { const gg = fade(g, a * (1 - k)); ["B", "R", "R"].forEach((ch, i) => gg.text(MAIN, ch, x + 6 + i * 12 + R(wob * (i % 2 ? 1 : -1)), y + 5 + R(Math.sin(t * 30 + i) * 0.6 * (1 - k)), "#3A7AD8", { scale: 2 })); }
  if (k > 0.001) heart(fade(g, a * k), x + w / 2, y + 7, 3, "#F2547A");
}
const BACK_OUT = EV.complainingEnd + 0.05;
function hearts(g, t) {
  const src = [[THERMO_P.x + 60, -300 - 170], [THERMO_P.x + 60, -300 - 170], [COLLEAGUE.x, -300 - 165], [COLLEAGUE.x, -300 - 165]];
  T.hearts.forEach((th, i) => {
    const u = (t - th) / 1.2; if (u <= 0 || u >= 1) return;
    const [sx, sy] = src[i % 4], a = Math.min(sm(u, 0, 0.12), 1 - sm(u, 0.7, 1));
    heart(fade(g, a), sx + Math.sin(u * 6 + i) * 5 + (i % 2 ? -10 : 12), sy - 44 * ease(u), 2, i % 3 === 2 ? "#FF7AA0" : "#F2547A");
  });
}
const LENS = { x: 315, y: -212, r: 58 };
function lens(c, V, g, t) {
  const [l0, l1] = T.lens, open = Math.min(ease((t - l0) / 0.34), 1 - ease((t - (l1 - 0.34)) / 0.34)); if (open <= 0) return;
  const r = LENS.r * open, X = V.X(LENS.x), Y = V.Y(LENS.y);
  // leader line from the rim to the CLOSE button in the car (drawn first, under the lens)
  { const tx = V.X(CLOSE_BTN.x), ty = V.Y(CLOSE_BTN.y), dx = tx - X, dy = ty - Y, d = Math.hypot(dx, dy), sx = X + (dx / d) * r, sy = Y + (dy / d) * r, gg = fade(c, sm(open, 0.3, 1));
    for (let i = 0; i <= 1; i += 1 / d) { const x = R(lerp(sx, tx - (dx / d) * 8, i)), y = R(lerp(sy, ty - (dy / d) * 8, i)); gg.px(x, y + 1, OUT); if ((R(i * d) >> 1) % 2 === 0) gg.px(x, y, XRAY_C.line); }
    gg.ring(R(tx), R(ty), 8, OUT); gg.ring(R(tx), R(ty), 7, XRAY_C.line); }
  // the content: a magnified schematic of the panel's back (screen space, centred on the lens)
  const inside = (x, y) => (x - X) ** 2 + (y - Y) ** 2 <= r * r;
  const s = Object.create(c); s.px = (x, y, col) => { if (inside(x + 0.5, y + 0.5)) c.px(x, y, col); };
  for (let y = R(Y - r); y <= R(Y + r); y++) for (let x = R(X - r); x <= R(X + r); x++) s.px(x, y, (x - X + 400) % 9 === 0 || (y - Y + 400) % 9 === 0 ? XRAY_C.grid : XRAY_C.bg);
  // the big CLOSE button (left), its wire → the TIMER chip (clock) → a blocked wire to the DOORS
  const bx = X - 31, by = Y + 2, lit = closeLit(t);
  s.disc(bx, by, 13, XRAY_C.line); s.disc(bx, by, 11, lit > 0.05 ? mix(XRAY_C.bg, "#FFB030", lit) : XRAY_C.bg);
  const ic = lit > 0.4 ? "#3A1A00" : XRAY_C.line;
  s.poly([[bx - 8, by - 5], [bx - 2, by], [bx - 8, by + 6]], ic); s.poly([[bx + 8, by - 5], [bx + 2, by], [bx + 8, by + 6]], ic); s.rect(bx, by - 5, 1, 11, ic);
  s.text(TINY, "CLOSE", bx - 9, by + 17, XRAY_C.line);
  const chipX = X - 2, chipY = Y - 14, cw = 30, chh = 32;
  for (let x = bx + 13; x < chipX; x++) { s.px(x, by, "#E8F4FF"); s.px(x, by + 1, XRAY_C.line); }
  s.rect(chipX, chipY, cw, chh, XRAY_C.line); s.rect(chipX + 1, chipY + 1, cw - 2, chh - 2, "#18264E");
  for (let i = 0; i < 3; i++) { s.rect(chipX + 5 + i * 9, chipY - 3, 3, 3, XRAY_C.dim); s.rect(chipX + 5 + i * 9, chipY + chh, 3, 3, XRAY_C.dim); }
  const ccx = chipX + 15, ccy = chipY + 12, p = clamp01((t - T.arc[0] - 0.15) / (T.arc[1] - T.arc[0] - 0.15));
  s.ring(ccx, ccy, 8, "#E8F4FF"); for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) { if (x * x + y * y > 49) continue; let an = Math.atan2(x, -y); if (an < 0) an += 2 * Math.PI; if (an / (2 * Math.PI) <= p) s.px(ccx + x, ccy + y, "#3A5A9A"); }
  const hand = p * 2 * Math.PI; s.line(ccx, ccy, R(ccx + Math.sin(hand) * 6), R(ccy - Math.cos(hand) * 6), "#FFE080");
  s.text(TINY, "TIMER", chipX + 6, chipY + chh - 7, "#E8F4FF");
  // the output wire to the doors, blocked by a red bar while the timer runs
  const ox = chipX + cw, oy = by;
  for (let x = ox; x < X + 56; x++) s.px(x, oy, XRAY_C.dim);
  s.text(TINY, "DOORS", ox + 3, oy + 10, XRAY_C.line);
  const blk = 1 - sm(t, T.arc[1] - 0.05, T.arc[1] + 0.2);
  s.rect(ox + 7, oy - 7, 4, 15, mix(XRAY_C.bg, "#FF5A4A", blk)); s.rect(ox + 6, oy - 8, 6, 1, OUT);
  // each jab: a pulse runs along the wire and dies at the chip (red flash)
  for (const tj of T.jabs) {
    const u = (t - tj) / 0.28; if (u < 0 || u > 1.6) continue;
    if (u <= 1) { const px = R(lerp(bx + 13, chipX, ease(u))); s.disc(px, by, 2, "#FFF4A0"); s.px(px - 3, by, "#FFB030"); }
    else { const k = 1 - (u - 1) / 0.6; const gg = fade(s, k); gg.rect(chipX - 2, chipY - 2, cw + 4, 2, "#FF5A4A"); gg.rect(chipX - 2, chipY + chh, cw + 4, 2, "#FF5A4A"); gg.line(chipX - 7, by - 5, chipX - 2, by, "#FF5A4A"); gg.line(chipX - 2, by - 5, chipX - 7, by, "#FF5A4A"); }
  }
  // rim: dark outline, metal ring, highlight; the X-RAY tag on top
  for (let y = R(Y - r - 5); y <= R(Y + r + 5); y++) for (let x = R(X - r - 5); x <= R(X + r + 5); x++) {
    const d = Math.hypot(x + 0.5 - X, y + 0.5 - Y) - r; if (d < -0.5 || d > 4.5) continue;
    const ang = Math.atan2(y - Y, x - X), hi = Math.cos(ang + 2.3) > 0.6;
    c.px(x, y, d > 3.5 || d < 0.5 ? OUT : hi ? "#E8F4FF" : d < 2 ? "#8AA8C8" : "#5A7898");
  }
  if (open > 0.6) { const gg = fade(c, sm(open, 0.6, 1)), tw = textW(TINY, "X-RAY") + 6; gg.rrect(R(X - tw / 2), R(Y - r - 9), tw, 9, OUT, 1); gg.rrect(R(X - tw / 2) + 1, R(Y - r - 8), tw - 2, 7, "#16244E", 1); gg.text(TINY, "X-RAY", R(X - tw / 2) + 3, R(Y - r - 7), XRAY_C.line); }
}

// ---------------------------------------------------------------- passes
const vis = (V, x0, x1, y0, y1) => x1 > V.x0 - 20 && x0 < V.x1 + 20 && y1 > V.y0 - 20 && y0 < V.y1 + 20;
export function back(c, V, t) {
  const L = baked(); L.back.blit(c, V);
  const g = worldOf(c, V);
  if (vis(V, G.sh0, G.sh1, G.roof - 100, G.base.floor)) { shaft(g, t); }
  if (vis(V, CAR.x0, CAR.x1, carY(t) - CAR.h - 20, carY(t) + 40)) carBack(g, t);
  if (vis(V, HPANEL.x - 10, HPANEL.x + 50, HPANEL.y, HPANEL.y + HPANEL.h)) hallPanel(g, t);
  if (vis(V, 0, 420, -570, -300)) { thermostat(g, t); computerBox(g, t); xray(g, t); }
  if (vis(V, 0, 140, -460, -300)) person(g, colleague(t));
  L.mid.blit(c, V);
  if (vis(V, 160, 230, -380, -330)) phone(g, t);
}
export function actors(c, V, t) {
  const g = worldOf(c, V), cy = carY(t);
  const inCar = vis(V, CAR.x0 - 40, CAR.x1 + 10, cy - 260, cy + 10);
  const W = worker(t), O = oldMan(t), F = firefighter(t);
  if (inCar) { if (O.layer === "in") person(g, O); if (W.layer === "in") person(g, W); carFront(g, t); }
  if (O.layer === "out" && vis(V, O.side.x - 40, O.side.x + 40, -200, 10)) person(g, O);
  if (F && vis(V, F.side.x - 40, F.side.x + 60, -200, 10)) person(g, F);
  if (W.layer === "out" && vis(V, W.side.x - 50, W.side.x + 50, -500, -290)) person(g, W);
}
export function front(c, V, t) {
  baked().front.blit(c, V);
  const g = worldOf(c, V); indicators(g, t);
}
export function hud(c, V, t) {
  const g = worldOf(c, V);
  if (vis(V, 0, 300, -570, -300)) { notConnected(g, t); brr(g, t); hearts(g, t); }
  if (vis(V, LENS.x - 80, CLOSE_BTN.x + 20, LENS.y - 80, CLOSE_BTN.y + 20)) lens(c, V, g, t);
}
