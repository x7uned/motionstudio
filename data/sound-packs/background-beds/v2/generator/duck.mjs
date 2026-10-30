// Duck a stereo bed under the narration: pauseDb in silence, speechDb under voice, smooth attack/release.
// Also prints per-second bed RMS stats and the share of energy above 200 Hz (phone speaker range).
import fs from 'node:fs';
const SR = 48000;
const [,, bedPath, gainDb, voicePath, seconds, pauseDb, speechDb, out] = process.argv;
const bed = new Float32Array(fs.readFileSync(bedPath).buffer.slice(0));
const voice = new Float32Array(fs.readFileSync(voicePath).buffer.slice(0));
const N = Math.round(Number(seconds) * SR), g0 = 10 ** (Number(gainDb) / 20);
const gp = 10 ** (Number(pauseDb) / 20), gs = 10 ** (Number(speechDb) / 20);
// voice envelope: 20 ms RMS, open threshold -45 dBFS, hold 250 ms
const win = 960, hold = SR * 0.25, thr = 10 ** (-45 / 20);
const target = new Float32Array(N); let last = -1e9;
for (let i = 0; i < N; i += win) {
  let s = 0; for (let j = i; j < i + win && j < voice.length; j++) s += voice[j] * voice[j];
  if (Math.sqrt(s / win) > thr) last = i;
  const v = i - last < hold ? 1 : 0; for (let j = i; j < i + win && j < N; j++) target[j] = v;
}
const out2 = new Float32Array(N * 2); let k = 0;
const atk = 1 - Math.exp(-1 / (0.12 * SR)), rel = 1 - Math.exp(-1 / (0.7 * SR));
const T = N / SR, sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
let lowE = 0, allE = 0, hp = 0, x1 = 0; const a = Math.exp(-2 * Math.PI * 200 / SR);
const perSec = [];
for (let i = 0; i < N; i++) {
  k += (target[i] - k) * (target[i] > k ? atk : rel);
  const g = g0 * (gp + (gs - gp) * k) * sm(i / SR / 1.5) * sm((T - i / SR) / 2.5);
  const l = bed[2 * i] * g, r = bed[2 * i + 1] * g; out2[2 * i] = l; out2[2 * i + 1] = r;
  const m = (bed[2 * i] + bed[2 * i + 1]) / 2; hp = a * (hp + m - x1); x1 = m; lowE += hp * hp; allE += m * m;
  if (i % SR === 0) perSec.push(0); perSec[perSec.length - 1] += m * m;
}
const db = perSec.slice(2, -3).map(e => 10 * Math.log10(e / SR + 1e-12) + 20 * Math.log10(g0));
console.log(JSON.stringify({ above200HzShare: +(lowE / allE).toFixed(2), bedRmsDb: { min: +Math.min(...db).toFixed(1), max: +Math.max(...db).toFixed(1) } }));
fs.writeFileSync(out, Buffer.from(out2.buffer));
