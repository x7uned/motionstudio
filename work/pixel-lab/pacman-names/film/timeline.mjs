// «Pac-Man's ghost names got lost in translation» timeline: every event is anchored to a measured word of the single
// voice take. Loop film: END is chosen so the pause at the seam (last voice sound 53.56 s → END → first sound 0.10 s)
// is a sentence pause (0.41 s). The game (one closed lap of Pac-Man, game.json) runs on its own clock τ; the film maps
// its time onto the lap with a smooth, always-forward warp whose keys put each story moment of the lap on its words
// (CLOCK_KEYS in game.json), and τ(END) = one whole lap.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1616 / FPS; // 53.867 s

export const EV = {
  names: W("names"), lost: W("lost"), translation: W("translation."), translationEnd: W("translation.", 1, "end"),
  know: W("know"), blinky: W("blinky,"), pinky: W("pinky,"), inky: W("inky"), clyde: W("clyde."),
  screen: W("screen"), single: W("single"), word: W("word:"), shadow: W("shadow,"), speedy: W("speedy,"), bashful: W("bashful"), pokey: W("pokey."),
  but: W("but"), speedy2: W("speedy", 2), faster: W("faster"), others: W("others,"), pokey2: W("pokey", 2), slower: W("slower."), slowerEnd: W("slower.", 1, "end"),
  japanese: W("japanese"), words: W("words"), hunts: W("hunts."), huntsEnd: W("hunts.", 1, "end"),
  blinky2: W("blinky", 2), oikake: W("oikake,"), chaser: W("chaser."), aims: W("aims"), square: W("square."), squareEnd: W("square.", 1, "end"),
  pinky2: W("pinky", 2), machibuse: W("machibuse,"), ambusher: W("ambusher,"), aiming: W("aiming"), four: W("four"), ahead: W("ahead"), youK: W("you.", 3), youKEnd: W("you.", 3, "end"),
  inky2: W("inky", 2), kimagure: W("kimagure,"), moody: W("moody."), target: W("target"), depends: W("depends"), blinky3: W("blinky", 3), path: W("path"), changing: W("changing."), changingEnd: W("changing.", 1, "end"),
  clyde2: W("clyde", 2), otoboke: W("otoboke,"), playing: W("playing"), dumb: W("dumb."), far: W("far"), chases: W("chases"),
  closer: W("closer"), eight: W("eight"), turns: W("turns"), heads: W("heads"), corner: W("corner."), circling: W("circling"), circlingEnd: W("you.", 5, "end"),
  does: W("does"), nothing: W("nothing,"), corner2: W("corner", 2), bottom: W("bottom"), left: W("left."), down: W("down"), home: W("home"), runs: W("runs"), through: W("through"), youC: W("you.", 6), youCEnd: W("you.", 6, "end"),
  never: W("never"), knew: W("knew"), why: W("why:"), whyEnd: W("why:", 1, "end"),
};

// ---------------------------------------------------------------- the game clock: a monotone, periodic warp
// keys [[t, τ], ...] from game.json (t in film seconds, τ in lap seconds), with (0, 0) and (END, Tg) implied.
// Monotone cubic (Fritsch–Carlson) through the keys; the slope at the seam is shared by both ends.
export function makeClock(keys, Tg) {
  const P = [[0, 0], ...keys, [END, Tg]], n = P.length, d = [];
  for (let i = 0; i + 1 < n; i++) d.push((P[i + 1][1] - P[i][1]) / (P[i + 1][0] - P[i][0]));
  const m = new Array(n).fill(0);
  for (let i = 1; i + 1 < n; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i]);
  m[0] = m[n - 1] = (2 * d[0] * d[n - 2]) / (d[0] + d[n - 2]);
  for (let i = 0; i + 1 < n; i++) { const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  function tau(t) {
    const k = Math.floor(t / END); t -= k * END;
    let i = 0; while (i + 2 < n && P[i + 1][0] <= t) i++;
    const [x0, y0] = P[i], [x1, y1] = P[i + 1], h = x1 - x0, u = (t - x0) / h, u2 = u * u, u3 = u2 * u;
    return k * Tg + (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * h * m[i + 1];
  }
  const rate = (t) => (tau(t + 0.01) - tau(t - 0.01)) / 0.02;
  return { tau, rate, keys: P };
}
