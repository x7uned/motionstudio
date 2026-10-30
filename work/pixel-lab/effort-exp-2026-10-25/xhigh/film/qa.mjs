// «Pumpkin face» — QA of the FINAL MP4 (never of the stills): frame count and durations, one-frame pops and sudden jumps
// (picture), loudness / true peak / LRA (sound), a labelled contact sheet, dense sheets over the busiest transitions,
// full-size key frames and their safe-zone overlays. node qa.mjs [file.mp4]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ROOT = "/Users/rv/Desktop/Motion Studio/";
const file = process.argv[2] || "pumpkin-face-xhigh.mp4", mp4 = HERE + file, out = HERE + "qa/"; fs.mkdirSync(out, { recursive: true });
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
// dense transition sheets: every 2nd frame over the pull-back + scan, the lock + blink, the light-up + link, the wink
const dense = (a, b, step = 2) => { const ks = []; for (let k = Math.round(a * 30); k <= Math.round(b * 30); k += step) ks.push(Math.min(F - 1, k)); return ks; };
await sheet("dense-1.9-3.0.jpg", dense(1.9, 3.0), 9, 180, 320);
await sheet("dense-3.0-4.2.jpg", dense(3.0, 4.2), 9, 180, 320);
await sheet("dense-6.5-7.9.jpg", dense(6.5, 7.9), 9, 180, 320);
await sheet("dense-8.2-9.3.jpg", dense(8.2, 9.3), 9, 180, 320);
// full-size key frames from the MP4 and their safe-zone overlays
const keys = [["hook", 0.6], ["face", 3.3], ["sixth", 4.9], ["lit", 7.0], ["end", 9.9]];
for (const [name, t] of keys) {
  execFileSync(FF, ["-v", "error", "-y", "-ss", String(t), "-i", mp4, "-frames:v", "1", out + `frame-${name}.png`]);
  execFileSync("node", [ROOT + "scripts/safe-zones-overlay.mjs", out + `frame-${name}.png`, out + `zones-${name}.png`], { stdio: "ignore" });
}
const rep = { file, frames: F, video_s: +(F / 30).toFixed(3), audio_s: +(S / 48000).toFixed(3), size_MiB: +(fs.statSync(mp4).size / 1048576).toFixed(2), video: vLine.trim(), audio: aLine.trim(),
  loudness_LUFS: I, true_peak_dBTP: TP, LRA, one_frame_pops: pops, sudden_jumps: jumps, biggest_frame_changes: top, rms_dB_per_half_second: rms };
fs.writeFileSync(out + "qa.json", JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep));
