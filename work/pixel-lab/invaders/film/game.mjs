// One wave of the alien rack, simulated by the arcade rules (facts.md), in game frames (60 per second) and the game's
// own height units Yr (pixels UP from the bottom of the 256-px screen; an alien's Yr is its bottom edge):
//  • every frame ONE living alien moves (2 px sideways, or 8 px down on a drop pass), cycling from the bottom-left;
//    so with n aliens alive each one moves every n frames, and a lone last alien moves every frame (3 px right, 2 left);
//  • when an alien passes a wall, the next pass drops every alien 8 px and reverses;
//  • each kill freezes the march for 16 frames; an alien below Yr 40 has landed (game over) — checked below.
// The wave starts with its bottom row at Yr 72 (the arcade's height for waves 4–6) and the player carves a 2-column gap on
// the way down; at G1 the bottom row reaches Yr 40, the last height before landing (the Nagoya height).
export const COLS = 11, ROWS = 5, CW = 16, RH = 16, N = COLS * ROWS;
export const KIND = ["squid", "squid", "beetle", "beetle", "jelly"];          // row 0 = bottom (our own drawings)
export const SPR_W = { squid: 12, beetle: 12, jelly: 10 };
export const START_Y = 72, X0 = 24, WALL_L = 9, WALL_R = 215, NAGOYA_Y = 40;
export const CANNON_Y = 32;                                                     // cannon rows Yr 32–39
export const HIT_LO = 30, HIT_HI = 38;                                          // a shot whose bottom is at Yr 30–38 can kill
export const col = (id) => id % COLS, row = (id) => Math.floor(id / COLS);
export const yd = (yr) => 256 - yr;                                            // screen y (down) of the TOP of row Yr

/** run the wave; kills: [[id, g]] (g = frame of death); returns histories and events */
export function simulate(kills, gEnd) {
  const killAt = new Map(kills.map(([id, g]) => [id, g]));
  const pos = [], hist = [], deadAt = new Array(N).fill(Infinity);
  for (let id = 0; id < N; id++) { const x = X0 + col(id) * CW + (CW - SPR_W[KIND[row(id)]]) / 2; pos.push({ x, y: START_Y + row(id) * RH, pose: 0 }); hist.push([{ g: -1e9, x, y: START_Y + row(id) * RH, pose: 0 }]); }
  let dir = 1, down = false, bump = false, cursor = 0, pauseUntil = -1, landed = null;
  const drops = [], alive = (id, g) => g < deadAt[id];
  for (const [id, g] of kills) deadAt[id] = g;
  const killsByG = new Map(); for (const [id, g] of kills) { if (!killsByG.has(g)) killsByG.set(g, []); killsByG.get(g).push(id); }
  for (let g = 0; g < gEnd; g++) {
    if (killsByG.has(g)) pauseUntil = g + 16;
    if (g < pauseUntil) continue;
    const live = []; for (let id = 0; id < N; id++) if (alive(id, g)) live.push(id);
    if (!live.length) break;
    let id = live.find((k) => k >= cursor); if (id == null) { id = live[0]; }
    if (id < cursor || (cursor === 0 && id === live[0] && g > 0 && pos._started)) { /* new pass */ }
    if (id === live[0] && pos._started) { // a new pass begins with the first living alien
      if (down) down = false; else if (bump) { down = true; dir = -dir; bump = false; drops.push(g); }
    }
    pos._started = true;
    const p = pos[id];
    if (down) p.y -= 8; else p.x += dir > 0 ? (live.length === 1 ? 3 : 2) : -2;
    p.pose ^= 1;
    const w = SPR_W[KIND[row(id)]];
    if (!down && ((dir > 0 && p.x + w >= WALL_R) || (dir < 0 && p.x <= WALL_L))) bump = true;
    if (p.y < NAGOYA_Y && landed == null) landed = { g, id };
    hist[id].push({ g, x: p.x, y: p.y, pose: p.pose });
    cursor = id + 1;
  }
  return { hist, deadAt, drops, landed };
}
/** an alien's state at fractional frame gf; each step eases over `easeG` frames, the pose cross-fades with it */
export function alienAt(h, gf, easeG) {
  let lo = 0, hi = h.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (h[m].g <= gf) lo = m; else hi = m - 1; }
  const cur = h[lo], prev = h[lo - 1] || cur, k = Math.min(1, Math.max(0, (gf - cur.g) / Math.max(1e-6, easeG))), e = k * k * (3 - 2 * k);
  return { x: prev.x + (cur.x - prev.x) * e, y: prev.y + (cur.y - prev.y) * e, pose: cur.pose, prevPose: prev.pose, poseK: lo === 0 ? 1 : e, steps: lo };
}
