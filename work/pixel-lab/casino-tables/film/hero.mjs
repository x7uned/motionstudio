// «You»: the recurring hero in the coral puffer, purple bobble hat, blue scarf and yellow mittens — adapted frozen copy of
// touch/film/hero.mjs (same drawing, same ramps) with the timeline removed: the caller passes the pose. The same rig, with
// another `look`, draws the casino guests (casino-people.mjs). Side view facing right in rig units (feet on v = 0,
// height ≈ 96, up is −v). G = { X(u), Y(v), z } maps rig units to the screen (z = screen px per rig unit; X may mirror).
//
// pose = { lean, headTilt, bob, ph, amp, near: [u, v], far: [u, v], press, mouth: 0 shut | 1 open smile, talking, blink }
//   near / far = the hand targets (near arm in front of the body, far arm behind it), e.g. REST.near = [-1, -34].
import { mix, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth as spline, drawPart } from "../../dog/shade.mjs";

const R = Math.round;
const lerp = (a, b, k) => a + (b - a) * k;
const L2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];

export const COAT = ["#2A0E1A", "#5A1A2E", "#8A2840", "#B83A50", "#E0565A", "#F08070", "#F8A890", "#FCD0B8"];
export const PANTS = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
export const BOOT = ["#120A06", "#2E1A10", "#4A2C18", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488"];
export const MITT = ["#3A2A08", "#6A4A10", "#A07418", "#C99A2A", "#F4CA50", "#FAE375", "#FDF0A8", "#FFF8D8"];
export const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
export const SCARF = ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF", "#F4F8FF"];
export const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
export const HAIR = ["#120A06", "#1E120A", "#2E1C10", "#3E2818", "#523620", "#6A4628", "#806040", "#9A7A58"];

/** The hero's look. Guests pass their own (see casino-people.mjs LOOKS). */
export const HERO_LOOK = { coat: COAT, pants: PANTS, boot: BOOT, hands: MITT, mittens: true, skin: SKIN, hair: HAIR, hat: HAT, scarf: SCARF, quilted: true, zip: true };
/** Resting pose at a table: near hand on the rail, far hand by the side. */
export const REST = { lean: 0, headTilt: 0, bob: 0, ph: 0, amp: 0, near: [12, -44], far: [7, -36], press: 0, mouth: 0, talking: false, blink: 0 };

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

/** Draw the rig. `a` < 1 dissolves it (ordered dither). */
export function drawHero(c, G, t, pose, look = HERO_LOOK, a = 1) {
  if (a <= 0) return;
  const g = fade(c, a), z = G.z, P = (u) => [G.X(u[0]), G.Y(u[1] + (pose.bob || 0))], PP = (arr) => arr.map(P);
  const light = [-0.25, -0.95], opt = (ramp, base, thick, extra = {}) => ({ ramp, base, gain: 1.4, slope: 1.0, thick: thick * z, light, rimLit: 0.8, rimShade: 0.8, outline: ramp[0], litOutline: null, alpha: a, ...extra });
  const part = (u, ramp, base, thick, extra) => drawPart(c, [spline(PP(u), new Set(), 4)], opt(ramp, base, thick, extra));
  const hip = [0, -36], torso = (u) => rot(u, hip, pose.lean || 0), ph = pose.ph || 0, amp = pose.amp || 0;
  const L = look;

  // legs: thigh angle swings with the gait, the forward-swinging knee bends
  const leg = (side) => {
    const s = side === "near" ? 1 : -1, th = 0.5 * Math.sin(ph) * s * amp, knee = 0.55 * Math.max(0, Math.cos(ph) * s) * amp;
    const H = [side === "near" ? 1.5 : -1.5, -35], K = [H[0] + Math.sin(th) * 16.5, H[1] + Math.cos(th) * 16.5], A = [K[0] + Math.sin(th - knee) * 16, K[1] + Math.cos(th - knee) * 16];
    const dark = side === "far" ? -0.9 : 0;
    if (L.skirt) part(limb([H, K, A], [7, 6, 5]), L.skin, 3.3 + dark, 3); else part(limb([H, K, A], [10, 8, 7]), L.pants, 3.3 + dark, 4);
    const toe = A[0] + 9, f = Math.min(0, (A[1] + 2.5));
    part([[A[0] - 4.5, A[1] - 4], [A[0] + 2.5, A[1] - 4.5], [A[0] + 5, A[1] - 1.2], [toe, A[1] + 0.2 + f * 0.3], [toe + 0.5, A[1] + 2.3], [A[0] - 5, A[1] + 2.5]], L.boot, 3.6 + dark, 3);
  };
  const SF = torso([-1, -62]), SN = torso([1.5, -62]);
  const far = pose.far || REST.far, near = pose.near || REST.near;
  const farElbow = ik(SF, far, 16, 16, 1);
  part(limb([SF, farElbow, far], [7.5, 6.5, 5.5]), L.coat, 2.5, 3.5);
  hand(c, P, z, far, farElbow, L, -0.6, a);
  leg("far"); leg("near");
  if (L.skirt) part([[-11, -50], [11, -50], [15, -20], [-14, -20]].map(torso), L.skirt, 3.5, 6);
  // scarf tail behind the back
  if (L.scarf) { const wind = Math.sin(t * 2.3) * 1.2; part([torso([-6, -68]), torso([-11 + wind * 0.3, -66]), torso([-15 + wind, -56]), torso([-12 + wind, -54.5]), torso([-8, -63])], L.scarf, 3.4, 2.5); }
  // jacket (the hero's puffer has quilting seams and a zip line)
  const coatPts = [[-9, -67], [-12, -60], [-13.5, -49], [-12.5, -38], [-13.5, -32], [12.5, -32], [13.5, -40], [14.5, -50], [12.5, -61], [7, -67.5]].map(torso);
  drawPart(c, [spline(PP(coatPts), new Set([4, 5]), 4)], opt(L.coat, 3.7, 9));
  if (L.quilted) for (const sy of [-58, -49.5, -41]) { for (let k = 0; k <= 26; k++) { const u = torso([-12 + k, sy + 0.8 * Math.sin((k / 26) * Math.PI)]), [X, Y] = P(u); const o = c.get(R(X), R(Y)); if (L.coat.some((cc) => cc.toLowerCase() === "#" + o.map((v) => v.toString(16).padStart(2, "0")).join(""))) g.rect(R(X), R(Y), Math.max(1, R(z * 0.7)), Math.max(1, R(z * 0.7)), L.coat[2]); } }
  if (L.zip) { const p = P(torso([12.8, -60])), q = P(torso([13.2, -34])); g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), L.coat[2]); }
  if (L.shirt) { part([torso([6, -68]), torso([12, -66.5]), torso([12.6, -60]), torso([9, -59])], L.shirt, 4.8, 1.6); if (L.tie) part([torso([11, -66]), torso([12.6, -65.5]), torso([12.8, -56]), torso([11.6, -55.5])], L.tie, 3.6, 1); }
  if (L.scarf) { part([torso([-8, -71]), torso([7.5, -71.5]), torso([9, -65.5]), torso([-7.5, -64.5])], L.scarf, 3.8, 2.5); const p = P(torso([-6, -68])), q = P(torso([8, -68.5])); g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), L.scarf[2]); }
  else part([torso([-4, -72]), torso([5, -72]), torso([5, -66]), torso([-4, -66])], L.skin, 3.6, 2);

  // head
  const N = torso([1, -70]), hr = (u) => rot(torso(u), N, pose.headTilt || 0);
  if (L.hairStyle === "long") part([[-9, -84], [-3, -88], [4, -86], [3, -74], [-2, -62], [-10, -64], [-11, -74]].map(hr), L.hair, 3.2, 3);
  const head = [[-7, -76], [-7, -81], [-4, -86], [1, -87.5], [6, -86], [8.6, -82.5], [9, -80], [11.6, -77.6], [9.2, -76.4], [9.6, -74.6], [8.6, -73.6], [8, -71.6], [4, -70.2], [0, -70.6], [-5, -72.5]].map(hr);
  drawPart(c, [spline(PP(head), new Set([7]), 4)], opt(L.skin, 4.4, 5, { rimLit: 0.6 }));
  part([[-7, -76], [-6.5, -72.2], [-3, -72.8], [-3.5, -79]].map(hr), L.hair, 3, 2);
  {
    const blink = pose.blink || 0, [ex, ey] = P(hr([6, -79.8]));
    if (blink < 0.5) g.rect(R(ex), R(ey), Math.max(1, R(z * 0.9)), Math.max(1, R(z * 1.2)), "#1A0E10"); else g.rect(R(ex - z * 0.3), R(ey + z * 0.5), Math.max(1, R(z * 1.4)), Math.max(1, R(z * 0.5)), "#1A0E10");
    const [bx, by] = P(hr([5, -82 - (pose.brows || 0)])); g.rect(R(bx), R(by), Math.max(2, R(z * 2.6)), Math.max(1, R(z * 0.6)), L.hair[3]);
    const [chx, chy] = P(hr([5.5, -75.5])); fade(c, 0.6 * a).ellipse(R(chx), R(chy), Math.max(1, R(z * 1.8)), Math.max(1, R(z * 1.1)), "#E07A70");
    const [ox, oy] = P(hr([0, -78])); g.ellipse(R(ox), R(oy), Math.max(1, R(z * 1.6)), Math.max(1, R(z * 2.2)), L.skin[3]); g.px(R(ox), R(oy), L.skin[2]);
    const open = pose.mouth || 0, talk = pose.talking && Math.sin(t * 17) > 0;
    if (open > 0.3) { const [mx, my] = P(hr([8.2, -74.2])); g.ellipse(R(mx), R(my), Math.max(1, R(z * 1.2)), Math.max(1, R(z * 1.0 * open)), "#5A1E20"); g.px(R(mx), R(my - z * 0.6 * open), "#FDFEED"); }
    else if (talk) { const [mx, my] = P(hr([8.6, -73.8])); g.rect(R(mx - z), R(my), Math.max(1, R(z * 1.3)), Math.max(1, R(z * 0.8)), "#5A1E20"); }
    else { const [mx, my] = P(hr([8.4, -73.6])); g.px(R(mx), R(my), L.skin[2]); g.px(R(mx - z * 0.8), R(my - z * 0.4), L.skin[2]); }
  }
  if (L.hat) {
    // bobble hat: crown, ribbed cuff, pompom
    part([[-8.8, -79], [-8.4, -85], [-4.5, -90.5], [1.5, -92], [7, -89.5], [9.6, -84.5], [9.8, -81.5], [-8.8, -80]].map(hr), L.hat, 3.6, 4);
    part([[-9.3, -82.5], [10, -84.6], [10.3, -80.6], [-9.2, -78.6]].map(hr), L.hat, 4.6, 2);
    for (let k = 0; k < 10; k++) { const p = P(hr([-8.5 + k * 2, -82.4 - k * 0.2])), q = P(hr([-8.5 + k * 2, -79.2 - k * 0.15])); g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), L.hat[3]); }
    const [px, py] = P(hr([0.5, -94.5])), r = Math.max(2, R(3.6 * z)); g.disc(R(px), R(py), r, "#C8C0DC"); g.disc(R(px - r * 0.2), R(py - r * 0.25), Math.max(1, R(r * 0.75)), "#F0ECF8"); for (let k = 0; k < 6; k++) g.px(R(px + Math.cos(k) * r * 0.6), R(py + Math.sin(k * 1.7) * r * 0.6), "#A8A0C0");
  } else {
    // hair: short crop, bun or long (the long back part is drawn before the head)
    part([[-8.4, -78], [-8, -84.5], [-4, -88.6], [1.5, -89.4], [6.5, -87.4], [9.2, -83.4], [7, -83], [2, -84.2], [-3, -81.6], [-5, -77]].map(hr), L.hair, 3.6, 3);
    if (L.hairStyle === "bun") { const [bx, by] = P(hr([-6, -88])), r = Math.max(2, R(3.4 * z)); drawPart(c, [spline([[bx - r, by], [bx, by - r], [bx + r, by], [bx, by + r]], new Set(), 4)], opt(L.hair, 3.8, 3)); }
    if (L.cap) part([[-8.8, -82], [-7, -88], [1, -90.5], [8, -87.5], [9.5, -83], [15, -82.5], [15, -81], [-8.8, -80.6]].map(hr), L.cap, 3.8, 3);
  }

  // near arm and hand (in front of everything)
  const NE = ik(SN, near, 16, 16, 1);
  part(limb([SN, NE, near], [8, 7, 6]), L.coat, 3.9, 4);
  { const cuff = L2(NE, near, 0.82), p = P(cuff); g.ellipse(R(p[0]), R(p[1]), Math.max(1, R(3.2 * z)), Math.max(1, R(3.2 * z)), (L.cuff || L.coat)[2]); }
  hand(c, P, z, near, NE, L, null, a, pose.press || 0);
}

function hand(c, P, z, H, from, L, dirOverride, a, press = 0) {
  const dir = dirOverride ?? Math.atan2(H[1] - from[1], H[0] - from[0]);
  if (L.mittens) mitten(c, P, z, H, dir, L.hands, 3.4, press, a);
  else { const pts = [[-2.6, -2.2], [1.6, -2.8], [3.4, -0.6], [3, 2], [-0.4, 2.8], [-2.8, 1.8]].map(([u, v]) => [H[0] + Math.cos(dir) * u - Math.sin(dir) * v, H[1] + Math.sin(dir) * u + Math.cos(dir) * v]);
    drawPart(c, [spline(pts.map(P), new Set(), 4)], { ramp: L.skin, base: 4.4, gain: 1.2, slope: 0.6, thick: 2.2 * z, light: [-0.25, -0.95], rimLit: 0.8, rimShade: 0.8, outline: L.skin[0], alpha: a }); }
}
/** Knitted mitten at hand point H, oriented along the forearm. */
export function mitten(c, P, z, H, dir, ramp, size, press = 0, a = 1) {
  const ang = dir, sq = 1 - 0.18 * press, g = fade(c, a);
  const loc = (u, v) => [H[0] + Math.cos(ang) * u * sq - Math.sin(ang) * v, H[1] + Math.sin(ang) * u * sq + Math.cos(ang) * v];
  const pts = [loc(-size * 0.9, -size * 0.75), loc(size * 0.2, -size * 0.95), loc(size * 0.9, -size * 0.55), loc(size * 1.05, 0), loc(size * 0.8, size * 0.6), loc(0, size * 0.85), loc(-size * 0.9, size * 0.7)];
  drawPart(c, [spline(pts.map(P), new Set(), 4)], { ramp, base: 3.8, gain: 1.3, slope: 0.6, thick: size * 0.8 * z, light: [-0.25, -0.95], rimLit: 0.8, rimShade: 0.8, outline: ramp[0], alpha: a });
  const thumb = [loc(-size * 0.2, -size * 0.8), loc(size * 0.35, -size * 1.35), loc(size * 0.65, -size * 0.95), loc(size * 0.25, -size * 0.55)];
  drawPart(c, [spline(thumb.map(P), new Set(), 4)], { ramp, base: 4.2, gain: 1, slope: 0.4, thick: size * 0.4 * z, light: [-0.25, -0.95], outline: ramp[0], alpha: a });
  if (z > 1.8) for (let v = -0.5; v <= 0.5; v += 0.33) for (let u = -0.6; u <= 0.7; u += 0.32) { const [X, Y] = P(loc(u * size, v * size)); g.px(R(X), R(Y), ramp[3]); g.px(R(X + z * 0.5), R(Y - z * 0.4), ramp[3]); }
  const [ax, ay] = P(loc(-size * 0.95, -size * 0.8)), [bx, by] = P(loc(-size * 0.95, size * 0.75)); g.line(R(ax), R(ay), R(bx), R(by), ramp[2]);
}
export { mix };
