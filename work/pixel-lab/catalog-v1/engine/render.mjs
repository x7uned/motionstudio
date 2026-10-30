// Trial 10 s · deterministic renderer: resolved plan (runs/<run>/resolved.json) → frames. 540×960 grid ×2 nearest →
// 1080×1920, 30 fps, exactly 300 frames. No overlay: the picture runs to every edge, karaoke captions over a soft
// dithered shade. Order: backdrop → props (kid in front) → front fog/foreground → beams → focus → labels → HUD cards →
// caption shade → captions. Every on-screen word is from the validated plan (script words).
//   node engine/render.mjs <run> --stills 0.5,2,…   |   node engine/render.mjs <run> --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH } from "./layout.mjs";
import { FPS, FRAMES, BACKDROP_ITEMS } from "../contract.mjs";
import * as night from "./night.mjs";
import { drawProp, screenOf, presence } from "./props.mjs";
import { THEMES, drawBeam, drawFocus, drawLabel, onScreenK } from "./overlays.mjs";
import { cameraPath, camAt, drawSpace, captionGroups, drawCaptions, captionShade } from "./scene.mjs";

const HERE = fileURLToPath(new URL("..", import.meta.url));
export function makeFilm(R0) {
  const BD = BACKDROP_ITEMS[R0.backdrop];   // catalog-v1 backdrop item (items/<kind>.mjs with backdrop: true)
  const path = cameraPath(R0), theme = BD ? { ...THEMES["night-hill"], ...BD.theme } : THEMES[R0.backdrop] || THEMES["night-hill"], G = captionGroups(R0.words, R0.end);
  const ordered = [...R0.props.filter((p) => !p.hud && p.kind !== "kid").sort((a, b) => a.y - b.y), ...R0.props.filter((p) => p.kind === "kid")];
  const hud = R0.props.filter((p) => p.hud), hasMoon = R0.props.some((p) => p.kind === "moon");
  return function frame(t, log) {
    const c = new Canvas(GW, GH, "#000000"), cam = camAt(t, path), A = {};
    const ctx = { theme, texts: [], warm: 0,
      lookAt: (p) => { const q = R0.props.find((x) => x.id === p.target); if (!q || presence(q, t).a <= 0) return null; return A[q.id]?.face || A[q.id]?.pt || screenOf(q, cam); },
      // catalog-v1 items: the target point even before it enters, and its presence 0..1, so items ease their aim in/out
      lookPt: (p) => { const q = R0.props.find((x) => x.id === p.target); if (!q) return null; return A[q.id]?.face || A[q.id]?.pt || screenOf(q, cam); },
      lookK: (p) => { const q = R0.props.find((x) => x.id === p.target); return q ? presence(q, t).a : 0; },
      sunDir: (from) => { const s = R0.props.find((x) => x.kind === "sun" && presence(x, t).a > 0); if (!s) return null; const [sx, sy] = A[s.id]?.pt || screenOf(s, cam); return [sx - from[0], sy - from[1]]; } };
    if (BD) BD.draw(c, cam, t);
    else if (R0.backdrop === "space") drawSpace(c, cam, t);
    else { night.drawSky(c, cam, t); if (!hasMoon) night.drawMoon(c, cam, t); night.drawBats(c, cam, t); night.drawHills(c, cam, t); night.drawTree(c, cam, t); night.drawWeb(c, cam, t); night.drawFence(c, cam, t); night.drawFog(c, cam, t, 0); night.drawGround(c, cam, t); }
    for (const p of ordered) { const a = drawProp(c, p, t, cam, ctx); if (a) A[p.id] = a; }
    if (BD) BD.front?.(c, cam, t, ctx);
    else if (R0.backdrop !== "space") { night.drawFog(c, cam, t, 1); night.drawForeground(c, cam, t, ctx.warm); }
    // readable layer
    for (const b of R0.beams) { const f = A[b.from], to = A[b.to]; if (!f || !to) continue;
      drawBeam(c, t, b, { a: f.a, k: onScreenK(f.box), pt: f.lit && f.area ? f.area : f.pt }, { a: to.a, k: onScreenK(to.box), pt: to.eye || to.pt }, theme); }
    for (const f of R0.focus) { const T = A[f.target]; if (!T) continue; const box = drawFocus(c, t, f, { ...(T.faceBox || T.box), a: T.a }, theme); if (box) ctx.texts.push({ kind: "tag", ...box }); }
    // HUD cards before the labels, so a label can step around them
    for (const p of hud) drawProp(c, p, t, cam, ctx);
    for (const l of R0.labels) { const T = A[l.target]; if (!T) continue; const box = drawLabel(c, t, l, { ...T.box, a: T.a }, theme, ctx.texts.slice()); if (box) ctx.texts.push({ kind: "label", ...box }); }
    captionShade(c);
    const caps = drawCaptions(c, t, G, theme.accent);
    if (log) log.push({ t: +t.toFixed(3), texts: ctx.texts.map((b) => ({ kind: b.kind, x0: Math.round(b.x0), y0: Math.round(b.y0), x1: Math.round(b.x1), y1: Math.round(b.y1) })), captions: caps, cam: { cx: +cam.cx.toFixed(1), cy: +cam.cy.toFixed(1), z: +cam.z.toFixed(3) } });
    return c;
  };
}
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
export function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [run, mode, list] = process.argv.slice(2), dir = HERE + "runs/" + run + "/";
  const frame = makeFilm(JSON.parse(fs.readFileSync(dir + "resolved.json", "utf8")));
  if (mode === "--stills") {
    fs.mkdirSync(dir + "stills", { recursive: true });
    for (const s of list.split(",")) { const t = Number(s), t0 = Date.now(), c = frame(t), ms = Date.now() - t0; await sharp(Buffer.from(toFull(c)), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(dir + `stills/t${t.toFixed(2)}.png`); console.log("still", t, ms + " ms"); }
  } else if (mode === "--video") {
    const out = dir + "video-noaudio.mp4", log = [];
    const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-frames:v", String(FRAMES), "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
    const t0 = Date.now();
    for (let f = 0; f < FRAMES; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS, log))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 60 === 0) console.log(`frame ${f}/${FRAMES} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
    const secs = (Date.now() - t0) / 1000; fs.writeFileSync(dir + "frames-log.json", JSON.stringify(log)); fs.writeFileSync(dir + "render-time.json", JSON.stringify({ frames: FRAMES, seconds: +secs.toFixed(1), msPerFrame: Math.round((secs * 1000) / FRAMES) }));
    console.log("done", secs.toFixed(0) + "s");
  }
}
