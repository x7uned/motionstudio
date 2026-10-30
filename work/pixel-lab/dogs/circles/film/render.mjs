// «Why do dogs spin before lying down?» — pixel film (Kagenami), the same sunny park and collie as the two earlier dog
// films, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No overlay; karaoke captions over a soft shade.
// The collie stays at x 0 the whole film; only what it spins on changes (bed → long-ago grass/snow → bed → the study's
// smooth mat and shaggy rug → bed). A full circle on the spot = drawDogSide turn 0→1 (front pass), then 1→0 (back pass).
// node render.mjs --stills 0.5,3,... | --video
import { fileURLToPath } from "node:url";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { ground, gate, clamp01, sm, ease, lerp, win, rnd } from "../../kit-v3/layout.mjs";
import * as park from "../../kit-v3/park.mjs";
import { drawDogSide, drawDogFront, drawDogCurl, DOG } from "../../kit-v3/dog.mjs";
import * as nest from "../../kit-v3/nest.mjs";
import { tag, panel, C as UI } from "../../../animals/film/cute.mjs";
import { CC, makeCaptions, label, bubble, leader, cli } from "../../common.mjs";
import { END, FPS, VOICE, WORDS, EV, SC } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const PO = { period: END };
const captions = makeCaptions(VOICE, WORDS, END);

// ---------------------------------------------------------------- camera
export const HOOK0 = { cx: 0, cy: -52, z: 2.6 };
const WILD = { cx: 0, cy: -72, z: 2.5 }, PILLOW = { cx: 0, cy: -50, z: 2.8 }, STUDY = { cx: -70, cy: -96, z: 1.5 };
const CURL = { cx: 0, cy: -32, z: 3.3 }, DANGER = { cx: 0, cy: -58, z: 2.1 }, VET = { cx: 0, cy: -52, z: 2.6 };
const CK = (t, k) => ({ t, ...k });
const CAM = [
  CK(0, HOOK0), CK(SC.hook[1], HOOK0), CK(SC.wild[0] + 0.6, WILD), CK(SC.wild[1], WILD), CK(SC.pillow[0] + 0.5, PILLOW), CK(SC.pillow[1], PILLOW),
  CK(SC.study[0] + 0.8, STUDY), CK(EV.bumps - 0.2, STUDY), CK(SC.study[1], { cx: 0, cy: -70, z: 2.2 }), CK(SC.curl[0] + 1.2, CURL), CK(SC.curl[1], CURL),
  CK(SC.danger[0] + 0.7, DANGER), CK(SC.danger[1], DANGER), CK(SC.vet[0] + 0.6, VET), CK(SC.vet[1], VET), CK(END, HOOK0),
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k) };
}

// ---------------------------------------------------------------- the spin: φ → turn/back (one full circle per period)
const SPIN_P = 1.25;                                         // seconds per circle (calm)
const spinPose = (phi) => { const p = ((phi % 1) + 1) % 1; return p < 0.5 ? { turn: 2 * p, back: 0 } : { turn: 2 - 2 * p, back: 1 }; };
/** walking in place while turning: the leg phase advances with the turning */
const spinState = (phi, more = {}) => ({ view: "side", x: 0, facing: 1, gait: "walk", phase: phi * 2, ...spinPose(phi), ears: 0.8, tail: { wag: 0.6, height: 0.4 }, pant: 0.4, ...more });

// ---------------------------------------------------------------- the dog: [state, gateLo, gateHi] lists
let TC = 0;
const blinkAt = (every, ph) => { const p = (((TC + ph) % every) + every) % every, d = 0.2; return p < d ? Math.sin((Math.PI * p) / d) : 0; };
function xf(a, b, t, t0, t1) { const k = sm(t, t0, t1); if (k <= 0) return [[a, 0, 1]]; if (k >= 1) return [[b, 0, 1]]; return [[a, k, 1], [b, 0, k]]; }
const stand = (more = {}) => ({ view: "side", x: 0, facing: 1, gait: "stand", phase: 0, turn: 0, back: 0, ears: 0.8, tail: { wag: 0.5, height: 0.4 }, pant: 0.4, blink: blinkAt(3.4, 0.2), ...more });
const lieDown = (k, curl = 0, more = {}) => ({ view: "curl", x: 0, curl, rise: 1 - k, sleep: curl > 0.6 ? sm(curl, 0.6, 1) : 0, blink: blinkAt(3.6, 0.3), ears: 0.7, ...more });

function dogStates(t) {
  // hook: spinning on the bed (φ from t, so the loop's end continues it)
  const hookSpin = () => spinState(t / SPIN_P, { blink: blinkAt(3.4, 0.2) });
  if (t < SC.hook[1] - 0.3) return [[hookSpin(), 0, 1]];
  if (t < SC.hook[1] + 0.15) return xf(hookSpin(), stand({ coat: "wolf", pitch: -0.15, ears: 1 }), t, SC.hook[1] - 0.3, SC.hook[1] + 0.15);
  // long ago: the wolf spins in the tall grass, then snow, lies down and curls into the nest
  if (t < SC.wild[1]) {
    const wolf = { coat: "wolf" }, w0 = EV.wolves - 0.1, wEnd = EV.flat1 + 0.35;
    if (t < w0) return [[stand({ ...wolf, pitch: -0.15, ears: 1 }), 0, 1]];
    if (t < wEnd) return [[spinState((t - w0) / SPIN_P, { ...wolf, blink: blinkAt(3.4, 0.2), ears: 1 }), 0, 1]];
    const k = sm(t, wEnd, wEnd + 0.4), c = sm(t, wEnd + 0.4, EV.nest + 0.3);
    if (t < wEnd + 0.15) return xf(stand(wolf), lieDown(0, 0, wolf), t, wEnd, wEnd + 0.15);
    return [[lieDown(k, c, wolf), 0, 1]];
  }
  // the soft pillow: the collie spins again
  if (t < SC.pillow[1]) { const p0 = SC.pillow[0], sp = spinState((t - p0) / SPIN_P, { blink: blinkAt(3.4, 0.2) }); if (t < p0 + 0.4) return xf(lieDown(1, 1, { coat: "wolf" }), sp, t, p0, p0 + 0.4); return [[sp, 0, 1]]; }
  // the study: the collie waits on the shaggy rug, digs, spins (the rug flattens), lies down
  if (t < SC.study[1] + 0.05) {
    const d0 = EV.dug - 0.15, d1 = EV.first + 0.35, s0 = EV.bumps - 0.05, s1 = s0 + 2 * SPIN_P, l1 = s1 + 0.45;
    if (t < d0) return [[stand({ pitch: -0.1 }), 0, 1]];
    if (t < d1) return [[stand({ dig: Math.min(sm(t, d0, d0 + 0.2), 1 - sm(t, d1 - 0.2, d1)), pitch: 0.4 }), 0, 1]];
    if (t < s0) return [[stand({ pitch: -0.05 }), 0, 1]];
    if (t < s1) return [[spinState((t - s0) / SPIN_P, { blink: blinkAt(3.4, 0.2) }), 0, 1]];
    if (t < s1 + 0.15) return xf(stand(), lieDown(0), t, s1, s1 + 0.15);
    return [[lieDown(sm(t, s1 + 0.15, l1)), 0, 1]];
  }
  // the curl: nose tucked in, tail over the face; night falls
  if (t < SC.curl[1]) return [[lieDown(1, sm(t, EV.ends - 0.1, EV.curl + 0.5)), 0, 1]];
  // danger check: uncurl, stand, one slow circle while a «radar» sweeps around
  const g0 = SC.danger[0], up0 = g0 + 0.1, up1 = g0 + 0.9, r0 = EV.circling - 0.05, r1 = r0 + 2 * 1.4;
  if (t < SC.danger[1]) {
    // uncurl (curl 1 → 0), rise to standing height (rise 0 → 1, which matches the standing side view), then stand
    if (t < up1) return [[lieDown(1 - sm(t, up0 + 0.35, up1), 1 - sm(t, up0, up0 + 0.4)), 0, 1]];
    if (t < up1 + 0.12) return xf(lieDown(0, 0), stand({ pitch: -0.15, ears: 1 }), t, up1, up1 + 0.12);
    if (t < r0) return [[stand({ pitch: -0.15, ears: 1 }), 0, 1]];
    if (t < r1) return [[spinState((t - r0) / 1.4, { blink: blinkAt(3.4, 0.2), ears: 1, pitch: -0.15 }), 0, 1]];
    return [[stand({ pitch: -0.1, ears: 0.9 }), 0, 1]];
  }
  // the warning: restless — circles, tries to lie down, gets up again, circles
  if (t < SC.vet[1]) {
    const v0 = SC.vet[0], a1 = EV.circles4 - 0.1, try0 = EV.settle - 0.1, try1 = try0 + 0.8;
    if (t < a1) return [[stand({ ears: 0.6, tail: { wag: 0.1, height: -0.3 }, brows: 0.6 }), 0, 1]];
    if (t < try0) return [[spinState((t - a1) / ((try0 - a1) / 2), { blink: blinkAt(3.4, 0.2), ears: 0.5, tail: { wag: 0.1, height: -0.3 }, pant: 0.8 }), 0, 1]];
    if (t < try1) { const k = Math.sin(Math.PI * clamp01((t - try0) / 0.8)) * 0.6; if (t < try0 + 0.1) return xf(stand(), lieDown(0), t, try0, try0 + 0.1); if (t > try1 - 0.1) return xf(lieDown(0), stand(), t, try1 - 0.1, try1); return [[lieDown(k, 0, { brows: 0.6 }), 0, 1]]; }
    return [[spinState((t - try1) / 0.95, { blink: blinkAt(3.4, 0.2), ears: 0.5, tail: { wag: 0.1, height: -0.3 }, pant: 0.8 }), 0, 1]];
  }
  // the loop: a calm spin again, phase-locked to the hook (φ = (t − END) / SPIN_P)
  const calm = spinState((t - END) / SPIN_P, { blink: blinkAt(3.4, 0.2) });
  if (t < SC.loop[0] + 0.3) { const prev = spinState((t - (EV.settle - 0.1 + 0.8)) / 0.95, { blink: blinkAt(3.4, 0.2), ears: 0.5, pant: 0.8 }); return xf(prev, calm, t, SC.loop[0], SC.loop[0] + 0.3); }
  return [[calm, 0, 1]];
}
/** the dog's ground y: the seat of whatever it stands on, blended by the props' dissolve weights */
function seatY(t) {
  const P = props(t), press = bedPress(t);
  const flatR = sm(t, EV.bumps - 0.05, EV.bumps - 0.05 + 2 * SPIN_P), flatG = 0.35 + 0.65 * sm(t, EV.walk, EV.flat1 + 0.3), snow = sm(t, EV.snow - 0.15, EV.snow + 0.3);
  const parts = [[P.bed, nest.bedSeat({ press }).y], [P.rug, nest.matSeat({ kind: "shaggy", flat: flatR })], [P.wild, nest.grassSeat({ flat: flatG, snow })]];
  let w = 0, y = 0; for (const [a, sy] of parts) { w += a; y += a * sy; } return w > 0 ? y / w : 0;
}
let SEAT = 0;
function drawDog(c, G, tc, s) {
  const o = { ...s, a: 1 };
  if (s.view === "front") return drawDogFront(c, G, s.x, SEAT, tc, o);
  if (s.view === "curl") return drawDogCurl(c, G, s.x, SEAT, tc, o);
  return drawDogSide(c, G, s.x, SEAT, tc, o);
}

// ---------------------------------------------------------------- what it spins on (props dissolve, the dog stays)
function props(t) {
  const bed = Math.max(1 - sm(t, SC.hook[1] - 0.1, SC.hook[1] + 0.4), win(t, SC.pillow[0] - 0.2, SC.study[0] + 0.3, 0.4, 0.4), sm(t, SC.study[1] - 0.1, SC.study[1] + 0.5));
  const wild = win(t, SC.wild[0] - 0.1, SC.wild[1] + 0.1, 0.45, 0.45);
  const rug = win(t, SC.study[0] - 0.1, SC.study[1] + 0.2, 0.4, 0.5), mat = win(t, SC.study[0] + 0.2, SC.study[1] - 0.1, 0.4, 0.4);
  return { bed, wild, rug, mat };
}
const MAT_X = -150;
function drawProps(c, G, t, P, layer) {
  const f = layer === "back";
  if (P.mat > 0) (f ? nest.matBack : nest.matFront)(fade(c, P.mat), G, MAT_X, 0, t, { kind: "smooth", a: P.mat, period: END });
  if (P.rug > 0) { const flat = sm(t, EV.bumps - 0.05, EV.bumps - 0.05 + 2 * SPIN_P), dig = win(t, EV.dug - 0.15, EV.first + 0.35, 0.2, 0.2); (f ? nest.matBack : nest.matFront)(fade(c, P.rug), G, 0, 0, t, { kind: "shaggy", flat, dig, a: P.rug, period: END }); }
  if (P.bed > 0) (f ? nest.bedBack : nest.bedFront)(fade(c, P.bed), G, 0, 0, t, { press: bedPress(t), a: P.bed, period: END });
  if (P.wild > 0) { const flat = 0.35 + 0.65 * sm(t, EV.walk, EV.flat1 + 0.3), snow = sm(t, EV.snow - 0.15, EV.snow + 0.3); (f ? nest.grassBack : nest.grassFront)(fade(c, P.wild), G, 0, 0, t, { flat, snow, dusk: 0, a: P.wild, period: END }); }
}
const bedPress = (t) => t > SC.curl[0] && t < SC.danger[0] + 0.9 ? 1 - sm(t, SC.danger[0] + 0.2, SC.danger[0] + 0.9) : t > SC.vet[0] && t < SC.vet[1] ? 0.3 : 0.15;

// ---------------------------------------------------------------- screen tints: long-ago dusk, night
function tint(c, col, k, x0 = 0, y0 = 0, x1 = GW, y1 = GH) { if (k <= 0) return; const [r, g, b] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16)), d = c.d; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * GW + x) * 3; d[i] = d[i] + (r - d[i]) * k; d[i + 1] = d[i + 1] + (g - d[i + 1]) * k; d[i + 2] = d[i + 2] + (b - d[i + 2]) * k; } }
function sepia(c, k) { if (k <= 0) return; const d = c.d; for (let i = 0; i < d.length; i += 3) { if (k < 1 && k <= bayer((i / 3) % GW, Math.floor(i / 3 / GW))) continue; const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; d[i] = Math.min(255, l * 1.02 + 34); d[i + 1] = Math.min(255, l * 0.86 + 14); d[i + 2] = Math.min(255, l * 0.78 + 30); } }
const nightK = (t) => win(t, EV.keeps - 0.3, SC.curl[1] - 0.2, 0.6, 0.5);

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), P = props(t);
  park.back(c, cam, t, PO);
  drawProps(c, G, t, P, "back");
  SEAT = seatY(t);
  const states = dogStates(t), seamK = sm(t, END - 0.35, END), passes = seamK <= 0 ? [[t, 0, 1]] : [[t, seamK, 1], [t - END, 0, seamK]];
  let A = null;
  for (const [tc, plo, phi] of passes) { TC = tc; const cc = gate(c, plo, phi); for (const [s, lo, hi] of states) { const a = drawDog(gate(cc, lo, hi), G, tc, s); if (hi - lo >= 0.5 || !A) A = a; } }
  TC = t;
  drawProps(c, G, t, P, "front");
  const rd = win(t, EV.circling - 0.1, EV.but + 0.2, 0.3, 0.3); if (rd > 0) radar(c, t, G, rd);   // a sweep on the lawn around the bed
  park.front(c, cam, t, PO);
  sepia(c, P.wild);
  const nk = nightK(t); if (nk > 0) { tint(c, "#0A0C2A", 0.62 * nk); stars(c, t, nk); glow(c, A, nk); }
  overlays(c, t, G, A, P);
  captions(c, t);
  return c;
}
function stars(c, t, a) { const g = fade(c, a); for (let i = 0; i < 60; i++) { const x = R(rnd(i * 7 + 1) * GW), y = R(rnd(i * 13 + 5) * 420), tw = 0.5 + 0.5 * Math.sin(t * 3 + i); if (tw > 0.3) g.px(x, y, tw > 0.8 ? "#FFFFFF" : "#B0B8FF"); } }
function glow(c, A, a) { if (!A?.head) return; const cx = A.head[0] + 20, cy = A.head[1] + 10, r = 120; for (let y = R(cy - r); y < cy + r; y++) for (let x = R(cx - r); x < cx + r; x++) { const d = ((x - cx) ** 2 + ((y - cy) * 1.6) ** 2) / (r * r); if (d >= 1) continue; const k = a * 0.35 * (1 - d); if (k > bayer(x, y)) { const p = c.get(x, y); c.px(x, y, mix(p, "#FFB84A", 0.35)); } } }

// ---------------------------------------------------------------- overlays
function overlays(c, t, G, A, P) {
  const top = A?.top ?? [270, 380];
  // hook
  const lo = win(t, EV.lost - 0.1, SC.hook[1] - 0.1, 0.25, 0.3); if (lo > 0) tag(c, ["LOST? ×"], 270, 170, lo, CC.PK, 3);
  const mb = win(t, EV.making1 - 0.1, SC.hook[1] - 0.05, 0.25, 0.3); if (mb > 0) tag(c, ["MAKING A BED ✓"], 270, 226, mb, CC.G, 3);
  // long ago
  const la = win(t, EV.long - 0.05, SC.wild[1] - 0.1, 0.3, 0.3); if (la > 0) tag(c, ["LONG AGO"], 270, 150, la, "#E8C88A", 3);
  const wo = win(t, EV.wolves - 0.05, SC.wild[1] - 0.1, 0.3, 0.3); if (wo > 0) tag(c, ["WOLVES STILL DO IT"], 270, 206, wo, CC.IV, 3);
  const gr = win(t, EV.grass - 0.05, EV.snow - 0.1, 0.2, 0.2), sn = win(t, EV.snow - 0.05, SC.wild[1] - 0.1, 0.2, 0.3);
  if (gr > 0) label(c, "GRASS", 270, 330, gr, "#C8E88A", 4); if (sn > 0) label(c, "SNOW", 270, 330, sn, "#E8F4FF", 4);
  const ne = win(t, EV.nest - 0.1, SC.wild[1] - 0.1, 0.25, 0.3); if (ne > 0) tag(c, ["NEST ✓"], 270, 262, ne, CC.G, 3);
  // pillow
  const op = win(t, EV.old - 0.1, SC.pillow[1] - 0.1, 0.25, 0.3); if (op > 0) tag(c, ["SAME OLD PLAN"], 270, 170, op, CC.Y, 3);
  const sp = win(t, EV.pillow - 0.1, SC.pillow[1] - 0.1, 0.25, 0.3); if (sp > 0) tag(c, ["SOFT PILLOW"], 270, 226, sp, CC.IV, 3);
  // the study
  study(c, t, G, P);
  // curl
  const nt = win(t, EV.nose - 0.1, SC.curl[1] - 0.2, 0.25, 0.3); if (nt > 0 && A?.nose) { tag(c, ["NOSE TUCKED IN"], 160, 200, nt, CC.IV, 3); leader(c, 160, 236, A.nose[0], A.nose[1], nt); }
  const tl = win(t, EV.tail - 0.1, SC.curl[1] - 0.2, 0.25, 0.3); if (tl > 0 && (A?.tail || A?.head)) { const p = A.tail ?? A.head; tag(c, ["TAIL OVER FACE"], 380, 290, tl, CC.IV, 3); leader(c, 380, 326, p[0], p[1], tl); }
  const hs = win(t, EV.heat - 0.1, SC.curl[1] - 0.2, 0.25, 0.3); if (hs > 0) tag(c, ["HEAT STAYS IN"], 270, 130, hs, "#FFB84A", 3);
  // danger
  const dg = win(t, EV.check - 0.1, SC.danger[1] - 0.1, 0.25, 0.3); if (dg > 0) tag(c, ["CHECK FOR DANGER?"], 270, 150, dg, CC.Y, 3);
  const ut = win(t, EV.tested2 - 0.1, SC.danger[1] - 0.1, 0.25, 0.3); if (ut > 0) tag(c, ["NOT TESTED YET"], 270, 206, ut, CC.PK, 3);
  // vet
  const qq = win(t, EV.settle - 0.1, SC.vet[1] - 0.1, 0.25, 0.3); if (qq > 0) bubble(c, top[0], top[1] - 8, "?", qq);
  const vt = win(t, EV.ask - 0.1, SC.vet[1] - 0.05, 0.25, 0.3); if (vt > 0) tag(c, ["+ ASK A VET"], 270, 150, vt, CC.G, 3);
  const pn = win(t, EV.pain - 0.15, SC.vet[1] - 0.05, 0.25, 0.3); if (pn > 0) tag(c, ["MAYBE PAIN"], 270, 206, pn, CC.PK, 3);
}
function radar(c, t, G, a) {
  // a «look-around» sweep on the lawn around the dog: a bright wedge turning with the dog, plus a dotted ring
  const cx = G.X(0), cy = G.Y(-4), r = 128 * G.z, ry = 0.3, ang = ((t - EV.circling + 0.05) / 1.4) * Math.PI * 2, g = fade(c, a);
  for (let y = R(cy - r * ry); y < cy + r * ry; y++) for (let x = R(cx - r); x < cx + r; x++) {
    const dx = (x - cx) / r, dy = (y - cy) / (r * ry), d = Math.hypot(dx, dy); if (d > 1) continue; if (dy < 0 && Math.abs(dx) < 0.6) continue;                // the far half passes behind the dog
    let da = ang - Math.atan2(dy, dx); da = ((da % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const ring = Math.abs(d - 0.97) < 0.03 && ((x >> 1) & 1);
    const k = ring ? 0.9 : d > 0.6 && da < 1.2 ? (1 - da / 1.2) * 0.85 : 0;
    if (k > bayer(x, y)) g.px(x, y, ring ? "#9CFF7A" : mix(c.get(x, y), "#9CFF7A", 0.55));
  }
}
// Coren's study: 62 dogs; smooth mat 1 in 5 (19 %); shaggy rug more than half (55 %), some dug first
const ICON_G = (x, y, z) => ({ z, X: (wx) => x + wx * z, Y: (wy) => y + wy * z, wx: (sx) => (sx - x) / z, wy: (sy) => (sy - y) / z, p: 1 });
function study(c, t, G, P) {
  const s0 = SC.study[0];
  const head = win(t, EV.scientist - 0.1, EV.smooth - 0.6, 0.3, 0.3);
  if (head > 0) { tag(c, ["STANLEY COREN · 2016"], 270, 130, head, CC.IV, 3); const n = R(62 * sm(t, EV.sixtyTwo - 0.1, EV.dogs + 0.3)); label(c, `${n} DOGS`, 270, 186, Math.min(head, sm(t, EV.sixtyTwo - 0.15, EV.sixtyTwo + 0.1)), CC.Y, 4); }
  const groups = [
    { a: win(t, EV.smooth - 0.2, SC.study[1] - 0.1, 0.3, 0.4), x: G.X(MAT_X), n: 5, spin: 1, at: EV.one1 - 0.1, name: "SMOOTH", pct: "19%", note: "1 IN 5", noteAt: EV.five },
    { a: win(t, EV.shaggy - 0.2, SC.study[1] - 0.1, 0.3, 0.4), x: G.X(0), n: 10, spin: 6, at: EV.half - 0.3, name: "SHAGGY", pct: "55%", note: "MORE THAN HALF", noteAt: EV.half },
  ];
  for (const gp of groups) {
    if (gp.a <= 0) continue;
    const w = 216, x0 = gp.name === "SMOOTH" ? 28 : 296, y0 = 236, h = 178;
    panel(c, x0, y0, w, h, gp.a, gp.name === "SMOOTH" ? CC.IV : CC.Y);
    { const g = fade(c, gp.a); g.rect(x0 + 6, y0 + 38, w - 12, h - 44, "#A8D0EE"); g.rect(x0 + 6, y0 + 38 + R((h - 44) * 0.62), w - 12, R((h - 44) * 0.38), "#7CC46A"); }
    label(c, gp.name, x0 + w / 2, y0 + 8, gp.a, gp.name === "SMOOTH" ? CC.IV : CC.Y, 3);
    const cols = 5, cell = 40;
    for (let i = 0; i < gp.n; i++) {
      const cx = x0 + 14 + (i % cols) * cell + 4, cy = y0 + 104 + Math.floor(i / cols) * 58, spinning = i < gp.spin && t > gp.at + i * 0.08;
      const phi = spinning ? (t - gp.at - i * 0.08) / 0.9 : 0, pose = spinning ? spinPose(phi) : { turn: 0, back: 0 };
      drawDogSide(fade(c, gp.a), ICON_G(cx + 10, cy, 0.36), 0, 0, TC, { facing: 1, gait: spinning ? "walk" : "stand", phase: phi * 2, ...pose, ears: 0.8, blink: 0 });
      if (spinning) fade(c, gp.a).px(cx + 10, cy + 4, CC.Y);
    }
    const ka = Math.min(gp.a, sm(t, gp.noteAt - 0.1, gp.noteAt + 0.25)); if (ka > 0) { label(c, gp.pct, x0 + w / 2, y0 + h + 6, ka, gp.name === "SMOOTH" ? CC.IV : CC.Y, 4); label(c, gp.note, x0 + w / 2, y0 + h + 42, ka, CC.IV, 2); }
  }
  const dg = win(t, EV.dug - 0.1, EV.bumps - 0.1, 0.25, 0.3); if (dg > 0) tag(c, ["DIGS FIRST"], G.X(0), 130, dg, CC.Y, 3);
  const bm = win(t, EV.bumps - 0.1, SC.study[1] - 0.05, 0.25, 0.3); if (bm > 0) tag(c, ["BUMPS = MORE CIRCLES"], 270, 130, bm, CC.Y, 3);
}

await cli(frame, END, FPS, HERE);
