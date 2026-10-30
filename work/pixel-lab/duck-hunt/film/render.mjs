// «Your Duck Hunt gun never fired a single shot» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: one living room fills the frame edge to edge; karaoke captions sit on a soft dithered shade. One room for
// the whole film: the kid aims a light gun at the tube TV → a shot (black frame, white box) → the gun only looks: a lens
// and a light sensor (cut-away) → slow motion inside the TV: the black frame, the white box, the sensor sees it, hit →
// two ducks, one box each, the timing says which → under a tenth of a second → cheaters: the lamp → the beam drawing
// lines, the flicker the gun needs → steady light does nothing, light on the black frame = miss → the TV turns into a
// flat panel: no flicker, a little late → the old gun misses, the duck gets away, the dog laughs → back to the start.
//   node render.mjs --stills 0,3.5,… | --video
import { fileURLToPath } from "node:url";
import { Canvas, MAIN, mix, bayer, fade, hex } from "./lib/raster.mjs";
import { P, stext, textW, tag, panel, stamp, pointer, smooth, ease, easeOut, lerp, win, clamp01 } from "./lib/ui.mjs";
import { makeCaptions } from "./lib/captions.mjs";
import { cli } from "./lib/out.mjs";
import { drawRoom, drawKid, view, SCR, TV, GW, GH, wrect, wpoly, wdisc, wline } from "./room.mjs";
import { drawMarsh, gview, g2w, GWU, GHU, SK } from "./marsh.mjs";
import { drawDuck, drawDog, duckBox, DUCK_PAL } from "./duck.mjs";
import { EV, END, FPS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const R = Math.round, RED = "#FF3B4E", WHITE = "#FFFFFF", K = "#000000";
const wrapT = (t) => ((t % END) + END) % END;
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));

// ---------------------------------------------------------------- ducks: keyframed paths in game units (256 × 192)
function path(keys, t) { // Catmull-Rom through [t, x, y]
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]]; if (t >= keys[keys.length - 1][0]) { const k = keys[keys.length - 1]; return [k[1], k[2]]; }
  let i = 0; while (keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)], u = (t - p1[0]) / (p2[0] - p1[0]);
  const cr = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u * u + (-a + 3 * b - 3 * c2 + d) * u * u * u);
  return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
}
const E1 = END - 1.25;
const DUCKS = [
  { id: "d1", pal: DUCK_PAL.green, t0: E1, keys: [[E1 - END, 172, 172], [E1 + 0.65 - END, 150, 128], [0, 128, 96], [0.8, 112, 78], [1.62, 100, 70]], hitAt: 1.98, fallEnd: 2.95, wrap: true },
  { id: "d2", pal: DUCK_PAL.blue, t0: 3.1, keys: [[3.1, 70, 172], [4.0, 92, 120], [5.5, 140, 90], [7.0, 182, 72], [8.4, 152, 50], [9.7, 122, 60], [10.9, 116, 62]], hitAt: EV.hit1 + 0.18, fallEnd: EV.hit1 + 0.95 },
  { id: "d3", pal: DUCK_PAL.red, t0: EV.two - 0.05, keys: [[EV.two - 0.05, 70, 172], [21.3, 84, 120], [21.45, 85, 117], [25.0, 85, 117], [25.6, 110, 80], [26.6, 150, 50], [27.6, 200, 20], [28.3, 250, -16]], gone: 28.3 },
  { id: "d4", pal: DUCK_PAL.green, t0: EV.two - 0.05, face: -1, keys: [[EV.two - 0.05, 190, 172], [21.3, 172, 118], [21.45, 171, 116]], hitAt: EV.duck3 + 0.12, fallEnd: EV.duck3 + 0.9 },
  { id: "d5", pal: DUCK_PAL.blue, t0: 28.4, face: -1, keys: [[28.4, 124, 172], [29.2, 112, 120], [30.5, 72, 90], [31.5, 62, 72], [33, 80, 72], [35, 104, 68], [37, 128, 66], [38.9, 150, 62], [39.6, 160, 70], [41.3, 152, 62], [41.6, 151, 61], [44.4, 151, 61], [44.9, 172, 40], [45.5, 226, -16]], gone: 45.5 },
  { id: "d6", pal: DUCK_PAL.red, t0: EV.modern + 0.2, keys: [[EV.modern + 0.2, 90, 172], [46.4, 104, 120], [47.4, 140, 92], [48.4, 172, 80], [49.3, 152, 66], [49.8, 140, 60], [50.4, 130, 52], [50.9, 120, 20], [51.35, 112, -16]], gone: 51.35 },
];
const SLOW = [[9.9, 10.9, 20.0, 20.3], [21.2, 21.5, 25.0, 25.4], [41.4, 41.7, 44.3, 44.6]];
const flapRate = (t) => { let r = 1; for (const [a, b, c2, d] of SLOW) r = Math.min(r, 1 - 0.94 * Math.min(smooth(t, a, b), 1 - smooth(t, c2, d))); return r; };
const FLAP = new Float64Array(Math.round(END * FPS) * 4 + 8); { let ph = 0; for (let i = 0; i < FLAP.length; i++) { FLAP[i] = ph; ph += (flapRate(i / (FPS * 4)) * 3.2) / (FPS * 4); } }
const flapAt = (t) => FLAP[Math.max(0, Math.min(FLAP.length - 1, Math.round(wrapT(t) * FPS * 4)))];
function duckState(d, t) {
  let tt = t; if (d.wrap && t >= d.t0) tt = t - END;                 // the hook duck rises in the loop's tail
  const visible = d.wrap ? (t >= d.t0 || t < d.fallEnd + 0.1) : t >= d.t0 && t < (d.gone ?? d.fallEnd + 0.1);
  if (!visible) return null;
  const a0 = d.wrap ? (t >= d.t0 ? smooth(t, d.t0, d.t0 + 0.3) : 1) : smooth(t, d.t0, d.t0 + 0.3);
  if (d.hitAt != null && tt >= d.hitAt) { // hit: stunned in the air, then falls into the reeds
    const [x, y] = path(d.keys, d.hitAt), k = smooth(tt, d.hitAt + 0.35, d.fallEnd), fallY = lerp(y, 178, k * k);
    return { x, y: tt < d.hitAt + 0.35 ? y : fallY, hit: 1, fall: tt >= d.hitAt + 0.35 ? 1 : 0, face: d.face ?? -1, a: a0 * (1 - smooth(tt, d.fallEnd - 0.12, d.fallEnd + 0.05)) };
  }
  const [x, y] = path(d.keys, tt), [x2] = path(d.keys, tt + 0.05);
  return { x, y, hit: 0, fall: 0, face: Math.abs(x2 - x) > 0.02 ? Math.sign(x2 - x) : (d.face ?? 1), a: a0 };
}

// ---------------------------------------------------------------- the light-gun tests (what the TV shows after a pull)
// each: trigger, black in/out, boxes [duck, in, out], back = picture returns. Every change dissolves (never one frame).
const TESTS = [
  { trig: 1.58, black: [1.62, 1.8], boxes: [["d1", 1.8, 1.98]], back: 1.98 },
  { trig: EV.trigger, black: [EV.screen2 + 0.1, EV.white1], boxes: [["d2", EV.white1, EV.hit1 + 0.18]], back: EV.hit1 + 0.18, slow: true },
  { trig: EV.two + 0.75, black: [EV.each - 0.15, EV.flashes], boxes: [["d3", EV.flashes, EV.own - 0.02], ["d4", EV.own, EV.duck3 + 0.12]], back: EV.duck3 + 0.12, slow: true },
  { trig: EV.and2 + 0.1, black: [EV.any + 0.1, EV.miss + 0.1], boxes: [["d5", EV.miss + 0.1, EV.miss + 0.32]], back: EV.miss + 0.32, slow: true },
  { trig: EV.zapper - 0.1, black: [EV.zapper + 0.22, EV.zapper + 0.4], boxes: [["d6", EV.zapper + 0.4, EV.zapper + 0.58]], back: EV.zapper + 0.58, late: true },
];
function screenTest(t) {
  let black = 0; const boxes = [];
  for (const T of TESTS) {
    const fi = T.slow ? 0.25 : 0.05, fo = T.slow ? 0.25 : 0.08;
    const inside = t >= T.black[0] - fi && t <= T.back + fo; if (!inside) continue;
    black = Math.max(black, Math.min(smooth(t, T.black[0] - fi, T.black[0]), 1 - smooth(t, T.back, T.back + fo)));
    for (const [id, a, b] of T.boxes) { const f = T.slow ? 0.15 : 0.04; const k = Math.min(smooth(t, a - f, a), 1 - smooth(t, b, b + f)); if (k > 0) boxes.push([id, k]); }
  }
  return { black, boxes };
}

// ---------------------------------------------------------------- the TV picture
const FLAT = (t) => Math.max(win(t, EV.modern - 0.1, END - 0.85, 0.6, 0.6), 0);
function beamOn(t) { return win(t, EV.old1 - 0.1, EV.flicker1End + 0.2, 0.4, 0.4); }
function drawScreen(c, V, t) {
  const G = gview(V), st = screenTest(t), CLIP = [Math.round(V.X(SCR.x)), Math.round(V.Y(SCR.y)), Math.round(V.X(SCR.x + SCR.w)), Math.round(V.Y(SCR.y + SCR.h))];
  // the dog laughs from behind the reeds when the duck gets away on the flat TV
  const dogK = win(t, EV.misses + 0.15, EV.because - 0.1, 0.35, 0.4), dogBob = Math.abs(Math.sin(t * 14));
  drawMarsh(c, V, t, 0, dogK > 0 ? () => drawDog(c, G, 96, lerp(214, 124, easeOut(dogK)), { bob: dogBob, clip: CLIP }) : null);
  for (const d of DUCKS) { const s = duckState(d, t); if (!s || s.a <= 0) continue; drawDuck(c, G, s.x, s.y, { face: s.face, flap: flapAt(t) + (d.id.charCodeAt(1) * 0.37), pal: d.pal, hit: s.hit, fall: s.fall, alpha: s.a, clip: CLIP }); }
  // the test frames: black over everything, then a white box on one duck
  const x0 = Math.max(0, R(V.X(SCR.x))), x1 = Math.min(GW, R(V.X(SCR.x + SCR.w))), y0 = Math.max(0, R(V.Y(SCR.y))), y1 = Math.min(GH, R(V.Y(SCR.y + SCR.h)));
  if (st.black > 0) for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) if (st.black >= 1 || st.black > bayer(X, Y)) c.px(X, Y, K);
  for (const [id, k] of st.boxes) { const d = DUCKS.find((q) => q.id === id), s = duckState(d, t) || { x: path(d.keys, t)[0], y: path(d.keys, t)[1] }; duckBox(c, G, s.x, s.y, k * st.black); }
  // the electron beam (macro): one bright line sweeping down, the rows above it fading — slowed down a lot
  const bk = beamOn(t);
  if (bk > 0) { const per = 1.6, by = ((t - EV.old1) / per % 1 + 1) % 1, beamY = SCR.y + by * SCR.h, rowH = SK;
    for (let Y = y0; Y < y1; Y++) { const wy = (Y + 0.5 - V.Y(0)) / V.z, gyRow = Math.floor((wy - SCR.y) / rowH), rowTop = SCR.y + gyRow * rowH, inRow = (wy - rowTop) / rowH;
      let since = (beamY - wy) / SCR.h; if (since < 0) since += 1; const glow = Math.exp(-since * 2.6), gap = inRow > 0.78 && V.z * rowH > 5;
      for (let X = x0; X < x1; X++) { const i = (Y * GW + X) * 3, cur = [c.d[i], c.d[i + 1], c.d[i + 2]]; let col = mix(cur, K, (1 - (0.42 + 0.58 * glow)) * bk); if (gap) col = mix(col, K, 0.7 * bk); const db = Math.abs(wy - beamY) / rowH; if (db < 0.6) col = mix(col, WHITE, 0.85 * bk); else if (db < 1.6) col = mix(col, WHITE, 0.3 * bk); c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } } }
  // the gun's spot: a dashed ring where the barrel points
  const ring = Math.max(win(t, EV.only - 0.15, EV.flicker1End, 0.3, 0.4) * (t < EV.why - 0.3 || t > EV.old1 ? 1 : 0), 0) * (1 - beamOn(t) * 0) ;
  if (ring > 0 && !(t > EV.why - 0.3 && t < EV.old1)) { const [ax, ay] = aimWorld(t), cx = V.X(ax), cy = V.Y(ay), r = 9 * V.z * SK / 1.33, g = fade(c, ring);
    for (let k = 0; k < 40; k++) if (k % 2 === 0) { const a = (k / 40) * Math.PI * 2; g.px(R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r), P.y); g.px(R(cx + Math.cos(a) * (r + 1)), R(cy + Math.sin(a) * (r + 1)), P.y); } }
}

// ---------------------------------------------------------------- the kid's aim (world point), trigger kicks
const LAMP = [10, 92];
function duckTargetWorld(t) {
  // the duck being hunted at time t
  const order = [["d1", -1.5, 2.6], ["d2", 2.6, 20.2], ["d4", 20.2, 25.2], ["d3", 25.2, 28.3], ["d5", 28.3, 45.4], ["d6", 45.4, 51.3], ["d1", 51.3, END + 1]];
  for (const [id, a, b] of order) if (t >= a && t < b) { const d = DUCKS.find((q) => q.id === id), s = duckState(d, t); if (s) return g2w(s.x, s.y); return g2w(...path(d.keys, Math.min(t, d.keys[d.keys.length - 1][0]))); }
  return g2w(128, 96);
}
const AIM_LAMP = [[EV.catch - 0.3, EV.catch + 0.5], [EV.old1 + 0.4, EV.missEnd + 0.4]];   // swings toward the lamp (camera away in between)
const AIMS = []; for (let f = 0; f < Math.round(END * FPS); f++) { const t = f / FPS; let k = 0; for (const [a, b] of [[AIM_LAMP[0][0], AIM_LAMP[1][1]]]) k = Math.max(k, Math.min(smooth(t, a, a + 0.6), 1 - smooth(t, b, b + 0.7))); const d = duckTargetWorld(t); AIMS.push([lerp(d[0], LAMP[0], k), lerp(d[1], LAMP[1], k)]); }
const LAMPK = []; for (let f = 0; f < Math.round(END * FPS); f++) { const t = f / FPS, a = AIM_LAMP[0][0], b = AIM_LAMP[1][1]; LAMPK.push(Math.min(smooth(t, a, a + 0.6), 1 - smooth(t, b, b + 0.7))); }
const lampK = (t) => LAMPK[Math.round(wrapT(t) * FPS) % LAMPK.length];
function aimWorld(t) { const f = Math.round(wrapT(t) * FPS) % AIMS.length, SM = 4; let x = 0, y = 0, w = 0; for (let k = -SM; k <= SM; k++) { const a = AIMS[(((f + k) % AIMS.length) + AIMS.length) % AIMS.length], q = Math.exp(-(k * k) / 8); x += a[0] * q; y += a[1] * q; w += q; } return [x / w, y / w]; }
const kick = (t) => { let r = 0; for (const T of TESTS) r = Math.max(r, win(t, T.trig - 0.02, T.trig + 0.06, 0.05, 0.25)); return r; };

// ---------------------------------------------------------------- panels (screen space)
const CARD = "#E9EDF7", INK = "#1E2233";
function gunCutaway(c, t, a) {
  if (a <= 0) return; panel(c, 22, 30, 496, 250, a, P.or);
  stext(c, MAIN, "INSIDE THE GUN", 270, 44, 2, P.or, { align: 0.5, alpha: a });
  const g = fade(c, a), x = 70, y = 140;
  // TV icon on the right with one spot
  g.rrect(430, 100, 70, 56, "#5A5666", 2); g.rect(436, 106, 58, 44, "#78B4F0"); g.rect(436, 136, 58, 14, "#3E9A34");
  const spotK = win(t, EV.spot - 0.15, EV.tvEnd + 0.6, 0.25, 0.3); g.disc(470, 122, 5, mix("#78B4F0", WHITE, 0.6)); if (spotK > 0) fade(c, a * spotK).ring(470, 122, 7, P.y);
  // the gun in side view: grip, body, barrel to the right
  g.poly([[x + 20, y + 20], [x + 58, y + 20], [x + 48, y + 92], [x + 20, y + 92]], "#4A4652"); g.rect(x + 54, y + 22, 16, 22, "#3A3640");
  g.rrect(x, y - 16, 120, 40, "#6E6A7A", 2); g.rrect(x + 4, y - 14, 112, 10, "#9A96A6", 2);
  g.rrect(x + 110, y - 10, 210, 28, "#8E8A9C", 2); g.rect(x + 114, y - 8, 202, 6, "#B2AEC0"); g.rect(x + 306, y - 12, 18, 32, "#F08A3C");
  // cut-away window: the tube inside, the lens at the front, the sensor at the back, the wire
  g.rect(x + 124, y - 4, 180, 16, "#1E1A26");
  const lensK = smooth(t, EV.lens - 0.15, EV.lens + 0.15), senK = smooth(t, EV.sensor1 - 0.2, EV.sensor1 + 0.1);
  fade(c, a * lensK).ellipse(x + 300, y + 4, 4, 11, "#9FE0FF"); fade(c, a * lensK).ellipse(x + 301, y + 1, 1, 5, WHITE);
  fade(c, a * senK).rect(x + 126, y - 2, 12, 12, "#2A2A34"); fade(c, a * senK).rect(x + 128, y, 8, 8, "#65DA41"); fade(c, a * senK).line(x + 126, y + 10, x + 40, y + 60, "#E03056");
  // light from the spot through the lens onto the sensor
  const rays = win(t, EV.aims - 0.1, EV.tvEnd + 0.6, 0.3, 0.3);
  if (rays > 0) { const r = fade(c, a * rays), p = (t * 1.6) % 1; for (const dy of [-9, 0, 9]) { r.line(468, 122, x + 300, y + 4 + dy, P.yl, [3, 3]); r.line(x + 300, y + 4 + dy, x + 138, y + 4, P.yl, [3, 3]); } r.disc(R(lerp(468, x + 300, p)), R(lerp(122, y + 4, p)), 2, WHITE); }
  stext(c, MAIN, "LENS", x + 300, y + 30, 2, "#9FE0FF", { align: 0.5, alpha: a * lensK });
  stext(c, MAIN, "LIGHT SENSOR", x + 132, y + 30, 2, P.gr, { align: 0.5, alpha: a * senK });
  stext(c, MAIN, "ONE SPOT", 470, 166, 2, P.y, { align: 0.5, alpha: a * spotK });
  stext(c, MAIN, "NO BULLET. NO BEAM.", 270, 248, 2, P.iv, { align: 0.5, alpha: a * smooth(t, EV.inside, EV.inside + 0.3) });
}
// a strip of frame tiles: items [label, kind] with kind "pic" | "black" | "box" | "boxA" | "boxB"; cur = fractional index of the playhead
function tile(c, x, y, w, h, kind, a) {
  const g = fade(c, a); g.rect(x - 2, y - 2, w + 4, h + 4, "#5A5666"); g.rect(x, y, w, h, kind === "pic" ? "#78B4F0" : K);
  if (kind === "pic") { g.rect(x, y + h * 0.7, w, h * 0.3, "#3E9A34"); g.disc(R(x + w * 0.55), R(y + h * 0.35), 3, "#8A6A4E"); }
  if (kind === "box") g.rect(R(x + w * 0.45), R(y + h * 0.22), 9, 8, WHITE);
  if (kind === "boxA") g.rect(R(x + w * 0.25), R(y + h * 0.3), 8, 7, WHITE);
  if (kind === "boxB") g.rect(R(x + w * 0.62), R(y + h * 0.3), 8, 7, WHITE);
}
function frameStrip(c, t, a, items, cur, title, foot = null) {
  if (a <= 0) return; const n = items.length, w = 84, h = 62, gap = 22, W = n * w + (n - 1) * gap + 28, x0 = R(270 - W / 2), y0 = 34;
  panel(c, x0, y0, W, 128 + (foot ? 18 : 0), a, P.cy); stext(c, MAIN, title, 270, y0 + 8, 2, P.cy, { align: 0.5, alpha: a });
  items.forEach(([label, kind, ka], i) => { const x = x0 + 14 + i * (w + gap), y = y0 + 28, k = a * (ka ?? 1); tile(c, x, y, w, h, kind, k);
    const on = clamp01(1 - Math.abs(cur - i) * 2.2); if (on > 0) { const g = fade(c, k * on); g.frame(x - 4, y - 4, w + 8, h + 8, P.y); g.frame(x - 5, y - 5, w + 10, h + 10, P.y); }
    stext(c, MAIN, label, x + w / 2, y + h + 8, 2, on > 0.5 ? P.y : P.iv, { align: 0.5, alpha: k }); });
  if (foot) stext(c, MAIN, foot, 270, y0 + 128, 2, P.gr, { align: 0.5, alpha: a });
}
function sensorMeter(c, t, a, light, wave, x = 366, y = 182) {
  if (a <= 0) return; panel(c, x, y, 152, 108, a, P.gr); stext(c, MAIN, "GUN SENSOR", x + 76, y + 8, 2, P.gr, { align: 0.5, alpha: a });
  const g = fade(c, a); g.disc(x + 26, y + 46, 11, "#14301A"); if (light > 0) fade(c, a * light).disc(x + 26, y + 46, 11, "#7CFF6A"); if (light > 0) fade(c, a * light * 0.5).ring(x + 26, y + 46, 14, "#7CFF6A");
  stext(c, MAIN, "LIGHT", x + 46, y + 32, 2, P.iv, { alpha: a }); stext(c, MAIN, light > 0.5 ? "YES" : "NO", x + 46, y + 50, 3, light > 0.5 ? "#7CFF6A" : "#9AA0C8", { alpha: a });
  // a little scope: fast pulses (flicker) or a flat line (steady light)
  g.rect(x + 12, y + 74, 128, 26, "#0B0812"); const base = y + 96;
  for (let i = 0; i < 126; i++) { let v = 0; if (wave === "flicker") v = ((i + Math.floor(t * 40)) % 6) < 2 ? 14 : 0; else if (wave === "steady") v = 9; g.px(x + 13 + i, base - v, P.gr); if (wave === "flicker" && ((i + Math.floor(t * 40)) % 6 === 0 || (i + Math.floor(t * 40)) % 6 === 2)) for (let k = 0; k < 14; k++) g.px(x + 13 + i, base - k, P.gr); }
}
function lagPanel(c, t, a) {
  if (a <= 0) return; const x0 = 40, y0 = 40, w = 460, h = 196; panel(c, x0, y0, w, h, a, P.or);
  stext(c, MAIN, "A LITTLE LATE", 270, y0 + 8, 2, P.or, { align: 0.5, alpha: a });
  const tw = 70, th = 46, sh = smooth(t, EV.show - 0.1, EV.late) * 1.4;   // the TV row slides right: it shows each frame late
  stext(c, MAIN, "GAME", x0 + 12, y0 + 48, 2, P.iv, { alpha: a }); stext(c, MAIN, "TV", x0 + 12, y0 + 118, 2, P.iv, { alpha: a });
  const kinds = ["pic", "black", "box", "pic"];
  kinds.forEach((k, i) => { tile(c, x0 + 90 + i * (tw + 12), y0 + 32, tw, th, k, a); });
  kinds.forEach((k, i) => { const x = x0 + 90 + (i + sh) * (tw + 12); if (x + tw < x0 + w - 8) tile(c, R(x), y0 + 102, tw, th, k, a); });
  // the check: the game looks for light during ITS box frame
  const cx = x0 + 90 + 2 * (tw + 12) + tw / 2, g = fade(c, a); g.rect(cx - 1, y0 + 82, 2, 98, P.y); stext(c, MAIN, "GUN CHECKS", cx, y0 + 168, 2, P.y, { align: 0.5, alpha: a });
  const late = smooth(t, EV.late - 0.1, EV.late + 0.2); if (late > 0) stamp(c, "LATE", x0 + w - 70, y0 + 66, a * late, RED, 3, late);
}

// ---------------------------------------------------------------- story tags
function story(c, V, t) {
  { const a = winW(t, END - 0.3, EV.shotEnd + 0.35, 0.3, 0.4); tag(c, ["IT NEVER SHOOTS"], 270, 40, a, P.y, 3); }
  { const a = win(t, EV.only - 0.15, EV.screenEnd + 0.5, 0.25, 0.3); tag(c, ["IT ONLY LOOKS"], 270, 40, a, P.y, 3); }
  // cone from the barrel tip to the spot
  { const a = win(t, EV.only - 0.1, EV.tvEnd + 0.4, 0.3, 0.4); if (a > 0) { const [ax, ay] = aimWorld(t), tip = gunTip(t), g = fade(c, a * 0.8); g.line(R(V.X(tip[0])), R(V.Y(tip[1])), R(V.X(ax - 8)), R(V.Y(ay)), P.y, [4, 3]); g.line(R(V.X(tip[0])), R(V.Y(tip[1])), R(V.X(ax + 8)), R(V.Y(ay)), P.y, [4, 3]); } }
  { const a = win(t, EV.screen2, EV.white1 - 0.1, 0.3, 0.3); tag(c, ["SLOW MOTION"], 100, 254, a, P.l, 2); }
  { const a = win(t, EV.hit1 - 0.05, EV.duck2End + 0.5, 0.15, 0.35); if (a > 0) stamp(c, "HIT!", 270, 300, a, P.gr, 4, smooth(t, EV.hit1 - 0.05, EV.hit1 + 0.12)); }
  { const a = win(t, EV.duck3 - 0.1, EV.hit2End + 0.6, 0.2, 0.35); if (a > 0) stamp(c, "DUCK 2 HIT", 270, 300, a, P.gr, 3, smooth(t, EV.duck3 - 0.1, EV.duck3 + 0.12)); }
  { const a = win(t, EV.catch - 0.15, EV.cheatersEnd + 0.5, 0.3, 0.35); tag(c, ["CHEATER?"], 140, 160, a, RED, 3); }
  { const a = win(t, EV.lineAt - 0.15, EV.time1 + 0.6, 0.3, 0.35); tag(c, ["ONE LINE", "AT A TIME"], 400, 60, a, P.iv, 2); }
  { const a = win(t, EV.nearly - 0.1, EV.second2 + 0.8, 0.3, 0.35); tag(c, ["15,700 LINES", "A SECOND"], 140, 60, a, P.cy, 3); }
  { const a = win(t, EV.steady - 0.15, EV.nothingEnd + 0.4, 0.3, 0.35); tag(c, ["STEADY LIGHT:", "IGNORED"], 150, 170, a, P.iv, 2); }
  { const a = win(t, EV.calls - 0.1, EV.missEnd + 0.6, 0.15, 0.35); if (a > 0) stamp(c, "MISS", 270, 360, a, RED, 5, smooth(t, EV.calls - 0.1, EV.calls + 0.12)); }
  { const a = win(t, EV.dont - 0.1, EV.byLine + 0.9, 0.3, 0.35); tag(c, ["NO FLICKER"], 270, 60, a, P.or, 3); }
  { const a = win(t, EV.misses - 0.05, EV.every + 0.25, 0.15, 0.3); if (a > 0) stamp(c, "MISS", 270, V.Y(SCR.y) + 40, a, RED, 4, smooth(t, EV.misses - 0.05, EV.misses + 0.12)); }
}
let GUNTIP = [0, 0];
const gunTip = () => GUNTIP;

// ---------------------------------------------------------------- camera
const CAM = { ROOM: { cx: 270, cy: 436, z: 1.12, ay: 480 }, TVZ: { cx: 270, cy: 273.5, z: 1.55, ay: 440 }, LAMP: { cx: 214, cy: 440, z: 1.08, ay: 470 } };
const macro = () => { const p = g2w(104, 70); return { cx: p[0], cy: p[1], z: 4.2, ay: 380 }; };
const KEYS = [[0, EV.when - 0.2, CAM.ROOM], [EV.trigger + 0.3, EV.secondEnd + 0.1, CAM.TVZ], [EV.why + 0.2, EV.cheatersEnd + 0.2, CAM.LAMP], [EV.old1 + 0.4, EV.flicker1End + 0.1, macro()], [EV.lamps - 0.1, EV.missEnd + 0.1, CAM.LAMP], [EV.flat + 0.1, END + 2, CAM.ROOM]];
function rawCam(t) {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++;
  const [, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return { ...A };
  const [b0, , B] = KEYS[i + 1], k = ease((t - a1) / (b0 - a1));
  return { cx: lerp(A.cx, B.cx, k), cy: lerp(A.cy, B.cy, k), z: Math.exp(lerp(Math.log(A.z), Math.log(B.z), k)), ay: lerp(A.ay, B.ay, k) };
}
const FR = Math.round(END * FPS), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / FPS));
function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % FR, SM = 6; let cx = 0, cy = 0, lz = 0, ay = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; ay += c.ay * q; w += q; }
  return { cx: cx / w, cy: cy / w, z: Math.exp(lz / w), ay: ay / w };
}

// ---------------------------------------------------------------- frame
const CAP = makeCaptions(VOICE, END);
const GLOW = [70, 110, 170];
export function frame(t, opts = {}) {
  t = wrapT(t);
  const c = opts.canvas || new Canvas(GW, GH, K), V = view(opts.cam || camera(t)), st = screenTest(t);
  const glow = GLOW.map((v) => v * (1 - st.black * 0.85));
  drawRoom(c, V, t, glow, (c2, V2) => drawScreen(c2, V2, t), FLAT(t));
  const aim = aimWorld(t);
  // the kid (with the gun) — the tip is remembered for the look cone
  { const k = kick(t); GUNTIP = drawKid(c, V, t, aim, k, lampK(t)); }
  // panels dim the room behind them
  const cut = win(t, EV.inside - 0.2, EV.tvEnd + 0.5, 0.35, 0.4);
  if (cut > 0) c.tint(0, 0, GW, GH, () => cut * 0.55, "#07050D", 5);
  if (opts.story !== false) {
    gunCutaway(c, t, cut);
    // frame strips
    const s2 = win(t, EV.screen2 - 0.2, EV.duck2End + 0.5, 0.3, 0.35); frameStrip(c, t, s2, [["PICTURE", "pic"], ["BLACK", "black"], ["BOX", "box"]], t < EV.black1 ? 0 : t < EV.white1 ? 1 : 2, "AFTER YOU PULL THE TRIGGER");
    const s3 = win(t, EV.two + 0.4, EV.secondEnd + 0.4, 0.3, 0.35), cur3 = t < EV.flashes ? 0 : t < EV.own ? 1 : 2;
    frameStrip(c, t, s3, [["BLACK", "black"], ["DUCK 1", "boxA"], ["DUCK 2", "boxB"]], t > EV.whole2 - 0.1 ? -9 : cur3, "TWO DUCKS", t > EV.whole2 - 0.2 ? "1/60 S EACH · UNDER 1/10 S" : null);
    const s4 = win(t, EV.any - 0.2, EV.missEnd + 0.4, 0.3, 0.35); frameStrip(c, t, s4, [["BLACK", "black"]], 0, "LIGHT ON A BLACK SCREEN?");
    // the sensor meter
    const m1 = win(t, EV.if1 - 0.15, EV.duck2End + 0.4, 0.3, 0.35); sensorMeter(c, t, m1, smooth(t, EV.sees - 0.1, EV.sees + 0.1), "flicker");
    const m2 = win(t, EV.flashes - 0.2, EV.hit2End + 0.4, 0.3, 0.35); sensorMeter(c, t, m2, Math.min(smooth(t, EV.own - 0.05, EV.own + 0.05), 1), t > EV.own ? "flicker" : "none");
    const m3 = win(t, EV.gun2 - 0.15, EV.flicker1End + 0.4, 0.3, 0.35); sensorMeter(c, t, m3, smooth(t, EV.reacts - 0.1, EV.reacts + 0.1), "flicker", 366, 560);
    const m4 = win(t, EV.lamps - 0.15, EV.any - 0.45, 0.3, 0.3); sensorMeter(c, t, m4, 0, "steady", 366, 150);
    const m5 = win(t, EV.any - 0.1, EV.missEnd + 0.3, 0.3, 0.35); sensorMeter(c, t, m5, smooth(t, EV.shows - 0.1, EV.shows + 0.1), "flicker", 366, 150);
    const m6 = win(t, EV.flicker2 - 0.15, EV.byLine + 0.8, 0.3, 0.35); sensorMeter(c, t, m6, 0, "steady", 366, 130);
    lagPanel(c, t, win(t, EV.and3 ?? EV.show - 0.3, EV.lateEnd + 0.4, 0.3, 0.35));
    story(c, V, t);
  }
  if (opts.captions !== false) { CAP.shade(c); CAP.draw(c, t); }
  return c;
}
export { TESTS, DUCKS, duckState, SLOW, flapRate, FLAT };
if (process.argv[1] && process.argv[1].endsWith("render.mjs")) await cli(frame, END, FPS, HERE, "duck-hunt");
