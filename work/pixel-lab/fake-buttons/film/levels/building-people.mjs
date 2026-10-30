// The building's people («Fake buttons», builder BUILDING): a small chibi rig in the proportions of the channel's
// character (big head ≈ 1/3 of the height, short limbs), volume-shaded with the cute kit (blob = drawPart), dark 1-px
// outline, big glossy eyes. Side (3/4, facing dir) and front views; every pose parameter is continuous, so walking,
// reaching and turning never jump. Drawn in world coordinates on a surface from worldOf() (or a gated one).
import { blob, eye, smooth, ell, tube, blush as blushK } from "../cute.mjs";
import { mix, bayer, R, lerp, clamp01, OUT } from "./building-kit.mjs";

const DK = "#1A1020", LT = "#FFF8EE";
/** 8-step ramp around a mid colour (index 5 ≈ the colour). */
export function ramp(c, warm = LT) { return [mix(c, DK, 0.86), mix(c, DK, 0.62), mix(c, DK, 0.45), mix(c, DK, 0.28), mix(c, DK, 0.12), c, mix(c, warm, 0.28), mix(c, warm, 0.55)]; }
const WHITE = ["#2A2A3A", "#5A5A72", "#8A8AA2", "#A8A8C0", "#C4C4D8", "#DCDCEA", "#EEEEF6", "#FFFFFF"];

// ---------------------------------------------------------------- the cast
export const CAST = {
  worker: { h: { leg: 52, torso: 50, hr: 31, hry: 29, l1: 24, l2: 24 }, skin: ramp("#F0C49E"), hair: ramp("#4A2C20"), top: WHITE, bottom: ramp("#2E3A5A"), shoe: ramp("#3A2A24"),
    tie: "#D8404A", badge: true, hairStyle: "side", iris: ["#1A1020", "#3A2A20", "#5A3E2A", "#7A5638", "#9A7048"] },
  old: { h: { leg: 44, torso: 46, hr: 29, hry: 27, l1: 20, l2: 19 }, skin: ramp("#EDBE96"), hair: ramp("#D8D4DC"), top: ramp("#8A6A3A"), bottom: ramp("#B8A88A"), shoe: ramp("#4A2E20"),
    hairStyle: "bald", glasses: true, stache: true, cardigan: true, iris: ["#1A1020", "#2A3A4A", "#3A5A6E", "#5A7A90", "#7A9AB0"] },
  fire: { h: { leg: 54, torso: 52, hr: 31, hry: 29, l1: 23, l2: 22 }, skin: ramp("#D89A70"), hair: ramp("#2A1A14"), top: ramp("#B8954A"), bottom: ramp("#B8954A"), shoe: ramp("#2A2428"),
    helmet: true, stripes: true, hairStyle: "short", iris: ["#1A1020", "#3A2414", "#5A3A20", "#7A5230", "#9A6A40"] },
  colleague: { h: { leg: 44, torso: 46, hr: 30, hry: 28, l1: 20, l2: 19 }, skin: ramp("#F4CDB0"), hair: ramp("#A8482E"), top: ramp("#3EA0A0"), bottom: ramp("#4A4A6A"), shoe: ramp("#3A2A24"),
    hairStyle: "long", beanie: ramp("#E8C040"), scarf: ["#D8404A", "#F4F0E8"], iris: ["#1A1020", "#2A3A24", "#3A5A30", "#5A7A40", "#7A9A50"] },
};

// ---------------------------------------------------------------- helpers
const v2 = (a, b) => [a[0] + b[0], a[1] + b[1]];
const polar = (len, ang) => [Math.sin(ang) * len, Math.cos(ang) * len];       // ang 0 = straight down, + = forward
function line2(g, a, b, col, w = 1) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let i = 0; i <= n; i++) { const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n; for (let k = 0; k < w; k++) g.px(R(x + (k % 2)), R(y + Math.floor(k / 2)), col); } }
function arcPx(g, cx, cy, rx, ry, a0, a1, col) { const n = Math.ceil((rx + ry) * 2); for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; g.px(R(cx + Math.cos(a) * rx), R(cy + Math.sin(a) * ry), col); } }
function heart(g, x, y, s, col, out = OUT) {
  const rows = s > 2 ? ["..###...###..", ".#####.#####.", "#############", "#############", ".###########.", "..#########..", "...#######...", "....#####....", ".....###.....", "......#......"]
    : s > 1 ? [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."] : [".#.#.", "#####", ".###.", "..#.."];
  const w = rows[0].length;
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "#") return; const X = R(x - w / 2) + i, Y = R(y) + j; g.px(X, Y, col); }));
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "#") return; const X = R(x - w / 2) + i, Y = R(y) + j; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + dx, jj = j + dy; if (jj < 0 || jj >= rows.length || ii < 0 || ii >= w || rows[jj][ii] !== "#") g.px(X + dx, Y + dy, out); } }));
  if (s > 2) { const x0 = R(x - w / 2); g.rect(x0 + 2, R(y) + 2, 2, 2, "#FFFFFF"); g.px(x0 + 4, R(y) + 2, "#FFD0DC"); for (let j = 5; j < 9; j++) { const half = 6 - (j - 4); g.px(x0 + 6 + half - 1, R(y) + j, mix(col, "#7A1030", 0.3)); } }
  else if (s > 1) { g.px(R(x - w / 2) + 1, R(y) + 1, "#FFFFFF"); g.px(R(x - w / 2) + 2, R(y) + 1, "#FFD0DC"); }
}
export { heart };

/**
 * Draw one person. p = {
 *   x, y: feet (world), dir: 1 right | −1 left, view: "side" | "front", a: alpha (dissolve),
 *   ph: walk phase (cycles), walk: 0..1, stride, bob, lean (rad), seated: 0|1,
 *   armF / armB: [shoulder angle, elbow bend] (0 = down, + forward), armsCross: 0..1 (front view hug),
 *   eyes: "open" | "happy" | "closed" | "squint", blink, look: [dx, dy], mouth: "smile" | "grin" | "flat" | "o" | "wavy" | "frown",
 *   brow: 0 neutral | +1 raised | −1 angry | −2 worried, blush: 0..1, cold: 0..1, shiver: px, hold: "key" | "cane" | null, keyTurn: 0..1, tilt (rad)
 * }
 */
export function drawPerson(g, cfg, p) {
  const dir = p.dir ?? 1, H = cfg.h, front = p.view === "front", seated = p.seated ?? 0;
  const ox = p.x + (p.shiver ?? 0), oy = p.y;
  const phi = 2 * Math.PI * (p.ph ?? 0), walk = p.walk ?? 0, stride = p.stride ?? 9;
  const bob = (p.bob ?? 0) - walk * Math.abs(Math.sin(phi)) * 1.6 + (seated ? 0 : 0);
  const hipY = -H.leg + bob + (seated ? -2 : 0), top = hipY - H.torso, lean = p.lean ?? 0;
  // local → world (x mirrored by dir); the upper body leans around the hip
  const W = (u, v) => [ox + dir * u, oy + v];
  const U = (u, v) => { const dy = v - hipY, c = Math.cos(lean), s = Math.sin(lean); return W(u * c + dy * s, hipY + dy * c - u * s); };
  const sh = { ramp: null, base: 3.6, gain: 1.7, slope: 0.8, thick: 9, light: [-0.6 * dir, -0.8], rimLit: 0.7, rimShade: 0.7 };
  const part = (polys, rmp, o = {}) => blob(g, polys, { ...sh, ramp: rmp, outline: OUT, ...o });

  // ---------------- legs + shoes
  const legW = 13;
  const st = (p.stance ?? 4) * (1 - walk), tap = p.tap ?? 0;
  const feet = front || seated ? [[-9, 0], [9, 0]] : [0, Math.PI].map((o) => [stride * walk * Math.sin(phi + o) + st * (o ? -1 : 1), Math.max(0, -Math.cos(phi + o)) * 4 * walk + (o ? 0 : tap)]);
  const legPoly = (fx, lift, hx) => {
    if (seated) { const knee = [hx + 22, hipY + 4], ank = [hx + 24, -6]; return tube([U(hx, hipY + 2), W(knee[0], knee[1]), W(ank[0], ank[1])], legW / 2, legW / 2 - 1); }
    return tube([U(hx, hipY + 3), W(fx, -7 - lift)], legW / 2, legW / 2 - 1);
  };
  const shoe = (fx, lift, k) => {
    if (seated) fx += 30;
    const cx = fx + (front ? 0 : 4), cy = -4.5 - lift, rx = front ? 7 : 9.5, ry = 5;
    return smooth([[cx - rx, cy + ry - 0.5], [cx - rx, cy - 1], [cx - rx + 3, cy - ry], [cx + rx - 4, cy - ry + 1], [cx + rx, cy + 1], [cx + rx, cy + ry - 0.5]].map(([u, v]) => W(u, v)), new Set([0, 5]), 4);
  };
  const order = front || seated ? [0, 1] : walk > 0 && Math.sin(phi) > 0 ? [1, 0] : [0, 1];
  const hipX = front || seated ? [-8, 8] : [-2, 3];
  for (const i of order) {
    const [fx, lift] = feet[i], back = !front && !seated && i === order[0];
    part([legPoly(fx, lift, hipX[i])], cfg.bottom, { base: back ? 3.0 : 3.6, thick: 6 });
    if (cfg.stripes) { const a = W(fx - 6, -14 - lift), b = W(fx + 6, -14 - lift); line2(g, [Math.min(a[0], b[0]), a[1]], [Math.max(a[0], b[0]), a[1]], "#E8F060", 1); line2(g, [Math.min(a[0], b[0]), a[1] + 1], [Math.max(a[0], b[0]), a[1] + 1], "#C8D0D8", 1); line2(g, [Math.min(a[0], b[0]), a[1] + 2], [Math.max(a[0], b[0]), a[1] + 2], "#E8F060", 1); }
    part([shoe(fx, lift)], cfg.shoe, { base: back ? 3.0 : 3.8, thick: 4 });
  }

  // ---------------- arms (back arm first, behind the torso)
  const shY = top + 9;
  const armPts = (side, a1, a2) => {
    const S = front ? [side * 17, shY] : [side > 0 ? 7 : -5, shY], L1 = H.l1 ?? 19, L2 = H.l2 ?? 18;
    if (front && p.armsCross) {   // hugging himself/herself: hands cross over the chest
      const k = p.armsCross, E = [side * lerp(14, 20, k), lerp(shY + 18, shY + 20, k)], Hd = [side * lerp(14, -10, k), lerp(shY + 34, shY + 16, k)];
      return [S, E, Hd];
    }
    const E = v2(S, polar(L1, a1)), Hd = v2(E, polar(L2, a1 + a2));
    return [S, E, Hd];
  };
  const drawArm = (side, arm, back) => {
    const [S, E, Hd] = armPts(side, arm[0], arm[1]);
    const toW = (q) => (front ? U(q[0], q[1]) : U(q[0], q[1]));
    part([tube([toW(S), toW(E), toW(Hd)], 5.5, 4.8)], cfg.top, { base: back ? 3.0 : 3.7, thick: 5 });
    if (cfg.stripes) { const m = toW([(E[0] + Hd[0]) / 2, (E[1] + Hd[1]) / 2]); g.rect(R(m[0]) - 4, R(m[1]), 9, 2, "#E8F060"); g.rect(R(m[0]) - 4, R(m[1]) + 2, 9, 1, "#C8D0D8"); }
    const hw = toW(v2(Hd, polar(3, arm[0] + arm[1])));
    part([ell(hw[0], hw[1], 5.2, 5.2)], cfg.skin, { base: back ? 3.4 : 4.0, thick: 3, gain: 1.4 });
    return hw;
  };
  let handF = null, handB = null;
  if (!front) handB = drawArm(-1, p.armB ?? [-0.15, 0.1], true);

  // ---------------- torso
  {
    const bw = front ? 20 : 17;
    const T = (front ? [[-15, top], [15, top], [19, top + 7], [20, hipY + 1], [17, hipY + 6], [-17, hipY + 6], [-20, hipY + 1], [-19, top + 7]]
      : [[-11, top + 1], [7, top], [13, top + 4], [16, top + 14], [17, hipY + 2], [14, hipY + 6], [-14, hipY + 6], [-16, hipY + 2], [-15, top + 12], [-14, top + 4]]).map(([u, v]) => U(u, v));
    part([smooth(T, new Set(), 4)], cfg.top, { thick: 11, base: 3.3, gain: 2.0 });
    // belt line / pants top
    const pb = [[-bw + 1, hipY - 2], [bw, hipY - 2], [bw - 2, hipY + 6], [-bw + 2, hipY + 6]].map(([u, v]) => U(front ? u : u - 0.5, v));
    if (!cfg.cardigan && !cfg.helmet) part([pb], cfg.bottom, { thick: 3, base: 3.4 });
    const cx = front ? 0 : 7;
    if (cfg.tie) { const a = U(cx, top + 2), b = U(cx, hipY - 6); const pts = [U(cx - 2, top + 2), U(cx + 2, top + 2), U(cx + 3.5, hipY - 9), U(cx, hipY - 4), U(cx - 3.5, hipY - 9)]; g.poly(pts, cfg.tie); line2(g, a, b, mix(cfg.tie, DK, 0.4)); g.poly([U(cx - 3, top), U(cx + 3, top), U(cx + 1.5, top + 4), U(cx - 1.5, top + 4)], mix(cfg.tie, DK, 0.2));
      // collar
      g.poly([U(cx - 7, top - 1), U(cx - 1, top + 5), U(cx - 3, top + 6), U(cx - 9, top + 1)], "#FFFFFF"); g.poly([U(cx + 7, top - 1), U(cx + 1, top + 5), U(cx + 3, top + 6), U(cx + 9, top + 1)], "#FFFFFF"); }
    if (cfg.badge) { const b = U(front ? -9 : 0, top + 22); g.rect(R(b[0]) - 3, R(b[1]), 7, 9, OUT); g.rect(R(b[0]) - 2, R(b[1]) + 1, 5, 7, "#F4F8FF"); g.rect(R(b[0]) - 2, R(b[1]) + 1, 5, 2, "#3A7AD8"); g.line(R(b[0]), R(b[1]), R(U(front ? -4 : 5, top + 2)[0]), R(U(front ? -4 : 5, top + 2)[1]), "#3A7AD8"); }
    if (cfg.cardigan) { const a = U(cx, top + 3), b = U(cx, hipY + 4); line2(g, a, b, mix(cfg.top[5], DK, 0.45)); for (let k = 0; k < 3; k++) { const q = U(cx + 3 * (front ? 1 : 1), top + 12 + k * 10); g.rect(R(q[0]), R(q[1]), 2, 2, "#F2E4C0"); } g.poly([U(cx - 6, top - 1), U(cx, top + 8), U(cx + 6, top - 1)], "#F4F0E6"); }
    if (cfg.stripes) { for (const yy of [hipY - 8]) { const a = U(-bw + 1, yy), b = U(bw - 1, yy); for (let k = 0; k < 3; k++) line2(g, [a[0], a[1] + k], [b[0], b[1] + k], k === 1 ? "#C8D0D8" : "#E8F060"); }
      for (let yy = top + 4; yy < hipY - 2; yy += 2) { const q = U(cx - 1, yy); g.px(R(q[0]), R(q[1]), "#1A1418"); } }
  }

  if (!front && p.armBehind) handF = drawArm(1, p.armF ?? [0.15, 0.1], false);
  // ---------------- head
  const C = U(front ? 0 : 4, top - H.hry + 3 + (p.headDy ?? 0));
  const tilt = (p.tilt ?? 0) * dir;
  const Hp = (u, v) => { const c = Math.cos(tilt), s = Math.sin(tilt); return [C[0] + (dir * u) * c - v * s, C[1] + (dir * u) * s + v * c]; };   // head-local (u toward facing), world out
  const hr = H.hr, hry = H.hry;
  // hair behind the head (long hair / back of the head)
  if (cfg.hairStyle === "long") part([smooth([[-hr - 3, -6], [-hr + 2, -hry + 2], [0, -hry - 4], [hr - 2, -hry + 2], [hr + 3, -6], [hr + 4, hry + 14], [hr - 8, hry + 22], [-hr + 8, hry + 22], [-hr - 4, hry + 14]].map(([u, v]) => Hp(u, v)), new Set(), 4)], cfg.hair, { thick: 10, base: 3.2 });
  part([ell(C[0], C[1], hr, hry, tilt)], cfg.skin, { thick: 12, gain: 1.5, base: 3.9, slope: 0.6 });
  // ears
  const ear = (u) => { const e = Hp(u, 4); part([ell(e[0], e[1], 4.2, 6)], cfg.skin, { thick: 3, base: 3.6, gain: 1.2 }); g.px(R(e[0]), R(e[1]), cfg.skin[3]); g.px(R(e[0]), R(e[1]) + 1, cfg.skin[3]); };
  if (front) { if (cfg.hairStyle !== "long") { ear(-hr + 1); ear(hr - 1); } } else ear(-6);
  // hair on top
  hair(g, cfg, front, Hp, hr, hry, part);
  // face
  // face (expression changes crossfade with an ordered dither: features of A where bayer ≥ k, of B where bayer < k)
  const fk = p.faceK ?? 0;
  if (p.face2 && fk > 0.001) {
    if (fk < 0.999) face(gateF(g, fk, true), cfg, p, front, Hp, hr, hry);
    face(fk < 0.999 ? gateF(g, fk, false) : g, cfg, { ...p, ...p.face2 }, front, Hp, hr, hry);
  } else face(g, cfg, p, front, Hp, hr, hry);
  // accessories on the head
  if (cfg.glasses) { const eyes = front ? [[-10, 2], [10, 2]] : [[6, 2], [20, 2]]; for (const [u, v] of eyes) { const q = Hp(u, v); g.ering(R(q[0]), R(q[1]), front ? 7 : (u > 10 ? 5 : 6.5), 6.5, OUT); } const a = Hp(eyes[0][0] + (front ? 7 : 6), 1), b = Hp(eyes[1][0] - (front ? 7 : 5), 1); line2(g, a, b, OUT); if (!front) line2(g, Hp(0, 1), Hp(-8, 0), OUT); }
  if (cfg.helmet) helmet(g, Hp, hr, hry, front, part);
  if (cfg.beanie) beanie(g, cfg, Hp, hr, hry, part);
  if (cfg.scarf) { const [s1, s2] = cfg.scarf; const S = [U(-16, top - 2), U(16, top - 2), U(15, top + 8), U(-15, top + 8)]; g.poly(S, s1); for (let u = -14; u <= 14; u += 6) { const q = U(u, top + 1); g.rect(R(q[0]), R(q[1]), 3, 6, s2); }
    const tail = [U(6, top + 6), U(12, top + 6), U(13, top + 26), U(7, top + 26)]; g.poly(tail, s1); for (let v = top + 10; v < top + 26; v += 6) { const q = U(7, v); g.rect(R(q[0]), R(q[1]), 6, 2, s2); }
    for (const pt of [S, tail]) for (let i = 0; i < pt.length; i++) g.line(R(pt[i][0]), R(pt[i][1]), R(pt[(i + 1) % pt.length][0]), R(pt[(i + 1) % pt.length][1]), OUT); }

  // ---------------- front arm (and props in the hand)
  if (front) { handB = drawArm(-1, p.armB ?? [-0.15, 0.1], false); handF = drawArm(1, p.armF ?? [-0.15, 0.1], false); }
  else if (!p.armBehind) handF = drawArm(1, p.armF ?? [0.15, 0.1], false);
  if (p.hold === "cane" && handF) { const tipX = p.caneX ?? (handF[0] + dir * 6), a = [handF[0] + dir * 1, handF[1] - 4]; line2(g, a, [tipX, oy - 1], "#5A3420", 2); line2(g, [a[0] + 1, a[1]], [tipX + 1, oy - 1], "#8A5A34", 1); g.rect(R(a[0]) - (dir > 0 ? 0 : 6), R(a[1]) - 2, 7, 3, "#5A3420"); g.rect(R(tipX) - 1, oy - 2, 3, 2, OUT); }
  if (p.hold === "key" && handF) { const k = p.keyTurn ?? 0, ang = -Math.PI / 2 * k; const kx = handF[0] + dir * 4, ky = handF[1] - 1; g.disc(R(kx), R(ky), 3, OUT); g.disc(R(kx), R(ky), 2, "#E8C040"); const tip = [kx + dir * Math.cos(ang) * 9, ky + Math.sin(ang) * 9]; line2(g, [kx, ky], tip, "#C89A20", 2); }
  return { handF, handB, head: C };
}

function hair(g, cfg, front, Hp, hr, hry, part) {
  const st = cfg.hairStyle, P = (pts, sharp = new Set()) => smooth(pts.map(([u, v]) => Hp(u, v)), sharp, 4);
  if (st === "side") {          // neat side part, a fringe sweeping toward the face
    if (front) part([P([[-hr - 2, 4], [-hr - 2, -hry + 10], [-12, -hry - 4], [12, -hry - 4], [hr + 2, -hry + 10], [hr + 2, 4], [hr - 3, -6], [hr - 8, -12], [6, -14], [-1, -9], [-9, -13], [-hr + 4, -7]], new Set([6, 9]))], cfg.hair, { thick: 7, base: 3.4, gain: 2.0 });
    else part([P([[-hr + 1, 10], [-hr - 2, 0], [-hr - 1, -12], [-hr + 6, -hry + 3], [-6, -hry - 3], [10, -hry - 2], [hr - 3, -hry + 8], [hr + 1, -8], [hr - 5, -5], [hr - 9, -12], [hr - 13, -7], [hr - 17, -13], [4, -12], [-5, -9], [-10, -1], [-13, 8], [-19, 11]], new Set([7, 9]))], cfg.hair, { thick: 7, base: 3.4, gain: 2.0 });
    glossArc(g, Hp, hr, hry, cfg.hair, front);
  } else if (st === "short") {
    if (!front) part([P([[-hr + 3, 8], [-hr, -2], [-hr + 2, -12], [-20, -12], [-19, -2], [-21, 7]])], cfg.hair, { thick: 3, base: 3.6 });
  } else if (st === "bald") {    // grey fringe around the back and sides, a shiny crown
    if (front) { part([P([[-hr - 1, 6], [-hr - 1, -8], [-hr + 6, -14], [-hr + 8, -2], [-hr + 4, 10]])], cfg.hair, { thick: 4, base: 4.2 }); part([P([[hr + 1, 6], [hr + 1, -8], [hr - 6, -14], [hr - 8, -2], [hr - 4, 10]])], cfg.hair, { thick: 4, base: 4.2 }); }
    else part([P([[-hr - 2, 8], [-hr - 2, -8], [-hr + 6, -16], [-2, -12], [-4, -2], [-hr + 8, 10]])], cfg.hair, { thick: 4, base: 4.2 });
    const s = Hp(front ? -8 : -2, -hry + 6); g.rect(R(s[0]), R(s[1]), 5, 2, "#FFF4E8"); g.px(R(s[0]) + 1, R(s[1]) + 2, "#FFF4E8");
  } else if (st === "long") {
    part([P([[-hr - 3, 0], [-hr - 1, -hry + 8], [-8, -hry - 4], [10, -hry - 3], [hr + 1, -hry + 8], [hr + 3, 0], [hr - 4, -12], [6, -hry + 9], [-6, -hry + 11], [-hr + 4, -10]])], cfg.hair, { thick: 6, base: 3.6 });
    glossArc(g, Hp, hr, hry, cfg.hair, front);
  }
}
function gateF(g, a, inv) { const o = Object.create(g), dx = g.dx ?? 0, dy = g.dy ?? 0; o.px = (x, y, col) => { const b = bayer(Math.floor(x + dx), Math.floor(y + dy)); if (inv ? a <= b : a > b) g.px(x, y, col); }; return o; }
function glossArc(g, Hp, hr, hry, H, front) {
  // a glossy anime-style highlight band across the hair + a few dark strand lines at the fringe
  for (let i = 0; i <= 26; i++) { const a = Math.PI * (1.18 + 0.5 * (i / 26)), q = Hp(Math.cos(a) * (hr - 7) + (front ? 0 : -4), Math.sin(a) * (hry - 6) + 2); if (i % 7 === 6) continue; g.px(R(q[0]), R(q[1]), H[7]); g.px(R(q[0]), R(q[1]) + 1, H[6]); }
  for (const u of front ? [-14, -4, 9, 18] : [4, 12, 20]) { const a = Hp(u, -hry + 6), b = Hp(u + (front ? 2 : 3), -hry + 13); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), H[2]); }
}
function helmet(g, Hp, hr, hry, front, part) {
  const R1 = ["#3A0A0A", "#5A1410", "#7E1E18", "#A42A20", "#C83A2A", "#E04A34", "#F07A5A", "#FFB090"];
  const P = (pts) => smooth(pts.map(([u, v]) => Hp(u, v)), new Set(), 4);
  // brim (long at the back), dome, front shield
  if (front) part([P([[-hr - 6, -12], [-hr - 4, -16], [hr + 4, -16], [hr + 6, -12], [hr + 2, -9], [-hr - 2, -9]])], R1, { thick: 3, base: 3.4 });
  else part([P([[-hr - 16, -6], [-hr - 13, -13], [hr - 2, -15], [hr + 6, -13], [hr + 2, -10], [-hr - 10, -3]])], R1, { thick: 3, base: 3.3 });
  part([P([[-hr, -12], [-hr + 2, -hry + 2], [-8, -hry - 11], [8, -hry - 12], [hr - 2, -hry + 1], [hr, -13]])], R1, { thick: 10, base: 3.6, gain: 2.2 });
  const ridge = [Hp(-10, -hry - 9), Hp(10, -hry - 10)]; for (let k = 0; k < 2; k++) g.line(R(ridge[0][0]), R(ridge[0][1]) + k, R(ridge[1][0]), R(ridge[1][1]) + k, k ? "#7E1E18" : "#F07A5A");
  const sc = Hp(front ? 0 : hr - 9, -hry - 2); g.poly([[sc[0] - 6, sc[1] - 6], [sc[0] + 6, sc[1] - 6], [sc[0] + 6, sc[1] + 2], [sc[0], sc[1] + 7], [sc[0] - 6, sc[1] + 2]], OUT);
  g.poly([[sc[0] - 5, sc[1] - 5], [sc[0] + 5, sc[1] - 5], [sc[0] + 5, sc[1] + 2], [sc[0], sc[1] + 6], [sc[0] - 5, sc[1] + 2]], "#E8C040"); g.rect(R(sc[0]) - 2, R(sc[1]) - 2, 5, 4, "#C8302E");
}
function beanie(g, cfg, Hp, hr, hry, part) {
  const P = (pts) => smooth(pts.map(([u, v]) => Hp(u, v)), new Set(), 4), B = cfg.beanie;
  part([P([[-hr - 2, -6], [-hr, -hry + 4], [-10, -hry - 8], [10, -hry - 8], [hr, -hry + 4], [hr + 2, -6]])], B, { thick: 8, base: 3.8 });
  part([P([[-hr - 3, -10], [hr + 3, -10], [hr + 3, -2], [-hr - 3, -2]])], B, { thick: 3, base: 4.4 });
  for (let u = -hr; u <= hr; u += 4) { const a = Hp(u, -9), b = Hp(u, -3); g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), B[3]); }
  const pm = Hp(0, -hry - 12); part([ell(pm[0], pm[1], 7, 6.5)], ["#3A3A50", "#8A8AA0", "#B8B8CC", "#D8D8E6", "#ECECF4", "#F8F8FC", "#FFFFFF", "#FFFFFF"], { thick: 4 });
}

function face(g, cfg, p, front, Hp, hr, hry) {
  const ex = front ? [-10.5, 10.5] : [5, 19], ey = 2.5, look = p.look ?? [front ? 0 : 0.6, 0.1];
  const eyesK = p.eyes ?? "open", blink = clamp01(p.blink ?? 0);
  const iris = cfg.iris;
  ex.forEach((u, i) => {
    const q = Hp(u, ey), rx = front ? 5 : i === 0 ? 4.2 : 4.8, ry = front ? 6 : 6;
    if (eyesK === "happy") { arcPx(g, q[0], q[1] + 2, rx - 0.5, 4, Math.PI * 1.08, Math.PI * 1.92, OUT); arcPx(g, q[0], q[1] + 3, rx - 0.5, 4, Math.PI * 1.15, Math.PI * 1.85, OUT); return; }
    if (eyesK === "closed") { g.rect(R(q[0] - rx + 1), R(q[1] + 1), R(rx * 2 - 1), 2, OUT); return; }
    eye(g, q[0], q[1], rx, { ry: eyesK === "squint" ? ry * 0.55 : ry, iris, look, blink, lid: cfg.skin[3], pupil: "round", outline: OUT });
  });
  // brows
  const br = p.brow ?? 0;
  ex.forEach((u, i) => {
    const inner = front ? (i === 0 ? 1 : -1) : (i === 0 ? 1 : -1), base = Hp(u, ey - 10 - (br > 0 ? 3 : 0));
    const dy = br === -1 ? 2.5 : br === -2 ? -2.5 : 0, w = front ? 5 : 4;
    const a = [base[0] - w, base[1] + (inner < 0 ? dy : -dy) * 0 + (inner > 0 ? 0 : 0)], b = [base[0] + w, base[1]];
    // inner end (toward the nose) moves down (angry) or up (worried)
    const innerIsRight = (front ? i === 0 : i === 0) ? true : false, dyIn = br === -1 ? 2.5 : br === -2 ? -2.5 : 0;
    const L = innerIsRight ? [a[0], a[1]] : [a[0], a[1] + dyIn], Rr = innerIsRight ? [b[0], b[1] + dyIn] : [b[0], b[1]];
    const col = cfg.hairStyle === "bald" ? "#F4F0F4" : mix(cfg.hair[2], OUT, 0.3);
    line2(g, L, Rr, col, cfg.hairStyle === "bald" ? 2 : 2);
  });
  // cheeks: blush, or a cold blue tint + a pink nose
  const bl = p.blush ?? 0.6, cold = p.cold ?? 0;
  const ck = front ? [[-15, 10], [15, 10]] : [[1, 10], [21, 11]];
  for (const [u, v] of ck) { const q = Hp(u, v); if (bl > 0.05) blushK(g, q[0], q[1], 4, 2, "#F27A9A", bl); if (cold > 0.05) blushK(g, q[0], q[1] - 1, 4, 2, "#8AB8F0", cold); }
  if (!front) { const n = Hp(hr - 2, 7); g.px(R(n[0]), R(n[1]), cold > 0.3 ? "#F27A9A" : cfg.skin[3]); g.px(R(n[0]), R(n[1]) + 1, cold > 0.3 ? "#E05A7A" : cfg.skin[3]); }
  // mustache
  if (cfg.stache) { const m = Hp(front ? 0 : 14, 11); g.poly([[m[0] - 7, m[1] + 2], [m[0] - 2, m[1] - 1], [m[0] + 2, m[1] - 1], [m[0] + 7, m[1] + 2], [m[0] + 2, m[1] + 2], [m[0], m[1] + 1], [m[0] - 2, m[1] + 2]], "#F4F0F4"); g.line(R(m[0] - 7), R(m[1]) + 3, R(m[0] + 7), R(m[1]) + 3, "#B8B4BC"); }
  // mouth
  const mk = p.mouth ?? "smile", m = Hp(front ? 0 : 13, cfg.stache ? 15 : 13);
  const mx = m[0], my = m[1];
  if (mk === "smile") { arcPx(g, mx, my - 2, 3.5, 2.5, Math.PI * 0.15, Math.PI * 0.85, OUT); }
  else if (mk === "grin") { g.poly([[mx - 5, my - 1], [mx + 5, my - 1], [mx + 3, my + 3], [mx - 3, my + 3]], OUT); g.rect(R(mx - 3), R(my), 7, 2, "#F07090"); g.rect(R(mx - 4), R(my - 1), 9, 1, "#FFFFFF"); }
  else if (mk === "flat") g.rect(R(mx - 2), R(my), 5, 1, OUT);
  else if (mk === "frown") arcPx(g, mx, my + 2, 3, 2, Math.PI * 1.15, Math.PI * 1.85, OUT);
  else if (mk === "o") { g.ering(R(mx), R(my), 2, 2, OUT); g.px(R(mx), R(my), "#7A2A3A"); }
  else if (mk === "wavy") { for (let k = -4; k <= 4; k++) g.px(R(mx + k), R(my + (((k + 4) >> 1) % 2 ? 1 : 0)), OUT); }
}

// ---------------------------------------------------------------- reach helpers
/** Shoulder of the front arm in person-local coordinates (u forward, v from the feet) for a standing side view. */
export function shoulderLocal(cfg, p = {}) { const H = cfg.h, hipY = -H.leg + (p.bob ?? 0), top = hipY - H.torso; return [7, top + 9]; }
/** Two-bone IK: arm angles [a1, a2] that put the hand centre on the world point (tx, ty). Elbow bends down. */
export function reach(cfg, p, tx, ty) {
  const dir = p.dir ?? 1, [su, sv] = shoulderLocal(cfg, p), L1 = cfg.h.l1 ?? 19, L2 = (cfg.h.l2 ?? 18) + 3;
  const du = (tx - p.x) * dir - su, dv = ty - p.y - sv, d = Math.min(Math.hypot(du, dv), L1 + L2 - 0.01), base = Math.atan2(du, dv);
  const al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d || 1))));
  const a1 = base - al * Math.sign(du || 1), E = [su + Math.sin(a1) * L1, sv + Math.cos(a1) * L1];
  const a12 = Math.atan2(su + du - E[0], sv + dv - E[1]);
  return [a1, a12 - a1];
}
export const mixArm = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
