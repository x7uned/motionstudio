// Style lab · «Карандашный скетчбук». Deterministic: everything derives from useCurrentFrame();
// every Rough.js shape has a fixed seed (line boil = one of 3 seeds, switched every 4 frames).
import React, {useEffect, useState} from "react";
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame, interpolate, Easing, delayRender, continueRender} from "remotion";
import rough from "roughjs";
import type {Drawable, Options} from "roughjs/bin/core";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import story from "../../../work/style-lab/story.json";

const FPS = 30;
const W = 1080, H = 1920;

// ---------- palette ----------
const PAPER = "#F4EEDF";
const NOTE = "#FFFCF4";
const GRID = "#9DBFD6";
const MARGIN = "#E39D92";
const INK = "#2F2B27";
const GRAPH = "#5E5850";
const FAINT = "#ADA497";
const NEUTRAL = "#B9AE9C"; // infrastructure hatch
const ACCENT = "#8D59DA"; // brand purple
const MARKER = "#F4CA50"; // brand yellow highlighter
const PK = [
  {n: 1, txt: "Пр", fill: "#F3A97A", dark: "#DD7440", rot: -4, rot2: -3},
  {n: 2, txt: "ив", fill: "#86D3AF", dark: "#2E9F70", rot: 3, rot2: 5},
  {n: 3, txt: "ет", fill: "#8EC0EC", dark: "#3C82C4", rot: -2, rot2: 2},
  {n: 4, txt: "!", fill: "#BFA3EE", dark: "#8D59DA", rot: 5, rot2: -4},
];
const FONT = "Caveat";

// ---------- time helpers ----------
const EIO = Easing.bezier(0.45, 0, 0.2, 1);
const EO = Easing.bezier(0.2, 0.7, 0.25, 1);
const win = (f: number, a: number, b: number, e = EIO) =>
  interpolate(f, [a * FPS, b * FPS], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e});
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------- rough cache ----------
const G = rough.generator();
type Sk = {outline: string[]; hatch: string[]};
const cache = new Map<string, Sk>();
const splitSub = (d: string) => d.split(/(?=M)/).filter((s) => s.trim().length > 0);
function sk(key: string, seed: number, make: (o: Options) => Drawable): Sk {
  const k = key + "|" + seed;
  const hit = cache.get(k);
  if (hit) return hit;
  const dr = make({seed});
  const outline: string[] = [];
  const hatch: string[] = [];
  for (const set of dr.sets) {
    const d = G.opsToPath(set, 2);
    if (set.type === "path") outline.push(...splitSub(d));
    else if (set.type === "fillSketch") hatch.push(...splitSub(d));
  }
  const r = {outline, hatch};
  cache.set(k, r);
  return r;
}
const boil = (f: number, base: number) => base + (Math.floor(f / 4) % 3) * 7919;

// draw-on renderer for a list of sub-paths
const Lines: React.FC<{
  ds: string[]; p?: number; color: string; width: number; opacity?: number; stagger?: number; nonScaling?: boolean; dash?: string;
}> = ({ds, p = 1, color, width, opacity = 1, stagger = 0.55, nonScaling, dash}) => {
  if (p <= 0.001 || opacity <= 0.001 || ds.length === 0) return null;
  const common = {
    fill: "none", stroke: color, strokeWidth: width, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    vectorEffect: nonScaling ? ("non-scaling-stroke" as const) : undefined,
  };
  if (p >= 0.999) return <path d={ds.join(" ")} {...common} opacity={opacity} strokeDasharray={dash} />;
  const n = ds.length;
  return (
    <g opacity={opacity}>
      {ds.map((d, i) => {
        const st = (i / n) * stagger;
        const lp = clamp01((p - st) / (1 - stagger));
        if (lp <= 0.001) return null;
        return <path key={i} d={d} {...common} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - lp} />;
      })}
    </g>
  );
};

// ---------- geometry ----------
const ROWY = 1110, INY = 785, X = [225, 435, 645, 855];
const NW = 172, NH = 140, CH = 170, FS = 128;
const SCRY = 1302;
const R = [{x: 230, y: 985}, {x: 540, y: 950}, {x: 850, y: 985}];
const SERVER = {x: 540, y: 575, w: 280, h: 210};
const PHONE = {x: 865, y: 572, w: 108, h: 188};
const SLOT_OF = [1, 3, 0, 2]; // arrival order 3,1,4,2
const DEP = [8.15, 8.45, 8.0, 8.3];
const ARR = [10.15, 11.25, 9.6, 10.7];
const ROUTES: [number, number][][] = [
  [[X[0], ROWY], [R[0].x, R[0].y], [R[1].x, R[1].y], [X[1], INY]],
  [[X[1], ROWY], [R[0].x, R[0].y], [R[1].x, R[1].y], [R[2].x, R[2].y], [X[3], INY]],
  [[X[2], ROWY], [R[1].x, R[1].y], [X[0], INY]],
  [[X[3], ROWY], [R[2].x, R[2].y], [X[2], INY]],
];
// sampled centripetal-ish catmull-rom splines with arc length
type Spline = {pts: [number, number][]; cum: number[]; len: number};
const splines: Spline[] = ROUTES.map((wp, ri) => {
  const pts: [number, number][] = [];
  const P = [wp[0], ...wp, wp[wp.length - 1]];
  for (let s = 1; s < P.length - 2; s++) {
    const [p0, p1, p2, p3] = [P[s - 1], P[s], P[s + 1], P[s + 2]];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      pts.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(wp[wp.length - 1]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  void ri;
  return {pts, cum, len: cum[cum.length - 1]};
});
function along(sp: Spline, u: number): {x: number; y: number; idx: number} {
  const L = clamp01(u) * sp.len;
  let i = 1;
  while (i < sp.cum.length - 1 && sp.cum[i] < L) i++;
  const a = sp.pts[i - 1], b = sp.pts[i];
  const seg = sp.cum[i] - sp.cum[i - 1] || 1;
  const t = (L - sp.cum[i - 1]) / seg;
  return {x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t), idx: i};
}

// ---------- measurement (font-dependent, deterministic for a given font) ----------
type Meas = {pre: number[]; caps: number[]; label: number};
function measure(): Meas {
  const c = document.createElement("canvas").getContext("2d")!;
  c.font = `700 ${FS}px ${FONT}`;
  const word = PK.map((p) => p.txt);
  const pre = [0];
  for (let i = 0; i < word.length; i++) pre.push(c.measureText(word.slice(0, i + 1).join("")).width);
  c.font = `700 80px ${FONT}`;
  const caps = story.beats.map((b) => c.measureText(b.caption).width);
  return {pre, caps, label: 0};
}

type Pose = {x: number; y: number; w: number; h: number; rot: number};
const blend = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), rot: lerp(a.rot, b.rot, t),
});

const Film: React.FC = () => {
  const f = useCurrentFrame();
  const [m, setM] = useState<Meas | null>(null);
  const [handle] = useState(() => delayRender("caveat"));
  useEffect(() => {
    Promise.all([
      document.fonts.load(`700 ${FS}px ${FONT}`, "Привет!АБВ"),
      document.fonts.load(`700 40px ${FONT}`, "@xtuned abc"),
      document.fonts.load(`400 40px ${FONT}`, "сервер друг abc"),
    ]).then(() => document.fonts.ready).then(() => {
      setM(measure());
      continueRender(handle);
    });
  }, [handle]);
  if (!m) return <AbsoluteFill style={{background: PAPER}} />;
  const t = f / FPS;

  // ----- card geometry -----
  const textW = m.pre[4];
  const PAD = 58;
  const CW = textW + 2 * PAD;
  const tl = -textW / 2;
  const B = [-CW / 2, tl + m.pre[1], tl + m.pre[2], tl + m.pre[3], CW / 2];
  const chunkC = [0, 1, 2, 3].map((i) => tl + (m.pre[i] + m.pre[i + 1]) / 2);
  const sScr = Math.min(0.62, 400 / CW);

  // card pose
  const shudder = t > 3.0 && t < 3.9 ? 3.2 * Math.sin((t - 3.0) * Math.PI * 2 * 4.5) * Math.exp(-(t - 3.0) * 4.2) : 0;
  const lift = win(f, 4.0, 4.85);
  const C = {
    x: 540,
    y: lerp(SCRY, ROWY, lift) - Math.sin(lift * Math.PI) * 40,
    s: lerp(sScr, 1, lift),
    rot: shudder + Math.sin(lift * Math.PI) * -2.5,
  };
  const Cend = {x: 540, y: INY, s: 1, rot: 0};
  const piecePose = (i: number, c: {x: number; y: number; s: number; rot: number}): Pose => {
    const ox = ((B[i] + B[i + 1]) / 2) * c.s;
    const a = (c.rot * Math.PI) / 180;
    return {x: c.x + ox * Math.cos(a), y: c.y + ox * Math.sin(a), w: (B[i + 1] - B[i]) * c.s, h: CH * c.s, rot: c.rot};
  };

  // packet state
  const packet = (i: number) => {
    const sep0 = 5.8 + 0.06 * i;
    const sepM = win(f, sep0, sep0 + 0.6);
    let morph = sepM; // 0 piece, 1 note
    let pose: Pose;
    let scale = 1;
    if (t < 8) {
      const a = piecePose(i, t < 4.9 ? C : {...C, rot: 0});
      const b: Pose = {x: X[i], y: ROWY, w: NW, h: NH, rot: PK[i].rot};
      pose = blend(a, b, sepM);
      pose.y -= Math.sin(sepM * Math.PI) * 26;
    } else {
      pose = {x: X[i], y: ROWY, w: NW, h: NH, rot: PK[i].rot};
    }
    // route
    const u = win(f, DEP[i], ARR[i], EIO);
    if (u > 0) {
      const p = along(splines[i], u);
      const bump = win(f, DEP[i], DEP[i] + 0.35) * (1 - win(f, ARR[i] - 0.3, ARR[i] + 0.05));
      scale = 1 - 0.3 * bump;
      const arrive = win(f, ARR[i] - 0.35, ARR[i] + 0.1);
      pose = {x: p.x, y: p.y, w: NW, h: NH, rot: lerp(PK[i].rot, PK[i].rot2, arrive) + Math.sin(u * Math.PI * 3) * 6 * bump};
    }
    // think wiggle
    const thinkEnv = win(f, 11.45, 11.7) * (1 - win(f, 12.3, 12.55));
    pose.y -= Math.sin((t - 11.45) * Math.PI * 4 + i * 1.3) * 5 * thinkEnv;
    // reorder
    const r0 = 12.5 + [0.0, 0.1, 0.04, 0.14][i];
    const ru = win(f, r0, r0 + 0.75);
    const amp = [-62, -66, 112, 96][i];
    if (ru > 0) {
      const sx = X[SLOT_OF[i]];
      pose = {x: lerp(sx, X[i], ru), y: INY + amp * Math.sin(ru * Math.PI), w: NW, h: NH, rot: lerp(PK[i].rot2, PK[i].rot, ru)};
    }
    // merge
    const mu = win(f, 13.35 + 0.03 * i, 13.95 + 0.03 * i);
    if (mu > 0) {
      pose = blend({x: X[i], y: INY, w: NW, h: NH, rot: PK[i].rot}, piecePose(i, Cend), mu);
      pose.y -= Math.sin(mu * Math.PI) * 18;
      morph = 1 - mu;
    }
    return {pose, morph, scale, u};
  };
  const P = [0, 1, 2, 3].map(packet);

  // card outline visibility
  const cardDraw = win(f, 1.15, 1.75, EO);
  const cutCross = win(f, 5.55, 5.8) * (1 - win(f, 13.85, 14.15));
  const cardPaper = win(f, 1.2, 1.55);
  const textIn = win(f, 1.45, 1.95, EO);

  // ----- layers -----
  return (
    <AbsoluteFill style={{background: PAPER}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", inset: 0}}>
        <defs>
          <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse" x="0" y="12">
            <path d="M54 0H0V54" fill="none" stroke={GRID} strokeWidth="1.3" opacity="0.42" />
          </pattern>
          <radialGradient id="vig" cx="50%" cy="48%" r="75%">
            <stop offset="55%" stopColor="#6b4a22" stopOpacity="0" />
            <stop offset="100%" stopColor="#6b4a22" stopOpacity="0.26" />
          </radialGradient>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0.9 0 0 0 -0.32" />
          </filter>
          <filter id="pencil" x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse">
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="3" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 1.4" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
        </defs>
        {/* paper */}
        <rect width={W} height={H} fill="url(#grid)" />
        <line x1={92} y1={0} x2={92} y2={H} stroke={MARGIN} strokeWidth={2.2} opacity={0.55} />
        <line x1={99} y1={0} x2={99} y2={H} stroke={MARGIN} strokeWidth={1.2} opacity={0.35} />
        <rect width={W} height={H} filter="url(#grain)" opacity={0.5} />
        <rect width={W} height={H} fill="url(#vig)" />

        <g filter="url(#pencil)">
          <Header f={f} />
          <Captions f={f} m={m} />
          <Teaser f={f} />
          <Network f={f} />
          <Laptop f={f} />
          <ServerPhone f={f} />
          <Routers f={f} P={P} />
          <Trails f={f} P={P} />
          <SendUI f={f} />
          {/* single card outline */}
          <g transform={t < 9 ? `translate(${C.x} ${C.y}) rotate(${C.rot}) scale(${C.s})` : `translate(${Cend.x} ${Cend.y})`}>
            <Lines
              ds={sk("card", boil(f, 11), (o) => G.rectangle(-CW / 2, -CH / 2, CW, CH, {...o, roughness: 1.3, bowing: 1.2}))!.outline}
              p={cardDraw}
              color={INK}
              width={3.2 / (t < 9 ? C.s : 1)}
              opacity={1 - cutCross}
            />
          </g>
          <Cuts f={f} B={B} C={C} />
          {/* packets: travelling ones drawn on top */}
          {[0, 1, 2, 3]
            .slice()
            .sort((a, b) => zKey(f, a) - zKey(f, b))
            .map((i) => (
              <Packet key={i} i={i} f={f} st={P[i]} paper={cardPaper} textIn={textIn} outlineOp={cutCross} chunkOff={chunkC[i] - (B[i] + B[i + 1]) / 2} />
            ))}
          <Scissors f={f} B={B} />
          <Finale f={f} cardRight={540 + CW / 2} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const zKey = (f: number, i: number) => {
  const t = f / FPS;
  if (t > 12.5 && t < 13.4) return [1, 0, 3, 2][i];
  if (t >= DEP[i] && t <= ARR[i] + 0.1) return 10 + DEP[i];
  return i;
};

// ---------- header ----------
const Header: React.FC<{f: number}> = ({f}) => {
  const ul = sk("title-ul", boil(f, 3), (o) => G.line(330, 285, 750, 281, {...o, roughness: 1.2}));
  return (
    <g>
      <text x={540} y={268} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={46} fill={GRAPH}>
        {story.title}
      </text>
      <Lines ds={ul.outline} color={FAINT} width={2.2} />
      <text x={996} y={1590} textAnchor="end" fontFamily={FONT} fontWeight={700} fontSize={40} fill="#857C70">
        {story.handle}
      </text>
    </g>
  );
};

// ---------- captions ----------
const CAP_Y = 382;
const Captions: React.FC<{f: number; m: Meas}> = ({f, m}) => {
  const t = f / FPS;
  return (
    <g>
      {story.beats.map((b, k) => {
        const a = k === 0 ? 0.12 : b.from - 0.04;
        const last = k === story.beats.length - 1;
        const inW = win(f, a, a + 0.55, Easing.linear);
        const out = last ? 0 : win(f, b.to - 0.1, b.to + 0.18);
        if (t < a - 0.01 || out >= 0.999) return null;
        const fs = Math.min(86, (900 * 80) / m.caps[k]);
        const cw = (m.caps[k] * fs) / 80;
        const x0 = 540 - cw / 2, x1 = 540 + cw / 2;
        const wx = lerp(x0 - 70, x1 + 70, inW);
        const hl = sk("hl" + k, boil(f, 40 + k), (o) => G.line(x0 - 8, CAP_Y + 6, x1 + 8, CAP_Y + 2, {...o, roughness: 1.6, bowing: 2}));
        const hlP = win(f, a + 0.3, a + 0.75, EO);
        return (
          <g key={k} opacity={1 - out} transform={`translate(0 ${-26 * out})`}>
            <Lines ds={hl.outline} p={hlP} color={MARKER} width={30} opacity={0.5} />
            <defs>
              <linearGradient id={`cgr${k}`} gradientUnits="userSpaceOnUse" x1={wx - 70} x2={wx} y1={0} y2={0}>
                <stop offset="0" stopColor="#fff" />
                <stop offset="1" stopColor="#000" />
              </linearGradient>
              <mask id={`cm${k}`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                <rect x={0} y={CAP_Y - 120} width={W} height={200} fill={`url(#cgr${k})`} />
              </mask>
            </defs>
            <text x={540} y={CAP_Y} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={fs} fill={INK} mask={`url(#cm${k})`}>
              {b.caption}
            </text>
          </g>
        );
      })}
    </g>
  );
};

// ---------- laptop ----------
const Laptop: React.FC<{f: number}> = ({f}) => {
  const scr = sk("lap-scr", boil(f, 21), (o) => G.rectangle(268, 1198, 544, 268, {...o, roughness: 1.2, fill: NEUTRAL, fillStyle: "hachure", hachureGap: 13, fillWeight: 1.6, hachureAngle: -40}));
  const inner = sk("lap-in", boil(f, 22), (o) => G.rectangle(292, 1220, 496, 224, {...o, roughness: 0.9}));
  const base = sk("lap-base", boil(f, 23), (o) =>
    G.polygon([[214, 1468], [866, 1468], [922, 1522], [158, 1522]], {...o, roughness: 1.2, fill: NEUTRAL, fillStyle: "hachure", hachureGap: 11, fillWeight: 1.6, hachureAngle: 30}),
  );
  const pad = sk("lap-pad", boil(f, 24), (o) => G.line(470, 1505, 610, 1505, {...o, roughness: 1}));
  const lbl = sk("lap-lbl", boil(f, 25), (o) => G.curve([[178, 1330], [215, 1318], [252, 1330]], {...o, roughness: 1}));
  const ah = sk("lap-ah", boil(f, 26), (o) => G.linearPath([[238, 1316], [254, 1331], [236, 1342]], {...o, roughness: 0.8}));
  const p1 = win(f, 0.12, 0.85);
  const p2 = win(f, 0.45, 1.1);
  const hf = win(f, 0.7, 1.5, Easing.linear);
  const lab = win(f, 1.1, 1.6);
  return (
    <g>
      <rect x={292} y={1220} width={496} height={224} fill={NOTE} opacity={win(f, 0.5, 0.95) * 0.85} />
      <Lines ds={scr.hatch} p={hf} color={NEUTRAL} width={1.6} opacity={0.55} stagger={0.85} />
      <rect x={300} y={1228} width={480} height={208} fill={NOTE} opacity={win(f, 0.75, 1.15)} />
      <text x={540} y={1338} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={44} fill={FAINT}
        opacity={win(f, 8.1, 8.6)} transform={`translate(0 ${8 * (1 - win(f, 8.1, 8.6))})`}>отправлено…</text>
      <Lines ds={scr.outline} p={p1} color={INK} width={3.2} />
      <Lines ds={inner.outline} p={p2} color={GRAPH} width={2} />
      <Lines ds={base.hatch} p={hf} color={NEUTRAL} width={1.6} opacity={0.7} stagger={0.85} />
      <Lines ds={base.outline} p={p2} color={INK} width={3.2} />
      <Lines ds={pad.outline} p={win(f, 0.9, 1.3)} color={GRAPH} width={2} />
      <text x={150} y={1342} fontFamily={FONT} fontWeight={700} fontSize={42} fill={GRAPH} opacity={lab}>ты</text>
      <Lines ds={lbl.outline} p={win(f, 1.2, 1.6)} color={GRAPH} width={2} />
      <Lines ds={ah.outline} p={win(f, 1.45, 1.7)} color={GRAPH} width={2} />
    </g>
  );
};

// ---------- send UI: button, cursor, rays ----------
const SendUI: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const bx = 540, by = 1412;
  const btn = sk("btn", boil(f, 31), (o) => G.rectangle(-112, -27, 224, 54, {...o, roughness: 1.1, fill: ACCENT, fillStyle: "hachure", hachureGap: 7, fillWeight: 2, hachureAngle: -35}));
  const bIn = win(f, 1.65, 2.2);
  const press = t > 2.8 && t < 3.25 ? Math.sin(((t - 2.8) / 0.45) * Math.PI) : 0;
  const bs = 1 - 0.08 * press;
  // cursor
  const cEnter = win(f, 2.15, 2.8, EO);
  const cLeave = win(f, 3.4, 3.95);
  const cx = lerp(lerp(800, 600, cEnter), 820, cLeave);
  const cy = lerp(lerp(1640, 1424, cEnter), 1600, cLeave);
  const cOp = win(f, 2.15, 2.4) * (1 - win(f, 3.55, 3.95));
  const cur = sk("cursor", boil(f, 32), (o) => G.polygon([[0, 0], [0, 60], [15, 47], [27, 72], [38, 67], [26, 42], [45, 42]], {...o, roughness: 0.9, fill: NOTE, fillStyle: "solid"}));
  const rays = [0, 1, 2].map((k) => sk("ray" + k, boil(f, 33 + k), (o) => {
    const a = (-150 + k * 50) * (Math.PI / 180);
    return G.line(Math.cos(a) * 30, Math.sin(a) * 30, Math.cos(a) * 58, Math.sin(a) * 58, {...o, roughness: 0.8});
  }));
  const rP = win(f, 2.92, 3.15, EO);
  const rO = 1 - win(f, 3.3, 3.6);
  // fade the button a little after the card has left (keeps topology, calmer)
  const dim = 1 - 0.45 * win(f, 5.0, 5.6);
  return (
    <g>
      <g transform={`translate(${bx} ${by}) scale(${bs})`} opacity={dim}>
        <rect x={-110} y={-25} width={220} height={50} fill={NOTE} opacity={bIn} />
        <Lines ds={btn.hatch} p={win(f, 1.85, 2.4, Easing.linear)} color={ACCENT} width={2} opacity={0.55} stagger={0.85} />
        <Lines ds={btn.outline} p={bIn} color={ACCENT} width={3} />
        <text x={0} y={13} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={38} fill="#4B2A84" opacity={win(f, 2.0, 2.35)}>
          Отправить
        </text>
      </g>
      <g transform={`translate(${cx - 0} ${cy}) scale(${1 - 0.12 * press})`} opacity={cOp}>
        <path d={cur.outline.join(" ")} fill={NOTE} stroke="none" />
        <Lines ds={cur.outline} color={INK} width={3} />
      </g>
      <g transform={`translate(${600} ${1424})`} opacity={rO}>
        {rays.map((r, k) => <Lines key={k} ds={r.outline} p={rP} color={ACCENT} width={3.2} />)}
      </g>
    </g>
  );
};

// ---------- server + friend's phone ----------
const ServerPhone: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const {x, y, w, h} = SERVER;
  const box = sk("srv", boil(f, 51), (o) => G.rectangle(x - w / 2, y - h / 2, w, h, {...o, roughness: 1.2, fill: NEUTRAL, fillStyle: "hachure", hachureGap: 12, fillWeight: 1.6, hachureAngle: -42}));
  const win1 = sk("srv-w", boil(f, 52), (o) => G.rectangle(x - 110, y - 82, 220, 92, {...o, roughness: 1}));
  const slots = sk("srv-s", boil(f, 53), (o) => G.linearPath([[x - 110, y + 40], [x + 40, y + 40]], {...o, roughness: 1}));
  const slots2 = sk("srv-s2", boil(f, 54), (o) => G.linearPath([[x - 110, y + 72], [x + 40, y + 72]], {...o, roughness: 1}));
  const leds = [0, 1].map((k) => sk("led" + k, boil(f, 55 + k), (o) => G.circle(x + 78 + k * 30, y + 56, 16, {...o, roughness: 0.8})));
  const ph = sk("phone", boil(f, 61), (o) => G.rectangle(PHONE.x - PHONE.w / 2, PHONE.y - PHONE.h / 2, PHONE.w, PHONE.h, {...o, roughness: 1.1}));
  const phS = sk("phone-s", boil(f, 62), (o) => G.rectangle(PHONE.x - 42, PHONE.y - 72, 84, 136, {...o, roughness: 0.8}));
  const face = sk("face", boil(f, 63), (o) => G.circle(PHONE.x, PHONE.y - 34, 46, {...o, roughness: 0.9, fill: "#F3C9A0", fillStyle: "hachure", hachureGap: 6, fillWeight: 1.4}));
  const smile = sk("smile", boil(f, 64), (o) => G.arc(PHONE.x, PHONE.y - 32, 24, 18, 0.25, Math.PI - 0.25, false, {...o, roughness: 0.6}));
  const link = sk("srv-ph", boil(f, 65), (o) => G.line(x + w / 2 + 8, y - 10, PHONE.x - PHONE.w / 2 - 8, PHONE.y - 10, {...o, roughness: 1.4}));
  const lbl = sk("srv-lbl", boil(f, 66), (o) => G.curve([[210, 640], [280, 660], [376, 630]], {...o, roughness: 1}));
  const lblA = sk("srv-lbla", boil(f, 67), (o) => G.linearPath([[358, 620], [378, 630], [360, 645]], {...o, roughness: 0.8}));
  const pB = win(f, 0.55, 1.3);
  const pIn = win(f, 0.9, 1.5);
  const hf = win(f, 1.0, 1.8, Easing.linear);
  const pP = win(f, 0.85, 1.55);
  const thinkEnv = win(f, 11.4, 11.65) * (1 - win(f, 12.4, 12.7));
  const blink = (k: number) => 0.25 + 0.75 * thinkEnv * (0.5 + 0.5 * Math.sin(t * 18 + k * 2));
  const ledFill = win(f, 1.4, 1.8);
  return (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill={NOTE} opacity={win(f, 0.95, 1.4) * 0.8} />
      <Lines ds={box.hatch} p={hf} color={NEUTRAL} width={1.6} opacity={0.6} stagger={0.85} />
      <rect x={x - 106} y={y - 78} width={212} height={84} fill={NOTE} opacity={win(f, 1.1, 1.45)} />
      <Lines ds={box.outline} p={pB} color={INK} width={3.2} />
      <Lines ds={win1.outline} p={pIn} color={GRAPH} width={2.2} />
      <Lines ds={slots.outline} p={pIn} color={GRAPH} width={2.4} />
      <Lines ds={slots2.outline} p={pIn} color={GRAPH} width={2.4} />
      {leds.map((l, k) => (
        <g key={k}>
          <circle cx={x + 78 + k * 30} cy={y + 56} r={7} fill={ACCENT} opacity={ledFill * blink(k)} />
          <Lines ds={l.outline} p={pIn} color={INK} width={2} />
        </g>
      ))}
      <ServerScreen f={f} />
      <Lines ds={link.outline} p={win(f, 1.3, 1.8)} color={FAINT} width={2.4} />
      {/* phone */}
      <rect x={PHONE.x - PHONE.w / 2} y={PHONE.y - PHONE.h / 2} width={PHONE.w} height={PHONE.h} fill={NOTE} opacity={win(f, 1.15, 1.55)} rx={10} />
      <Lines ds={ph.outline} p={pP} color={INK} width={3} />
      <Lines ds={phS.outline} p={win(f, 1.05, 1.6)} color={GRAPH} width={1.8} />
      <Lines ds={face.hatch} p={win(f, 1.4, 1.9, Easing.linear)} color="#E4A06A" width={1.4} stagger={0.85} />
      <Lines ds={face.outline} p={win(f, 1.25, 1.7)} color={INK} width={2.4} />
      <circle cx={PHONE.x - 8} cy={PHONE.y - 40} r={3.2} fill={INK} opacity={win(f, 1.6, 1.8)} />
      <circle cx={PHONE.x + 8} cy={PHONE.y - 40} r={3.2} fill={INK} opacity={win(f, 1.6, 1.8)} />
      <Lines ds={smile.outline} p={win(f, 1.65, 1.95)} color={INK} width={2.2} />
      <text x={PHONE.x} y={PHONE.y - 108} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill={GRAPH} opacity={win(f, 1.3, 1.8)}>
        друг
      </text>
      {/* server label */}
      <text x={152} y={632} fontFamily={FONT} fontWeight={700} fontSize={40} fill={GRAPH} opacity={win(f, 1.3, 1.8)}>
        сервер
      </text>
      <Lines ds={lbl.outline} p={win(f, 1.45, 1.85)} color={GRAPH} width={2} />
      <Lines ds={lblA.outline} p={win(f, 1.7, 1.95)} color={GRAPH} width={2} />
      {/* "хм…" */}
      <text x={250} y={520} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={56} fill={ACCENT}
        opacity={win(f, 11.5, 11.8) * (1 - win(f, 12.35, 12.65))} transform={`translate(0 ${-8 * win(f, 11.5, 12.6, Easing.linear)})`}>
        хм…
      </text>
    </g>
  );
};

// loader inside the server window (think beat) + "ok" lines at the end
const ServerScreen: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  const {x, y} = SERVER;
  const env = win(f, 11.35, 11.6) * (1 - win(f, 12.45, 12.75));
  const ring = sk("loader", 71, (o) => G.arc(0, 0, 54, 54, 0, Math.PI * 1.45, false, {...o, roughness: 0.9}));
  const ringBg = sk("loader-bg", boil(f, 72), (o) => G.circle(0, 0, 54, {...o, roughness: 1.2}));
  const lines = [0, 1, 2].map((k) => sk("srv-txt" + k, boil(f, 73 + k), (o) => G.line(x - 80, y - 60 + k * 22, x - 80 + [150, 120, 90][k], y - 60 + k * 22, {...o, roughness: 1.1})));
  const okIn = win(f, 12.65, 13.1);
  return (
    <g>
      <g transform={`translate(${x} ${y - 36})`} opacity={env}>
        <Lines ds={ringBg.outline} color={FAINT} width={2} opacity={0.6} />
        <g transform={`rotate(${t * 300})`}>
          <Lines ds={ring.outline} color={ACCENT} width={4} />
        </g>
      </g>
      {lines.map((l, k) => <Lines key={k} ds={l.outline} p={win(f, 12.7 + k * 0.1, 13.0 + k * 0.1)} color={ACCENT} width={3} opacity={0.75 * okIn} />)}
    </g>
  );
};

// ---------- opening question: how does it get there? ----------
const Teaser: React.FC<{f: number}> = ({f}) => {
  const op = 1 - win(f, 6.4, 6.95);
  if (op <= 0) return null;
  const c = sk("teaser", boil(f, 700), (o) => G.curve([[560, 1186], [700, 1060], [690, 860], [560, 700]], {...o, roughness: 1.2}));
  const ah = sk("teaser-ah", boil(f, 701), (o) => G.linearPath([[548, 724], [560, 700], [586, 712]], {...o, roughness: 0.8}));
  const q = win(f, 2.3, 2.75, EO);
  return (
    <g opacity={op}>
      <Lines ds={c.outline} p={win(f, 1.7, 2.5)} color={FAINT} width={2.4} />
      <Lines ds={ah.outline} p={win(f, 2.4, 2.6)} color={FAINT} width={2.6} />
      <text x={760} y={985} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={110} fill={FAINT} opacity={q}
        transform={`rotate(${8 - 8 * q} 760 950)`}>?</text>
    </g>
  );
};

// ---------- network links ----------
const LINKS: [number, number, number, number][] = [
  [R[0].x, R[0].y, R[1].x, R[1].y],
  [R[1].x, R[1].y, R[2].x, R[2].y],
  [R[0].x + 10, R[0].y - 50, SERVER.x - 110, SERVER.y + SERVER.h / 2 + 4],
  [R[1].x, R[1].y - 50, SERVER.x, SERVER.y + SERVER.h / 2 + 4],
  [R[2].x - 10, R[2].y - 50, SERVER.x + 110, SERVER.y + SERVER.h / 2 + 4],
  [330, 1198, R[0].x + 20, R[0].y + 40],
  [540, 1198, R[1].x, R[1].y + 40],
  [750, 1198, R[2].x - 20, R[2].y + 40],
];
const Network: React.FC<{f: number}> = ({f}) => {
  const dim = 1 - 0.35 * win(f, 12.6, 13.4);
  return (
    <g opacity={dim}>
      {LINKS.map((l, k) => {
        const s = sk("link" + k, boil(f, 80 + k), (o) => G.line(l[0], l[1], l[2], l[3], {...o, roughness: 1.3, bowing: 1.5}));
        const a = 6.95 + k * 0.1;
        return <Lines key={k} ds={s.outline} p={win(f, a, a + 0.45)} color={FAINT} width={2.2} opacity={0.85} />;
      })}
    </g>
  );
};

// ---------- routers ----------
const Routers: React.FC<{f: number; P: ReturnType<typeof packetType>[]}> = ({f, P}) => {
  return (
    <g>
      {R.map((r, k) => {
        const a = 6.55 + [0.15, 0, 0.3][k];
        const body = sk("rt" + k, boil(f, 90 + k * 5), (o) => G.rectangle(r.x - 78, r.y - 34, 156, 68, {...o, roughness: 1.2, fill: NEUTRAL, fillStyle: "hachure", hachureGap: 10, fillWeight: 1.5, hachureAngle: -38}));
        const an1 = sk("rta" + k, boil(f, 91 + k * 5), (o) => G.line(r.x - 48, r.y - 34, r.x - 62, r.y - 80, {...o, roughness: 0.9}));
        const an2 = sk("rtb" + k, boil(f, 92 + k * 5), (o) => G.line(r.x + 48, r.y - 34, r.x + 62, r.y - 80, {...o, roughness: 0.9}));
        // proximity ping
        let prox = 0;
        for (const p of P) prox = Math.max(prox, p.u > 0 && p.u < 1 ? clamp01(1 - Math.hypot(p.pose.x - r.x, p.pose.y - r.y) / 150) : 0);
        const ping = [0, 1].map((j) => sk(`ping${k}${j}`, boil(f, 93 + k * 5 + j), (o) => G.arc(r.x + (j ? 62 : -62), r.y - 84, 34, 34, j ? -1.4 : Math.PI + 0.2, j ? -0.2 : Math.PI + 1.4, false, {...o, roughness: 0.7})));
        const pb = win(f, a, a + 0.45);
        return (
          <g key={k}>
            <rect x={r.x - 76} y={r.y - 32} width={152} height={64} fill={NOTE} opacity={win(f, a + 0.25, a + 0.55) * 0.85} />
            <Lines ds={body.hatch} p={win(f, a + 0.25, a + 0.8, Easing.linear)} color={NEUTRAL} width={1.5} opacity={0.65} stagger={0.85} />
            <Lines ds={body.outline} p={pb} color={INK} width={3} />
            <Lines ds={an1.outline} p={win(f, a + 0.3, a + 0.55)} color={INK} width={2.6} />
            <Lines ds={an2.outline} p={win(f, a + 0.35, a + 0.6)} color={INK} width={2.6} />
            <circle cx={r.x - 62} cy={r.y - 82} r={5} fill={INK} opacity={win(f, a + 0.45, a + 0.6)} />
            <circle cx={r.x + 62} cy={r.y - 82} r={5} fill={INK} opacity={win(f, a + 0.5, a + 0.65)} />
            {[0, 1, 2].map((j) => (
              <circle key={j} cx={r.x - 40 + j * 22} cy={r.y + 12} r={5.5} fill={prox > 0 ? ACCENT : GRAPH} opacity={win(f, a + 0.4, a + 0.7) * (0.35 + 0.65 * prox)} />
            ))}
            {ping.map((pp, j) => <Lines key={j} ds={pp.outline} color={ACCENT} width={3} opacity={prox} />)}
          </g>
        );
      })}
    </g>
  );
};
const packetType = () => ({pose: {x: 0, y: 0, w: 0, h: 0, rot: 0} as Pose, morph: 0, scale: 1, u: 0});

// ---------- trails ----------
const Trails: React.FC<{f: number; P: ReturnType<typeof packetType>[]}> = ({f, P}) => {
  const fade = 1 - win(f, 11.45, 12.2);
  if (fade <= 0) return null;
  return (
    <g opacity={fade}>
      {P.map((p, i) => {
        if (p.u <= 0) return null;
        const sp = splines[i];
        const end = along(sp, p.u);
        const pts: string[] = [];
        for (let k = 0; k < end.idx; k++) {
          const s = sp.cum[k];
          const wob = Math.sin(s * 0.045 + i * 2) * 3.2;
          const nx = k + 1 < sp.pts.length ? sp.pts[k + 1][1] - sp.pts[k][1] : 0;
          const ny = k + 1 < sp.pts.length ? -(sp.pts[k + 1][0] - sp.pts[k][0]) : 0;
          const nl = Math.hypot(nx, ny) || 1;
          pts.push(`${(sp.pts[k][0] + (nx / nl) * wob).toFixed(1)} ${(sp.pts[k][1] + (ny / nl) * wob).toFixed(1)}`);
        }
        pts.push(`${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
        return <path key={i} d={"M" + pts.join(" L")} fill="none" stroke={PK[i].dark} strokeWidth={4.2} strokeDasharray="15 11" strokeLinecap="round" opacity={0.85} />;
      })}
    </g>
  );
};

// ---------- cut lines ----------
const CUT = [[4.9, 5.1, 1], [5.18, 5.38, -1], [5.46, 5.66, 1]] as const;
const Cuts: React.FC<{f: number; B: number[]; C: {x: number; y: number}}> = ({f, B}) => {
  const op = 1 - win(f, 5.75, 6.1);
  if (f / FPS < 4.85 || op <= 0) return null;
  return (
    <g opacity={op}>
      {CUT.map(([a, b, dir], k) => {
        const u = win(f, a, b, Easing.linear);
        if (u <= 0) return null;
        const x = 540 + B[k + 1];
        const y0 = dir > 0 ? ROWY - CH / 2 - 18 : ROWY + CH / 2 + 18;
        const y1 = lerp(y0, dir > 0 ? ROWY + CH / 2 + 18 : ROWY - CH / 2 - 18, u);
        return <line key={k} x1={x} y1={y0} x2={x} y2={y1} stroke={GRAPH} strokeWidth={2.6} strokeDasharray="11 8" strokeLinecap="round" />;
      })}
    </g>
  );
};

const Scissors: React.FC<{f: number; B: number[]}> = ({f, B}) => {
  const t = f / FPS;
  const op = win(f, 4.72, 4.9) * (1 - win(f, 5.66, 5.86));
  if (op <= 0) return null;
  // tip position along the zig-zag cut path
  const top = ROWY - CH / 2 - 18, bot = ROWY + CH / 2 + 18;
  let x = 540 + B[1], y = top, ang = 0; // ang 0 => blades pointing down
  const seq: [number, number, number, number, number, number][] = [
    [4.9, 5.1, B[1], top, B[1], bot],
    [5.1, 5.18, B[1], bot, B[2], bot],
    [5.18, 5.38, B[2], bot, B[2], top],
    [5.38, 5.46, B[2], top, B[3], top],
    [5.46, 5.66, B[3], top, B[3], bot],
  ];
  for (const [a, b, xa, ya, xb, yb] of seq) {
    if (t >= a) {
      const u = win(f, a, b, Easing.linear);
      x = 540 + lerp(xa, xb, u);
      y = lerp(ya, yb, u);
    }
  }
  if (t > 5.66) { x = 540 + B[3]; y = bot; }
  ang = 180 * win(f, 5.1, 5.18) - 180 * win(f, 5.38, 5.46);
  const open = 9 + 9 * Math.sin(t * 38);
  const half = (side: number) => {
    const s = sk("sc" + side, boil(f, 120 + side), (o) => G.linearPath([[0, 46], [side * 4, 0], [side * 14, -24]], {...o, roughness: 0.6}));
    const ring = sk("scr" + side, boil(f, 122 + side), (o) => G.ellipse(side * 19, -38, 26, 30, {...o, roughness: 0.9}));
    return (
      <g transform={`rotate(${side * open})`}>
        <Lines ds={s.outline} color={INK} width={3.4} />
        <Lines ds={ring.outline} color={ACCENT} width={3.4} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y - 30}) rotate(${ang})`} opacity={op}>
      {half(1)}
      {half(-1)}
      <circle r={4} fill={INK} />
    </g>
  );
};

// ---------- packet (piece of card -> paper note) ----------
const Packet: React.FC<{
  i: number; f: number; st: ReturnType<typeof packetType>; paper: number; textIn: number; outlineOp: number; chunkOff: number;
}> = ({i, f, st, paper, textIn, outlineOp, chunkOff}) => {
  const {pose, morph, scale} = st;
  const pk = PK[i];
  const shape = sk("note" + i, boil(f, 200 + i * 3), (o) =>
    G.rectangle(-NW / 2, -NH / 2, NW, NH, {...o, roughness: 1.2, fill: pk.fill, fillStyle: "hachure", hachureGap: 9, fillWeight: 2.2, hachureAngle: -40 + i * 12}),
  );
  const hatchStatic = sk("noteh" + i, 300 + i, (o) =>
    G.rectangle(-NW / 2, -NH / 2, NW, NH, {...o, roughness: 1.2, fill: pk.fill, fillStyle: "hachure", hachureGap: 9, fillWeight: 2.2, hachureAngle: -40 + i * 12}),
  );
  const ha = 6.42 + 0.08 * i;
  const hatchP = win(f, ha, ha + 0.5, Easing.linear);
  const hatchOp = 1 - win(f, 13.45, 13.9);
  const sx = pose.w / NW, sy = pose.h / NH;
  const pad = morph < 0.98 ? 0.8 : 0;
  // badge
  const bIn = win(f, 6.3 + 0.08 * i, 6.75 + 0.08 * i, EO);
  const bOut = win(f, 13.2, 13.55);
  const bv = bIn * (1 - bOut);
  const badge = sk("badge" + i, boil(f, 400 + i), (o) => G.circle(0, 0, 50, {...o, roughness: 1, fill: NOTE, fillStyle: "solid"}));
  const ringP = win(f, 11.55 + 0.2 * i, 11.8 + 0.2 * i, EO);
  const ringOut = 1 - win(f, 12.55, 12.9);
  const ring = sk("bring" + i, 500 + i, (o) => G.ellipse(0, 0, 70, 66, {...o, roughness: 1.4}));
  const shadow = clamp01(morph) * 0.14;
  const fsK = lerp(1, 0.82, morph);
  const k = pose.h / lerp(CH, NH, morph);
  const textFade = textIn;
  const bx = -NW / 2 + 16, by = -NH / 2 + 12;
  return (
    <g transform={`translate(${pose.x} ${pose.y}) rotate(${pose.rot}) scale(${scale})`}>
      <rect x={-pose.w / 2 + 6} y={-pose.h / 2 + 8} width={pose.w} height={pose.h} fill="#5a4630" opacity={shadow} rx={4} />
      <rect x={-pose.w / 2 - pad} y={-pose.h / 2} width={pose.w + 2 * pad} height={pose.h} fill={NOTE} opacity={paper} />
      <g transform={`scale(${sx} ${sy})`}>
        <Lines ds={hatchStatic.hatch} p={hatchP} color={pk.fill} width={2.2} opacity={hatchOp} stagger={0.85} nonScaling={Math.abs(sx - 1) > 0.002 || Math.abs(sy - 1) > 0.002} />
        <Lines ds={shape.outline} color={INK} width={3} opacity={outlineOp} nonScaling />
      </g>
      <text x={lerp(chunkOff, 10, morph) * k} y={(FS * fsK * 0.3 + lerp(0, 12, morph) + 10 * (1 - textFade)) * k} textAnchor="middle" fontFamily={FONT} fontWeight={700}
        fontSize={FS * fsK * k} fill={INK} opacity={textFade}>
        {pk.txt}
      </text>
      {bv > 0.001 && (
        <g transform={`translate(${bx} ${by}) rotate(${-pose.rot * 0.5}) scale(${lerp(0.55, 1, bv)})`} opacity={bv}>
          <path d={badge.outline.join(" ")} fill={NOTE} />
          <Lines ds={badge.outline} color={INK} width={2.6} />
          <text x={0} y={13} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill={INK}>{pk.n}</text>
          <Lines ds={ring.outline} p={ringP} color={ACCENT} width={4} opacity={ringOut} />
        </g>
      )}
    </g>
  );
};

// ---------- finale: check mark + phone bubble ----------
const Finale: React.FC<{f: number; cardRight: number}> = ({f, cardRight}) => {
  const cx = Math.min(cardRight + 30, 860);
  const chk = sk("check", boil(f, 600), (o) => G.linearPath([[cx, INY - 4], [cx + 34, INY + 36], [cx + 104, INY - 62]], {...o, roughness: 1.1, bowing: 1.5}));
  const sp = [0, 1, 2].map((k) => sk("spark" + k, boil(f, 610 + k), (o) => {
    const a = (-120 + k * 45) * (Math.PI / 180);
    const ox = cx + 104, oy = INY - 62;
    return G.line(ox + Math.cos(a) * 22, oy + Math.sin(a) * 22, ox + Math.cos(a) * 46, oy + Math.sin(a) * 46, {...o, roughness: 0.7});
  }));
  const bub = sk("bubble", boil(f, 620), (o) => G.rectangle(PHONE.x - 36, PHONE.y + 8, 72, 40, {...o, roughness: 0.9, fill: ACCENT, fillStyle: "hachure", hachureGap: 5, fillWeight: 1.2}));
  const pc = win(f, 13.98, 14.35, EO);
  const bIn = win(f, 14.15, 14.55);
  return (
    <g>
      <Lines ds={chk.outline} p={pc} color={ACCENT} width={9} stagger={0.3} />
      {sp.map((s, k) => <Lines key={k} ds={s.outline} p={win(f, 14.3 + k * 0.04, 14.55 + k * 0.04, EO)} color={MARKER} width={4.5} />)}
      <g opacity={bIn} transform={`translate(0 ${10 * (1 - bIn)})`}>
        <rect x={PHONE.x - 36} y={PHONE.y + 8} width={72} height={40} fill={NOTE} />
        <Lines ds={bub.hatch} p={bIn} color={ACCENT} width={1.2} opacity={0.35} stagger={0.8} />
        <Lines ds={bub.outline} color={ACCENT} width={2.4} />
        <text x={PHONE.x} y={PHONE.y + 36} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} fill="#4B2A84">Привет!</text>
      </g>
    </g>
  );
};

registerRoot(() => (
  <Composition id="StyleLab" component={Film} durationInFrames={story.durationInFrames} fps={story.fps} width={story.width} height={story.height} />
));
