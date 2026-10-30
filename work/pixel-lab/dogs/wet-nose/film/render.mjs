// «Why is a dog's nose always cold and wet?» — pixel film (Kagenami), the same sunny park and collie as «Is my dog blind?»,
// loop. 540×960 grid ×2 → 1080×1920, 30 fps. No overlay: the picture fills the frame; karaoke captions over a soft shade.
// node render.mjs --stills 0.5,3,... | --video
// Per frame: park → dog (+ cups) → front grass → thermal view → diagram panels / tags → captions.
import { fileURLToPath } from "node:url";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { ground, gate, clamp01, sm, ease, lerp, win, rnd } from "../../kit-v2/layout.mjs";
import * as park from "../../kit-v2/park.mjs";
import { drawDogSide, drawDogFront, drawDogLie, DOG } from "../../kit-v2/dog.mjs";
import { drawOwner } from "../../kit-v2/owner.mjs";
import { drawSkin, drawHead, drawNostrils } from "../../kit-v2/nosebio.mjs";
import { tag, panel, C as UI } from "../../../animals/film/cute.mjs";
import { CC, makeCaptions, label, bubble, leader, cli } from "../../common.mjs";
import { thermal, actorMask, smear, particles, bit, comic, SMELL_COLS } from "./fx.mjs";
import { END, FPS, VOICE, WORDS, EV, SC } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const PO = { period: END };
const captions = makeCaptions(VOICE, WORDS, END);

// ---------------------------------------------------------------- camera {cx, cy, z}, eased between keys
const NOSE_Y = DOG.front.nose[1];                          // −62.6: the sitting dog's nose
export const CAM0 = { cx: 0, cy: NOSE_Y - 2, z: 8 };       // the boop: frame 0 = frame END
const MED = { cx: 0, cy: -56, z: 2.9 }, NOSE = { cx: 0, cy: NOSE_Y, z: 6 }, FACE = { cx: 0, cy: -70, z: 4.2 }, FACE2 = { cx: 0, cy: -70, z: 3.6 };
const EXP = { cx: 122, cy: -80, z: 1.5 }, NAP = { cx: 0, cy: -46, z: 3.8 }, WAKE = { cx: 0, cy: -60, z: 3.0 };
const CK = (t, k) => ({ t, ...k });
const CAM = [
  CK(0, CAM0), CK(0.55, CAM0), CK(2.3, MED), CK(SC.tool[1], MED), CK(EV.inside + 0.3, NOSE), CK(SC.smell[1], NOSE),
  CK(SC.lick[0] + 0.45, FACE), CK(SC.lick[1], FACE), CK(SC.count[0] + 0.5, MED), CK(SC.count[1], MED),
  CK(SC.breath[0] + 0.5, NOSE), CK(SC.breath[1], NOSE), CK(SC.coldNose[0] + 0.5, FACE2), CK(SC.coldNose[1], FACE2),
  CK(SC.heat[0] + 0.7, EXP), CK(SC.heat[1], EXP), CK(SC.nap[0] + 0.6, NAP), CK(SC.nap[1], NAP), CK(EV.up + 0.1, WAKE), CK(EV.and, WAKE), CK(END, CAM0),
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k) };
}

// ---------------------------------------------------------------- the dog: [state, gateLo, gateHi] lists (crossfades)
// Character clock TC: blinks, wags and sniffs; at the seam the dog is drawn twice (TC = t and t − END) and crossfaded.
let TC = 0;
const blinkAt = (every, ph) => { const p = (((TC + ph) % every) + every) % every, d = 0.2; return p < d ? Math.sin((Math.PI * p) / d) : 0; };
function xf(a, b, t, t0, t1) { const k = sm(t, t0, t1); if (k <= 0) return [[a, 0, 1]]; if (k >= 1) return [[b, 0, 1]]; return [[a, k, 1], [b, 0, k]]; }
const CUPS = [{ x: 226, warm: true }, { x: 262, warm: false }];      // ≈1.6 m from the nose (the dog is ≈110 units ≈ 1 m long)
const boopK = (t) => Math.max(1 - sm(t, 0.05, 0.6), sm(t, EV.and + 0.05, END));
function front(t, more = {}) {
  const lick = Math.max(win(t, EV.licks - 0.05, EV.licks + 0.85, 0.01, 0.01) > 0 ? sm(t, EV.licks - 0.05, EV.licks + 0.85) : 0, t > EV.lick - 0.1 ? sm(t, EV.lick - 0.1, EV.wakes + 0.25) : 0);
  return { view: "front", x: 0, blink: blinkAt(3.6, 0.4), ears: 0.75, wag: 0.5, pant: 0.25, wet: 1, tilt: 0, sniff: 0.2, look: [0, 0], boop: boopK(t), lick: lick >= 1 ? 0 : lick, ...more };
}
function dogStates(t) {
  const s0 = SC;
  if (t < s0.heat[0] + 0.15) {
    const tilt = t > EV.why && t < EV.wet1 + 0.6 ? -0.6 * Math.sin(Math.PI * clamp01((t - EV.why) / (EV.wet1 + 0.6 - EV.why))) : 0;
    const sniff = (t > EV.tool - 0.1 && t < EV.tool + 0.9) || (t > SC.count[0] && t < SC.count[1]) ? 1 : 0.2;
    const f = front(t, { tilt, sniff, look: t > SC.coldNose[0] ? [0, 0.2] : [0, 0] });
    return [[f, 0, 1]];
  }
  // the experiment: the dog turns (standing, facing us → facing right) on the same spot and points its nose at the cups
  const side = (turn, more = {}) => ({ view: "side", x: 0, facing: 1, gait: "stand", phase: 0, turn, pitch: t > EV.warm - 0.2 && t < EV.cold4 ? 0.12 : -0.05, sniff: t > EV.heat - 0.2 && t < EV.away2 + 0.5 ? 1 : 0.3, ears: t > EV.heat ? 1 : 0.7, tail: { wag: 0.5, height: 0.4 }, blink: blinkAt(3.4, 0.2), wet: 1, yaw: t > EV.cold4 - 0.1 && t < s0.heat[1] - 0.2 ? 0.7 * sm(t, EV.cold4 - 0.1, EV.cold4 + 0.3) * (1 - sm(t, s0.heat[1] - 0.6, s0.heat[1] - 0.2)) : 0, ...more });
  const h0 = s0.heat[0];
  if (t < h0 + 0.45) return xf(front(t), side(0.5), t, h0 + 0.15, h0 + 0.45);
  if (t < s0.nap[0]) return [[side(0.5 * (1 - sm(t, h0 + 0.45, h0 + 0.95))), 0, 1]];
  // the nap: turn back to us, lie down (rise → 0), fall asleep with a dry nose; wake, lick (wet again), sit up, boop
  const n0 = s0.nap[0];
  const sleep = Math.min(sm(t, n0 + 0.6, n0 + 1.4), 1 - sm(t, EV.one - 0.05, EV.lick + 0.15));
  const dry = Math.min(sm(t, n0 + 0.8, n0 + 1.6), 1 - sm(t, EV.lick + 0.15, EV.wakes + 0.2));
  const lickL = t > EV.lick - 0.1 ? sm(t, EV.lick - 0.1, EV.wakes + 0.25) : 0;
  const rise = t < EV.one ? 0.46 * (1 - sm(t, n0 + 0.6, n0 + 1.2)) : sm(t, EV.up - 0.05, EV.and - 0.1);
  const lie = { view: "lie", x: 0, sleep, rise, dry, wet: 1 - dry, lick: lickL >= 1 ? 0 : lickL, blink: sleep > 0.5 ? 0 : blinkAt(3.6, 0.4), ears: 0.6, wag: sleep < 0.5 ? 0.6 : 0, tilt: 0, look: [0, 0] };
  if (t < n0 + 0.4) return [[side(0.5 * sm(t, n0, n0 + 0.4), { pitch: -0.05, sniff: 0.3, yaw: 0 }), 0, 1]];
  if (t < n0 + 0.6) return xf(side(0.5, { pitch: -0.05, sniff: 0.3, yaw: 0 }), lie, t, n0 + 0.4, n0 + 0.6);
  if (t < EV.and - 0.1) return [[lie, 0, 1]];
  return xf(lie, front(t), t, EV.and - 0.1, EV.and + 0.05);
}
function drawDog(c, G, tc, s) {
  const o = { ...s, a: 1 };
  if (s.view === "front") return drawDogFront(c, G, s.x, 0, tc, o);
  if (s.view === "lie") return drawDogLie(c, G, s.x, 0, tc, o);
  return drawDogSide(c, G, s.x, 0, tc, o);
}

// ---------------------------------------------------------------- props: two identical cups for the 2020 experiment
function cup(c, G, x, a) {
  if (a <= 0) return; const g = fade(c, a), z = G.z, X = (u) => R(G.X(x + u)), Y = (v) => R(G.Y(v));
  const w = 20, h = 24;
  g.rect(X(-w / 2) - 1, Y(-h) - 1, R(w * z) + 2, R(h * z) + 2, "#0B0812");
  for (let j = 0; j < R(h * z); j++) for (let i = 0; i < R(w * z); i++) { const u = i / (w * z); g.px(X(-w / 2) + i, Y(-h) + j, u < 0.25 ? "#FFFFFF" : u < 0.7 ? "#E4E8F2" : u < 0.9 ? "#C2C8DA" : "#9AA2BC"); }
  g.rect(X(-w / 2), Y(-h), R(w * z), Math.max(1, R(2 * z)), "#B8C0D4");
  for (let j = 0; j < R(9 * z); j++) { const v = j / (9 * z), r = R(Math.sin(Math.PI * v) * 5 * z); g.px(X(w / 2) + r, Y(-h + 5) + j, "#0B0812"); g.px(X(w / 2) + r - 1, Y(-h + 5) + j, "#C2C8DA"); }
}

// ---------------------------------------------------------------- thermal view (the face, then the experiment)
function thermalK(t) { return Math.max(win(t, EV.stays - 0.4, SC.coldNose[1] - 0.1, 0.45, 0.4), win(t, EV.heat - 0.3, EV.cold4 - 0.1, 0.45, 0.45)); }
function applyThermal(c, t, cam, G, states) {
  const k = thermalK(t); if (k <= 0) return;
  let nose = null, eyes = [];
  const mask = actorMask(Canvas, GW, GH, (kc) => { for (const [s] of states) { const a = drawDog(kc, G, TC, s); if (a?.nose) nose = a.nose; if (a?.eyes) eyes = a.eyes; else if (a?.eye) eyes = [a.eye]; } });
  const warmCup = t > SC.heat[0] ? actorMask(Canvas, GW, GH, (kc) => cup(kc, G, CUPS[0].x, 1)) : null;
  const nr = 8 * G.z, er = 4 * G.z;
  thermal(c, (x, y, lum) => {
    const i = y * GW + x;
    if (warmCup && warmCup[i]) return 0.86 + 0.06 * lum;
    if (mask[i]) {
      if (nose && (x - nose[0]) ** 2 + (y - nose[1]) ** 2 < nr * nr) return 0.12 + 0.06 * lum;
      for (const e of eyes) if ((x - e[0]) ** 2 + (y - e[1]) ** 2 < er * er) return 0.93;
      return 0.66 + 0.12 * lum;
    }
    return 0.24 + 0.14 * lum;                                                        // the air and the lawn around
  }, k);
}

// ---------------------------------------------------------------- frame
const BOX = { x: 24, y: 112, w: 492, h: 440 };
const SMELLS = particles(12, 3);
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam);
  park.back(c, cam, t, PO);
  // cups (only in the experiment)
  const cupA = win(t, EV.scientists - 0.1, SC.heat[1] - 0.1, 0.35, 0.4);
  for (const cp of CUPS) cup(c, G, cp.x, cupA);
  // dog (crossfades; seam: twice with the two character clocks)
  const states = dogStates(t), seamK = sm(t, END - 0.35, END), passes = seamK <= 0 ? [[t, 0, 1]] : [[t, seamK, 1], [t - END, 0, seamK]];
  let A = null;
  for (const [tc, plo, phi] of passes) { TC = tc; const cc = gate(c, plo, phi); for (const [s, lo, hi] of states) { const a = drawDog(gate(cc, lo, hi), G, tc, s); if (hi - lo >= 0.5 || !A) A = a; } }
  TC = t;
  noseBits(c, t, A);
  park.front(c, cam, t, PO);
  applyThermal(c, t, cam, G, states);
  overlays(c, t, G, A);
  captions(c, t);
  return c;
}

// smell bits on the nose before the lick (the tongue wipes them in)
function noseBits(c, t, A) {
  const a = Math.min(sm(t, SC.lick[0], SC.lick[0] + 0.3), 1 - sm(t, EV.licks + 0.2, EV.licks + 0.5)); if (a <= 0 || !A?.nose) return;
  const z = camera(t).z;
  for (let i = 0; i < 7; i++) { const an = rnd(i + 9) * Math.PI * 2, r = (2 + rnd(i + 3) * 6) * z; bit(c, A.nose[0] + Math.cos(an) * r * 1.3, A.nose[1] + Math.sin(an) * r * 0.6 - 2 * z, SMELL_COLS[i % SMELL_COLS.length], a); }
}

function overlays(c, t, G, A) {
  // the boop: comic word + the wet smear on the «lens»
  smear(c, Math.min(sm(t, 0, 0.12), 1 - sm(t, 0.4, 1.7)), 270, 500);
  comic(c, "BOOP!", 270, 250 - R(sm(t, 0, 0.3) * 14), Math.min(sm(t, 0.02, 0.14), 1 - sm(t, 0.75, 1.05)), CC.IV, 9);
  // cold + wet tags
  const nx = A?.nose?.[0] ?? 270, ny = A?.nose?.[1] ?? 500;
  const cw = win(t, EV.cold1 - 0.1, SC.boop[1] - 0.05, 0.25, 0.3), ww = win(t, EV.wet1 - 0.1, SC.boop[1] - 0.05, 0.25, 0.3);
  if (cw > 0) { tag(c, ["COLD"], 150, 200, cw, CC.CY, 3); leader(c, 150, 236, nx - 8, ny - 6, cw, CC.CY); }
  if (ww > 0) { tag(c, ["WET"], 400, 200, ww, CC.CY, 3); leader(c, 400, 236, nx + 8, ny - 6, ww, CC.CY); }
  // not a cold / tool
  const nc = win(t, EV.notA - 0.1, SC.tool[1] - 0.05, 0.25, 0.3), tl = win(t, EV.tool - 0.1, SC.tool[1] - 0.05, 0.25, 0.3);
  if (nc > 0) tag(c, ["NOT A COLD ×"], 270, 160, nc, CC.PK, 3);
  if (tl > 0) tag(c, ["IT'S A TOOL ✓"], 270, 214, tl, CC.G, 3);
  // panels: skin (mucus + smells), head cut-away, counters, nostrils
  skinPanel(c, t); headPanel(c, t); countPanel(c, t); nosePanel(c, t);
  // thermal labels
  const th = thermalK(t);
  if (th > 0.05) { tag(c, ["THERMAL VIEW"], 140, 112, th, CC.Y, 2); legend(c, 330, 120, th); }
  const cn = win(t, EV.cold3 - 0.1, SC.coldNose[1] - 0.15, 0.25, 0.3);
  if (cn > 0) { tag(c, ["COLD NOSE"], 270, 250, cn, CC.CY, 3); leader(c, 270, 286, nx, ny - 10, cn, CC.CY); }
  const ar = win(t, EV.around - 0.1, SC.coldNose[1] - 0.15, 0.25, 0.3); if (ar > 0) label(c, "AIR: WARMER", 140, 520, ar, CC.Y, 3);
  // the experiment
  const y20 = win(t, EV.in2020 - 0.1, EV.sense - 0.2, 0.25, 0.3); if (y20 > 0) tag(c, ["2020 · SCIENTISTS"], 270, 150, y20, CC.IV, 3);
  const cupY = G.Y(-20) - 30;
  const wm = win(t, EV.warm - 0.1, EV.cold4 - 0.15, 0.25, 0.3); if (wm > 0) { label(c, "WARM", G.X(CUPS[0].x), cupY - 10, wm, "#FFB84A", 3); label(c, "SAME CUP", G.X(CUPS[1].x), cupY - 44, wm * 0.9, CC.IV, 2); }
  const mt = win(t, EV.meter - 0.15, SC.heat[1] - 0.2, 0.3, 0.3);
  if (mt > 0 && A?.nose) { const y = G.Y(-6), x0 = A.nose[0], x1 = G.X(CUPS[0].x - 9); for (let x = R(x0); x <= x1; x += 2) fade(c, mt).px(x, R(y), CC.IV); for (const xx of [x0, x1]) fade(c, mt).rect(R(xx), R(y) - 4, 1, 9, CC.IV); label(c, "1.6 M", (x0 + x1) / 2, y - 26, mt, CC.Y, 3); }
  const mb = win(t, EV.may - 0.1, SC.heat[1] - 0.15, 0.25, 0.3); if (mb > 0) tag(c, ["COLD NOSE =", "HEAT SENSOR?"], 270, 150, mb, CC.CY, 3);
  // the nap
  const dr = win(t, EV.dry1 - 0.1, SC.nap[1] - 0.1, 0.25, 0.3); if (dr > 0) { tag(c, ["DRY NOSE"], 150, 200, dr, "#C8B89A", 3); leader(c, 150, 236, nx - 6, ny - 6, dr, "#C8B89A"); }
  const sk = win(t, EV.sick - 0.1, SC.nap[1] - 0.1, 0.25, 0.3); if (sk > 0) tag(c, ["NOT SICK ✓"], 390, 200, sk, CC.G, 3);
  const zz = win(t, SC.nap[0] + 0.3, EV.one + 0.2, 0.4, 0.3); if (zz > 0 && A?.head) zzz(c, t, A.head[0] + 60, A.head[1] - 40, zz);
}
function legend(c, x, y, a) { const g = fade(c, a), w = 180; for (let i = 0; i < w; i++) { const v = i / w, col = ["#1C0C5A", "#2050C8", "#1EA0D8", "#B0287A", "#E0403A", "#F67C1E", "#FCC02A", "#FFF07A"][Math.min(7, Math.floor(v * 8))]; g.rect(x + i, y + 4, 1, 10, col); } g.frame(x - 1, y + 3, w + 2, 12, CC.O); label(c, "COLD", x + 18, y + 20, a, CC.CY, 2); label(c, "WARM", x + w - 20, y + 20, a, "#FCC02A", 2); }
function zzz(c, t, x, y, a) { for (let i = 0; i < 3; i++) { const ph = ((t * 0.5 + i / 3) % 1), s = 2 + i % 2; label(c, "Z", x + i * 14 + Math.sin(ph * 6) * 4, y - ph * 50, a * Math.sin(Math.PI * ph), CC.L, s + 1); } }

// the skin cross-section: glands → mucus film → smell bits drift in and stick; the sticky-tape inset
function skinPanel(c, t) {
  const a = win(t, EV.inside - 0.15, SC.smell[1] - 0.05, 0.35, 0.35); if (a <= 0) return;
  panel(c, BOX.x - 6, BOX.y - 6, BOX.w + 12, BOX.h + 12, a, CC.CY);
  const glands = sm(t, EV.glands - 0.1, EV.glands + 0.6), flow = sm(t, EV.covered - 0.2, EV.thin + 0.2), film = sm(t, EV.thin - 0.1, EV.mucus + 0.3);
  const pa = sm(t, EV.smells1 - 0.1, EV.tiny + 0.2);
  const parts = SMELLS.map((p, i) => ({ x01: 0.06 + 0.88 * p.x0, y01: 0.06 + 0.32 * p.y0, col: p.col, stick: sm(t, EV.catches1 - 0.15 + i * 0.09, EV.catches1 + 0.25 + i * 0.09), a: pa }));
  const A = drawSkin(fade(c, a), BOX, t, { glands, flow, film, particles: parts, a });
  const gl = win(t, EV.glands - 0.05, SC.mucus[1] + 0.2, 0.25, 0.3); if (gl > 0 && A?.gland) { label(c, "GLANDS", A.gland[0], A.gland[1] + 40, Math.min(a, gl), CC.CY, 3); }
  const mu = win(t, EV.mucus - 0.1, SC.smell[1] - 0.1, 0.25, 0.3); if (mu > 0 && A?.film) { tag(c, ["MUCUS"], A.film[0], BOX.y + 20, Math.min(a, mu), CC.CY, 3); leader(c, A.film[0], BOX.y + 56, A.film[0], A.film[1], Math.min(a, mu), CC.CY); }
  const sw = win(t, EV.smells1 - 0.05, EV.catches1 - 0.1, 0.25, 0.3); if (sw > 0) tag(c, ["SMELLS"], 120, BOX.y + 20, Math.min(a, sw), CC.Y, 3);
  const ct = win(t, EV.catches1 - 0.05, SC.smell[1] - 0.1, 0.25, 0.3); if (ct > 0) tag(c, ["CAUGHT!"], 120, BOX.y + 20, Math.min(a, ct), CC.G, 3);
  // sticky tape inset
  const ta = win(t, EV.sticky - 0.1, SC.smell[1] - 0.05, 0.3, 0.3); if (ta > 0) tape(c, t, 300, BOX.y + BOX.h - 130, 200, 112, Math.min(a, ta));
}
function tape(c, t, x, y, w, h, a) {
  panel(c, x, y, w, h, a, CC.Y); const g = fade(c, a);
  g.rect(x + 14, y + 52, w - 28, 22, "#E8D49A"); g.rect(x + 14, y + 52, w - 28, 3, "#F8ECC4"); g.rect(x + 14, y + 71, w - 28, 3, "#C8B070");
  for (let i = 0; i < 14; i++) { const px = x + 22 + rnd(i * 3 + 1) * (w - 44), fall = clamp01(((t - (EV.tape - 0.3) - i * 0.07) / 0.5)), py = lerp(y + 26, y + 56 + rnd(i) * 12, fall); g.rect(R(px), R(py), 2, 2, "#5A5468"); }
  label(c, "STICKY TAPE", x + w / 2, y + 12, a, CC.Y, 2); label(c, "DUST", x + w / 2, y + 86, a, CC.IV, 2);
}
// the head cut-away: tongue carries the smells to the second organ in the roof of the mouth
function headPanel(c, t) {
  const a = win(t, EV.tongue - 0.25, SC.lick[1] - 0.05, 0.35, 0.35); if (a <= 0) return;
  panel(c, BOX.x - 6, BOX.y - 6, BOX.w + 12, BOX.h + 12, a, CC.Y);
  const A = drawHead(fade(c, a), BOX, t, { cut: sm(t, EV.tongue - 0.2, EV.tongue + 0.3), tongue: sm(t, EV.carries - 0.1, EV.second + 0.1), organ: sm(t, EV.second - 0.1, EV.organ + 0.3), smellArea: 0.25, a });
  const og = win(t, EV.organ - 0.1, SC.lick[1] - 0.1, 0.25, 0.3); if (og > 0 && A?.organ) { tag(c, ["2ND SMELL ORGAN"], 270, BOX.y + 16, Math.min(a, og), CC.Y, 3); leader(c, 270, BOX.y + 52, A.organ[0], A.organ[1] - 4, Math.min(a, og), CC.Y); }
  const rf = win(t, EV.roof - 0.1, SC.lick[1] - 0.1, 0.25, 0.3); if (rf > 0 && A?.organ) label(c, "ROOF OF MOUTH", 270, BOX.y + BOX.h - 34, Math.min(a, rf), CC.IV, 3);
  const tg = win(t, EV.tongue - 0.05, EV.organ - 0.1, 0.25, 0.3); if (tg > 0 && A?.tongue) { label(c, "TONGUE", A.tongue[0], A.tongue[1] + 34, Math.min(a, tg), "#F8A0B8", 3); }
}
// counters: up to 300,000,000 smell cells vs about 6,000,000
const fmt = (n) => Math.round(n).toLocaleString("en-US");
function countPanel(c, t) {
  const a = win(t, EV.dogHas - 0.2, SC.count[1] - 0.05, 0.35, 0.35); if (a <= 0) return;
  const x = 24, y = 120, w = 492, h = 330; panel(c, x, y, w, h, a, CC.Y);
  label(c, "SMELL CELLS", 270, y + 14, a, CC.IV, 3);
  const rows = [{ who: "DOG", y: y + 70, n: 3e8, k: sm(t, EV.three - 0.1, EV.cells + 0.2), col: CC.Y }, { who: "YOU", y: y + 190, n: 6e6, k: sm(t, EV.six - 0.1, EV.million2 + 0.4), col: UI.L, show: sm(t, EV.you - 0.15, EV.you + 0.15) }];
  for (const r of rows) {
    const ra = Math.min(a, r.show ?? 1); if (ra <= 0) continue;
    const g = fade(c, ra), iz = 1.05, G2 = { z: iz, X: (wx) => x + 62 + wx * iz, Y: (wy) => r.y + 92 + wy * iz, wx: (sx) => (sx - x - 62) / iz, wy: (sy) => (sy - r.y - 92) / iz, p: 1 };
    if (r.who === "DOG") drawDogFront(fade(c, ra), G2, 0, 0, TC, { blink: blinkAt(3.6, 0.4), ears: 0.8, wag: 0, pant: 0.3, wet: 1, sniff: 1 });
    else drawOwner(fade(c, ra), { ...G2, Y: (wy) => r.y + 104 + wy * 0.62, X: (wx) => x + 62 + wx * 0.62, z: 0.62 }, 0, 0, TC, { facing: 0, blink: blinkAt(3.9, 0.7), shadow: 0 });
    label(c, r.who, x + 62, r.y - 6, ra, r.col, 3);
    const bw = 300, bx = x + 150, by = r.y + 46; g.rect(bx, by, bw, 18, "#1D1430"); g.frame(bx - 1, by - 1, bw + 2, 20, CC.O);
    const fill = R(bw * (r.n / 3e8) * r.k); if (fill > 0) { g.rect(bx, by, Math.max(2, fill), 18, r.col); g.rect(bx, by, Math.max(2, fill), 3, mix(r.col, "#FFFFFF", 0.4)); }
    label(c, fmt(r.n * r.k), bx + bw / 2, r.y + 12, ra, r.col, 3);
  }
  const fifty = win(t, EV.million2 + 0.35, SC.count[1] - 0.05, 0.25, 0.3); if (fifty > 0) tag(c, ["DOG: ×50"], 270, y + h + 14, Math.min(a, fifty), CC.Y, 3);
}
// nostrils: in through the front, out through the side slits
function nosePanel(c, t) {
  const a = win(t, EV.even - 0.2, SC.breath[1] - 0.05, 0.35, 0.35); if (a <= 0) return;
  panel(c, BOX.x - 6, BOX.y - 6, BOX.w + 12, BOX.h + 12, a, CC.CY);
  const A = drawNostrils(fade(c, a), BOX, t, { wet: 1, inhale: sm(t, EV.breathing - 0.1, EV.breathing + 0.4), exhale: sm(t, EV.leaves - 0.2, EV.leaves + 0.3), a });
  const inA = win(t, EV.breathing, SC.breath[1] - 0.1, 0.25, 0.3); if (inA > 0 && A?.left) { label(c, "IN", (A.left[0] + A.right[0]) / 2, A.left[1] - 70, Math.min(a, inA), CC.CY, 4); }
  const outA = win(t, EV.leaves - 0.05, SC.breath[1] - 0.1, 0.25, 0.3); if (outA > 0 && A?.slitL) { label(c, "OUT", A.slitL[0] - 10, A.slitL[1] + 46, Math.min(a, outA), "#FFB07A", 4); label(c, "OUT", A.slitR[0] + 10, A.slitR[1] + 46, Math.min(a, outA), "#FFB07A", 4); }
  const sl = win(t, EV.slits - 0.1, SC.breath[1] - 0.1, 0.25, 0.3); if (sl > 0) tag(c, ["SIDE SLITS"], 270, BOX.y + 14, Math.min(a, sl), "#FFB07A", 3);
  const st = win(t, EV.blow - 0.15, SC.breath[1] - 0.1, 0.25, 0.3); if (st > 0) tag(c, ["SMELL STAYS ✓"], 270, BOX.y + BOX.h - 50, Math.min(a, st), CC.G, 3);
}

await cli(frame, END, FPS, HERE);
