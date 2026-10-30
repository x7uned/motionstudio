// «Pac-Man's red ghost gets faster when you're almost done» timeline: every event is anchored to a measured word of the
// single voice take. Loop film: END makes the pause at the seam (last voice sound 43.08 s → END → first sound 0.10 s)
// a sentence pause (0.42 s).
// Two clocks onto the same game (game.json): clock A plays the climax T* forward under the hook; on "On level one" the
// picture dissolves (◀◀) to clock B, which starts earlier in the level and runs forward — always forward, a smooth
// monotone warp through the story moments — back to T* at END, at the same speed as clock A at 0. So the last frame
// is the first frame.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1302 / FPS; // 43.400 s

export const EV = {
  red: W("red"), faster: W("faster"), almost: W("almost"), done: W("done."), doneEnd: W("done.", 1, "end"),
  on: W("on"), level: W("level"), one: W("one,"), run: W("run"), p80: W("80"), percent: W("percent"), top: W("top"), speed: W("speed."), speedEnd: W("speed.", 1, "end"),
  ghosts: W("ghosts"), p75: W("75,"), bit: W("bit"), faster2: W("faster.", 2), faster2End: W("faster.", 2, "end"),
  every: W("every"), dot: W("dot"), eat: W("eat"), stops: W("stops"), frame: W("frame,"), sixtieth: W("sixtieth"), second: W("second."), secondEnd: W("second.", 1, "end"),
  hall: W("hall"), full: W("full"), dots: W("dots,"), drop: W("drop"), p71: W("71,"), ghostB: W("ghost", 2), behind: W("behind"), slowly: W("slowly"), catches: W("catches"), upC: W("up.", 1), upCEnd: W("up.", 1, "end"),
  now: W("now", 1), watch: W("watch"), left: W("left."), leftEnd: W("left.", 1, "end"),
  at20: W("at", 3), p20: W("20,"), blinky: W("blinky,"), speeds: W("speeds"), p80b: W("80.", 2), yourSpeed: W("your"), speed2End: W("speed.", 2, "end"),
  stopsTaking: W("stops", 2), breaks: W("breaks."), breaksEnd: W("breaks.", 1, "end"),
  when: W("when", 2), other: W("other"), corners: W("corners,"), keeps: W("keeps"), chasing: W("chasing"), youCh: W("you.", 6), youChEnd: W("you.", 6, "end"),
  at10: W("at", 4), p10: W("10"), goes: W("goes"), p85: W("85."), p85End: W("85.", 1, "end"),
  nowF: W("now", 2), fasterThan: W("faster", 3), empty: W("empty"), hall2: W("hall.", 2), hall2End: W("hall.", 2, "end"),
  players: W("players"), cruise: W("cruise"), elroy: W("elroy,"), nobody: W("nobody"), name: W("name"), from: W("from."), fromEnd: W("from.", 1, "end"),
  so: W("so", 2), last: W("last"), few: W("few"), impossible: W("impossible,"), notJust: W("not"), you: W("you:", 8), youEnd: W("you:", 8, "end"),
};

// ---------------------------------------------------------------- the two clocks
export const RA = 0.75;                                   // game speed at the seam (both ends)
export const TD = [EV.on - 0.12, EV.one + 0.2];           // the dissolve from clock A to clock B (◀◀)
// monotone cubic Hermite through P with fixed end slope s1 (Fritsch–Carlson inside)
function hermite(P, s1) {
  const n = P.length, d = []; for (let i = 0; i + 1 < n; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
  const m = new Array(n).fill(0); for (let i = 1; i + 1 < n; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  m[0] = d[0]; m[n - 1] = s1;
  for (let i = 0; i + 1 < n; i++) { const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return (t) => { let i = 0; while (i + 2 < n && P[i + 1][0] <= t) i++; const [x0, y0] = P[i], [x1, y1] = P[i + 1], h = x1 - x0, u = (t - x0) / h, u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * m[i + 1]; };
}
export function makeClocks(g) {
  const Tst = g.Tstar, P = [[TD[0], g.tauA], ...g.clockKeys, [END, Tst]], B = hermite(P, RA);
  const A = (t) => Tst + RA * t;
  const wrap = (t) => ((t % END) + END) % END;
  return { A: (t) => A(wrap(t)), B: (t) => B(Math.max(TD[0], wrap(t))), mix: (t) => { const u = wrap(t); return u <= TD[0] ? 0 : u >= TD[1] ? 1 : (u - TD[0]) / (TD[1] - TD[0]); }, keys: P,
    rateB: (t) => (B(t + 0.01) - B(t - 0.01)) / 0.02 };
}
