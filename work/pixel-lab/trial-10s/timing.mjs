// Word timings for the trial: a recorded take (words.json from ElevenLabs alignment) or, for no-voice previews,
// an estimate calibrated on the shared Dennis · v4 take (work/pixel-lab/effort-exp-2026-10-25/common/voice).
// Film time = take time + VOICE_AT (0.30 s), like the effort films.
import fs from "node:fs";
import { VOICE_AT, scriptWords } from "./contract.mjs";

export function fromTake(wordsJson) {
  const raw = JSON.parse(fs.readFileSync(wordsJson, "utf8"));
  return { voiced: true, source: wordsJson, text: raw.text, words: raw.words.map((w) => ({ text: w.text, start: +(w.start + VOICE_AT).toFixed(3), end: +(w.end + VOICE_AT).toFixed(3) })) };
}

const FUNC = new Set(["a", "an", "the", "and", "of", "in", "on", "to", "for", "it", "is", "at", "as", "by", "or", "that", "this", "your", "you", "its", "we", "our"]);
export const syllables = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (!w) return Math.max(1, Math.ceil(String(w).length / 2)); if (w.length <= 3) return 1; w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, ""); return Math.max(1, (w.match(/[aeiouy]{1,2}/g) || []).length); };
const digitsSyl = (w) => { const d = w.replace(/[^0-9]/g, ""); return d ? Math.min(9, 1 + d.length) : 0; };
// Calibration (2026-10-26): on the shared take the estimate ends at 8.10 s vs 8.06 s measured (film time), max start error 0.19 s.
const K = 1.065;
export function estimate(script) {
  const out = []; let t = 0.16 + VOICE_AT;
  for (const w of scriptWords(script)) {
    const bare = w.text.replace(/[^A-Za-z0-9']/g, ""), syl = digitsSyl(bare) || syllables(bare);
    let d = FUNC.has(bare.toLowerCase()) ? 0.07 : 0.06 + 0.115 * syl;
    if (/[.!?]$/.test(w.text)) d += 0.4; else if (/[,:;]$/.test(w.text)) d += 0.3;
    d *= K;
    out.push({ text: w.text, start: +t.toFixed(3), end: +(t + d).toFixed(3) });
    t += d + 0.075 * K;
  }
  return { voiced: false, source: "estimate", text: script, words: out };
}
