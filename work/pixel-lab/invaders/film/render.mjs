// «The lowest aliens can't hit you» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: one arcade screen fills the frame edge to edge (space above, the moon's ground under the field to the
// bottom edge); karaoke captions sit on a soft dithered shade. One persistent field and ONE full cycle of a wave:
// frame 0 = the wave has just reached the last height before landing → harmless shots pop on the cannon → slow
// motion: where a shot starts, the hit strip, a higher alien's shot (would hit), the lowest alien's shot (too low) →
// one row up can hit, one step down lands → point-blank clearing → one alien per frame, the last alien racing →
// a new wave appears and marches down to the same frame.   node render.mjs --stills 0,3.5,… | --video
import { fileURLToPath } from "node:url";
import { Canvas, MAIN, mix, bayer, fade, hex } from "./lib/raster.mjs";
import { P, stext, textW, tag, panel, stamp, pointer, smooth, ease, lerp, win, clamp01 } from "./lib/ui.mjs";
import { makeCaptions } from "./lib/captions.mjs";
import { cli } from "./lib/out.mjs";
import { view, drawBackdrop, drawSprite, wrect, GROUND_Y, GW, GH, SY } from "./field.mjs";
import { ALIEN, ALIEN_COL, CANNON, CANNON_COL, BOMB, BURST, POP, SHIELD, SHIELD_COL } from "./sprites.mjs";
import { KIND, SPR_W, col, row, N, HIT_LO, HIT_HI } from "./game.mjs";
import { EV, END, FPS, VOICE, gameAt, filmOfG, KILL_T, SIM, G1, G_CLEAR, alienState, LAST, C_ALIEN, B_ALIEN, PRE, T_NEW, T_CLEAR, G_DEMO } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const R = Math.round, RED = "#FF3B4E", WHITE = "#FFFFFF";
const wrapT = (t) => ((t % END) + END) % END;
const top = (yr) => 248 - yr;                       // screen-world y of the top of an 8-row sprite whose bottom is at Yr
const CANNON_W = 13, CANNON_TOP = top(32);           // 216
const kindOf = (id) => KIND[row(id)];

// ---------------------------------------------------------------- kills, explosions
const KILL = new Map(); for (const k of KILL_T) KILL.set(k.id, k);
const isOldKill = (k) => k.tag !== "gap";
/** is alien id present (alpha) at film time t on the wave shown at t */
function alienAlpha(id, t, st) {
  const k = KILL.get(id); if (!k) return 1;
  if (st.wave === "old") { if (!isOldKill(k)) return 0; return 1 - smooth(t, k.t, k.t + 0.1); }
  if (isOldKill(k)) return 1; return 1 - smooth(t, k.t, k.t + 0.1);
}
const burstDur = (k) => Math.max(0.22, Math.min(0.7, 16 / Math.max(1, gameAt(k.t).rate)));

// ---------------------------------------------------------------- shields: 4 arches, wiped where an alien's box passes
const SHIELD_X = [32, 77, 122, 167], SHIELD_TOP = top(48) - 8;   // Yr 48–63 → y 192..208
const EAT = SHIELD_X.map(() => new Float64Array(22 * 16).fill(Infinity));
for (let id = 0; id < N; id++) { const w = SPR_W[kindOf(id)];
  for (const p of SIM.hist[id]) { const y0 = top(p.y), x0 = Math.round(p.x);
    SHIELD_X.forEach((sx, s) => { for (let j = 0; j < 16; j++) { const yy = SHIELD_TOP + j; if (yy < y0 || yy >= y0 + 8) continue; for (let i = 0; i < 22; i++) { const xx = sx + i; if (xx < x0 || xx >= x0 + w) continue; const q = j * 22 + i; if (p.g < EAT[s][q]) EAT[s][q] = Math.max(0, p.g); } } }); } }
function drawShields(c, V, t, st) {
  const fresh = smooth(t, T_NEW, T_NEW + 0.5), z = V.z;
  SHIELD_X.forEach((sx, s) => { for (let j = 0; j < 16; j++) for (let i = 0; i < 22; i++) { if (SHIELD[j][i] !== "#") continue; const q = j * 22 + i;
    const x0 = R(V.X(sx + i)), x1 = R(V.X(sx + i + 1)), y0 = R(V.Y(SHIELD_TOP + j)), y1 = R(V.Y(SHIELD_TOP + j + 1)); if (x1 <= 0 || x0 >= GW || y1 <= 0 || y0 >= GH) continue;
    const oldOn = (st.wave === "old" ? st.g : G_CLEAR) < EAT[s][q], newOn = st.wave === "new" && st.g < EAT[s][q];
    const hi = j === 0 || SHIELD[j - 1][i] !== "#", col = hi && z > 3 ? "#A8F5A8" : SHIELD_COL;
    for (let y = Math.max(0, y0); y < Math.min(GH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(GW, x1); x++) {
      const on = st.wave === "new" ? (fresh > bayer(x, y) ? newOn : (G_CLEAR < EAT[s][q])) : oldOn; if (on) c.px(x, y, col); } } });
}

// ---------------------------------------------------------------- aliens
function drawAliens(c, V, t, st, opts = {}) {
  let nAlive = 0; for (let id = 0; id < N; id++) if (alienAlpha(id, t, st) > 0) nAlive++;
  const easeG = Math.min(Math.max(0.3, st.rate * 0.07), 0.8 * Math.max(1, nAlive));
  const appear = st.wave === "new" ? smooth(t, T_NEW, T_NEW + 0.5) : 1;
  for (let id = 0; id < N; id++) {
    const a = alienAlpha(id, t, st) * appear; if (a <= 0) continue;
    const k = kindOf(id), s = alienState(id, st.g, easeG), map = ALIEN_COL[k];
    const x = s.x, y = top(s.y);
    if (s.poseK < 1 && s.prevPose !== s.pose) { const kk = s.poseK; drawSprite(c, V, ALIEN[k][s.prevPose], x, y, map, { alpha: a, gate: (X, Y) => !(kk > bayer(X + 1, Y + 2)) }); drawSprite(c, V, ALIEN[k][s.pose], x, y, map, { alpha: a, gate: (X, Y) => kk > bayer(X + 1, Y + 2) }); }
    else drawSprite(c, V, ALIEN[k][s.pose], x, y, map, { alpha: a });
  }
  // bursts where aliens died (film-time dissolve, never shorter than 0.22 s)
  for (const kd of KILL_T) {
    const old = isOldKill(kd); if ((st.wave === "old") !== old) continue;
    const d = burstDur(kd); if (t < kd.t - 0.03 || t > kd.t + d) continue;
    const s = alienState(kd.id, kd.g, 0.3), a = Math.min(smooth(t, kd.t - 0.03, kd.t + 0.04), 1 - smooth(t, kd.t + d * 0.45, kd.t + d)); if (a <= 0) continue;
    drawSprite(c, V, BURST, s.x + SPR_W[kindOf(kd.id)] / 2 - 6.5, top(s.y), { "#": mix(ALIEN_COL[kindOf(kd.id)]["#"], WHITE, 0.45) }, { alpha: a });
  }
  return nAlive;
}

// ---------------------------------------------------------------- the cannon's path (film time), its shots
const centerAt = (id, t) => { const st = gameAt(t), s = alienState(id, st.g, 0.3); return s.x + SPR_W[kindOf(id)] / 2; };
const launchOf = (kd) => { const s = alienState(kd.id, kd.g, 0.3), travel = Math.max(0, (s.y - 40) / 4); return { t: travel > 0 ? filmOfG(kd.g - travel, isOldKill(kd) ? "old" : "new") : kd.t, x: s.x + SPR_W[kindOf(kd.id)] / 2, travel }; };
const LAUNCH = KILL_T.map((kd) => ({ kd, ...launchOf(kd) }));
const gapX = (alienState(2, G1, 0.3).x + alienState(3, G1, 0.3).x) / 2 + 6;
const WAY = [];
{ const A = (id) => alienState(id, gameAt(1.0).g, 0.3).x + SPR_W[kindOf(id)] / 2;
  WAY.push([0.8, centerAt(4, 0.8)], [4.6, centerAt(4, 4.4)], [5.15, centerAt(5, 5.2)], [7.6, centerAt(5, 7.4)], [8.7, centerAt(C_ALIEN, 8.7)], [36.6, centerAt(C_ALIEN, 36.7)]);
  for (const L of LAUNCH) { if (L.kd.tag === "a" || L.kd.tag === "b" || L.kd.id === C_ALIEN) continue; WAY.push([L.t, L.x]); }
  WAY.sort((p, q) => p[0] - q[0]);
  WAY.push([END - 0.75, gapX], [END + 0.8, WAY[0][1]]);
  WAY.splice(0, 0, [-0.75, gapX]);
  WAY.sort((p, q) => p[0] - q[0]); }
// the gap phase: after the last kill of the old wave, drift back to the gap before the new wave's kills
function cannonX(t) {
  t = wrapT(t); let tt = t; if (tt < WAY[0][0]) tt += END;
  let i = 0; while (i < WAY.length - 2 && WAY[i + 1][0] <= tt) i++;
  const [t0, x0] = WAY[i], [t1, x1] = WAY[i + 1]; if (tt <= t0) return x0; if (tt >= t1) return x1;
  const hold = Math.min(0.12, (t1 - t0) * 0.3), k = ease((tt - t0 - hold) / Math.max(1e-3, t1 - t0 - hold)); return lerp(x0, x1, k);
}
function drawCannon(c, V, t, a = 1) { drawSprite(c, V, CANNON, cannonX(t) - CANNON_W / 2, CANNON_TOP, CANNON_COL, { alpha: a }); }
function drawPlayerShots(c, V, t, st) {
  for (const L of LAUNCH) { const old = isOldKill(L.kd); if ((st.wave === "old") !== old) continue;
    if (L.travel > 0) { if (t < L.t || t > L.kd.t) continue; const k = (t - L.t) / Math.max(1e-3, L.kd.t - L.t), yy = lerp(CANNON_TOP - 4, top(alienState(L.kd.id, L.kd.g, 0.3).y) + 4, k); wrect(c, V, L.x - 0.5, yy, 1, 4, WHITE); }
    else { const a = win(t, L.t - 0.05, L.t + 0.02, 0.04, 0.12); if (a > 0) wrect(c, V, L.x - 0.5, CANNON_TOP - 5, 1, 5, WHITE, a); } }
}

// ---------------------------------------------------------------- alien shots: three harmless pops in the hook (game time)
const HOOK_SHOTS = [{ id: 4, t: 0.86, kind: "zig" }, { id: 5, t: 3.36, kind: "plunger" }, { id: 5, t: 5.3, kind: "rod" }].map((s) => {
  const g0 = gameAt(s.t).g, a = alienState(s.id, g0, 0.3), x = a.x + SPR_W[kindOf(s.id)] / 2 - 1.5, y0 = a.y - 10 - 4;   // first drawn 4 px below its spawn
  // falls 4/3 px per game frame; pops where it overlaps the cannon (too low to count) or on the ground
  let end = null; for (let gg = g0 + 3; gg < g0 + 200; gg += 0.25) { const yb = y0 - ((gg - g0 - 3) * 4) / 3, cx = cannonX(filmOfG(gg, "old")); const over = x + 3 > cx - 6.5 && x < cx + 6.5 && yb <= 39 && yb + 7 >= 32;
    if (over) { end = { g: gg, yb, on: "cannon" }; break; } if (yb < 21) { end = { g: gg, yb: 21, on: "ground" }; break; } }
  return { ...s, g0, x, y0, end, tEnd: filmOfG(end.g, "old"), tFirst: filmOfG(g0 + 3, "old") };
});
function drawHookShots(c, V, t, st) {
  if (st.wave !== "old") return;
  for (const s of HOOK_SHOTS) {
    if (s.tEnd - s.tFirst > 0.12 && t >= s.tFirst - 0.04 && t < s.tEnd) { const yb = s.y0 - ((st.g - s.g0 - 3) * 4) / 3, f = Math.floor(st.g / 3) & 3, a = smooth(t, s.tFirst - 0.04, s.tFirst + 0.02); drawSprite(c, V, BOMB[s.kind][f], s.x, top(Math.min(s.y0, yb)), { "#": WHITE }, { alpha: a }); }
    const d = 0.35; if (t >= s.tEnd - 0.02 && t < s.tEnd + d) { const a = Math.min(smooth(t, s.tEnd - 0.02, s.tEnd + 0.03), 1 - smooth(t, s.tEnd + d * 0.4, s.tEnd + d)); drawSprite(c, V, POP, s.x - 1.5, top(s.end.yb), { "#": s.end.on === "cannon" ? "#FFE6A0" : "#C8FFC8" }, { alpha: a }); }
  }
}

// ---------------------------------------------------------------- the slow-motion demonstration (film time)
const BX = () => alienState(B_ALIEN, gameAt(EV.starts).g, 0.3), AX = () => alienState(C_ALIEN, gameAt(EV.shots3).g, 0.3);
const B_SHOT = { t0: EV.starts - 0.05, fall0: EV.drop - 0.05, hitT: EV.die - 0.12 }, A_SHOT = { t0: EV.shots3, fall0: EV.touch - 0.05, popT: EV.too - 0.08 };
function shotY_B(t) { const b = BX(), y0 = b.y - 14; if (t < B_SHOT.fall0) return y0; return lerp(y0, 37, ease((t - B_SHOT.fall0) / (B_SHOT.hitT - B_SHOT.fall0))); }   // bottom Yr: 42 → into the strip, onto the ghost cannon
function drawDemo(c, V, t, st) {
  // the hit strip: shot bottoms at Yr 30–38 count (screen-world y 217..226)
  const strip = win(t, EV.counts - 0.1, EV.againEnd + 0.2, 0.4, 0.5); const yS0 = 255 - HIT_HI, yS1 = 256 - HIT_LO;
  const bHit = win(t, B_SHOT.hitT - 0.08, B_SHOT.hitT + 0.5, 0.1, 0.5);
  if (strip > 0) { const col = bHit > 0 ? mix("#F4CA50", RED, bHit) : "#F4CA50"; wrect(c, V, -40, yS0, 304, 0.6, col, strip); wrect(c, V, -40, yS1 - 0.6, 304, 0.6, col, strip); }
  const sx = (x) => V.X(x), syy = (y) => V.Y(y);
  if (strip > 0) tag(c, ["HIT STRIP"], sx(-40) + 70 > 40 ? 90 : 90, syy(yS1) + 8, strip * smooth(t, EV.thin - 0.1, EV.thin + 0.3), "#F4CA50", 2, { minX: 12, maxX: 300 });
  // B's shot: starts a little below B (bracket), falls into the strip onto a ghost cannon
  const b = BX(), bx = b.x + SPR_W[kindOf(B_ALIEN)] / 2 - 1.5, bA = win(t, B_SHOT.t0, B_SHOT.hitT, 0.25, 0.05);
  if (bA > 0) { const yb = shotY_B(t), f = Math.floor(t * 8) & 3; drawSprite(c, V, BOMB.zig[f], bx, top(yb), { "#": WHITE }, { alpha: bA });
    const br = win(t, EV.starts + 0.1, EV.alienEnd + 0.6, 0.3, 0.35); if (br > 0) { const g = fade(c, br), x = R(sx(bx + 5)), y0 = R(syy(top(b.y) + 8)), y1 = R(syy(top(b.y - 14) + 0)); g.rect(x, y0, 6, 1, P.cy); g.rect(x, y1, 6, 1, P.cy); g.rect(x + 2, y0, 1, y1 - y0, P.cy);
      tag(c, ["SHOT", "STARTS HERE"], x - 70, y1 + 10, br, P.cy, 2); } }
  // ghost cannon under B and its end
  const gA = win(t, EV.higher - 0.1, EV.dieEnd + 0.4, 0.35, 0.5);
  if (gA > 0) { const gx = bx + 1.5 - CANNON_W / 2, dead = smooth(t, B_SHOT.hitT - 0.02, B_SHOT.hitT + 0.15);
    drawSprite(c, V, CANNON, gx, CANNON_TOP, { "#": mix("#5BE36A", RED, dead), h: mix("#C9FFC9", RED, dead), d: mix("#2A8A3A", "#7A1020", dead) }, { alpha: gA * 0.55 });
    if (dead > 0) { drawSprite(c, V, BURST, gx, CANNON_TOP - 1, { "#": "#FFD070" }, { alpha: gA * win(t, B_SHOT.hitT - 0.02, B_SHOT.hitT + 0.45, 0.06, 0.4) }); stamp(c, "HIT", sx(gx + 6), syy(CANNON_TOP) - 70, gA * dead, RED, 3, dead); } }
  // A's shot: starts below the strip (arrow), touches the cannon, pops: TOO LOW
  const a = AX(), ax = a.x + SPR_W[kindOf(C_ALIEN)] / 2 - 1.5, aA = win(t, A_SHOT.t0, A_SHOT.popT, 0.25, 0.04);
  const ayb = 26;                                                       // first drawn at Yr 26: already under the strip
  if (aA > 0) { drawSprite(c, V, BOMB.rod[Math.floor(t * 8) & 3], ax, top(ayb), { "#": WHITE }, { alpha: aA });
    const ar = win(t, EV.below2 - 0.15, EV.lowEnd + 0.2, 0.3, 0.35); if (ar > 0) { const x = R(sx(ax + 1.5)), y = R(syy(top(ayb) + 8)); const ty = R(V.Y(GROUND_Y + 4)); tag(c, ["STARTS BELOW", "THE STRIP"], x + 120, ty, ar, P.cy, 2); pointer(c, x + 60, ty + 2, x + 6, y + 2, ar, P.cy); } }
  const pop = win(t, A_SHOT.popT - 0.02, EV.lowEnd + 0.5, 0.06, 0.5);
  if (pop > 0) { drawSprite(c, V, POP, ax - 1.5, top(26), { "#": "#FFE6A0" }, { alpha: pop * (1 - smooth(t, A_SHOT.popT + 0.25, A_SHOT.popT + 0.6)) }); stamp(c, "TOO LOW", sx(ax + 1.5), syy(CANNON_TOP) - 74, pop, P.gr, 3, smooth(t, A_SHOT.popT, A_SHOT.popT + 0.15)); }
  // one row up can hit: a frame round B
  const up = win(t, EV.one1 - 0.1, EV.againEnd + 0.15, 0.3, 0.35);
  if (up > 0) { const g = fade(c, up * (0.7 + 0.3 * Math.sin(t * 9))), x0 = R(sx(b.x - 2)), y0 = R(syy(top(b.y) - 2)), x1 = R(sx(b.x + 14)), y1 = R(syy(top(b.y) + 10)); g.frame(x0, y0, x1 - x0, y1 - y0, RED); g.frame(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, RED); tag(c, ["ONE ROW UP", "CAN HIT YOU"], (x0 + x1) / 2, y0 - 56, up, RED, 2); }
}
function drawStripFill(c, V, t) {
  const strip = win(t, EV.counts - 0.1, EV.againEnd + 0.2, 0.4, 0.5); if (strip <= 0) return; const yS0 = 255 - HIT_HI, yS1 = 256 - HIT_LO;
  const bHit = win(t, B_SHOT.hitT - 0.08, B_SHOT.hitT + 0.5, 0.1, 0.5), col = bHit > 0 ? mix("#7A5A10", "#7A1020", bHit) : "#6A5418";
  wrect(c, V, -40, yS0, 304, yS1 - yS0, col, strip * 0.75);
}
// one more step down: a ghost of the front row slides 8 px onto the cannon's row → GAME OVER (lives left)
function drawLanding(c, V, t, st) {
  const a = win(t, EV.step - 0.2, EV.leftEnd + 0.15, 0.35, 0.45); if (a <= 0 || st.wave !== "old") return;
  const dy = 8 * ease((t - EV.step) / (EV.land - EV.step + 0.1));
  for (let id = 0; id < 11; id++) { if (alienAlpha(id, t, st) <= 0) continue; const s = alienState(id, st.g, 0.3), k = kindOf(id); drawSprite(c, V, ALIEN[k][s.pose], s.x, top(s.y) + dy, { "#": "#FF8090", h: "#FFD0D8", d: "#A02838", e: "#3A0010" }, { alpha: a * 0.6 }); }
  if (t > EV.step - 0.1) { const g = fade(c, a * 0.6), x = R(V.X(cannonX(t) + 18)), y0 = R(V.Y(top(40) - 6)), y1 = R(V.Y(top(32) - 2)); g.rect(x, y0, 2, y1 - y0, P.iv); g.poly([[x - 4, y1 - 6], [x + 6, y1 - 6], [x + 1, y1 + 1]], P.iv); tag(c, ["8 PX"], x + 30, y0, a * smooth(t, EV.step, EV.step + 0.3), P.iv, 2); }
  const go = smooth(t, EV.game2 - 0.1, EV.game2 + 0.1); if (go > 0) stamp(c, "GAME OVER", 270, V.Y(top(56)) - 30, a * go, RED, 4, go);
  const lv = win(t, EV.lives - 0.2, EV.leftEnd + 0.1, 0.25, 0.4); if (lv > 0) { const x = R(V.X(LIVES_X + 30)), y = R(V.Y(LIVES_Y + 3)); tag(c, ["2 LIVES LEFT"], x + 40, y - 40, lv * a, P.y, 2, { minX: 10 }); pointer(c, x + 20, y - 18, x, y - 2, lv * a, P.y); }
}

// the saucer crosses the top once while the army is being cleared (film time, right → left)
import { SAUCER, SAUCER_COL } from "./sprites.mjs";
const UFO = { t0: EV.speeds - 0.2, t1: EV.sixty + 0.4 };
function drawUfo(c, V, t) { if (t < UFO.t0 || t > UFO.t1) return; const k = (t - UFO.t0) / (UFO.t1 - UFO.t0), x = lerp(232, -24, k), a = Math.min(smooth(t, UFO.t0, UFO.t0 + 0.2), 1 - smooth(t, UFO.t1 - 0.2, UFO.t1)); drawSprite(c, V, SAUCER, x, 40, SAUCER_COL, { alpha: a }); }
// ---------------------------------------------------------------- ground line, lives, hud bits
const LIVES_X = 8, LIVES_Y = 242;
function drawGround(c, V, t) {
  wrect(c, V, -60, GROUND_Y, 344, 1.2, "#5BE36A");
  stext(c, MAIN, "2", V.X(LIVES_X), V.Y(LIVES_Y), Math.max(1, V.z * 1.0), "#5BE36A");
  for (let i = 0; i < 2; i++) drawSprite(c, V, CANNON, LIVES_X + 10 + i * 16, LIVES_Y, CANNON_COL);
}
// the cursor that shows "one alien per frame": a frame round the alien that moved most recently
function drawCursor(c, V, t, st) {
  const a = win(t, EV.moves1 - 0.25, EV.frame + 0.45, 0.25, 0.35); if (a <= 0 || st.wave !== "old") return;
  let best = -1, bg = -1e9; for (let id = 0; id < N; id++) { if (alienAlpha(id, t, st) <= 0) continue; const h = SIM.hist[id]; let lo = 0, hi = h.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (h[m].g <= st.g) lo = m; else hi = m - 1; } if (h[lo].g > bg) { bg = h[lo].g; best = id; } }
  if (best < 0) return; const s = alienState(best, st.g, 0.3), g = fade(c, a), x0 = R(V.X(s.x - 2)), y0 = R(V.Y(top(s.y) - 2)), x1 = R(V.X(s.x + SPR_W[kindOf(best)] + 2)), y1 = R(V.Y(top(s.y) + 10));
  g.frame(x0, y0, x1 - x0, y1 - y0, P.y); g.frame(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, P.y);
}

// ---------------------------------------------------------------- story tags (screen space)
function story(c, V, t, st, nAlive) {
  { const a = win(t, HOOK_SHOTS[0].tEnd - 0.05, EV.you1End + 0.2, 0.2, 0.35); if (a > 0) tag(c, ["NO HIT"], V.X(cannonX(t)) + 70, V.Y(CANNON_TOP) - 26, a, P.gr, 3); }
  for (const s of HOOK_SHOTS.slice(1)) { const a = win(t, s.tEnd - 0.05, s.tEnd + 0.9, 0.2, 0.35); if (a > 0) tag(c, [s.end.on === "cannon" ? "NO HIT" : "MISS"], V.X(s.x + 1.5) + (s.end.on === "cannon" ? 60 : 0), V.Y(top(s.end.yb)) - 50, a, P.gr, 2); }
  { const a = win(t, EV.lowest - 0.2, EV.you1End + 0.1, 0.3, 0.35); tag(c, ["THE LOWEST ROW"], 270, V.Y(top(40)) - 70, a, P.y, 2); }
  { const a = win(t, EV.nagoya - 0.15, EV.attackEnd + 0.5, 0.3, 0.4); tag(c, ["THE NAGOYA", "ATTACK"], 270, 120, a, P.y, 3); }
  { const a = win(t, EV.bug - 0.1, EV.leftEnd + 0.2, 0.3, 0.4) * (1 - win(t, EV.counts - 0.1, EV.heightEnd, 0.2, 0.2) * 0); tag(c, ["SLOW MOTION"], 100, 70, a, P.l, 2); }
  { const a = win(t, EV.cleared - 0.15, EV.rangeEnd + 0.2, 0.25, 0.35); tag(c, ["POINT-BLANK"], V.X(cannonX(t)), V.Y(CANNON_TOP) + 40, a, P.gr, 2); }
  { const f = smooth(st.rate, 120, 220) * smooth(t, EV.so1 - 0.3, EV.so1); if (f > 0) tag(c, [">> FAST"], 460, 70, f, P.cy, 2); }
  { const a = win(t, EV.moves1 - 0.2, EV.frame + 0.45, 0.25, 0.35); tag(c, ["1 ALIEN", "PER FRAME"], 270, 66, a, P.y, 3); }
  { const a = win(t, EV.sixty - 0.15, T_CLEAR - 0.05, 0.25, 0.25); if (a > 0) { const s = alienState(LAST, gameAt(t).g, 0.3); tag(c, ["60 STEPS", "A SECOND"], V.X(s.x + 6), V.Y(top(s.y)) - 76, a, P.y, 2); } }
  { const a = win(t, EV.last - 0.1, T_CLEAR - 0.05, 0.2, 0.25); if (a > 0) { const s = alienState(LAST, gameAt(t).g, 0.3); tag(c, ["LAST ALIEN"], V.X(s.x + 6), V.Y(top(s.y)) + 30, a, P.iv, 2); } }
  { const a = win(t, EV.creator - 0.15, EV.bug2 + 0.9, 0.3, 0.35); tag(c, ["ITS CREATOR:", "'A PROGRAMMING BUG'"], 270, 70, a, P.y, 2); }
  { const a = win(t, EV.taito - 0.15, EV.inEnd + 0.5, 0.3, 0.35); tag(c, ["TAITO", "LEFT IT IN"], 270, 70, a, P.p7, 3); }
}

// ---------------------------------------------------------------- camera
const CAM = { HOOK: { cx: 82, cy: 206, z: 6 }, MID: { cx: 96, cy: 194, z: 3.4 }, ARMY: { cx: 112, cy: 168, z: 2.6 }, DEMO: { cx: 112, cy: 212, z: 6.2 }, LAND: { cx: 100, cy: 200, z: 3.4 }, FULL: { cx: 112, cy: 150, z: 540 / 224 } };
const KEYS = [[0, 1.6, CAM.HOOK], [3.0, 5.6, CAM.MID], [6.3, EV.bug - 0.1, CAM.ARMY], [EV.every - 0.2, EV.againEnd, CAM.DEMO], [EV.one1 + 1.6, EV.leftEnd, CAM.LAND], [EV.so1 + 0.4, EV.top2 - 0.6, CAM.FULL], [END - 0.5, END + 2, CAM.HOOK]];
function rawCam(t) {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++;
  const [, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return { ...A };
  const [b0, , B] = KEYS[i + 1], k = ease((t - a1) / (b0 - a1));
  return { cx: lerp(A.cx, B.cx, k), cy: lerp(A.cy, B.cy, k), z: Math.exp(lerp(Math.log(A.z), Math.log(B.z), k)) };
}
const FR = Math.round(END * FPS), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / FPS));
function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % FR, SM = 6; let cx = 0, cy = 0, lz = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  return { cx: cx / w, cy: cy / w, z: Math.exp(lz / w) };
}

// ---------------------------------------------------------------- frame
const CAP = makeCaptions(VOICE, END);
export function frame(t, opts = {}) {
  t = wrapT(t);
  const c = opts.canvas || new Canvas(GW, GH, "#000000"), V = view(opts.cam || camera(t)), st = gameAt(t);
  drawBackdrop(c, V, t, END); drawStripFill(c, V, t); drawGround(c, V, t); drawShields(c, V, t, st); drawUfo(c, V, t);
  const nAlive = drawAliens(c, V, t, st);
  drawLanding(c, V, t, st); drawCursor(c, V, t, st);
  drawHookShots(c, V, t, st); drawPlayerShots(c, V, t, st);
  drawCannon(c, V, t);
  drawDemo(c, V, t, st);
  if (opts.story !== false) story(c, V, t, st, nAlive);
  if (opts.captions !== false) { CAP.shade(c); CAP.draw(c, t); }
  return c;
}
export { HOOK_SHOTS, LAUNCH, UFO, B_SHOT, A_SHOT, burstDur };
if (process.argv[1] && process.argv[1].endsWith("render.mjs")) await cli(frame, END, FPS, HERE, "invaders");
