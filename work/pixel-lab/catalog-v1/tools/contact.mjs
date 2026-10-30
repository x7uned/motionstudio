// Catalog v1 · contact sheet of the ported props (and backdrops): one tile per kind on the night-hill backdrop in its
// most telling state (the last state, settled), labelled with kind, states and check results from sheets/<kind>.json.
//   node tools/contact.mjs [out.png]   (default contact-props.png; backdrops go to contact-backdrops.png)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
process.env.CATALOG_QUIET = "1";
const { CATALOG, ITEMS, BACKDROP_ITEMS } = await import("../contract.mjs");
const { drawProp } = await import("../engine/props.mjs");
const { THEMES } = await import("../engine/overlays.mjs");
const night = await import("../engine/night.mjs");
const { demoProp } = await import("./sheet.mjs");
// options: --only=k1,k2 (subset, props and backdrops) --tag=k:text,… (extra label, e.g. the model) --out=name (file stem)
const OPT = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")));
const ONLY = OPT.only ? new Set(OPT.only.split(",")) : null, TAG = Object.fromEntries((OPT.tag || "").split(",").filter(Boolean).map((x) => x.split(":")));
const HERE = fileURLToPath(new URL("..", import.meta.url)), out = HERE + (OPT.out ? OPT.out + "-props.png" : "contact-props.png");
const WIDE = { cx: 270, cy: 450, z: 1 }, TW = 300, TH = 330, COLS = 6;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
async function tile(kind) {
  // the tile shows the item's demo.tile state (its most telling look) or else its last state, settled
  const K = CATALOG[kind], p = demoProp(kind, { noExit: true }), want = ITEMS[kind]?.demo?.tile, last = (want && p.keys.find((k) => k.state === want)) || p.keys.at(-1), t = last ? last.t + last.D + 0.25 : 1.2;
  const c = new Canvas(540, 960, "#000000"); night.drawSky(c, WIDE, t); night.drawHills(c, WIDE, t); night.drawGround(c, WIDE, t);
  drawProp(c, p, t, WIDE, { theme: THEMES["night-hill"], texts: [], warm: 0, lookAt: () => [455, 230], sunDir: () => [-180, -260] });
  const half = Math.max(K.hw, K.hh * 0.91) * 1.35, w = Math.round(half * 2), h = Math.round(w * 1.1), x0 = Math.max(0, Math.round(p.x - half)), y0 = Math.max(0, Math.round(p.y - h / 2));
  const img = await sharp(Buffer.from(c.d), { raw: { width: 540, height: 960, channels: 3 } }).extract({ left: x0, top: y0, width: Math.min(w, 540 - x0), height: Math.min(h, 960 - y0) }).resize(TW, TH - 44, { kernel: "nearest", fit: "contain", background: "#000" }).png().toBuffer();
  let chk = ""; try { const r = JSON.parse(fs.readFileSync(HERE + `sheets/${kind}.json`, "utf8")); chk = r.jumps.length || r.pops.length || !r.pure || !r.footprintOk ? `⚠ j${r.jumps.length} p${r.pops.length}${r.pure ? "" : " impure"}${r.footprintOk ? "" : " fp"}` : "checks ok"; } catch { chk = "no sheet"; }
  const label = Buffer.from(`<svg width="${TW}" height="44"><rect width="${TW}" height="44" fill="#000"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${esc(kind)}  ·  ${esc(chk)}${TAG[kind] ? "  · " + esc(TAG[kind]) : ""}</text><text x="6" y="36" font-family="Menlo" font-size="11" fill="#aab">${esc(Object.keys(K.states).join(" · ").slice(0, 46))}</text></svg>`);
  return sharp({ create: { width: TW, height: TH, channels: 3, background: "#000" } }).composite([{ input: img, top: 0, left: 0 }, { input: label, top: TH - 44, left: 0 }]).png().toBuffer();
}
async function grid(list, file, title, make) {
  const tiles = []; for (const k of list) tiles.push(await make(k));
  const W = COLS * (TW + 4), H = 40 + Math.ceil(list.length / COLS) * (TH + 4);
  const head = Buffer.from(`<svg width="${W}" height="40"><text x="8" y="27" font-family="Menlo" font-size="20" fill="#fff">${esc(title)}</text></svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } }).composite([{ input: head, top: 0, left: 0 }, ...tiles.map((input, i) => ({ input, left: (i % COLS) * (TW + 4), top: 40 + Math.floor(i / COLS) * (TH + 4) }))]).jpeg({ quality: 88 }).toFile(file);
  console.log(file, list.length);
}
const props = Object.keys(ITEMS).filter((k) => !ONLY || ONLY.has(k));
await grid(props, out.replace(/\.png$/, ".jpg"), `catalog-v1 · ${props.length} ported props (last state, settled) · not approved`, tile);
const bds = Object.keys(BACKDROP_ITEMS).filter((k) => !ONLY || ONLY.has(k));
if (bds.length) await grid(bds, HERE + (OPT.out ? OPT.out + "-backdrops.jpg" : "contact-backdrops.jpg"), `catalog-v1 · ${bds.length} ported backdrops (wide) · not approved`, async (k) => {
  const c = new Canvas(540, 960, "#000000"); BACKDROP_ITEMS[k].draw(c, WIDE, 2); BACKDROP_ITEMS[k].front?.(c, WIDE, 2, {});
  const img = await sharp(Buffer.from(c.d), { raw: { width: 540, height: 960, channels: 3 } }).resize(TW - 120, TH - 44, { kernel: "nearest" }).png().toBuffer();
  const label = Buffer.from(`<svg width="${TW}" height="44"><rect width="${TW}" height="44" fill="#000"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${esc(k)}${TAG[k] ? "  · " + esc(TAG[k]) : ""}</text></svg>`);
  return sharp({ create: { width: TW, height: TH, channels: 3, background: "#000" } }).composite([{ input: img, top: 0, left: 60 }, { input: label, top: TH - 44, left: 0 }]).png().toBuffer();
});
