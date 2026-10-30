// QA of a finished loop MP4: frame count, durations, loop seam (picture: last vs first frame; sound: jump at the seam),
// loudness, and a contact sheet of frames taken FROM THE MP4. node qa.mjs <film folder> <file.mp4> [n frames]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import sharp from "sharp";

const FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg";
const [dir, file, nArg] = process.argv.slice(2), mp4 = path.join(dir, file), out = path.join(dir, "qa"); fs.mkdirSync(out, { recursive: true });
// decode every frame once into a raw stream at small size for the seam and the sheet
const W = 270, H = 480, raw = execFileSync(FF, ["-v", "error", "-i", mp4, "-vf", `scale=${W}:${H}:flags=area`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 2 ** 31 });
const F = raw.length / (W * H * 3), fr = (k) => raw.subarray(k * W * H * 3, (k + 1) * W * H * 3);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const seam = diff(fr(F - 1), fr(0)), neigh = [diff(fr(1), fr(0)), diff(fr(F - 1), fr(F - 2)), diff(fr(Math.floor(F / 2)), fr(Math.floor(F / 2) - 1))];
// one-frame pops: a frame that differs from both neighbours much more than they differ from each other
const D = new Float64Array(F); for (let k = 1; k < F; k++) D[k] = diff(fr(k), fr(k - 1));
const pops = []; for (let k = 1; k < F - 1; k++) { const across = diff(fr(k + 1), fr(k - 1)); if (D[k] > 0.8 && D[k + 1] > 0.8 && across < 0.45 * Math.min(D[k], D[k + 1])) pops.push({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2), across: +across.toFixed(2) }); }
const jumps = []; for (let k = 2; k < F - 1; k++) if (D[k] > 2.5 && D[k] > 3 * Math.max(D[k - 1], D[k + 1])) jumps.push({ t: +(k / 30).toFixed(2), d: +D[k].toFixed(2) });
// audio seam: last vs first sample, and the typical step between neighbours
const pcm = execFileSync(FF, ["-v", "error", "-i", mp4, "-ac", "1", "-ar", "48000", "-f", "s16le", "-"], { maxBuffer: 1 << 30 });
const S = pcm.length / 2, smp = (i) => pcm.readInt16LE(i * 2) / 32768;
const jump = Math.abs(smp(S - 1) - smp(0)); let typ = 0; for (let i = 1; i < S; i += 97) typ += Math.abs(smp(i) - smp(i - 1)); typ /= Math.floor(S / 97);
const ebu = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${mp4}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 });
const sum = ebu.slice(ebu.lastIndexOf("Summary")), I = /I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1], LRA = /LRA:\s+(-?[\d.]+) LU/.exec(sum)?.[1], TP = /Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1];
// contact sheet from the MP4
const n = Number(nArg || 18), cols = 6, rows = Math.ceil(n / cols), tiles = [];
for (let i = 0; i < n; i++) { const k = Math.round((i * (F - 1)) / (n - 1)), t = (k / 30).toFixed(2);
  const img = await sharp(Buffer.from(fr(k)), { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="24"><rect width="${W}" height="24" fill="#000" opacity="0.6"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${t} s</text></svg>`);
  tiles.push({ input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % cols) * W, top: Math.floor(i / cols) * H }); }
await sharp({ create: { width: cols * W, height: rows * H, channels: 3, background: "#000" } }).composite(tiles).jpeg({ quality: 86 }).toFile(path.join(out, "contact-sheet.jpg"));
const rep = { file, frames: F, video_s: +(F / 30).toFixed(3), audio_s: +(S / 48000).toFixed(3), seam_picture_meanabs: +seam.toFixed(3), neighbour_frames_meanabs: neigh.map((v) => +v.toFixed(3)), seam_audio_jump: +jump.toFixed(4), audio_typical_step: +typ.toFixed(4), loudness_LUFS: Number(I), true_peak_dBFS: Number(TP), LRA: Number(LRA), one_frame_pops: pops, sudden_jumps: jumps };
fs.writeFileSync(path.join(out, "qa.json"), JSON.stringify(rep, null, 1)); console.log(JSON.stringify(rep));
