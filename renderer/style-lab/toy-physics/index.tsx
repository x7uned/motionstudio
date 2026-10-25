// Style lab · «Игрушечная физика»: flat toy world, Matter.js recording drives the packets.
import React from "react";
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame, spring, Easing} from "remotion";
import "@fontsource-variable/manrope";
import story from "../../../work/style-lab/story.json";
import {getRecording, RELEASE_FRAME, ROUTERS, RAMPS, SHELF_X, SHELF_Y, BLOCK, BLOCK_R, TRAY_L, TRAY_R, TRAY_TOP, TRAY_FLOOR, WALL_T, PARAMS, EXPECTED_ORDER} from "./sim";

const W = 1080, H = 1920, FPS = 30;
const FONT = "'Manrope Variable', Manrope, sans-serif";
const C = {
  bgTop: "#FFF6E8", bgBottom: "#EFE5FF", ink: "#2B2350", inkSoft: "#5D5390",
  purple: "#8D59DA", lavender: "#E0CDF8", yellow: "#F4CA50", ivory: "#FDFEED", green: "#4CC93A",
  routerBody: "#3A2F6B", routerRing: "#8D59DA", tray: "#B9A3EE", trayDark: "#7E66C9", server: "#3A2F6B",
  laptopLid: "#3A2F6B", laptopBase: "#8D59DA", screen: "#F7F2FF", white: "#FFFFFF", shadow: "#2B2350",
};
const PACKET = [
  {fill: "#FF6B57", text: "#FFFFFF", chunk: "Пр"},
  {fill: "#F4CA50", text: "#2B2350", chunk: "ив"},
  {fill: "#22B8A0", text: "#FFFFFF", chunk: "ет"},
  {fill: "#8D59DA", text: "#FFFFFF", chunk: "!"},
];
// Approximate Manrope 800 advance widths (em) for the contiguous «Привет!» layout.
const CHUNK_EM = [1.24, 1.15, 1.04, 0.3];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const prog = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const eio = Easing.bezier(0.45, 0, 0.25, 1);
const eout = Easing.bezier(0.16, 1, 0.3, 1);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixColor = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return "#" + x.map((v, i) => Math.round(lerp(v, y[i], clamp01(t))).toString(16).padStart(2, "0")).join("");
};
const pop = (f: number, start: number, damping = 11) => (f < start ? 0 : spring({frame: f - start, fps: FPS, config: {damping, stiffness: 170, mass: 0.8}}));
const tau = Math.PI * 2;

// Rounded rectangle with per-corner radii [tl, tr, br, bl], centred on 0,0.
function rrect(w: number, h: number, r: number[]) {
  const [tl, tr, br, bl] = r.map((v) => Math.max(0, Math.min(v, w / 2, h / 2)));
  const x = -w / 2, y = -h / 2;
  return `M${x + tl},${y}H${x + w - tr}Q${x + w},${y} ${x + w},${y + tr}V${y + h - br}Q${x + w},${y + h} ${x + w - br},${y + h}H${x + bl}Q${x},${y + h} ${x},${y + h - bl}V${y + tl}Q${x},${y} ${x + tl},${y}Z`;
}

// ---------- laptop pose ----------
function laptop(f: number) {
  const t = eio(prog(f, 126, 162));
  const s = pop(f, 3, 10);
  return {x: lerp(540, 182, t), y: lerp(990, 548, t), s: lerp(1.36, 0.5, t) * s, appear: s};
}
const CARD_LOCAL = {x: 0, y: -62, cell: 85, h: 118, font: 58};
const BTN_LOCAL = {x: 0, y: 56};

// ---------- piece (packet) state ----------
type Piece = {x: number; y: number; a: number; w: number; h: number; r: number[]; fill: string; text: string; badge: number; font: number; dx: number; sx: number; sy: number; opacity: number};

function contiguousOffsets(font: number) {
  const ws = CHUNK_EM.map((e) => e * font);
  const total = ws.reduce((p, q) => p + q, 0);
  let acc = -total / 2;
  return ws.map((w) => { const c = acc + w / 2; acc += w; return c; });
}
// Four adjacent pieces forming one card centred at cx,cy.
function cardPiece(k: number, cx: number, cy: number, cell: number, h: number, font: number, rot: number, outerR: number): Piece {
  const off = (k - 1.5) * cell;
  const cont = contiguousOffsets(font)[k];
  const r = [k === 0 ? outerR : 0, k === 3 ? outerR : 0, k === 3 ? outerR : 0, k === 0 ? outerR : 0];
  return {x: cx + off * Math.cos(rot), y: cy + off * Math.sin(rot), a: rot, w: cell + 0.6, h, r, fill: C.white, text: C.ink, badge: 0, font, dx: cont - off, sx: 1, sy: 1, opacity: 1};
}

function squashFromHits(rec: ReturnType<typeof getRecording>, k: number, f: number) {
  let s = 0;
  for (const h of rec.hits) {
    if (h.block !== k || h.frame > f || h.speed < 2 || f - h.frame > 24) continue;
    const dt = f - h.frame;
    s += Math.min(0.2, h.speed * 0.016) * Math.exp(-dt / 4.5) * Math.cos(dt * 0.85);
  }
  return Math.max(-0.22, Math.min(0.22, s));
}

const THINK = 352; // physics → scripted handover
const SORT_SLOT = (n: number) => 540 + (n - 1.5) * 150;
const REST_Y = TRAY_FLOOR - BLOCK / 2;

function pieceAt(k: number, f: number): Piece {
  const rec = getRecording();
  const P = PACKET[k];
  const L = laptop(f);
  // A/B: card on the laptop screen, then flying out to the shelf.
  if (f < 188) {
    const shiver = f >= 76 ? 0.05 * Math.sin((f - 76) * 0.9) * Math.exp(-(f - 76) / 8) : 0;
    const press = f >= 70 && f < 90 ? -6 * Math.sin(Math.PI * prog(f, 70, 90)) : 0;
    const ax = L.x + L.s * CARD_LOCAL.x, ay = L.y + L.s * (CARD_LOCAL.y + press);
    const t = eio(prog(f, 128, 164));
    const cx = lerp(ax, 640, t), cy = lerp(ay, SHELF_Y, t) - 90 * Math.sin(Math.PI * t);
    const cell = lerp(CARD_LOCAL.cell * L.s, 153, t), h = lerp(CARD_LOCAL.h * L.s, 150, t), font = lerp(CARD_LOCAL.font * L.s, 80, t);
    const p = cardPiece(k, cx, cy, cell, h, font, shiver + 0.06 * Math.sin(Math.PI * t), lerp(20 * L.s, 26, t));
    const appear = eout(prog(f, 14, 28));
    p.dx *= 1 - eio(prog(f, 154, 170)); // chunks part so the cut lines fall between them
    p.opacity = appear; p.sx = p.sy = 1; // card reveal handled via scale below
    const sc = lerp(0.88, 1, appear);
    p.w *= sc; p.h *= sc; p.font *= sc; p.dx *= sc; p.x = cx + (p.x - cx) * sc; p.y = cy + (p.y - cy) * sc + (1 - appear) * 18 * L.s;
    return p;
  }
  // C: the card cracks into four packets that hop to the shelf.
  if (f < RELEASE_FRAME) {
    const t = eout(prog(f, 188, 212));
    const base = cardPiece(k, 640, SHELF_Y, 153, 150, 80, 0, 26);
    const lift = -26 * Math.sin(Math.PI * prog(f, 188, 206));
    const bob = f >= 214 ? 5 * Math.sin((f - 214) / 5 + k * 1.3) * (1 - prog(f, 222, 232)) : 0;
    const rel = RELEASE_FRAME + PARAMS.launch[k].delay;
    const antic = Math.sin(Math.PI * prog(f, rel - 9, rel + 1)) * 0.1;
    const pop1 = f >= 190 ? 0.12 * Math.sin((f - 190) * 0.7) * Math.exp(-(f - 190) / 6) : 0;
    return {
      x: lerp(base.x, SHELF_X[k], t), y: SHELF_Y + lift + bob + antic * 40, a: 0,
      w: lerp(153.6, BLOCK, t), h: lerp(150, BLOCK, t),
      r: base.r.map((r) => lerp(r, BLOCK_R, t)), fill: mixColor("#FFFFFF", P.fill, prog(f, 192, 210)), text: mixColor(C.ink, P.text, prog(f, 192, 210)),
      badge: pop(f, 198 + k * 3, 9), font: lerp(80, 56, t), dx: 0, sx: 1 + pop1 + antic, sy: 1 - pop1 - antic, opacity: 1,
    };
  }
  // E: physics recording (packets still waiting on the shelf keep their anticipation squash).
  if (f < THINK) {
    const s = rec.frames[f - RELEASE_FRAME][k];
    const rel = RELEASE_FRAME + PARAMS.launch[k].delay;
    let sq = squashFromHits(rec, k, f);
    if (!s.live) sq += Math.sin(Math.PI * prog(f, rel - 9, rel + 1)) * 0.1;
    else sq -= 0.12 * Math.exp(-(f - rel) / 4) * Math.cos((f - rel) * 0.8); // release stretch
    return {x: s.x, y: s.y + (s.live ? 0 : sq * 40), a: s.a, w: BLOCK, h: BLOCK, r: [BLOCK_R, BLOCK_R, BLOCK_R, BLOCK_R], fill: P.fill, text: P.text, badge: 1, font: 56, dx: 0, sx: 1 + sq, sy: 1 - sq, opacity: 1};
  }
  // F/G/H: scripted from the recorded end state.
  const s0 = rec.frames[THINK - RELEASE_FRAME][k];
  const up = Math.round(s0.a / tau) * tau;
  const order = EXPECTED_ORDER.indexOf(k); // 0..3 position in the tray queue
  const tU = eio(prog(f, THINK + 1 + order * 4, THINK + 15 + order * 4));
  let x = s0.x, y = lerp(s0.y, REST_Y, tU) - 34 * Math.sin(Math.PI * tU), a = lerp(s0.a, up, tU);
  let sq = 0.08 * Math.sin(Math.PI * tU);
  const lifts = [150, 300, 220, 90];
  const sStart = 377 + k * 4;
  const tS = eio(prog(f, sStart, sStart + 18));
  x = lerp(x, SORT_SLOT(k), tS);
  y -= lifts[k] * Math.sin(Math.PI * tS);
  if (f >= sStart + 18) { const d = f - sStart - 18; sq += 0.13 * Math.exp(-d / 4) * Math.cos(d * 0.9); }
  else if (tS > 0) sq -= 0.08 * Math.sin(Math.PI * tS);
  // merge
  const tM = eio(prog(f, 402, 420));
  const cell = lerp(132, 150, tM);
  const card = cardPiece(k, 540, lerp(REST_Y, 1318, tM), cell, lerp(BLOCK, 176, tM), lerp(56, 84, tM), 0, 30);
  const mergedSq = f >= 418 ? 0.06 * Math.sin((f - 418) * 0.8) * Math.exp(-(f - 418) / 4) : 0;
  return {
    x: lerp(x, card.x, tM), y: lerp(y, card.y, tM), a: a + (up - a) * tM,
    w: lerp(BLOCK, cell + 0.6, tM), h: lerp(BLOCK, card.h, tM), r: card.r.map((r) => lerp(BLOCK_R, r, tM)),
    fill: mixColor(P.fill, "#FFFFFF", prog(f, 404, 420)), text: mixColor(P.text, C.ink, prog(f, 401, 409)),
    badge: 1 - eio(prog(f, 400, 412)), font: card.font, dx: lerp(0, card.dx, tM),
    sx: 1 + sq * (1 - tM) - mergedSq, sy: 1 - sq * (1 - tM) + mergedSq, opacity: 1,
  };
}

// ---------- drawing ----------
const PieceShape: React.FC<{p: Piece; k: number; f: number; layer: "shadow" | "body" | "label"}> = ({p, k, f, layer}) => {
  const tr = `translate(${p.x},${p.y}) scale(${p.sx},${p.sy}) rotate(${(p.a * 180) / Math.PI})`;
  if (layer === "shadow") return <path transform={`translate(${p.x + 8},${p.y + 16}) scale(${p.sx},${p.sy}) rotate(${(p.a * 180) / Math.PI})`} d={rrect(p.w, p.h, p.r)} opacity={p.opacity} />;
  const scan = f >= 346 && f < 380 ? Math.sin(Math.PI * prog(f, 348 + k * 6, 360 + k * 6)) : 0;
  const bs = p.badge * (1 + 0.28 * scan);
  const pc = PACKET[k];
  if (layer === "body") return (
    <g transform={tr} opacity={p.opacity}>
      <path d={rrect(p.w, p.h, p.r)} fill={p.fill} />
      {/* top highlight for the chunky toy look */}
      <path d={rrect(p.w - 22, p.h * 0.32, p.r.map((r) => Math.max(0, r - 10)))} transform={`translate(0,${-p.h * 0.28})`} fill="#FFFFFF" opacity={0.18 * p.badge} />
    </g>
  );
  return (
    <g transform={tr} opacity={p.opacity}>
      <text x={p.dx} y={p.font * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={p.font} fill={p.text}>{pc.chunk}</text>
      {bs > 0.001 && (
        <g transform={`translate(${-p.w / 2 + 30},${-p.h / 2 + 30}) scale(${bs})`}>
          <circle r={34 * scan} fill="none" stroke={C.ink} strokeWidth={4} opacity={0.5 * scan} />
          <circle r={23} fill={C.white} />
          <text y={9} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill={C.ink}>{k + 1}</text>
        </g>
      )}
    </g>
  );
};

const Laptop: React.FC<{f: number}> = ({f}) => {
  const L = laptop(f);
  if (L.s <= 0.001) return null;
  const press = f >= 68 && f < 84 ? Math.sin(Math.PI * prog(f, 68, 84)) : 0;
  const sent = prog(f, 80, 92);
  return (
    <g transform={`translate(${L.x},${L.y}) scale(${L.s})`}>
      <ellipse cx={0} cy={182} rx={300} ry={26} fill={C.shadow} opacity={0.12} />
      <rect x={-224} y={-176} width={448} height={316} rx={34} fill={C.laptopLid} />
      <rect x={-204} y={-156} width={408} height={276} rx={18} fill={C.screen} />
      <circle cx={0} cy={-166} r={4} fill={C.lavender} />
      <path d="M-270,140 H270 Q282,140 280,152 L272,170 Q268,178 256,178 H-256 Q-268,178 -272,170 L-280,152 Q-282,140 -270,140Z" fill={C.laptopBase} />
      <rect x={-60} y={140} width={120} height={10} rx={5} fill="#6E43B3" />
      {/* send button */}
      <g transform={`translate(${BTN_LOCAL.x},${BTN_LOCAL.y}) scale(${1 + 0.06 * press},${1 - 0.14 * press})`}>
        <rect x={-104} y={-30} width={208} height={60} rx={30} fill={mixColor(C.purple, C.green, sent)} />
        <text y={10} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={28} fill="#FFFFFF">Отправить</text>
      </g>
    </g>
  );
};

const Cursor: React.FC<{f: number}> = ({f}) => {
  if (f < 30 || f > 120) return null;
  const L = laptop(f);
  const bx = L.x + L.s * (BTN_LOCAL.x + 40), by = L.y + L.s * (BTN_LOCAL.y + 12);
  const tIn = eio(prog(f, 32, 64)), tOut = eio(prog(f, 88, 116));
  const x = lerp(lerp(930, bx, tIn), 1010, tOut), y = lerp(lerp(1420, by, tIn), 1500, tOut);
  const press = Math.sin(Math.PI * prog(f, 66, 80));
  const o = prog(f, 30, 40) * (1 - prog(f, 104, 118));
  return (
    <g transform={`translate(${x},${y}) scale(${(1 - 0.18 * press) * lerp(0.88, 1, prog(f, 30, 42))})`} opacity={o}>
      <circle r={40 * press} fill={C.purple} opacity={0.25 * press} />
      <path d="M0,0 L0,62 L16,48 L28,74 L40,68 L28,43 L48,42 Z" fill="#FFFFFF" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
    </g>
  );
};

const Router: React.FC<{i: number; f: number}> = ({i, f}) => {
  const r = ROUTERS[i];
  const rec = getRecording();
  const s = pop(f, 150 + i * 9, 9);
  if (s <= 0.001) return null;
  let pulse = 0, glow = 0, glowColor = C.yellow;
  for (const h of rec.hits) {
    if (h.other !== `router-${i}` || h.frame > f || f - h.frame > 20) continue;
    const dt = f - h.frame;
    pulse += Math.min(0.14, h.speed * 0.012) * Math.exp(-dt / 4) * Math.cos(dt * 0.9);
    const g = Math.exp(-dt / 6);
    if (g > glow) { glow = g; glowColor = PACKET[h.block].fill; }
  }
  const sc = s * (1 + pulse);
  return (
    <g transform={`translate(${r.x},${r.y})`}>
      <ellipse cx={10} cy={r.r + 22} rx={r.r * 0.95 * s} ry={14 * s} fill={C.shadow} opacity={0.12} />
      <g transform={`scale(${sc})`}>
        <circle r={r.r + 16 * glow} fill={glowColor} opacity={0.35 * glow} />
        <circle r={r.r} fill={C.routerBody} />
        <circle r={r.r - 10} fill={C.routerRing} />
        <circle r={r.r - 10} cy={-4} fill="#A37BE6" opacity={0.6} />
        <g stroke={C.ivory} strokeWidth={8} strokeLinecap="round" fill="none">
          <path d="M-26,-2 Q0,-26 26,-2" />
          <path d="M-14,10 Q0,-2 14,10" />
        </g>
        <circle cy={24} r={6} fill={C.ivory} />
        {[-1, 0, 1].map((d) => <circle key={d} cx={d * 16} cy={r.r - 4} r={4.5} fill={d === 0 ? mixColor(C.yellow, glowColor, glow) : C.lavender} />)}
      </g>
    </g>
  );
};

const Machine: React.FC<{f: number}> = ({f}) => {
  const s = pop(f, 178, 10);
  if (s <= 0.001) return null;
  const rs = pop(f, 190, 10);
  const cx = (TRAY_L + TRAY_R) / 2;
  // conveyor stripes move left while the belt runs
  const beltT = f < RELEASE_FRAME ? 0 : f < 360 ? (f - RELEASE_FRAME) * 3 : 120 * 3 + (f - 360) * 3 * Math.max(0, 1 - (f - 360) / 30);
  const stripes = [] as React.ReactNode[];
  for (let i = -1; i < 18; i++) {
    const x = TRAY_L + ((i * 40 - beltT) % 40 + 40) % 40 + i * 40;
    if (x > TRAY_L - 10 && x < TRAY_R - 10) stripes.push(<rect key={i} x={x} y={TRAY_FLOOR + 6} width={18} height={10} rx={5} fill={C.trayDark} opacity={0.55} />);
  }
  // server orb: idle → thinking spinner → green ready
  const think = prog(f, 344, 352) * (1 - prog(f, 392, 404));
  const ready = prog(f, 416, 428);
  const spin = f * 0.32;
  return (
    <g>
      {RAMPS.map((rp, i) => {
        const len = Math.hypot(rp.x2 - rp.x1, rp.y2 - rp.y1), ang = (Math.atan2(rp.y2 - rp.y1, rp.x2 - rp.x1) * 180) / Math.PI;
        return (
          <g key={i} transform={`translate(${(rp.x1 + rp.x2) / 2},${(rp.y1 + rp.y2) / 2}) rotate(${ang}) scale(${rs})`}>
            <rect x={-len / 2 + 6} y={-rp.t / 2 + 12} width={len} height={rp.t} rx={rp.t / 2} fill={C.shadow} opacity={0.1} />
            <rect x={-len / 2} y={-rp.t / 2} width={len} height={rp.t} rx={rp.t / 2} fill={C.yellow} />
            <rect x={-len / 2 + 10} y={-rp.t / 2 + 4} width={len - 20} height={6} rx={3} fill="#FFFFFF" opacity={0.45} />
          </g>
        );
      })}
      <g transform={`translate(${cx},${TRAY_FLOOR}) scale(${s}) translate(${-cx},${-TRAY_FLOOR})`}>
        <rect x={TRAY_L - WALL_T + 10} y={TRAY_FLOOR + 210} width={TRAY_R - TRAY_L + 2 * WALL_T - 20} height={26} rx={13} fill={C.shadow} opacity={0.1} />
        {/* server body */}
        <rect x={TRAY_L + 20} y={TRAY_FLOOR + 30} width={TRAY_R - TRAY_L - 40} height={186} rx={34} fill={C.server} />
        {[0, 1].map((i) => <rect key={i} x={TRAY_L + 70} y={TRAY_FLOOR + 74 + i * 52} width={300} height={28} rx={14} fill="#4F4390" />)}
        {[0, 1, 2].map((i) => <circle key={i} cx={TRAY_L + 404 + i * 28} cy={TRAY_FLOOR + 88} r={7} fill={i === 1 ? mixColor(C.lavender, C.green, ready) : C.lavender} opacity={0.8} />)}
        <g transform={`translate(${TRAY_R - 120},${TRAY_FLOOR + 122})`}>
          <circle r={50} fill="#4F4390" />
          <circle r={36} fill={mixColor(mixColor(C.lavender, C.yellow, think), C.green, ready)} />
          <circle r={36 + 12 * think} fill="none" stroke={C.yellow} strokeWidth={5} opacity={0.5 * think} />
          <g opacity={think} transform={`rotate(${(spin * 180) / Math.PI})`}>
            <path d="M0,-24 A24,24 0 0 1 24,0" stroke={C.ink} strokeWidth={7} strokeLinecap="round" fill="none" />
          </g>
          <path d="M-14,1 L-4,11 L15,-10" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={50} strokeDashoffset={50 * (1 - ready)} />
        </g>
        {/* tray */}
        <rect x={TRAY_L - WALL_T} y={TRAY_FLOOR} width={TRAY_R - TRAY_L + 2 * WALL_T} height={40} rx={20} fill={C.tray} />
        {stripes}
        <rect x={TRAY_L - WALL_T} y={TRAY_TOP} width={WALL_T} height={TRAY_FLOOR - TRAY_TOP + 30} rx={13} fill={C.tray} />
        <rect x={TRAY_R} y={TRAY_TOP} width={WALL_T} height={TRAY_FLOOR - TRAY_TOP + 30} rx={13} fill={C.tray} />
      </g>
    </g>
  );
};

const Trails: React.FC<{f: number}> = ({f}) => {
  if (f <= RELEASE_FRAME || f > 400) return null;
  const rec = getRecording();
  const out: React.ReactNode[] = [];
  const end = Math.min(f, THINK);
  const bands = [{a: 0, b: 10, w: 16, o: 0.4}, {a: 10, b: 20, w: 11, o: 0.26}, {a: 20, b: 30, w: 6, o: 0.16}];
  for (let k = 0; k < 4; k++) {
    bands.forEach((band, bi) => {
      const pts: string[] = [];
      for (let g = Math.max(RELEASE_FRAME, f - band.b); g <= Math.min(end, f - band.a); g++) {
        const s = rec.frames[g - RELEASE_FRAME][k];
        if (s.live) pts.push(`${s.x.toFixed(1)},${s.y.toFixed(1)}`);
      }
      if (pts.length > 1) out.push(<polyline key={`${k}-${bi}`} points={pts.join(" ")} fill="none" stroke={PACKET[k].fill} strokeWidth={band.w} strokeLinecap="round" strokeLinejoin="round" opacity={band.o} />);
    });
  }
  return <g>{out}</g>;
};

const CutLines: React.FC<{f: number}> = ({f}) => {
  if (f < 164 || f > 200) return null;
  const o = 1 - prog(f, 190, 198);
  return (
    <g opacity={o}>
      {[0, 1, 2].map((i) => {
        const t = eio(prog(f, 166 + i * 5, 180 + i * 5));
        const x = 640 + (i - 1) * 153, y0 = SHELF_Y - 100, len = 200 * t;
        return (
          <g key={i}>
            <line x1={x} y1={y0} x2={x} y2={y0 + len} stroke={C.ink} strokeWidth={5} strokeDasharray="14 12" strokeLinecap="round" />
            {t > 0 && t < 1 && <path transform={`translate(${x},${y0 + len}) rotate(90) scale(${Math.sin(Math.PI * t)})`} d="M-14,-10 L14,0 L-14,10 Z" fill={C.purple} />}
          </g>
        );
      })}
    </g>
  );
};

const Check: React.FC<{f: number}> = ({f}) => {
  const s = pop(f, 414, 9);
  if (s <= 0.001) return null;
  const draw = eout(prog(f, 416, 426));
  return (
    <g transform={`translate(${540 + 300},${1318 - 88}) scale(${s})`}>
      <circle r={44} cy={6} fill={C.shadow} opacity={0.12} />
      <circle r={42} fill={C.green} />
      <path d="M-18,1 L-5,14 L20,-13" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={60} strokeDashoffset={60 * (1 - draw)} />
    </g>
  );
};

const Caption: React.FC<{f: number}> = ({f}) => {
  return (
    <div style={{position: "absolute", left: 60, right: 60, top: 222, height: 170, overflow: "hidden"}}>
      {story.beats.map((b, i) => {
        const start = Math.round(b.from * FPS), end = Math.round(b.to * FPS);
        const last = i === story.beats.length - 1;
        const tin = i === 0 ? eout(prog(f, 2, 12)) : eout(prog(f, start - 1, start + 8));
        const tout = last ? 0 : eio(prog(f, end - 5, end + 1));
        if (tin <= 0 || tout >= 1) return null;
        const dy = (1 - tin) * 90 - tout * 90;
        return (
          <div key={b.id} style={{position: "absolute", left: 18, right: 18, top: dy, height: 170, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: tin * tin * (1 - tout) * (1 - tout), fontFamily: FONT, fontWeight: 800, fontSize: 64, textWrap: "balance", lineHeight: 1.08, letterSpacing: -1, color: C.ink}}>
            {b.caption}
          </div>
        );
      })}
    </div>
  );
};

const Film: React.FC = () => {
  const f = useCurrentFrame();
  getRecording(); // throws if the arrival order is not 3,1,4,2
  const pieces = [0, 1, 2, 3].map((k) => pieceAt(k, f));
  // Draw resting / lower packets first so landing packets stay on top.
  const zOrder = [0, 1, 2, 3].sort((a, b) => pieces[a].y - pieces[b].y || a - b).reverse();
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.bgTop} 0%, ${C.bgBottom} 100%)`}}>
      <svg width={W} height={H} style={{position: "absolute"}}>
        <circle cx={980} cy={720} r={260} fill="#FFE7C2" opacity={0.55} />
        <circle cx={90} cy={1330} r={220} fill="#E3D5FF" opacity={0.6} />
        <circle cx={940} cy={1700} r={160} fill="#FFDCE3" opacity={0.5} />
        <Machine f={f} />
        {[0, 1, 2].map((i) => <Router key={i} i={i} f={f} />)}
        <Laptop f={f} />
        <Trails f={f} />
        <g fill={C.shadow} opacity={0.14}>{zOrder.map((k) => <PieceShape key={k} p={pieces[k]} k={k} f={f} layer="shadow" />)}</g>
        {zOrder.map((k) => <PieceShape key={k} p={pieces[k]} k={k} f={f} layer="body" />)}
        {f >= 414 && <path transform={`translate(540,${pieces[0].y}) scale(${pieces[1].sx},${pieces[1].sy})`} d={rrect(600, 176, [30, 30, 30, 30])} fill="#FFFFFF" opacity={prog(f, 414, 422)} />}
        {zOrder.map((k) => <PieceShape key={k} p={pieces[k]} k={k} f={f} layer="label" />)}
        <CutLines f={f} />
        <Check f={f} />
        <Cursor f={f} />
      </svg>
      {/* persistent header */}
      <div style={{position: "absolute", top: 108, left: 0, right: 0, display: "flex", justifyContent: "center"}}>
        <div style={{display: "flex", alignItems: "center", gap: 14, padding: "10px 24px 10px 12px", borderRadius: 40, background: "rgba(255,255,255,0.75)", boxShadow: "0 6px 0 rgba(43,35,80,0.08)"}}>
          <div style={{width: 40, height: 40, borderRadius: 20, background: "#000"}} />
          <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.ink}}>{story.handle}</div>
        </div>
      </div>
      <Caption f={f} />
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="StyleLab" component={Film} durationInFrames={story.durationInFrames} fps={story.fps} width={story.width} height={story.height} />);
