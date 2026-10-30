// «The last person alive» — Builder W: shot A, the dead town at dusk (side view, the camera follows him to the right).
//   drawTown(c, cam, t)       — everything behind the actors: dusk sky with a low sun and first stars, far and mid skylines,
//                               overgrown ruins, the street (facades, poles and wires, lamps, a bus shelter, rusty cars),
//                               the tally wall (≈ 300 scratched marks + "300", glinting on "three hundred days"), crows that
//                               take off as he passes, the road's end (fence, barrier), the forest, the far fire's glow + smoke.
//   drawTownFront(c, cam, t)  — the near curb and sidewalk in front of him: weeds, rubble, a toppled trash can, a broken
//                               pole stump, a fallen blank road sign; all in the bottom band, never above y 600 at his place.
// Static layers are drawn once into masked strips at the shot's fixed zoom and composited with parallax; the ground plane
// is a per-row strip (perspective rows) dithered in screen space. Everything that changes is a pure function of t.
import { mix, hex, bayer } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, sm, lerp, rnd, clamp01, ease, win, frac } from "./layout.mjs";
import { EV, SHOTS } from "./timeline.mjs";
import { TOWN, TALLY, EDGE } from "./places.mjs";
import { camTown, heroWalkX } from "./camera.mjs";
import { TOWN_GLOW } from "./light.mjs";
import { Strip, blit, vnoise, fbm, cell, band, pick, hash2, hash2s } from "./W-util.mjs";
import { SKY, CLOUD, painter, rimPass, farSkyline, midSkyline, ruinsLayer, townPine, deadTreeDraw, VINE, RIM, OUT, METAL, RUST, WOOD, PLAST, GLASS } from "./town-art.mjs";
import { building, billboard, lampPost, powerPole, wire, busShelter, hydrant, car, rubble, barrier, chainFence, tallyWall } from "./town-street.mjs";

const R = Math.round;
const BY = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map((r) => r.map((v) => (v + 0.5) / 16));
const bandF = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > BY[Y & 3][X & 3] ? fl + 1 : fl; };

// ---------------------------------------------------------------- floor palettes (dark → light)
const PAL = {
  dark: ["#0E0A16", "#141020", "#1A1428", "#211A30"],
  asph: ["#16121E", "#1E1828", "#262032", "#2F283C", "#383046", "#433A52", "#4E445E"],
  side: ["#211B2C", "#2A2336", "#342C42", "#3F364D", "#4A4058", "#564B64", "#645870"],
  curb: ["#1A1524", "#2A2336", "#3E354A", "#544A60", "#6A5E74", "#827488", "#9A8A9C"],
  near: ["#100C18", "#16111F", "#1C1726", "#231D2E", "#2B2436", "#342C40"],
  mark: ["#3A3240", "#5A4E50", "#7A6A5E", "#9A866C", "#B49C7A"],
  grass: ["#0C1012", "#121A18", "#18241E", "#203024", "#2A3C2A", "#384A30", "#4A5A36"],
  forest: ["#0A0910", "#0F0D16", "#14121C", "#1A1722", "#22202A"],
  ffloor: ["#0A080E", "#100C14", "#17111A", "#1F1720", "#281E28", "#322530"],
  dirt: ["#140E14", "#1E151A", "#2A1D20", "#382628", "#463030", "#563C38"],
  dust: ["#1E1824", "#28202C", "#342A34", "#40343C", "#4C3E44"],
  leaf: ["#2A1418", "#3E1C1C", "#562A22", "#70382A", "#8A4A30"],
  sky: SKY.map((c) => mix(c, "#2A2236", 0.38)),
};
const PNAMES = Object.keys(PAL), PID = Object.fromEntries(PNAMES.map((k, i) => [k, i])), PRGB = PNAMES.map((k) => PAL[k].map(hex));

// ---------------------------------------------------------------- the cache (one per fixed camera zoom)
let C = null;
function cache(cam) {
  const key = `${cam.z}|${cam.cy}|${cam.sx}|${cam.sy}`;
  if (!C || C.key !== key) C = build(cam, key);
  return C;
}

function build(cam, key) {
  const Z = cam.z, CY = cam.cy, SX = cam.sx, SY = cam.sy;
  const zp = (p) => 1 + (Z - 1) * p, gy = (p) => SY - CY * p * zp(p);
  const tEnd = SHOTS[0][2];
  let CX0 = Infinity, CX1 = -Infinity; for (let t = -0.4; t <= tEnd + 0.4; t += 0.02) { const c = camTown(t); CX0 = Math.min(CX0, c.cx); CX1 = Math.max(CX1, c.cx); }
  const camEnd = camTown(tEnd);
  // where the forest starts in each layer: lined up on screen at the end of the shot (deeper layers a little further right)
  const XE = SX + (EDGE.x0 + 50 - camEnd.cx) * Z;
  const WB = (p) => camEnd.cx * p + (XE + (1 - p) * 130 - SX) / zp(p);
  const endX = (p, wx) => SX + (wx - camEnd.cx * p) * zp(p);            // screen x of a layer point at the end of the shot
  const range = (p) => [CX0 * p - SX / zp(p) - 12, CX1 * p + (GW - SX) / zp(p) + 12];
  const glowX = 398, glowP = 0.55;
  const mk = (p, ya, yb) => { const z = zp(p), [w0, w1] = range(p); return { p, z, W0: w0, W1: w1, SY, CY, s: new Strip(Math.ceil((w1 - w0) * z) + 2, Math.max(0, R(ya)), Math.min(GH, R(yb)) - Math.max(0, R(ya))) }; };
  const L = {};

  // ---- sky (static, screen space)
  const SUN = { x: 104, y: 246, r: 27 };
  const sky = new Strip(GW, 0, SY + 30), skyIdx = new Float32Array(GW * (SY + 30));
  const glowAt = (X, Y) => 4.4 * Math.exp(-((X - SUN.x) ** 2 + ((Y - SUN.y) * 1.5) ** 2) / (2 * 58 * 58)) + 1.8 * Math.exp(-((X - SUN.x) ** 2 * 0.35 + ((Y - SUN.y) * 2.4) ** 2) / (2 * 190 * 190));
  for (let Y = 0; Y < SY + 30; Y++) for (let X = 0; X < GW; X++) {
    const u = 11.4 * Math.pow(clamp01(Y / (SY - 4)), 1.5) + glowAt(X, Y);
    skyIdx[Y * GW + X] = u;
    sky.px(X, Y, pick(SKY, bandF(Math.min(15.4, u), X, Y)));
  }
  for (let Y = SUN.y - SUN.r - 1; Y <= SUN.y + SUN.r + 1; Y++) for (let X = SUN.x - SUN.r - 1; X <= SUN.x + SUN.r + 1; X++) {
    const d = Math.hypot(X - SUN.x, (Y - SUN.y) * 1.04); if (d > SUN.r + 0.3) continue;
    sky.px(X, Y, d > SUN.r - 3 ? "#FCC86C" : d > SUN.r - 9 ? "#FFE09A" : "#FFF3CC");
  }
  // long dusk clouds: dark violet tops, undersides lit pink-orange (hot near the sun), drifting streaks across it
  const CL = [[86, -60, 260, 6], [122, 150, 600, 8], [168, -40, 250, 10], [204, 250, 600, 8], [262, -40, 330, 7], [292, 200, 600, 11], [330, -40, 230, 5], [356, 290, 600, 6], [398, -40, 300, 6]];
  const cloudMask = new Uint8Array(GW * (SY + 30));
  CL.forEach(([cy0, xa, xb, th], i) => {
    for (let Y = Math.max(0, cy0 - th * 3); Y < Math.min(SY + 30, cy0 + th * 3); Y++) for (let X = 0; X < GW; X++) {
      if (X < xa - 40 || X > xb + 40) continue;
      const env = Math.min(clamp01((X - xa + 40) / 90), clamp01((xb + 40 - X) / 90));
      const yc = cy0 + 3 * Math.sin(X * 0.007 + i * 1.7) + 1.5 * Math.sin(X * 0.019 + i), thick = th * (0.4 + 1.1 * vnoise(X * 0.014, i * 3.1)) * env;
      const dv = (Y - yc) / Math.max(0.5, thick); if (Math.abs(dv) > 1.25) continue;
      const den = (1 - dv * dv) * env + (fbm(X * 0.03 + i * 9, Y * 0.16 + i) - 0.5) * 0.7;
      if (den < 0.35) continue;
      const v = (dv + 1) / 2, base = skyIdx[Y * GW + X] * 0.82;
      let tone = base - 1.6 + v * 3.2 + glowAt(X, Y) * 0.35;
      if (den < 0.45 && dv < 0) tone -= 0.6;
      sky.px(X, Y, pick(CLOUD, bandF(Math.max(0, Math.min(11, tone * 0.78)), X, Y)));
      cloudMask[Y * GW + X] = 1;
    }
  });
  const stars = [];
  for (let i = 0; i < 110; i++) { const X = R(rnd(i * 3 + 101) * (GW - 1)), Y = R(Math.pow(rnd(i * 3 + 102), 1.7) * 235); if (skyIdx[Y * GW + X] > 5.2 || cloudMask[Y * GW + X]) continue; stars.push({ X, Y, b: 0.35 + 0.65 * rnd(i * 3 + 103) * (1 - Y / 260), f: 1.3 + rnd(i * 7) * 2.6, ph: rnd(i * 11) * 6.28, big: rnd(i * 13) > 0.9 }); }

  // ---- far and mid skylines, ruins
  // the city stays whole in the opening frames; past it (seen only near the end) a hazy treeline
  const cityEnd = (p) => CX0 * p + (GW + 10 - SX) / zp(p);
  const treeline = (Ly, from, body, lit, hMin, hMax, seed0) => { const P = painter(Ly), col = { body, lit, dark: mix(body, "#000000", 0.2), clump: mix(body, "#000000", 0.1), trunk: body, trunkLit: lit };
    for (let x = from, i = 0; x < Ly.W1 + 20; x += 7 + rnd(seed0 + i) * 12, i++) { const H = hMin + rnd(seed0 + i * 3) * (hMax - hMin); townPine(P, x, seed0 + i * 5, H, H * 0.42, col, 0.08); } };
  L.far = mk(0.12, 0, gy(0.12) + 2); farSkyline(L.far, L.far.W0, cityEnd(0.12)); treeline(L.far, cityEnd(0.12) + 6, "#3D2552", "#59325F", 50, 110, 4000);
  L.mid = mk(0.27, 0, gy(0.27) + 2); midSkyline(L.mid, L.mid.W0, cityEnd(0.27)); treeline(L.mid, cityEnd(0.27) + 6, "#25173D", "#3A2550", 90, 170, 4100);
  L.ruin = mk(0.42, 0, gy(0.42) + 2); ruinsLayer(L.ruin, L.ruin.W0, WB(0.42) - 30);

  // ---- the forest at the end of the road: layered pines (dusk silhouettes, a muted sunset rim), a gap around the glow
  const forestCol = (p) => { const k = Math.pow(clamp01((p - 0.42) / 0.58), 0.6), body = mix("#261B38", "#0B0912", k);
    return { body, lit: mix(mix(body, "#7A4060", 0.35), "#5A2C3E", k), dark: mix(body, "#04030A", 0.5), clump: mix(body, "#04030A", 0.25), trunk: mix("#30223A", "#130D18", k), trunkLit: mix("#4A2E48", "#4A2634", k), fog: mix("#4A3058", "#2A1C36", k) }; };
  const forest = (Ly, from, density, hMin, hMax, wMul, bare, seed0, gapW = 0) => {
    const P = painter(Ly), fc = forestCol(Ly.p); let x = from, i = 0;
    while (x < Ly.W1 + 40) {
      const H = hMin + rnd(seed0 + i * 7) * (hMax - hMin), W = H * wMul * (0.8 + 0.4 * rnd(seed0 + i * 7 + 1)), ex = endX(Ly.p, x);
      if (!(gapW && Math.abs(ex - glowX) < gapW + W * Ly.z * 0.45)) {
        if (rnd(seed0 + i * 7 + 2) > 0.9) deadTreeDraw(P, x, seed0 + i, H * 0.62, fc.trunk); else townPine(P, x, seed0 + i * 13, H, W * 1.15, { ...fc, lit: mix(fc.body, fc.lit, Ly.p > 0.6 ? 0.55 : 0.3) }, bare, Ly.p >= 0.6);
      }
      x += density * (0.55 + 0.9 * rnd(seed0 + i * 7 + 3)); i++;
    }
    // the sunset rim only on the layer's outer silhouette (left and top edges against the sky)
    rimPass(P.g, fc.lit, mix(fc.body, fc.lit, 0.6), 1, (X) => X >= Math.round(P.X(from - 40)));
    // low ground fog between the trunks (dusk haze), dithered over the lowest rows of the layer
    const g = P.g, gy0 = Math.round(P.Y(0)), fh = 34 * Ly.z * (1.2 - Ly.p * 0.6), x0 = Math.max(0, Math.round(P.X(from))), fcol = hex(fc.fog);
    for (let Y = Math.round(gy0 - fh); Y <= gy0; Y++) for (let X = x0; X < g.w; X++) { if (!g.has(X, Y)) continue; const k = (Y - (gy0 - fh)) / fh * (0.55 + 0.45 * vnoise(X * 0.03, Y * 0.05)); if (k * 0.7 > BY[Y & 3][X & 3]) { const q = g.get(X, Y); g.px(X, Y, [R(q[0] + (fcol[0] - q[0]) * 0.5), R(q[1] + (fcol[1] - q[1]) * 0.5), R(q[2] + (fcol[2] - q[2]) * 0.5)]); } }
  };
  forest(L.ruin, WB(0.42) - 20, 30, 230, 330, 0.34, 0.2, 400);
  L.f52 = mk(0.52, 0, gy(0.52) + 2); forest(L.f52, WB(0.52), 34, 280, 400, 0.32, 0.28, 500);

  // ---- the street: facades (p 0.66)
  L.fac = mk(0.66, 0, gy(0.66) + 2);
  const wb66 = WB(0.66), fx0 = L.fac.W0 - 10;
  const B = [
    { x0: fx0, x1: fx0 + 128, h: 196, mat: "brick", storeys: 1, ground: "shutter", awning: true, wins: 0.5, roof: "flat", vines: 0.6, seed: 11, rim: true, ac: false },
    { x0: fx0 + 238, x1: fx0 + 362, h: 186, mat: "brick", storeys: 1, ground: "shop", wins: 0.2, roof: "collapsed", vines: 0.9, seed: 37, rim: true },
    { x0: fx0 + 374, x1: fx0 + 498, h: 350, mat: "plaster", storeys: 2, ground: "shop", awning: true, wins: 0.35, roof: "flat", vines: 0.5, seed: 23, rim: true, escape: true, ac: true },
    { x0: fx0 + 506, x1: fx0 + 616, h: 326, mat: "brick", storeys: 2, ground: "door", wins: 0.7, roof: "parapet", vines: 1.0, seed: 41, rim: true, sign: true, ac: true },
  ];
  for (const b of B) if (b.x0 < wb66 - 20) building(L.fac, { ...b, x1: Math.min(b.x1, wb66 + 10) });
  billboard(L.fac, fx0 + 146, 82, 112, 50, 5);
  { // a ruined shell where the town gives way to the forest: broken wall stubs and saplings
    const P = painter(L.fac); const a = R(P.X(fx0 + 622)), b = R(P.X(wb66 + 30)), gy0 = R(P.Y(0));
    for (let X = a; X < b; X++) { const h = R((60 + 50 * Math.abs(Math.sin(X * 0.05)) + rnd(X) * 12) * P.z * (1 - 0.6 * (X - a) / (b - a))); for (let Y = gy0 - h; Y < gy0; Y++) P.g.px(X, Y, pick(PLAST, bandF(2.2 + (fbm(X * 0.08, Y * 0.08) - 0.5) * 1.4 - (Y > gy0 - 6 ? 1 : 0), X, Y))); }
    rimPass(P.g, RIM[1], RIM[0], 1, (X, Y) => X >= a && X < b);
  }
  forest(L.fac, wb66 + 8, 40, 340, 470, 0.3, 0.36, 600, 46);

  // ---- poles and wires (p 0.76), lamps and a bus shelter (p 0.8)
  L.pole = mk(0.76, 0, gy(0.76) + 2);
  const poles = []; for (let x = L.pole.W0 + 30; x < WB(0.76) - 30; x += 205) poles.push(powerPole(L.pole, x, 236));
  const wires = [];
  for (let i = 0; i + 1 < poles.length; i++) for (const k of [0, 1]) { const y = poles[i].arms[k], yb = poles[i + 1].arms[k]; wires.push({ xa: poles[i].x, xb: poles[i + 1].x, f: wire(L.pole, poles[i].x + (k ? 14 : -14), y, poles[i + 1].x + (k ? 14 : -14), yb, 16 + k * 4) }); }
  if (poles.length) { const last = poles[poles.length - 1]; wire(L.pole, last.x + 14, last.arms[1], last.x + 70, -20, 6, "#140F1C"); }
  forest(L.pole, WB(0.76) + 4, 48, 400, 520, 0.28, 0.4, 700, 40);
  L.side = mk(0.8, 0, gy(0.8) + 2);
  lampPost(L.side, L.side.W0 + 120, 228, 1, 0); lampPost(L.side, L.side.W0 + 470, 222, 2, 0.06);
  busShelter(L.side, L.side.W0 + 285, 3);
  forest(L.side, WB(0.8) + 10, 56, 460, 600, 0.26, 0.44, 800, 42);

  // ---- cars, a hydrant, rubble along the far curb (p 0.86)
  L.car = mk(0.86, 0, gy(0.86) + 2);
  car(L.car, L.car.W0 + 40, 232, 1, ["#141820", "#1E2430", "#2A3240", "#384252", "#485466", "#5C687A", "#74808E"], 1);
  car(L.car, L.car.W0 + 520, 222, 2, ["#1E1018", "#2C1620", "#3E1E28", "#522832", "#66343A", "#7C4446", "#925652"], -1);
  hydrant(L.car, L.car.W0 + 320);
  rubble(L.car, L.car.W0 + 360, 70, 22, 4); rubble(L.car, L.car.W0 + 780, 60, 18, 5);
  forest(L.car, WB(0.86) + 30, 70, 480, 640, 0.25, 0.46, 900, 44);

  // ---- the road's end (p 0.93): barrier, fence, first trees
  L.end = mk(0.93, 0, gy(0.93) + 2);
  chainFence(L.end, WB(0.93) - 120, WB(0.93) + 10, 86, 3, WB(0.93) - 70, WB(0.93) - 40);
  barrier(L.end, WB(0.93) - 210, 92, 7);
  rubble(L.end, L.end.W0 + 120, 46, 14, 8);
  forest(L.end, WB(0.93) + 30, 86, 520, 700, 0.22, 0.5, 1000, 50);

  // ---- the tally wall (p = 1) and the nearest trees
  L.wall = mk(1, 0, gy(1) + 2);
  const scratches = tallyWall(L.wall, TALLY, 9);
  rubble(L.wall, TALLY.x1 + 8, 44, 12, 12);
  forest(L.wall, WB(1) + 60, 120, 600, 760, 0.2, 0.55, 1100, 56);

  // ---- crows (dynamic): perched on real things; each takes off when he comes within ~95 px on screen
  const wireY = (wx) => { for (const w of wires) if (wx >= w.xa + 20 && wx <= w.xb - 20) return w.f(wx); return null; };
  const perches = [{ p: 1, x: TALLY.x0 + 30, wy: scratches.topAt(TALLY.x0 + 30), dir: 1 }];
  for (const [k, d] of [[0.3, -1], [0.55, 1], [0.8, 1]]) { const w = wires[Math.min(wires.length - 1, Math.floor(k * wires.length))]; if (!w) continue; const x = lerp(w.xa + 30, w.xb - 30, frac(k * 3.7)), y = wireY(x); if (y !== null) perches.push({ p: 0.76, x, wy: y, dir: d }); }
  perches.push({ p: 0.86, x: L.car.W0 + 520 + 222 - 110 * 222 / 230, wy: -84 * 222 / 230, dir: -1 });
  perches.push({ p: 0.93, x: WB(0.93) - 100, wy: -86, dir: 1 });
  const crows = perches.map((c) => {
    let t0 = Infinity; for (let t = 0; t < tEnd + 0.5; t += 1 / 60) { const cam2 = camTown(t), X = SX + (c.x - cam2.cx * c.p) * zp(c.p), hx = SX + (heroWalkX(t) - cam2.cx) * Z; if (X - hx < 95 && X - hx > -60) { t0 = t; break; } }
    return { ...c, t0 };
  });

  // ---- the ground: perspective rows (p per row), texel = palette + tone, dithered per frame in screen space
  const DZ = 1150, a2 = -(Z - 1) * CY, b2 = -CY;
  const pRow = (Y) => (-b2 + Math.sqrt(b2 * b2 + 4 * a2 * (Y - SY))) / (2 * a2);
  const carShadow = [[L.car.W0 + 40, L.car.W0 + 272], [L.car.W0 + 520, L.car.W0 + 742]];
  const puddles = [[70, 1.06, 58, 0.03], [470, 1.3, 70, 0.05], [-90, 1.22, 40, 0.035], [640, 1.1, 46, 0.03], [270, 1.43, 64, 0.04], [860, 1.2, 50, 0.04], [1080, 1.35, 60, 0.05]];
  // a trail continues from the road's end into the forest, toward the far glow (lined up at the end of the shot)
  const trailX = (p) => camEnd.cx * p + (lerp(250, glowX, clamp01((1.02 - p) / (1.02 - glowP))) - SX) / zp(p);
  const rows = [];
  for (let Y = SY + 1; Y < GH; Y++) {
    const p = pRow(Y + 0.5), z = zp(p), [w0, w1] = range(p), n = Math.ceil((w1 - w0) * z) + 2;
    const pal = new Uint8Array(n), tone = new Float32Array(n), wz = DZ / p;
    const edge = WB(Math.min(1.25, p)) + 10, tx = trailX(p), mirror = Math.max(0, Math.min(SY + 29, R(SY - 20 - (Y - SY) * 0.3)));
    for (let i = 0; i < n; i++) {
      const lx = w0 + i / z, wx = lx / p; let P = "asph", v = 3;   // lx: layer coordinate (parallax), wx: real-world x on the ground
      const grain = (hash2s(Math.floor(wx * 1.6), Math.floor(wz * 0.5)) - 0.5) * 0.6, speck = hash2s(Math.floor(wx * 1.1), Math.floor(wz * 0.45)) * (0.9 + 0.1 * vnoise(wx * 0.05, wz * 0.02));
      if (p < 0.7) { P = "dark"; v = 1.2 + (fbm(wx * 0.05, wz * 0.01) - 0.5) * 1.5; }
      else if (p < 0.745) { P = "dark"; v = 2.2 + grain; }
      else if (p < 0.826) {
        P = "side"; v = 3.3 - (p - 0.745) * 9 + (fbm(wx * 0.03, wz * 0.02) - 0.5) * 1.2 + grain * 0.5;
        if (frac(wx / 36) < 0.035 || Math.abs(p - 0.786) < 0.0025) v -= 1.6;
        if (fbm(wx * 0.06 + 5, wz * 0.03) > 0.64) { P = "grass"; v = 2.4 + grain * 2; }
      } else if (p < 0.846) { P = "curb"; v = p < 0.834 ? 4.6 + grain * 0.6 : 1.8 + grain; if (frac(wx / 50) < 0.02) v -= 1.5; }
      else if (p < 1.5) {
        v = 3.5 - (p - 0.85) * 2.2 + (fbm(wx * 0.02, wz * 0.008) - 0.5) * 1.5 + grain;
        if (fbm(wx * 0.008 + 40, wz * 0.004) > 0.62) v -= 0.8;                                    // old repairs
        const [f1, f2] = cell(wx / 74, wz / 100); if (f2 - f1 < 0.028 && fbm(wx * 0.012 + 3, wz * 0.006) > 0.42) v = 0.6;
        for (const pc of [0.965, 1.31]) if (Math.abs(p - pc - 0.014 * (vnoise(wx * 0.02, pc * 10) - 0.5)) < 0.0016 * p && fbm(wx * 0.008, pc * 7) > 0.42) v = 0.6;
        if (Math.abs(p - 1.172) < 0.011 && frac(wx / 124) < 0.44 && fbm(wx * 0.15, wz * 0.08) > 0.3) { P = "mark"; v = 2.7 + grain; }
        for (const off of [0, 0.034]) { const sc = 1.25 + off + 0.025 * Math.sin((wx - 150) * 0.011); if (wx > 90 && wx < 520 && Math.abs(p - sc) < 0.0035) v -= 1.3 * Math.min(1, (wx - 90) / 60, (520 - wx) / 120); }
        if (p < 0.86 && frac(wx / 9) < 0.5) v -= 0.8;                                             // the gutter
        if ((p < 0.9 || p > 1.42) && fbm(wx * 0.05 + 2, wz * 0.03) > 0.55) { P = "dust"; v = 2 + (fbm(wx * 0.2, wz * 0.1) - 0.5) * 2 + grain; }
        if (speck > 0.993) { P = "leaf"; v = 1 + (speck - 0.993) * 400; }
      } else if (p < 1.53) { P = "curb"; v = p < 1.515 ? 4.0 + grain * 0.5 : 1.4; if (frac(wx / 60) < 0.02) v -= 1.5; }
      else {
        P = "near"; v = 2.9 - (p - 1.53) * 0.9 + (fbm(wx * 0.025, wz * 0.03) - 0.5) * 1.2 + grain * 0.6;
        const fx = frac(wx / 52 + Math.floor(wz / 44) * 0.37), fz = frac(wz / 44);
        if (fx < 0.03 || fz < 0.05) v -= 1.5; else if (fz < 0.11) v += 0.7;                   // slab joints, lit lifted edges
        const [f1, f2] = cell(wx / 40, wz / 34); if (f2 - f1 < 0.035 && fbm(wx * 0.02, wz * 0.02) > 0.4) v -= 1.4;
        if ((fx < 0.07 || fz < 0.1) && fbm(wx * 0.04, wz * 0.05 + 3) > 0.45) { P = "grass"; const st = hash2s(Math.floor(wx * z / 4 + Y * 0.37), Y); v = 1.6 + (st > 0.8 ? 1.2 : 0) + grain; }
        else if (fbm(wx * 0.02 + 19, wz * 0.03 + 4) > 0.6) { P = "dust"; v = 1.2 + grain * 2; }
        if (speck > 0.99) { P = "leaf"; v = (speck - 0.99) * 400; }
      }
      // long dusk shadows to the right of the cars and the wall
      if (p > 0.83 && p < 0.9) for (const [a, b] of carShadow) if (lx > a + 30 && lx < b + 170) { const k = lx < b ? 1 : 1 - (lx - b) / 170; if (k > 0.25 + 0.3 * frac(lx * 0.05)) v -= 1.1 * k; }
      if (p > 0.97 && p < 1.035 && lx > TALLY.x1 + 15 && lx < TALLY.x1 + 160) v -= 1.0 * (1 - (lx - TALLY.x1 - 15) / 145);
      // puddles: a mirror of the bright low sky, a dark wet rim
      for (const [px, pp, rx, rp] of puddles) { const d = ((wx - px / pp) / (rx / pp)) ** 2 + ((p - pp) / rp) ** 2 + (vnoise(wx * 0.08, p * 60) - 0.5) * 0.6; if (d < 1.15 && p > 0.86 && p < 1.5 && lx < edge - 30) { if (d > 0.85) { P = "asph"; v = 0.8; break; } const u = clamp01((p - (pp - rp)) / (2 * rp)); if (u < 0.28 + 0.12 * vnoise(wx * 0.06, pp * 9)) { P = "dark"; v = 2.6; break; } P = "sky"; v = lerp(9.4, 4.6, (u - 0.28) / 0.72) - (frac(wx / 37 + u * 3) < 0.08 ? 1.5 : 0); break; } }
      // the road gives way to dirt and the forest floor; a trail leads on toward the glow
      if (lx > edge + (vnoise(p * 30, 7) - 0.5) * 60) {
        const k = (lx - edge) / 80;
        if (k > 1 || fbm(wx * 0.1, wz * 0.05) < k) {
          P = "grass"; v = 2.0 - clamp01((p - 0.9) * 0.9) + (fbm(wx * 0.03, wz * 0.02) - 0.5) * 0.9;
          const st = hash2s(Math.floor(wx * z / 5 + Y * 0.37), Y); if (st > 0.86) v += 1.1; else if (st < 0.1) v -= 0.9;      // short grass strokes
          if (fbm(wx * 0.04 + 7, wz * 0.03) > 0.62) { P = "ffloor"; v = 1.6 + grain * 1.5 + (st > 0.9 ? 1 : 0); }
          const dt = Math.abs(lx - tx) / (18 + 30 * Math.max(0, p - 0.55)); if (dt < 1 && p < 1.08) { P = "dirt"; v = 2.6 - dt * 1.4 + grain + (fbm(wx * 0.2, wz * 0.1) - 0.5); }
          if (speck > 0.992) { P = "leaf"; v = (speck - 0.992) * 400; }
        } else v -= 0.5;
      }
      if (p > 1.5 && P !== "sky") v -= (p - 1.5) * 0.9;
      pal[i] = PID[P]; tone[i] = v;
    }
    rows.push({ Y, p, z, w0, n, pal, tone });
  }

  // ---- front layers (p > 1)
  const F = {};
  F.sign = mk(1.04, gy(1.04) - 40, gy(1.04) + 4);
  { const P = painter(F.sign), x = WB(1.04) - 40, gy0 = R(P.Y(0)), a = R(P.X(x)), len = R(70 * P.z);
    for (let i = 0; i < len; i++) { const X = a + i, Y = gy0 - 2 - R(i * 0.08); P.g.px(X, Y, METAL[2]); P.g.px(X, Y - 1, METAL[3]); P.g.px(X, Y + 1, OUT); }
    const sx = a + len - 4, sy = gy0 - R(6 * P.z), sw = R(36 * P.z), sh = R(24 * P.z);
    P.g.poly([[sx, sy], [sx + sw, sy - 4], [sx + sw + 3, sy + sh - 6], [sx + 2, sy + sh - 1]], "#4A4658", (X, Y) => { const r = fbm(X * 0.12, Y * 0.12); return r > 0.6 ? pick(RUST, bandF(2.4 + (r - 0.6) * 6, X, Y)) : pick(["#2A2634", "#363242", "#433E50", "#524C5E", "#625A6C"], bandF(2.2 + (fbm(X * 0.2, Y * 0.2) - 0.5) * 1.6 - (Y - sy) / sh * 0.8, X, Y)); });
    P.g.outline(OUT); P.g.line(sx, sy, sx + sw, sy - 4, RIM[1]);
    rubble(F.sign, x - 40, 40, 8, 21);
  }
  F.curb = mk(1.52, gy(1.52) - 70, gy(1.52) + 4);
  F.mid = mk(1.78, gy(1.78) - 150, gy(1.78) + 6);
  F.pole = mk(2.15, gy(2.15) - 200, Math.min(GH, gy(2.15) + 6));
  F.bot = mk(2.5, gy(1.9), GH);
  // grass clumps: curved blades, dark at the base, lit tips (a warm rim on the sun side), some dry; ferns: arching fronds
  const GRASSC = { base: "#0C1210", mid: "#1A2A20", hi: "#2E4430", tip: "#4A6038", dry: "#7A6E44", rim: "#8A5A44" };
  const clump = (Ly, x, h, seed, k = 1) => { const P = painter(Ly), gy0 = R(P.Y(0)), X0 = P.X(x), n = 6 + R(rnd(seed) * 9), w = h * 0.5;
    for (let b = 0; b < n; b++) {
      const bx = X0 + (rnd(seed * 7 + b) - 0.5) * w * P.z, hh = h * (0.45 + 0.55 * rnd(seed * 11 + b)) * P.z, bend = (rnd(seed * 13 + b) - 0.5) * 0.9 + (bx - X0) / (w * P.z + 1) * 0.5, dry = rnd(seed * 17 + b) > 0.82;
      const steps = Math.ceil(hh);
      for (let i = 0; i < steps; i++) { const u = i / steps, X = R(bx + bend * hh * u * u), Y = gy0 - i, thick = u < 0.35 ? 2 : 1;
        const col = u > 0.82 ? (dry ? GRASSC.dry : GRASSC.tip) : u > 0.5 ? (dry ? "#4E4630" : GRASSC.hi) : u > 0.2 ? GRASSC.mid : GRASSC.base;
        P.g.px(X, Y, k < 1 ? mix(col, "#05040A", 1 - k) : col); if (thick === 2) P.g.px(X + 1, Y, k < 1 ? mix(GRASSC.base, "#05040A", 1 - k) : GRASSC.base);
        if (u > 0.45 && bend < 0.1 && rnd(b * 31 + i) > 0.4) P.g.px(X - 1, Y, k < 1 ? mix(GRASSC.rim, "#05040A", 1 - k) : GRASSC.rim); }
      if (dry && rnd(seed * 19 + b) > 0.5) { const tx = R(bx + bend * hh), ty = gy0 - steps; P.g.px(tx, ty - 1, "#9A8A58"); P.g.px(tx - 1, ty, "#7A6E44"); P.g.px(tx + 1, ty, "#7A6E44"); }
    } };
  const fern = (Ly, x, h, seed) => { const P = painter(Ly), gy0 = R(P.Y(0)), X0 = P.X(x), n = 5 + R(rnd(seed) * 3);
    for (let f = 0; f < n; f++) { const dir = f % 2 ? 1 : -1, ang = (0.35 + 0.9 * (f / n)) * dir, len = h * P.z * (0.6 + 0.4 * rnd(seed + f)), steps = Math.ceil(len);
      for (let i = 0; i < steps; i++) { const u = i / steps, a = ang * (0.4 + u * 1.1), X = R(X0 + Math.sin(a) * len * u), Y = R(gy0 - Math.cos(a) * len * u * (1 - 0.35 * u));
        P.g.px(X, Y, GRASSC.mid); if (i % 3 === 0 && u > 0.1) { const lf = Math.max(1, R((1 - u) * 5 * P.z / 2)); for (let j = 1; j <= lf; j++) { P.g.px(X - j, Y + (j >> 1), j === lf ? GRASSC.tip : GRASSC.hi); P.g.px(X + j, Y + (j >> 1), GRASSC.mid); } } } } };
  const fwd = (Ly, tAt, X) => camTown(tAt).cx * Ly.p + (X - SX) / Ly.z;    // layer x that sits at screen X at time tAt
  { // weeds along the near curb, some rubble
    for (let x = F.curb.W0 + 8, i = 0; x < F.curb.W1; x += 10 + rnd(i * 5) * 34, i++) clump(F.curb, x, 10 + rnd(i * 3) * 16, 300 + i);
    for (let x = F.curb.W0 + 50, i = 0; x < F.curb.W1; x += 140 + rnd(i * 9) * 160, i++) rubble(F.curb, x, 18 + rnd(i) * 22, 6, 40 + i);
  }
  { // the toppled trash can and spilled bags (passes under him around "three hundred days"), bricks, clumps
    const P = painter(F.mid), x = fwd(F.mid, 3.3, 360), gy0 = R(P.Y(0)), a = R(P.X(x)), w = R(30 * P.z), h = R(22 * P.z);
    for (let Y = gy0 - h; Y < gy0; Y++) for (let X = a; X < a + w; X++) { const v = (Y - (gy0 - h)) / h; P.g.px(X, Y, ((X - a) % 6 < 1) ? METAL[1] : pick(METAL, bandF(3.6 - Math.abs(v - 0.35) * 5 + (fbm(X * 0.2, Y * 0.2) - 0.5), X, Y))); }
    P.g.ellipse(a + w, gy0 - (h >> 1), 4, h >> 1, METAL[0]); P.g.ellipse(a + w, gy0 - (h >> 1), 2, (h >> 1) - 2, "#07050C");
    P.g.ellipse(a - 6, gy0 - 3, 7, 3, METAL[4]); P.g.line(a - 12, gy0 - 3, a, gy0 - 4, METAL[5]);
    for (let k = 0; k < 3; k++) { const bx = a + w + 12 + k * 15, br = R((9 + rnd(k) * 4) * P.z * 0.6); P.g.ellipse(bx, gy0 - br + 1, br + 2, br, "#141018"); P.g.ellipse(bx - 2, gy0 - br - 1, br - 2, br - 3, "#221C2A"); P.g.px(bx - 3, gy0 - 2 * br + 2, "#5A5268"); }
    for (let k = 0; k < 8; k++) { const px2 = a + w + 4 + R(rnd(k * 3 + 1) * 70), py = gy0 - 1 - R(rnd(k * 3 + 2) * 3); P.g.rect(px2, py, 3, 2, k % 3 ? "#6A6070" : "#5A3A2E"); }
    P.g.outline(OUT, (X, Y) => Y < gy0); for (let X = a; X < a + w; X++) P.g.px(X, gy0 - h, RIM[1]);
    for (let x2 = F.mid.W0 + 20, i = 0; x2 < F.mid.W1; x2 += 34 + rnd(i * 7 + 2) * 70, i++) { if (Math.abs(x2 - x) < 70) continue; if (rnd(i * 3 + 7) > 0.72) rubble(F.mid, x2, 20 + rnd(i) * 30, 9, 60 + i, PLAST); else clump(F.mid, x2, 18 + rnd(i * 5) * 18, 500 + i, 0.85); }
  }
  { // the snapped concrete pole (passes around "human voice"), clumps
    const P = painter(F.pole), x = fwd(F.pole, 5.0, 330), gy0 = R(P.Y(0)), X = R(P.X(x)), h = R(62 * P.z), w = R(9 * P.z);
    for (let Y = gy0 - h; Y < gy0; Y++) for (let k = 0; k < w; k++) P.g.px(X + k, Y, pick(PLAST, bandF(1.4 + (k < 2 ? 2 : 0) - k / w + (fbm(k * 0.3, Y * 0.1) - 0.5) * 1.2, X + k, Y)));
    for (let k = 0; k < w + 2; k++) for (let j = 0; j < 4 + (k * 7) % 5; j++) P.g.erase(X + k, gy0 - h + j);
    for (let k = 0; k < 3; k++) { const rx = X + 2 + k * 3; for (let j = 0; j < 10 + k * 5; j++) P.g.px(rx + R(j * 0.3 * (k - 1)), gy0 - h + 2 - j, RUST[2]); }
    P.g.outline(OUT); rubble(F.pole, x + 14, 40, 8, 77);
    for (let x2 = F.pole.W0 + 10, i = 0; x2 < F.pole.W1; x2 += 26 + rnd(i * 3) * 50, i++) if (Math.abs(x2 - x) > 30) { if (rnd(i * 13 + 5) > 0.85) fern(F.pole, x2, 26 + rnd(i) * 14, 800 + i); else clump(F.pole, x2, 16 + rnd(i * 11) * 22, 700 + i, 0.7); }
  }
  { // the bottom edge: a dense line of dark grass clumps and ferns, silhouettes with lit tips
    for (let x2 = F.bot.W0, i = 0; x2 < F.bot.W1; x2 += 7 + rnd(i * 3) * 16, i++) { if (rnd(i * 17 + 3) > 0.9) fern(F.bot, x2, 30 + rnd(i) * 18, 1900 + i); else clump(F.bot, x2, 20 + rnd(i * 7) * 30, 900 + i, 0.55); }
  }
  // the near-forest end: ferns and tall grass in front (beyond the road)
  for (const Ly of [F.curb, F.mid, F.pole, F.bot]) for (let x2 = WB(Ly.p) + 10, i = 0; x2 < Ly.W1; x2 += 14 + rnd(i * 5 + Ly.p * 100) * 22, i++) { if (rnd(i * 7 + R(Ly.p * 50)) > 0.7) fern(Ly, x2, 24 + rnd(i * 3) * 20, 2000 + i + R(Ly.p * 100)); else clump(Ly, x2, 20 + rnd(i * 3) * 26, 3000 + i + R(Ly.p * 100), Ly.p > 2 ? 0.55 : 0.8); }

  return { key, Z, CY, SX, SY, zp, gy, WB, sky, stars, L, F, rows, scratches, crows, glow: { p: glowP, x: camEnd.cx * glowP + (glowX - SX) / zp(glowP), y: -12 }, SUN, skyIdx };
}

// ---------------------------------------------------------------- per-frame parts
const layerOff = (Ly, cx, SX) => R(SX + (Ly.W0 - cx * Ly.p) * Ly.z);

function drawFloor(c, Cc, cx) {
  const d = c.d;
  for (const r of Cc.rows) {
    const off = Cc.SX + (r.w0 - cx * r.p) * r.z, o = R(off), Y = r.Y, row = Y * GW, by = BY[Y & 3];
    for (let X = 0; X < GW; X++) {
      const i = X - o; if (i < 0 || i >= r.n) continue;
      const v = r.tone[i], pal = PRGB[r.pal[i]], fl = Math.floor(v), f = v - fl, q = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > by[X & 3] ? fl + 1 : fl;
      const col = pal[q < 0 ? 0 : q >= pal.length ? pal.length - 1 : q], k = (row + X) * 3; d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2];
    }
  }
}

function drawStars(c, Cc, t) {
  for (const s of Cc.stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph), k = s.b * tw; if (k < 0.05) continue;
    const q = (s.Y * GW + s.X) * 3, d = c.d, col = s.big ? [255, 244, 224] : [214, 204, 255];
    for (let j = 0; j < 3; j++) d[q + j] += (col[j] - d[q + j]) * Math.min(1, k * 1.1);
    if (s.big && k > 0.3) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q2 = ((s.Y + dy) * GW + s.X + dx) * 3; for (let j = 0; j < 3; j++) d[q2 + j] += (col[j] - d[q2 + j]) * (k - 0.3) * 0.5; }
  }
}

/** Far crows wheeling over the skyline (tiny, slow, continuous). */
function drawFarBirds(c, cam, t) {
  for (let i = 0; i < 4; i++) {
    const a = t * (0.32 + i * 0.05) + i * 1.7, x = 300 + Math.cos(a) * (42 + i * 9) - cam.cx * 0.06, y = 120 + Math.sin(a) * (12 + i * 3) + i * 7;
    const X = R(x), Y = R(y), up = Math.sin(t * 5.5 + i * 2) > 0 ? 1 : 0;
    c.px(X, Y, "#120C1C"); c.px(X - 1, Y - up, "#120C1C"); c.px(X + 1, Y - up, "#120C1C"); c.px(X - 2, Y - up, "#120C1C"); c.px(X + 2, Y - up, "#120C1C");
  }
}

/** A crow: sitting, or flying away after t0 (wings beating, path rising and drifting away, out of the frame). */
function drawCrow(c, Cc, cr, cam, t) {
  const z = Cc.zp(cr.p), dt = t - cr.t0;
  let wx = cr.x, wy = cr.wy, flying = dt > 0, wing = 0;
  if (flying) {
    wx += cr.dir * (24 * dt + 26 * dt * dt); wy -= 26 * dt + 44 * dt * dt;
    wing = Math.sin(2 * Math.PI * (3.2 * dt + 1.6 * Math.min(dt, 0.5))) ;
  }
  const X = Cc.SX + (wx - cam.cx * cr.p) * z, Y = Cc.SY + (wy - Cc.CY * cr.p) * z;
  if (X < -30 || X > GW + 30 || Y < -30) return;
  const s = z * 1.4, f = cr.dir, K = "#0C0812", L = "#8A4652";
  const P = (u, v) => [X + u * s * f, Y + v * s];
  if (!flying || dt < 0.08) {
    // sitting: body, head, beak, tail; crouches just before take-off
    const crouch = flying ? dt / 0.08 : 0;
    c.poly([P(-6, -4 + crouch), P(-1, -8 + crouch), P(4, -7 + crouch), P(5, -4), P(1, -1), P(-4, -1)], K);
    c.poly([P(-6, -4), P(-11, -2), P(-10, -1), P(-4, -2)], K);
    c.disc(R(P(4.5, -9 + crouch)[0]), R(P(4.5, -9 + crouch)[1]), Math.max(1, R(2.2 * s)), K);
    const bk = P(7.5, -8.5 + crouch); c.line(R(P(6, -9 + crouch)[0]), R(P(6, -9 + crouch)[1]), R(bk[0]), R(bk[1]), "#2A2030");
    for (const u of [-3, -1.5, 0, 1.5]) { const tp = P(u, -8 + crouch + (u < -1 ? 1.2 : 0)); c.px(R(tp[0]), R(tp[1]), L); }
    const leg = P(0, 0); c.px(R(leg[0]), R(leg[1]), "#2A2030");
    return;
  }
  // flying: body, two wings beating (up/down), tail fan
  c.poly([P(-6, -1), P(-1, -3), P(5, -2.5), P(5, 0), P(-1, 1)], K);
  c.poly([P(-6, -1), P(-11, -2.5), P(-11, 1), P(-6, 0.5)], K);
  c.disc(R(P(6, -2)[0]), R(P(6, -2)[1]), Math.max(1, R(1.8 * s)), K); const bk = P(9, -1.5); c.px(R(bk[0]), R(bk[1]), "#2A2030");
  const tip = (side) => { const a = wing * 1.1; return [P(-1 + Math.cos(a) * 3, -2 - Math.sin(a) * 11 * side)]; };
  for (const side of [1, 0.55]) { const [tp] = tip(side); c.poly([P(-3, -2), P(2, -2), [tp[0] + 2 * f, tp[1]], [tp[0] - 3 * f, tp[1] + 1]], side === 1 ? K : "#1A1220"); }
  for (const u of [-4, -1.5, 1]) { const tp = P(u, -2.6); c.px(R(tp[0]), R(tp[1]), L); }
}

function drawGlow(c, Cc, cam, t) {
  const k = sm(t, 7.7, 8.4); if (k <= 0) return;
  const z = Cc.zp(Cc.glow.p), gx = Cc.SX + (Cc.glow.x - cam.cx * Cc.glow.p) * z, gy = Cc.SY + (Cc.glow.y - Cc.CY * Cc.glow.p) * z;
  TOWN_GLOW.x = gx; TOWN_GLOW.y = gy;
  const fl = 1 + 0.07 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 15.7 + 1) + 0.03 * Math.sin(t * 23.3 + 2), d = c.d;
  const tint = (X, Y, col, a) => { if (X < 0 || Y < 0 || X >= GW || Y >= GH) return; const i = (Y * GW + X) * 3; d[i] += (col[0] - d[i]) * a; d[i + 1] += (col[1] - d[i + 1]) * a; d[i + 2] += (col[2] - d[i + 2]) * a; };
  // 1) a soft warm haze around the far fire, irregular, brighter low (light in the fog between the trunks)
  const H1 = hex("#5A2438"), H2 = hex("#8E3434"), H3 = hex("#C2522E"), H4 = hex("#EE8A3C");
  const rx = 96, ry = 66;
  for (let Y = Math.max(0, R(gy - ry)); Y <= Math.min(GH - 1, R(gy + 14)); Y++) for (let X = Math.max(0, R(gx - rx)); X <= Math.min(GW - 1, R(gx + rx)); X++) {
    const dx = (X - gx) / rx, dy = (Y - gy) / (Y < gy ? ry : 14), r = Math.sqrt(dx * dx + dy * dy); if (r >= 1) continue;
    const I = (1 - r) ** 1.5 * (0.7 + 0.55 * vnoise(X * 0.05 + t * 0.6, Y * 0.07)) * 5.6 * k * fl, q = bandF(I, X, Y); if (q <= 0) continue;
    tint(X, Y, q >= 4 ? H4 : q === 3 ? H3 : q === 2 ? H2 : H1, q >= 4 ? 0.7 : q === 3 ? 0.55 : 0.4);
  }
  // 2) the fire itself, tiny and far: a few flickering tongues and an ember bed
  const cx0 = R(gx), cy0 = R(gy + 3), core = ["#FFF0B0", "#FFD060", "#FF9A38", "#E0582C"].map(hex);
  for (let j = -5; j <= 5; j++) { const hgt = (8 - Math.abs(j) * 1.35) * (0.75 + 0.35 * Math.sin(t * (11 + j * 1.7) + j * 2.1)) * k; for (let i = 0; i < hgt; i++) { const u = i / Math.max(1, hgt); if (k <= BY[(cy0 - i) & 3][(cx0 + j) & 3] * 0.9) continue; tint(cx0 + j, cy0 - i, core[Math.min(3, Math.floor(u * 3.2 + Math.abs(j) * 0.25))], 1); } }
  for (let j = -6; j <= 6; j++) if (k > BY[(cy0 + 1) & 3][(cx0 + j) & 3]) tint(cx0 + j, cy0 + 1, Math.abs(j) < 3 ? core[1] : core[3], 0.8);
  for (let i = 0; i < 4; i++) { const ph = (t * (0.7 + rnd(i + 5) * 0.5) + rnd(i + 9)) % 1, ex = R(gx + (rnd(i) - 0.5) * 8 + Math.sin(t * 3 + i) * 2), ey = R(gy - 2 - ph * 26); if (k > 0.6 && ph < 0.85) tint(ex, ey, core[ph < 0.4 ? 1 : 2], 1 - ph * 0.5); }
  // 3) the smoke column: rising from the fire, drifting right in the dusk wind, lit warm on its left side
  const top = gy - 360 * sm(t, 7.75, 8.9), lit = hex("#9C7E98"), body = hex("#5E4C6E"), warm = hex("#B0705E");
  for (let Y = Math.max(0, R(top)); Y < R(gy - 4); Y++) {
    const hh = (gy - Y) / 360, cxs = gx + 2 + 70 * hh * hh + 5 * Math.sin(Y * 0.04 - t * 1.3), w = 3.5 + 19 * hh, fadeTop = clamp01((Y - top) / 50);
    for (let X = R(cxs - w - 2); X <= R(cxs + w + 2); X++) {
      if (X < 0 || X >= GW) continue;
      const u = (X - cxs) / w, n = fbm(X * 0.08 - t * 0.3, Y * 0.06 + t * 1.5), den = (1 - u * u) * (0.45 + n * 0.9) * (1 - hh * 0.55) * fadeTop * k;
      if (den <= BY[Y & 3][X & 3] * 0.8 + 0.08) continue;
      tint(X, Y, hh < 0.06 ? warm : u < -0.35 ? lit : body, hh < 0.06 ? 0.6 : 0.5);
    }
  }
}

function drawGlint(c, Cc, cam, t) {
  const k = win(t, EV.three - 0.12, EV.days + 0.3, 0.3, 0.45); if (k <= 0) return;
  const Ly = Cc.L.wall, off = layerOff(Ly, cam.cx, Cc.SX), sw = lerp(TALLY.x0 - 20, TALLY.x1 + 20, clamp01((t - EV.three + 0.1) / (EV.days + 0.35 - EV.three + 0.1)));
  const pts = Cc.scratches, d = c.d, hot = hex("#FFF1D6"), warm = hex("#FFD7A0");
  for (let i = 0; i < pts.length; i += 2) {
    const X = pts[i] + off, Y = pts[i + 1]; if (X < 0 || X >= GW) continue;
    const wx = Ly.W0 + pts[i] / Ly.z, g = k * (0.38 + 0.75 * Math.exp(-(((wx - sw) / 16) ** 2)));
    const gv = g * 3, q = Math.floor(gv) + (gv - Math.floor(gv) > BY[Y & 3][X & 3] ? 1 : 0); if (q <= 0) continue;
    const col = q >= 2 ? hot : warm, a = Math.min(1, q * 0.42), j = (Y * GW + X) * 3;
    d[j] += (col[0] - d[j]) * a; d[j + 1] += (col[1] - d[j + 1]) * a; d[j + 2] += (col[2] - d[j + 2]) * a;
  }
  // a small four-point sparkle riding the sweep
  const sx = R(Cc.SX + (sw - cam.cx) * Ly.z), sy = R(Cc.SY + (TALLY.y0 + 18 + 30 * Math.sin(t * 3) - Cc.CY) * Ly.z), sk = k * Math.exp(-(((sw - (TALLY.x0 + TALLY.x1) / 2) / 70) ** 2));
  if (sk > 0.2) { const n = R(1 + 3 * sk); for (let j = -n; j <= n; j++) { c.px(sx + j, sy, Math.abs(j) < n ? "#FFF6E4" : "#FFD7A0"); c.px(sx, sy + j, Math.abs(j) < n ? "#FFF6E4" : "#FFD7A0"); } }
}

// ---------------------------------------------------------------- the exported API
export function drawTown(c, cam, t) {
  const Cc = cache(cam), cx = cam.cx;
  c.d.set(Cc.sky.d.subarray(0, GW * (Cc.SY + 30) * 3), 0);
  drawStars(c, Cc, t);
  drawFloor(c, Cc, cx);
  drawFarBirds(c, cam, t);
  const L = Cc.L;
  for (const k of ["far", "mid", "ruin", "f52"]) blit(c, L[k].s, layerOff(L[k], cx, Cc.SX));
  drawGlow(c, Cc, cam, t);
  for (const k of ["fac", "pole", "side", "car", "end"]) {
    blit(c, L[k].s, layerOff(L[k], cx, Cc.SX));
    for (const cr of Cc.crows) if (cr.p === L[k].p) drawCrow(c, Cc, cr, cam, t);
  }
  blit(c, L.wall.s, layerOff(L.wall, cx, Cc.SX));
  drawGlint(c, Cc, cam, t);
  for (const cr of Cc.crows) if (cr.p === 1) drawCrow(c, Cc, cr, cam, t);
}

export function drawTownFront(c, cam, t) {
  const Cc = cache(cam), cx = cam.cx;
  for (const k of ["sign", "curb", "mid", "pole", "bot"]) blit(c, Cc.F[k].s, layerOff(Cc.F[k], cx, Cc.SX));
}

/** Screen point of the far fire's glow in shot A (for sound panning or the lead's checks). */
export function townGlowScreen(cam) { const Cc = cache(cam), z = Cc.zp(Cc.glow.p); return { x: Cc.SX + (Cc.glow.x - cam.cx * Cc.glow.p) * z, y: Cc.SY + (Cc.glow.y - Cc.CY * Cc.glow.p) * z }; }
