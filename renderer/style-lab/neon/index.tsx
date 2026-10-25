// Style lab · «Неоновый терминал» (neon). PixiJS v8 + pixi-filters v6, manual per-frame render.
// Every visible property is a pure function of the Remotion frame: no ticker, no Math.random, no Date.
import React, {useLayoutEffect, useRef, useState} from "react";
import {AbsoluteFill, Composition, registerRoot, useCurrentFrame, delayRender, continueRender} from "remotion";
import {Application, Container, Graphics, Text, Rectangle} from "pixi.js";
import {AdvancedBloomFilter, CRTFilter, GlitchFilter, RGBSplitFilter, AsciiFilter} from "pixi-filters";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource-variable/manrope";
import story from "../../../work/style-lab/story.json";

const W = 1080, H = 1920, FPS = 30;
const MONO = "'JetBrains Mono', monospace";

// ---------- palette (brand.json + neon cyan) ----------
const C = {
  bg: 0x030507, grid: 0x1c3527, green: 0x65da41, purple: 0x8d59da, lav: 0xe0cdf8, violet: 0xb98cff,
  yellow: 0xf4ca50, pink: 0xe03056, cyan: 0x4fd8e8, ivory: 0xfdfeed, panel: 0x06100b, panel2: 0x0b0716,
};
const PC = [C.green, C.violet, C.yellow, C.cyan]; // packet colours 1..4

// ---------- math ----------
const cl = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const eo = (t: number) => 1 - Math.pow(1 - t, 3);
const eio = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sio = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const P = (f: number, a: number, b: number, e: (t: number) => number = eo) => e(cl((f - a) / (b - a)));
const hash = (n: number) => {const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x);};
const smoothNoise = (x: number, seed: number) => {const i = Math.floor(x), fr = x - i; return lerp(hash(i * 7.13 + seed), hash((i + 1) * 7.13 + seed), sio(fr));};

// ---------- layout ----------
const SERVER = {x: 540, y: 400, w: 440, h: 150};
const ORB = {x: 700, y: 400};
const INBOX = {y: 600, top: 535, h: 130};
const SLOT_X = [240, 440, 640, 840];
const ROUTERS = [{x: 190, y: 880, n: "R1"}, {x: 540, y: 820, n: "R2"}, {x: 890, y: 880, n: "R3"}];
const LAP = {x: 540, y: 1105, w: 640, h: 300};
const CARD = {x: 540, y: 1078, w: 460, h: 150};
const BTN = {x: 540, y: 1196, w: 300, h: 52};
const ROW_Y = 1078;
const CW = 43.2; // JetBrains Mono advance at 72 px (0.6 em)
const MSG = [...story.message]; // П р и в е т !
const OWN = [0, 0, 1, 1, 2, 2, 3];
const PIECES = [[0, 1], [2, 3], [4, 5], [6]];
const HEX = ["D0 9F D1 80", "D0 B8 D0 B2", "D0 B5 D1 82", "21"];
const LOG = ["#1 «Пр» → R1 → сервер", "#2 «ив» → R1 → R2 → сервер", "#3 «ет» → R2 → сервер", "#4 «!»  → R3 → сервер"];
const FINAL = {x: 540, y: 600, textX: 500};

// routes: capsule row -> laptop port -> router(s) -> inbox slot in arrival order 3,1,4,2
const RANK = [1, 3, 0, 2]; // arrival rank of packets 1..4
const DEP = [240, 242, 244, 252];
const DUR = [60, 96, 46, 68]; // arrivals 300, 338, 290, 320
type Pt = {x: number; y: number};
const ROUTE: Pt[][] = [
  [{x: 240, y: ROW_Y}, {x: 240, y: 955}, ROUTERS[0], {x: SLOT_X[1], y: INBOX.y}],
  [{x: 440, y: ROW_Y}, {x: 440, y: 955}, ROUTERS[0], ROUTERS[1], {x: SLOT_X[3], y: INBOX.y}],
  [{x: 640, y: ROW_Y}, {x: 640, y: 955}, ROUTERS[1], {x: SLOT_X[0], y: INBOX.y}],
  [{x: 840, y: ROW_Y}, {x: 840, y: 955}, ROUTERS[2], {x: SLOT_X[2], y: INBOX.y}],
];
const ROUTER_OF: number[][] = [[0], [0, 1], [1], [2]];
const polyLen = (p: Pt[]) => {const L = [0]; for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y)); return L;};
const ROUTE_L = ROUTE.map(polyLen);
const pointAt = (i: number, u: number): Pt => {
  const p = ROUTE[i], L = ROUTE_L[i], d = cl(u) * L[L.length - 1];
  for (let k = 1; k < p.length; k++) if (d <= L[k] || k === p.length - 1) {const t = cl((d - L[k - 1]) / (L[k] - L[k - 1] || 1)); return {x: lerp(p[k - 1].x, p[k].x, t), y: lerp(p[k - 1].y, p[k].y, t)};}
  return p[p.length - 1];
};
const routeU = (i: number, f: number) => eio(cl((f - DEP[i]) / DUR[i]));
// frame at which packet i passes vertex k of its route (numerical, deterministic)
const passFrame = (i: number, k: number) => {const target = ROUTE_L[i][k] / ROUTE_L[i][ROUTE_L[i].length - 1]; for (let f = DEP[i]; f <= DEP[i] + DUR[i]; f += 0.25) if (routeU(i, f) >= target) return f; return DEP[i] + DUR[i];};
const ROUTER_PASS: {r: number; f: number; i: number}[] = [];
ROUTE.forEach((p, i) => p.forEach((pt, k) => {const r = ROUTERS.indexOf(pt as typeof ROUTERS[number]); if (r >= 0) ROUTER_PASS.push({r, f: passFrame(i, k), i});}));
const LINKS: [Pt, Pt][] = [];
ROUTE.forEach((p) => {for (let k = 2; k < p.length; k++) if (!LINKS.some(([a, b]) => (a === p[k - 1] && b === p[k]) || (a === p[k] && b === p[k - 1]))) LINKS.push([p[k - 1], p[k]]);});
LINKS.push([ROUTERS[1], ROUTERS[2]]);

// ---------- packet state ----------
type PState = {x: number; y: number; s: number; cs: number; fw: number; fh: number; fa: number; badge: number; hex: number; cap: number};
const cardGroupX = (i: number) => {const ks = PIECES[i]; return CARD.x + ks.reduce((a, k) => a + (k - 3) * CW, 0) / ks.length;};
const finalGroupX = (i: number) => {const ks = PIECES[i]; return FINAL.textX + ks.reduce((a, k) => a + (k - 3) * CW, 0) / ks.length;};
const shudder = (f: number) => (f < 72 ? 0 : 11 * Math.sin((f - 72) * 1.35) * Math.exp(-(f - 72) / 7));

function packet(i: number, f: number): PState {
  const gw = PIECES[i].length * CW;
  // B: emerge from the card
  const e = P(f, 128 + i * 3, 162 + i * 3, eo);
  let x = lerp(cardGroupX(i) + shudder(f), SLOT_X[i], e);
  let y = ROW_Y + 26 * Math.sin(Math.PI * e) * (i % 2 ? 1 : -1) * 0.4;
  let s = 1, cs = lerp(1, 0.72, e);
  let fw = lerp(gw + 18, 172, e), fh = lerp(92, 116, e), fa = e;
  let badge = P(f, 150 + i * 5, 164 + i * 5), hex = 1;
  // C: idle bob at the row
  y += 3 * Math.sin((f + i * 9) * 0.12) * P(f, 160, 180) * (1 - P(f, 230, 242));
  // D: route
  const u = routeU(i, f);
  if (f >= DEP[i]) {
    const p = pointAt(i, u);
    x = p.x; y = p.y;
    s = u < 0.5 ? lerp(1, 0.66, sio(cl(u / 0.14))) : lerp(0.66, 0.88, sio(cl((u - 0.86) / 0.14)));
    hex = u < 0.5 ? 1 - sio(cl(u / 0.1)) : sio(cl((u - 0.9) / 0.1));
  }
  // F: reorder by arcs into slots 1..4
  const arrived = f >= DEP[i] + DUR[i];
  if (arrived) {
    const r = P(f, 376 + i, 398 + i, eio);
    x = lerp(SLOT_X[RANK[i]], SLOT_X[i], r);
    const dir = SLOT_X[i] < SLOT_X[RANK[i]] ? -1 : 1;
    y = INBOX.y + dir * 58 * Math.sin(Math.PI * r);
    s = 0.88;
    // G: merge into «Привет!»
    const m = P(f, 398, 420, eio);
    x = lerp(x, finalGroupX(i), m);
    y = lerp(y, FINAL.y, m);
    cs = lerp(0.72, 1 / s, m);
    fw = lerp(172, gw + 10, m); fh = lerp(116, 96, m); fa = 1 - P(f, 400, 416);
    badge *= 1 - P(f, 398, 410); hex *= 1 - P(f, 398, 408);
  }
  return {x, y, s, cs, fw, fh, fa, badge, hex, cap: e * (1 - P(f, 398, 420, eio))};
}

// ---------- Pixi scene ----------
type Scene = {
  app: Application; stage: Container; bloom: AdvancedBloomFilter; crt: CRTFilter; glitch: GlitchFilter; rgb: RGBSplitFilter;
  ascii: Container; asciiG: Graphics; fx: Container; scene: Container;
  linksG: Graphics; routersG: Graphics; routerT: Text[]; serverG: Graphics; serverT: Text[]; inboxG: Graphics; inboxT: Text;
  lapG: Graphics; btnT: Text; cardG: Graphics; caps: {c: Container; g: Graphics; num: Text; hex: Text[]}[];
  chars: Text[]; trailsG: Graphics; finalG: Graphics; recvLabel: Text; recv: Text[]; statusT: Text[]; log: Text[]; ticks: Text[];
};

const mkText = (text: string, size: number, color: number, weight: "400" | "700" = "700", anchor = 0.5) => {
  const t = new Text({text, style: {fontFamily: "JetBrains Mono", fontSize: size, fontWeight: weight, fill: color}, resolution: 2});
  t.anchor.set(anchor, 0.5);
  return t;
};

async function buildScene(host: HTMLDivElement): Promise<Scene> {
  await Promise.all([
    document.fonts.load(`700 72px "JetBrains Mono"`, "Привет!"),
    document.fonts.load(`400 18px "JetBrains Mono"`, "D0 9F принято"),
    document.fonts.load(`700 40px "Manrope Variable"`, "Как"),
  ]);
  const app = new Application();
  await app.init({width: W, height: H, background: C.bg, antialias: true, preference: "webgl", autoStart: false, sharedTicker: false, preserveDrawingBuffer: true, resolution: 1, autoDensity: false});
  app.ticker?.stop();
  host.appendChild(app.canvas);
  app.canvas.style.width = `${W}px`; app.canvas.style.height = `${H}px`;
  const full = new Rectangle(0, 0, W, H);
  const stage = app.stage;
  const crt = new CRTFilter({curvature: 1.4, lineWidth: 2.6, lineContrast: 0.16, verticalLine: false, noise: 0.035, noiseSize: 1.6, vignetting: 0.3, vignettingAlpha: 0.72, vignettingBlur: 0.34, seed: 0, time: 0});
  stage.filters = [crt]; stage.filterArea = full;

  // background dot-matrix grid (static)
  const bg = new Graphics();
  for (let y = 24; y < H; y += 30) for (let x = 15; x < W; x += 30) bg.circle(x, y, 1.3);
  bg.fill({color: C.grid, alpha: 0.75});
  stage.addChild(bg);

  // ASCII texture accent: soft blobs rendered through AsciiFilter
  const ascii = new Container(); const asciiG = new Graphics(); ascii.addChild(asciiG);
  ascii.filters = [new AsciiFilter({size: 14, color: C.green, replaceColor: true})]; ascii.filterArea = full;
  stage.addChild(ascii);

  const scene = new Container(); stage.addChild(scene);
  const bloom = new AdvancedBloomFilter({threshold: 0.32, bloomScale: 0.95, brightness: 1, blur: 7, quality: 6});
  scene.filters = [bloom]; scene.filterArea = full;

  const linksG = new Graphics(); scene.addChild(linksG);
  const routersG = new Graphics(); scene.addChild(routersG);
  const routerT = ROUTERS.map((r) => {const t = mkText(r.n, 24, C.cyan); t.position.set(r.x, r.y); scene.addChild(t); return t;});
  const serverG = new Graphics(); scene.addChild(serverG);
  const serverT = [mkText("СЕРВЕР", 30, C.lav, "700", 0), mkText("друг · inbox", 18, C.lav, "400", 0), mkText("входящие", 18, C.lav, "400", 0)];
  serverT.forEach((t) => scene.addChild(t));
  const inboxG = new Graphics(); scene.addChild(inboxG);
  const inboxT = serverT[2];
  const lapG = new Graphics(); scene.addChild(lapG);
  const btnT = mkText("ОТПРАВИТЬ ⏎", 24, C.green); btnT.position.set(BTN.x, BTN.y); scene.addChild(btnT);
  const statusT = ["~/chat $ отправить привет", "~/chat $ отправка… 13 байт", "~/chat $ режу на пакеты", "~/chat $ доставлено ✓"].map((s) => {const t = mkText(s, 18, C.green, "400", 0); scene.addChild(t); return t;});
  const log = LOG.map((s, i) => {const t = mkText(s, 26, PC[i], "400", 0); scene.addChild(t); return t;});
  const ticks = LOG.map((_, i) => {const t = mkText("✓", 26, PC[i], "700", 0); scene.addChild(t); return t;});
  const trailsG = new Graphics(); scene.addChild(trailsG);

  const finalG = new Graphics(); scene.addChild(finalG);
  const fx = new Container(); scene.addChild(fx); fx.filterArea = new Rectangle(0, 960, W, 260);
  const cardG = new Graphics(); fx.addChild(cardG);
  const caps = PIECES.map((_, i) => {
    const c = new Container(); const g = new Graphics(); c.addChild(g);
    const num = mkText(String(i + 1), 24, C.bg); c.addChild(num);
    const hex = [...HEX[i]].map((ch) => {const t = mkText(ch, 18, PC[i], "400"); c.addChild(t); return t;});
    fx.addChild(c);
    return {c, g, num, hex};
  });
  const chars = MSG.map((ch) => {const t = mkText(ch, 72, C.ivory); fx.addChild(t); return t;});
  const recvLabel = mkText("принято:", 24, C.lav, "400", 0); recvLabel.position.set(338, 726); scene.addChild(recvLabel);
  const recv = [0, 1, 2, 3].map((i) => {const t = mkText(String(i + 1), 28, PC[i]); scene.addChild(t); return t;});

  const glitch = new GlitchFilter({slices: 9, offset: 0, direction: 0, fillMode: 0, average: false, seed: 0, red: [0, 0], green: [0, 0], blue: [0, 0]});
  const rgb = new RGBSplitFilter({red: {x: 0, y: 0}, green: {x: 0, y: 0}, blue: {x: 0, y: 0}});
  return {app, stage, bloom, crt, glitch, rgb, ascii, asciiG, fx, scene, linksG, routersG, routerT, serverG, serverT, inboxG, inboxT, lapG, btnT, cardG, caps, chars, trailsG, finalG, recvLabel, recv, statusT, log, ticks};
}

// partial polyline (draw-on)
const lineTo = (g: Graphics, a: Pt, b: Pt, t: number) => {if (t <= 0) return; g.moveTo(a.x, a.y).lineTo(lerp(a.x, b.x, t), lerp(a.y, b.y, t));};
const hexagon = (g: Graphics, x: number, y: number, r: number) => {const pts: number[] = []; for (let k = 0; k < 6; k++) {const a = Math.PI / 6 + (k * Math.PI) / 3; pts.push(x + r * Math.cos(a), y + r * Math.sin(a));} g.poly(pts, true);};
const blob = (g: Graphics, x: number, y: number, r: number, a: number) => {if (a <= 0.002) return; for (let k = 10; k >= 1; k--) g.circle(x, y, (r * k) / 10).fill({color: 0xffffff, alpha: a * 0.11});};

function draw(S: Scene, f: number) {
  // ---- global filters (deterministic per frame) ----
  S.crt.seed = hash(f * 0.731 + 3);
  S.crt.time = f * 0.18;
  S.bloom.bloomScale = 0.9 + 0.12 * P(f, 412, 430);

  // ---- ASCII blobs follow the action ----
  const aLap = 1 - 0.75 * P(f, 200, 270), aNet = P(f, 215, 260) * (1 - 0.7 * P(f, 340, 390)), aSrv = P(f, 280, 340);
  S.asciiG.clear();
  blob(S.asciiG, 540, 1110, 330, 0.55 * aLap * P(f, 0, 24));
  blob(S.asciiG, 540, 860, 420, 0.35 * aNet);
  blob(S.asciiG, 540, 560, 360, 0.6 * aSrv * (0.85 + 0.15 * Math.sin(f * 0.08)));
  // data dust: ASCII glow following each flying packet
  for (let i = 0; i < 4; i++) {const a = packet(i, f), b = packet(i, f - 2); const sp = cl(Math.hypot(a.x - b.x, a.y - b.y) / 14); blob(S.asciiG, a.x, a.y, 120, sp * 0.9 * (1 - P(f, 360, 372)));}
  S.ascii.alpha = 0.3;

  // ---- links with draw-on and flowing dots ----
  const g = S.linksG; g.clear();
  const dimNet = 1 - 0.45 * P(f, 382, 412);
  const linkOn = (k: number) => P(f, 16 + k * 2, 40 + k * 2, eio);
  // laptop ports -> routers
  ROUTE.forEach((p, i) => {lineTo(g, p[1], p[2], linkOn(i)); g.stroke({width: 2, color: C.green, alpha: 0.32 * dimNet});});
  LINKS.forEach(([a, b], k) => {lineTo(g, a, b, linkOn(k + 2)); g.stroke({width: 2, color: C.green, alpha: 0.28 * dimNet});});
  // route preview pulse before launch
  const prev = P(f, 214, 236) * (1 - P(f, 300, 340));
  if (prev > 0) ROUTE.forEach((p, i) => {for (let k = 2; k < p.length; k++) {g.moveTo(p[k - 1].x, p[k - 1].y).lineTo(p[k].x, p[k].y);} g.moveTo(p[1].x, p[1].y).lineTo(p[2].x, p[2].y); g.stroke({width: 3, color: PC[i], alpha: 0.22 * prev});});
  // flowing data dots along links (continuous phase)
  const flow = P(f, 40, 70) * dimNet;
  [...ROUTE.map((p) => [p[1], p[2]] as [Pt, Pt]), ...LINKS].forEach(([a, b], k) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = ((f * 2.2 + k * 37) % 60); d < len; d += 60) {const t = d / len; g.circle(lerp(a.x, b.x, t), lerp(a.y, b.y, t), 2.4);}
    g.fill({color: C.green, alpha: 0.5 * flow});
  });
  // laptop ports
  ROUTE.forEach((p, i) => {g.circle(p[1].x, p[1].y, 5).fill({color: PC[i], alpha: 0.8 * linkOn(i) * dimNet});});

  // ---- routers ----
  const rg = S.routersG; rg.clear();
  ROUTERS.forEach((r, k) => {
    const a = P(f, 8 + k * 4, 24 + k * 4);
    const sc = lerp(0.88, 1, a);
    const dy = lerp(18, 0, a);
    hexagon(rg, r.x, r.y + dy, 46 * sc); rg.fill({color: C.panel, alpha: 0.95 * a}); rg.stroke({width: 3, color: C.cyan, alpha: a * dimNet});
    hexagon(rg, r.x, r.y + dy, 34 * sc); rg.stroke({width: 1.5, color: C.cyan, alpha: 0.35 * a * dimNet});
    ROUTER_PASS.forEach((rp) => {
      if (rp.r !== k) return; const d = f - rp.f; if (d <= -6 || d >= 30) return;
      const pulse = d < 0 ? sio((d + 6) / 6) : Math.exp(-d / 7) * (1 - sio(cl((d - 18) / 12)));
      hexagon(rg, r.x, r.y + dy, 46 + 26 * cl(d / 20)); rg.stroke({width: 3, color: PC[rp.i], alpha: 0.85 * pulse});
      hexagon(rg, r.x, r.y + dy, 46 * sc); rg.fill({color: PC[rp.i], alpha: 0.22 * pulse});
    });
    S.routerT[k].alpha = a * dimNet; S.routerT[k].position.set(r.x, r.y + dy); S.routerT[k].scale.set(sc);
  });

  // ---- server + orb ----
  const sg = S.serverG; sg.clear();
  const sa = P(f, 4, 20), ssc = lerp(0.88, 1, sa), sdy = lerp(18, 0, sa);
  const okA = P(f, 410, 426);
  const sx = SERVER.x - (SERVER.w * ssc) / 2, sy = SERVER.y + sdy - (SERVER.h * ssc) / 2;
  sg.roundRect(sx, sy, SERVER.w * ssc, SERVER.h * ssc, 16).fill({color: C.panel2, alpha: 0.92 * sa}).stroke({width: 3, color: C.purple, alpha: sa});
  // rack lines + LEDs
  for (let k = 0; k < 3; k++) {
    const ly = SERVER.y + sdy + 8 + k * 20;
    sg.roundRect(SERVER.x - 190, ly, 250, 10, 4).stroke({width: 1.5, color: C.purple, alpha: 0.6 * sa});
    const led = 0.35 + 0.65 * smoothNoise(f / 5 + k * 3.1, k + 1) * P(f, 285, 300) * (1 - P(f, 410, 425));
    sg.circle(SERVER.x + 80, ly + 5, 4).fill({color: C.lav, alpha: sa * led * (1 - okA)});
    if (okA > 0) sg.circle(SERVER.x + 80, ly + 5, 4).fill({color: C.green, alpha: sa * okA});
  }
  S.serverT[0].position.set(SERVER.x - 190, SERVER.y + sdy - 40); S.serverT[0].alpha = sa;
  S.serverT[1].position.set(SERVER.x - 190, SERVER.y + sdy - 12); S.serverT[1].alpha = sa * 0.6;
  // orb: idle ring, spins while «thinking», goes green at the end
  const think = P(f, 340, 352) * (1 - P(f, 380, 396));
  const orbA = sa;
  sg.circle(ORB.x, ORB.y + sdy, 40).fill({color: C.purple, alpha: 0.12 * orbA + 0.25 * think}).stroke({width: 2, color: C.purple, alpha: 0.7 * orbA});
  const spin = f * 0.32;
  if (think > 0.01) {
    sg.moveTo(ORB.x + 30 * Math.cos(spin), ORB.y + sdy + 30 * Math.sin(spin)).arc(ORB.x, ORB.y + sdy, 30, spin, spin + 1.9).stroke({width: 6, color: C.yellow, alpha: think, cap: "round"});
    sg.moveTo(ORB.x + 30 * Math.cos(spin + Math.PI), ORB.y + sdy + 30 * Math.sin(spin + Math.PI)).arc(ORB.x, ORB.y + sdy, 30, spin + Math.PI, spin + Math.PI + 1.2).stroke({width: 6, color: C.lav, alpha: think * 0.8, cap: "round"});
  }
  const orbR = 12 + 4 * think * Math.sin(f * 0.6) + 6 * okA;
  sg.circle(ORB.x, ORB.y + sdy, orbR).fill({color: C.lav, alpha: (0.55 + 0.45 * think) * orbA * (1 - okA)});
  if (okA > 0) sg.circle(ORB.x, ORB.y + sdy, orbR).fill({color: C.green, alpha: okA});
  if (okA > 0) {sg.circle(ORB.x, ORB.y + sdy, 40).stroke({width: 4, color: C.green, alpha: okA});}

  // ---- inbox ----
  const ig = S.inboxG; ig.clear();
  const ia = P(f, 10, 26), idy = lerp(18, 0, ia);
  const inboxFade = 1 - 0.6 * P(f, 400, 418);
  ig.roundRect(110, INBOX.top + idy, 860, INBOX.h, 14).stroke({width: 2, color: C.purple, alpha: 0.75 * ia * inboxFade});
  ig.moveTo(450, SERVER.y + SERVER.h / 2).lineTo(450, INBOX.top + idy).moveTo(630, SERVER.y + SERVER.h / 2).lineTo(630, INBOX.top + idy).stroke({width: 2, color: C.purple, alpha: 0.6 * ia});
  S.inboxT.position.set(124, INBOX.top - 18 + idy); S.inboxT.alpha = ia * 0.7 * (1 - P(f, 398, 414));
  const scanX = lerp(90, 990, P(f, 348, 372, sio));
  const scanA = P(f, 346, 352) * (1 - P(f, 370, 378));
  SLOT_X.forEach((x, k) => {
    // which packet arrived into slot k
    const pi = RANK.indexOf(k);
    const arr = DEP[pi] + DUR[pi];
    const flash = f >= arr - 3 ? (f < arr ? sio((f - arr + 3) / 3) : Math.exp(-(f - arr) / 10)) : 0;
    const scan = scanA * Math.exp(-Math.pow((scanX - x) / 70, 2));
    ig.roundRect(x - 92, INBOX.y - 54 + idy, 184, 108, 12).stroke({width: 2, color: C.purple, alpha: ia * inboxFade * 0.4});
    if (flash > 0.003) ig.roundRect(x - 92, INBOX.y - 54 + idy, 184, 108, 12).stroke({width: 3, color: PC[pi], alpha: inboxFade * flash});
    if (scan > 0.003) ig.roundRect(x - 92, INBOX.y - 54 + idy, 184, 108, 12).stroke({width: 3, color: C.yellow, alpha: inboxFade * scan});
  });
  if (scanA > 0) {ig.rect(scanX - 3, INBOX.top + 6, 6, INBOX.h - 12).fill({color: C.yellow, alpha: 0.85 * scanA}); ig.rect(scanX - 22, INBOX.top + 6, 44, INBOX.h - 12).fill({color: C.yellow, alpha: 0.12 * scanA});}

  // ---- laptop ----
  const lg = S.lapG; lg.clear();
  const la = P(f, 0, 16), lsc = lerp(0.88, 1, la), ldy = lerp(18, 0, la);
  const ldim = 1 - 0.45 * P(f, 170, 215) + 0.3 * P(f, 420, 436);
  const lw = LAP.w * lsc, lh = LAP.h * lsc, lx = LAP.x - lw / 2, ly = LAP.y + ldy - lh / 2;
  lg.roundRect(lx, ly, lw, lh, 18).fill({color: C.panel, alpha: 0.9 * la}).stroke({width: 3, color: C.green, alpha: la * ldim});
  lg.poly([lx - 40, ly + lh + 8, lx + lw + 40, ly + lh + 8, lx + lw + 80, ly + lh + 40, lx - 80, ly + lh + 40], true).fill({color: C.panel, alpha: la}).stroke({width: 3, color: C.green, alpha: la * ldim});
  lg.roundRect(LAP.x - 60, ly + lh + 18, 120, 10, 5).stroke({width: 1.5, color: C.green, alpha: 0.6 * la * ldim});
  // title bar dots
  [0, 1, 2].forEach((k) => lg.circle(lx + 26 + k * 22, ly + 22, 6).fill({color: [C.pink, C.yellow, C.green][k], alpha: 0.75 * la * ldim}));
  // send button with press
  const ba = P(f, 18, 32), press = P(f, 64, 70) * (1 - P(f, 74, 96)), bsc = lerp(0.88, 1, ba) * (1 - 0.06 * press);
  const btnGone = 1 - P(f, 150, 175);
  lg.roundRect(BTN.x - (BTN.w * bsc) / 2, BTN.y + ldy - (BTN.h * bsc) / 2, BTN.w * bsc, BTN.h * bsc, 10).fill({color: C.green, alpha: (0.08 + 0.32 * press) * ba * btnGone}).stroke({width: 2.5, color: C.green, alpha: ba * btnGone * ldim});
  S.btnT.alpha = ba * btnGone * ldim; S.btnT.scale.set(bsc); S.btnT.position.set(BTN.x, BTN.y + ldy);
  // upload progress bar under the card while sending (78..118)
  const up = P(f, 78, 118, sio), upA = P(f, 76, 84) * (1 - P(f, 128, 144));
  if (upA > 0) {lg.roundRect(CARD.x - 200, CARD.y + 82, 400, 6, 3).fill({color: C.green, alpha: 0.18 * upA}); lg.roundRect(CARD.x - 200, CARD.y + 82, 400 * up, 6, 3).fill({color: C.green, alpha: 0.9 * upA});}
  // status line in the laptop
  const stA = P(f, 36, 48) * (1 - P(f, 150, 170)) * ldim;
  const stW = [1 - P(f, 66, 74), P(f, 66, 74) * (1 - P(f, 118, 126)), P(f, 118, 126), 0];
  const doneA = P(f, 420, 434);
  S.statusT.forEach((t, k) => {t.alpha = k === 3 ? doneA : stA * stW[k]; t.position.set(lx + 100, ly + 22 + (k === 0 ? 0 : 8 * (1 - (k === 3 ? doneA : stW[k]))));});

  // send log in the laptop terminal: one line per departing packet, tick on arrival
  S.log.forEach((t, i) => {
    const a = P(f, 262 + i * 6, 274 + i * 6);
    t.alpha = a * 0.95; t.position.set(lx + 52 + 18 * (1 - a), ly + 82 + i * 46);
    const arr = DEP[i] + DUR[i], ta = P(f, arr - 2, arr + 10);
    const tk = S.ticks[i]; tk.alpha = ta; tk.position.set(t.x + t.width + 14, ly + 82 + i * 46); tk.scale.set(lerp(0.6, 1, ta));
  });

  // ---- card (typing, press shudder, glitch split) ----
  const cg = S.cardG; cg.clear();
  const ca = P(f, 12, 28), csc = lerp(0.88, 1, ca);
  const dx = shudder(f);
  const cardOut = P(f, 130, 152);
  const cw = CARD.w * csc * (1 + 0.1 * cardOut), ch = CARD.h * csc;
  cg.roundRect(CARD.x + dx - cw / 2, CARD.y + ldy - ch / 2, cw, ch, 16).fill({color: 0x081a10, alpha: 0.9 * ca * (1 - cardOut)}).stroke({width: 3, color: C.green, alpha: ca * (1 - cardOut)});
  // input caret (smooth blink) until sending
  const typedN = (f - 26) / 4; // chars typed
  const caretA = ca * (0.5 + 0.5 * Math.cos(f * 0.21)) * (1 - P(f, 62, 70));
  const caretX = CARD.x + dx + (Math.min(7, Math.max(0, typedN)) - 3.5) * CW + 6;
  if (caretA > 0.01) cg.rect(caretX, CARD.y - 34, 6, 68).fill({color: C.green, alpha: caretA});
  // card glyphs
  S.chars.forEach((t, k) => {
    const i = OWN[k], ps = packet(i, f), j = PIECES[i].indexOf(k), n = PIECES[i].length;
    const typed = P(f, 26 + k * 4, 30 + k * 4, sio);
    const cs = ps.cs * ps.s;
    const bang = k === 6 ? -10 * cs * (1 - ps.cap) : 0; // pull «!» towards «т» outside the capsule
    t.position.set(ps.x + bang + (j - (n - 1) / 2) * CW * cs, ps.y - 10 * ps.cap * ps.s + (f < 128 ? ldy : 0));
    t.scale.set(cs);
    t.alpha = typed;
  });
  // packet capsules
  S.caps.forEach((cp, i) => {
    const ps = packet(i, f), g2 = cp.g; g2.clear();
    cp.c.position.set(ps.x, ps.y); cp.c.scale.set(ps.s);
    if (ps.fa > 0.003) {
      g2.roundRect(-ps.fw / 2, -ps.fh / 2, ps.fw, ps.fh, 18).fill({color: 0x060c0c, alpha: 0.88 * ps.fa}).stroke({width: 3, color: PC[i], alpha: ps.fa});
      g2.roundRect(-ps.fw / 2 + 6, -ps.fh / 2 + 6, ps.fw - 12, ps.fh - 12, 13).stroke({width: 1, color: PC[i], alpha: 0.35 * ps.fa});
    }
    const bx = -ps.fw / 2 + 4, by = -ps.fh / 2 + 4, bs = lerp(0.6, 1, ps.badge);
    if (ps.badge > 0.003) g2.circle(bx, by, 21 * bs).fill({color: PC[i], alpha: ps.badge});
    cp.num.position.set(bx, by); cp.num.scale.set(bs); cp.num.alpha = ps.badge;
    cp.hex.forEach((t, k) => {
      const ty = P(f, 160 + i * 5 + k * 1.2, 164 + i * 5 + k * 1.2, sio);
      t.position.set((k - (cp.hex.length - 1) / 2) * 10.8, 36); t.alpha = ty * ps.hex * ps.fa;
    });
  });

  // ---- glitch + RGB split on the split moment (continuous envelope, smooth slice motion) ----
  const gl = Math.pow(Math.sin(Math.PI * cl((f - 116) / 26)), 1.5);
  if (gl > 0.001) {
    const slices = 9, sizes = new Float32Array(slices), offs = new Float32Array(slices);
    let sum = 0; for (let k = 0; k < slices; k++) {sizes[k] = 0.4 + hash(k * 3.7 + 11); sum += sizes[k];}
    for (let k = 0; k < slices; k++) {sizes[k] /= sum; offs[k] = (smoothNoise(f / 3, k * 5.3) * 2 - 1);}
    S.glitch.sizes = sizes; S.glitch.offsets = offs; S.glitch.redraw();
    S.glitch.offset = 70 * gl; S.glitch.seed = 0;
    S.rgb.red = {x: -13 * gl, y: 2 * gl}; S.rgb.green = {x: 0, y: 0}; S.rgb.blue = {x: 13 * gl, y: -2 * gl};
    S.fx.filters = [S.glitch, S.rgb];
  } else S.fx.filters = [];

  // ---- light trails ----
  const tg = S.trailsG; tg.clear();
  for (let i = 0; i < 4; i++) {
    if (f < DEP[i] - 1) continue;
    let prevP = packet(i, f);
    for (let k = 1; k <= 16; k++) {
      const q = packet(i, f - k * 0.8);
      const sp = Math.hypot(q.x - prevP.x, q.y - prevP.y);
      const a = (1 - k / 17) * cl(sp / 5) * 0.55;
      if (a > 0.01) {tg.moveTo(prevP.x, prevP.y).lineTo(q.x, q.y).stroke({width: 16 * (1 - k / 18), color: PC[i], alpha: a, cap: "round"});}
      prevP = q;
    }
  }

  // ---- arrival order line: «принято: 3 1 4 2» → 1 2 3 4 ----
  const recvA = P(f, 282, 296) * (1 - P(f, 404, 420));
  S.recvLabel.alpha = recvA * 0.8;
  S.recv.forEach((t, i) => {
    const arr = DEP[i] + DUR[i];
    const a = P(f, arr - 2, arr + 6);
    const r = P(f, 376 + i, 398 + i, eio);
    const pos = lerp(RANK[i], i, r);
    t.position.set(530 + pos * 48, 726 - 22 * Math.sin(Math.PI * r) * (i < RANK[i] ? 1 : -1));
    t.alpha = a * (1 - P(f, 404, 420));
    t.scale.set(lerp(0.88, 1, a));
  });

  // ---- final card «Привет!» + check ----
  const fg = S.finalG; fg.clear();
  const fa = P(f, 404, 422), fsc = lerp(0.88, 1, fa);
  const breathe = 1 + 0.015 * Math.sin((f - 426) * 0.12) * P(f, 426, 440);
  const fw = 560 * fsc * breathe, fh = 160 * fsc * breathe;
  if (fa > 0.003) fg.roundRect(FINAL.x - fw / 2, FINAL.y - fh / 2, fw, fh, 20).fill({color: 0x081a10, alpha: 0.6 * fa}).stroke({width: 3, color: C.green, alpha: fa});
  const ck = P(f, 412, 424), ckDraw = P(f, 416, 428, sio);
  const cx = 740, cy = FINAL.y;
  if (ck > 0.003) {
    fg.circle(cx, cy, 34 * lerp(0.88, 1, ck)).fill({color: C.green, alpha: 0.16 * ck}).stroke({width: 3, color: C.green, alpha: ck});
    const pts = [{x: cx - 15, y: cy + 1}, {x: cx - 4, y: cy + 13}, {x: cx + 17, y: cy - 12}];
    const L1 = Math.hypot(11, 12), L2 = Math.hypot(21, 25), d = ckDraw * (L1 + L2);
    if (d > 0) {
      fg.moveTo(pts[0].x, pts[0].y);
      if (d <= L1) fg.lineTo(lerp(pts[0].x, pts[1].x, d / L1), lerp(pts[0].y, pts[1].y, d / L1));
      else {fg.lineTo(pts[1].x, pts[1].y); fg.lineTo(lerp(pts[1].x, pts[2].x, (d - L1) / L2), lerp(pts[1].y, pts[2].y, (d - L1) / L2));}
      fg.stroke({width: 7, color: C.green, alpha: 1, cap: "round", join: "round"});
    }
  }

  S.app.renderer.render(S.stage);
}

// ---------- HTML overlay: header, segment bar, typed captions ----------
const BEATS = story.beats.map((b) => ({...b, a: Math.round(b.from * FPS), b: Math.round(b.to * FPS)}));
const Caption: React.FC<{f: number; k: number}> = ({f, k}) => {
  const beat = BEATS[k];
  const start = k === 0 ? 8 : beat.a;
  const enter = P(f, start, start + 6, eo);
  const exit = k < BEATS.length - 1 ? P(f, BEATS[k + 1].a, BEATS[k + 1].a + 6, eo) : 0;
  if (enter <= 0 || exit >= 1) return null;
  const chars = [...beat.caption];
  const rate = Math.max(1, Math.min(1.5, 30 / chars.length));
  const typedF = (f - start - 2) * rate; // characters revealed (float)
  const n = Math.max(0, Math.min(chars.length, typedF));
  const caret = 0.5 + 0.5 * Math.cos((f - start) * 0.21);
  return (
    <div style={{position: "absolute", left: 0, right: 0, top: 0, display: "flex", justifyContent: "center", transform: `translateY(${(1 - enter) * 64 - exit * 64}px)`, opacity: enter * (1 - exit)}}>
      <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 46, lineHeight: "64px", color: "#EFFFF0", whiteSpace: "pre", textShadow: "0 0 10px rgba(101,218,65,0.35)", position: "relative"}}>
        <span style={{color: "#65DA41"}}>{"› "}</span>
        {chars.map((ch, i) => <span key={i} style={{opacity: cl((typedF - i) / 3)}}>{ch}</span>)}
        <span style={{position: "absolute", top: 8, left: `${(n + 2) * 27.6}px`, width: 24, height: 50, background: "#65DA41", opacity: caret * 0.85}} />
      </div>
    </div>
  );
};

const Film: React.FC = () => {
  const f = useCurrentFrame();
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("pixi init"));
  useLayoutEffect(() => {
    let alive = true;
    if (!host.current || sceneRef.current) return;
    buildScene(host.current).then((s) => {if (!alive) {s.app.destroy(true); return;} sceneRef.current = s; setReady(true);}).catch((e) => {console.error(e); throw e;});
    return () => {alive = false;};
  }, []);
  useLayoutEffect(() => {
    if (!ready || !sceneRef.current) return;
    draw(sceneRef.current, f);
    continueRender(handle);
  }, [f, ready, handle]);
  return (
    <AbsoluteFill style={{background: "#030507"}}>
      <div ref={host} style={{position: "absolute", inset: 0}} />
      {/* header: constant from frame 0 */}
      <div style={{position: "absolute", left: 78, right: 78, top: 74, display: "flex", alignItems: "center", gap: 14, fontFamily: MONO, fontSize: 28, color: "#E0CDF8"}}>
        <span style={{width: 12, height: 12, borderRadius: 6, background: "#65DA41", boxShadow: "0 0 10px #65DA41"}} />
        <span style={{fontWeight: 700}}>@xtuned</span>
        <span style={{color: "#959595", fontWeight: 400, marginLeft: "auto", fontSize: 22}}>net/packets.log</span>
      </div>
      <div style={{position: "absolute", left: 78, right: 78, top: 124, fontFamily: "'Manrope Variable', sans-serif", fontWeight: 700, fontSize: 40, color: "#FDFEED", letterSpacing: -0.5}}>{story.title}</div>
      <div style={{position: "absolute", left: 78, right: 78, top: 200, height: 6, display: "flex", gap: 8}}>
        {BEATS.map((b) => (
          <div key={b.id} style={{flex: b.b - b.a, background: "rgba(101,218,65,0.18)", borderRadius: 3, overflow: "hidden"}}>
            <div style={{width: `${cl((f - b.a) / (b.b - b.a)) * 100}%`, height: "100%", background: "#65DA41"}} />
          </div>
        ))}
      </div>
      {/* captions */}
      <div style={{position: "absolute", left: 78, right: 78, top: 1398, height: 150, overflow: "hidden"}}>
        <div style={{position: "absolute", left: 0, right: 0, top: 40}}>{BEATS.map((_, k) => <Caption key={k} f={f} k={k} />)}</div>
      </div>
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="StyleLab" component={Film} durationInFrames={story.durationInFrames} fps={story.fps} width={story.width} height={story.height} />);
