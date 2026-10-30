// Building kit («Fake buttons», builder BUILDING): world-space layers baked once, a world-space drawing proxy for the
// frame, the building's geometry and every beat time of the lobby / ride / office, all derived from timeline.mjs (EV).
// Pure: caches only memoise; nothing depends on the wall clock.
import { Canvas, hex, mix, bayer, fade, MAIN, TINY } from "../../../../../renderer/pixel/raster.mjs";
import { EV, BLD, SHAFT, THERMO, FLOOR, PAN_TO_LOBBY, RIDE, BACK_TO_CORNER } from "../timeline.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export { Canvas, hex, mix, bayer, fade, MAIN, TINY };

// ---------------------------------------------------------------- geometry (world px, y grows down)
export const G = {
  x0: BLD.x0, x1: BLD.x1,                 // −90 … 620
  face: [BLD.x0, BLD.x0 + 30],            // the facade strip with the glass entrance (−90 … −60)
  in0: BLD.x0 + 30,                       // interior starts (−60)
  sw0: SHAFT.x0 - 6, sh0: SHAFT.x0, sh1: SHAFT.x1, sw1: SHAFT.x1 + 6,   // shaft walls 414…420 | 560…566
  st0: SHAFT.x1 + 6, st1: BLD.x1 - 10,    // stairwell 566 … 610, outer wall 610 … 620
  floors: [BLD.f1, BLD.f2, BLD.f3],       // 0, −300, −600 (floor surfaces = feet)
  roof: BLD.roof,                         // −900
  base: { ceil: 30, floor: 226 },         // basement: ceiling band 30…42, back wall 42…226, floor band 226…252
  slab: 28,                               // slab section under each floor surface: F+2 … F+30
};
/** Room bands of a floor F: floor band (receding) F−24…F+2, back wall F−258…F−24, ceiling band F−270…F−258. */
export const band = (F) => ({ floorTop: F - 24, floor: F, slab0: F + 2, slab1: F + 30, wallTop: F - 258, ceil: F - 270 });
// the elevator car (world, at the lobby): body x 420…560, floor at carY, top at carY − 246; door opening 440…540, 0…−200
export const CAR = { x0: SHAFT.x0, x1: SHAFT.x1, h: 246, door: [SHAFT.x0 + 20, SHAFT.x1 - 20], doorH: 200, post: 20 };
// the inside button panel on the car's back wall (car-local: x from CAR.x0, y from the car floor)
export const CPANEL = { x: 24, y: -156, w: 20, h: 64 };
export const CLOSE_BTN = { x: CAR.x0 + CPANEL.x + 10, y: -102 };     // centre of the CLOSE (▶|◀) button at the lobby
// the hall call panel on the lobby wall left of the shaft (FIRE keyswitch + CLOSE icon)
export const HPANEL = { x: 372, y: -174, w: 36, h: 96 };
export const KEYSW = { x: HPANEL.x + 18, y: HPANEL.y + 58 };          // the keyswitch cylinder (centre)
// office props (world)
export const THERMO_P = { x: THERMO.x, y: THERMO.y, r: 15 };          // 250, −450
export const BOX = { x: 340, y: -550, w: 66, h: 30 };                // the building computer box under the duct
export const DUCT = { x0: 230, x1: G.sw0, y0: -570, y1: -552 };
export const XSTRIP = { x0: 226, x1: 274, y0: -566, y1: -468 };       // the X-ray wall strip above the thermostat
export const DESK_A = { x0: 14, x1: 128 }, DESK_B = { x0: 138, x1: 216 };
export const COLLEAGUE = { x: 70, y: BLD.f2 };                          // seated, front view, behind desk A
export const PHONE = { x: 196, y: BLD.f2 - 66 };                        // desk phone on desk B (complaints)

// ---------------------------------------------------------------- beats (seconds; all from EV / timeline windows)
const E = EV;
export const T = {
  // lobby: the worker jabs CLOSE again and again (it lights, nothing happens); later slower, sulky jabs under the lens
  jabs: [E.elevator + 0.06, E.elevator + 0.34, E.close + 0.06, E.button2 + 0.06, E.button2 + 0.36, E.us - 0.3, E.first - 0.18, E.seconds + 0.16, E.anything],
  arc: [E.us - 0.25, E.slowly + 0.13],                  // door-timer arc: dissolves in and fills 17.0 → 22.6 ("WAIT")
  lens: [E.us - 0.22, E.law - 0.2],                      // X-ray lens over the car's panel (open ≈ 17.0, closed ≈ 20.2)
  oldWalk: [PAN_TO_LOBBY[0] - 3.2, E.slowly - 0.36],     // the older man shuffles from the bench side to the doors
  oldStep: [E.slowly - 0.36, E.slowly + 0.12],           // he turns and steps over the sill (crosses it on "slowly")
  workerBack: [E.law + 0.15, E.law + 0.75],              // the worker steps back to make room, polite smile
  doorsClose: [E.slowly + 0.16, E.slowly + 0.86],        // ≈ 22.6 – 23.3
  ffIn: [E.slowlyEnd + 0.42, E.slowlyEnd + 0.8],         // firefighter dissolves in at the call panel (≈ 23.2)
  ffReach: [E.firefighters + 0.55, E.use + 0.25],        // he lifts the key to the keyswitch
  ffTurn: [E.key - 0.24, E.key],                          // the key turns, completing on "key"
  ffRed: [E.key - 0.06, E.key + 0.16],                    // the panel's CLOSE icon lights red
  ffOut: [E.keyEnd - 0.16, RIDE[0]],                      // he dissolves away by RIDE[0]
  ride: [RIDE[0], RIDE[1]],                               // the car rises floor 1 → 2 with the camera
  doorsOpen: [RIDE[1], RIDE[1] + 0.45],                   // office: doors open
  wTurn: [RIDE[1] + 0.12, RIDE[1] + 0.3],                 // the worker turns left
  wWalk: [RIDE[1] + 0.26, E.poll - 0.12],                 // he walks to the thermostat (≈ 1 s)
  wReach: [E.poll - 0.12, E.poll + 0.2],                  // he reaches up to the dial
  dial: [E.technicians + 0.12, E.n51 + 0.32, E.n70 + 0.22],   // dial notches 22→21, 21→20, 20→19 (each 0.22 s)
  wDown: [E.installed - 0.2, E.installed + 0.15],         // he lowers his arm, steps back a little
  doorsClose2: [E.poll + 0.3, E.poll + 1.0],              // the car doors close again (the older man rides on)
  xray: [E.fake2 - 0.12, E.fake2 + 0.18],                 // the wall strip opens on "fake"
  xrayOut: [E.complaining - 0.15, BACK_TO_CORNER[0]],     // and closes as the camera leaves
  notConnected: [E.fake2 + 0.08, E.fake2 + 0.32],
  smile: [E.people2 - 0.05, E.people2 + 0.3],             // both smile
  hearts: [E.turn, E.dial + 0.05, E.better + 0.3, E.stop + 0.12],   // little hearts float up (worker, worker, colleague, colleague)
  brrHeart: [E.better - 0.08, E.better + 0.24],           // "BRR" turns into "♥"
  ring: [E.office + 0.85, E.technicians + 0.44, E.n70 + 0.5, E.stop - 0.4],   // the desk phone's ring bursts (between the dial ticks; the last one is cut on "stop")
  ringStop: [E.stop - 0.05, E.stop + 0.2],                // the ringing stops on "stop"
  brrIn: [RIDE[1] - 0.6, RIDE[1] - 0.2],
};
export const DIAL_STEP = 0.22;
export const RING_LEN = 0.62;
/** Car floor y at time t (world): lobby 0 → office −300 along the camera's own ease during RIDE. */
export function carY(t) { return -FLOOR * ease((t - T.ride[0]) / (T.ride[1] - T.ride[0])); }
/** Door opening 0 (closed) … 1 (fully open). */
export function doorOpen(t) {
  if (t < T.doorsClose[0]) return 1;
  if (t < T.doorsOpen[0]) return 1 - ease((t - T.doorsClose[0]) / (T.doorsClose[1] - T.doorsClose[0]));
  if (t < T.doorsClose2[0]) return ease((t - T.doorsOpen[0]) / (T.doorsOpen[1] - T.doorsOpen[0]));
  return 1 - ease((t - T.doorsClose2[0]) / (T.doorsClose2[1] - T.doorsClose2[0]));
}

// ---------------------------------------------------------------- world-space drawing
/** A Canvas-compatible surface that draws world coordinates into screen canvas c through view V (integer camera). */
export function worldOf(c, V) {
  const g = Object.create(c), dx = 270 - V.cx, dy = 480 - V.cy;
  g.px = (x, y, col) => c.px(x + dx, y + dy, col);
  g.get = (x, y) => c.get(x + dx, y + dy);
  g.dx = dx; g.dy = dy; g.base = c;
  return g;
}
/** Dithered gate: draws only where keep(X, Y) (screen pixel) is true. inv=false: where a > bayer; inv=true: where a ≤ bayer. */
export function gate(g, a, inv = false) {
  if (!inv && a >= 1) return g; if (inv && a <= 0) return g;
  const o = Object.create(g), dx = g.dx ?? 0, dy = g.dy ?? 0;
  o.px = (x, y, col) => { const b = bayer(Math.floor(x + dx), Math.floor(y + dy)); if (inv ? a <= b : a > b) g.px(x, y, col); };
  return o;
}
/** Clip a surface to a predicate on world coordinates. */
export function clip(g, keep) { const o = Object.create(g); o.px = (x, y, col) => { if (keep(x, y)) g.px(x, y, col); }; return o; }

// ---------------------------------------------------------------- baked layers (world space, magenta = empty)
const KEY = hex("#FF00FF");
export class Layer {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0; this.y0 = y0; this.w = x1 - x0; this.h = y1 - y0;
    this.cv = new Canvas(this.w, this.h, "#FF00FF");
    const g = Object.create(this.cv), cv = this.cv;
    g.px = (x, y, col) => cv.px(x - x0, y - y0, col);
    g.get = (x, y) => cv.get(x - x0, y - y0);
    g.dx = -x0; g.dy = -y0;
    this.g = g; this.m = null;
  }
  seal() {
    const d = this.cv.d, n = this.w * this.h, m = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (!(d[i * 3] === KEY[0] && d[i * 3 + 1] === KEY[1] && d[i * 3 + 2] === KEY[2])) m[i] = 1;
    // row spans of drawn pixels for a fast blit
    const rows = [];
    for (let y = 0; y < this.h; y++) { const sp = []; let x = 0; while (x < this.w) { while (x < this.w && !m[y * this.w + x]) x++; const a = x; while (x < this.w && m[y * this.w + x]) x++; if (x > a) sp.push(a, x); } rows.push(sp); }
    this.m = m; this.rows = rows; return this;
  }
  /** Copy the layer into the frame (only drawn pixels). */
  blit(c, V) {
    const d = c.d, W = c.w, src = this.cv.d, ox = this.x0 - V.cx + 270, oy = this.y0 - V.cy + 480;
    const y0 = Math.max(0, oy), y1 = Math.min(c.h, oy + this.h);
    for (let Y = y0; Y < y1; Y++) {
      const sp = this.rows[Y - oy], rowS = (Y - oy) * this.w, rowD = Y * W;
      for (let k = 0; k < sp.length; k += 2) {
        const a = Math.max(sp[k] + ox, 0), b = Math.min(sp[k + 1] + ox, W); if (b <= a) continue;
        const s0 = (rowS + a - ox) * 3; d.set(src.subarray(s0, s0 + (b - a) * 3), (rowD + a) * 3);
      }
    }
  }
}

// ---------------------------------------------------------------- small art helpers (on any surface g)
export const OUT = "#1A1220";
/** Vertical gradient of a ramp across [y0, y1) in `steps` dithered bands. */
export function vgrad(g, x0, y0, w, h, cols, k0 = 0, k1 = 1) {
  for (let y = y0; y < y0 + h; y++) {
    const v = lerp(k0, k1, (y - y0) / Math.max(1, h - 1)) * (cols.length - 1), lo = Math.floor(v), f = v - lo;
    for (let x = x0; x < x0 + w; x++) g.px(x, y, cols[Math.min(cols.length - 1, f > bayer(x + 64, y + 64) ? lo + 1 : lo)]);
  }
}
export function box(g, x, y, w, h, fill, out = OUT, hi = null, lo = null) {
  g.rect(x, y, w, h, out); g.rect(x + 1, y + 1, w - 2, h - 2, fill);
  if (hi) g.rect(x + 1, y + 1, w - 2, 1, hi);
  if (lo) g.rect(x + 1, y + h - 2, w - 2, 1, lo);
}
/** Text with a 1-px dark shadow (readable on light and dark). */
export function label(g, font, s, x, y, col, scale = 1, sh = OUT) { g.text(font, s, x + 1, y + 1, sh, { scale }); g.text(font, s, x, y, col, { scale }); }
export function textW(font, s, scale = 1) { let w = 0; for (const ch of s.toUpperCase()) w += ch === " " ? (font.space + 1) * scale : ((font.glyphs[ch] ?? font.glyphs["?"])[0].length + 1) * scale; return w - scale; }
