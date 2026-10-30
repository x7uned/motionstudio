// Heart monitor (screen space, top of the frame): a pixel heart that beats with the current animal's heart, an ECG
// trace scrolling right → left (one spike per beat from the shared BEATS list) and the BPM in big digits.
// At t = 0 and t = END the focus is the whale with a flat line and "2 BPM", so the loop seam stays clean.
import { EV, LV, END, BEATS, pulse, bpmAt } from "../timeline.mjs";
import { fade, mix, bayer, sm, MAIN, TINY, C } from "../cute.mjs";

const R = Math.round;
const DEFAULT = { whale: 2, groundhog: 80, turtle: 11, elephant: 30, human: 70, cat: 130, rabbit: 250, mouse: 600, hummingbird: 1260, shrew: 1511 };
function focus(t) {
  if (t < LV.whale[1]) return t >= EV.twentyFive && t < EV.second + 0.5 ? "shrew" : "whale";
  if (t < LV.groundhog[1]) return "groundhog"; if (t < LV.turtle[1]) return "turtle"; if (t < LV.elephant[1]) return "elephant";
  if (t < LV.human[1]) return "human"; if (t < LV.heat[1]) return "cat"; if (t < LV.rabbit[1]) return "rabbit"; if (t < LV.mouse[1]) return "mouse";
  if (t < LV.hummingbird[1]) return "hummingbird"; if (t < LV.shrew[1]) return "shrew";
  if (t < EV.biggest - 0.3) return t >= EV.we - 0.1 ? "human" : t >= EV.slowElephant ? "elephant" : t >= EV.fastMouse ? "mouse" : "shrew";
  return "whale";
}
const X = 70, Y = 108, Wd = 400, H = 82, TX = X + 64, TW = 210, SPEED = 84;   // trace window: TW px = TW / SPEED seconds
// ECG shape around one beat (seconds from the beat): P bump, QRS spike, T wave — compressed for fast hearts
function wave(d, bpm) { const sc = Math.min(1, 50 / bpm + 0.25), u = d / sc;
  return 0.14 * Math.exp(-(((u + 0.16) / 0.035) ** 2)) - 0.18 * Math.exp(-(((u + 0.025) / 0.008) ** 2)) + 1.0 * Math.exp(-((u / 0.012) ** 2)) - 0.32 * Math.exp(-(((u - 0.03) / 0.012) ** 2)) + 0.26 * Math.exp(-(((u - 0.22) / 0.05) ** 2)); }

export function hud(c, V, t) {
  const who = focus(t), list = BEATS.filter((b) => b.who === who && b.t > t - TW / SPEED - 0.4 && b.t < t + 0.3);
  c.rrect(X, Y, Wd, H, "#2A1A2E", 3); c.rrect(X + 2, Y + 2, Wd - 4, H - 4, "#4A2A44", 3); c.rect(X + 4, Y + 3, Wd - 8, 1, "#7A4A6E");
  c.rrect(X + 8, Y + 8, Wd - 16, H - 16, "#0C0A14", 2);
  // grid
  for (let x = TX; x < TX + TW; x += 10) for (let y = Y + 10; y < Y + H - 10; y += 2) c.px(x, y, "#1A1626");
  for (let y = Y + 14; y < Y + H - 10; y += 10) for (let x = TX; x < TX + TW; x += 2) c.px(x, y, "#1A1626");
  // trace: newest sample at the right edge
  const base = Y + H / 2 + 8, amp = 26; let prevY = null;
  for (let x = 0; x < TW; x++) {
    // four sub-samples per pixel, keep the most extreme: narrow spikes of fast hearts never fall between pixels
    let v = 0;
    for (let q = 0; q < 4; q++) { const tau = t - (TW - 1 - x - q / 4) / SPEED; let s = 0;
      for (const b of list) { const d = tau - b.t; if (d > -0.3 && d < 0.5) s += wave(d, b.bpm) * (0.55 + 0.45 * b.g); }
      if (Math.abs(s) > Math.abs(v)) v = s; }
    const y = R(base - v * amp), X0 = TX + x, age = (TW - 1 - x) / TW, col = mix("#FF5A7A", "#5A1A2A", age * 0.85);
    if (prevY !== null) { const a = Math.min(prevY, y), b2 = Math.max(prevY, y); for (let yy = a; yy <= b2; yy++) c.px(X0, yy, col); } else c.px(X0, y, col);
    prevY = y;
  }
  // bright head of the trace
  c.rect(TX + TW - 2, prevY - 1, 3, 3, "#FFE2EA");
  // the heart: grows on each beat
  const p = pulse(who, t), hx = X + 34, hy = Y + H / 2, s = 1 + 0.35 * p;
  heart(c, hx, hy, 13 * s, mix("#C8284A", "#FF6A8A", p));
  // BPM digits
  const val = String(Math.round(bpmAt(who, t) ?? DEFAULT[who])), sc = 4, w = c.measure(MAIN, val, { scale: sc });
  const rx = X + Wd - 14; c.text(MAIN, val, R(rx - w) + 1, Y + 16, "#2A0A14", { scale: sc }); c.text(MAIN, val, R(rx - w), Y + 15, "#FF8AA6", { scale: sc });
  const bw = c.measure(MAIN, "BPM", { scale: 2 }); c.text(MAIN, "BPM", R(rx - bw), Y + 52, "#C87A96", { scale: 2 });
}
function heart(c, x, y, r, col) {
  for (let Y2 = R(y - r); Y2 <= R(y + r * 1.1); Y2++) for (let X2 = R(x - r * 1.2); X2 <= R(x + r * 1.2); X2++) {
    const u = (X2 - x) / r, v = -(Y2 - y) / r, f = (u * u + v * v - 1) ** 3 - u * u * v * v * v;
    if (f <= 0) { const lit = u < -0.2 && v > 0.15; c.px(X2, Y2, lit ? mix(col, "#FFFFFF", 0.35) : col); }
  }
}
