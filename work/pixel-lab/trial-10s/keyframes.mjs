// Keyframe sheets from the final MP4s (ffmpeg seek, nothing re-rendered):
//   keyframes-pumpkin.jpg — the three agent-built effort films of 2026-10-25 (medium / high / xhigh) and the two trial films
//                           (one Claude call, medium / low) at the same narration beats (the same shared voice take);
//   keyframes-topics.jpg  — the no-voice previews (sunlight, bats; medium / low) at fixed times.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", EX = HERE + "../effort-exp-2026-10-25/";
async function sheet(out, beats, rows) {
  const tw = 216, th = 384, lab = 30, head = 34, comps = [];
  for (const [i, [, name]] of beats.entries()) comps.push({ input: Buffer.from(`<svg width="${tw}" height="${head}"><text x="6" y="24" font-size="17" font-family="Helvetica" fill="#172033">${name}</text></svg>`), left: i * tw, top: 0 });
  fs.mkdirSync(HERE + "sheet-tmp", { recursive: true });
  for (const [r, [label, file]] of rows.entries()) { const top = head + r * (th + lab);
    comps.push({ input: Buffer.from(`<svg width="${tw * beats.length}" height="${lab}"><text x="6" y="22" font-size="19" font-weight="bold" font-family="Helvetica" fill="#172033">${label}</text></svg>`), left: 0, top });
    for (const [i, [t]] of beats.entries()) { const f = `${HERE}sheet-tmp/${r}-${i}.jpg`; execFileSync(FF, ["-y", "-v", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", `scale=${tw}:${th}`, "-q:v", "3", f]); comps.push({ input: f, left: i * tw, top: top + lab }); } }
  await sharp({ create: { width: tw * beats.length, height: head + rows.length * (th + lab), channels: 3, background: "#e7edf6" } }).composite(comps).jpeg({ quality: 88 }).toFile(HERE + out);
  fs.rmSync(HERE + "sheet-tmp", { recursive: true, force: true }); console.log(out);
}
const cost = JSON.parse(fs.readFileSync(HERE + "costs.json", "utf8")).rows, usd = (run) => `$${cost.find((r) => r.run === run).cli.toFixed(3)}`;
const effort = JSON.parse(fs.readFileSync(EX + "costs.json", "utf8"));
const effortUsd = (e) => { const v = Object.entries(effort).find(([k]) => k.includes(e))?.[1]?.usd; return v != null ? `$${v.toFixed(2)}` : ""; };
await sheet("keyframes-pumpkin.jpg", [[0.4, "0,4 с · хук"], [1.5, "1,5 «line»"], [3.4, "3,4 «face»"], [4.4, "4,4 «sixth»"], [6.7, "6,7 «lights up»"], [7.7, "7,7 «pumpkin»"], [9.5, "9,5 развязка"]], [
  ["агент · medium (сессия, 24 шага)", EX + "medium/film/pumpkin-face-medium.mp4"],
  ["агент · high", EX + "high/film/pumpkin-face-high.mp4"],
  ["агент · xhigh", EX + "xhigh/film/pumpkin-face-xhigh.mp4"],
  [`trial · один вызов medium · ${usd("pumpkin-medium")}`, HERE + "runs/pumpkin-medium/film.mp4"],
  [`trial · один вызов low · ${usd("pumpkin-low")}`, HERE + "runs/pumpkin-low/film.mp4"],
]);
await sheet("keyframes-topics.jpg", [[0.4, "0,4 с · хук"], [1.6, "1,6 с"], [3.0, "3,0 с"], [4.5, "4,5 с"], [6.0, "6,0 с"], [7.5, "7,5 с"], [9.5, "9,5 развязка"]], [
  [`sunlight · medium · ${usd("sunlight-medium")} · без голоса`, HERE + "runs/sunlight-medium/film.mp4"],
  [`sunlight · low · ${usd("sunlight-low")} · без голоса`, HERE + "runs/sunlight-low/film.mp4"],
  [`bats · medium · ${usd("bats-medium")} · без голоса`, HERE + "runs/bats-medium/film.mp4"],
  [`bats · low · ${usd("bats-low")} · без голоса`, HERE + "runs/bats-low/film.mp4"],
]);
