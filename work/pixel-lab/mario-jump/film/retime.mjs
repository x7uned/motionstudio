// Move the ElevenLabs alignment of a pixel film's voice take onto Scribe's measured word timings (numbers like "3,250"
// are spoken as several words, and the TTS alignment squeezes them). The caption text and tokens stay the script's own;
// only start/end move. The original alignment is kept as voice/words-el.json.  node retime.mjs <film dir>
import fs from "node:fs";
const dir = process.argv[2], vf = dir + "/voice/words.json", sf = dir + "/voice/scribe.json";
const V = JSON.parse(fs.readFileSync(vf, "utf8")), S = JSON.parse(fs.readFileSync(sf, "utf8")).words;
if (!fs.existsSync(dir + "/voice/words-el.json")) fs.writeFileSync(dir + "/voice/words-el.json", JSON.stringify(V, null, 1));
const SRC = JSON.parse(fs.readFileSync(dir + "/voice/words-el.json", "utf8"));
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9']/g, "").replace(/metres$/, "meters").replace(/centimetres$/, "centimeters");
const same = (a, b) => { a = norm(a); b = norm(b); return a === b || (a === "liked" && b === "like") || (a === b + "s"); };
const isNum = (s) => /\d/.test(s);
const out = []; let j = 0, moved = 0;
for (let i = 0; i < SRC.words.length; i++) {
  const w = SRC.words[i];
  if (!isNum(w.text) && j < S.length && same(w.text, S[j].text)) { out.push({ ...w, start: S[j].start, end: S[j].end }); j++; continue; }
  // a spoken number (or a mismatch): take Scribe words up to the next script word that matches
  const next = SRC.words[i + 1]; let k = j;
  if (isNum(w.text) && j < S.length && same(w.text, S[j].text)) k = j + 1;           // Scribe kept the digits
  else { while (k < S.length && !(next && same(next.text, S[k].text))) k++; if (!next) k = S.length; }
  if (k === j) { out.push(w); console.warn("kept", w.text); continue; }
  out.push({ ...w, start: S[j].start, end: S[k - 1].end }); moved++; j = k;
}
if (j !== S.length) console.warn(`scribe words left: ${S.length - j}`);
const d = (a, b) => Math.abs(a.start - b.start);
let maxd = 0; out.forEach((w, i) => (maxd = Math.max(maxd, d(w, SRC.words[i]))));
V.words = out; V.retimed = "scribe_v1"; fs.writeFileSync(vf, JSON.stringify(V, null, 1));
console.log(`${dir}: ${out.length} words, ${moved} spans merged, max start shift ${maxd.toFixed(2)} s, last end ${out[out.length - 1].end}`);
