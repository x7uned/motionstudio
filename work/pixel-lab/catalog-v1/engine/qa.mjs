// Trial 10 s · QA of the FINAL MP4 (never of the stills), copied from effort-exp-2026-10-25/xhigh/film/qa.mjs: frame count
// and durations, one-frame pops and sudden jumps (picture), loudness / true peak / LRA (sound), a labelled contact sheet,
// key frames with safe-zone overlays; plus the renderer's text boxes (labels, tags, cards, captions) of every frame
// against the safe zones. No model review. node engine/qa.mjs <run>
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const run = process.argv[2], HERE = fileURLToPath(new URL("..", import.meta.url)) + "runs/" + run + "/", FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ROOT = "/Users/rv/Desktop/Motion Studio/";
const file = "film.mp4", mp4 = HERE + file, out = HERE + "qa/"; fs.mkdirSync(out, { recursive: true });
const R0 = JSON.parse(fs.readFileSync(HERE + "resolved.json", "utf8")), lastEnd = R0.words.at(-1).end;
const W = 270, H = 480, raw = execFileSync(FF, ["-v", "error", "-i", mp4, "-vf", `scale=${W}:${H}:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 2 ** 31 });
const F = raw.length / (W * H * 3), fr = (k) => raw.subarray(k * W * H * 3, (k + 1) * W * H * 3);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const D = new Float64Array(F); for (let k = 1; k < F; k++) D[k] = diff(fr(k), fr(k - 1));
// one-frame pop: frame k differs from both neighbours while they are close to each other
const pops = []; for (let k = 1; k < F - 1; k++) { const across = diff(fr(k + 1), fr(k - 1)); if (D[k] > 0.8 && D[k + 1] > 0.8 && across < 0.45 * Math.min(D[k], D[k + 1])) pops.push({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2), across: +across.toFixed(2) }); }
// sudden jump: one frame-to-frame change much bigger than the changes around it
const jumps = []; for (let k = 2; k < F - 1; k++) if (D[k] > 2.5 && D[k] > 3 * Math.max(D[k - 1], D[k + 1])) jumps.push({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2) });
const top = [...D.keys()].slice(1).sort((a, b) => D[b] - D[a]).slice(0, 6).map((k) => ({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2) }));
// stream info from ffmpeg's own header dump (no ffprobe in bin/)
let info = ""; try { execFileSync(FF, ["-hide_banner", "-i", mp4], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { info = String(e.stderr); }
const vLine = (/Stream #0:\d+[^:]*: Video: ([^\n]+)/.exec(info) || [])[1] || "?", aLine = (/Stream #0:\d+[^:]*: Audio: ([^\n]+)/.exec(info) || [])[1] || "?";
const pcm = execFileSync(FF, ["-v", "error", "-i", mp4, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { maxBuffer: 1 << 30 }), S = pcm.length / 2;
const ebu = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${mp4}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 });
const sum = ebu.slice(ebu.lastIndexOf("Summary")), I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]), LRA = Number(/LRA:\s+(-?[\d.]+) LU/.exec(sum)?.[1]), TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1]);
// audio level per 0.5 s (dBFS RMS) — shows the bed under the voice and the payoff
const rms = []; for (let s0 = 0; s0 < S; s0 += 24000) { let a = 0, n = 0; for (let i = s0; i < Math.min(S, s0 + 24000); i++) { const v = pcm.readInt16LE(i * 2) / 32768; a += v * v; n++; } rms.push(+(10 * Math.log10(a / n + 1e-12)).toFixed(1)); }

async function sheet(name, ks, cols, w = W, h = H) {
  const rows = Math.ceil(ks.length / cols), tiles = [];
  for (const [i, k] of ks.entries()) { const img = await sharp(Buffer.from(fr(k)), { raw: { width: W, height: H, channels: 3 } }).resize(w, h, { kernel: "nearest" }).png().toBuffer();
    const label = Buffer.from(`<svg width="${w}" height="22"><rect width="${w}" height="22" fill="#000" opacity="0.65"/><text x="5" y="16" font-family="Menlo" font-size="14" fill="#fff">${(k / 30).toFixed(2)} s · f${k}</text></svg>`);
    tiles.push({ input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * h }); }
  await sharp({ create: { width: cols * w, height: rows * h, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 88 }).toFile(out + name);
}
// overview: 24 frames evenly over the film (first and last included)
await sheet("sheet.jpg", Array.from({ length: 24 }, (_, i) => Math.round((i * (F - 1)) / 23)), 6);
// full-size key frames from the MP4 and their safe-zone overlays
const reveal = R0.props.flatMap((p) => p.keys.filter((k) => ["run", "count"].includes(k.state)).map((k) => k.t + k.D)).sort((a, b) => a - b)[0] ?? 5;
const keys = [["hook", 0.6], ["reveal", +Math.min(9.5, reveal + 0.1).toFixed(2)], ["payoff", +Math.min(9.6, lastEnd + 0.9).toFixed(2)]];
for (const [name, t] of keys) {
  execFileSync(FF, ["-v", "error", "-y", "-ss", String(t), "-i", mp4, "-frames:v", "1", out + `frame-${name}.png`]);
  execFileSync("node", [ROOT + "scripts/safe-zones-overlay.mjs", out + `frame-${name}.png`, out + `zones-${name}.png`], { stdio: "ignore" });
}
// renderer text boxes of every frame (grid px) against docs/safe-zones.md ×0.5: main x 35–440 (505 above y 400), y 150–625; captions y 680–750, x 39–470
const LOG = JSON.parse(fs.readFileSync(HERE + "frames-log.json", "utf8")), outside = [], capOut = [];
for (const f of LOG) { for (const b of f.texts) { const xMax = b.y1 <= 400 ? 505 : 440; if (b.x0 < 35 || b.x1 > xMax || b.y0 < 150 || b.y1 > 625) outside.push({ t: f.t, ...b }); }
  for (const b of f.captions) if (b.y0 < 680 || b.y1 > 750 || b.x0 < 39 || b.x1 > 470) capOut.push({ t: f.t, ...b }); }
const rep = { file, frames: F, text_boxes_outside_main_zone: outside.length, text_box_examples: outside.slice(0, 5), caption_boxes_outside_row: capOut.length, video_s: +(F / 30).toFixed(3), audio_s: +(S / 48000).toFixed(3), size_MiB: +(fs.statSync(mp4).size / 1048576).toFixed(2), video: vLine.trim(), audio: aLine.trim(),
  loudness_LUFS: I, true_peak_dBTP: TP, LRA, one_frame_pops: pops, sudden_jumps: jumps, biggest_frame_changes: top, rms_dB_per_half_second: rms };
fs.writeFileSync(out + "qa.json", JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep));
