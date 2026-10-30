// Style lab · «Стикмен» (preview v1, 5 s). Black-and-white stick figure with soft glow; one colour accent
// (yellow flag + the word "view"). Deterministic: everything derives from useCurrentFrame().
// Rules: work/style-lab/stickman/STYLE.md (observations of one reference Reel, not model training).
import React, {useEffect, useState} from "react";
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame, interpolate, Easing, delayRender, continueRender} from "remotion";
import "@fontsource-variable/manrope";

const FPS = 30, W = 1080, H = 1920, DURATION = 150;
const FONT = "'Manrope Variable', Manrope, sans-serif";

// ---------- palette ----------
const BG = "#000000";
const LINE = "#7A7A7A";
const NEAR = "#FFFFFF";
const FAR = "#8F8F8F"; // far limbs read by tone only (no outlines)
const ACCENT = "#FFC83D";

// ---------- helpers ----------
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t);};
const EIO = Easing.bezier(0.45, 0, 0.2, 1);
const EO = Easing.bezier(0.16, 0.8, 0.3, 1);
const win = (f: number, a: number, b: number, e = EIO) =>
  interpolate(f, [a * FPS, b * FPS], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e});
const D = Math.PI / 180;

// ---------- world: one mountain ----------
const BASE = {x: 160, y: 1240};
const PEAK = {x: 830, y: 900};
const FAR_END = {x: 1140, y: 1150};
const SLOPE = (BASE.y - PEAK.y) / (PEAK.x - BASE.x);
const groundY = (x: number) =>
  x <= BASE.x ? BASE.y : x <= PEAK.x ? BASE.y - SLOPE * (x - BASE.x) : PEAK.y + ((FAR_END.y - PEAK.y) / (FAR_END.x - PEAK.x)) * (x - PEAK.x);
const onSlope = (x: number) => smooth(BASE.x - 40, BASE.x + 60, x);

// ---------- body ----------
const S = 1.25; // body scale
const B = {headR: 25 * S, gap: 6 * S, torso: 84 * S, torsoW: 30 * S, upper: 50 * S, upperW: 17 * S, fore: 47 * S, foreW: 15 * S, thigh: 67 * S, thighW: 20 * S, shin: 65 * S, shinW: 18 * S};
const STRIDE = 70; // horizontal step length
const STANCE = 0.6;

// Body x per frame: walks on the flat, slows down on the slope (cumulative, deterministic).
const XS: number[] = (() => {
  const xs = [96];
  for (let i = 1; i <= DURATION; i++) {
    const x = xs[i - 1];
    const v = lerp(180, 108, onSlope(x));
    xs.push(x + v / FPS);
  }
  return xs;
})();

type P = {x: number; y: number};
function foot(xb: number, off: number): {p: P; stance: boolean} {
  const C = 2 * STRIDE;
  const q = (xb - off) / C;
  const k = Math.floor(q);
  const ph = q - k;
  const a = off + k * C + STANCE * STRIDE;
  if (ph < STANCE) return {p: {x: a, y: groundY(a)}, stance: true};
  const u = (ph - STANCE) / (1 - STANCE);
  const e = u * u * (3 - 2 * u);
  const b = a + C;
  const x = lerp(a, b, e);
  const line = lerp(groundY(a), groundY(b), e);
  const lift = lerp(15, 17, onSlope(xb)) * Math.sin(Math.PI * u);
  return {p: {x, y: Math.min(line, groundY(x)) - lift}, stance: false};
}

function knee(h: P, a: P, l1: number, l2: number): {k: P; a: P} {
  let dx = a.x - h.x, dy = a.y - h.y;
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.5;
  if (d > max) {a = {x: h.x + (dx / d) * max, y: h.y + (dy / d) * max}; dx = a.x - h.x; dy = a.y - h.y; d = max;}
  const base = Math.atan2(dy, dx);
  const al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const c1 = {x: h.x + l1 * Math.cos(base + al), y: h.y + l1 * Math.sin(base + al)};
  const c2 = {x: h.x + l1 * Math.cos(base - al), y: h.y + l1 * Math.sin(base - al)};
  return {k: c1.x > c2.x ? c1 : c2, a}; // knee points forward (+x)
}

type Seg = {a: P; b: P; w: number; c: string};
function pose(f: number) {
  const xb = XS[Math.min(DURATION, f)];
  const sl = onSlope(xb);
  const cap = B.shinW / 2;
  const fN = foot(xb, STRIDE), fF = foot(xb, 0);
  const ankN = {x: fN.p.x, y: fN.p.y - cap}, ankF = {x: fF.p.x, y: fF.p.y - cap};
  // hip height: walking height above the feet, lowered when a stance foot needs reach (uphill crouch)
  const C = 2 * STRIDE;
  const phase = (((xb - STRIDE) / C) % 1 + 1) % 1;
  const bob = 4 * Math.cos(4 * Math.PI * (phase - STANCE / 2));
  let hipY = (groundY(xb - 8) - cap) - lerp(156, 154, sl) - bob;
  const reach = B.thigh + B.shin - 3;
  for (const s of [{f: fN, a: ankN}, {f: fF, a: ankF}]) {
    if (!s.f.stance) continue;
    const dx = s.a.x - xb;
    const need = s.a.y - Math.sqrt(Math.max(0, reach * reach - dx * dx));
    hipY = Math.max(hipY, Math.min(need, hipY + 4)); // at most a small dip; the back leg lifts off like a toe-off
  }
  const hip = {x: xb, y: hipY};
  const lean = lerp(7, 24, sl) * D + 1.5 * D * Math.sin(4 * Math.PI * phase);
  const up = {x: Math.sin(lean), y: -Math.cos(lean)};
  const neck = {x: hip.x + up.x * B.torso, y: hip.y + up.y * B.torso};
  const head = {x: neck.x + up.x * (B.torsoW / 2 + B.gap + B.headR), y: neck.y + up.y * (B.torsoW / 2 + B.gap + B.headR)};
  const sh = {x: neck.x - up.x * 4, y: neck.y - up.y * 4};
  const legN = knee(hip, ankN, B.thigh, B.shin);
  const legF = knee(hip, ankF, B.thigh, B.shin);
  const amp = lerp(30, 38, sl) * D;
  const off = (p: P) => Math.max(-1, Math.min(1, (p.x - xb) / (STANCE * STRIDE)));
  const arm = (d: number) => {
    const a1 = lean * 0.45 + amp * d;
    const el = {x: sh.x + Math.sin(a1) * B.upper, y: sh.y + Math.cos(a1) * B.upper};
    const a2 = a1 + (lerp(28, 50, sl) + 22 * Math.max(0, d)) * D;
    const hand = {x: el.x + Math.sin(a2) * B.fore, y: el.y + Math.cos(a2) * B.fore};
    return {el, hand};
  };
  const armN = arm(off(fF.p)); // near arm swings with the far leg
  const armF = arm(off(fN.p));
  const back: Seg[] = [
    {a: sh, b: armF.el, w: B.upperW, c: FAR}, {a: armF.el, b: armF.hand, w: B.foreW, c: FAR},
    {a: hip, b: legF.k, w: B.thighW, c: FAR}, {a: legF.k, b: legF.a, w: B.shinW, c: FAR},
  ];
  const body: Seg[] = [{a: hip, b: neck, w: B.torsoW, c: NEAR}];
  const front: Seg[] = [
    {a: hip, b: legN.k, w: B.thighW, c: NEAR}, {a: legN.k, b: legN.a, w: B.shinW, c: NEAR},
    {a: sh, b: armN.el, w: B.upperW, c: NEAR}, {a: armN.el, b: armN.hand, w: B.foreW, c: NEAR},
  ];
  return {xb, hip, head, sl, back, body, front};
}

// ---------- pieces ----------
const Capsule: React.FC<{s: Seg; glow?: boolean}> = ({s, glow}) => (
  <g strokeLinecap="round">
    <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} stroke={glow ? "#FFFFFF" : s.c} strokeWidth={s.w} />
  </g>
);

const Stickman: React.FC<{f: number}> = ({f}) => {
  const p = pose(f);
  const all = [...p.back, ...p.body, ...p.front];
  return (
    <g>
      {/* soft light around the hero */}
      <g opacity={0.5} filter="url(#heroGlow)">
        {all.map((s, i) => <Capsule key={i} s={s} glow />)}
        <circle cx={p.head.x} cy={p.head.y} r={B.headR} fill="#FFFFFF" />
      </g>
      {p.back.map((s, i) => <Capsule key={"b" + i} s={s} />)}
      {p.body.map((s, i) => <Capsule key={"t" + i} s={s} />)}
      <circle cx={p.head.x} cy={p.head.y} r={B.headR} fill="url(#headShade)" />
      {p.front.map((s, i) => <Capsule key={"f" + i} s={s} />)}
    </g>
  );
};

const Flag: React.FC<{f: number; pulse: number}> = ({f, pulse}) => {
  const t = f / FPS;
  const px = PEAK.x, top = PEAK.y - 165;
  const n = 10, wFlag = 98, hFlag = 62;
  const wave = (i: number) => (i / n) * 9 * Math.sin(t * 5.2 - i * 0.75);
  const topPts = Array.from({length: n + 1}, (_, i) => `${px + 3 + (wFlag * i) / n},${top + 4 + wave(i)}`);
  const botPts = Array.from({length: n + 1}, (_, i) => `${px + 3 + (wFlag * (n - i)) / n},${top + 4 + hFlag + wave(n - i)}`);
  const d = `M${topPts.join(" L")} L${botPts.join(" L")} Z`;
  return (
    <g>
      <circle cx={px + 40} cy={top + 50} r={260} fill="url(#flagHalo)" opacity={0.55 + 0.45 * pulse} />
      <line x1={px} y1={PEAK.y - 4} x2={px} y2={top} stroke="#D9D9D9" strokeWidth={7} strokeLinecap="round" />
      <path d={d} fill={ACCENT} opacity={0.9} filter="url(#flagGlow)" />
      <path d={d} fill="url(#flagShade)" />
    </g>
  );
};

const Mountain: React.FC = () => {
  const ridge = `M-60,${BASE.y} L${BASE.x},${BASE.y} L${PEAK.x},${PEAK.y} L${FAR_END.x},${FAR_END.y}`;
  return (
    <g>
      <path d={`${ridge} L1140,1920 L-60,1920 Z`} fill="url(#rock)" />
      {/* faint strata give the rock some volume */}
      <path d={`M${PEAK.x - 40},${PEAK.y + 70} L${PEAK.x - 210},${PEAK.y + 330} M${PEAK.x + 30},${PEAK.y + 90} L${PEAK.x - 60},${PEAK.y + 420}`}
        stroke="#1E1E1E" strokeWidth={5} strokeLinecap="round" fill="none" />
      <path d={ridge} stroke={LINE} strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" fill="none" />
    </g>
  );
};

// ---------- text: word-by-word soft reveal ----------
type Word = {t: string; color?: string; weight?: number; glow?: string};
const Line: React.FC<{f: number; words: Word[]; start: number; y: number; dim?: number}> = ({f, words, start, y, dim = 1}) => (
  <div style={{position: "absolute", left: 70, right: 70, top: y, display: "flex", justifyContent: "center", gap: 16, opacity: dim,
    fontFamily: FONT, fontSize: 58, letterSpacing: -0.5, lineHeight: 1.1}}>
    {words.map((w, i) => {
      const p = win(f, start + i * 0.13, start + i * 0.13 + 0.42, EO);
      return (
        <span key={i} style={{opacity: p, transform: `translateY(${(1 - p) * 20}px)`, filter: `blur(${(1 - p) * 9}px)`,
          color: w.color ?? "#FFFFFF", fontWeight: w.weight ?? 600, textShadow: w.glow ? `0 0 22px ${w.glow}, 0 0 4px ${w.glow}` : "none"}}>
          {w.t}
        </span>
      );
    })}
  </div>
);

const LINE1: Word[] = [{t: "Everyone"}, {t: "wants"}, {t: "the"}, {t: "view.", color: ACCENT, weight: 800, glow: "rgba(255,200,61,0.55)"}];
const LINE2: Word[] = [{t: "Nobody"}, {t: "wants"}, {t: "the"}, {t: "climb.", weight: 800, glow: "rgba(255,255,255,0.45)"}];

const Film: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("fonts"));
  useEffect(() => {
    document.fonts.load(`600 58px 'Manrope Variable'`).then(() => document.fonts.load(`800 58px 'Manrope Variable'`)).then(() => continueRender(handle));
  }, [handle]);

  const p = pose(f);
  const fadeIn = win(f, 0, 0.3);
  const fadeOut = 1 - win(f, 4.68, 5.0);
  // the yellow word and the flag pulse together
  const viewAt = 0.3 + 3 * 0.13;
  const pulse = win(f, viewAt, viewAt + 0.35, EO) * (1 - 0.6 * win(f, viewAt + 0.35, viewAt + 1.3));
  const zoom = lerp(1, 1.04, win(f, 0, 5, Easing.linear));
  const spotAng = Math.atan(SLOPE) * p.sl;
  const dim = 1 - 0.4 * win(f, 2.0, 2.6);

  return (
    <AbsoluteFill style={{background: BG}}>
      <AbsoluteFill style={{opacity: fadeIn * fadeOut}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="rock" x1="0" y1={PEAK.y} x2="0" y2={H} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1A1A1A" />
              <stop offset="0.55" stopColor="#0A0A0A" />
              <stop offset="1" stopColor="#030303" />
            </linearGradient>
            <radialGradient id="flagHalo">
              <stop offset="0" stopColor={ACCENT} stopOpacity={0.32} />
              <stop offset="0.45" stopColor={ACCENT} stopOpacity={0.08} />
              <stop offset="1" stopColor={ACCENT} stopOpacity={0} />
            </radialGradient>
            <linearGradient id="flagShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFE7A3" />
              <stop offset="0.6" stopColor={ACCENT} />
              <stop offset="1" stopColor="#E59E12" />
            </linearGradient>
            <radialGradient id="spot">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="aura">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.09} />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </radialGradient>
            <radialGradient id="headShade" cx="0.38" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="1" stopColor="#D6D6D6" />
            </radialGradient>
            <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
            <filter id="flagGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="10" /></filter>
          </defs>
          <g transform={`translate(540 1020) scale(${zoom}) translate(-540 -1020)`}>
            <Mountain />
            <Flag f={f} pulse={pulse} />
            <circle cx={p.xb + 10} cy={p.hip.y - 30} r={340} fill="url(#aura)" />
            <ellipse cx={p.xb} cy={groundY(p.xb)} rx={200} ry={40} fill="url(#spot)"
              transform={`rotate(${(-spotAng * 180) / Math.PI} ${p.xb} ${groundY(p.xb)})`} />
            <Stickman f={f} />
          </g>
        </svg>
        <Line f={f} words={LINE1} start={0.3} y={390} dim={dim} />
        <Line f={f} words={LINE2} start={2.15} y={480} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

registerRoot(() => (
  <Composition id="StyleLab" component={Film} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
));
