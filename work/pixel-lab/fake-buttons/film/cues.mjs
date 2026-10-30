// Per-level motion cues for synth.mjs (copied from the GTA film; kinds extended in the deadliest film: snap, roar,
// hiss, rattle, sting, growl, slap, bite, ghost, plane, click). Each level module exports MOTIONS ({ t0, t1, kind, level, note }) computed from the
// same expressions as its picture; here every motion becomes an 8-bit sound that lasts exactly as long as the motion.
// S = { tone, blip, seq, noise, sweep, swish, bubbles, n, env }.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
// every levels/*-motions.mjs file (written by the level builders) is loaded automatically
const files = fs.readdirSync(HERE + "levels").filter((f) => f.endsWith("-motions.mjs")).sort();
const ALL = []; for (const f of files) { const m = await import("./levels/" + f); ALL.push(...(m.MOTIONS ?? [])); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function play(S, m, k) {
  const { t0 } = m, t1 = Math.max(m.t1 ?? t0 + 0.08, t0 + 0.03), d = t1 - t0, kind = (m.kind || "").toLowerCase(), note = String(m.note || "").toLowerCase();
  if (kind === "twist" && !/jar|lid|cap/.test(note)) { S.swish(t0, Math.max(t1, t0 + 0.2), 0.012); return; }  // a body twist is a swish
  if (kind === "click" && /camera|shutter|photo/.test(note)) { S.shutter(t0, 1); return; }
  if (kind === "alert" && /phone|ring/.test(note)) { S.tone(t0, Math.min(0.5, Math.max(0.25, t1 - t0)), { duty: 0.125, f: (u, tt) => 1320 + 180 * Math.sign(Math.sin(tt * 2 * Math.PI * 16)), v: (u) => (1 - u) * 0.8, gain: 0.006 }); return; }   // a soft desk-phone trill, under the voice                       // the phone's (fake) shutter click
  const r = ((Math.sin(k * 12.9898 + t0 * 78.233) * 43758.5453) % 1 + 1) % 1;
  switch (kind) {
    case "buzz": case "flutter": { // wings: a soft pulse buzz with vibrato for the whole flight
      const tiny = note.includes("small") || note.includes("tiny");
      S.tone(t0, d, { duty: 0.25, f: (u, tt) => 190 + 30 * Math.sin(tt * 38) + (tiny ? 140 : 0), v: S.env(Math.min(0.2, 0.1 / d), Math.min(0.3, 0.1 / d)), gain: tiny ? 0.004 : 0.009 }); break; }
    case "pickup": case "poof": case "walk": case "squint": case "tagout": break;
    case "pose": case "crouch": S.swish(t0, Math.max(t1, t0 + 0.15), 0.006); break;
    case "feather": S.noise(t0, d, (u, tt) => 2500 + 800 * Math.sin(tt * 14), (u) => Math.sin(Math.PI * u) * 0.8, 0.007); break;
    case "float": S.tone(t0, d, { wave: "tri", f: (u, tt) => 700 - 250 * u + 30 * Math.sin(tt * 12), v: S.env(0.15, 0.25), gain: 0.012 }); break;
    case "reveal": S.seq(t0, ["G5", "C6", "E6"], 0.07, { gain: 0.018, duty: 0.25 }); break;
    case "dust": S.noise(t0, Math.min(0.4, d), () => 1400, (u) => Math.sin(Math.PI * u), 0.012); break;
    case "door": S.tone(t0, Math.max(0.3, d), { duty: 0.125, f: (u, tt) => 220 + 80 * u + 25 * Math.sin(tt * 35), v: S.env(0.1, 0.2), gain: 0.012 }); break;
    case "rustle": S.noise(t0, d, (u) => 3000 + 2500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.011); break;
    case "patter": { for (let t = t0; t < t1; t += 0.06) S.noise(t, 0.02, () => 5000, (u) => 1 - u, 0.008); break; }
    case "paddle": { for (let t = t0; t < t1; t += 0.16) S.noise(t, 0.08, () => 1800, (u) => Math.sin(Math.PI * u), 0.012); break; }
    case "thud": case "land": S.tone(t0, 0.12, { wave: "tri", f: (u) => 120 - 60 * u, v: (u) => 1 - u, gain: 0.05 }); S.noise(t0, 0.08, () => 900, (u) => 1 - u, 0.014); break;
    case "bounce": S.tone(t0, Math.min(0.3, d), { wave: "tri", f: (u) => 160 + 140 * Math.sin(Math.PI * u), v: (u) => 1 - u * 0.7, gain: 0.03 }); break;
    case "creak": case "tip": S.tone(t0, d, { duty: 0.125, f: (u, tt) => 180 + 60 * Math.sin(tt * 26), v: S.env(0.1, 0.2), gain: 0.01 }); break;
    case "rise": case "leap": S.tone(t0, Math.min(0.5, d), { duty: 0.25, f: (u) => 260 + 520 * u, v: S.env(0.1, 0.3), gain: 0.012 }); break;
    case "dive": S.tone(t0, Math.min(0.5, d), { duty: 0.25, f: (u) => 700 - 450 * u, v: S.env(0.1, 0.3), gain: 0.012 }); break;
    case "swim": case "turn": case "reach": case "lift": S.swish(t0, t1, 0.009); break;
    case "tilt": S.tone(t0, Math.min(0.5, d), { wave: "tri", f: (u) => 330 + 140 * Math.sin(Math.PI * u), v: S.env(0.1, 0.3), gain: 0.02 }); break;
    case "sparkle": { for (let t = t0, i = 0; t < t1; t += 0.07, i++) S.blip(t, ["C7", "E7", "G7", "B6"][i % 4], 0.04, 0.008, 0.125); break; }
    case "dab": S.blip(t0, "A6", 0.06, 0.014, 0.25); break;
    case "trunk": S.tone(t0, d, { wave: "tri", f: (u) => (note.includes("lower") ? 600 - 300 * u : 300 + 400 * u), v: S.env(0.15, 0.2), gain: 0.022 }); if (!note.includes("lower")) S.blip(t1 - 0.02, "E6", 0.06, 0.016, 0.25); break;
    case "drop": if (/person|people|pony|dog|animal|icon|tiny|bee|elephant|hippo|mouse/.test(note)) { S.tone(t0, Math.min(0.18, d), { duty: 0.25, f: (u) => 900 - 500 * u, v: (u) => 1 - u, gain: 0.01 }); S.blip(t0 + Math.min(0.18, d), "C5", 0.04, 0.014, 0.5); break; } S.tone(t0, Math.min(0.3, d), { duty: 0.25, f: (u) => 700 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.01 }); break;
    case "munch": { for (let t = t0; t < t1; t += 0.09) S.noise(t, 0.03, () => 2200, (u) => 1 - u, 0.016); break; }
    case "power": S.seq(t0, ["C5", "G5", "C6"], 0.07, { gain: 0.016, duty: 0.125 }); break;
    case "blip": S.blip(t0, "G6", 0.05, 0.012, 0.125); break;
    case "chime": S.seq(t0, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 }); break;
    case "huh": S.tone(t0, 0.25, { duty: 0.25, f: (u) => 400 + 200 * u, v: (u) => 1 - u * 0.5, gain: 0.016 }); break;
    case "stamp": if (/hoof|foot|stomp/.test(note)) { S.tone(t0, 0.1, { wave: "tri", f: (u) => 200 - 100 * u, v: (u) => 1 - u, gain: 0.045 }); S.noise(t0, 0.12, () => 1200, (u) => 1 - u, 0.02); break; } S.tone(t0, 0.25, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.02 }); S.noise(t0, 0.05, () => 1500, (u) => 1 - u, 0.03); break;            // pickups ring from synth.mjs; soft dissolves stay silent
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
    case "swing": if (/seesaw|board|beam|balance|pan|scale/.test(note)) { S.tone(t0, d, { duty: 0.125, f: (u, tt) => 170 + 50 * Math.sin(tt * 24), v: S.env(0.1, 0.25), gain: 0.01 }); break; }
    // falls through to a swish for other swings
    case "whoosh": case "toss": case "dip": S.swish(t0, t1, 0.014); break;
    case "chip": case "nibble": case "carve": { for (let t = t0; t < t1; t += 0.09) S.noise(t, 0.025, () => 7000 + 3000 * r, (u) => 1 - u, 0.018); break; }
    case "step": S.tone(t0, 0.05, { wave: "tri", f: (u) => 140 - 60 * u, v: (u) => 1 - u, gain: 0.03 }); S.noise(t0, 0.03, () => 1500, (u) => 1 - u, 0.008); break;
    case "flap": case "hop": S.noise(t0, Math.min(0.12, d), (u) => 1800 + 1200 * u, (u) => Math.sin(Math.PI * u), 0.02); break;
    case "tick": case "count": case "flip": { if (d > 0.3 && (kind === "count" || kind === "tick")) { for (let t = t0; t < t1; t += 0.06) S.blip(t, "A6", 0.02, 0.01, 0.125); S.seq(t1, ["E6", "A6"], 0.06, { gain: 0.02, duty: 0.25 }); } else if (kind === "flip") S.noise(t0, Math.min(0.08, d), () => 4000, (u) => Math.sin(Math.PI * u), 0.02); else S.blip(t0, ["C6", "D6", "E6", "G6", "A6"][(Number(note) || k) % 5], 0.04, 0.012, 0.125); break; }
    case "squeak": S.tone(t0, 0.12, { duty: 0.25, f: (u) => 1100 + 700 * Math.sin(Math.PI * u), v: (u) => 1 - u, gain: 0.02 }); break;
    case "gulp": S.tone(t0, Math.min(0.2, d), { wave: "tri", f: (u) => 500 * Math.pow(0.4, u), v: (u) => 1 - u, gain: 0.04 }); break;
    case "pull": case "poke": S.tone(t0, Math.min(0.15, d), { duty: 0.25, f: (u) => (kind === "pull" ? 300 + 500 * u : 600 - 300 * u), v: (u) => 1 - u, gain: 0.018 }); break;
    case "puff": S.noise(t0, Math.min(0.35, d), () => 900, (u) => Math.sin(Math.PI * u), 0.014); break;
    case "splash": { if (note.includes("paddle stroke")) break;   // the paddle sound covers the small stroke splashes
      if (note.includes("wave")) { S.noise(t0, d, (u) => 1200 + 1800 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u) ** 1.5, 0.012); break; } S.noise(t0, Math.min(0.6, Math.max(0.25, d)), (u) => 5000 - 3500 * u, (u) => Math.pow(1 - u, 1.4), 0.04); S.bubbles(t0 + 0.05, t0 + Math.min(0.7, d + 0.3), 0.6, k); break; }
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
    case "snap": case "chomp": S.noise(t0, 0.05, () => 3200, (u) => 1 - u, 0.04); S.tone(t0, 0.09, { wave: "tri", f: (u) => 420 - 260 * u, v: (u) => 1 - u, gain: 0.045 }); break;
    case "roar": S.tone(t0, Math.max(0.35, d), { duty: 0.5, f: (u, tt) => 140 + 70 * Math.sin(Math.PI * u) + 25 * Math.sin(tt * 2 * Math.PI * 23), v: S.env(0.12, 0.35), gain: 0.022 }); S.noise(t0, Math.max(0.35, d), (u) => 700 + 900 * Math.sin(Math.PI * u), S.env(0.1, 0.4), 0.02); break;
    case "growl": S.tone(t0, Math.max(0.25, d), { duty: 0.5, f: (u, tt) => 95 + 15 * Math.sin(tt * 2 * Math.PI * 31), v: S.env(0.15, 0.3), gain: 0.02 }); break;
    case "hiss": S.noise(t0, Math.max(0.2, d), (u) => 7000 + 1500 * Math.sin(Math.PI * u), S.env(0.15, 0.4), 0.014); break;
    case "rattle": { for (let t = t0; t < t1; t += 0.035) S.noise(t, 0.018, () => 6500, (u) => 1 - u, 0.012); break; }
    case "sting": S.tone(t0, Math.min(0.18, Math.max(0.1, d)), { duty: 0.125, f: (u) => 1800 + 1400 * u, v: (u) => 1 - u, gain: 0.016 }); S.blip(t0 + 0.02, "E7", 0.05, 0.01, 0.125); break;
    case "slap": S.noise(t0, 0.06, () => 2600, (u) => 1 - u, 0.05); S.tone(t0, 0.06, { wave: "tri", f: (u) => 300 - 120 * u, v: (u) => 1 - u, gain: 0.03 }); break;
    case "bite": S.tone(t0, Math.min(0.25, Math.max(0.12, d)), { duty: 0.25, f: (u) => 1400 - 900 * u, v: (u) => 1 - u * 0.6, gain: 0.016 }); S.blip(t0 + 0.12, "C5", 0.05, 0.012, 0.5); break;
    case "ghost": S.tone(t0, Math.max(0.4, d), { wave: "tri", f: (u, tt) => 520 + 160 * Math.sin(Math.PI * u) + 35 * Math.sin(tt * 2 * Math.PI * 6), v: S.env(0.25, 0.4), gain: 0.02 }); break;
    case "click": S.blip(t0, "C7", 0.025, 0.02, 0.25); S.noise(t0, 0.015, () => 8000, (u) => 1 - u, 0.012); break;
    case "plane": S.noise(t0, d, (u) => 1500 + 3500 * u, (u) => Math.sin(Math.PI * u), 0.016); break;
    case "dash": S.noise(t0, Math.max(0.12, d), (u) => 2500 + 3500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.018); S.tone(t0, Math.min(0.25, Math.max(0.12, d)), { duty: 0.25, f: (u) => 300 + 600 * u, v: (u) => 1 - u, gain: 0.008 }); break;
    case "squeak": S.tone(t0, Math.min(0.12, Math.max(0.05, d)), { duty: 0.25, f: (u) => 2400 + 900 * Math.sin(Math.PI * u), v: (u) => 1 - u, gain: 0.012 }); break;
    case "train": S.noise(t0, d, (u) => 900 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.022); S.tone(t0, d, { duty: 0.5, f: (u) => 330 * (1.12 - 0.24 * u), v: (u) => Math.sin(Math.PI * u) * 0.7, gain: 0.008 }); break;
    case "wind": case "gust": S.noise(t0, d, (u, tt) => 700 + 900 * Math.sin(Math.PI * u) + 200 * Math.sin(tt * 7), (u) => Math.sin(Math.PI * u), 0.02); break;
    case "glitch": { for (let t = t0, i = 0; t < t1; t += 0.045, i++) { const r2 = ((Math.sin((k + i) * 78.233) * 43758.5) % 1 + 1) % 1; if (i % 2) S.noise(t, 0.03, () => 1500 + 6000 * r2, (u) => 1 - u, 0.012); else S.blip(t, ["C7", "F6", "A6", "D7"][i % 4], 0.03, 0.009, 0.125); } break; }
    case "delete": S.seq(t0, ["G5", "D5", "G4"], 0.06, { gain: 0.016, duty: 0.25 }); S.noise(t0 + 0.12, 0.08, () => 1200, (u) => 1 - u, 0.012); break;
    case "engine": S.tone(t0, d, { duty: 0.5, f: (u, tt) => (note.includes("away") ? 140 - 40 * u : 100 + 60 * u) + 6 * Math.sin(tt * 60), v: (u) => Math.sin(Math.PI * u) * 0.8, gain: note.includes("not a car") ? 0.006 : 0.0035 }); break;
    case "horn": S.tone(t0, Math.max(0.18, d), { duty: 0.5, f: () => 392, v: (u) => 1 - u * 0.3, gain: 0.012 }); S.tone(t0, Math.max(0.18, d), { duty: 0.5, f: () => 494, v: (u) => 1 - u * 0.3, gain: 0.01 }); break;
    case "chatter": { for (let t = t0, i = 0; t < t1 - 0.05; t += 0.11, i++) S.blip(t, ["E6", "G6", "D6", "A6"][i % 4], 0.05, 0.006, 0.25); break; }
    case "dissolve": case "spawn": S.tone(t0, Math.max(0.12, d), { duty: 0.125, f: (u) => (kind === "spawn" ? 600 + 900 * u : 1400 - 900 * u), v: S.env(0.1, 0.3), gain: 0.008 }); break;
    case "none": case "sign": break;
    default: S.blip(t0, "E6", 0.05, 0.012, 0.25);
  }
}
// a motion that runs across the loop seam is listed twice (… → END and 0 → …): play it as ONE sound that runs past END;
// synth.mjs folds everything after END back onto the start, so the sound crosses the seam without a dip or a click
for (const a of ALL) { if (a.t1 < END - 0.05 || a.merged) continue;
  const b = ALL.find((q) => q !== a && !q.merged && q.t0 <= 0.05 && q.kind === a.kind && q.level === a.level && String(q.note ?? "").slice(0, 12) === String(a.note ?? "").slice(0, 12));
  if (b) { a.t1 = END + b.t1; b.merged = true; } }
export const CUES = [(S) => ALL.forEach((m, k) => { if (!m.merged && m.t0 >= -0.05 && m.t0 < END - 0.02) play(S, m, k); })];
export const COUNT = ALL.length;
