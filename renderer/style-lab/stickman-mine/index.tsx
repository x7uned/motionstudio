// Style lab · «Стикмен» scene 2: «Алмаз в шахте» (10 s). Black-and-white stick miners, no outlines,
// one colour accent (cyan diamond + the word "digging."). Deterministic: everything derives from the frame.
// Rules: work/style-lab/stickman/STYLE.md, idea: work/style-lab/stickman/IDEAS.md #1.
import React, {useEffect, useState} from "react";
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame, Easing, delayRender, continueRender} from "remotion";
import "@fontsource-variable/manrope";

const FPS = 30, W = 1080, H = 1920, DURATION = 300;
const FONT = "'Manrope Variable', Manrope, sans-serif";
const NEAR = "#FFFFFF", FAR = "#8F8F8F", CYAN = "#46E2FF";
const ROCK = "#161616", GRID = "#202020", LINE = "#7A7A7A";
const CELL = 60, SURFACE = 520, SHAFT = {x0: 90, x1: 170};

// ---------- helpers ----------
const D = Math.PI / 180;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const EIO = Easing.bezier(0.45, 0, 0.2, 1);
const EO = Easing.bezier(0.16, 0.8, 0.3, 1);
const EIN = Easing.bezier(0.6, 0, 0.9, 0.5);
const win = (f: number, a: number, b: number, e = EIO) => e(clamp01((f / FPS - a) / (b - a)));
type P = {x: number; y: number};
const dir = (deg: number): P => ({x: Math.sin(deg * D), y: Math.cos(deg * D)}); // 0 = down, 90 = forward, 180 = up
const add = (a: P, b: P, k = 1): P => ({x: a.x + b.x * k, y: a.y + b.y * k});
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
}

// ---------- body ----------
const S = 0.7;
const B = {headR: 25 * S, gap: 6 * S, torso: 84 * S, torsoW: 30 * S, upper: 50 * S, upperW: 17 * S, fore: 47 * S, foreW: 15 * S, thigh: 67 * S, thighW: 20 * S, shin: 65 * S, shinW: 18 * S};
const REACH = B.thigh + B.shin;
const FEET_F = 28, FEET_B = -34;
type Arm = {th: number; be: number};
type Pose = {hipX: number; floor: number; drop: number; lean: number; head: number; front: P; back: P; armN: Arm; armF: Arm};

function knee(h: P, a: P, l1: number, l2: number) {
  let dx = a.x - h.x, dy = a.y - h.y;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.5;
  if (d > max) {a = {x: h.x + (dx / d) * max, y: h.y + (dy / d) * max}; dx = a.x - h.x; dy = a.y - h.y; d = max;}
  const base = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const c1 = {x: h.x + l1 * Math.cos(base + al), y: h.y + l1 * Math.sin(base + al)};
  const c2 = {x: h.x + l1 * Math.cos(base - al), y: h.y + l1 * Math.sin(base - al)};
  return {k: c1.x > c2.x ? c1 : c2, a};
}

function build(p: Pose) {
  const cap = B.shinW / 2;
  const hip = {x: p.hipX, y: p.floor - cap - REACH * 0.88 + p.drop};
  const A = 180 - p.lean;
  const neck = add(hip, dir(A), B.torso);
  const HA = A - p.head;
  const head = add(neck, dir(HA), B.torsoW / 2 + B.gap + B.headR);
  const sh = add(neck, dir(A), -3 * S);
  const arm = (a: Arm) => {const el = add(sh, dir(a.th), B.upper); const a2 = a.th + a.be; return {el, hand: add(el, dir(a2), B.fore), a2};};
  return {hip, neck, head, HA, sh, aN: arm(p.armN), aF: arm(p.armF),
    lN: knee(hip, {x: p.front.x, y: p.front.y - cap}, B.thigh, B.shin), lF: knee(hip, {x: p.back.x, y: p.back.y - cap}, B.thigh, B.shin)};
}

function pickPts(g: P, h: number) {
  const d = dir(h);
  const a = add(g, d, -12 * S), e = add(g, d, 95 * S);
  return {a, e, c: add(e, d, 9 * S), t1: add(e, dir(h - 90), 42 * S), t2: add(e, dir(h + 90), 32 * S)};
}

// arm/torso keyframes
type K = {u: number; th: number; be: number; lean: number; drop: number; head?: number; e?: (t: number) => number};
function kf(u: number, keys: K[]) {
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (u <= b.u) {
      const t = (b.e ?? EIO)(clamp01((u - a.u) / (b.u - a.u)));
      return {th: lerp(a.th, b.th, t), be: lerp(a.be, b.be, t), lean: lerp(a.lean, b.lean, t), drop: lerp(a.drop, b.drop, t), head: lerp(a.head ?? 0, b.head ?? 0, t)};
    }
  }
  const l = keys[keys.length - 1];
  return {th: l.th, be: l.be, lean: l.lean, drop: l.drop, head: l.head ?? 0};
}
const HIT: K[] = [
  {u: 0, th: 45, be: 45, lean: 8, drop: 0}, {u: 0.5, th: 185, be: 40, lean: -4, drop: 0},
  {u: 0.64, th: 75, be: 5, lean: 18, drop: 6, e: EIN}, {u: 0.78, th: 75, be: 5, lean: 18, drop: 6}, {u: 1, th: 45, be: 45, lean: 8, drop: 0, e: EO},
];
const WEAK: K[] = [
  {u: 0, th: 45, be: 45, lean: 8, drop: 0}, {u: 0.55, th: 150, be: 40, lean: 2, drop: 0},
  {u: 0.72, th: 78, be: 8, lean: 20, drop: 6, e: EIN}, {u: 0.86, th: 78, be: 8, lean: 20, drop: 6}, {u: 1, th: 30, be: 45, lean: 14, drop: 4, e: EO},
];
const TIRED: K[] = [{u: 0, th: 30, be: 45, lean: 14, drop: 4}, {u: 1, th: 20, be: 40, lean: 24, drop: 6, head: 14}];
const DROP: K[] = [{u: 0, th: 20, be: 40, lean: 24, drop: 6, head: 14}, {u: 1, th: 4, be: 8, lean: 24, drop: 4, head: 14}];
const TURN: K[] = [{u: 0, th: 4, be: 8, lean: 24, drop: 4, head: 14}, {u: 1, th: 4, be: 10, lean: 14, drop: 2, head: 16}];
const CATCH: K[] = [{u: 0, th: 45, be: 45, lean: 8, drop: 0}, {u: 1, th: 172, be: 8, lean: -4, drop: 0, head: -12, e: EO}];

// strike geometry: where the pick tip lands relative to the hip
const STRIKE = (() => {
  const b = build({hipX: 0, floor: 0, drop: 6, lean: 18, head: 0, front: {x: FEET_F, y: 0}, back: {x: FEET_B, y: 0}, armN: {th: 75, be: 5}, armF: {th: 70, be: 5}});
  return pickPts(b.aN.hand, b.aN.a2 + 50).t1;
})();

// ---------- miners: a tiny action script each ----------
type Kind = "hit" | "weak" | "step" | "tired" | "drop" | "turn" | "walk" | "catch" | "hold";
type Act = {k: Kind; n: number; ev?: "crack" | "break" | "pop"};
type Ev = {f: number; kind: "crack" | "break" | "pop"; col: number; i: number};
type Miner = {id: number; floor: number; face0: number; hipX0: number; acts: Act[]; evs: Ev[]; release: number};

function makeMiner(id: number, floor: number, face0: number, lead: number, acts: Act[]): Miner {
  let t = 0, face = face0, release = Infinity, i = 0;
  const evs: Ev[] = [];
  for (const a of acts) {
    if ((a.k === "drop" || a.k === "catch") && release === Infinity) release = t;
    if (a.ev) {
      evs.push({f: t + Math.round(a.n * (a.k === "weak" ? 0.72 : 0.64)), kind: a.ev, col: face, i: i++});
      if (a.ev === "break") face += CELL;
    }
    t += a.n;
  }
  return {id, floor, face0, hipX0: face0 - STRIKE.x - lead, acts, evs, release};
}
const hit = (ev: Act["ev"]): Act => ({k: "hit", n: 14, ev});
const step: Act = {k: "step", n: 14};
const TOP = makeMiner(1, 880, 600, 0, [
  hit("crack"), hit("break"), step, hit("crack"), {k: "weak", n: 22, ev: "crack"},
  {k: "tired", n: 14}, {k: "drop", n: 10}, {k: "turn", n: 10}, {k: "walk", n: 999},
]);
const BOT = makeMiner(2, 1240, 480, CELL, [
  step,
  hit("crack"), hit("break"), step, hit("crack"), hit("break"), step,
  hit("crack"), hit("break"), step, hit("crack"), hit("break"), step,
  hit("pop"), {k: "catch", n: 20}, {k: "hold", n: 999},
]);
const TUNNEL_H = 240;

function gaitFoot(xb: number, off: number, L: number, floor: number, lift: number): P {
  const C = 2 * L, q = (xb - off) / C, k = Math.floor(q), ph = q - k, a = off + k * C + 0.6 * L;
  if (ph < 0.6) return {x: a, y: floor};
  const u = (ph - 0.6) / 0.4, e = u * u * (3 - 2 * u);
  return {x: lerp(a, a + C, e), y: floor - lift * Math.sin(Math.PI * u)};
}

function minerAt(m: Miner, f: number) {
  let hipX = m.hipX0, facing = 1, pivot = 0, t = 0, u = 0;
  let cur: Act = m.acts[m.acts.length - 1];
  for (const a of m.acts) {
    if (a.k === "turn") pivot = hipX;
    if (f < t + a.n) {cur = a; u = (f - t) / a.n; break;}
    if (a.k === "step") hipX += CELL;
    if (a.k === "turn") facing = -1;
    t += a.n;
  }
  const fl = m.floor;
  const stance = (x: number) => ({front: {x: x + FEET_F, y: fl}, back: {x: x + FEET_B, y: fl}});
  const pose = (k: ReturnType<typeof kf>, x: number, far = -5): Pose =>
    ({hipX: x, floor: fl, drop: k.drop, lean: k.lean, head: k.head, ...stance(x), armN: {th: k.th, be: k.be}, armF: {th: k.th + far, be: k.be}});
  let p: Pose;
  switch (cur.k) {
    case "hit": p = pose(kf(u, HIT), hipX); break;
    case "weak": p = pose(kf(u, WEAK), hipX); break;
    case "tired": {const k = kf(u, TIRED); k.drop += 1.5 * Math.sin(u * Math.PI * 2); p = pose(k, hipX); break;}
    case "drop": p = pose(kf(u, DROP), hipX); break;
    case "turn": p = pose(kf(u, TURN), hipX); facing = lerp(1, -1, EIO(u)); break;
    case "step": {
      const x = hipX + CELL * EIO(u);
      const fu = EIO(clamp01(u / 0.6)), bu = EIO(clamp01((u - 0.35) / 0.65));
      p = {hipX: x, floor: fl, drop: -3 * Math.sin(Math.PI * u), lean: 10, head: 0,
        front: {x: hipX + FEET_F + CELL * fu, y: fl - 12 * Math.sin(Math.PI * fu)},
        back: {x: hipX + FEET_B + CELL * bu, y: fl - 12 * Math.sin(Math.PI * bu)},
        armN: {th: 45, be: 45}, armF: {th: 40, be: 45}};
      break;
    }
    case "walk": {
      const L = 40, frames = f - t, d = (frames / FPS) * 52, x = pivot + d;
      const w = EIO(clamp01(frames / 12));
      const gN = gaitFoot(d, L, L, fl, 9), gF = gaitFoot(d, 0, L, fl, 9);
      const front = {x: lerp(pivot + FEET_F, pivot + gN.x, w), y: lerp(fl, gN.y, w)};
      const back = {x: lerp(pivot + FEET_B, pivot + gF.x, w), y: lerp(fl, gF.y, w)};
      const sw = (q: P) => Math.max(-1, Math.min(1, (q.x - x) / (0.6 * L)));
      p = {hipX: x, floor: fl, drop: 2 - 2 * Math.cos(4 * Math.PI * (d / (2 * L))), lean: 14, head: 16, front, back,
        armN: {th: 4 + 12 * w * sw(back), be: 10}, armF: {th: 4 + 12 * w * sw(front), be: 10}};
      break;
    }
    case "catch": p = pose(kf(u, CATCH), hipX, 6); break;
    default: { // hold: arms up with a small pump
      const s = Math.sin(((f - t) / FPS) * Math.PI * 2 * 1.4);
      p = {hipX, floor: fl, drop: 2 + 2 * s, lean: -4, head: -12, ...stance(hipX), armN: {th: 172 + 5 * s, be: 8}, armF: {th: 178 + 5 * s, be: 8}};
    }
  }
  const T = (q: P): P => ({x: pivot + facing * (q.x - pivot), y: q.y});
  return {p, T, facing, k: cur.k};
}

// ---------- events: face, cracks, chunks, sparks ----------
const faceAt = (m: Miner, f: number) => m.face0 + CELL * m.evs.filter((e) => e.kind === "break" && e.f <= f).length;
const impactY = (m: Miner) => m.floor + STRIKE.y;

function crackPaths(m: Miner, ev: Ev, level: number): string[] {
  const r = rng(m.id * 1000 + ev.col * 7 + level * 31);
  const o = {x: ev.col + 2, y: impactY(m) + (r() - 0.5) * 16};
  const out: string[] = [];
  const n = level === 0 ? 2 : 3;
  for (let j = 0; j < n; j++) {
    let a = 90 + (r() - 0.5) * 200; // spread into the rock and up/down
    let q = {...o};
    let d = `M${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    const steps = 3 + Math.floor(r() * (level === 0 ? 2 : 4));
    for (let s = 0; s < steps; s++) {
      a += (r() - 0.5) * 70;
      q = add(q, dir(a), 9 + r() * (level === 0 ? 10 : 16));
      q.x = Math.max(ev.col + 1, Math.min(ev.col + CELL - 2, q.x));
      q.y = Math.max(m.floor - TUNNEL_H + 4, Math.min(m.floor - 4, q.y));
      d += ` L${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out;
}

function chunks(m: Miner, ev: Ev, f: number) {
  const r = rng(m.id * 7777 + ev.col);
  const out: {x: number; y: number; s: number; rot: number; c: string}[] = [];
  const top = m.floor - TUNNEL_H;
  for (let i = 0; i < 12; i++) {
    let x = ev.col + 4 + r() * CELL * 0.8, y = top + 30 + r() * (TUNNEL_H - 40);
    let vx = -(0.6 + r() * 3.8), vy = -r() * 4.5, rot = r() * 360, w = (r() - 0.5) * 24;
    const s = 6 + r() * 10, c = r() > 0.5 ? "#3A3A3A" : "#2A2A2A";
    for (let k = ev.f; k < f; k++) {
      vy += 0.85; x += vx; y += vy; rot += w;
      if (y > m.floor - s / 2) {y = m.floor - s / 2; vy = -vy * 0.2; vx *= 0.45; w *= 0.4;}
    }
    out.push({x, y, s, rot, c});
  }
  return out;
}

const PICK_REST = 111.4;
function pickFall(m: Miner, f: number) {
  const st = minerAt(m, m.release - 1);
  const b = build(st.p);
  let g = st.T(b.aN.hand);
  let h = b.aN.a2 + 50;
  let vx = 0.5, vy = -0.5, w = 2;
  for (let i = m.release; i < f; i++) {
    vy += 0.9; g = {x: g.x + vx, y: g.y + vy}; h += w;
    const pts = pickPts(g, h);
    const low = Math.max(pts.a.y, pts.e.y, pts.t1.y, pts.t2.y, pts.c.y);
    if (low > m.floor - 3) {
      g = {x: g.x, y: g.y - (low - (m.floor - 3))};
      vy = Math.abs(vy) < 2 ? 0 : -vy * 0.25; vx *= 0.6; w *= 0.4;
      const target = PICK_REST + 360 * Math.round((h - PICK_REST) / 360);
      h += (target - h) * 0.2;
    }
  }
  return pickPts(g, h);
}

// ---------- drawing ----------
const Seg: React.FC<{a: P; b: P; w: number; c: string}> = ({a, b, w, c}) => (
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={w} strokeLinecap="round" />
);
const PickShape: React.FC<{p: ReturnType<typeof pickPts>; T?: (q: P) => P}> = ({p, T = (q) => q}) => {
  const a = T(p.a), e = T(p.e), c = T(p.c), t1 = T(p.t1), t2 = T(p.t2);
  return (
    <g strokeLinecap="round" fill="none">
      <line x1={a.x} y1={a.y} x2={e.x} y2={e.y} stroke="#9A9A9A" strokeWidth={6 * S} />
      <path d={`M${t2.x},${t2.y} Q${c.x},${c.y} ${t1.x},${t1.y}`} stroke="#D8D8D8" strokeWidth={9 * S} />
    </g>
  );
};

const MinerView: React.FC<{m: Miner; f: number}> = ({m, f}) => {
  const st = minerAt(m, f);
  const b = build(st.p);
  const T = st.T;
  const seg = (a: P, c: P, w: number, col: string) => ({a: T(a), b: T(c), w, c: col});
  const back = [seg(b.sh, b.aF.el, B.upperW, FAR), seg(b.aF.el, b.aF.hand, B.foreW, FAR), seg(b.hip, b.lF.k, B.thighW, FAR), seg(b.lF.k, b.lF.a, B.shinW, FAR)];
  const torso = [seg(b.hip, b.neck, B.torsoW, NEAR)];
  const front = [seg(b.hip, b.lN.k, B.thighW, NEAR), seg(b.lN.k, b.lN.a, B.shinW, NEAR)];
  const armN = [seg(b.sh, b.aN.el, B.upperW, NEAR), seg(b.aN.el, b.aN.hand, B.foreW, NEAR)];
  const head = T(b.head);
  // helmet dome + brim, lamp and beam (computed in local space, then mirrored)
  const r = B.headR + 2.5;
  const dome = Array.from({length: 13}, (_, i) => T(add(b.head, dir(b.HA - 95 + (190 * i) / 12), r)));
  const brimA = T(add(b.head, dir(b.HA - 95), r)), brimB = T(add(add(b.head, dir(b.HA - 95), r), dir(b.HA - 90), 9 * S));
  const lampL = add(b.head, dir(b.HA - 55), r);
  const lamp = T(lampL);
  const beamA = b.HA - 96;
  const beam = [lamp, T(add(lampL, dir(beamA - 15), 340)), T(add(lampL, dir(beamA + 15), 340))];
  const chest = T(add(b.hip, dir(180 - st.p.lean), B.torso * 0.6));
  const holding = f < m.release;
  const held = holding ? pickPts(b.aN.hand, b.aN.a2 + 50) : null;
  const all = [...back, ...torso, ...front, ...armN];
  return (
    <g>
      <radialGradient id={`beam${m.id}`} cx={lamp.x} cy={lamp.y} r={340} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
      </radialGradient>
      <circle cx={chest.x} cy={chest.y} r={230} fill="url(#aura)" />
      <polygon points={beam.map((q) => `${q.x},${q.y}`).join(" ")} fill={`url(#beam${m.id})`} />
      <g opacity={0.45} filter="url(#heroGlow)">
        {all.map((s, i) => <Seg key={i} {...s} c="#FFFFFF" />)}
        <circle cx={head.x} cy={head.y} r={B.headR} fill="#FFFFFF" />
      </g>
      {back.map((s, i) => <Seg key={"b" + i} {...s} />)}
      {torso.map((s, i) => <Seg key={"t" + i} {...s} />)}
      <circle cx={head.x} cy={head.y} r={B.headR} fill="url(#headShade)" />
      <path d={`M${dome.map((q) => `${q.x},${q.y}`).join(" L")} Z`} fill="#BDBDBD" />
      <line x1={brimA.x} y1={brimA.y} x2={brimB.x} y2={brimB.y} stroke="#BDBDBD" strokeWidth={4 * S} strokeLinecap="round" />
      <circle cx={lamp.x} cy={lamp.y} r={4.5 * S} fill="#FFFFFF" />
      {front.map((s, i) => <Seg key={"f" + i} {...s} />)}
      {held && <PickShape p={held} T={T} />}
      {armN.map((s, i) => <Seg key={"a" + i} {...s} />)}
    </g>
  );
};

const Diamond: React.FC<{x: number; y: number; s: number; op?: number}> = ({x, y, s, op = 1}) => {
  const p = (u: number, v: number) => `${(x + u * s).toFixed(1)},${(y + v * s).toFixed(1)}`;
  return (
    <g opacity={op}>
      <polygon points={[p(-0.5, -0.12), p(-0.28, -0.42), p(0.28, -0.42), p(0.5, -0.12), p(0, 0.55)].join(" ")} fill={CYAN} filter="url(#gemGlow)" opacity={0.8} />
      <polygon points={[p(-0.5, -0.12), p(-0.28, -0.42), p(-0.1, -0.12)].join(" ")} fill="#9BF1FF" />
      <polygon points={[p(-0.28, -0.42), p(0.28, -0.42), p(0.1, -0.12), p(-0.1, -0.12)].join(" ")} fill="#D9FBFF" />
      <polygon points={[p(0.28, -0.42), p(0.5, -0.12), p(0.1, -0.12)].join(" ")} fill="#5FDDF7" />
      <polygon points={[p(-0.5, -0.12), p(-0.1, -0.12), p(0, 0.55)].join(" ")} fill="#2FB8E0" />
      <polygon points={[p(-0.1, -0.12), p(0.1, -0.12), p(0, 0.55)].join(" ")} fill="#7EE9FF" />
      <polygon points={[p(0.1, -0.12), p(0.5, -0.12), p(0, 0.55)].join(" ")} fill="#1C93C2" />
    </g>
  );
};

// rock texture (static, seeded)
const STONES = (() => {
  const r = rng(42);
  return Array.from({length: 170}, () => ({x: -300 + r() * 1700, y: SURFACE + 14 + r() * 1100, w: 6 + r() * 22, h: 4 + r() * 12, c: r() > 0.5 ? "#1D1D1D" : "#101010"}));
})();

const Rock: React.FC = () => (
  <g>
    <rect x={-500} y={SURFACE} width={2100} height={2400} fill={ROCK} />
    {STONES.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.h / 2} fill={s.c} />)}
    {Array.from({length: 36}, (_, i) => <line key={"v" + i} x1={-420 + i * CELL} y1={SURFACE} x2={-420 + i * CELL} y2={2600} stroke={GRID} strokeWidth={2} />)}
    {Array.from({length: 36}, (_, i) => <line key={"h" + i} x1={-500} y1={SURFACE + i * CELL} x2={1600} y2={SURFACE + i * CELL} stroke={GRID} strokeWidth={2} />)}
  </g>
);

const Tunnel: React.FC<{m: Miner; f: number}> = ({m, f}) => {
  const face = faceAt(m, f), top = m.floor - TUNNEL_H;
  const breaking = m.evs.filter((e) => e.kind === "break" && f >= e.f && f < e.f + 8);
  return (
    <g>
      <rect x={SHAFT.x1 - 2} y={top} width={face - SHAFT.x1 + 2} height={TUNNEL_H} fill="#030303" />
      <line x1={SHAFT.x1} y1={top} x2={face} y2={top} stroke="#3A3A3A" strokeWidth={4} />
      <line x1={SHAFT.x1} y1={m.floor} x2={face} y2={m.floor} stroke="#6A6A6A" strokeWidth={5} />
      <line x1={face} y1={top} x2={face} y2={m.floor} stroke="#3A3A3A" strokeWidth={4} />
      {breaking.map((e) => {
        const op = 1 - EIO(clamp01((f - e.f) / 8));
        return (
          <g key={e.col} opacity={op}>
            <rect x={e.col} y={top} width={CELL} height={TUNNEL_H} fill={ROCK} />
            {[1, 2, 3].map((k) => <line key={k} x1={e.col} y1={top + k * CELL} x2={e.col + CELL} y2={top + k * CELL} stroke={GRID} strokeWidth={2} />)}
            <line x1={e.col} y1={top} x2={e.col} y2={m.floor} stroke="#3A3A3A" strokeWidth={4} />
          </g>
        );
      })}
    </g>
  );
};

const Cracks: React.FC<{m: Miner; f: number}> = ({m, f}) => {
  const out: React.ReactNode[] = [];
  for (const e of m.evs) {
    if (e.kind !== "crack" || f < e.f) continue;
    const br = m.evs.find((b) => b.kind === "break" && b.col === e.col);
    const op = br ? 1 - EIO(clamp01((f - br.f) / 8)) : 1;
    if (op <= 0) continue;
    const level = m.evs.filter((c) => c.kind === "crack" && c.col === e.col && c.f < e.f).length;
    const p = EO(clamp01((f - e.f) / 5));
    crackPaths(m, e, level).forEach((d, j) =>
      out.push(
        <g key={`${e.col}-${level}-${j}`} opacity={op} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} transform="translate(1 1.5)" stroke="#333333" strokeWidth={1.6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
          <path d={d} stroke="#000000" strokeWidth={3.6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} />
        </g>,
      ),
    );
  }
  return <g>{out}</g>;
};

const Sparks: React.FC<{m: Miner; f: number}> = ({m, f}) => (
  <g>
    {m.evs.filter((e) => f >= e.f && f < e.f + 7).map((e) => {
      const t = (f - e.f) / 7, o = {x: e.col, y: impactY(m)};
      return (
        <g key={e.f} opacity={1 - t} stroke="#FFFFFF" strokeLinecap="round">
          <circle cx={o.x} cy={o.y} r={10 + 22 * t} fill="#FFFFFF" opacity={0.25} stroke="none" />
          {[205, 235, 260, 285, 315, 335].map((a, i) => {
            const p1 = add(o, dir(a), 6 + 14 * t), p2 = add(o, dir(a), 14 + 30 * t + (i % 2) * 6);
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} strokeWidth={3} />;
          })}
        </g>
      );
    })}
  </g>
);

const Rubble: React.FC<{m: Miner; f: number}> = ({m, f}) => (
  <g>
    {m.evs.filter((e) => e.kind === "break" && f >= e.f).flatMap((e) =>
      chunks(m, e, f).map((c, i) => (
        <rect key={`${e.col}-${i}`} x={c.x - c.s / 2} y={c.y - c.s / 2} width={c.s} height={c.s * 0.8} rx={2} fill={c.c}
          transform={`rotate(${c.rot.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)})`} />
      )),
    )}
  </g>
);

const Headframe: React.FC = () => (
  <g stroke={LINE} strokeWidth={6} strokeLinecap="round" fill="none">
    <line x1={-500} y1={SURFACE} x2={SHAFT.x0} y2={SURFACE} strokeWidth={8} />
    <line x1={SHAFT.x1} y1={SURFACE} x2={1600} y2={SURFACE} strokeWidth={8} />
    <line x1={78} y1={SURFACE} x2={130} y2={428} />
    <line x1={182} y1={SURFACE} x2={130} y2={428} />
    <line x1={98} y1={480} x2={162} y2={480} strokeWidth={4} />
    <circle cx={130} cy={436} r={14} strokeWidth={4} />
    <line x1={130} y1={450} x2={130} y2={640} stroke="#5A5A5A" strokeWidth={3} />
  </g>
);

const Shaft: React.FC = () => (
  <g>
    <rect x={SHAFT.x0} y={SURFACE} width={SHAFT.x1 - SHAFT.x0} height={BOT.floor - SURFACE} fill="#030303" />
    <line x1={SHAFT.x0} y1={SURFACE} x2={SHAFT.x0} y2={BOT.floor} stroke="#3A3A3A" strokeWidth={4} />
    <line x1={SHAFT.x1} y1={SURFACE} x2={SHAFT.x1} y2={TOP.floor - TUNNEL_H} stroke="#3A3A3A" strokeWidth={4} />
    <line x1={SHAFT.x1} y1={TOP.floor} x2={SHAFT.x1} y2={BOT.floor - TUNNEL_H} stroke="#3A3A3A" strokeWidth={4} />
    <g stroke="#4A4A4A" strokeWidth={3}>
      <line x1={108} y1={SURFACE} x2={108} y2={BOT.floor} />
      <line x1={152} y1={SURFACE} x2={152} y2={BOT.floor} />
      {Array.from({length: 18}, (_, i) => <line key={i} x1={108} y1={SURFACE + 24 + i * 40} x2={152} y2={SURFACE + 24 + i * 40} />)}
    </g>
  </g>
);

// ---------- text ----------
type Word = {t: string; color?: string; weight?: number; glow?: string};
const Line: React.FC<{f: number; words: Word[]; start: number; y: number; size?: number; op?: number}> = ({f, words, start, y, size = 56, op = 1}) => (
  <div style={{position: "absolute", left: 70, right: 70, top: y, display: "flex", justifyContent: "center", gap: size * 0.28, opacity: op,
    fontFamily: FONT, fontSize: size, letterSpacing: -0.5, lineHeight: 1.1}}>
    {words.map((w, i) => {
      const p = win(f, start + i * 0.12, start + i * 0.12 + 0.42, EO);
      return (
        <span key={i} style={{opacity: p, transform: `translateY(${(1 - p) * 20}px)`, filter: `blur(${(1 - p) * 9}px)`,
          color: w.color ?? "#FFFFFF", fontWeight: w.weight ?? 600, textShadow: w.glow ? `0 0 24px ${w.glow}, 0 0 5px ${w.glow}` : "none"}}>
          {w.t}
        </span>
      );
    })}
  </div>
);
const ws = (s: string): Word[] => s.split(" ").map((t) => ({t}));

// ---------- camera ----------
const CAM = [
  {t: 0, x: 540, y: 960, s: 1}, {t: 3.2, x: 540, y: 960, s: 1},
  {t: 4.0, x: 610, y: 770, s: 1.28}, {t: 4.7, x: 610, y: 770, s: 1.28},
  {t: 5.5, x: 600, y: 990, s: 1.1}, {t: 7.2, x: 600, y: 990, s: 1.1},
  {t: 8.3, x: 540, y: 960, s: 1},
];
function camAt(f: number) {
  const t = f / FPS;
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i], b = CAM[i + 1];
    if (t <= b.t) {const e = EIO(clamp01((t - a.t) / (b.t - a.t))); return {x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), s: lerp(a.s, b.s, e)};}
  }
  return CAM[CAM.length - 1];
}

// ---------- film ----------
const D_TOP = {x: 750, y: impactY(TOP) + 6};
const D_MID = {x: 806, y: 948};
const D_BOT = {x: 750, y: impactY(BOT) + 6};
const POP = BOT.evs.find((e) => e.kind === "pop")!.f;
const EXPOSE = BOT.evs.filter((e) => e.kind === "break").slice(-1)[0].f;
const FLY = 15;

const Film: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    Promise.all([document.fonts.load(`600 56px 'Manrope Variable'`), document.fonts.load(`800 56px 'Manrope Variable'`)]).then(() => continueRender(handle));
  }, [handle]);

  const cam = camAt(f);
  const shake = [...TOP.evs, ...BOT.evs].filter((e) => e.kind !== "crack" && f >= e.f && f < e.f + 9)
    .reduce((s, e) => s + 5 * Math.exp(-(f - e.f) / 2.2) * Math.sin((f - e.f) * 2.4), 0);
  const fade = win(f, 0, 0.3) * (1 - win(f, 9.6, 10));

  // top: the diamond was one block away
  const reveal = win(f, 3.85, 4.45, EO);
  const blockPulse = reveal * (0.55 + 0.25 * Math.sin((f / FPS) * Math.PI * 2 * 1.2));
  // bottom: exposed, then pops into the raised hands
  const exposed = clamp01((f - EXPOSE) / 8);
  const bst = minerAt(BOT, f);
  const bb = build(bst.p);
  const hands = {x: (bb.aN.hand.x + bb.aF.hand.x) / 2, y: (bb.aN.hand.y + bb.aF.hand.y) / 2 - 14};
  const fu = clamp01((f - POP) / FLY);
  const gem = f < POP ? D_BOT : {x: lerp(D_BOT.x, hands.x, EIO(fu)), y: lerp(D_BOT.y, hands.y, EIO(fu)) - 70 * Math.sin(Math.PI * fu)};
  const burst = clamp01((f - POP - FLY) / 16);
  const caught = f >= POP + FLY;

  return (
    <AbsoluteFill style={{background: "#000"}}>
      <AbsoluteFill style={{opacity: fade}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <radialGradient id="aura"><stop offset="0" stopColor="#FFFFFF" stopOpacity={0.1} /><stop offset="1" stopColor="#FFFFFF" stopOpacity={0} /></radialGradient>
            <radialGradient id="cyanLight"><stop offset="0" stopColor={CYAN} stopOpacity={0.38} /><stop offset="0.5" stopColor={CYAN} stopOpacity={0.1} /><stop offset="1" stopColor={CYAN} stopOpacity={0} /></radialGradient>
            <radialGradient id="headShade" cx="0.38" cy="0.35" r="0.75"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D6D6D6" /></radialGradient>
            <linearGradient id="deep" x1="0" y1="1260" x2="0" y2="1800" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.85} /></linearGradient>
            <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
            <filter id="gemGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9" /></filter>
          </defs>
          <g transform={`translate(${540 + shake * 0.6} ${960 + shake}) scale(${cam.s}) translate(${-cam.x} ${-cam.y})`}>
            <Rock />
            <rect x={-500} y={1260} width={2100} height={1400} fill="url(#deep)" />
            <Shaft />
            <Headframe />
            {[TOP, BOT].map((m) => <Tunnel key={m.id} m={m} f={f} />)}
            {[TOP, BOT].map((m) => <Cracks key={m.id} m={m} f={f} />)}

            {/* top: x-ray reveal of what was one block away */}
            <g opacity={reveal}>
              <circle cx={D_TOP.x} cy={D_TOP.y} r={200} fill="url(#cyanLight)" />
              <circle cx={D_MID.x} cy={D_MID.y} r={110} fill="url(#cyanLight)" opacity={0.6} />
              <Diamond x={D_TOP.x} y={D_TOP.y} s={46} />
              <Diamond x={D_MID.x} y={D_MID.y} s={28} op={0.75} />
            </g>
            <rect x={660 + 4} y={TOP.floor - TUNNEL_H + 4} width={CELL - 8} height={TUNNEL_H - 8} fill="none" stroke="#FFFFFF"
              strokeWidth={3} strokeDasharray="12 9" opacity={blockPulse} />

            {/* bottom diamond: hidden in the rock, exposed by the last block, then caught */}
            {f >= EXPOSE && (
              <g>
                <circle cx={gem.x} cy={gem.y} r={caught ? 260 + 40 * Math.sin(f / 9) : 190} fill="url(#cyanLight)" opacity={exposed} />
                {f >= POP && <ellipse cx={D_BOT.x} cy={D_BOT.y + 2} rx={18} ry={20} fill="#0A0A0A" stroke="#2C2C2C" strokeWidth={3} opacity={exposed} />}
                <Diamond x={gem.x} y={gem.y} s={46} op={exposed} />
              </g>
            )}
            {caught && (
              <g>
                <circle cx={gem.x} cy={gem.y} r={30 + 170 * EO(burst)} fill="none" stroke={CYAN} strokeWidth={6} opacity={0.7 * (1 - burst)} />
                <g opacity={0.55 * EO(burst)} stroke={CYAN} strokeWidth={4} strokeLinecap="round">
                  {Array.from({length: 8}, (_, i) => {
                    const a = i * 45 + f * 0.8, p1 = add(gem, dir(a), 46), p2 = add(gem, dir(a), 46 + (i % 2 ? 22 : 38));
                    return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} />;
                  })}
                </g>
              </g>
            )}

            {[TOP, BOT].map((m) => <Rubble key={m.id} m={m} f={f} />)}
            {[TOP, BOT].map((m) => f >= m.release && <PickShape key={m.id} p={pickFall(m, f)} />)}
            <MinerView m={TOP} f={f} />
            <MinerView m={BOT} f={f} />
            {caught && <Diamond x={gem.x} y={gem.y} s={46} />}
            {[TOP, BOT].map((m) => <Sparks key={m.id} m={m} f={f} />)}
            {/* spotlight: while the camera looks at the top tunnel, the bottom one sinks into the dark (it sits in the platform-UI zone then) */}
            <rect x={SHAFT.x1 - 4} y={BOT.floor - TUNNEL_H - 14} width={1200} height={TUNNEL_H + 40} fill="#000"
              opacity={0.78 * win(f, 3.2, 3.8) * (1 - win(f, 4.6, 5.2))} />
          </g>
        </svg>
        <Line f={f} words={ws("Two miners. Same rock.")} start={0.25} y={300} op={1 - win(f, 2.85, 3.15)} />
        <Line f={f} words={ws("Most people quit")} start={3.2} y={300} op={1 - win(f, 6.2, 6.5)} />
        <Line f={f} words={ws("right before it works.")} start={4.05} y={366} op={1 - win(f, 6.2, 6.5)} />
        <Line f={f} words={[{t: "Keep", weight: 800}, {t: "digging.", weight: 800, color: CYAN, glow: "rgba(70,226,255,0.6)"}]} start={6.55} y={318} size={84} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition id="StyleLab" component={Film} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
));
