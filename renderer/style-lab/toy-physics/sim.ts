// Deterministic Matter.js recording for the «Игрушечная физика» style sample.
// Pure module: no Math.random, no Date, fixed timestep. The same params always give the same recording.
import Matter from "matter-js";

export const FPS = 30;
export const SUBSTEPS = 2; // 60 Hz physics, 2 steps per video frame
export const STEP_MS = 1000 / 60;
export const RELEASE_FRAME = 240; // 8.0 s
export const SETTLE_FRAME = 360; // 12.0 s — all packets must rest in the tray (sorting starts at 12.5 s)
export const RECORD_END = 450;

export const BLOCK = 132;
export const BLOCK_R = 30;
export const SHELF_Y = 600;
export const SHELF_X = [400, 560, 720, 880];

export type Router = {x: number; y: number; r: number};
export const ROUTERS: Router[] = [
  {x: 285, y: 880, r: 66},
  {x: 835, y: 860, r: 66},
  {x: 590, y: 1090, r: 66},
];
// Tray on top of the server: inner floor surface y=TRAY_FLOOR, inner x TRAY_L..TRAY_R.
export const TRAY_FLOOR = 1452;
export const TRAY_L = 214;
export const TRAY_R = 866;
export const TRAY_TOP = 1300;
export const WALL_T = 26;
// Funnel ramps (static bars) guiding packets into the tray.
export type Ramp = {x1: number; y1: number; x2: number; y2: number; t: number};
export const RAMPS: Ramp[] = [
  {x1: 70, y1: 1150, x2: 212, y2: 1290, t: 26},
  {x1: 1010, y1: 1150, x2: 868, y2: 1290, t: 26},
];
export const EXPECTED_ORDER = [2, 0, 3, 1]; // packets 3,1,4,2 (0-based indices)

export type Launch = {vx: number; vy: number; w: number; delay: number};
export type SimParams = {launch: Launch[]; belt: number};

export const PARAMS: SimParams = {
  // Found by the seeded search in work/style-lab/toy-physics/tune.ts (seed 33, 20000 random trials + 20000 refinements).
  belt: 0.00031278322592843326,
  launch: [
    {vx: 0.2, vy: -5, w: 0.057, delay: 4},
    {vx: 2.4, vy: -6.6, w: 0.03, delay: 3},
    {vx: -4.5, vy: -2.3, w: -0.003, delay: 10},
    {vx: -7.2, vy: -5.4, w: 0.053, delay: 0},
  ],
};

export type Sample = {x: number; y: number; a: number; vx: number; vy: number; live: boolean};
export type Hit = {frame: number; block: number; other: string; speed: number};
export type Recording = {
  frames: Sample[][]; // index = frame - RELEASE_FRAME
  hits: Hit[];
  arrival: number[]; // frame each block first entered the tray
  order: number[]; // blocks sorted by arrival
  finalOrder: number[]; // blocks sorted by x at SETTLE_FRAME
  settled: boolean;
  wallHits: number;
  routerHits: number[][]; // per block: router indices in hit order
};

export function simulate(params: SimParams = PARAMS): Recording {
  const {Engine, Bodies, Composite, Body, Events} = Matter;
  const engine = Engine.create({enableSleeping: false});
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  engine.positionIterations = 10;
  engine.velocityIterations = 8;

  const statics: Matter.Body[] = [];
  ROUTERS.forEach((r, i) => statics.push(Bodies.circle(r.x, r.y, r.r, {isStatic: true, label: `router-${i}`, restitution: 0.8, friction: 0.01})));
  for (const rp of RAMPS) {
    const len = Math.hypot(rp.x2 - rp.x1, rp.y2 - rp.y1);
    statics.push(Bodies.rectangle((rp.x1 + rp.x2) / 2, (rp.y1 + rp.y2) / 2, len, rp.t, {isStatic: true, label: "ramp", angle: Math.atan2(rp.y2 - rp.y1, rp.x2 - rp.x1), friction: 0.02, restitution: 0.2, chamfer: {radius: rp.t / 2 - 1}}));
  }
  const trayW = TRAY_R - TRAY_L;
  statics.push(Bodies.rectangle((TRAY_L + TRAY_R) / 2, TRAY_FLOOR + 20, trayW + 2 * WALL_T, 40, {isStatic: true, label: "tray", friction: 0.05, restitution: 0.15}));
  statics.push(Bodies.rectangle(TRAY_L - WALL_T / 2, (TRAY_TOP + TRAY_FLOOR) / 2, WALL_T, TRAY_FLOOR - TRAY_TOP, {isStatic: true, label: "tray-wall", friction: 0.02, restitution: 0.1, chamfer: {radius: 12}}));
  statics.push(Bodies.rectangle(TRAY_R + WALL_T / 2, (TRAY_TOP + TRAY_FLOOR) / 2, WALL_T, TRAY_FLOOR - TRAY_TOP, {isStatic: true, label: "tray-wall", friction: 0.02, restitution: 0.1, chamfer: {radius: 12}}));
  // Invisible frame edges keep packets on screen.
  statics.push(Bodies.rectangle(20, 1000, 40, 1400, {isStatic: true, label: "wall"}));
  statics.push(Bodies.rectangle(1060, 1000, 40, 1400, {isStatic: true, label: "wall"}));
  Composite.add(engine.world, statics);

  const blocks = SHELF_X.map((x, i) => Bodies.rectangle(x, SHELF_Y, BLOCK, BLOCK, {
    label: `block-${i}`, chamfer: {radius: BLOCK_R}, restitution: 0.42, friction: 0.08, frictionStatic: 0.3, frictionAir: 0.012, density: 0.002,
  }));
  const live = [false, false, false, false];

  const hits: Hit[] = [];
  let curFrame = RELEASE_FRAME;
  Events.on(engine, "collisionStart", (ev: Matter.IEventCollision<Matter.Engine>) => {
    for (const p of ev.pairs) {
      const a = p.bodyA.label, b = p.bodyB.label;
      const ba = a.startsWith("block-") ? p.bodyA : b.startsWith("block-") ? p.bodyB : null;
      if (!ba) continue;
      const other = ba === p.bodyA ? p.bodyB : p.bodyA;
      const rv = Math.hypot(ba.velocity.x - other.velocity.x, ba.velocity.y - other.velocity.y);
      hits.push({frame: curFrame, block: Number(ba.label.slice(6)), other: other.label, speed: rv});
      if (other.label.startsWith("block-")) hits.push({frame: curFrame, block: Number(other.label.slice(6)), other: ba.label, speed: rv});
    }
  });

  const frames: Sample[][] = [];
  const arrival = [-1, -1, -1, -1];
  for (let f = RELEASE_FRAME; f < RECORD_END; f++) {
    curFrame = f;
    for (let i = 0; i < 4; i++) {
      if (!live[i] && f >= RELEASE_FRAME + params.launch[i].delay) {
        live[i] = true;
        Composite.add(engine.world, blocks[i]);
        Body.setVelocity(blocks[i], {x: params.launch[i].vx, y: params.launch[i].vy});
        Body.setAngularVelocity(blocks[i], params.launch[i].w);
      }
    }
    // Record the state shown on this frame (before stepping).
    frames.push(blocks.map((b, i) => ({x: b.position.x, y: b.position.y, a: b.angle, vx: b.velocity.x, vy: b.velocity.y, live: live[i]})));
    for (let i = 0; i < 4; i++) {
      const b = blocks[i];
      if (live[i] && arrival[i] < 0 && b.position.y > TRAY_TOP && b.position.x > TRAY_L && b.position.x < TRAY_R) arrival[i] = f;
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      for (let i = 0; i < 4; i++) {
        const b = blocks[i];
        // Conveyor belt: a small leftward push for packets resting in the tray.
        if (live[i] && b.position.y > TRAY_FLOOR - BLOCK && b.position.x > TRAY_L && b.position.x < TRAY_R) b.force.x -= b.mass * params.belt;
      }
      Engine.update(engine, STEP_MS);
    }
  }
  const order = [0, 1, 2, 3].filter((i) => arrival[i] >= 0).sort((p, q) => arrival[p] - arrival[q] || p - q);
  const s = frames[SETTLE_FRAME - RELEASE_FRAME];
  const finalOrder = [0, 1, 2, 3].sort((p, q) => s[p].x - s[q].x);
  const settled = s.every((b) => Math.hypot(b.vx, b.vy) < 0.25 && b.y > TRAY_TOP);
  const routerHits = [0, 1, 2, 3].map((i) => hits.filter((h) => h.block === i && h.other.startsWith("router-")).map((h) => Number(h.other.slice(7))));
  return {frames, hits, arrival, order, finalOrder, settled, wallHits: hits.filter((h) => h.other === "wall").length, routerHits};
}

let cache: Recording | null = null;
export function getRecording(): Recording {
  if (cache) return cache;
  const rec = simulate(PARAMS);
  const ok = rec.order.join() === EXPECTED_ORDER.join() && rec.finalOrder.join() === EXPECTED_ORDER.join() && rec.settled;
  if (!ok) throw new Error(`toy-physics: arrival order broke: order=${rec.order.map((i) => i + 1)} final=${rec.finalOrder.map((i) => i + 1)} settled=${rec.settled}`);
  cache = rec;
  return rec;
}
