// Deterministic Breakout simulation (rules from the Atari 1976 service manual, research.md): 8 rows × 14 bricks, points
// 7/7/5/5/3/3/1/1 top→bottom; 4 paddle parts → 4 fixed rebound directions whatever the incoming angle; 4 speeds per serve:
// SLOW, step 2 on the 4th paddle hit, step 3 on the 12th, and the first orange/red (5/7-point) brick jumps straight to TOP;
// a breakout (the ball hits the top wall, which it can only reach through the wall) halves the paddle (eased over 0.3 s)
// until the ball is lost; the next serve restores the full paddle and the slow speed. Any brick contact removes the brick
// and reverses the vertical direction. The paddle is "ideal": at each crossing it is placed so that the plan's part is hit
// (or, on a planned miss, it arrives too late) — the drawn paddle moves smoothly between those contact points.
// Pure: no clock, no Math.random; the same inputs give the same path. Grid units (540×960 film grid), seconds.
export const F = { L: 44, R: 436, T: 300, BX0: 44, BY0: 348, BW: 28, BH: 10, COLS: 14, ROWS: 8, PY: 588, PH: 6, B: 6, OUT: 650 };
export const SPEEDS = [240, 300, 370, 460];
export const ZONE_DEG = [-50, -22, 22, 50];
export const ZONE_ANG = ZONE_DEG.map((d) => (d * Math.PI) / 180);
export const VALUE = [7, 7, 5, 5, 3, 3, 1, 1];
export const PW = [56, 28], SHRINK_S = 0.3, SR = 240, DT = 1 / 1200;
export const brickRect = (i) => { const r = Math.floor(i / F.COLS), col = i % F.COLS; return { r, col, x: F.BX0 + col * F.BW, y: F.BY0 + r * F.BH }; };

export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * simulate({ t0, x, y, ang, down, level, hits, alive, zones, offs, missAfter, tEnd, half, bricks })
 * ang: angle from vertical (rad) of the start velocity; down: true if moving down. alive: Uint8Array(112) (copied).
 * Returns { samples (Float32Array x,y per 1/SR from t0), t0, hits [{t, zone, cx, w, level}], bricks [{t, i, row}],
 * tops [t], walls [t], levels [{t, level}], shrink (t | null), lost (t crossing | null), out (t | null), end {…} }.
 */
export function simulate(o) {
  const alive = Uint8Array.from(o.alive), res = { t0: o.t0, hits: [], bricks: [], tops: [], walls: [], levels: [], shrink: o.shrinkAt ?? null, lost: null, out: null };
  let x = o.x, y = o.y, level = o.level, hits = o.hits, k = 0, t = o.t0;
  let vx = SPEEDS[level] * Math.sin(o.ang), vy = SPEEDS[level] * Math.cos(o.ang) * (o.down ? 1 : -1);
  const n = Math.ceil((o.tEnd - o.t0) * SR) + 2, S = new Float32Array(n * 2); let si = 0;
  const width = (tt) => (res.shrink == null || tt < res.shrink ? PW[o.half ? 1 : 0] : PW[0] + (PW[1] - PW[0]) * Math.min(1, (tt - res.shrink) / SHRINK_S));
  const setLevel = (L, tt) => { if (L <= level) return; const s = Math.hypot(vx, vy), f = SPEEDS[L] / s; vx *= f; vy *= f; level = L; res.levels.push({ t: tt, level: L }); };
  const steps = Math.round(1 / (SR * DT));
  let missed = false;
  for (let step = 0; ; step++) {
    if (step % steps === 0) { if (si < n) { S[si * 2] = x; S[si * 2 + 1] = y; si++; } }
    if (t >= o.tEnd) break;
    const px = x, py = y; x += vx * DT; y += vy * DT; t += DT;
    if (x < F.L) { x = 2 * F.L - x; vx = Math.abs(vx); res.walls.push(t); }
    if (x + F.B > F.R) { x = 2 * (F.R - F.B) - x; vx = -Math.abs(vx); res.walls.push(t); }
    if (y < F.T) { y = 2 * F.T - y; vy = Math.abs(vy); res.tops.push(t); if (res.shrink == null && !o.half) res.shrink = t; }
    // bricks
    if (y < F.BY0 + F.ROWS * F.BH && y + F.B > F.BY0) {
      const c0 = Math.floor((x - F.BX0) / F.BW), c1 = Math.floor((x + F.B - 0.001 - F.BX0) / F.BW), r0 = Math.floor((y - F.BY0) / F.BH), r1 = Math.floor((y + F.B - 0.001 - F.BY0) / F.BH);
      let best = -1, bd = 1e9;
      for (let r = Math.max(0, r0); r <= Math.min(F.ROWS - 1, r1); r++) for (let c = Math.max(0, c0); c <= Math.min(F.COLS - 1, c1); c++) {
        const i = r * F.COLS + c; if (!alive[i]) continue; const d = Math.hypot(F.BX0 + c * F.BW + F.BW / 2 - x - 3, F.BY0 + r * F.BH + F.BH / 2 - y - 3); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) { alive[best] = 0; const row = Math.floor(best / F.COLS); res.bricks.push({ t, i: best, row }); vy = -vy; y = py; if (row <= 3) setLevel(3, t); }
    }
    // paddle plane
    if (vy > 0 && py + F.B < F.PY && y + F.B >= F.PY && !missed) {
      const kk = k, wantMiss = o.missAfter != null && t >= o.missAfter;
      if (wantMiss) { missed = true; res.lost = t; }
      else {
        const w = width(t), z0 = o.zones[kk % o.zones.length], u = o.offs[kk % o.offs.length], bc = x + 3;
        let pc = bc - ((z0 + u) / 4 - 0.5) * w; pc = Math.max(F.L + w / 2, Math.min(F.R - w / 2, pc));
        const rel = bc - pc, z = Math.max(0, Math.min(3, Math.floor((rel / w + 0.5) * 4)));
        const s = SPEEDS[level]; vx = s * Math.sin(ZONE_ANG[z]); vy = -s * Math.cos(ZONE_ANG[z]); y = F.PY - F.B; k++; hits++;
        res.hits.push({ t, zone: z, cx: pc, w, bc, n: hits });
        if (hits === 4) setLevel(1, t); if (hits === 12) setLevel(2, t);
        // recompute speed after a step (level may have just changed)
        const s2 = SPEEDS[level], a = ZONE_ANG[z]; vx = s2 * Math.sin(a); vy = -s2 * Math.cos(a);
      }
    }
    if (y > F.OUT) { res.out = t; break; }
  }
  res.samples = S.subarray(0, si * 2); res.end = { t, x, y, vx, vy, level, hits, alive };
  return res;
}

/** Position (top-left) of the ball at sim time t from a result's samples (linear between 1/SR samples). */
export function at(res, t) {
  const n = res.samples.length / 2, f = (t - res.t0) * SR, i = Math.max(0, Math.min(n - 2, Math.floor(f))), k = Math.max(0, Math.min(1, f - i));
  return [res.samples[i * 2] + (res.samples[i * 2 + 2] - res.samples[i * 2]) * k, res.samples[i * 2 + 1] + (res.samples[i * 2 + 3] - res.samples[i * 2 + 1]) * k];
}
