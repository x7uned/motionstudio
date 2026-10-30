// Per-level motion cues for synth.mjs. Each level module exports MOTIONS ({ t0, t1, kind, level, note }) computed from the
// same expressions as its picture; here every motion becomes an 8-bit sound that lasts exactly as long as the motion.
// S = { tone, blip, seq, noise, sweep, swish, bubbles, n, env }.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, LV, END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const load = async (f) => (fs.existsSync(HERE + "levels/" + f) ? (await import("./levels/" + f)).MOTIONS ?? [] : []);
const ALL = [...(await load("sea-motions.mjs")), ...(await load("meadow-motions.mjs")), ...(await load("bay-motions.mjs")), ...CITY()];

function CITY() {
  const out = [{ t0: EV.eightySix - 0.1, t1: EV.eightySix + 1.3, kind: "shimmer", level: "city" }, { t0: EV.plan - 0.2, t1: EV.plan + 0.2, kind: "whoosh", level: "city" },
    { t0: EV.lists - 0.15, t1: EV.lists + 0.1, kind: "pop", level: "city" }];
  for (let i = 0; i < 10; i++) out.push({ t0: EV.lists + (9 - i) * 0.06, t1: EV.lists + (9 - i) * 0.06 + 0.05, kind: "tick", level: "city", note: String(i) });
  return out;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function play(S, m, k) {
  const { t0 } = m, t1 = Math.max(m.t1 ?? t0 + 0.08, t0 + 0.03), d = t1 - t0, kind = (m.kind || "").toLowerCase(), note = String(m.note || "").toLowerCase();
  const r = ((Math.sin(k * 12.9898 + t0 * 78.233) * 43758.5453) % 1 + 1) % 1;
  switch (kind) {
    case "buzz": case "flutter": { // wings: a soft pulse buzz with vibrato for the whole flight
      const tiny = note.includes("small") || note.includes("tiny");
      S.tone(t0, d, { duty: 0.25, f: (u, tt) => 190 + 30 * Math.sin(tt * 38) + (tiny ? 140 : 0), v: S.env(Math.min(0.2, 0.1 / d), Math.min(0.3, 0.1 / d)), gain: tiny ? 0.004 : 0.009 }); break; }
    case "pickup": case "poof": case "walk": case "squint": case "tagout": break;
    case "rise": case "leap": S.tone(t0, Math.min(0.5, d), { duty: 0.25, f: (u) => 260 + 520 * u, v: S.env(0.1, 0.3), gain: 0.012 }); break;
    case "dive": S.tone(t0, Math.min(0.5, d), { duty: 0.25, f: (u) => 700 - 450 * u, v: S.env(0.1, 0.3), gain: 0.012 }); break;
    case "swim": case "turn": case "reach": case "lift": S.swish(t0, t1, 0.009); break;
    case "tilt": S.tone(t0, Math.min(0.5, d), { wave: "tri", f: (u) => 330 + 140 * Math.sin(Math.PI * u), v: S.env(0.1, 0.3), gain: 0.02 }); break;
    case "sparkle": { for (let t = t0, i = 0; t < t1; t += 0.07, i++) S.blip(t, ["C7", "E7", "G7", "B6"][i % 4], 0.04, 0.008, 0.125); break; }
    case "dab": S.blip(t0, "A6", 0.06, 0.014, 0.25); break;
    case "trunk": S.tone(t0, d, { wave: "tri", f: (u) => (note.includes("lower") ? 600 - 300 * u : 300 + 400 * u), v: S.env(0.15, 0.2), gain: 0.022 }); if (!note.includes("lower")) S.blip(t1 - 0.02, "E6", 0.06, 0.016, 0.25); break;
    case "drop": S.tone(t0, Math.min(0.3, d), { duty: 0.25, f: (u) => 700 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.01 }); break;
    case "munch": { for (let t = t0; t < t1; t += 0.09) S.noise(t, 0.03, () => 2200, (u) => 1 - u, 0.016); break; }
    case "power": S.seq(t0, ["C5", "G5", "C6"], 0.07, { gain: 0.016, duty: 0.125 }); break;
    case "blip": S.blip(t0, "G6", 0.05, 0.012, 0.125); break;
    case "chime": S.seq(t0, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 }); break;
    case "huh": S.tone(t0, 0.25, { duty: 0.25, f: (u) => 400 + 200 * u, v: (u) => 1 - u * 0.5, gain: 0.016 }); break;
    case "stamp": S.tone(t0, 0.25, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.02 }); S.noise(t0, 0.05, () => 1500, (u) => 1 - u, 0.03); break;            // pickups ring from synth.mjs; soft dissolves stay silent
    case "trill": S.tone(t0, d, { duty: 0.125, f: (u, tt) => 520 + 200 * Math.sin(tt * 2 * Math.PI * 18), v: S.env(0.1, 0.1), gain: 0.012 }); break;
    case "boing": S.tone(t0, Math.min(0.4, d), { duty: 0.25, f: (u) => 300 + 500 * Math.sin(Math.PI * u), v: (u) => 1 - u * 0.6, gain: 0.018 }); break;
    case "draw": S.tone(t0, d, { duty: 0.125, f: (u) => 500 + 700 * u, v: S.env(0.15, 0.2), gain: 0.01 }); break;
    case "twinkle": { for (let t = t0, i = 0; t < t1 - 0.1; t += 0.32, i++) S.blip(t, ["E7", "B6", "G7", "D7"][i % 4], 0.06, 0.007, 0.125); break; }
    case "clink": S.seq(t0, ["E7", "B7"], 0.05, { gain: 0.016, duty: 0.125 }); break;
    case "clack": S.noise(t0, 0.03, () => 3500, (u) => 1 - u, 0.03); S.tone(t0, 0.04, { wave: "tri", f: () => 700, v: (u) => 1 - u, gain: 0.025 }); break;
    case "scratch": S.noise(t0, d, (u, tt) => 2500 + 1500 * Math.sin(tt * 2 * Math.PI * 9), (u) => Math.sin(Math.PI * u), 0.014); break;
    case "squish": S.tone(t0, d, { wave: "tri", f: (u, tt) => 260 - 120 * u + 40 * Math.sin(tt * 60), v: (u) => 1 - u, gain: 0.03 }); break;
    case "fall": S.tone(t0, d, { duty: 0.25, f: (u) => 900 * Math.pow(0.4, u), v: (u) => 1 - u * 0.5, gain: 0.012 }); break;
    case "swish": S.swish(t0, t1, 0.008); break;
    case "alert": S.seq(t0, ["B6", "B6"], 0.07, { gain: 0.024, duty: 0.5, dur: 0.05 }); break;
    case "uhoh": S.seq(t0, ["E5", "C5"], 0.12, { gain: 0.018, duty: 0.25, dur: 0.11 }); break;
    case "wiggle": case "waggle": S.tone(t0, d, { duty: 0.125, f: (u, tt) => 420 + 160 * Math.sin(tt * 2 * Math.PI * 12), v: S.env(0.1, 0.1), gain: 0.012 }); break;
    case "pop": case "appear": case "tag": case "pickup": S.seq(t0, r < 0.5 ? ["C6", "G6"] : ["E6", "B6"], 0.05, { gain: 0.022, duty: 0.25 }); break;
    case "whoosh": case "toss": case "swing": case "dip": S.swish(t0, t1, 0.014); break;
    case "chip": case "nibble": case "carve": { for (let t = t0; t < t1; t += 0.09) S.noise(t, 0.025, () => 7000 + 3000 * r, (u) => 1 - u, 0.018); break; }
    case "step": S.tone(t0, 0.05, { wave: "tri", f: (u) => 140 - 60 * u, v: (u) => 1 - u, gain: 0.03 }); S.noise(t0, 0.03, () => 1500, (u) => 1 - u, 0.008); break;
    case "flap": case "hop": S.noise(t0, Math.min(0.12, d), (u) => 1800 + 1200 * u, (u) => Math.sin(Math.PI * u), 0.02); break;
    case "tick": case "count": case "flip": { if (d > 0.3 && (kind === "count" || kind === "tick")) { for (let t = t0; t < t1; t += 0.06) S.blip(t, "A6", 0.02, 0.01, 0.125); S.seq(t1, ["E6", "A6"], 0.06, { gain: 0.02, duty: 0.25 }); } else if (kind === "flip") S.noise(t0, Math.min(0.08, d), () => 4000, (u) => Math.sin(Math.PI * u), 0.02); else S.blip(t0, ["C6", "D6", "E6", "G6", "A6"][(Number(note) || k) % 5], 0.04, 0.012, 0.125); break; }
    case "squeak": S.tone(t0, 0.12, { duty: 0.25, f: (u) => 1100 + 700 * Math.sin(Math.PI * u), v: (u) => 1 - u, gain: 0.02 }); break;
    case "gulp": S.tone(t0, Math.min(0.2, d), { wave: "tri", f: (u) => 500 * Math.pow(0.4, u), v: (u) => 1 - u, gain: 0.04 }); break;
    case "pull": case "poke": S.tone(t0, Math.min(0.15, d), { duty: 0.25, f: (u) => (kind === "pull" ? 300 + 500 * u : 600 - 300 * u), v: (u) => 1 - u, gain: 0.018 }); break;
    case "splash": { if (note.includes("wave")) { S.noise(t0, d, (u) => 1200 + 1800 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u) ** 1.5, 0.012); break; } S.noise(t0, Math.min(0.6, Math.max(0.25, d)), (u) => 5000 - 3500 * u, (u) => Math.pow(1 - u, 1.4), 0.04); S.bubbles(t0 + 0.05, t0 + Math.min(0.7, d + 0.3), 0.6, k); break; }
    case "whistle": { // follow the drawn waveform: contour [[k, pitch 0..1, amp 0..1]]
      const C = m.contour ?? [[0, 0.5, 1], [1, note.includes("down") ? 0.2 : 0.9, 1]], at = (u, j) => { let i = 0; while (i < C.length - 2 && C[i + 1][0] <= u) i++; const a = C[i], b = C[i + 1], q = (u - a[0]) / (b[0] - a[0] || 1); return a[j] + (b[j] - a[j]) * Math.max(0, Math.min(1, q)); };
      S.tone(t0, d, { duty: 0.25, f: (u, tt) => 900 * Math.pow(2, at(u, 1) * 1.3) + 40 * Math.sin(tt * 2 * Math.PI * 9), v: (u) => Math.min(1, at(u, 2) * 1.6 + 0.15), gain: 0.018 }); break; }
    case "glow": case "match": case "heart": case "shimmer": S.seq(t0, ["E6", "G6", "B6", "E7"], Math.min(0.09, d / 4), { gain: 0.016, duty: 0.125 }); break;
    case "slide": S.tone(t0, d, { wave: "tri", f: (u) => 900 * Math.pow(0.35, u), v: S.env(0.1, 0.2), gain: 0.03 }); break;
    case "zap": case "line": S.tone(t0, d, { duty: 0.125, f: (u, tt) => 300 + 900 * u + 80 * Math.sin(tt * 90), v: S.env(0.05, 0.2), gain: 0.014 }); break;
    case "tap": { if (note.includes("land") || note.includes("impact")) { S.tone(t0, 0.06, { wave: "tri", f: (u) => 220 - 90 * u, v: (u) => 1 - u, gain: 0.03 }); break; } const i = m.pitch != null ? m.pitch + 1 : Number((note.match(/\d+/) || [k % 9])[0]); S.blip(t0, ["C6", "D6", "E6", "F6", "G6", "A6", "B6", "C7", "D7"][clamp(i - 1, 0, 8)] ?? "C6", 0.05, 0.022, 0.25); break; }
    case "wrong": case "x": case "buzzer": S.tone(t0, 0.25, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.02 }); break;
    case "screen": case "on": S.seq(t0, ["C5", "C6"], 0.06, { gain: 0.018, duty: 0.125 }); break;
    case "trumpet": S.tone(t0, Math.max(0.3, d), { duty: 0.25, f: (u, tt) => 330 + 220 * Math.sin(Math.PI * u) + 18 * Math.sin(tt * 40), v: S.env(0.1, 0.3), gain: 0.02 }); break;
    case "pulse": case "contract": S.tone(t0, Math.min(0.3, d), { wave: "tri", f: (u) => 160 + 120 * u, v: (u) => Math.sin(Math.PI * u), gain: 0.03 }); break;
    case "twist": case "creak": S.tone(t0, d, { duty: 0.125, f: (u, tt) => 160 + 40 * Math.sin(tt * 30), v: S.env(0.1, 0.1), gain: 0.012 }); break;
    case "stream": case "bubble": case "bubbles": S.bubbles(t0, t1, 0.5, k); break;
    case "grin": case "giggle": S.seq(t0, ["G5", "C6", "E6"], 0.07, { gain: 0.016, duty: 0.25 }); break;
    case "bark": S.seq(t0, ["A4", "E5"], 0.07, { gain: 0.02, duty: 0.5 }); break;
    case "caw": S.tone(t0, 0.22, { duty: 0.5, f: (u) => 520 - 180 * u, v: (u) => 1 - u * 0.6, gain: 0.016 }); break;
    case "none": case "sign": break;
    default: S.blip(t0, "E6", 0.05, 0.012, 0.25);
  }
}
export const CUES = [(S) => ALL.forEach((m, k) => { if (m.t0 >= 0 && m.t0 < END - 0.05) play(S, m, k); })];
export const COUNT = ALL.length;
