// sonic-real · passerby (frozen copy of pacman-real/film/assets/passerby.mjs + new summer colours coral, straw, lime, sky, lilac; pacman-real · passerby: frozen copy of mario-real/film2/assets/passerby.mjs + look.shorts: shorts on the thighs, bare shins — summer clothes; mario-real: frozen copy of steve-real/film2/assets/passerby.mjs — film art, not catalog — with close-up faces, look.head, a smooth REC dot; new looks below): an adult city passer-by with real proportions
// (1.6–1.85 m; head ≈ 1/7.5 of the height) in a 3/4 front view, lit from the upper left. Looks are data (coat, trousers or
// skirt, shoes, skin, hair style and colour, bag, cap, glasses, beard). Pose parameters ease smoothly: walk (gait phase from
// the film), film (holds a phone up at arm's length, recording dot blinks), cup (a coffee cup at the chest), recoil (leans
// back, hands up), point (arm out toward a target), clap, lean, turn (the head turns −1…1), mouth (open). Not a real person.
import { Spr } from "../lib/rig.mjs";
const R = Math.round, TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;

export const RAMPS = {
  skinA: ["#6A3A2A", "#9A5A40", "#C27E5E", "#DCA07E", "#ECC0A0"], skinB: ["#4A2A1E", "#6E3E2A", "#8E5638", "#AE7250", "#C88E6A"], skinC: ["#7A4A36", "#B07A5C", "#D69E7E", "#ECBE9C", "#F8D8BC"], skinD: ["#3A2018", "#55301F", "#70432C", "#8C5A3C", "#A87452"],
  navy: ["#1C2240", "#2A3460", "#3C4A80", "#566AA0", "#7A8EBE"], camel: ["#6A4826", "#8E6234", "#B07E46", "#CC9C5E", "#E2BC80"], red: ["#5E1A20", "#8A2830", "#B23A3E", "#D2564E", "#E8806C"],
  green: ["#1E3A2C", "#2C5440", "#3E7056", "#588E6E", "#7AAE8C"], mustard: ["#6A4A10", "#94681A", "#BC8A26", "#D8AA3E", "#ECC866"], grey: ["#2E2E36", "#46464E", "#62626C", "#82828C", "#A8A8B0"],
  white: ["#8A8698", "#B4B0C0", "#D4D0DC", "#ECE8F0", "#FCFAFE"], teal: ["#123C40", "#1E5A5E", "#2C7A7C", "#46989A", "#6EB8B8"], plum: ["#3A1E3E", "#56305A", "#764A7A", "#966A9A", "#B890B8"],
  denim: ["#1E2A44", "#2C3E62", "#3E5482", "#5670A0", "#7890BC"], black: ["#141218", "#22202A", "#33303C", "#46424E", "#5E5A66"], khaki: ["#4E4630", "#6A6040", "#867C54", "#A2986C", "#BEB48A"],
  brown: ["#2A180E", "#40261A", "#583624", "#704830", "#8C5E40"], blond: ["#6A4A1C", "#94702E", "#BC9646", "#D8B866", "#ECD48E"], dark: ["#141016", "#201A20", "#2E262C", "#3E343A", "#544850"],
  ginger: ["#5A240E", "#843818", "#AA5224", "#C87038", "#DE9052"], greyH: ["#5A5660", "#7E7A84", "#A09CA6", "#C4C0C8", "#E2DEE4"], shoe: ["#16121A", "#241E26", "#3A3036", "#524448", "#6A5A5C"],
  pink: ["#6E2A40", "#9A3E5A", "#C25C78", "#DC809A", "#EEA8BC"],
  // sonic-real: new afternoon summer clothes
  coral: ["#7A2A22", "#A8402E", "#D25E44", "#EE8462", "#FAAE8C"], straw: ["#7A5A24", "#A07A34", "#C49E50", "#DEBE72", "#F0DA9A"], lime: ["#4A6A10", "#6E9A16", "#96C620", "#BCE63A", "#DCF676"],
  sky: ["#2A5A86", "#3C78A8", "#5A98C8", "#82B8E0", "#AED4F2"], lilac: ["#4E3A6A", "#6A5290", "#8A70B2", "#AC94CE", "#CEBAE6"],
};
/** a few ready looks (the film picks from these by name) */
export const LOOKS = {
  coffee: { h: 1.78, skin: "skinA", top: "camel", coat: true, inner: "white", legs: "denim", shoe: "shoe", hair: "brown", style: "short", beard: true },
  phone1: { h: 1.66, skin: "skinB", top: "red", legs: "black", shoe: "shoe", hair: "dark", style: "bun", bag: "mustard" },
  woman2: { h: 1.70, skin: "skinC", top: "teal", skirt: "navy", legs: "skinC", shoe: "black", hair: "blond", style: "long", bag: "camel" },
  office: { h: 1.82, skin: "skinC", top: "grey", coat: true, inner: "white", tie: "red", legs: "grey", shoe: "shoe", hair: "dark", style: "short", glasses: true },
  elder: { h: 1.72, skin: "skinA", top: "green", legs: "khaki", shoe: "brown", hair: "greyH", style: "bald", cap: "khaki", glasses: true },
  student: { h: 1.76, skin: "skinD", top: "mustard", legs: "denim", shoe: "white", hair: "dark", style: "curly", backpack: "navy" },
  runner: { h: 1.68, skin: "skinC", top: "plum", legs: "black", shoe: "white", hair: "ginger", style: "pony" },
  tourist: { h: 1.80, skin: "skinB", top: "white", legs: "khaki", shoe: "brown", hair: "dark", style: "short", cap: "red", camera: true },
  lady: { h: 1.64, skin: "skinA", top: "pink", coat: true, inner: "white", legs: "skinA", skirt: "plum", shoe: "black", hair: "greyH", style: "bob", bag: "black" },
  waiter: { h: 1.75, skin: "skinB", top: "white", legs: "black", apron: "black", shoe: "shoe", hair: "dark", style: "short" },
};
const RP = (n) => RAMPS[n] || RAMPS.grey;

/** joint positions in metres (x right, y up from the feet), dir = ±1 (the side the person faces / walks) */
export function skeleton(H, p, t) {
  const d = p.dir ?? 1, ph = TAU * (p.gait ?? 0), wk = clamp01(p.walk ?? 0), sw = Math.sin(ph) * wk;
  const drop = (p.drop ?? 0) * H, hipY = 0.53 * H - 0.012 * H * Math.abs(Math.cos(ph)) * wk - drop, lean = (p.lean ?? 0) - 0.06 * (p.recoil ?? 0);
  const shY = 0.782 * H - drop, hx = 0.052 * H, sx = 0.096 * H, thigh = 0.245 * H, shin = 0.245 * H, ua = 0.17 * H, fa = 0.155 * H;
  const bodyX = (y) => lean * (y - 0.5 * H) * d * -1;                    // lean back = away from the facing side
  const legs = [-1, 1].map((side) => {
    const s = side * sw, hip = [side * hx * 0.9 + bodyX(hipY), hipY];
    const a1 = 0.42 * s, knee = [hip[0] + Math.sin(a1) * thigh * d, hip[1] - Math.cos(a1) * thigh];
    const bend = Math.max(0, -Math.sin(ph + (side > 0 ? 0 : Math.PI) + 0.9)) * 0.7 * wk, a2 = a1 - bend;
    const ank = [knee[0] + Math.sin(a2) * shin * d, knee[1] - Math.cos(a2) * shin];
    const lift = Math.max(0, Math.sin(ph + (side > 0 ? 0 : Math.PI) + 1.6)) * 0.035 * H * wk;
    if (p.legIK) { const A = p.legIK[side < 0 ? 0 : 1]; return { hip, knee: ik(hip, A, thigh, shin, d), ank: A }; }
    if (drop > 0.001) { const A = [side * hx * 1.25, 0.035 * H]; return { hip, knee: ik(hip, A, thigh, shin, d * 0.4 + side * 0.6), ank: A }; }
    return { hip, knee, ank: [ank[0], Math.max(0.035 * H, ank[1] + lift)] };
  });
  const neck = [bodyX(0.855 * H), 0.855 * H - drop], head = [bodyX(0.928 * H) + 0.006 * H * d, 0.928 * H - drop];
  const arms = [-1, 1].map((side) => {
    const sh = [side * sx + bodyX(shY), shY], swing = -side * sw * 0.45;
    let el = [sh[0] + Math.sin(swing) * ua * d + side * 0.012 * H, sh[1] - Math.cos(swing) * ua];
    let hd = [el[0] + Math.sin(swing * 1.3 + 0.15 * d * side * 0) * fa * d + side * 0.006 * H, el[1] - Math.cos(swing * 1.3) * fa * 0.98];
    const mixTo = (k, e2, h2) => { if (k <= 0) return; el = [lerp(el[0], e2[0], k), lerp(el[1], e2[1], k)]; hd = [lerp(hd[0], h2[0], k), lerp(hd[1], h2[1], k)]; };
    const front = side === d;                                              // the arm on the facing side
    mixTo(p.cup && front ? p.cup : 0, [sh[0] + 0.02 * H * d, sh[1] - 0.15 * H], [sh[0] + 0.07 * H * d - side * 0.02 * H, sh[1] - 0.07 * H]);
    mixTo(p.film ?? 0, [sh[0] + 0.09 * H * d + side * 0.012 * H, sh[1] - 0.07 * H], [0.17 * H * d + side * 0.022 * H + bodyX(shY), shY + 0.085 * H]);
    mixTo((p.recoil ?? 0) * 0.9, [sh[0] + side * 0.05 * H, sh[1] - 0.12 * H], [sh[0] + side * 0.02 * H + 0.04 * H * d, sh[1] + 0.02 * H]);
    if (front) mixTo(p.point ?? 0, [sh[0] + 0.15 * H * d, sh[1] + 0.02 * H], [sh[0] + 0.31 * H * d, sh[1] + 0.06 * H]);
    const cl = p.clap ?? 0; if (cl > 0) { const o = 0.02 * H * (0.5 + 0.5 * Math.sin(t * 18)); mixTo(cl, [sh[0] + side * 0.03 * H + 0.03 * H * d, sh[1] - 0.14 * H], [0.06 * H * d + side * o + bodyX(shY), sh[1] - 0.06 * H]); }
    if (p.hands) { const T2 = p.hands[side < 0 ? 0 : 1]; hd = [T2[0], T2[1]]; el = ik(sh, hd, ua, fa, side); }
    if (p.hips && !front) mixTo(p.hips, [sh[0] + side * 0.1 * H, sh[1] - 0.14 * H], [side * 0.11 * H + bodyX(hipY), hipY + 0.04 * H]);
    return { sh, el, hd, front };
  });
  return { legs, arms, neck, head, hipY, shY, d, bodyX, drop };
}
/** two-bone IK: the middle joint for root A, end B, lengths l1, l2; bend = which side (x sign) the joint goes */
export function ik(A, B, l1, l2, bend) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.min(l1 + l2 - 1e-4, Math.hypot(dx, dy)), a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const mx = A[0] + ux * a, my = A[1] + uy * a, nx = -uy, ny = ux, sg = Math.sign(nx * bend || 1) || 1; return [mx + nx * h * sg, my + ny * h * sg];
}

/** draw at feet (fx, fy) with s px per metre. Returns { box, head, hand, phone } */
export function drawPerson(c, fx, fy, s, t, look, p = {}, o = {}) {
  const H = look.h ?? 1.75, d = p.dir ?? 1, k = skeleton(H, p, t), S = (pt) => [fx + pt[0] * s, fy - pt[1] * s];
  const W = H * 0.9 * s, sp = new Spr(fx - W, fy - H * 1.12 * s - 4, 2 * W, H * 1.15 * s + 8);
  const skin = RP(look.skin), top = RP(look.top), legs = RP(look.legs), shoe = RP(look.shoe), hair = RP(look.hair), inner = RP(look.inner || look.top);
  const r = (m) => Math.max(0.8, m * s * (look.bulk ?? 1));
  // back arm (the one away from the facing side is behind the body)
  const back = k.arms.find((a) => !a.front), frontA = k.arms.find((a) => a.front);
  const arm = (a, g, bias) => { const [s0, e, h] = [S(a.sh), S(a.el), S(a.hd)]; sp.cap(...s0, ...e, r(0.04 * H), r(0.032 * H), look.coat ? top : (look.sleeve ? RP(look.sleeve) : top), g, { bias }); sp.cap(...e, ...h, r(0.031 * H), r(0.026 * H), look.coat || look.long ? top : skin, g, { bias }); sp.ell(...h, r(0.025 * H), r(0.029 * H), skin, g + 1, { bias }); };
  arm(back, 16, -0.15);
  if (look.backpack) { const [bx, by] = S([k.bodyX(0.7 * H) - 0.09 * H * d, 0.7 * H]); sp.ell(bx, by, r(0.09 * H), r(0.13 * H), RP(look.backpack), 20, { bias: -0.1 }); }
  // legs: trousers or bare legs under a skirt, shoes
  for (const [i, L] of k.legs.entries()) { const [h, kn, an] = [S(L.hip), S(L.knee), S(L.ank)], g = 32 + i * 16;
    sp.cap(...h, ...kn, r(0.058 * H), r(0.044 * H), look.shorts ? RP(look.shorts) : legs, g, { bias: i ? 0 : -0.1 }); sp.cap(...kn, ...an, r(0.044 * H), r(0.032 * H), look.shorts ? skin : legs, g, { bias: i ? 0 : -0.1 });
    const [ax, ay] = an; sp.ell(ax + 0.025 * H * s * d, ay - 0.012 * H * s, r(0.06 * H), r(0.03 * H), shoe, g + 2); }
  // torso: a shirt / coat trapezoid, shoulders rounded
  const coatLen = look.coat ? 0.13 * H : 0.015 * H, bk = look.bulk ?? 1, bx = (y) => k.bodyX(y), T = (u, y) => [fx + (bx(y) + u * bk) * s, fy - (y - k.drop) * s];
  const torso = [T(-0.045 * H, 0.858 * H), T(0.045 * H, 0.858 * H), T(0.108 * H, 0.818 * H), T(0.118 * H, 0.775 * H), T(0.1 * H, 0.70 * H), T(0.086 * H, 0.61 * H), T(0.1 * H + coatLen * 0.25, 0.53 * H - coatLen), T(-0.1 * H - coatLen * 0.25, 0.53 * H - coatLen), T(-0.086 * H, 0.61 * H), T(-0.1 * H, 0.70 * H), T(-0.118 * H, 0.775 * H), T(-0.108 * H, 0.818 * H)];
  const [lsx, lsy] = T(-0.108 * H, 0.818 * H), [rsx, rsy] = T(0.108 * H, 0.818 * H), [lhx, lhy] = T(-0.085 * H, 0.53 * H), [rhx, rhy] = T(0.085 * H, 0.53 * H);
  if (look.skirt) { const sk = RP(look.skirt); sp.poly([[lhx - r(0.065 * H), lhy - r(0.01 * H)], [rhx + r(0.065 * H), rhy - r(0.01 * H)], [rhx + r(0.11 * H), rhy + 0.2 * H * s], [lhx - r(0.11 * H), lhy + 0.2 * H * s]], sk, 64); }
  sp.poly(torso, top, 80);
  { const [bx0, by0] = T(-0.09 * H, 0.545 * H), [bx1] = T(0.09 * H, 0.545 * H); if (!look.coat && !look.apron) for (let x = Math.round(bx0); x < Math.round(bx1); x++) sp.px(x, by0, top[0]); }
  { const [cx0, cy0] = T(0, 0.858 * H), cw = Math.max(1, R(0.03 * H * s)); for (let x = -cw; x <= cw; x++) sp.px(cx0 + x, cy0 + Math.abs(x) * 0.5, (look.coat ? inner : top)[look.coat ? 3 : 1]); }
  if (look.coat) { const mx = (lsx + rsx) / 2 + 0.01 * H * s * d; sp.poly([[mx - r(0.035 * H), lsy - 1], [mx + r(0.035 * H), lsy - 1], [mx + r(0.012 * H), lsy + 0.2 * H * s], [mx - r(0.012 * H), lsy + 0.2 * H * s]], inner, 81, { flat: 0.6 });
    if (look.tie) sp.poly([[mx - 1, lsy + 1], [mx + 1, lsy + 1], [mx + 1.5, lsy + 0.16 * H * s], [mx - 1.5, lsy + 0.16 * H * s]], RP(look.tie), 82, { flat: 0.5 }); }
  if (look.apron) sp.poly([[lhx - r(0.05 * H), lhy - 0.08 * H * s], [rhx + r(0.05 * H), rhy - 0.08 * H * s], [rhx + r(0.07 * H), rhy + 0.22 * H * s], [lhx - r(0.07 * H), lhy + 0.22 * H * s]], RP(look.apron), 83, { flat: 0.4 });
  if (look.bag) { const side = -d, [bx, by] = S([side * 0.16 * H + k.bodyX(0.5 * H), 0.5 * H]); sp.poly([[bx - r(0.06 * H), by - r(0.05 * H)], [bx + r(0.06 * H), by - r(0.05 * H)], [bx + r(0.065 * H), by + r(0.06 * H)], [bx - r(0.065 * H), by + r(0.06 * H)]], RP(look.bag), 96);
    const [sx2, sy2] = S(k.arms[side > 0 ? 1 : 0].sh); for (let q = 0; q <= 10; q++) sp.px(lerp(sx2 - side * 2, bx, q / 10), lerp(sy2, by - r(0.05 * H), q / 10), RP(look.bag)[0], 97); }
  // neck + head
  const [nx, ny] = S(k.neck), [hx, hy] = S(k.head), hr = 0.067 * H * s * (look.head ?? 1), fo = d * 0.45 + Math.max(-1, Math.min(1, p.turn ?? 0)) * 0.4, fd = fo >= 0 ? 1 : -1, ft = Math.abs(fo);
  sp.cap(nx, ny + 1, nx, ny - r(0.04 * H), r(0.028 * H), r(0.028 * H), skin, 112, { bias: -0.15 });
  sp.ell(hx, hy, hr * 0.86, hr, skin, 113);
  sp.ell(hx + fo * hr * 0.95, hy + hr * 0.12, Math.max(0.8, hr * 0.14), Math.max(0.8, hr * 0.12), skin, 113);   // nose bump
  // hair / cap
  const H_ = hair, hs = look.style;
  const top0 = (fn) => sp.ell(hx - fd * hr * 0.08, hy - hr * 0.25, hr * 0.92, hr * 0.8, H_, 128, { clip: fn });
  if (hs === "short") top0((x, y) => y < hy - hr * 0.2 || (x - hx) * fd < -hr * 0.35);
  else if (hs === "curly") sp.ell(hx - fd * hr * 0.05, hy - hr * 0.3, hr * 1.02, hr * 0.85, H_, 128, { clip: (x, y) => y < hy - hr * 0.05 || (x - hx) * fd < -hr * 0.3 });
  else if (hs === "bun") { top0((x, y) => y < hy - hr * 0.25 || (x - hx) * fd < -hr * 0.4); sp.ell(hx - fd * hr * 0.6, hy - hr * 0.95, hr * 0.38, hr * 0.34, H_, 129); }
  else if (hs === "long" || hs === "bob") { const len = hs === "long" ? 1.5 : 0.75; sp.ell(hx - fd * hr * 0.35, hy + hr * (len - 1) * 0.5, hr * 0.85, hr * (0.9 + len * 0.45), H_, 127, { clip: (x, y) => (x - hx) * fd < hr * 0.25 }); top0((x, y) => y < hy - hr * 0.3); }
  else if (hs === "pony") { top0((x, y) => y < hy - hr * 0.25 || (x - hx) * fd < -hr * 0.4); sp.cap(hx - fd * hr * 0.8, hy - hr * 0.3, hx - fd * hr * 1.25, hy + hr * 0.9 + Math.sin(t * 9) * (p.walk ?? 0) * 1.5, hr * 0.28, hr * 0.18, H_, 129); }
  else if (hs === "bald") sp.ell(hx - fd * hr * 0.3, hy + hr * 0.05, hr * 0.62, hr * 0.42, H_, 128, { clip: (x, y) => (x - hx) * fd < -hr * 0.25 });
  if (look.cap) { const cp = RP(look.cap); sp.ell(hx, hy - hr * 0.42, hr * 0.92, hr * 0.62, cp, 130, { clip: (x, y) => y < hy - hr * 0.35 }); sp.cap(hx, hy - hr * 0.38, hx + fd * hr * 1.25, hy - hr * 0.3, hr * 0.14, hr * 0.12, cp, 131); }
  // face: eyes, brows, mouth (at sizes where they read)
  const ex = hx + fd * hr * (0.18 + 0.32 * ft), ey = hy - hr * 0.02;
  if (hr >= 9) { // close-up face (mario-real): oval eyes with a highlight, brows, nose shade, a mouth line
    const ed = hr * 0.34, blink = ((t + (look.h * 7) % 3) % 3.4) < 0.12 ? Math.sin(Math.PI * ((t + (look.h * 7) % 3) % 3.4) / 0.12) : 0, er = Math.max(1.2, hr * 0.1);
    for (const q of [-1, 1]) { if (q === -fd && ft > 0.85) continue; const x = ex + q * ed * (q === fd ? 1 : 0.72), y = ey, sq2 = q === fd ? 1 : 0.8;
      sp.ell(x, y, er * sq2, er * 1.35 * (1 - 0.85 * blink), ["#1A1218", "#2A1E24"], 114);
      if (er > 2 && blink < 0.5) sp.px(x - fd, y - er * 0.5, "#FFFFFF", 114);
      sp.cap(x - er * 1.2, y - er * 2.4 - (p.mouth ?? 0) * er * 0.6, x + er * 1.2, y - er * 2.6 - (p.mouth ?? 0) * er * 0.6, Math.max(0.8, er * 0.35), Math.max(0.8, er * 0.35), H_.slice(0, 2), 115); }
    if (look.glasses) for (const q of [-1, 1]) { const x = ex + q * ed * (q === fd ? 1 : 0.72); for (let a = 0; a < 24; a++) { const an = (a / 24) * Math.PI * 2; sp.px(x + Math.cos(an) * er * 2.1, ey + Math.sin(an) * er * 1.9, "#2A2A30", 116); } }
    const mo = p.mouth ?? 0, my = hy + hr * 0.5, mx = ex + fd * hr * 0.12;
    if (mo > 0.25) sp.ell(mx, my, hr * 0.12 * mo + 1, hr * 0.14 * mo + 1, ["#3A1018", "#6A2028"], 117); else sp.cap(mx - hr * 0.16, my, mx + hr * 0.16, my - hr * 0.03 * (look.smile ?? 0), Math.max(0.7, hr * 0.03), Math.max(0.7, hr * 0.03), [skin[0], skin[1]], 117);
    if (look.beard) sp.ell(hx + fd * hr * 0.2, hy + hr * 0.55, hr * 0.62, hr * 0.42, H_, 132, { clip: (x, y) => y > hy + hr * 0.25 && (x - hx) * fd > -hr * 0.5 && !(Math.abs(y - my) < hr * 0.06 && Math.abs(x - mx) < hr * 0.18) });
  } else if (hr >= 3) { const ed = Math.max(1, R(hr * 0.34)), blink = ((t + (look.h * 7) % 3) % 3.4) < 0.1;
    for (const q of [-1, 1]) { const x = ex + q * ed * (q === fd ? 1 : 0.7) - (q === fd ? 0 : 0) , y = ey; if (q === -fd && ft > 0.85) continue; sp.px(x, y, blink ? skin[1] : "#1A1218"); if (hr >= 6 && !blink) sp.px(x, y - 1, "#1A1218"); if (hr >= 7) sp.px(x, y - R(hr * 0.3), H_[1]); }
    if (look.glasses && hr >= 3) for (const q of [-1, 1]) { const x = ex + q * ed; sp.px(x - 1, ey, "#2A2A30"); sp.px(x + 1, ey, "#2A2A30"); sp.px(x, ey - 1, "#2A2A30"); sp.px(x, ey + 1, "#2A2A30"); }
    const mo = p.mouth ?? 0, my = hy + hr * 0.45, mx = ex + fd * hr * 0.1;
    if (hr >= 4) { if (mo > 0.3) { sp.px(mx, my, "#5A2028"); sp.px(mx, my + 1, "#5A2028"); if (hr >= 6) sp.px(mx + 1, my, "#5A2028"); } else sp.px(mx, my, skin[1]); }
    if (look.beard) sp.ell(hx + fd * hr * 0.2, hy + hr * 0.55, hr * 0.62, hr * 0.42, H_, 132, { clip: (x, y) => y > hy + hr * 0.25 && (x - hx) * fd > -hr * 0.5 });
  }
  // front arm last (over the body); props in the hand
  arm(frontA, 144, 0.05);
  const [fhx, fhy] = S(frontA.hd), [bhx, bhy] = S(back.hd);
  let phone = null;
  if ((p.film ?? 0) > 0.02) { const px = (fhx + bhx) / 2 + d * r(0.01 * H), py = (fhy + bhy) / 2 - r(0.02 * H), w = Math.max(1.5, 0.026 * H * s), h = Math.max(2.5, 0.042 * H * s);
    sp.poly([[px - w, py - h], [px + w, py - h], [px + w, py + h * 0.6], [px - w, py + h * 0.6]], "#1E1A26", 160); if (w >= 2) sp.px(px - w + 1, py - h + 1, (() => { const k = 0.5 + 0.5 * Math.sin(t * 5); return [Math.round(58 + 197 * k), Math.round(42 + 32 * k), Math.round(48 + 26 * k)]; })(), 161); if (w >= 3) sp.px(px + w - 2, py - h + 1, "#8A90A8", 161);
    phone = [px, py]; }
  if ((p.cupHold ?? 0) > 0.02) { const cx2 = fhx + d * 1, cy2 = fhy - r(0.03 * H), w = Math.max(1.5, 0.028 * H * s), h = Math.max(3, 0.075 * H * s);
    sp.poly([[cx2 - w, cy2 - h * 0.6], [cx2 + w, cy2 - h * 0.6], [cx2 + w * 0.8, cy2 + h * 0.4], [cx2 - w * 0.8, cy2 + h * 0.4]], ["#B8B0A8", "#D8D0C8", "#F2ECE4", "#FFFFFF"], 162); if (h > 5) sp.poly([[cx2 - w, cy2 - h * 0.65], [cx2 + w, cy2 - h * 0.65], [cx2 + w, cy2 - h * 0.45], [cx2 - w, cy2 - h * 0.45]], "#6A4228", 163); if (h > 6) sp.poly([[cx2 - w * 0.95, cy2 - h * 0.1], [cx2 + w * 0.95, cy2 - h * 0.1], [cx2 + w * 0.9, cy2 + h * 0.15], [cx2 - w * 0.9, cy2 + h * 0.15]], "#A86A3A", 163); }
  if (look.camera && (p.film ?? 0) < 0.5) { const [cx2, cy2] = S([k.bodyX(0.62 * H) + 0.02 * H * d, 0.66 * H]); sp.poly([[cx2 - r(0.05 * H), cy2 - r(0.03 * H)], [cx2 + r(0.05 * H), cy2 - r(0.03 * H)], [cx2 + r(0.05 * H), cy2 + r(0.035 * H)], [cx2 - r(0.05 * H), cy2 + r(0.035 * H)]], RAMPS.black, 164); }
  sp.blit(c, o.a ?? 1, { clipY: o.clipY, noLine: new Set([113, 112, 114, 115, 116, 117]) });
  return { box: { x0: fx - W / 2, y0: fy - H * s, x1: fx + W / 2, y1: fy }, head: [hx, hy - hr], hand: [fhx, fhy], phone, top: [hx, hy - hr * 1.1] };
}

export default {
  kind: "passerby", covers: ["person", "adult", "passer-by", "pedestrian", "onlooker"], source: "steve-real/film2 (new)",
  desc: "an adult city passer-by in 3/4 view with real proportions; walks, films with a phone, holds a coffee, recoils, points, claps",
  hw: 22, hh: 45, start: "stands, breathes, blinks",
  states: {
    idle: [0.4, "stands, breathes, blinks"], walk: [0.4, "walks (gait phase from the film)", "tick"], film: [0.5, "raises a phone at arm's length, recording", "blip"],
    cup: [0.4, "holds a coffee cup at the chest"], recoil: [0.3, "leans back, hands up", "gasp"], point: [0.4, "points at something"], clap: [0.3, "claps", "clap"], look: [0.4, "turns the head"],
  },
  base: { walk: 0, film: 0, cup: 0, cupHold: 0, recoil: 0, point: 0, clap: 0, turn: 0, mouth: 0, lean: 0 },
  st: { idle: { walk: 0, film: 0, recoil: 0, point: 0, clap: 0, mouth: 0 }, walk: { walk: 1, film: 0, recoil: 0 }, film: { film: 1, walk: 0, cup: 0 }, cup: { cup: 1, cupHold: 1 }, recoil: { recoil: 1, mouth: 1, film: 0 }, point: { point: 1 }, clap: { clap: 1, mouth: 1 }, look: { turn: 1 } },
  linear: [],
  notes: "s.look = a LOOKS entry or a custom look; s.dir ±1; s.gait (cycles). 50 px per metre at z 1 (1.8 m = 90 px).",
  draw(c, cx, cy, z, t, s) {
    const look = typeof s.look === "string" ? LOOKS[s.look] : s.look || LOOKS.coffee, feet = cy + this.hh * z;
    return drawPerson(c, cx, feet, 50 * z, t, look, { ...s.v, dir: s.dir ?? 1, gait: s.gait ?? 0 }, { a: s.a, clipY: s.clipY });
  },
};
