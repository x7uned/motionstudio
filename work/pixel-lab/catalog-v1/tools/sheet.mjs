// Catalog v1 · still sheet + automatic checks for one or more ported items (renderer test only, no model call, no video).
//   node tools/sheet.mjs <kind> [kind …]      → sheets/<kind>.png (tiles) and sheets/<kind>.json (checks)
// Timeline per item: enters at 0.3 s (dissolve), holds its first state, then every later state gets one key 1.3 s apart
// (transition D from the catalog), exits 1.2 s after the last key. The item is drawn by the real engine path
// (engine/props.mjs drawProp → items/<kind>.mjs draw) at the centre slot, size m, camera wide.
// Tiles: enter (mid-dissolve) · first state · for each later state: mid-transition and settled · close-up (camera z 1.85).
// Checks on a flat background, every frame at 30 fps through enter, all keys and exit:
//   jumps — one frame brings ≥ 3× more «novel» pixels than both neighbours (and ≥ 40 px): a one-frame change;
//   pops  — a frame differs from both neighbours while they match each other;
//   footprint — measured half extents of solid pixels vs the declared hw/hh (the overlap check relies on them);
//   pure — the same t rendered fresh equals the sequential frame (pure function of t, no hidden state).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { CATALOG, ITEMS, SLOTS, BACKDROP_ITEMS } from "../contract.mjs";
import { captionGroups, drawCaptions, captionShade, camAt } from "../engine/scene.mjs";
import { drawProp } from "../engine/props.mjs";
import { THEMES } from "../engine/overlays.mjs";
import * as night from "../engine/night.mjs";

const HERE = fileURLToPath(new URL("..", import.meta.url));
const GAP = 1.3, ENTER = 0.3, FPS = 30;

export function demoProp(kind, o = {}) {
  const K = CATALOG[kind], IT = ITEMS[kind], st = Object.keys(K.states), d = IT?.demo || {};
  const [x, y] = K.hud ? SLOTS[d.slot || "top"] : SLOTS[d.slot || "center"];
  const keys = st.slice(1).map((s, i) => { const t = 1.1 + i * GAP; return { t, state: s, D: Math.min(K.states[s][0], GAP - 0.05), word: 0 }; });
  const last = keys.length ? keys.at(-1).t + keys.at(-1).D : 1.1;
  return { id: "a", kind, hud: !!K.hud, x, y, s: o.s ?? 1, slot: d.slot || "center", enterT: ENTER, start: false, exitT: o.noExit ? null : last + 1.2, target: d.target ? "b" : null,
    value: d.value ?? null, unit: d.unit ?? null, label: d.label ?? null, init: st[0], keys };
}
function ctxFor() { return { theme: THEMES["night-hill"], texts: [], warm: 0, lookAt: () => [455, 230], lookPt: () => [455, 230], lookK: () => 1, sunDir: () => [-180, -260] }; }
const WIDE = { cx: 270, cy: 450, z: 1 };
function backdrop(c, cam, t) { night.drawSky(c, cam, t); night.drawMoon(c, cam, t); night.drawHills(c, cam, t); night.drawFence(c, cam, t); night.drawFog(c, cam, t, 0); night.drawGround(c, cam, t); }
const FLAT = "#3A3350";
const nDiff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i + 1] - b[i + 1]) > 24 || Math.abs(a[i + 2] - b[i + 2]) > 24) n++; return n; };
function analyze(frames, minPx = 40) {
  const F = frames.length - 1;
  const N = frames.map((fr, k) => (k ? nDiff(fr, frames[k - 1]) : 0));
  // «Novel» pixels: changed pixels whose new colour does not occur within 2 px in the previous frame (or whose old colour
  // is gone within 2 px in the new one). A 1–2 px move of a part, idle sway and glow ramps are explained by the neighbourhood;
  // something that appears, vanishes or swaps shape in one frame is not.
  const novel = (a, b, hist) => { let n = 0; const same = (i, j) => a[i] === b[j] && a[i + 1] === b[j + 1] && a[i + 2] === b[j + 2];
    for (let i = 0, q = 0; i < a.length; i += 3, q++) { if (same(i, i)) continue; const x = q % 540, y = (q / 540) | 0; let fa = false, fb = false;
      for (let dy = -2; dy <= 2 && !(fa && fb); dy++) { const yy = y + dy; if (yy < 0 || yy > 959) continue; for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx < 0 || xx > 539) continue; const j = (yy * 540 + xx) * 3;
        if (!fa && a[i] === b[j] && a[i + 1] === b[j + 1] && a[i + 2] === b[j + 2]) fa = true; if (!fb && b[i] === a[j] && b[i + 1] === a[j + 1] && b[i + 2] === a[j + 2]) fb = true; } }
      if (!fa || !fb) { n++; if (hist) hist[(y & 3) * 4 + (x & 3)]++; } }
    return n; };
  // A dithered dissolve (fade(), ordered Bayer 4×4) toggles whole threshold levels: the changed pixels of such a frame
  // sit on one to three of the 16 Bayer cells (a fast dissolve steps up to three levels per frame). That is the house dissolve, not a one-frame change, so it is not flagged.
  const bayerShare = (a, b) => { const h = new Array(16).fill(0); let n = 0; for (let i = 0, q = 0; i < a.length; i += 3, q++) if (Math.abs(a[i] - b[i]) > 24 || Math.abs(a[i + 1] - b[i + 1]) > 24 || Math.abs(a[i + 2] - b[i + 2]) > 24) { const x = q % 540, y = (q / 540) | 0; h[(y & 3) * 4 + (x & 3)]++; n++; } h.sort((u, v) => v - u); return n ? (h[0] + h[1]) / n : 0; };
  const V = frames.map((fr, k) => (k ? novel(fr, frames[k - 1]) : 0));
  const jumps = [], pops = [], ditherSteps = [];
  for (let k = 1; k < F; k++) {
    // re-rasterising a slowly morphing shape re-dithers its shading: many changed pixels, few novel ones (< 30 %) — not a jump
    // the Bayer share is taken over the NOVEL pixels: a dissolve step reveals/covers one threshold cell even while the
    // item's idle motion changes other pixels in the same frame
    if (V[k] >= minPx && V[k] >= 3 * Math.max(V[k - 1], V[k + 1] ?? 0) && V[k] >= 0.3 * N[k]) { const hist = new Array(16).fill(0); novel(frames[k], frames[k - 1], hist); hist.sort((u, v) => v - u); const sh = (hist[0] + hist[1] + hist[2]) / Math.max(1, V[k]), e = { t: +(k / FPS).toFixed(3), novel: V[k], before: V[k - 1], after: V[k + 1], changed: N[k], bayerTop3: +sh.toFixed(2) }; (sh >= 0.8 ? ditherSteps : jumps).push(e); }
    // pop: one frame differs from both neighbours, they match each other, and the picture is still before and after
    // (a symmetric motion peak such as the middle of a blink also has matching neighbours, but it moves around them)
    if (k + 1 <= F && V[k] > minPx && V[k + 1] > minPx) { const across = novel(frames[k + 1], frames[k - 1]); if (across < 0.45 * Math.min(V[k], V[k + 1]) && V[k - 1] < 0.2 * V[k] && (V[k + 2] ?? 0) < 0.2 * V[k]) pops.push({ t: +(k / FPS).toFixed(3), novel: V[k], across }); }
  }
  return { N, V, jumps, pops, ditherSteps };
}


export async function sheet(kind, small = false) {
  const K = CATALOG[kind]; if (!K) throw new Error("unknown kind " + kind);
  const p = demoProp(kind), states = Object.keys(K.states);
  // ---------------- tiles
  const tiles = [["enter", p.enterT + 0.19, WIDE], [states[0], 0.95, WIDE]];
  // --small: settled states only, at 1× (about a quarter of the image tokens); transitions are still checked frame by frame
  for (const k of p.keys) { if (!small) tiles.push(["→ " + k.state, +(k.t + k.D / 2).toFixed(3), WIDE]); tiles.push([k.state, +(k.t + k.D + 0.2).toFixed(3), WIDE]); }
  const tz = (p.keys.at(-1)?.t ?? 1) + (p.keys.at(-1)?.D ?? 0) + 0.3;
  if (!K.hud) tiles.push(["close-up z1.85", tz, { cx: p.x, cy: p.y, z: 1.85 }]);
  const hw = Math.round(K.hw * 1.45), hh = Math.round(K.hh * 1.45), cx0 = Math.max(0, p.x - hw), cy0 = Math.max(0, p.y - hh), cw = Math.min(540, p.x + hw) - cx0, ch = Math.min(960, p.y + hh) - cy0;
  const sc = small ? Math.min(1, 230 / cw) : Math.max(1, Math.min(2, 440 / cw)), tw = Math.round(cw * sc), th = Math.round(ch * sc), COLS = small ? 5 : 4, imgs = [];
  for (const [i, [name, t, cam]] of tiles.entries()) {
    const c = new Canvas(540, 960, "#000000"); backdrop(c, cam, t); drawProp(c, p, t, cam, ctxFor());
    const full = await sharp(Buffer.from(c.d), { raw: { width: 540, height: 960, channels: 3 } }).extract({ left: cx0, top: cy0, width: cw, height: ch }).resize(tw, th, { kernel: "nearest" }).png().toBuffer();
    const label = Buffer.from(`<svg width="${tw}" height="24"><rect width="${tw}" height="24" fill="#000" opacity="0.7"/><text x="6" y="17" font-family="Menlo" font-size="${small ? 11 : 15}" fill="#fff">${name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}  ${t.toFixed(2)} s</text></svg>`);
    imgs.push({ input: await sharp(full).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % COLS) * (tw + 4), top: 34 + Math.floor(i / COLS) * (th + 4) });
  }
  const W = COLS * (tw + 4), H = 34 + Math.ceil(tiles.length / COLS) * (th + 4);
  const title = Buffer.from(`<svg width="${W}" height="32"><text x="6" y="22" font-family="Menlo" font-size="18" fill="#fff">${kind} · ${states.join(" · ")} · footprint ${K.hw}×${K.hh}${K.hud ? " · HUD" : ""}</text></svg>`);
  fs.mkdirSync(HERE + "sheets", { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } }).composite([{ input: title, top: 0, left: 0 }, ...imgs]).png().toFile(HERE + `sheets/${kind}.png`);
  // ---------------- checks on a flat background
  const end = (p.exitT ?? 4) + 0.6, F = Math.ceil(end * FPS), bg = new Canvas(540, 960, FLAT), BG = Buffer.from(bg.d);
  const frames = [], t0 = Date.now();
  const render = (t) => { const c = new Canvas(540, 960, "#000000"); c.d.set(BG); drawProp(c, p, t, WIDE, ctxFor()); return c.d; };
  for (let f = 0; f <= F; f++) frames.push(render(f / FPS));
  const ms = (Date.now() - t0) / (F + 1);
  const { N, V, jumps, pops, ditherSteps } = analyze(frames);
  // footprint: solid pixels (differ from the flat background by > 40 in a channel) over all frames
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const fr of frames) for (let y = 0; y < 960; y++) for (let x = 0; x < 540; x++) { const i = (y * 540 + x) * 3; if (Math.abs(fr[i] - BG[i]) > 40 || Math.abs(fr[i + 1] - BG[i + 1]) > 40 || Math.abs(fr[i + 2] - BG[i + 2]) > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  const meas = x1 < 0 ? null : { hw: Math.max(p.x - x0, x1 - p.x), hh: Math.max(p.y - y0, y1 - p.y), box: [x0, y0, x1, y1] };
  // measured includes idle motion, glows and effects, so only a gross mismatch is flagged (> 1.6× or < 0.5× the declared size)
  const fpOk = !meas || (meas.hw <= K.hw * 1.6 && meas.hh <= K.hh * 1.6 && meas.hw >= K.hw * 0.5 && meas.hh >= K.hh * 0.5);
  // purity: a fresh render of a mid-sheet time equals the sequential one
  const tp = Math.round(F * 0.55), fresh = render(tp / FPS), pure = nDiff(fresh, frames[tp]) === 0;
  const rep = { kind, states, hud: !!K.hud, declared: { hw: K.hw, hh: K.hh }, measured: meas, footprintOk: fpOk, jumps, pops, ditherSteps: ditherSteps.length, pure, frames: F + 1, msPerFrame: +ms.toFixed(1), maxFramePx: Math.max(...N), maxNovelPx: Math.max(...V) };
  fs.writeFileSync(HERE + `sheets/${kind}.json`, JSON.stringify(rep, null, 1));
  return rep;
}

// ---------------------------------------------------------------- backdrops: wide, close-ups on the slots, a test scene
// (cat in the left slot, stopwatch card top-right, a caption line) and a camera move wide → close on the centre slot.
const FAKE_WORDS = ["Your", "cat", "sleeps", "16", "hours", "a", "day."].map((text, i) => ({ text, start: 0.3 + i * 0.32, end: 0.3 + i * 0.32 + 0.28 }));
export async function sheetBackdrop(kind, small = false) {
  const BD = BACKDROP_ITEMS[kind]; if (!BD) throw new Error("unknown backdrop " + kind);
  const theme = { ...THEMES["night-hill"], ...BD.theme }, ctx = () => ({ ...ctxFor(), theme });
  const cat = { ...demoProp("cat", { noExit: true }), x: SLOTS.left[0], y: SLOTS.left[1], slot: "left", enterT: 0, start: true, keys: [] };
  const sw = { ...demoProp("stopwatch", { noExit: true }), x: SLOTS["top-right"][0], y: SLOTS["top-right"][1], enterT: 0, start: true, value: "16", unit: "H", keys: [{ t: 0.4, state: "run", D: 1.2, word: 3 }] };
  const G = captionGroups(FAKE_WORDS, 10);
  const frame = (t, cam, props = []) => { const c = new Canvas(540, 960, "#000000"); BD.draw(c, cam, t); const cx = ctx(); for (const p of props) if (!p.hud) drawProp(c, p, t, cam, cx); BD.front?.(c, cam, t, cx); for (const p of props) if (p.hud) drawProp(c, p, t, cam, cx); if (props.length) { captionShade(c); drawCaptions(c, t, G, theme.accent); } return c; };
  const close = (slot, z) => { const [x, y] = SLOTS[slot]; return { cx: x - (255 - 270) / z, cy: y - (405 - 450) / z, z }; };
  const tiles = [["wide 0.5 s", frame(0.5, WIDE)], ["wide 6 s", frame(6, WIDE)], ["close centre z1.85", frame(3, close("center", 1.85))], ["close left z1.4", frame(3, close("left", 1.4))],
    ["close right z1.4", frame(3, close("right", 1.4))], ["close top z1.85", frame(3, close("top", 1.85))], ["scene: cat left · card · caption", frame(2.1, WIDE, [cat, sw])], ["scene close on cat z1.6", frame(2.1, close("left", 1.6), [cat, sw])]];
  const tw = small ? 180 : 270, th = small ? 320 : 480, COLS = 4, imgs = [];
  for (const [i, [name, c]] of tiles.entries()) {
    const img = await sharp(Buffer.from(c.d), { raw: { width: 540, height: 960, channels: 3 } }).resize(tw, th, { kernel: "nearest" }).png().toBuffer();
    const label = Buffer.from(`<svg width="${tw}" height="22"><rect width="${tw}" height="22" fill="#000" opacity="0.7"/><text x="5" y="16" font-family="Menlo" font-size="13" fill="#fff">${name}</text></svg>`);
    imgs.push({ input: await sharp(img).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer(), left: (i % COLS) * (tw + 4), top: 34 + Math.floor(i / COLS) * (th + 4) });
  }
  const W = COLS * (tw + 4), H = 34 + Math.ceil(tiles.length / COLS) * (th + 4);
  const title = Buffer.from(`<svg width="${W}" height="32"><text x="6" y="22" font-family="Menlo" font-size="18" fill="#fff">backdrop ${kind} · accent ${theme.accent}</text></svg>`);
  fs.mkdirSync(HERE + "sheets", { recursive: true });
  await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } }).composite([{ input: title, top: 0, left: 0 }, ...imgs]).png().toFile(HERE + `sheets/${kind}.png`);
  // checks: 4 s at wide, then a 1 s eased move to the centre close-up and 1 s hold (no props)
  const path = [{ t: 0, cx: 270, cy: 450, z: 1, move: 0 }, { t: 4, ...close("center", 1.85), move: 1 }];
  const frames = [], t0 = Date.now(); for (let f = 0; f <= 6 * FPS; f++) frames.push(frame(f / FPS, camAt(f / FPS, path)).d);
  // a full frame under the slow camera push-in re-rasterises whole edges by 1 px: backdrops need ≥ 120 novel px
  const ms = (Date.now() - t0) / frames.length, { N, V, jumps, pops, ditherSteps } = analyze(frames, 120);
  const tp = 100, pure = nDiff(frame(tp / FPS, camAt(tp / FPS, path)).d, frames[tp]) === 0;
  const rep = { kind, backdrop: true, jumps, pops, ditherSteps: ditherSteps.length, pure, frames: frames.length, msPerFrame: +ms.toFixed(1), maxNovelPx: Math.max(...V) };
  fs.writeFileSync(HERE + `sheets/${kind}.json`, JSON.stringify(rep, null, 1));
  return rep;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), small = args.includes("--small");
  for (const k of args.filter((a) => !a.startsWith("--"))) {
    if (BACKDROP_ITEMS[k]) { const r = await sheetBackdrop(k, small); console.log(`${k} (backdrop): jumps ${r.jumps.length} pops ${r.pops.length} pure ${r.pure} ${r.msPerFrame} ms/frame${r.jumps.length ? " jumps@" + r.jumps.map((j) => j.t).join(",") : ""}`); continue; } const r = await sheet(k, small); console.log(`${k}: jumps ${r.jumps.length} pops ${r.pops.length} pure ${r.pure} footprint ${r.footprintOk ? "ok" : "OFF"} (declared ${r.declared.hw}×${r.declared.hh}, measured ${r.measured ? r.measured.hw + "×" + r.measured.hh : "-"}) ${r.msPerFrame} ms/frame${r.jumps.length ? " jumps@" + r.jumps.map((j) => j.t).join(",") : ""}${r.pops.length ? " pops@" + r.pops.map((j) => j.t).join(",") : ""}`); }
}
