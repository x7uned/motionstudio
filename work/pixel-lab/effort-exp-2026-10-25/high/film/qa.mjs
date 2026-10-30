// QA of the finished MP4 (all measured from the file): frame count, durations, one-frame pops and sudden jumps,
// loop seam (picture: last vs first frame; sound: sample step at the seam), loudness / true peak, a labelled contact
// sheet qa/sheet.jpg, full-size key frames for the safe-zone overlays, and a spectrogram of the soundtrack.
// node qa.mjs <file.mp4>
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg";
const mp4 = HERE + (process.argv[2] || "pumpkin-face-high.mp4"), out = HERE + "qa/"; fs.mkdirSync(out, { recursive: true });
const W = 270, H = 480, raw = execFileSync(FF, ["-v", "error", "-i", mp4, "-vf", `scale=${W}:${H}:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 2 ** 31 });
const F = raw.length / (W * H * 3), fr = (k) => raw.subarray(k * W * H * 3, (k + 1) * W * H * 3);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const D = new Float64Array(F); for (let k = 1; k < F; k++) D[k] = diff(fr(k), fr(k - 1));
const pops = []; for (let k = 1; k < F - 1; k++) { const across = diff(fr(k + 1), fr(k - 1)); if (D[k] > 0.8 && D[k + 1] > 0.8 && across < 0.45 * Math.min(D[k], D[k + 1])) pops.push({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2), across: +across.toFixed(2) }); }
const jumps = []; for (let k = 2; k < F - 1; k++) if (D[k] > 2.5 && D[k] > 3 * Math.max(D[k - 1], D[k + 1])) jumps.push({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2) });
const maxD = [...D].map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]).slice(0, 5).map(([v, k]) => ({ t: +(k / 30).toFixed(2), d: +v.toFixed(2) }));
const pcm = execFileSync(FF, ["-v", "error", "-i", mp4, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
const S = pcm.length / 2, smp = (i) => pcm.readInt16LE(i * 2) / 32768;
const jump = Math.abs(smp(S - 1) - smp(0)); let typ = 0; for (let i = 1; i < S; i += 97) typ += Math.abs(smp(i) - smp(i - 1)); typ /= Math.floor(S / 97);
const ebu = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${mp4}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 });
const sum = ebu.slice(ebu.lastIndexOf("Summary")), I = /I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1], LRA = /LRA:\s+(-?[\d.]+) LU/.exec(sum)?.[1], TP = /Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1];
const probe = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -i "${mp4}" 2>&1 || true`], { encoding: "utf8" });
// contact sheet: 24 frames across the film, from the MP4
const n = 24, cols = 6, rows = Math.ceil(n / cols), tiles = [];
for (let i = 0; i < n; i++) { const k = Math.round((i * (F - 1)) / (n - 1)), t = (k / 30).toFixed(2);
  const img = await sharp(Buffer.from(fr(k)), { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="24"><rect width="${W}" height="24" fill="#000" opacity="0.6"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${t} s · f${k}</text></svg>`);
  tiles.push({ input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * H }); }
await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 86 }).toFile(out + "sheet.jpg");
// full-size key frames (for the safe-zone overlays) + spectrogram
for (const t of [0, 3.6, 7.3, 9.97]) execFileSync(FF, ["-v", "error", "-y", "-ss", String(t), "-i", mp4, "-frames:v", "1", out + `frame-${t.toFixed(2)}.png`]);
execFileSync(FF, ["-v", "error", "-y", "-i", mp4, "-lavfi", "showspectrumpic=s=1200x400:legend=1:scale=log", out + "spectrogram.png"]);
const rep = { file: mp4.split("/").pop(), bytes: fs.statSync(mp4).size, frames: F, video_s: +(F / 30).toFixed(3), audio_s: +(S / 48000).toFixed(3), stream_info: probe.split("\n").filter((l) => /Stream|Duration/.test(l)).map((l) => l.trim()),
  loudness_LUFS: Number(I), true_peak_dBFS: Number(TP), LRA: Number(LRA), one_frame_pops: pops, sudden_jumps: jumps, biggest_frame_diffs: maxD,
  seam_picture_meanabs: +diff(fr(F - 1), fr(0)).toFixed(3), neighbour_frames_meanabs: [D[1], D[F - 1], D[Math.floor(F / 2)]].map((v) => +v.toFixed(3)), seam_audio_jump: +jump.toFixed(4), audio_typical_step: +typ.toFixed(4) };
fs.writeFileSync(out + "qa.json", JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep));
