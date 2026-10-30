// «Infinite aura» · builder C — the dinosaurs. On "dinosaurs" the cloud sea at the bottom right starts to boil; on
// "wake" a huge cartoon T-rex head bursts up out of it (cloud spray flying off), then ROARS: jaw wide open, rows of
// teeth, tongue, shaking head, shock rings rolling toward him. A long-necked brachiosaurus rises slowly at the far left
// and munches a cloud, blinking. Both stay, bob and breathe; the T-rex roars again now and then (one roar is caught by
// the time stop and freezes mid-air with its rings). Everything runs on world time τ = X.T.
import { part, smooth, ell, rot, oval, tube, bez, puffs, seaPalette, shock, slide, heroHead, fade, mix, bayer, sm, lerp, clamp01, rnd, ease, easeOut, backOut, R, PI, GW, GH } from "./C-kit.mjs";
import { EV, STOP } from "./timeline.mjs";

// ---------------------------------------------------------------- palette
const OUT = "#0B1408";
const REX = ["#0B1A0C", "#173418", "#235222", "#33722C", "#4C9636", "#6CB646", "#94D262", "#C4EC8E"];
const BELLY = ["#2E2408", "#5A4612", "#8A6E1E", "#B89630", "#D8B84A", "#ECD272", "#F6E6A0", "#FFF6D2"];
const MOUTH = "#4A0818", MOUTH2 = "#7A1028", TONGUE = ["#5A0E22", "#8E1C3A", "#C23654", "#E2587A", "#F282A0", "#FAB0C4", "#FFD8E4", "#FFF0F4"];
const TOOTH = "#FFFBEA", TOOTH_S = "#D6CCB0";
const BRA = ["#0C1C22", "#143238", "#1E4C52", "#2A686C", "#3A888A", "#54A8A4", "#7EC8BE", "#B4E6DA"];
const BRA_B = ["#2A2A18", "#46462A", "#666440", "#8A865A", "#AEA876", "#CCC696", "#E4DEB8", "#F6F2DC"];

// ---------------------------------------------------------------- timing
const WAKE = EV.wake, BOIL = EV.dinosaurs - 0.05;
const RISE0 = WAKE - 0.16, RISE1 = WAKE + 0.24;                    // the burst
/** Roars: [start τ, open time, hold, close, size]. The last one is caught by the time stop (τ freezes ≈ 25.82). */
export const ROARS = [[WAKE + 0.2, 0.16, 0.62, 0.3, 1], [EV.meteors + 0.05, 0.12, 0.3, 0.22, 0.6], [EV.explodes - 0.05, 0.14, 0.55, 0.3, 1], [EV.staring + 0.25, 0.12, 0.25, 0.25, 0.55], [EV.million + 0.1, 0.14, 0.6, 0.3, 1], [EV.time - 0.32, 0.16, 3, 0.3, 1]];
function jawAt(T) {
  let open = 0, shake = 0, ring = null, size = 0;
  for (const [a, up, hold, down, sz] of ROARS) {
    const k = Math.min(easeOut((T - a) / up), 1 - sm(T, a + up + hold, a + up + hold + down));
    if (k > open) { open = k; size = sz; }
    if (T >= a && T < a + up + hold + 1.2) { ring = { a, sz }; shake = Math.max(shake, sz * clamp01((T - a) / up) * (1 - sm(T, a + up + hold * 0.7, a + up + hold + down))); }
  }
  return { open, shake, ring, size };
}
const BRA0 = EV.dinosaurs + 0.05, BRA1 = EV.wake + 0.95;

// ---------------------------------------------------------------- the T-rex head (facing left), local px, origin = jaw hinge
const SKULL = smooth([[-126, -2], [-131, -16], [-128, -32], [-118, -42], [-94, -48], [-70, -56], [-50, -68], [-30, -82], [-6, -86], [16, -80], [32, -62], [40, -36], [33, -8], [14, 2], [-40, 2], [-100, 3], [-124, 4]], 3);
const JAW = smooth([[8, -2], [-30, 2], [-80, 4], [-114, 6], [-121, 14], [-114, 28], [-80, 34], [-40, 36], [-6, 32], [14, 14]], 3);
const NECK = [[22, -50], [46, -14], [60, 40], [74, 120], [88, 280], [-72, 280], [-60, 140], [-48, 70], [-30, 30], [0, 12]];

/** Head pose at τ: hinge screen point, head tilt, jaw angle. */
function rexPose(X, T) {
  const up = backOut((T - RISE0) / (RISE1 - RISE0), 1.4), pre = sm(T, BOIL, RISE0);
  const J = jawAt(T), breathe = Math.sin(T * 2.1) * 3 + Math.sin(T * 0.7) * 2, bob = Math.sin(T * 1.3 + 0.5) * 4;
  const shake = J.shake * 2.2 * Math.sin(T * 61), [slx, sly] = slide(X, 0.55);
  const hx = 448 + Math.sin(T * 0.45) * 5 + shake + slx, hy = lerp(860, 590, up) + 8 * pre * Math.sin(T * 23) * (1 - up) + breathe * up + bob * up - J.open * 10 + sly;
  return { hx, hy, tilt: 0.03 + 0.2 * J.open + 0.035 * Math.sin(T * 0.9), jaw: 0.07 + 0.66 * J.open * (0.65 + 0.35 * J.size), up, pre, J };
}
const WATER = 676;                                        // screen y below which the T-rex is under the cloud sea

function drawRex(c, X) {
  const T = X.T, pz = rexPose(X, T); if (pz.up <= 0 && pz.pre <= 0) return;
  const s = 1.06, H = [pz.hx, pz.hy], P = (u) => { const r = rot([u[0] * s, u[1] * s], pz.tilt); return [H[0] + r[0], H[1] + r[1]]; };
  const PJ = (u) => P(rot(u, -pz.jaw)), clip = (X2, Y) => Y < WATER + 4 * Math.sin(X2 * 0.09 + T * 2), g = c;
  if (pz.up > 0.01) {
    // neck (behind the head), with the pale throat stripe
    const neck = NECK.map(P), throatA = P([-50, 60]), throatB = P([-20, 40]);
    part(g, [neck], { ramp: REX, outline: OUT, base: 3.1, gain: 1.4, thick: 16, clip, light: [-0.7, -0.7], rampAt: (X2, Y) => { const u = P([0, 0]); return X2 < u[0] - 30 * s + (Y - u[1]) * 0.12 ? BELLY : null; } });
    // lower jaw, mouth interior, tongue, lower teeth
    const jaw = JAW.map(PJ);
    part(g, [jaw], { ramp: REX, outline: OUT, base: 3.0, gain: 1.2, thick: 8, clip, rampAt: (X2, Y) => { const a = PJ([-60, 18]); return Y > a[1] - 3 + (X2 - a[0]) * Math.tan(pz.tilt - pz.jaw) ? BELLY : null; } });
    if (pz.jaw > 0.1) {
      const mouth = [P([10, 0]), P([-40, 2]), P([-100, 3]), P([-126, 5]), PJ([-118, 7]), PJ([-80, 5]), PJ([-30, 3]), PJ([8, -1])];
      g.poly(mouth, MOUTH, (X2, Y) => (clip(X2, Y) ? (Y > (mouth[0][1] + mouth[5][1]) / 2 + 4 ? MOUTH2 : MOUTH) : null));
      const tc = PJ([-62, 4]); part(g, [ell(tc[0], tc[1] - 3, 30 * s, 9 * s, pz.tilt - pz.jaw + 0.05)], { ramp: TONGUE, outline: "#3A0614", base: 3.6, gain: 1.4, thick: 6, clip });
      // uvula / throat dark
      const th = P([0, 6]); oval(g, th[0] - 6, th[1], 7, 5 + 12 * pz.J.open, "#2A0410");
    }
    // teeth: upper row hangs from the skull's mouth line, lower row sits on the jaw
    const tooth = (A, dir, len, w) => { const n = [-dir[1], dir[0]], tip = [A[0] + dir[0] * len, A[1] + dir[1] * len]; g.poly([[A[0] - n[0] * w, A[1] - n[1] * w], tip, [A[0] + n[0] * w, A[1] + n[1] * w]], TOOTH, (X2, Y) => (!clip(X2, Y) ? null : (X2 - A[0]) * n[0] + (Y - A[1]) * n[1] > w * 0.3 ? TOOTH_S : TOOTH)); g.line(R(A[0] - n[0] * w), R(A[1] - n[1] * w), R(tip[0]), R(tip[1]), OUT); g.line(R(tip[0]), R(tip[1]), R(A[0] + n[0] * w), R(A[1] + n[1] * w), OUT); };
    const ud = rot([0, 1], pz.tilt), ld = rot([0, -1], pz.tilt - pz.jaw);
    for (let k = 0; k < 9; k++) { const x = -122 + k * 13.5; tooth(P([x, 3.5 - k * 0.1]), ud, (k < 2 ? 9 : k < 6 ? 11 : 8) * s, 3.1 * s); }
    for (let k = 0; k < 8; k++) { const x = -112 + k * 13.5; tooth(PJ([x, 6]), ld, (k < 6 ? 8 : 6) * s, 2.7 * s); }
    // skull
    const skull = SKULL.map(P);
    part(g, [skull], { ramp: REX, outline: OUT, base: 3.3, gain: 1.6, thick: 14, clip,
      tone: (X2, Y) => { const sp = Math.sin(X2 * 0.37 + Y * 0.11) + Math.sin(X2 * 0.13 - Y * 0.29); return sp > 1.45 ? -1 : 0; } });
    // nostril, brow ridge, eye, cheek scales, a smug grin crease
    const ns = P([-116, -30]); oval(g, ns[0], ns[1], 4.5 * s, 2.6 * s, "#14280F", null);
    const eye = P([-18, -56]), hh = heroHead(X), look = [hh[0] - eye[0], hh[1] - eye[1]], ll = Math.hypot(look[0], look[1]) || 1;
    const blinkP = ((T + 1.3) % 3.4), blink = blinkP < 0.18 ? Math.sin((PI * blinkP) / 0.18) : 0, er = 10 * s, wide = pz.J.open;
    if (clip(eye[0], eye[1])) {
      oval(g, eye[0], eye[1], er + 1.5, er * (0.92 + 0.12 * wide) + 1.5, (X2, Y) => {
        const dx = X2 + 0.5 - eye[0] - (look[0] / ll) * er * 0.42, dy = Y + 0.5 - eye[1] - (look[1] / ll) * er * 0.4, di = Math.hypot(dx, dy);
        if (di < er * 0.24 + (1 - wide) * 1.2 && Math.abs(dx) < er * 0.16 + 1.2 * (1 - wide) + wide * 2.5) return "#0B0812";      // slit pupil (round when roaring)
        if (di < er * 0.62) return Y < eye[1] - er * 0.2 ? "#E89A10" : "#FFC834";
        return Y < eye[1] - er * 0.4 ? "#D8D2C0" : "#FFF8E6";
      }, OUT);
      // eyelid (blink) + highlight
      if (blink > 0.02) { const ly = eye[1] - er + 2 * er * blink; for (let Y = R(eye[1] - er - 1); Y < ly; Y++) for (let X2 = R(eye[0] - er - 1); X2 <= R(eye[0] + er + 1); X2++) if (Math.hypot((X2 + 0.5 - eye[0]) / (er + 1.5), (Y + 0.5 - eye[1]) / (er + 1.5)) <= 1) g.px(X2, Y, Math.abs(Y - ly) < 1 ? OUT : REX[4]); }
      g.px(R(eye[0] - er * 0.4), R(eye[1] - er * 0.45), "#FFFFFF"); g.px(R(eye[0] - er * 0.4) + 1, R(eye[1] - er * 0.45), "#FFFFFF"); g.px(R(eye[0] - er * 0.4), R(eye[1] - er * 0.45) + 1, "#FFFFFF");
    }
    // angry brow ridge (lowers when roaring)
    const b0 = P([-40, -70 + 3 * wide]), b1 = P([-2, -76 - 3 * wide]), b2 = P([10, -66]);
    g.poly([b0, b1, b2, P([-4, -68 + 4 * wide]), P([-36, -64 + 4 * wide])], REX[1], (X2, Y) => (clip(X2, Y) ? (Y < (b0[1] + b1[1]) / 2 ? REX[3] : REX[1]) : null));
    // back spikes / ridge bumps on the head
    for (const [bx, by, br] of [[2, -85, 5], [18, -78, 5.5], [32, -62, 5]]) { const p = P([bx, by]); part(g, [ell(p[0], p[1], br * s, br * s * 0.85)], { ramp: REX, outline: OUT, base: 4.2, gain: 0.8, thick: 3, clip }); }
  }
  // cloud collar where it comes out of the sea + spray from the burst
  const pal = seaPalette(X.L, X.L > 0.2 ? X.col : null), col = [], cx = H[0] - 8 + 0;
  // before the burst the sea boils: a bulging mound with jittering billows and bubbles popping; then it hugs the neck
  const boil = pz.pre * (1 - pz.up);
  for (let k = 0; k < 9; k++) { const u = k / 8, x = cx - 110 + 220 * u + 6 * Math.sin(T * 1.7 + k) + 4 * boil * Math.sin(T * 31 + k * 2), r = 18 + 10 * Math.sin(PI * u) + 3 * Math.sin(T * 2.3 + k * 1.7) + boil * (12 + 5 * Math.sin(T * 19 + k * 3)); col.push([x, WATER + 6 - r * 0.45 - 6 * Math.sin(PI * u) - boil * (34 + 8 * Math.sin(T * 23 + k)) * Math.sin(PI * u), r]); }
  puffs(c, col, pal, boil > 0.05 ? 0.05 : 0.25, Math.max(pz.pre, pz.up > 0 ? 1 : 0));
  if (boil > 0.02) {
    const f = fade(c, Math.min(1, boil * 2));
    for (let i = 0; i < 7; i++) { const per = 0.42, ph = rnd(i * 13) * per, k = ((T + ph) % per) / per, n = Math.floor((T + ph) / per), x = cx + (rnd(n * 7 + i) - 0.5) * 160, y = WATER - 30 * boil - 10 - 46 * k, r = 2 + 4 * k; if (k < 0.85) f.ering(R(x), R(y), R(r), R(r), k < 0.5 ? pal.lit : pal.mid); }
  }
  // burst spray: cloud chunks thrown up and out, falling back, dissolving
  const age = T - RISE0;
  if (age > 0 && age < 1.0) {
    const sp = []; for (let i = 0; i < 12; i++) { const side = i % 2 ? 1 : -1, ang = -PI / 2 + side * (0.55 + 0.6 * rnd(i * 3 + 1)), v = 300 + 220 * rnd(i * 5 + 2), x = cx + side * (60 + 40 * rnd(i * 7)) + Math.cos(ang) * v * age, y = WATER - 10 + Math.sin(ang) * v * age + 700 * age * age, r = (5 + 8 * rnd(i * 11)) * (1 - 0.6 * age); if (y < GH) sp.push([x, y, r]); }
    puffs(c, sp, pal, 0.1, 1 - sm(age, 0.45, 1.0));
  }
  return pz;
}

/** Roar shock rings rolling toward him (arcs on the left side of the mouth) + spit specks. */
function roarFx(c, X, pz) {
  if (!pz || !pz.J.ring || pz.up < 0.5) return;
  const T = X.T, { a, sz } = pz.J.ring, s = 1.06, m = (() => { const r = rot([-112 * s, 6 * s], pz.tilt); return [pz.hx + r[0], pz.hy + r[1]]; })();
  for (let k = 0; k < 4; k++) {
    const kk = (T - a - 0.08 - k * 0.14) / 0.75; if (kk <= 0 || kk >= 1) continue;
    shock(c, m[0], m[1], kk, 150 * sz + 70, k % 2 ? "#FFF6D0" : "#FFFFFF", PI * 0.86, PI * 1.42, 1.0, 3);
  }
  // spit specks flying forward
  const g = fade(c, 1 - sm(T, a + 0.5, a + 1.0));
  for (let i = 0; i < 10 * sz; i++) { const age = T - a - 0.1 - rnd(i * 3) * 0.2; if (age <= 0 || age > 0.8) continue; const v = 160 + 120 * rnd(i * 5), ang = PI + (rnd(i * 7) - 0.5) * 0.9, x = m[0] + Math.cos(ang) * v * age, y = m[1] + Math.sin(ang) * v * age + 200 * age * age; g.rect(R(x), R(y), 2, 2, "#E8F6FF"); g.px(R(x) + 1, R(y), "#9AD0F0"); }
}

// ---------------------------------------------------------------- brachiosaurus (far left, hazy, cute)
function drawBrachio(c, X) {
  const T = X.T, up = ease((T - BRA0) / (BRA1 - BRA0)); if (up <= 0) return;
  const [slx, sly] = slide(X, 0.3), sway = Math.sin(T * 0.8) * 6 + Math.sin(T * 0.33) * 4, chew = Math.max(0, Math.sin(T * 7)) * (T > BRA1 ? 1 : 0);
  const lean = ease((T - (EV.aliens - 0.5)) / 0.9), base = [-4 + slx, 760 + sly], top = [52 - 20 * lean + sway * (1 - 0.5 * lean) + slx, lerp(820, 452, up) + 34 * lean + Math.sin(T * 1.1) * 3 + sly];
  const ctrl = [base[0] + 14 + sway * 0.4, lerp(base[1], top[1], 0.55)];
  const path = bez(base, ctrl, [top[0] - 8, top[1] + 12], 14), WL = WATER - 18, clip = (X2, Y) => Y < WL + 3 * Math.sin(X2 * 0.12 + T);
  const haze = mix("#C4E2FA", "#3A1B63", clamp01(X.L / 6) * 0.9), hz = (ramp) => ramp.map((col) => mix(col, haze, 0.18));
  const neckR = hz(BRA), bellyR = hz(BRA_B);
  part(c, [tube(path, 17, 10)], { ramp: neckR, outline: "#0A1420", base: 3.2, gain: 1.2, thick: 9, clip, rampAt: (X2, Y) => { const k = clamp01((Y - top[1]) / (base[1] - top[1])); return X2 > top[0] + 4 + (base[0] + 6 - top[0]) * k ? bellyR : null; },
    tone: (X2, Y) => (Math.sin(X2 * 0.6 + Y * 0.21) + Math.sin(Y * 0.43 - X2 * 0.17) > 1.5 ? -0.8 : 0) });
  // head: rounded, facing right toward him, small and silly
  const hx = top[0] + 6, hy = top[1] - 2, tilt = 0.12 * Math.sin(T * 0.6);
  const head = smooth([[-14, 2], [-12, -8], [-2, -13], [12, -12], [24, -6], [27, 2], [22, 8], [6, 9 + 2 * chew], [-8, 9]], 3).map((u) => { const r = rot(u, tilt); return [hx + r[0], hy + r[1]]; });
  part(c, [head], { ramp: neckR, outline: "#0A1420", base: 3.6, gain: 1.3, thick: 7, clip });
  const P = (u) => { const r = rot(u, tilt); return [hx + r[0], hy + r[1]]; };
  // nostril bump, sleepy happy eye, smile, a cloud tuft in the mouth while munching
  const nb = P([-3, -13]); oval(c, nb[0], nb[1], 4, 3, neckR[5], "#0A1420");
  const ey = P([8, -4]), blinkP = (T + 0.6) % 2.9, bl = blinkP < 0.2 ? Math.sin((PI * blinkP) / 0.2) : 0;
  if (clip(ey[0], ey[1])) {
    oval(c, ey[0], ey[1], 3.6, 3.8 * (1 - bl * 0.85) + 0.4, (X2, Y) => (Math.hypot(X2 + 0.5 - ey[0] - 1.2, Y + 0.5 - ey[1] - 0.3) < 2.1 ? "#0B0812" : "#FFFDF4"), "#0A1420");
    if (bl < 0.5) c.px(R(ey[0]), R(ey[1] - 1), "#FFFFFF");
    const m0 = P([14, 5 + chew]), m1 = P([25, 2]); c.line(R(m0[0]), R(m0[1]), R(m1[0]), R(m1[1]), "#0A1420");
    oval(c, P([4, 3])[0], P([4, 3])[1], 3, 1.5, (X2, Y) => ((X2 + Y) % 2 ? "#F2A0B8" : null));
    // a little cloud tuft sticking out of its mouth (munching the sky)
    if (T > BRA1 - 0.3) { const tf = P([27, 4 + chew]), a = sm(T, BRA1 - 0.3, BRA1 + 0.2); puffs(c, [[tf[0] + 4, tf[1], 5], [tf[0] + 9, tf[1] - 2, 4], [tf[0] + 6, tf[1] + 3, 3.5]], seaPalette(X.L), 0, a); }
  }
  // splash collar where the neck leaves the cloud sea
  const pal = seaPalette(X.L, X.L > 0.2 ? X.col : null), col = [];
  for (let k = 0; k < 6; k++) { const u = k / 5, x = base[0] + 6 - 40 + 80 * u + 4 * Math.sin(T * 1.5 + k), r = 12 + 6 * Math.sin(PI * u) + 2 * Math.sin(T * 2 + k); col.push([x, WL + 4 - r * 0.4, r]); }
  puffs(c, col, pal, 0.3, sm(T, BRA0 - 0.2, BRA0 + 0.3));
}

export function sea(c, X) {
  if (X.T < BOIL - 0.3) return;
  drawBrachio(c, X);
  const pz = drawRex(c, X);
  roarFx(c, X, pz);
}

// ---------------------------------------------------------------- sound
export const MOTIONS = [
  { t0: BOIL, t1: RISE0, kind: "rumble", level: 0.6, note: "the cloud sea boils at the bottom right" },
  { t0: BRA0, t1: BRA1, kind: "whoosh", level: 0.35, note: "brachiosaurus neck rises slowly at the far left" },
  { t0: RISE0, t1: RISE1 + 0.1, kind: "whoosh", level: 0.85, note: "T-rex head bursts up out of the clouds (cloud spray)" },
  ...ROARS.map(([a, up, hold, down, sz], i) => ({ t0: a, t1: Math.min(a + up + hold + down, i === ROARS.length - 1 ? STOP.a + 0.3 : 99), kind: "roar", level: +(0.5 + 0.45 * sz).toFixed(2), note: i === 0 ? "first ROAR (jaw wide, shock rings)" : i === ROARS.length - 1 ? "roar frozen by the time stop (cut by the tape-stop)" : "T-rex roars again" })),
];
