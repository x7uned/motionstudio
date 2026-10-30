// The series' border collie (the same dog as the first film's yard level, work/pixel-lab/animals/film/levels/yard.mjs),
// sitting and facing the camera: black coat with a white blaze, bib and paws, semi-perked ears with folded tips, big
// brown glossy eyes, blush, a pink tongue, a red collar. Adapted for the park: no toy pile; the collar has a leash ring
// and drawDog returns its screen position. (x, y) = head centre; the ground is at y + 248.
import { blob, ell, tube, bez, eye, smooth, blush, smile, nose, shadow, RAMP, mix, lerp } from "../cute.mjs";
import { xform } from "./park-kit.mjs";

const R = Math.round;
const DOG_EYE = ["#1A0C04", "#3A1E0A", "#6A3A14", "#9A5A20", "#C8842E", "#E8A84A", "#F8CC7A"];
const BLK = ["#07060C", "#0E0C18", "#181528", "#24203C", "#302B50", "#3E3866", "#4E4880", "#6A64A0"];
const WHT = RAMP.white, LIT = "#5A5490", EDGE = "#3A3A50";
const EAR_IN = ["#2A1420", "#4A2434", "#6A3448", "#8A4A60", "#A8667A", "#C48496", "#DCA4B4", "#F0C8D4"];
export const COLLAR = ["#3A0A10", "#6A1218", "#A01E22", "#D0342E", "#EC5A44", "#F8866A", "#FCB49C", "#FFE0D4"];
const mir = (pts, s, ox, oy) => pts.map(([px, py]) => [ox + px * s, oy + py]);

/**
 * Border collie sitting, facing the camera. o: look [x, y], blink, open (mouth 0..1), wag (tail speed factor),
 * earPerk 0..1, tilt (head tilt, radians), shade (contact shadow colour). Returns { ring: [x, y] } (collar leash ring).
 */
export function drawDog(c, x, y, t, o = {}) {
  const wag = o.wag ?? 1, br = Math.sin(t * 2 * Math.PI * 0.55), B = y + 248, K = 1.18, tilt = o.tilt ?? 0;
  shadow(c, x, B, 112, 9, o.shade ?? "#0E2A12", 0.5);
  // tail (behind), wagging: curls up on the right with a white tip
  const ta = Math.sin(t * 2 * Math.PI * 2.0 * wag) * 0.38 * Math.min(1.4, wag), tb = [x + 80, B - 16], tm = [x + 122 + Math.cos(ta) * 3, B - 34 + Math.sin(ta) * 6], tt = [x + 114 + Math.sin(ta) * 22, B - 88 + Math.cos(ta) * 4];
  const tail = bez(tb, tm, tt, 14);
  blob(c, [tube(tail, 14, 11)], { ramp: BLK, thick: 7, litOutline: LIT }); blob(c, [tube(tail.slice(9), 12, 11)], { ramp: WHT, thick: 5, base: 4.2, outline: EDGE });
  // body: plump pear with round haunches (black), white bib with a fluffy hem, short chubby legs, big round paws
  blob(c, [ell(x - 70, B - 44, 46, 46), ell(x + 70, B - 44, 46, 46)], { ramp: BLK, thick: 20, base: 2.6, gain: 2.2, litOutline: LIT });
  const bodyPts = mir([[-30, -206], [-58, -164], [-82, -104], [-96, -48], [-88, -4], [0, 2]], 1, x, B).concat(mir([[88, -4], [96, -48], [82, -104], [58, -164], [30, -206]], 1, x, B));
  blob(c, [smooth(bodyPts, new Set(), 4)], { ramp: BLK, thick: 34, base: 2.5, gain: 2.4, litOutline: LIT });
  const hem = []; for (let i = 0; i <= 8; i++) hem.push([x + 46 - i * 11.5, B - 82 + (i % 2 ? 9 : 0) - Math.abs(i - 4) * 2]);
  blob(c, [smooth([[x - 28, B - 212 + br], [x, B - 220 + br], [x + 28, B - 212 + br], [x + 50, B - 164], [x + 54, B - 116], ...hem, [x - 54, B - 116], [x - 50, B - 164]], new Set([5, 6, 7, 8, 9, 10, 11, 12, 13]), 4)], { ramp: WHT, thick: 24, base: 4.4, gain: 2.0, outline: EDGE });
  for (const s of [-1, 1]) {
    blob(c, [tube([[x + s * 26, B - 96], [x + s * 27, B - 12]], 18, 17)], { ramp: WHT, thick: 10, base: 4.2, outline: EDGE });
    blob(c, [ell(x + s * 28, B - 7, 22, 12)], { ramp: WHT, thick: 7, base: 4.6, outline: EDGE });
    for (const dx of [-7, 1, 9]) c.line(R(x + s * 28 + dx * s - 1), R(B - 11), R(x + s * 28 + dx * s - 1), R(B - 5), "#8A8AA0");
  }
  // collar with a brass tag and a leash ring
  const hx = x, hy = y + br, nb = [x, B - 200], cp = [nb[0], nb[1] + 16 + br * 0.5];
  blob(c, [ell(cp[0], cp[1], 34, 7)], { ramp: COLLAR, thick: 4, base: 3.5, outline: "#3A0A10" });
  c.rect(R(cp[0]) - 2, R(cp[1] + 5), 5, 5, "#C8962E"); c.px(R(cp[0]) - 1, R(cp[1] + 6), "#FDE68A");
  const ring = [cp[0] + 20, cp[1] + 6];
  c.ring(R(ring[0]), R(ring[1]), 3, "#7A5A1A"); c.px(R(ring[0]) - 2, R(ring[1]) - 2, "#FDE68A");
  // head
  const P = (dx, dy) => { dx *= K; dy *= K; const cs = Math.cos(tilt), sn = Math.sin(tilt); return [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs]; };
  const H = (pts) => pts.map(([dx, dy]) => P(dx, dy));
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 1.7 + s) * 0.06 + (o.earPerk ?? 0) * 0.08, rot = (p) => xform(p, ...P(s * 34, -28), sw * s);
    blob(c, [rot(H(mir([[-50, -14], [-58, -62], [-34, -72], [-16, -38]], s * -1, 0, 0)))], { ramp: BLK, thick: 9, base: 2.9, litOutline: LIT });
    blob(c, [rot(H(mir([[-45, -24], [-51, -58], [-37, -64], [-25, -40]], s * -1, 0, 0)))], { ramp: EAR_IN, thick: 5, base: 3.0, outline: "#14101C" });
    const drop = Math.sin(t * 2.4 + s * 1.3) * 1.5;
    blob(c, [rot(H(mir([[-59, -62], [-33, -73], [-62, -44 + drop]], s * -1, 0, 0)))], { ramp: BLK, thick: 5, base: 3.6, litOutline: "#7A74B0" });
  }
  const cheek = (s) => H(mir([[-30, 2], [-50, 4], [-62, 16], [-56, 22], [-64, 30], [-50, 38], [-30, 40]], s * -1, 0, 0));
  blob(c, [H(ell(0, -4, 52, 44)), cheek(-1), cheek(1)], { ramp: BLK, thick: 26, base: 2.7, gain: 2.3, litOutline: LIT });
  blob(c, [H([[-4, -47], [4, -47], [9, -22], [20, -2], [34, 18], [36, 32], [22, 44], [0, 48], [-22, 44], [-36, 32], [-34, 18], [-20, -2], [-9, -22]])], { ramp: WHT, thick: 16, base: 4.5, gain: 1.6, outline: "#2A2A40", litOutline: "#9494AE" });
  blob(c, [H(ell(0, 25, 24, 15))], { ramp: WHT, thick: 10, base: 4.9, gain: 1.4, outline: "#5A5A74" });
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const s of [-1, 1]) { const [ex, ey] = P(s * 22, -7); eye(c, ex, ey, 15, { ry: 16, iris: DOG_EYE, pupil: "round", look, blink, lid: BLK[3] }); }
  { const [a1, b1] = P(-38, 14), [a2, b2] = P(38, 14); blush(c, a1, b1, 9, 4, "#F27A9A"); blush(c, a2, b2, 9, 4, "#F27A9A"); }
  const [nx, ny] = P(0, 11); nose(c, nx, ny, 10, "#1A1420");
  const [mx, my] = P(0, 25), open = o.open ?? 0.7;
  smile(c, mx, my, 9, { open, tongue: "#F07090" });
  if (open > 0.5) { const pant = Math.sin(t * 2 * Math.PI * 1.6) * 1.2; blob(c, [H(ell(0, 38 + pant, 6, 6.5))], { ramp: RAMP.pink, thick: 4, base: 4.4, outline: "#6A1A34" }); const [lx, ly] = P(0, 35 + pant); c.line(R(lx), R(ly), R(lx), R(ly + 4), "#C84468"); }
  return { ring };
}

/** Tiny pixel-sprite animals and people for the balance pans (≈ 12 × 11 px each, front view, chibi). */
const SPRITES = {
  dog: ["OO........OO", "ODO......ODO", "ODDOOOOOODDO", "OBBBBBBBBBBO", "OBEBBBBBBEBO", "OBBBLLLLBBBO", ".OBBLNNLBBO.", "..OBLLPLBO..", ".OBBBLLBBBO.", "OBBBBBBBBBBO", ".OOOOOOOOOO."],
  pup: ["..........", "OOO....OOO", "ODDOOOODDO", "OBBBBBBBBO", "OBEBBBBEBO", "OBBLLLLBBO", ".OBLNNLBO.", "..OLLLLO..", ".OBBBBBBO.", "OBBBBBBBBO", ".OOOOOOOO."],
  bear: [".OO......OO.", "OBDO....ODBO", "OBBOOOOOOBBO", ".OBBBBBBBBO.", "OBEBBBBBBEBO", "OBBBLLLLBBBO", "OBBLLNNLLBBO", ".OBBLLLLBBO.", "OBBBBBBBBBBO", "OBBBBBBBBBBO", ".OOOOOOOOOO."],
  wolf: ["O..........O", "OO........OO", "ODO......ODO", "ODDOOOOOODDO", "OBBBBBBBBBBO", "OBEBBBBBBEBO", "OLBBBBBBBBLO", ".OLLLNNLLLO.", "..OLLLLLLO..", ".OBBBLLBBBO.", "OBBBBBBBBBBO", ".OOOOOOOOOO."],
  deer: ["A..A......A..A", ".AA........AA.", "..A..OOOO..A..", "OOO.OBBBBO.OOO", "ODBOBBBBBBOBDO", ".OOBEBBBBEBOO.", "...OBBBBBBO...", "...OBLLLLBO...", "....OLNNLO....", "...OBBLLBBO...", "..OBBBBBBBBO..", "..OOOOOOOOOO.."],
  rabbit: ["..OO..OO..", ".OLPOOPLO.", ".OLPOOPLO.", ".OLPOOPLO.", "OBBBBBBBBO", "OBEBBBBEBO", "OBBBNNBBBO", ".OBLLLLBO.", "OBBBBBBBBO", ".OOOOOOOO."],
  fox: ["O..........O", "OO........OO", "ODO......ODO", "OBBOOOOOOBBO", "OBBBBBBBBBBO", "OBEBBBBBBEBO", "OLLBBBBBBLLO", ".OLLLNNLLLO.", "..OOLLLLOO..", ".OBBBLLBBBO.", "OBBBBBBBBBBO", ".OOOOOOOOOO."],
  boar: ["OO........OO", "ODOOOOOOOODO", "OBBBBBBBBBBO", "OBEBBBBBBEBO", "OBBBBBBBBBBO", "OLBOSSSSOBLO", ".OBSNSSNSBO.", "..OOSSSSOO..", ".OBBBBBBBBO.", "OBBBBBBBBBBO", ".OOOOOOOOOO."],
  person: ["..OOOOOO..", ".OHHHHHHO.", "OHHHHHHHHO", "OHSSSSSSHO", "OSESSSSESO", "OSSSSSSSSO", ".OSSPPSSO.", "..OOOOOO..", ".OCCCCCCO.", "OCCCCCCCCO", "OCCCCCCCCO", ".OOOOOOOO."],
  hero: ["...OOOO...", "..OHHHHO..", ".OHHHHHHO.", "OHHHHHHHHO", "OKKKKKKKKO", "OSESSSSESO", "OSSSSSSSSO", ".OLLLLLLO.", "..OOOOOO..", ".OCCCCCCO.", "OCCCCCCCCO", ".OOOOOOOO."],
};
const SPR_PAL = {
  dog: [{ B: "#B07A3E", D: "#6A421E", L: "#FBF4E4" }, { B: "#2A2438", D: "#141020", L: "#F4F0F8" }, { B: "#E8B860", D: "#B07A2A", L: "#FFF4D8" }, { B: "#F4F0EA", D: "#C89A6A", L: "#FFFFFF" }, { B: "#8A8A98", D: "#4A4A58", L: "#ECECF4" }],
  bear: [{ B: "#7A4A26", D: "#4A2A14", L: "#C89A6A" }], wolf: [{ B: "#7E8494", D: "#4A5060", L: "#E8ECF4" }], deer: [{ B: "#B47040", D: "#7A4422", L: "#F4E2C8", A: "#E8D2A6" }],
  rabbit: [{ B: "#C8B8A8", D: "#8A7A6A", L: "#FFFFFF", P: "#F4A0B0" }], fox: [{ B: "#E8742A", D: "#2A1A14", L: "#FFF4E8" }], boar: [{ B: "#5A4034", D: "#2E1E18", L: "#F4ECDC", S: "#C8908A" }],
  person: [{ H: "#4A2A1A", S: "#F3CBAA", C: "#3A6AB0" }, { H: "#1A1420", S: "#CF8A6A", C: "#E05A44" }, { H: "#E8C060", S: "#FBE5CC", C: "#4A9A5A" }, { H: "#2A1A14", S: "#83443C", C: "#F4CA50" }, { H: "#8A4A24", S: "#E6AD8A", C: "#8D59DA" }, { H: "#C8C8D0", S: "#F3CBAA", C: "#6A8CC0" }],
  hero: [{ H: "#8D59DA", K: "#B08AE8", S: "#F3CBAA", L: "#A9C4FF", C: "#E0565A" }],
};
/** Draw one tiny sprite with its bottom-centre at (x, y). kind: key of SPRITES; v: palette variant. g: canvas or fade view. */
export function tiny(g, kind, v, x, y) {
  const rows = SPRITES[kind], P = SPR_PAL[kind] ?? SPR_PAL.dog, pal = P[v % P.length], w = rows[0].length, h = rows.length, x0 = R(x - w / 2), y0 = R(y - h);
  const map = { O: "#1A1220", E: "#140C10", N: "#140C10", P: pal.P ?? "#F07090", ...pal };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch === ".") continue; const col = map[ch]; if (col) g.px(x0 + i, y0 + j, col); }
  if (kind !== "rabbit") { const ey = rows.findIndex((r) => r.includes("E")); if (ey >= 0) { const r = rows[ey]; for (let i = 0; i < w; i++) if (r[i] === "E") g.px(x0 + i, y0 + ey - 1, "#140C10"); } }
  return { w, h };
}
export const TINY_W = (kind) => SPRITES[kind][0].length;
