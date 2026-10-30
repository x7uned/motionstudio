// catalog-v1 item «wolf»: the dog series' grey wolf — the border-collie rig with coat "wolf" (pointed ears, dark saddle,
// cream belly, bushy tail, amber eyes, no collar), standing side-on facing right. Ported from
// work/pixel-lab/dogs/kit/dog.mjs drawDogSide + dog-rest.mjs drawDogCurl (copies in lib/dogs-*.mjs, shared with «dog»).
// Head pitch, jaw, yaw, the turn about its vertical axis and lying down are continuous rig parameters; standing ↔ lying
// hands over with a short Bayer crossfade at the matching pose (curl rig rise 1 = the standing side view), as in the film.
import { drawDogSide, drawDogCurl } from "./lib/dogs-dog.mjs";
import { blinkAt } from "./lib/cute.mjs";
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const S0 = 1.45, MID = 48, TAU = Math.PI * 2;           // ground point = centre + MID·S (the side wolf spans about y −102 … +6)
const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
function gateR(c, lo, hi) { if (lo <= 0 && hi >= 1) return c; const o = Object.create(c); o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); }; return o; }
export default {
  kind: "wolf",
  covers: ["wolf"],
  source: "dogs/kit/dog.mjs#drawDogSide({coat:\"wolf\"}) + dogs/kit/dog-rest.mjs#drawDogCurl",
  desc: "grey wolf standing side-on, facing right: pointed ears, bushy tail, amber eyes; breathes, blinks",
  hw: 100, hh: 76, start: "stands side-on, breathes, tail hangs low",
  states: {
    stand: [0.6, "stands side-on, calm"],
    howl: [0.8, "raises its head and howls, mouth open", "swell"],
    sniff: [0.7, "lowers its nose to the ground and sniffs", "flutter"],
    look: [0.5, "turns its head to look at the camera", "blip"],
    turn: [0.9, "turns its whole body to face the camera", "swish"],
    sleep: [1.4, "lies down, curls up and falls asleep", "dim"],
  },
  base: { pitch: 0, mouth: 0, shut: 0, sniff: 0, yaw: 0, turn: 0, lie: 0, tail: -0.35 },
  st: {
    stand: { pitch: 0, mouth: 0, shut: 0, sniff: 0, yaw: 0, turn: 0, lie: 0, tail: -0.35 },
    howl: { pitch: -0.7, mouth: 1, shut: 0.55, sniff: 0, yaw: 0, turn: 0, lie: 0, tail: -0.55 },
    sniff: { pitch: 1, mouth: 0, shut: 0, sniff: 1, yaw: 0, turn: 0, lie: 0, tail: -0.15 },
    look: { pitch: 0, mouth: 0, shut: 0, sniff: 0, yaw: 1, turn: 0, lie: 0, tail: -0.3 },
    turn: { pitch: 0, mouth: 0, shut: 0, sniff: 0, yaw: 0, turn: 0.46, lie: 0, tail: -0.3 },   // just short of 0.5: at exactly 0.5 the rig's layer handover flickers
    sleep: { pitch: 0, mouth: 0, shut: 0, sniff: 0, yaw: 0, turn: 0, lie: 1, tail: -0.35 },
  },
  demo: { target: true },
  notes: "Faces right only (side view). howl lifts the head beyond the film's range (pitch -0.7: the head-up key extrapolated in lib/dogs-dog.mjs) with the jaw open and eyes half shut; the profile jaw opens only a little, so it reads as a raised muzzle more than a wide howl. turn stops at 0.46 (almost facing the camera): at exactly 0.5 the rig's layer handover flickers. sleep: Bayer handover to the curl rig at the matching standing pose, then lies down, curls up, eyes close. Checker: 1 flag at 0.67 s = last level of the engine's entry dissolve.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(S0 * z * 100) / 100, gx = cx, gy = cy + MID * S;
    const G = { z: S, X: (wx) => gx + wx * S, Y: (wy) => gy + wy * S };
    const blink = Math.max(v.shut, blinkAt(t, 4.9, 1.3) * (1 - v.shut)), lie = clamp01(v.lie);
    // howl: the jaw breathes a little while the head is up (a-woo), from the eased mouth value
    const mouth = v.mouth * (0.82 + 0.18 * Math.sin(TAU * 0.7 * t));
    const side = { coat: "wolf", facing: 1, gait: "stand", pitch: v.pitch, sniff: v.sniff, yaw: v.yaw, turn: v.turn, mouth, blink, tail: { wag: 0.12 * Math.max(0, 1 - 2 * v.turn), height: v.tail }, look: [0.4 * (1 - v.yaw), 0.1 + 0.5 * Math.max(0, v.pitch)] };
    // standing ↔ lying: crossfade to the curl rig at rise 1 (same pose), then rise 1 → 0, curl 0 → 1, eyes close
    // the handover runs on its own gentle clock during the sleep key (few pixels in its first frames), on lie otherwise
    const L = s.last, el = L && L.state === "sleep" ? L.u * L.D : null;
    const w = el != null ? sm(el / 0.4) : clamp01(lie / 0.12), rise = 1 - sm((lie - 0.1) / 0.5), curl = sm((lie - 0.5) / 0.45), sleep = sm((lie - 0.68) / 0.32);
    let A = null;
    if (w < 1) A = drawDogSide(w > 0 ? gateR(c, w, 1.01) : c, G, 0, 0, t, side);
    if (w > 0) { const B = drawDogCurl(w < 1 ? gateR(c, 0, w) : c, G, 0, 0, t, { coat: "wolf", facing: 1, rise, curl, sleep, blink: blink * (1 - sleep), wag: 0.15 }); if (w >= 0.5 || !A) A = B; }
    const top = gy - 95 * S;
    const head = A?.head ?? [gx + 30 * S, gy - 59 * S];
    return { box: { x0: gx - 62 * S, y0: top, x1: gx + 58 * S, y1: gy + 3 * S }, pt: head, face: A?.nose ?? head,
      faceBox: { x0: head[0] - 26 * S, y0: head[1] - 30 * S, x1: head[0] + 30 * S, y1: head[1] + 22 * S } };
  },
};
