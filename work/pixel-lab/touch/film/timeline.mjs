// Touchscreen film timeline: every event and camera key is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.ceil((words[words.length - 1].end + 1.25) * FPS) / FPS;

export const EV = {
  // street, opening
  walk: [0, 2.5], ring: [W("phone") - 0.1, W("nothing", 2)], lookUp: [W("phone") - 0.1, W("phone") + 0.4],
  tap1: [W("tap", 2) - 0.22, W("tap", 2), W("tap", 2, "end") + 0.05, W("tap", 2, "end") + 0.3],      // approach, contact, release, back
  dots: [W("nothing"), W("press") - 0.15],
  press: [W("press") - 0.3, W("press") - 0.05, W("harder.", 1, "end") + 0.05, W("harder.", 1, "end") + 0.3],
  drop: W("nothing", 2), clump: [W("nothing", 2) - 0.05, W("nothing", 2) + 0.35],
  frozen: [W("frozen,"), W("frozen,", 1, "end") - 0.1], glint: [W("glass"), W("broken.", 1, "end") - 0.2], cracked: W("glass") - 0.05,
  hold: [W("your", 2) - 0.25, W("your", 2)],                                                                  // mitten back on the button
  zoomPhone: [W("your", 2) - 0.15, W("simply") + 0.1], cuIn: [W("screen") - 0.05, W("simply") + 0.25],
  pressure: [W("simply"), W("pressure.")], ignored: W("pressure.") + 0.05,
  cuZoom: [W("it") - 0.05, W("electricity.", 1, "end") - 0.05], spark: [W("electricity."), W("electricity.") + 0.45],
  tvIn: [W("electricity.", 1, "end") - 0.4, W("electricity.", 1, "end") + 0.15], tvScale: [W("electricity.", 1, "end") - 0.35, W("under") + 0.7],
  // top view: the grid
  ghost: [W("grid"), W("electrodes,") + 0.5], rowsDraw: [W("rows"), W("rows") + 0.55], colsDraw: [W("columns"), W("columns") + 0.5],
  ruler: [W("five"), W("pulses") + 0.2], pulses: [W("pulses"), W("rows,", 2, "end")],
  csIn1: [W("rows,", 2, "end") + 0.05, W("rows,", 2, "end") + 0.6],
  // cross-section: the field and the finger
  arcs: [W("crossing"), W("bulges"), W("glass.", 3, "end")],
  fingerIn: [W("body") - 0.2, W("conducts.") - 0.1], salty: [W("salty"), W("fingertip") - 0.1], conducts: W("conducts."),
  approach: [W("fingertip") + 0.2, W("close,", 1, "end")], steal: [W("pulls"), W("you,", 3, "end")],
  sink: [W("less") - 0.25, W("charge.") + 0.2], lessPill: W("less"),
  tvIn2: [W("charge.", 1, "end") + 0.15, W("chip") - 0.05],
  // top view: scan, map, centroid
  scan: [W("checks"), W("dip.", 1, "end")], hundred: W("hundred"), mapDip: [W("maps"), W("dip.", 1, "end")],
  cover3: [W("covers"), W("wool") - 0.3], glide: [W("finds"), W("dip,", 2)], lock: W("dip,", 2), finer: [W("finer"), W("itself.", 1, "end") - 0.15],
  csIn2: [W("itself.", 1, "end") - 0.1, W("wool") + 0.25],
  // cross-section: wool, silver thread
  lift: [W("itself.", 1, "end") - 0.1, W("wool") + 0.6], mitten: [W("wool") + 0.5, W("glass", 4)], woolTag: W("wool"),
  barely: [W("field", 3), W("you", 4, "end")], flat: W("flat."),
  silver: [W("silver"), W("thread", 1, "end") + 0.3], carry: [W("carry"), W("skin.", 2)], sink2: [W("carry") + 0.25, W("skin.", 2) + 0.1], touchOk: W("skin.", 2),
  // street again: the sausage
  streetBack: [W("skin.", 2, "end") + 0.05, W("korean") - 0.05], csOut: [W("skin.", 2, "end") + 0.05, W("skin.", 2, "end") + 0.55],
  korea: [W("korean"), W("instead.", 1, "end") + 0.3], walk2: [W("korean") + 0.02, W("sausages") - 0.3],
  pick: [W("sausages") - 0.15, W("sausages") + 0.3], sausageTap: [W("salty", 2) - 0.25, W("salty", 2), W("salty", 2) + 0.2, W("salty", 2) + 0.45],
  calling: W("salty", 2) + 0.05, connected: W("water,", 2, "end") + 0.05, ear: [W("just") + 0.3, W("your", 8) - 0.1],
  bite: [W("finger.") - 0.1, W("finger.") + 0.3], walk3: [W("your", 8), W("want") - 0.2],
  outroIn: [W("want") - 0.4, W("want")], point: W("follow") - 0.35, kagenamiEnd: W("kagenami.", 1, "end"),
};
EV.click = EV.kagenamiEnd + 0.08; EV.toggle = EV.click + 0.16;

// Street camera keys {t, cx, cy, z}: screen = (270 + (wx − cx)·z, 520 + (wy − cy)·z). Eased between keys, zoom in log space.
export const PHONE = { x: 17, y: -52 };   // where the phone sits in the hero's hands, world units
export const CAM = [
  { t: 0, cx: -168, cy: -64, z: 1.45 }, { t: 2.35, cx: 30, cy: -64, z: 1.45 }, { t: 3.0, cx: 16, cy: -60, z: 3.3 }, { t: EV.frozen[0] - 0.2, cx: 16, cy: -60, z: 3.3 },
  { t: EV.zoomPhone[0], cx: 18, cy: -58, z: 3.6 }, { t: EV.zoomPhone[1], cx: PHONE.x, cy: PHONE.y - 6.5, z: 14 },
  { t: EV.streetBack[0], cx: PHONE.x, cy: PHONE.y - 6.5, z: 14 }, { t: EV.streetBack[1], cx: 20, cy: -60, z: 2.8 }, { t: EV.walk2[1] + 0.1, cx: 96, cy: -62, z: 2.9 },
  { t: EV.walk3[0], cx: 96, cy: -62, z: 2.9 }, { t: EV.walk3[1], cx: 290, cy: -92, z: 1.25 }, { t: 80, cx: 290, cy: -92, z: 1.25 },
];
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * k) };
}
