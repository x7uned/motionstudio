// Casino kit · people: guests (the hero's rig from hero.mjs with other looks), the front-facing dealer (vest, white shirt,
// red bow tie), and pose helpers (rest, idle, cheer, clap, walk). Our own characters, no real faces.
import { drawHero, HERO_LOOK, REST, PANTS, BOOT, SKIN, HAIR } from "./hero.mjs";
import { R, RAMP, clamp01, sm, ease, lerp, rnd, mix, fade, glow, shadow } from "./casino-core.mjs";
import { smooth as spline, drawPart } from "../../dog/shade.mjs";

const SKIN2 = ["#1E0E0A", "#3A1C12", "#5A2E1C", "#7A4228", "#9A5A38", "#B4744A", "#CA9064", "#DEAE84"];
const SKIN3 = ["#2A1612", "#52302A", "#7C4A3A", "#A2654C", "#C48262", "#DCA27E", "#EEC29E", "#F8DCC0"];
const GRAY = ["#1E1E26", "#34343E", "#4C4C58", "#686874", "#868692", "#A4A4AE", "#C4C4CC", "#E2E2E8"];
const RED_HAIR = ["#200806", "#3E1208", "#62200C", "#863212", "#A8461A", "#C46028", "#DA7E3E", "#EAA05C"];
const BLONDE = ["#2A1E08", "#4A360E", "#6E5216", "#927020", "#B48E30", "#D0AC48", "#E4C86A", "#F2E09A"];
export const LOOKS = {
  hero: HERO_LOOK,
  teal: { coat: RAMP.teal, pants: PANTS, boot: BOOT, hands: SKIN3, skin: SKIN3, hair: HAIR, hairStyle: "bun" },
  suit: { coat: RAMP.wood, pants: RAMP.wood, boot: BOOT, hands: SKIN, skin: SKIN, hair: GRAY, shirt: RAMP.shirt, tie: RAMP.red },
  mustard: { coat: RAMP.yellow, pants: PANTS, boot: BOOT, hands: SKIN2, skin: SKIN2, hair: HAIR, cap: RAMP.blue },
  dress: { coat: RAMP.purple, pants: RAMP.purple, skirt: RAMP.purple, boot: RAMP.black, hands: SKIN, skin: SKIN, hair: BLONDE, hairStyle: "long" },
  navy: { coat: RAMP.blue, pants: RAMP.vest, boot: RAMP.black, hands: SKIN2, skin: SKIN2, hair: HAIR, shirt: RAMP.shirt, tie: RAMP.red },
  sweater: { coat: RAMP.green, pants: RAMP.wood, boot: BOOT, hands: SKIN3, skin: SKIN3, hair: RED_HAIR },
  gray: { coat: GRAY, pants: RAMP.vest, boot: RAMP.black, hands: SKIN, skin: SKIN, hair: HAIR, shirt: RAMP.shirt },
};
export const GUEST_LOOKS = ["teal", "suit", "mustard", "dress", "navy", "sweater", "gray"];

// ---------------------------------------------------------------- poses
/** Idle at a table: tiny breathing lean, occasional blink, hand resting on the rail (rig units). */
export function idlePose(t, seed = 0, o = {}) {
  const blinkT = ((t + rnd(seed) * 4) % (3 + rnd(seed + 1) * 2)), blink = blinkT < 0.12 ? 1 : 0;
  return { ...REST, lean: 0.02 * Math.sin(t * 1.3 + seed), headTilt: 0.04 * Math.sin(t * 0.7 + seed * 2), blink, near: o.near ?? [13 + Math.sin(t * 0.9 + seed) * 0.6, -44], far: o.far ?? [6, -37], mouth: 0 };
}
/** Cheer: both hands up, a little hop (k = 0..1 blend from `base`). */
export function cheerPose(t, base, k, seed = 0) {
  const hop = Math.abs(Math.sin((t + seed) * 9)) * 2 * k;
  const pump = Math.sin((t + seed) * 9);
  return { ...base, near: [lerp(base.near[0], 17, k), lerp(base.near[1], -54 - pump * 5, k)], far: [lerp(base.far[0], -15, k), lerp(base.far[1], -102 + pump * 3, k)], bob: -hop, mouth: k, headTilt: lerp(base.headTilt, -0.15, k), lean: lerp(base.lean, -0.06, k) };
}
/** Clap at chest height (k = 0..1). */
export function clapPose(t, base, k) {
  const s = 0.5 + 0.5 * Math.sin(t * 16);
  return { ...base, near: [lerp(base.near[0], 15 + s * 2, k), lerp(base.near[1], -58, k)], far: [lerp(base.far[0], 13 - s * 2, k), lerp(base.far[1], -59, k)], mouth: k * 0.8 };
}
/** Walking pose with phase from the distance walked (cm). */
export function walkPose(dist, speed = 1) { const ph = (Math.PI * dist) / 60, amp = clamp01(speed); return { ...REST, ph, amp, near: [-1 + Math.sin(ph) * 7 * amp, -34], far: [-1 - Math.sin(ph) * 7 * amp, -35], bob: -1.6 * Math.abs(Math.sin(ph)) * amp }; }

/**
 * A person standing at floor point (x, z): the rig through a billboard. o = { mirror (face left), a, unit (cm per rig unit, 1.75),
 * vf (vertical factor 0.86) }. Returns G (for hand targets: V.toRig(G, sx, sy)).
 */
export function drawPerson(c, V, x, z, t, pose, look = LOOKS.teal, o = {}) {
  const G = V.bill(x, z, o.unit ?? 1.75, o.vf ?? 0.86, !!o.mirror);
  if (G.bx < -80 || G.bx > 620 || G.by < -20 || G.by - 100 * G.z > 980) return G;
  shadow(c, G.bx, G.by, 17 * G.z, 4 * G.z, 0.45 * (o.a ?? 1));
  if (G.z < 0.35) { tiny(c, G, look, pose, o.a ?? 1); return G; }
  drawHero(c, G, t, pose, look, o.a ?? 1);
  return G;
}
/** Very small guests (wide shots): a few flat tone blocks. */
function tiny(c, G, L, pose, a) {
  const g = fade(c, a), X = G.X, Y = G.Y, b = pose.bob || 0;
  const rect = (u0, v0, u1, v1, col) => { const x0 = R(Math.min(X(u0), X(u1))), x1 = R(Math.max(X(u0), X(u1))); g.rect(x0, R(Y(v0 + b)), Math.max(1, x1 - x0), Math.max(1, R(Y(v1 + b)) - R(Y(v0 + b))), col); };
  rect(-8, -34, 8, 0, L.pants[2]); rect(-12, -66, 12, -32, L.coat[4]); rect(-12, -66, -6, -32, L.coat[3]);
  rect(-7, -86, 8, -68, L.skin[5]); rect(-8, -90, 8, -80, (L.hat || L.cap || L.hair)[3]);
}

// ---------------------------------------------------------------- the dealer (front view)
/**
 * Dealer standing at floor point (x, z), facing the camera. st = { hands: [[x, y, z], [x, y, z]] world targets (left, right),
 * smile 0..1, blink, nod, a }.
 */
export function drawDealer(c, V, x, z, t, st = {}) {
  const G = V.bill(x, z, 1.72, 0.86), zz = G.z, a = st.a ?? 1; if (a <= 0) return G;
  if (G.bx < -80 || G.bx > 620) return G;
  const g = fade(c, a), nod = st.nod ?? 0, P = (u) => [G.X(u[0]), G.Y(u[1] + (u[1] < -66 ? nod : 0))], PP = (arr) => arr.map(P);
  const light = [-0.5, -0.85], part = (pts, ramp, base, thick) => drawPart(c, [spline(PP(pts), new Set(), 4)], { ramp, base, gain: 1.4, slope: 1, thick: thick * zz, light, rimLit: 0.8, rimShade: 0.8, outline: ramp[0], alpha: a });
  if (zz < 0.35) { const rect = (u0, v0, u1, v1, col) => g.rect(R(G.X(u0)), R(G.Y(v0)), Math.max(1, R(G.X(u1)) - R(G.X(u0))), Math.max(1, R(G.Y(v1)) - R(G.Y(v0))), col); rect(-12, -66, 12, -30, RAMP.vest[3]); rect(-3, -66, 3, -50, RAMP.shirt[6]); rect(-7, -86, 7, -68, SKIN[5]); rect(-8, -90, 8, -82, HAIR[2]); return G; }
  shadow(c, G.bx, G.by, 16 * zz, 4 * zz, 0.4 * a);
  // legs + trousers (mostly hidden by the table)
  part([[-11, -36], [-1, -36], [-2, 0], [-10, 0]], RAMP.vest, 2.6, 4); part([[1, -36], [11, -36], [10, 0], [2, 0]], RAMP.vest, 3.0, 4);
  // arms behind the body first (shirt sleeves), hands to the targets
  const hands = (st.hands ?? []).map((h) => { const [sx, sy] = V.P(h[0], h[1], h[2]); return V.toRig(G, sx, sy); });
  const sh = [[-14, -63], [14, -63]], def = [[-17, -38], [17, -38]];
  for (let s = 0; s < 2; s++) {
    const S = sh[s], H = hands[s] ?? def[s], d = Math.hypot(H[0] - S[0], H[1] - S[1]), mid = [lerp(S[0], H[0], 0.5) + (s ? 4 : -4) * clamp01(1 - d / 34), lerp(S[1], H[1], 0.5) + 3];
    part(limbPts([S, mid, H], [8, 7, 6]), RAMP.shirt, 4.2, 3.5);
    part([[H[0] - 3, H[1] - 2.4], [H[0] + 3, H[1] - 2.4], [H[0] + 3.4, H[1] + 2], [H[0] - 3.4, H[1] + 2]], SKIN, 4.6, 2);
  }
  // torso: white shirt, black vest with gold buttons, red bow tie
  part([[-14, -66], [14, -66], [13, -38], [-13, -38]], RAMP.shirt, 4.4, 6);
  part([[-14, -65], [-3, -63], [-1, -40], [-12, -38]], RAMP.vest, 3.2, 5); part([[14, -65], [3, -63], [1, -40], [12, -38]], RAMP.vest, 3.6, 5);
  for (const v of [-56, -50, -44]) { const [bx, by] = P([1.6, v]); g.px(R(bx), R(by), RAMP.gold[6]); }
  part([[-5, -69], [0, -66.5], [5, -69], [5, -64.5], [0, -66], [-5, -64.5]], RAMP.red, 3.8, 1.5);
  // head
  const head = [[-8, -76], [-7.4, -83], [-4, -87.5], [0, -88.5], [4, -87.5], [7.4, -83], [8, -76], [6, -70.5], [0, -68.5], [-6, -70.5]];
  part([[-3, -70], [3, -70], [3, -65], [-3, -65]], SKIN, 3.4, 2);
  part(head, SKIN, 4.4, 5);
  part([[-8.4, -78], [-8, -85], [-4, -89.5], [1, -90.5], [6, -89], [8.4, -85], [8.2, -79], [6.4, -83.6], [1, -85.4], [-4.6, -84.6], [-7, -81]], HAIR, 3.2, 3);
  const blink = st.blink ?? (((t + 1.3) % 3.7) < 0.12 ? 1 : 0), smile = st.smile ?? 0.4;
  for (const s of [-1, 1]) { const [ex, ey] = P([s * 3.2, -78]); if (blink < 0.5) g.rect(R(ex), R(ey), Math.max(1, R(zz * 1.1)), Math.max(1, R(zz * 1.4)), "#1A0E10"); else g.rect(R(ex - zz * 0.3), R(ey + zz * 0.6), Math.max(1, R(zz * 1.6)), Math.max(1, R(zz * 0.5)), "#1A0E10");
    const [bx, by] = P([s * 3.4 - 1.2, -81.2]); g.rect(R(bx), R(by), Math.max(2, R(zz * 2.6)), Math.max(1, R(zz * 0.6)), HAIR[1]);
    const [chx, chy] = P([s * 5, -74.5]); fade(c, 0.5 * a).ellipse(R(chx), R(chy), Math.max(1, R(zz * 1.5)), Math.max(1, R(zz * 0.9)), "#E07A70"); }
  { const [mx, my] = P([0, -73]), w = Math.max(1, R(zz * 2.2)); for (let i = -w; i <= w; i++) g.px(R(mx + i), R(my + (smile * (1 - (i / w) ** 2) * zz * 0.9)), "#6A2020"); }
  return G;
}
function limbPts(pts, widths) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, w = widths[i] / 2; L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rr.push([pts[i][0] - nx * w, pts[i][1] - ny * w]); }
  return [...L, ...Rr.reverse()];
}
export { REST, HERO_LOOK };
