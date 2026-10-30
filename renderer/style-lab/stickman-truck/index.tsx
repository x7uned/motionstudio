// Style lab «Стикмен» · object study: an angular electric pickup (side profile, after a reference photo)
// in the lit-grey object look of the second reference Reel, with burnout smoke and haze.
// One still frame for now; every part takes time so it can be animated later.
import React, {useEffect, useState} from "react";
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame, delayRender, continueRender} from "remotion";
import {PRATA_LATIN, PRATA_CYRILLIC} from "../fonts/prata";

const W = 1080, H = 1920, FPS = 30;
const FLOOR = 1130;
const RED = "#FF3B30";
const FONT = "Prata";

function mulberry32(a: number) {
  return () => {a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;};
}
const P = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");

// ---------- truck (drawn in its own units: nose tip at x≈40, tyre contact y=362) ----------
const WHEELS = [{cx: 152, cy: 302}, {cx: 668, cy: 302}];
const TYRE_R = 60;

const ROOF = [[40, 210], [390, 113], [822, 170]];
const BODY = [[40, 210], [390, 113], [822, 170], [822, 182], [814, 262], [800, 276], [58, 292], [44, 262]];
const GLASS = [[160, 189], [388, 120], [536, 136], [536, 166]];
const SAIL = [[536, 135], [822, 170], [822, 182], [538, 167]]; // panel behind the glass, lit like the roof
const HOOD = [[40, 210], [160, 189], [158, 180], [44, 205]];

// Angular arch cladding: outer and inner outline, filled with evenodd.
function arch(cx: number) {
  const o = [[cx - 74, 300], [cx - 56, 246], [cx - 36, 220], [cx + 40, 220], [cx + 60, 246], [cx + 80, 300]];
  const i = [[cx + 64, 300], [cx + 48, 254], [cx + 32, 236], [cx - 30, 236], [cx - 44, 254], [cx - 60, 300]];
  return `M${P(o)} Z M${P(i)} Z`;
}

const Wheel: React.FC<{cx: number; cy: number; angle: number}> = ({cx, cy, angle}) => {
  const spokes = Array.from({length: 6}, (_, k) => {
    const a = (k * 60 * Math.PI) / 180;
    const pt = (r: number, d: number) => [Math.cos(a + d) * r, Math.sin(a + d) * r].map((v) => +v.toFixed(2));
    return P([pt(11, -0.32), pt(40, -0.12), pt(41, 0.16), pt(11, 0.42)]);
  });
  const tread = Array.from({length: 28}, (_, k) => {
    const a = (k / 28) * Math.PI * 2;
    return <line key={k} x1={Math.cos(a) * 52} y1={Math.sin(a) * 52} x2={Math.cos(a) * 59} y2={Math.sin(a) * 59} stroke="#2a2a2a" strokeWidth={3} />;
  });
  return (
    <g transform={`translate(${cx},${cy})`}>
      <circle r={TYRE_R} fill="#0f0f0f" />
      <g transform={`rotate(${angle})`}>{tread}</g>
      <circle r={45} fill="url(#hub)" />
      <g transform={`rotate(${angle})`}>
        {spokes.map((s, k) => <polygon key={k} points={s} fill="#4a4a4a" stroke="#6e6e6e" strokeWidth={1.2} strokeLinejoin="round" />)}
      </g>
      <circle r={45} fill="none" stroke="#c9c9c9" strokeWidth={2.4} />
      <circle r={7} fill="#d9d9d9" />
    </g>
  );
};

const Truck: React.FC<{t: number; reflection?: boolean}> = ({t, reflection}) => {
  const angle = -t * 360 * 1.6; // facing left, rolling left
  return (
    <g>
      {/* body side: mid grey, lit from above */}
      <polygon points={P(BODY)} fill="url(#side)" />
      {/* lit upper facets */}
      <polygon points={P(HOOD)} fill="url(#roof)" />
      <polygon points={P(SAIL)} fill="url(#roof)" />
      <polygon points={P(GLASS)} fill="url(#glass)" />
      {/* glass reflection streak */}
      <polygon points={P([[300, 150], [340, 138], [270, 172], [238, 177]])} fill="#ffffff" opacity={0.07} />
      {/* door and bed seams */}
      {[[240, 185, 288], [392, 176, 288], [540, 167, 288]].map(([x, y1, y2], k) => <line key={k} x1={x} y1={y1} x2={x} y2={y2} stroke="#5b5b5b" strokeWidth={2} />)}
      <line x1={540} y1={180} x2={820} y2={194} stroke="#8a8a8a" strokeWidth={1.5} opacity={0.7} />
      <rect x={742} y={196} width={30} height={7} rx={2} fill="#6a6a6a" />
      {/* dark lower cladding: rocker, bumpers, arches */}
      <polygon points={P([[226, 284], [600, 284], [600, 302], [232, 304]])} fill="#1f1f1f" />
      <polygon points={P([[46, 266], [86, 262], [80, 296], [58, 292]])} fill="#1c1c1c" />
      <polygon points={P([[754, 262], [814, 260], [800, 276], [756, 280]])} fill="#1c1c1c" />
      {WHEELS.map((w, k) => <path key={k} d={arch(w.cx)} fill="#222" fillRule="evenodd" stroke="#4d4d4d" strokeWidth={1.5} strokeLinejoin="round" />)}
      {WHEELS.map((w, k) => <path key={"in" + k} d={`M${P([[w.cx + 64, 300], [w.cx + 48, 254], [w.cx + 32, 236], [w.cx - 30, 236], [w.cx - 44, 254], [w.cx - 60, 300]])} Z`} fill="#060606" />)}
      {WHEELS.map((w, k) => <Wheel key={"w" + k} cx={w.cx} cy={w.cy} angle={angle + k * 23} />)}
      {/* bright edge along the roof line (the stickman-style light rim) */}
      <polyline points={P(ROOF)} fill="none" stroke="#f4f4f4" strokeWidth={2.6} strokeLinejoin="round" />
      <polyline points={P([[822, 170], [822, 182], [814, 262]])} fill="none" stroke="#9a9a9a" strokeWidth={1.5} />
      {/* lights: white front bar, red rear bar (the scene's one colour) */}
      {!reflection && <g>
        <polygon points={P([[36, 207], [62, 205], [62, 212], [38, 213]])} fill="#fff" filter="url(#glowW)" />
        <polygon points={P([[36, 207], [62, 205], [62, 212], [38, 213]])} fill="#fff" />
        <rect x={816} y={168} width={10} height={14} rx={2} fill={RED} filter="url(#glowR)" />
        <rect x={816} y={168} width={10} height={14} rx={2} fill="#ff6a60" />
      </g>}
    </g>
  );
};

// ---------- smoke and haze ----------
// Reference look: a dense white body hugging the ground, a lumpy cumulus top edge, a soft lit halo,
// and wisps that thin out into the grey haze dome. All seeded, so frames stay deterministic.
type Puff = {x: number; y: number; r: number; o: number};
const smooth = (u: number) => {const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v);};
function cloud(seed: number, t: number, x0: number, x1: number, rise: number) {
  const rnd = mulberry32(seed);
  const top = (x: number) => FLOOR - 40 - rise * smooth((x - x0) / (x1 - x0)) - t * 30;
  const body: Puff[] = [], lumps: Puff[] = [], wisps: Puff[] = [];
  for (let x = x0; x <= x1 + 120; x += 34) {
    const y0 = top(x), h = FLOOR + 30 - y0;
    body.push({x: x + (rnd() - 0.5) * 20 + t * 40, y: y0 + h * 0.55, r: h * 0.55 + 20, o: 1});
    for (let k = 0; k < 2; k++) lumps.push({x: x + (rnd() - 0.5) * 50 + t * 50, y: y0 + 20 + rnd() * 30, r: 26 + rnd() * 34 + h * 0.06, o: 0.9});
    if (rnd() < 0.4) wisps.push({x: x + (rnd() - 0.5) * 120 + t * 70, y: y0 - 20 - rnd() * 140, r: 80 + rnd() * 90, o: 0.18 + rnd() * 0.14});
  }
  return {body, lumps, wisps};
}
function groundLayer(seed: number, t: number, n: number, x0: number, x1: number, y: number): Puff[] {
  const rnd = mulberry32(seed);
  return Array.from({length: n}, (_, i) => ({
    x: x0 + ((i + rnd()) / n) * (x1 - x0) + t * 25,
    y: y - rnd() * 30,
    r: 40 + rnd() * 40,
    o: 0.22 + rnd() * 0.2,
  }));
}

const Puffs: React.FC<{puffs: Puff[]; filter: string; fill?: string; opacity?: number}> = ({puffs, filter, fill = "puff", opacity = 1}) => (
  <g filter={`url(#${filter})`} opacity={opacity}>
    {puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={`url(#${fill})`} opacity={p.o} />)}
  </g>
);

const Smoke: React.FC<{c: ReturnType<typeof cloud>; front?: boolean}> = ({c, front}) => front ? (
  <g>
    <Puffs puffs={c.body} filter="billow" fill="puffSolid" opacity={0.85} />
    <Puffs puffs={c.lumps} filter="billow" opacity={0.85} />
  </g>
) : (
  <g>
    <Puffs puffs={c.wisps} filter="haze" />
    <Puffs puffs={[...c.body, ...c.lumps]} filter="halo" fill="puffSolid" opacity={0.55} />
    <Puffs puffs={c.body} filter="billow" fill="puffSolid" />
    <Puffs puffs={c.lumps} filter="billow" />
  </g>
);

const Scene: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const [handle] = useState(() => delayRender("prata"));
  useEffect(() => {
    const faces = [new FontFace(FONT, `url(${PRATA_LATIN})`), new FontFace(FONT, `url(${PRATA_CYRILLIC})`, {unicodeRange: "U+0400-04FF"})];
    Promise.all(faces.map((ff) => ff.load())).then((ls) => {ls.forEach((l) => document.fonts.add(l)); continueRender(handle);});
  }, [handle]);

  const TX = 48, TY = FLOOR - 362; // truck units → frame
  const rearX = TX + 668, rearY = FLOOR;
  const back = cloud(11, t, rearX - 40, 1180, 420);
  const front = cloud(29, t, rearX + 10, rearX + 150, 30);
  const ground = groundLayer(5, t, 16, 120, rearX, FLOOR + 6);

  return (
    <AbsoluteFill style={{background: "#000"}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="side" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#d4d4d4" /><stop offset="0.45" stopColor="#b2b2b2" /><stop offset="1" stopColor="#6c6c6c" />
          </linearGradient>
          <linearGradient id="roof" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#f0f0f0" /><stop offset="1" stopColor="#d6d6d6" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2c2c2c" /><stop offset="0.6" stopColor="#141414" /><stop offset="1" stopColor="#0a0a0a" />
          </linearGradient>
          <radialGradient id="hub"><stop offset="0" stopColor="#3c3c3c" /><stop offset="1" stopColor="#1e1e1e" /></radialGradient>
          <radialGradient id="puff">
            <stop offset="0" stopColor="#fff" stopOpacity={1} /><stop offset="0.55" stopColor="#f2f2f2" stopOpacity={0.85} /><stop offset="1" stopColor="#e6e6e6" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="puffSolid">
            <stop offset="0" stopColor="#fff" /><stop offset="0.7" stopColor="#f4f4f4" /><stop offset="1" stopColor="#ececec" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="haze" cx="0.5" cy="0.55" r="0.5">
            <stop offset="0" stopColor="#9c9c9c" stopOpacity={0.55} /><stop offset="0.6" stopColor="#5a5a5a" stopOpacity={0.25} /><stop offset="1" stopColor="#000" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="beam" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity={0.55} /><stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="refFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.32} /><stop offset="0.5" stopColor="#fff" stopOpacity={0.06} /><stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="refMask" maskUnits="userSpaceOnUse" x="0" y={FLOOR} width={W} height={400}>
            <rect x={0} y={FLOOR} width={W} height={340} fill="url(#refFade)" />
          </mask>
          {/* billowy edge: fractal noise displaces soft puffs, then a light blur */}
          <filter id="billow" x="-40%" y="-60%" width="180%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves={3} seed={7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={46} xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation={3.5} />
          </filter>
          <filter id="halo" x="-40%" y="-60%" width="180%" height="220%"><feGaussianBlur stdDeviation={34} /></filter>
          <filter id="haze" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation={70} /></filter>
          <filter id="billowSoft" x="-40%" y="-60%" width="180%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.009" numOctaves={2} seed={3} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={60} xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation={14} />
          </filter>
          <clipPath id="aboveFloor"><rect x={-200} y={0} width={W + 400} height={FLOOR + 4} /></clipPath>
          <filter id="glowW" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation={10} /></filter>
          <filter id="glowR" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation={9} /></filter>
          <filter id="glowText" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={12} /></filter>
          <filter id="blur40" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={40} /></filter>
        </defs>

        {/* haze dome: the lit fog the whole scene sits in */}
        <ellipse cx={560} cy={1010} rx={700} ry={560} fill="url(#haze)" />
        {/* floor: glossy black with a faint lit band and horizon */}
        <rect x={0} y={FLOOR} width={W} height={H - FLOOR} fill="#050505" />
        <ellipse cx={540} cy={FLOOR + 30} rx={560} ry={70} fill="#2a2a2a" opacity={0.6} filter="url(#blur40)" />
        <line x1={0} y1={FLOOR} x2={W} y2={FLOOR} stroke="#3a3a3a" strokeWidth={2} />

        {/* smoke behind the truck */}
        <Puffs puffs={ground} filter="billowSoft" />
        <g clipPath="url(#aboveFloor)"><Smoke c={back} /></g>

        {/* headlight beam */}
        <polygon points={P([[TX + 40, TY + 206], [-60, TY + 120], [-60, TY + 320]])} fill="url(#beam)" opacity={0.75} filter="url(#blur40)" />
        <ellipse cx={TX + 30} cy={TY + 209} rx={70} ry={26} fill="#fff" opacity={0.35} filter="url(#glowW)" />

        {/* reflection */}
        <g mask="url(#refMask)">
          <g transform={`translate(0,${FLOOR * 2}) scale(1,-1)`} opacity={1} clipPath="url(#aboveFloor)"><Smoke c={back} /></g>
          <g transform={`translate(${TX},${FLOOR * 2 - TY}) scale(1,-1)`} opacity={0.6}><Truck t={t} reflection /></g>
        </g>
        <g transform={`translate(${TX},${TY})`}><Truck t={t} /></g>

        {/* smoke in front: hides the rear tyre contact like a burnout */}
        <g clipPath="url(#aboveFloor)"><Smoke c={front} front /></g>

        {/* text */}
        <text x={540} y={350} textAnchor="middle" fontFamily={FONT} fontSize={46} fill="#ffffff">Everyone laughed at the shape.</text>
        <g fontFamily={FONT} fontSize={96} textAnchor="middle">
          <text x={540} y={470} fill="#fff">Built <tspan fill={RED} filter="url(#glowText)">different.</tspan></text>
          <text x={540} y={470} fill="#fff">Built <tspan fill={RED}>different.</tspan></text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const Root: React.FC = () => <Composition id="StyleLab" component={Scene} durationInFrames={30} fps={FPS} width={W} height={H} />;
registerRoot(Root);
