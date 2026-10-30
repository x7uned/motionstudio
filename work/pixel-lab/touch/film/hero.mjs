// The hero: puffer jacket, bobble hat, scarf, yellow knitted mittens, a phone. Side view facing right, world units
// (feet on the walk line wy = 0, height ≈ 96). State comes from the timeline; drawing uses the volume-shading engine.
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth as spline, drawPart } from "../../dog/shade.mjs";
import { EV, PHONE } from "./timeline.mjs";
import { CART, LAMP_HEAD } from "./street.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const L2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];

export const COAT = ["#2A0E1A", "#5A1A2E", "#8A2840", "#B83A50", "#E0565A", "#F08070", "#F8A890", "#FCD0B8"];
const PANTS = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
const BOOT = ["#120A06", "#2E1A10", "#4A2C18", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488"];
export const MITT = ["#3A2A08", "#6A4A10", "#A07418", "#C99A2A", "#F4CA50", "#FAE375", "#FDF0A8", "#FFF8D8"];
const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
const SCARF = ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF", "#F4F8FF"];
const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
const SAUS = ["#2A0E08", "#5A1E10", "#8A3420", "#B05030", "#CC6A40", "#E28A5A", "#F0AE80", "#FAD0A8"];

// ---------------------------------------------------------------- motion: position and leg phase by integrating speed
const DT = 1 / 240, START = -190, STOP2 = 66;
const speed = (t) => {
  if (t < EV.walk[1]) return 92.7 * (1 - sm(t, 1.6, EV.walk[1]));
  const [a, b] = EV.walk2; if (t >= a && t < b) return (STOP2 / ((b - a) * 0.5)) * 0.5 * (1 - Math.cos((2 * Math.PI * (t - a)) / (b - a)));
  if (t >= EV.walk3[0]) return 78 * sm(t, EV.walk3[0], EV.walk3[0] + 0.7);
  return 0;
};
const TRACK = (() => { const n = Math.ceil(80 / DT), xs = new Float32Array(n), ds = new Float32Array(n); let x = START, d = 0;
  for (let i = 0; i < n; i++) { xs[i] = x; ds[i] = d; const v = speed(i * DT); x += v * DT; d += v * DT; if (i * DT > EV.walk[1] - 0.01 && i * DT < EV.walk2[0]) x = 0; if (i * DT > EV.walk2[1] && i * DT < EV.walk3[0]) x = STOP2; } return { xs, ds }; })();
const at = (arr, t) => arr[Math.max(0, Math.min(arr.length - 1, R(t / DT)))];
export const heroX = (t) => at(TRACK.xs, t);
const STRIDE = 34;
/** Footprints laid so far: each plant of a foot leaves a print. */
export function prints(t) { const out = []; let last = -1; for (let i = 0; i * DT <= t; i += 4) { const k = Math.floor(TRACK.ds[i] / STRIDE); if (k !== last && TRACK.ds[i] > 1) { last = k; out.push({ x: TRACK.xs[i] + (k % 2 ? 5 : -3), y: k % 2 ? 3 : -2.5 }); } } return out; }

// ---------------------------------------------------------------- pose
function phoneHand(t) {
  const down = [7, -36], view = [PHONE.x, PHONE.y], ear = [7, -77];
  let p = L2(down, view, sm(t, EV.lookUp[0], EV.lookUp[1])); p = L2(p, ear, sm(t, EV.ear[0], EV.ear[1]));
  return p;
}
function nearHand(t, pose) {
  const rest = [-1 + pose.swing * 7, -34], ready = [13, -45], scr = [PHONE.x + 1, PHONE.y - 1], deep = [PHONE.x - 1.5, PHONE.y - 0.5];
  const grill = [CART.grill.x - STOP2, CART.grill.y], holdS = [15, -45], mouth = [10, -73];
  let p = L2(rest, ready, sm(t, 2.3, EV.tap1[0]));
  if (t >= EV.tap1[0] && t < EV.tap1[3]) p = t < EV.tap1[1] ? L2(ready, scr, sm(t, EV.tap1[0], EV.tap1[1])) : t < EV.tap1[2] ? scr : L2(scr, ready, sm(t, EV.tap1[2], EV.tap1[3]));
  if (t >= EV.press[0] && t < EV.press[3]) p = t < EV.press[1] ? L2(ready, deep, sm(t, EV.press[0], EV.press[1])) : t < EV.press[2] ? L2(deep, [deep[0] - 0.6, deep[1]], 0.5 + 0.5 * Math.sin(t * 40)) : L2(deep, ready, sm(t, EV.press[2], EV.press[3]));
  if (t >= EV.hold[0]) p = L2(ready, deep, sm(t, EV.hold[0], EV.hold[1]));
  if (t >= EV.streetBack[0]) p = L2(deep, [-1 + pose.swing * 7, -34], sm(t, EV.streetBack[0] + 0.3, EV.streetBack[0] + 0.9));
  if (t >= EV.pick[0] - 0.25) { p = L2(p, grill, sm(t, EV.pick[0] - 0.25, EV.pick[0] + 0.15)); p = L2(p, holdS, sm(t, EV.pick[0] + 0.2, EV.pick[1] + 0.25)); }
  const tip = sausageTipOffset();
  if (t >= EV.sausageTap[0] && t < EV.sausageTap[3]) { const target = [scr[0] - tip[0], scr[1] - tip[1]]; p = t < EV.sausageTap[1] ? L2(holdS, target, sm(t, EV.sausageTap[0], EV.sausageTap[1])) : t < EV.sausageTap[2] ? target : L2(target, holdS, sm(t, EV.sausageTap[2], EV.sausageTap[3])); }
  if (t >= EV.bite[0] - 0.3 && t < EV.bite[1] + 0.35) p = L2(holdS, mouth, Math.min(sm(t, EV.bite[0] - 0.3, EV.bite[0]), 1 - sm(t, EV.bite[1], EV.bite[1] + 0.35)));
  return p;
}
const SAUS_ANG = -0.55, sausageLen = (t) => (t < EV.bite[0] + 0.1 ? 14 : 9);
function sausageTipOffset() { return [Math.cos(SAUS_ANG) * 13, Math.sin(SAUS_ANG) * 13]; }

export function heroPose(t) {
  const x = heroX(t), d = at(TRACK.ds, t), v = speed(t), amp = clamp01(v / 70), ph = (Math.PI * d) / STRIDE;
  const swing = Math.sin(ph) * amp, bob = -1.6 * Math.abs(Math.sin(ph)) * amp;
  const looking = sm(t, EV.lookUp[0], EV.lookUp[1]) * (1 - sm(t, EV.ear[0], EV.ear[1]));
  const press = t >= EV.press[1] && t < EV.press[2] ? 1 : 0, pick = Math.min(sm(t, EV.pick[0] - 0.3, EV.pick[0]), 1 - sm(t, EV.pick[1], EV.pick[1] + 0.3));
  const pose = { x, ph, amp, swing, bob, lean: 0.03 * amp + 0.05 * press + 0.2 * pick, headTilt: 0.2 * looking, talking: t > EV.connected + 0.2 };
  pose.phone = phoneHand(t); pose.hand = nearHand(t, pose);
  pose.pressAmt = t >= EV.press[1] && t < EV.press[2] ? 1 : t >= EV.hold[1] && t < EV.streetBack[0] ? 0.6 : 0;
  pose.sausage = t >= EV.pick[0] + 0.05 ? sausageLen(t) : 0;
  pose.screen = t < EV.ring[0] ? "off" : t < EV.drop ? "ring" : t < EV.calling ? "missed" : t < EV.connected ? "calling" : "call";
  pose.clump = t >= EV.clump[0] ? sm(t, EV.clump[0], EV.clump[1]) : -1;
  return pose;
}

// ---------------------------------------------------------------- geometry helpers
function limb(pts, widths) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, w = widths[i] / 2;
    L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  return [...L, ...Rr.reverse()];
}
function ik(S, H, l1, l2, bend = 1) {
  const dx = H[0] - S[0], dy = H[1] - S[1], d = Math.min(l1 + l2 - 0.01, Math.max(0.1, Math.hypot(dx, dy))), a = Math.atan2(dy, dx);
  const c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), off = Math.acos(Math.max(-1, Math.min(1, c)));
  const ang = a + bend * off; return [S[0] + Math.cos(ang) * l1, S[1] + Math.sin(ang) * l1];
}
const rot = (p, o, a) => { const c = Math.cos(a), s = Math.sin(a), dx = p[0] - o[0], dy = p[1] - o[1]; return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c]; };

// ---------------------------------------------------------------- drawing
export function drawHero(c, G, t, pose) {
  const z = G.z, P = (u) => [G.X(pose.x + u[0]), G.Y(u[1] + pose.bob)], PP = (arr) => arr.map(P);
  const light = [-0.25, -0.95], opt = (ramp, base, thick, extra = {}) => ({ ramp, base, gain: 1.4, slope: 1.0, thick: thick * z, light, rimLit: 0.8, rimShade: 0.8, outline: ramp[0], litOutline: null, ...extra });
  const part = (u, ramp, base, thick, extra) => drawPart(c, [spline(PP(u), new Set(), 4)], opt(ramp, base, thick, extra));
  const hip = [0, -36], torso = (u) => rot(u, hip, pose.lean);

  // shadow
  c.ellipse(R(G.X(pose.x + 1)), R(G.Y(1.5)), R(15 * z), Math.max(1, R(2.2 * z)), "#3A3A5C");

  // legs: thigh angle swings with the gait, the forward-swinging knee bends
  const leg = (side) => {
    const s = side === "near" ? 1 : -1, th = 0.5 * Math.sin(pose.ph) * s * pose.amp, knee = 0.55 * Math.max(0, Math.cos(pose.ph) * s) * pose.amp;
    const H = [side === "near" ? 1.5 : -1.5, -35], K = [H[0] + Math.sin(th) * 16.5, H[1] + Math.cos(th) * 16.5], A = [K[0] + Math.sin(th - knee) * 16, K[1] + Math.cos(th - knee) * 16];
    const lift = Math.max(0, -A[1] - 2.5); void lift;
    const dark = side === "far" ? -0.9 : 0;
    part(limb([H, K, A], [10, 8, 7]), PANTS, 3.3 + dark, 4);
    const toe = A[0] + 9, f = Math.min(0, (A[1] + 2.5));
    part([[A[0] - 4.5, A[1] - 4], [A[0] + 2.5, A[1] - 4.5], [A[0] + 5, A[1] - 1.2], [toe, A[1] + 0.2 + f * 0.3], [toe + 0.5, A[1] + 2.3], [A[0] - 5, A[1] + 2.5]], BOOT, 3.6 + dark, 3);
  };
  // far arm (behind the torso): shoulder → phone hand
  const SF = torso([-1, -62]), SN = torso([1.5, -62]);
  const farElbow = ik(SF, pose.phone, 16, 16, 1);
  part(limb([SF, farElbow, pose.phone], [7.5, 6.5, 5.5]), COAT, 2.5, 3.5);
  leg("far"); leg("near");
  // scarf tail behind the back
  const wind = Math.sin(t * 2.3) * 1.5;
  part([torso([-6, -68]), torso([-11 + wind * 0.3, -66]), torso([-15 + wind, -56]), torso([-12 + wind, -54.5]), torso([-8, -63])], SCARF, 3.4, 2.5);
  // puffer jacket with quilting seams and a zip line
  const coatPts = [[-9, -67], [-12, -60], [-13.5, -49], [-12.5, -38], [-13.5, -32], [12.5, -32], [13.5, -40], [14.5, -50], [12.5, -61], [7, -67.5]].map(torso);
  drawPart(c, [spline(PP(coatPts), new Set([4, 5]), 4)], opt(COAT, 3.7, 9));
  for (const sy of [-58, -49.5, -41]) { for (let k = 0; k <= 26; k++) { const u = torso([-12 + k, sy + 0.8 * Math.sin((k / 26) * Math.PI)]), [X, Y] = P(u); const o = c.get(R(X), R(Y)); if (COAT.some((cc) => cc.toLowerCase() === "#" + o.map((v) => v.toString(16).padStart(2, "0")).join(""))) c.rect(R(X), R(Y), Math.max(1, R(z * 0.7)), Math.max(1, R(z * 0.7)), COAT[2]); } }
  { const a = P(torso([12.8, -60])), b = P(torso([13.2, -34])); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), COAT[2]); }
  // scarf around the neck
  part([torso([-8, -71]), torso([7.5, -71.5]), torso([9, -65.5]), torso([-7.5, -64.5])], SCARF, 3.8, 2.5);
  { const a = P(torso([-6, -68])), b = P(torso([8, -68.5])); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), SCARF[2]); }

  // head: tilts down toward the phone
  const N = torso([1, -70]), hr = (u) => rot(torso(u), N, pose.headTilt);
  const head = [[-7, -76], [-7, -81], [-4, -86], [1, -87.5], [6, -86], [8.6, -82.5], [9, -80], [11.6, -77.6], [9.2, -76.4], [9.6, -74.6], [8.6, -73.6], [8, -71.6], [4, -70.2], [0, -70.6], [-5, -72.5]].map(hr);
  drawPart(c, [spline(PP(head), new Set([7]), 4)], opt(SKIN, 4.4, 5, { rimLit: 0.6 }));
  part([[-7, -76], [-6.5, -72.2], [-3, -72.8], [-3.5, -79]].map(hr), ["#120A06", "#1E120A", "#2E1C10", "#3E2818", "#523620", "#6A4628", "#806040", "#9A7A58"], 3, 2);
  { const [ex, ey] = P(hr([6, -79.8])); c.rect(R(ex), R(ey), Math.max(1, R(z * 0.9)), Math.max(1, R(z * 1.2)), "#1A0E10"); const [bx, by] = P(hr([5, -82])); c.rect(R(bx), R(by), Math.max(2, R(z * 2.6)), Math.max(1, R(z * 0.6)), "#3E2818");
    const [chx, chy] = P(hr([5.5, -75.5])); fade(c, 0.6).ellipse(R(chx), R(chy), Math.max(1, R(z * 1.8)), Math.max(1, R(z * 1.1)), "#E07A70");
    const [ox, oy] = P(hr([0, -78])); c.ellipse(R(ox), R(oy), Math.max(1, R(z * 1.6)), Math.max(1, R(z * 2.2)), SKIN[3]); c.px(R(ox), R(oy), SKIN[2]);
    if (pose.talking && Math.sin(t * 17) > 0) { const [mx, my] = P(hr([8.6, -73.8])); c.rect(R(mx - z), R(my), Math.max(1, R(z * 1.3)), Math.max(1, R(z * 0.8)), "#5A1E20"); } }
  // bobble hat: crown, ribbed cuff, pompom; a cap of snow once the clump has landed
  part([[-8.8, -79], [-8.4, -85], [-4.5, -90.5], [1.5, -92], [7, -89.5], [9.6, -84.5], [9.8, -81.5], [-8.8, -80]].map(hr), HAT, 3.6, 4);
  part([[-9.3, -82.5], [10, -84.6], [10.3, -80.6], [-9.2, -78.6]].map(hr), HAT, 4.6, 2);
  for (let k = 0; k < 10; k++) { const a = P(hr([-8.5 + k * 2, -82.4 - k * 0.2])), b = P(hr([-8.5 + k * 2, -79.2 - k * 0.15])); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), HAT[3]); }
  { const [px, py] = P(hr([0.5, -94.5])), r = Math.max(2, R(3.6 * z)); c.disc(R(px), R(py), r, "#C8C0DC"); c.disc(R(px - r * 0.2), R(py - r * 0.25), Math.max(1, R(r * 0.75)), "#F0ECF8"); for (let k = 0; k < 6; k++) c.px(R(px + Math.cos(k) * r * 0.6), R(py + Math.sin(k * 1.7) * r * 0.6), "#A8A0C0"); }
  if (pose.clump >= 0) {
    const h = LAMP_HEAD(40), top = hr([1, -96]);
    if (pose.clump < 1) { const k = pose.clump * pose.clump, wx = lerp(h.x - pose.x, top[0], k), wy = lerp(h.y + 4, top[1], k), [X, Y] = P([wx, wy]); c.disc(R(X), R(Y), Math.max(2, R(2.6 * z)), "#E8E8F4"); c.px(R(X - z), R(Y - z), "#FFFFFF"); }
    else { const [X, Y] = P(top); c.ellipse(R(X), R(Y + z), Math.max(2, R(4.5 * z)), Math.max(1, R(2 * z)), "#E8E8F4"); c.ellipse(R(X - z), R(Y), Math.max(1, R(2.2 * z)), Math.max(1, R(1 * z)), "#FFFFFF"); }
  }

  // phone in the far hand: tilted toward the face, screen toward us
  drawPhone(c, P, z, pose, t);
  mitten(c, P, z, pose.phone, [pose.phone[0] - 4, pose.phone[1] + 5], -0.3, 2.9);

  // near arm and mitten (in front of everything); sausage in the mitten
  const NE = ik(SN, pose.hand, 16, 16, 1);
  part(limb([SN, NE, pose.hand], [8, 7, 6]), COAT, 3.9, 4);
  { const cuff = L2(NE, pose.hand, 0.82), a = P(cuff); c.ellipse(R(a[0]), R(a[1]), Math.max(1, R(3.2 * z)), Math.max(1, R(3.2 * z)), COAT[2]); }
  if (pose.sausage) drawSausage(c, P, z, pose.hand, pose.sausage);
  const dir = Math.atan2(pose.hand[1] - NE[1], pose.hand[0] - NE[0]);
  mitten(c, P, z, pose.hand, NE, dir, 3.6, pose.pressAmt);
  // breath puffs
  for (let k = 0; k < 40; k++) { const t0 = 0.6 + k * 1.7; if (t < t0 || t > t0 + 1.4 || (t > EV.cuIn[0] && t < EV.streetBack[1])) continue; const u = (t - t0) / 1.4, m = hr([11, -74]), [X, Y] = P([m[0] + 3 + u * 9, m[1] - u * 5]), r = Math.max(1, R((1.2 + u * 3.2) * z));
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const dd = Math.hypot(i, j) / r; if (dd < 1 && (1 - dd) * (1 - u) * 0.9 > bayer(R(X) + i, R(Y) + j)) c.px(R(X) + i, R(Y) + j, mix(c.get(R(X) + i, R(Y) + j), "#E8ECF8", 0.55)); } }
}

/** Knitted mitten at hand point H, oriented along the forearm. */
export function mitten(c, P, z, H, from, dir, size, press = 0) {
  const ang = typeof dir === "number" ? dir : 0, sq = 1 - 0.18 * press;
  const loc = (u, v) => [H[0] + Math.cos(ang) * u * sq - Math.sin(ang) * v, H[1] + Math.sin(ang) * u * sq + Math.cos(ang) * v];
  const pts = [loc(-size * 0.9, -size * 0.75), loc(size * 0.2, -size * 0.95), loc(size * 0.9, -size * 0.55), loc(size * 1.05, 0), loc(size * 0.8, size * 0.6), loc(0, size * 0.85), loc(-size * 0.9, size * 0.7)];
  drawPart(c, [spline(pts.map(P), new Set(), 4)], { ramp: MITT, base: 3.8, gain: 1.3, slope: 0.6, thick: size * 0.8 * z, light: [-0.25, -0.95], rimLit: 0.8, rimShade: 0.8, outline: MITT[0] });
  const thumb = [loc(-size * 0.2, -size * 0.8), loc(size * 0.35, -size * 1.35), loc(size * 0.65, -size * 0.95), loc(size * 0.25, -size * 0.55)];
  drawPart(c, [spline(thumb.map(P), new Set(), 4)], { ramp: MITT, base: 4.2, gain: 1, slope: 0.4, thick: size * 0.4 * z, light: [-0.25, -0.95], outline: MITT[0] });
  // knit stitches: little V rows
  if (z > 1.8) for (let v = -0.5; v <= 0.5; v += 0.33) for (let u = -0.6; u <= 0.7; u += 0.32) { const [X, Y] = P(loc(u * size, v * size)); c.px(R(X), R(Y), MITT[3]); c.px(R(X + z * 0.5), R(Y - z * 0.4), MITT[3]); }
  // cuff ribbing
  const cuffA = loc(-size * 0.95, -size * 0.8), cuffB = loc(-size * 0.95, size * 0.75), [ax, ay] = P(cuffA), [bx, by] = P(cuffB); c.line(R(ax), R(ay), R(bx), R(by), MITT[2]);
}

function drawSausage(c, P, z, H, len) {
  const a = SAUS_ANG, d = [Math.cos(a), Math.sin(a)], s0 = [H[0] - d[0] * 2, H[1] - d[1] * 2], s1 = [s0[0] + d[0] * len, s0[1] + d[1] * len];
  drawPart(c, [spline(limb([s0, L2(s0, s1, 0.5), s1], [3.6, 3.8, 3.6]).map(P), new Set(), 4)], { ramp: SAUS, base: 3.6, gain: 1.5, slope: 0.4, thick: 1.6 * z, light: [-0.25, -0.95], outline: SAUS[0] });
  const h0 = P(L2(s0, s1, 0.2)), h1 = P(L2(s0, s1, 0.85)); c.line(R(h0[0]), R(h0[1] - z), R(h1[0]), R(h1[1] - z), SAUS[7]);
  if (len < 12) { const e = P(s1); c.disc(R(e[0]), R(e[1]), Math.max(1, R(1.6 * z)), "#E6A890"); }
}

function drawPhone(c, P, z, pose, t) {
  const cx = pose.phone[0] + (pose.pressAmt ? -0.8 * pose.pressAmt : 0), cy = pose.phone[1] - 6.5, ang = pose.screen === "call" && pose.phone[1] < -70 ? 0 : -0.18;
  const corner = (u, v) => { const ca = Math.cos(ang), sa = Math.sin(ang); return P([cx + u * ca - v * sa, cy + u * sa + v * ca]); };
  const quad = (u0, v0, u1, v1, col) => { const pts = [corner(u0, v0), corner(u1, v0), corner(u1, v1), corner(u0, v1)]; c.poly(pts.map(([x, y]) => [R(x), R(y)]), col); };
  quad(-4.2, -7.2, 4.2, 7.2, "#0E0A18"); quad(-3.9, -6.9, 3.9, 6.9, "#2E2A40");
  if (pose.phone[1] < -70) return;   // at the ear we see the back
  const on = pose.screen !== "off", base = pose.screen === "ring" ? mix("#1E2A5A", "#33458A", 0.5 + 0.5 * Math.sin(t * 9)) : pose.screen === "missed" ? "#1A1430" : pose.screen === "off" ? "#0B0812" : "#14301E";
  quad(-3.4, -6.2, 3.4, 6.2, base);
  if (!on) return;
  if (pose.screen === "ring") { const r = Math.max(1, R(1.6 * z)), a = corner(0, -2.5); c.disc(R(a[0]), R(a[1]), r, "#E0CDF8"); const g = corner(1.9, 3.8), rd = corner(-1.9, 3.8); c.disc(R(g[0]), R(g[1]), r, "#65DA41"); c.disc(R(rd[0]), R(rd[1]), r, "#E03056"); }
  if (pose.screen === "missed") { quad(-2.8, -4.5, 2.8, -3.2, "#E03056"); quad(-2.8, -2.2, 1.5, -1.4, "#6E4FB0"); const g = corner(0, 3.6); c.disc(R(g[0]), R(g[1]), Math.max(1, R(1.7 * z)), "#65DA41"); }
  if (pose.screen === "calling" || pose.screen === "call") { quad(-2.8, -4.5, 2.8, -3.2, "#65DA41"); for (let k = 0; k < 3; k++) if (pose.screen === "call" || Math.floor(t * 4) % 3 >= k) { const d = corner(-1.5 + k * 1.5, 0.5); c.rect(R(d[0]), R(d[1]), Math.max(1, R(0.8 * z)), Math.max(1, R(0.8 * z)), "#9BF07A"); } }
  // glint sweeping across the glass (the "isn't broken" check)
  const g = clamp01((t - EV.glint[0]) / (EV.glint[1] - EV.glint[0] - 0.2));
  if (t > EV.glint[0] && t < EV.glint[1]) for (let k = -1; k <= 1; k++) { const u = -6 + 12 * g + k * 0.6; const a = corner(Math.max(-3.4, Math.min(3.4, u - 3)), -6.2), b = corner(Math.max(-3.4, Math.min(3.4, u + 3)), 6.2); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), k ? "#A9C4FF" : "#FFFFFF"); }
}

/** Times when a foot is planted (for the footstep sounds). */
export function stepTimes() { const out = []; let last = 0; for (let i = 0; i < TRACK.ds.length; i++) { const k = Math.floor(TRACK.ds[i] / STRIDE); if (k > last) { last = k; out.push(i * DT); } } return out; }
