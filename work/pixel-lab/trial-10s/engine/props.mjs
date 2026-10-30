// Trial 10 s · prop state machines and drawing. Every prop is a pure function of t and the resolved plan:
// states → continuous parameter vectors; a key eases the parameters it sets from their current values to the target over
// the key's D (resolve() keeps keys from overlapping), so no state ever changes in one frame. Enter/exit are dithered
// dissolves with a short eased move. Accents (wink, flash, blink, ring) are windows of the key that causes them.
import { GW, GH, R, clamp01, sm, lerp, ease, easeOut, backOut, flicker, layer, gate } from "./layout.mjs";
import { CATALOG } from "../contract.mjs";
import { drawPumpkin, drawBale, drawDust, warmLight, drawBurst, drawSparks, FACE, PUMPKIN_BASE, BH } from "../props/pumpkin.mjs";
import { drawKid, drawKidOverlays, KID } from "../props/kid.mjs";
import { drawStopwatch, drawCounter } from "../props/cards.mjs";
import { drawSun, drawMoonProp, drawEarth } from "../props/sky.mjs";
import { drawHeart, drawEye, drawBat, drawGhost } from "../props/creatures.mjs";

// ---------------------------------------------------------------- parameter targets per state (unlisted params keep their value)
const P = {
  pumpkin: { base: { open1: 0, open2: 0, cut: 0, glow: 0, smile: 0 }, seq: ["open1", "open2", "cut"],
    st: { plain: {}, "one-eye": { open1: 1 }, eyes: { open1: 1, open2: 1 }, face: { open1: 1, open2: 1, cut: 1 }, glow: { open1: 1, open2: 1, cut: 1, glow: 1 }, smile: { open1: 1, open2: 1, cut: 1, smile: 1 } } },
  kid: { base: { xray: 0, signal: 0, light: 0, mark: 0, smile: 0 }, seq: ["xray", "signal"],
    st: { watch: {}, xray: { xray: 1 }, signal: { xray: 1, signal: 1 }, lit: { xray: 1, light: 1, mark: 1 }, smile: { smile: 1 } } },
  stopwatch: { base: { sweep: 0 }, st: { show: {}, run: { sweep: 1 }, done: { sweep: 1 } } },
  counter: { base: { sweep: 0 }, st: { show: {}, count: { sweep: 1 }, done: { sweep: 1 } } },
  earth: { base: { night: 0, spin: 0 }, st: { day: { night: 0, spin: 0 }, night: { night: 1, spin: 0 }, spin: { spin: 1 } } },
  sun: { base: { flare: 0, dim: 0 }, st: { shine: { flare: 0, dim: 0 }, flare: { flare: 1, dim: 0 }, dim: { dim: 1, flare: 0 } } },
  moon: { base: { bright: 0 }, st: { glow: { bright: 0 }, bright: { bright: 1 } } },
  heart: { base: { bpm: 60, glow: 0 }, st: { rest: { bpm: 60 }, beat: { bpm: 80 }, fast: { bpm: 150 }, glow: { glow: 1 } } },
  eye: { base: { look: 0, wide: 0, glow: 0 }, st: { open: { look: 0, wide: 0 }, look: { look: 1 }, wide: { wide: 1 }, blink: {}, glow: { glow: 1 } } },
  bat: { base: { fly: 1, hang: 0, ping: 0 }, st: { hang: { fly: 0, hang: 1, ping: 0 }, fly: { fly: 1, hang: 0, ping: 0 }, ping: { fly: 1, hang: 0, ping: 1 } } },
  ghost: { base: { boo: 0, fade: 0 }, st: { float: { boo: 0, fade: 0 }, boo: { boo: 1 }, fade: { fade: 1, boo: 0 } } },
};
const LINEAR = new Set(["cut", "signal", "sweep"]);

/** Parameters of prop p at time t, plus the key in progress (for accents). */
export function params(p, t) {
  const S = P[p.kind], cur = { ...S.base, ...S.st[p.init] };
  let active = null, last = null;
  for (const k of p.keys) {
    if (t < k.t) break;
    const u = clamp01((t - k.t) / k.D), tgt = S.st[k.state], from = { ...cur };
    const changing = (S.seq || []).filter((n) => n in tgt && Math.abs(tgt[n] - from[n]) > 1e-6);
    for (const n of Object.keys(tgt)) {
      let w = u; const i = changing.indexOf(n);
      if (i >= 0) w = clamp01(u * changing.length - i);
      const e = LINEAR.has(n) ? w : n.startsWith("open") ? backOut(w, 1.25) : ease(w);
      cur[n] = lerp(from[n], tgt[n], n.startsWith("open") ? e : Math.min(1, e));
    }
    last = { ...k, u };
    if (u < 1) active = last;
  }
  return { v: cur, active, last };
}
/** ∫ f(params) dt from 0 to t (phases that must stay continuous when a rate changes: heart beat, earth spin). */
function integrate(p, t, f) { let s = 0; const dt = 1 / 60; for (let x = 0; x < t; x += dt) s += f(params(p, x).v) * Math.min(dt, t - x); return s; }

// ---------------------------------------------------------------- enter / exit
export function presence(p, t) {
  if (t < p.enterT - 0.01) return { a: 0, k: 0 };
  const k = p.start ? 1 : clamp01((t - p.enterT) / (p.kind === "kid" ? 0.5 : 0.38));
  const out = p.exitT == null ? 0 : sm(t, p.exitT, p.exitT + 0.38);
  return { a: Math.min(p.start ? 1 : sm(k, 0, 1), 1 - out), k, out };
}

// ---------------------------------------------------------------- screen centre (for looks, beams and the camera guard)
export function screenOf(p, cam) {
  if (p.hud) return [p.x, p.y];
  if (p.kind === "kid") { const L = layer(cam, KID.p); return [L.X(KID.x), L.Y(KID.y)]; }
  const L = layer(cam, 1); return [L.X(p.x), L.Y(p.y)];
}

// ---------------------------------------------------------------- draw one prop → anchors { a, box, pt, eye?, area? }
export function drawProp(c, p, t, cam, ctx) {
  const pr = presence(p, t); if (pr.a <= 0) return null;
  const { v, active, last } = params(p, t), a = pr.a, g = a < 1 ? gate(c, 0, a) : c, th = ctx.theme;
  const rise = p.start ? 0 : (1 - easeOut(pr.k)) * 10;
  const acc = (state, w0 = 0, w1 = 1) => (last && last.state === state ? clamp01((last.u - w0) / (w1 - w0)) : 0);
  if (p.kind === "pumpkin") {
    // the hero lands on its bale: falling in the first frame, squash and settle (xhigh B.drop / B.squash)
    const t0 = p.start ? 0 : p.enterT, u = clamp01((t - t0) / 0.26), td = t - t0 - 0.26;
    const dy = u < 1 ? -54 * (1 - (0.35 * u + 0.65 * u * u)) : 0;
    const squash = td < 0 ? -0.045 * sm(t - t0, 0, 0.2) : 0.14 * sm(td, 0, 0.05) * Math.exp(-Math.max(0, td - 0.05) * 7.5) * Math.cos(Math.max(0, td - 0.05) * 17);
    const base = layer(cam, 1), s = p.s, ax = PUMPKIN_BASE.x, ay = PUMPKIN_BASE.y - 47;   // local anchor = middle of pumpkin + bale
    const L = { z: base.z * s, p: 1, X: (wx) => base.X(p.x + (wx - ax) * s), Y: (wy) => base.Y(p.y + (wy - ay) * s), wx: (sx) => ax + (base.wx(sx) - p.x) / s, wy: (sy) => ay + (base.wy(sy) - p.y) / s };
    const fl = flicker(t), area = 0.3 * Math.min(1, v.open1) ** 2 + 0.3 * Math.min(1, v.open2) ** 2 + 0.4 * Math.min(1, v.cut);
    const flash = 0.4 * Math.sin(Math.PI * acc("glow")) + 0.25 * Math.sin(Math.PI * acc("face", 0.85, 1));
    const glow = (0.86 + 0.35 * v.glow + flash) * fl, warm = area * (1 + 0.6 * v.glow + flash) * fl;
    const wink = Math.sin(Math.PI * acc("smile", 0.15, 0.85));
    const st = { dy, sx: 1 + squash * 0.75, sy: 1 - squash, open1: v.open1, open2: v.open2, cut: v.cut, lidL: wink, lidR: 0, smile: v.smile, glow };
    const pfx = L.X(PUMPKIN_BASE.x), pfy = L.Y(PUMPKIN_BASE.y - BH + dy);
    warmLight(c, L, warm * a, pfx, pfy);
    drawBale(g, L, t, warm);
    const Pp = drawPumpkin(g, L, t, st);
    drawDust(g, L, (t - t0 - 0.26) / 0.5);
    // bursts when the holes open, sparks at the cutting tip
    for (const k of p.keys) { if (t < k.t || t > k.t + k.D + 0.5) continue; const n = ["one-eye", "eyes", "face"].includes(k.state) ? 1 : 0; if (!n) continue;
      const ch = params(p, k.t - 0.001).v; const holes = []; if (ch.open1 < 0.5) holes.push(0); if (ch.open2 < 0.5 && k.state !== "one-eye") holes.push(1);
      const share = holes.length + (k.state === "face" && ch.cut < 0.5 ? 1 : 0);
      holes.forEach((h, i) => { const w0 = k.t + (k.D * i) / share; drawBurst(g, (h ? Pp.eyeR : Pp.eyeL)[0], (h ? Pp.eyeR : Pp.eyeL)[1], clamp01((t - w0 - 0.04) / 0.4), Pp.z, h + 1); }); }
    if (v.cut > 0.02 && v.cut < 0.98) { const tip = Pp.toS(-FACE.mouthHW + 2 * FACE.mouthHW * v.cut, FACE.mouthY); drawSparks(g, tip[0], tip[1], t, Pp.z, 1); }
    ctx.warm = Math.max(ctx.warm || 0, warm);
    const bx = L.X(PUMPKIN_BASE.x), w = 104 * L.z;
    return { a, box: { x0: bx - w, y0: Pp.top[1] - 30 * L.z, x1: bx + w, y1: L.Y(618) }, faceBox: { x0: Pp.eyeL[0] - 30 * Pp.z, y0: Pp.eyeL[1] - 24 * Pp.z, x1: Pp.eyeR[0] + 30 * Pp.z, y1: Pp.mouth[1] + 18 * Pp.z }, pt: Pp.face, face: Pp.face };
  }
  if (p.kind === "kid") {
    const base = layer(cam, KID.p), slide = (1 - easeOut(pr.k)) * 70;
    const L = { ...base, X: (wx) => base.X(wx) - slide, wx: (sx) => base.wx(sx + slide) };
    const look = ctx.lookAt(p) || [L.X(KID.x) + 200, L.Y(KID.y) + 120];
    // the signal: pulse 0..1 while it runs, then its trail fades
    const sig = p.keys.find((k) => k.state === "signal"), pulse = !sig || t < sig.t ? -1 : clamp01((t - sig.t) / sig.D), trail = sig ? 1 - sm(t, sig.t + sig.D, sig.t + sig.D + 0.7) : 0;
    const lit = acc("lit"), litK = p.keys.find((k) => k.state === "lit");
    const light = v.light > 0 ? lerp(0.24, 1, v.light) + 0.25 * Math.sin(Math.PI * clamp01(lit * 1.6)) : 0.24 * (pulse >= 1 ? sm(t, sig.t + sig.D, sig.t + sig.D + 0.25) : 0);
    const st = { xray: v.xray, pulse: v.xray > 0 ? pulse : -1, trail, mark: v.mark, ring: litK ? clamp01((t - litK.t) / 0.55) : 0, light: v.xray > 0.5 ? light : 0,
      glow: Math.max(0.35, ctx.warm || 0), blink: Math.max(Math.sin(Math.PI * clamp01((t - 5.42) / 0.18)), Math.sin(Math.PI * clamp01((t - 9.32) / 0.18))),
      smile: v.smile, breath: 1.2 * Math.sin(t * 1.8), brow: Math.sin(Math.PI * acc("xray")) * 0.8 + Math.sin(Math.PI * acc("lit")), look };
    const A = drawKid(g, L, t, st); drawKidOverlays(g, null, t, st, A);
    if (!A.visible) return null;
    return { a, box: { x0: A.head[0] - 96 * A.z, y0: A.head[1] - 130 * A.z, x1: A.head[0] + 96 * A.z, y1: A.head[1] + 100 * A.z }, pt: A.eye, eye: A.eye, area: A.ffa, lit: v.light > 0.3 };
  }
  if (p.hud) {
    const st = { a, rise: pr.k, sweep: v.sweep, flash: last && last.state === "done" ? 1 - last.u : 0 };
    const box = (p.kind === "stopwatch" ? drawStopwatch : drawCounter)(c, t, p, st, th);
    ctx.texts.push({ kind: p.kind, ...box });
    return { a, box, pt: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2] };
  }
  const base = layer(cam, 1), cx = base.X(p.x), cy = base.Y(p.y) - rise, z = base.z * p.s;
  let A;
  if (p.kind === "sun") A = drawSun(c, cx, cy, z, t, { a, spin: 0.22 * t + 0.6 * integrate(p, t, (q) => q.flare), flare: v.flare + 0.3 * Math.sin(Math.PI * acc("flare")), dim: v.dim });
  else if (p.kind === "moon") A = drawMoonProp(c, cx, cy, z, t, { a, bright: v.bright });
  else if (p.kind === "earth") A = drawEarth(c, cx, cy, z, t, { a, lon: -40 - integrate(p, t, (q) => 7 + 80 * q.spin), night: v.night }, ctx.sunDir([cx, cy]));
  else if (p.kind === "heart") A = drawHeart(c, cx, cy, z, t, { a, phase: integrate(p, t, (q) => q.bpm / 60) + 0.8, bpm: v.bpm, glow: v.glow });
  else if (p.kind === "eye") A = drawEye(c, cx, cy, z, t, { a, look: v.look, wide: v.wide, glow: v.glow, blink: Math.sin(Math.PI * acc("blink")) }, ctx.lookAt(p));
  else if (p.kind === "bat") { const pk = last && last.state === "ping" ? last.t : p.enterT; A = drawBat(c, cx, cy, z, t, { a, fly: v.fly, hang: v.hang, ping: v.ping, pingT0: pk }, ctx.lookAt(p)); }
  else if (p.kind === "ghost") A = drawGhost(c, cx, cy, z, t, { a, boo: v.boo, fade: v.fade });
  return { a, box: A.box, pt: A.pt };
}
export { P as STATE_PARAMS };
