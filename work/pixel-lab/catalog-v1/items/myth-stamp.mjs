// catalog-v1 item «myth-stamp»: a verdict stamp as a HUD card — the ping film's stamp plate (thick border, dark inside,
// the word in the ink colour) with the mosquito / cat-name ✓ / ✗ mark in a column beside the word. It hovers lifted with
// a shadow, then slams down on a spoken word: accelerating fall, squash and rebound, dust puffs, the ink floods out from
// the centre (red + ✗ = myth, green + ✓ = true). The word is the plan's label only; without a label the plate shows the mark.
// Sources: mosquito-buzz/film/name-hud.mjs mark() + work/pixel-lab/ping/film/hud.mjs stamp() (copy in lib/mosquito-stamp.mjs).
import { stampLayout, drawStamp, dust } from "./lib/mosquito-stamp.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const LAY = new Map();
const layout = (label) => { const k = label || ""; let l = LAY.get(k); if (!l) { l = stampLayout(label); LAY.set(k, l); } return l; };
const IMPACT = 0.55;   // share of the slam key spent falling
/** a re-press on an already stamped plate (thump, or myth ↔ true): lifts a little, presses, squashes, puffs dust */
const press = (u) => { const q = clamp01((u - 0.42) / 0.58); return { lift: 0.09 * Math.sin(Math.PI * clamp01(u / 0.42)), sq: 1.4 * Math.sin(Math.PI * q) * (1 - q), dust: q }; };

export default {
  kind: "myth-stamp",
  covers: ["myth-stamp"],
  source: "mosquito-buzz/film/name-hud.mjs#mark + ping/film/hud.mjs#stamp",
  desc: "verdict stamp: label word with a red ✗ (myth) or green ✓ (true), slams down with dust; HUD card",
  hw: 90, hh: 32, start: "hovers lifted over its spot, shadow below, blank lilac ink and seal ring, bobs slightly",
  hud: true, text: true,
  states: {
    hover: [0.5, "lifted above its spot with a shadow, blank lilac ink, no mark"],
    myth: [0.7, "slams down: squash, dust puffs, red ink floods in, a red ✗ draws", "thud"],
    true: [0.7, "slams down: squash, dust puffs, green ink floods in, a green ✓ draws (from myth: re-presses, ✗ → ✓)", "thud"],
    thump: [0.6, "lifts a little and presses again: squash and a dust puff", "thump"],
  },
  base: { down: 0, red: 0, green: 0 },
  st: { hover: { down: 0, red: 0, green: 0 }, myth: { down: 1, red: 1, green: 0 }, true: { down: 1, red: 0, green: 1 }, thump: {} },
  linear: ["down", "red", "green"],   // the slam curve, flood and stroke timing are shaped in draw from these linear ramps
  demo: { label: "MYTH", tile: "myth" },
  notes: "HUD verdict plate. The word is only the label (e.g. MYTH, TRUE, FALSE from the script); the verdict is the ink + mark: myth = red ✗, true = green ✓, inside a seal ring (blank lilac while hovering). Without a label: a square plate with the ring and the mark only. hover is lifted (1.24×, shadow down-right), so a plate that is never stamped stays a blank lilac stamp. myth after true / true after myth re-presses and re-inks from the centre (the old mark retracts, the new one draws). Label sizes 4 → 3 → 2 by length (once per label); an 18-letter label is ~115 px half-wide (declared 90×32 fits ~6 letters at size 4). Dust puffs are small pearly clusters (lilac, short-lived). Checker: clean.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, lay = layout(s.label);
    // fall: ease-in from the lifted scale to the surface; impact squash with a small rebound; ink floods after impact
    const fall = clamp01(v.down / IMPACT), u2 = clamp01((v.down - IMPACT) / (1 - IMPACT)), h = 1 - fall * fall;
    let lift = h, sq = 1.3 * Math.sin(Math.PI * u2 * 1.6) * Math.pow(1 - u2, 1.5), dustU = u2 > 0 && u2 < 1 ? u2 : 0, dustA = 1;
    // a re-press: thump, or a myth / true key on a plate that is already down (switches in only where press() is 0)
    const pk = s.last && (s.last.state === "thump" || ((s.last.state === "myth" || s.last.state === "true") && v.down >= 0.999)) ? press(s.acc(s.last.state)) : null;
    if (pk && v.down >= 0.999) { lift += pk.lift; sq += pk.sq; if (pk.dust > 0 && pk.dust < 1) { dustU = pk.dust; dustA = 0.7; } }
    const bob = 1.5 * Math.sin(t * 2.2) * h * z;
    const S = 1 + 0.24 * lift, land = clamp01((v.down - IMPACT) / 0.3), inked = clamp01(Math.max(v.red, v.green) * 2), share = v.green / Math.max(1e-6, v.red + v.green);
    const A = drawStamp(c, lay, cx, cy + bob - 4 * z * lift, z, { S, sx: 1 + 0.12 * sq, sy: 1 - 0.12 * sq, lift, land, inked: inked * (v.red + v.green > 1e-4 ? 1 : 0), share,
      xK: clamp01((v.red - IMPACT) / 0.4), cK: clamp01((v.green - IMPACT) / 0.4) });
    if (dustU > 0) dust(c, A.centre[0], A.centre[1], A.pw, A.ph, z, dustU, dustA);
    return { box: A.box, textBox: A.box, pt: A.centre };
  },
};
