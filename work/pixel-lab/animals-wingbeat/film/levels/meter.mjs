// The wing meter (screen space, top of the frame) and the film's explainer tags. One scope shows the last second of the
// wing voice: one spike per wingbeat (from the shared phase curve), so slow wings are separate clicks and fast wings
// fuse into a solid band — the film's idea, seen. Big digits show the beats per second, a word says what you hear
// (CLICK · RATTLE · HUM · BUZZ · WHINE). At t = 0 and t = END the meter shows the honeybee: 230 /S, BUZZ.
import { EV, LV, END, RATE, TONE, ORDER, rate, phase, onAir, strokeAmt } from "../timeline.mjs";
import { fade, mix, bayer, sm, win, MAIN, C, tag, panel } from "../cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const X = 18, Y = 100, Wd = 504, H = 92, SX = X + 74, SW = 256, WINDOW = 1.0;    // scope: SW px = WINDOW seconds
const TONES = ORDER.map((k) => TONE[k]), SHOWN = ORDER.map((k) => RATE[k]);
/** the number on screen for a voice rate: the tuned tone maps back onto the shown (rounded, sourced) number */
export function shownRate(r) {
  if (r <= TONES[0]) return SHOWN[0] * (r / TONES[0]);
  for (let i = 0; i < TONES.length - 1; i++) if (r <= TONES[i + 1]) { const k = Math.log(r / TONES[i]) / Math.log(TONES[i + 1] / TONES[i]); return SHOWN[i] * Math.pow(SHOWN[i + 1] / SHOWN[i], k); }
  return SHOWN[SHOWN.length - 1] * (r / TONES[TONES.length - 1]);
}
const fmt = (v) => (v < 9.95 ? (Math.round(v * 10) / 10).toFixed(Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1) : String(Math.round(v)));
export function soundWord(r) { return r < 15 ? "CLICK" : r < 32 ? "RATTLE" : r < 110 ? "HUM" : r < 320 ? "BUZZ" : "WHINE"; }
/** how loud the wing voice is (0..1): silent while the albatross glides */
export function voiceOn(t) { const who = onAir(t); return who === "albatross" ? strokeAmt("albatross", t) : who === "rewind" ? 1 - sm(t, EV.albatross - 0.6, EV.albatross - 0.2) : 1; }
const PHE = phase(END);
const phaseW = (tau) => (tau < 0 ? phase(tau + END) - PHE : phase(Math.min(END, tau)));   // the loop: before t = 0 the scope sees the film's tail

function wingIcon(g, x, y, r, ph, amp) {          // a small feathered wing that flaps with the voice (blurred when fast)
  const fast = clamp01((r - 9) / 10);
  const draw = (ang, col) => { for (let i = 0; i < 14; i++) { const u = i / 13, L = 22 - 6 * u * u, ax = x + Math.cos(ang - 0.18 * u) * L * (0.5 + 0.5 * u), ay = y - Math.sin(ang - 0.18 * u) * L * (0.5 + 0.5 * u); g.line(R(x), R(y), R(ax), R(ay), col); } };
  if (fast < 1) { const e = Math.cos(2 * Math.PI * ph) * amp; draw(0.15 + 0.75 * e, fast > 0 ? mix("#FDFEED", "#B8B0D8", fast) : "#FDFEED"); }
  if (fast > 0) for (let k = 0; k < 7; k++) { const ang = -0.6 + (1.5 * k) / 6; if (fast * (k === 0 || k === 6 ? 0.9 : 0.45) > bayer(k, R((ph - Math.floor(ph)) * 28) % 4)) draw(ang, k === 0 || k === 6 ? "#FDFEED" : "#9A92C0"); }
  g.disc(R(x), R(y), 3, "#F4CA50");
}

export function hud(c, V, t) {
  const r = rate(t), on = voiceOn(t), who = onAir(t), shown = shownRate(r);
  const ladder = win(t, EV.faster - 0.15, EV.noteEnd + 0.45, 0.25, 0.35);
  // panel
  c.rrect(X, Y, Wd, H, "#1A1430", 3); c.rrect(X + 2, Y + 2, Wd - 4, H - 4, "#3B2C5C", 3); c.rect(X + 4, Y + 3, Wd - 8, 1, "#6E4FB0");
  c.rrect(X + 8, Y + 8, Wd - 16, H - 16, "#0B0812", 2);
  c.text(MAIN, "WINGBEATS", X + 14, Y + 12, "#8D7AB8", { scale: 1 });
  // the wing icon (or the rewind arrows during the rewind)
  const rew = win(t, EV.lets - 0.1, EV.albatross - 0.3, 0.2, 0.3);
  if (rew < 1) wingIcon(rew > 0 ? fade(c, 1 - rew) : c, X + 44, Y + 58, r, phase(t), who === "albatross" ? strokeAmt("albatross", t) : 1);
  if (rew > 0) { const g = fade(c, rew); for (const dx of [0, 16]) { g.poly([[X + 50 + dx, Y + 40], [X + 50 + dx, Y + 70], [X + 30 + dx, Y + 55]], "#F4CA50"); } }
  // scope: one spike per beat within the last WINDOW seconds, newest at the right
  for (let x = 0; x < SW; x += 2) { for (let y = Y + 14; y < Y + H - 12; y += 6) c.px(SX + x, y, "#191428"); }
  const base = Y + H / 2 + 6, amp = 26, ladderA = 1 - ladder;
  if (ladderA > 0) {
    const g = ladderA < 1 ? fade(c, ladderA) : c;
    const pA = phaseW(t - WINDOW), pB = phaseW(t);
    let colPrev = Math.floor(pA - 0.25);
    for (let x = 0; x < SW; x++) {
      const tau = t - WINDOW + ((x + 1) / SW) * WINDOW, p = phaseW(tau) - 0.25, n = Math.floor(p) - colPrev; colPrev = Math.floor(p);
      const age = 1 - x / SW, col = mix("#7FE3F0", "#1E3A5A", age * 0.8), a = on;
      if (a <= 0.02) { g.px(SX + x, base, "#1E3A5A"); continue; }
      const dense = clamp01((r - 22) / 40);                              // above ~22/s the comb fills in: one band
      const h = n > 0 ? amp * a : dense * amp * a * (0.55 + 0.45 * Math.abs(Math.sin(Math.PI * (p - Math.floor(p)))));
      if (h < 1) { g.px(SX + x, base, mix(col, "#0B0812", 0.4)); continue; }
      for (let y = R(base - h); y <= R(base + h * 0.35); y++) g.px(SX + x, y, (y + x) % 2 && n <= 0 ? mix(col, "#0B0812", 0.35) : col);
    }
    if (on > 0.02) c.rect(SX + SW - 2, base - 2, 3, 4, "#E8FFFF");
  }
  // the ladder summary ("Faster wings, higher note"): ten bars light up left to right with the rising tones
  if (ladder > 0) { const g = fade(c, ladder);
    ORDER.forEach((k, i) => { const on2 = sm(t, EV.faster + i * 0.11, EV.faster + i * 0.11 + 0.08), h = 6 + 46 * (Math.log(RATE[k] / 2) / Math.log(500)), bx = SX + 6 + i * 25;
      g.rect(bx, R(Y + 76 - h), 18, R(h), on2 > 0.5 ? mix("#7FE3F0", "#F4CA50", i / 9) : "#2A2440"); }); }
  // big number + word
  const show = ladder > 0.5 ? "1000" : fmt(shown), sc = 4, w = c.measure(MAIN, show, { scale: sc }), rx = X + Wd - 16;
  const glide = who === "albatross" && strokeAmt("albatross", t) < 0.5;
  const txt = glide ? "0" : show;
  { const w2 = c.measure(MAIN, txt, { scale: sc }); c.text(MAIN, txt, R(rx - w2 - 30) + 1, Y + 19, "#04121A", { scale: sc }); c.text(MAIN, txt, R(rx - w2 - 30), Y + 18, "#9AF0FF", { scale: sc }); }
  c.text(MAIN, "/S", rx - 24, Y + 32, "#5AA8C0", { scale: 2 });
  const word = glide ? "GLIDE" : ladder > 0.5 ? "HIGHER" : soundWord(r), ww = c.measure(MAIN, word, { scale: 2 });
  c.text(MAIN, word, R(rx - ww), Y + 62, word === "CLICK" ? "#FDFEED" : word === "RATTLE" ? "#E0CDF8" : word === "HUM" ? "#7FE3F0" : word === "BUZZ" ? "#F4CA50" : "#FF8AA6", { scale: 2 });
  void w;

  // ---- explainer tags under the meter
  // "You could count every beat": a counter of the albatross's beats since it started flapping
  { const a = win(t, EV.count - 0.15, EV.pigeon - 0.25, 0.2, 0.3); if (a > 0) { const n = Math.max(0, Math.floor(phase(t) - phase(EV.flaps1) + 0.75)); tag(c, [`BEAT ${n}`], 270, 206, a, C.Y, 3); } }
  tag(c, ["ABOUT 20 A SECOND:", "CLICKS BLUR INTO ONE SOUND"], 270, 206, win(t, EV.around - 0.1, EV.hummingbird - 0.2, 0.25, 0.3), "#E0CDF8", 2);
  { const a = win(t, EV.hum - 0.1, EV.nameEnd + 0.1, 0.2, 0.3); if (a > 0) tag(c, ["HUM -> HUMMINGBIRD"], 270, 206, a, "#7FE3F0", 3); }
  tag(c, ["WARMER = HIGHER"], 270, 206, win(t, EV.warm - 0.1, EV.higher1End, 0.2, 0.3), "#FF8AA6", 3);
  tag(c, ["FASTER WINGS = HIGHER NOTE"], 270, 206, win(t, EV.faster - 0.1, EV.everyAnimal - 0.45, 0.2, 0.3), "#F4CA50", 2);
  tag(c, ["ROUGH NUMBERS:", "SPECIES, SIZE, HEAT"], 270, 206, win(t, EV.everyAnimal - 0.1, EV.roughEnd + 0.1, 0.25, 0.3), "#E0CDF8", 2);
}
