// «The lowest aliens can't hit you» timeline: every event is anchored to a measured word of the single voice take
// (ElevenLabs alignment moved onto Scribe's word timings, voice/words-el.json keeps the original).
// Loop: "…So next time the army is right on top of you, remember:" runs on into "In Space Invaders, the lowest aliens
// can't hit you." The voice ends at 51.98 s and starts at 0.07 s; END = 52.30 s gives a 0.39 s sentence pause.
// The film shows ONE full cycle of a wave: frame 0 is the moment the wave reaches the Nagoya height (game frame G1);
// the film plays the attack (G1 → cleared), then a new identical wave appears and its descent (0 → G1) ends at END.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { simulate, alienAt, col, row, N } from "./game.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1569 / FPS; // 52.30 s

export const EV = {
  lowest: W("lowest"), hit: W("hit"), you1End: W("you.", 1, "end"), still: W("still"), shoot: W("shoot,"), shots1: W("shots"), hurt: W("hurt"), you2End: W("you.", 2, "end"),
  players: W("players"), japan: W("japan"), nagoya: W("nagoya"), attack: W("attack."), attackEnd: W("attack.", 1, "end"),
  bug: W("bug."), every: W("every"), shot: W("shot"), starts: W("starts"), below1: W("below"), alienEnd: W("alien.", 1, "end"),
  counts: W("counts"), thin: W("thin"), strip1: W("strip"), cannons: W("cannon's"), heightEnd: W("height.", 1, "end"),
  higher: W("higher"), drop: W("drop"), strip2: W("strip,"), die: W("die."), dieEnd: W("die.", 1, "end"),
  but: W("but", 2), army1: W("army"), down1: W("down,"), top1: W("top"), shots3: W("shots", 3), below2: W("below", 2), itEnd: W("it.", 1, "end"),
  touch: W("touch"), cannon2: W("cannon,"), says: W("says:"), too: W("too"), low: W("low."), lowEnd: W("low.", 1, "end"),
  one1: W("one"), row1: W("row"), kill: W("kill"), againEnd: W("again.", 1, "end"),
  step: W("step"), down2: W("down,", 2), land: W("land."), game2: W("game", 3), over: W("over,"), lives: W("lives"), leftEnd: W("left.", 1, "end"),
  so1: W("so"), comeDown: W("come"), purpose: W("purpose,"), cleared: W("cleared"), front: W("front"), point: W("point-blank"), rangeEnd: W("range.", 1, "end"),
  army3: W("army", 3), speeds: W("speeds"), shrinks: W("shrinks:"), moves1: W("moves"), oneAlien: W("one", 3), frame: W("frame,"), last: W("last"), moves2: W("moves", 2), sixty: W("sixty"), secondEnd: W("second.", 1, "end"),
  creator: W("creator"), bug2: W("bug,"), taito: W("taito"), inEnd: W("in.", 1, "end"),
  next: W("next"), army4: W("army", 4), right2: W("right", 2), top2: W("top", 2), remember: W("remember:"), rememberEnd: W("remember:", 1, "end"),
};

// ---------------------------------------------------------------- the wave: kills (game frames), simulated march
const GAP = [2, 3].flatMap((c) => [0, 1, 2, 3, 4].map((r) => r * 11 + c));   // the gap the player carves on the way down
const descentKills = GAP.map((id, i) => [id, 300 + i * 200]);
const pre = simulate(descentKills, 6000);
export const G1 = pre.drops[3] + 65;                                         // the bottom row has reached Yr 40 (frame 0)
// after the seam: two point-blank kills, the rest of the front row, the upper rows, one slow pass, the last alien
const K = []; let g = G1 + 90;
K.push([4, g, "a"]); g += 110; K.push([5, g, "b"]);
export const C_ALIEN = 7, B_ALIEN = 16;                                       // A: lowest alien over the cannon; B: one row up (column 5)
g += 140; for (const id of [7, 8, 9, 10, 6, 1, 0]) { K.push([id, g, "e"]); g += 26; }
const upper = []; for (const c of [4, 5, 6, 7, 8, 9, 10, 1, 0]) for (const r of [1, 2, 3, 4]) upper.push(r * 11 + c);
export const LAST = upper.pop();
for (let i = 0; i < 24; i++) { K.push([upper[i], g, "f1"]); g += 30; }
export const G_DEMO = g; g += 14;
for (let i = 24; i < upper.length; i++) { K.push([upper[i], g, "f3"]); g += 24; }
export const G_LAST = g; g += 137; K.push([LAST, g, "last"]);
export const G_CLEAR = g;
export const KILLS = [...descentKills.map(([id, gg]) => [id, gg, "gap"]), ...K];
export const SIM = simulate(KILLS.map(([id, gg]) => [id, gg]), G_CLEAR + 30);
if (SIM.landed) throw new Error("the aliens landed at g=" + SIM.landed.g);

// ---------------------------------------------------------------- film time ↔ game frames (smooth Hermite through knots)
// Old wave: t ∈ [0, T_CLEAR] ↔ g ∈ [G1, G_CLEAR]. New wave: t ∈ [T_NEW, END] ↔ g ∈ [0, G1]; the rate at END equals the
// rate at 0, so the march runs on through the seam.
const R0 = 22;                                                                 // frames per film second at the seam (≈ 0.37×)
function hermite(knots, s0, s1) {
  const n = knots.length, m = new Array(n);
  for (let i = 0; i < n; i++) { if (i === 0) { m[i] = s0; continue; } if (i === n - 1) { m[i] = s1; continue; }
    const d0 = (knots[i][1] - knots[i - 1][1]) / (knots[i][0] - knots[i - 1][0]), d1 = (knots[i + 1][1] - knots[i][1]) / (knots[i + 1][0] - knots[i][0]); m[i] = d0 * d1 <= 0 ? 0 : (2 * d0 * d1) / (d0 + d1); }
  // Fritsch–Carlson limiter keeps g(t) monotone
  for (let i = 0; i < n - 1; i++) { const d = (knots[i + 1][1] - knots[i][1]) / (knots[i + 1][0] - knots[i][0]); if (d === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d, b = m[i + 1] / d, s = a * a + b * b; if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d; m[i + 1] = tau * b * d; } }
  const f = (t) => { let i = 0; while (i < n - 2 && t > knots[i + 1][0]) i++; const [t0, g0] = knots[i], [t1, g1] = knots[i + 1], h = t1 - t0, u = Math.max(0, Math.min(1, (t - t0) / h)), u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * g0 + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * g1 + (u3 - u2) * h * m[i + 1]; };
  f.rate = (t) => (f(t + 0.005) - f(t - 0.005)) / 0.01; return f;
}
const kg = (tag, i = 0) => K.filter((k) => k[2] === tag)[i === -1 ? K.filter((k) => k[2] === tag).length - 1 : i][1];
export const T_CLEAR = EV.secondEnd + 0.12, T_NEW = EV.creator - 0.1;
const OLD = hermite([
  [0, G1], [EV.hurt - 0.6, kg("a")], [EV.nagoya + 0.25, kg("b")], [EV.bug, kg("b") + 40], [EV.say ?? EV.says, kg("b") + 110], [EV.leftEnd + 0.4, kg("b") + 125],
  [EV.cleared, kg("e") - 4], [EV.rangeEnd - 0.1, kg("e", -1) + 6], [EV.army3, kg("e", -1) + 30], [EV.moves1 - 0.3, G_DEMO - 2], [EV.frame + 0.2, G_DEMO + 13],
  [EV.last - 0.05, G_LAST], [T_CLEAR, G_CLEAR],
], R0, 60);
const NEW = hermite([[T_NEW, 0], [T_NEW + 0.45, 10], [EV.top2 - 0.25, pre.drops[3] - 8], [EV.remember - 0.05, pre.drops[3] + 38], [END, G1]], 20, R0);
/** which wave and which game frame at film time t */
export function gameAt(t) { t = ((t % END) + END) % END; if (t < T_NEW) return { wave: "old", g: OLD(Math.min(t, T_CLEAR)), rate: t < T_CLEAR ? OLD.rate(t) : 0 }; return { wave: "new", g: NEW(t), rate: NEW.rate(t) }; }
/** film time of an old-wave game frame (for kills after the seam) and of a new-wave frame (descent kills) */
export function filmOfG(gg, wave) { const F = wave === "old" ? OLD : NEW; let a = wave === "old" ? 0 : T_NEW, b = wave === "old" ? T_CLEAR : END; for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (F(m) < gg) a = m; else b = m; } return (a + b) / 2; }
export const KILL_T = KILLS.map(([id, gg, tag]) => ({ id, g: gg, tag, t: tag === "gap" ? filmOfG(gg, "new") : filmOfG(gg, "old") }));
export const alienState = (id, gg, easeG) => alienAt(SIM.hist[id], gg, easeG);
export { pre as PRE };
