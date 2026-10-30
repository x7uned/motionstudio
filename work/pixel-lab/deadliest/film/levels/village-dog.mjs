// The LV6 village dog: a scruffy brown mutt sitting and facing the camera — warm brown coat, cream muzzle, chest and
// socks, cream "eyebrow" spots that carry its expressions, one ear up with a folded tip and one floppy ear, a fluffy
// tuft on the head, big glossy brown eyes, blush, a red polka-dot bandana. Built on the series' border collie geometry
// (work/pixel-lab/animals-weight/film/levels/park-dog.mjs, copied and re-styled here; that file is not imported).
// drawDog(c, x, y, t, o): (x, y) = head centre; the ground is at y + 248·k. dogHead(...) draws only the head (ICON).
import { blob, ell, tube, bez, eye, blush, smile, nose, shadow, fade, mix, lerp, clamp01, RAMP } from "../cute.mjs";
import { smooth } from "../cute.mjs";

const R = Math.round;
export const COAT = ["#140A0C", "#2A1414", "#45201C", "#623022", "#80442C", "#9C5A36", "#B87444", "#D29458"];
const EARC = ["#100608", "#20100E", "#381A16", "#52261C", "#6C3424", "#86462E", "#A05C3A", "#BC784A"];
export const CREAM = ["#2A1820", "#4C3036", "#74504E", "#A07A6E", "#C8A08A", "#E2C0A2", "#F2DABC", "#FCEEDA"];
const EAR_IN = ["#2A1420", "#4A2434", "#6A3448", "#8A4A60", "#A8667A", "#C48496", "#DCA4B4", "#F0C8D4"];
const RED = ["#3A0A10", "#6A1218", "#A01E22", "#D0342E", "#EC5A44", "#F8866A", "#FCB49C", "#FFE0D4"];
const DOG_EYE = ["#1A0C04", "#3A1E0A", "#6A3A14", "#9A5A20", "#C8842E", "#E8A84A", "#F8CC7A"];
const OUT = "#140A0C", LIT = "#F4A878", LITC = "#FFE6C8";
const mir = (pts, s) => pts.map(([px, py]) => [px * s, py]);
const rot = (poly, ox, oy, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return poly.map(([x, y]) => [ox + (x - ox) * c - (y - oy) * s, oy + (x - ox) * s + (y - oy) * c]); };

/**
 * Head only (used by the body and by the ICON). k = scale (1 at full size), o: look, blink, open (mouth 0..1), grin 0..1
 * (cheeky teeth grin), worry 0..1 (brows up, ears droop, small mouth), happy 0..1 (closed happy eyes, big smile),
 * tilt (radians), earPerk 0..1, a (dissolve). Returns the mouth point.
 */
export function dogHead(c, hx, hy, t, o = {}, k = 1) {
  const a = o.a ?? 1, K = 1.18 * k, tilt = o.tilt ?? 0, worry = clamp01(o.worry ?? 0), happy = clamp01(o.happy ?? 0), grin = clamp01(o.grin ?? 0);
  const P = (dx, dy) => { dx *= K; dy *= K; const cs = Math.cos(tilt), sn = Math.sin(tilt); return [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs]; };
  const H = (pts) => pts.map(([dx, dy]) => P(dx, dy));
  const look = o.look ?? [0, 0], PF = (dx, dy, f = 1) => P(dx + look[0] * 5 * f, dy + look[1] * 4 * f);   // face features follow the look
  const BO = { outline: OUT, litOutline: LIT, a };
  const perk = (o.earPerk ?? 0) - worry * 0.9;
  // ears behind the head: left (viewer's) ear stands up with a folded tip; right ear flops down beside the cheek
  {
    const sw = Math.sin(t * 1.7) * 0.05 + perk * 0.1, piv = P(-36, -30), r = (p) => rot(p, piv[0], piv[1], -sw);
    blob(c, [r(H(smooth([[-16, -36], [-30, -60], [-44, -80], [-58, -64], [-62, -34], [-52, -12]], new Set(), 4)))], { ...BO, ramp: EARC, thick: 10 * k, base: 3.0, gain: 2.0 });
    blob(c, [r(H(smooth([[-26, -38], [-36, -58], [-45, -68], [-53, -58], [-54, -36], [-46, -24]], new Set(), 4)))], { ...BO, ramp: EAR_IN, thick: 5 * k, base: 3.2, outline: "#1C0E14", litOutline: null });
    // the folded tip flops forward over the top
    const drop = Math.sin(t * 2.4 + 1.3) * 1.5;
    blob(c, [r(H(smooth([[-34, -66], [-45, -80], [-58, -66], [-64, -50 + drop], [-52, -56]], new Set(), 3)))], { ...BO, ramp: EARC, thick: 5 * k, base: 3.5 });
  }
  {
    const sw = Math.sin(t * 1.5 + 2) * 0.06 - perk * 0.12, piv = P(36, -28), r = (p) => rot(p, piv[0], piv[1], sw);
    blob(c, [r(H(smooth([[24, -40], [52, -40], [70, -14], [72, 22], [62, 34], [52, 20], [44, -6], [28, -20]], new Set(), 4)))], { ...BO, ramp: EARC, thick: 10 * k, base: 3.0, gain: 2.0 });
  }
  // head: brown, scruffy cheek fluff and a tuft on top
  const cheek = (s) => H(mir([[-30, 2], [-50, 4], [-62, 14], [-56, 20], [-66, 28], [-52, 36], [-58, 42], [-40, 42], [-28, 40]], s));
  const tuft = H([[-14, -40], [-10, -58], [-4, -46], [2, -62], [7, -46], [14, -56], [16, -38]]);
  blob(c, [H(ell(0, -4, 52, 44)), cheek(1), cheek(-1), tuft], { ...BO, ramp: COAT, thick: 26 * k, base: 2.9, gain: 2.3 });
  // cream muzzle and a narrow blaze between the eyes
  blob(c, [H([[-5, -40], [5, -40], [8, -16], [18, 0], [32, 16], [34, 30], [22, 42], [0, 46], [-22, 42], [-34, 30], [-32, 16], [-18, 0], [-8, -16]])], { ...BO, ramp: CREAM, thick: 15 * k, base: 4.4, gain: 1.6, outline: "#3A2026", litOutline: LITC });
  blob(c, [H(ell(0, 25, 24, 15))], { ...BO, ramp: CREAM, thick: 10 * k, base: 4.9, gain: 1.4, outline: "#5A3A40", litOutline: LITC });
  // eyes (happy: closed curved lids), blush, cream eyebrow spots that rise when worried
  // open eyes crossfade into happy closed "∩" eyes (never a half-closed sleepy lid)
  const blink = o.blink ?? 0;
  for (const s of [-1, 1]) {
    const [ex, ey] = PF(s * 22, -7);
    if (happy < 1) eye(c, ex, ey, 15 * k, { ry: 16 * k, iris: DOG_EYE, pupil: "round", look, blink, lid: COAT[4], a: a * (1 - happy) });
    if (happy > 0) { const g = fade(c, a * happy), r = 11 * K; for (let i = -r; i <= r; i += 0.5) { const u = i / r, yy = ey + 3 * K - (1 - u * u) * 7 * K; g.px(R(ex + i), R(yy), OUT); g.px(R(ex + i), R(yy) + 1, OUT); if (Math.abs(u) < 0.7) g.px(R(ex + i), R(yy) + 2, COAT[2]); } }
  }
  { const [a1, b1] = P(-38, 14), [a2, b2] = P(38, 14); blush(c, a1, b1, 9 * k, 4 * k, "#F27A9A", a * (1 - worry * 0.4)); blush(c, a2, b2, 9 * k, 4 * k, "#F27A9A", a * (1 - worry * 0.4)); }
  for (const s of [-1, 1]) {
    // cream eyebrow spots: rise and slant (inner ends up) when worried
    const lift = worry * 6 - happy * 1.5, [bx, by] = PF(s * 19, -31 - lift);
    blob(c, [ell(bx, by, 6.5 * K, 3.6 * K, tilt + s * worry * 0.45)], { ...BO, ramp: CREAM, thick: 3 * k, base: 5.0, gain: 1.0, outline: "#3A2026", litOutline: LITC });
  }
  const [nx, ny] = PF(0, 11, 0.6); nose(c, nx, ny, 10 * k, "#1A1018", a);
  { const g = fade(c, a); g.px(R(nx - 4 * k), R(ny + 1), "#6A5A6A"); g.px(R(nx - 3 * k), R(ny + 1), "#8A7A8A"); }
  // mouth: panting open smile ↔ small worried mouth ↔ cheeky teeth grin ↔ big happy smile (crossfades, never one frame)
  const [mx, my] = PF(0, 25, 0.5), open = clamp01((o.open ?? 0.7) * (1 - worry) + happy * 0.3);
  const base = 1 - grin, ga = a * grin;
  if (base > 0.01) {
    const aa = a * (grin > 0 ? Math.min(1, base * 1.6) : 1);
    // the open panting smile crossfades into a small wavy worried mouth
    const wq = clamp01((worry - 0.25) / 0.5), wq2 = wq * wq * (3 - 2 * wq);
    if (wq2 > 0.01) { const g = fade(c, aa * wq2); const w = R(7 * k); for (let i = -w; i <= w; i++) g.px(R(mx + i), R(my + 2 + Math.sin(i * 0.9) * 1.2 * k), OUT); }
    if (wq2 < 0.99) {
      const sa = aa * (1 - wq2), op = (o.open ?? 0.7) * (1 - worry * 0.6) + happy * 0.3;
      smile(c, mx, my, R(9 * k), { open: op, tongue: "#F07090", a: sa });
      const tg = sa * clamp01((op - 0.45) / 0.15);
      if (tg > 0.01) { const pant = Math.sin(t * 2 * Math.PI * 1.6) * 1.2 * (1 - worry); blob(c, [H(ell(0, 38 + pant, 6, 6.5))], { ramp: RAMP.pink, thick: 4 * k, base: 4.4, outline: "#6A1A34", a: tg }); const [lx, ly] = P(0, 35 + pant); fade(c, tg).line(R(lx), R(ly), R(lx), R(ly + 4 * k), "#C84468"); }
    }
  }
  if (ga > 0.01) {
    // cheeky grin: a wide curved mouth showing a row of small white teeth and two little fangs
    const g = fade(c, ga), w = 15 * k, hgt = 9 * k;
    for (let X = -R(w); X <= R(w); X++) {
      const u = X / w, top = my - 1 + 3 * k * u * u * -1 + 2 * k, bot = my + hgt * (1 - u * u) + 1;
      for (let Y = R(top); Y <= R(bot); Y++) {
        const edge = Y === R(top) || Y === R(bot) || Math.abs(X) === R(w);
        let col = edge ? OUT : Y - top < 3.2 * k ? (((X + 100) % R(Math.max(3, 4 * k))) === 0 ? "#B8AEC0" : "#FFFFFF") : Y > bot - 3 * k ? "#F07090" : "#4A0E1E";
        if (!edge && Y - top >= 3.2 * k && Y - top < 5.5 * k && (Math.abs(X - 7 * k) < 1.5 * k || Math.abs(X + 7 * k) < 1.5 * k)) col = "#FFFFFF";
        g.px(R(mx + X), Y, col);
      }
    }
  }
  return [mx, my];
}

/**
 * The whole dog sitting on the ground, facing the camera. o: everything dogHead takes, plus wag (tail speed factor).
 * Returns { mouth: [x, y], top: [x, y] }.
 */
export function drawDog(c, x, y, t, o = {}) {
  const a = o.a ?? 1, wag = o.wag ?? 1, br = Math.sin(t * 2 * Math.PI * 0.55), B = y + 248;
  const BO = { outline: OUT, litOutline: LIT, a };
  shadow(c, x, B, 112, 9, "#2A1222", 0.5 * a);
  // tail (behind), wagging: curls up on the right with a cream tip
  const ph = o.wagPh ?? t * wag, ta = Math.sin(ph * 2 * Math.PI * 2.0) * 0.38 * Math.min(1.4, wag), tb = [x + 80, B - 16], tm = [x + 124 + Math.cos(ta) * 3, B - 36 + Math.sin(ta) * 6], tt = [x + 112 + Math.sin(ta) * 22, B - 90 + Math.cos(ta) * 4];
  const tail = bez(tb, tm, tt, 14);
  blob(c, [tube(tail, 14, 11)], { ...BO, ramp: COAT, thick: 7 }); blob(c, [tube(tail.slice(10), 12, 11)], { ...BO, ramp: CREAM, thick: 5, base: 4.4, outline: "#3A2026", litOutline: LITC });
  for (let i = 0; i < 4; i++) { const p = tail[3 + i * 2]; fade(c, a).px(R(p[0] + 8), R(p[1] + 2), COAT[1]); }
  // body: plump pear with round haunches (brown), cream bib with a fluffy hem, chubby legs with cream socks
  blob(c, [ell(x - 70, B - 44, 46, 46), ell(x + 70, B - 44, 46, 46)], { ...BO, ramp: COAT, thick: 20, base: 2.6, gain: 2.2 });
  const body = [[-30, -206], [-58, -164], [-82, -104], [-96, -48], [-88, -4], [0, 2], [88, -4], [96, -48], [82, -104], [58, -164], [30, -206]].map(([px, py]) => [x + px, B + py]);
  blob(c, [smooth(body, new Set(), 4)], { ...BO, ramp: COAT, thick: 34, base: 2.5, gain: 2.4 });
  // a darker brown patch on the right haunch (mutt markings)
  blob(c, [ell(x + 64, B - 58, 22, 18, 0.4)], { ...BO, ramp: EARC, thick: 8, base: 3.6, gain: 1.6, outline: COAT[2], litOutline: null });
  const hem = []; for (let i = 0; i <= 8; i++) hem.push([x + 44 - i * 11, B - 84 + (i % 2 ? 9 : 0) - Math.abs(i - 4) * 2]);
  blob(c, [smooth([[x - 26, B - 206 + br], [x, B - 214 + br], [x + 26, B - 206 + br], [x + 48, B - 164], [x + 52, B - 118], ...hem, [x - 52, B - 118], [x - 48, B - 164]], new Set([5, 6, 7, 8, 9, 10, 11, 12, 13]), 4)], { ...BO, ramp: CREAM, thick: 24, base: 4.3, gain: 2.0, outline: "#3A2026", litOutline: LITC });
  for (const s of [-1, 1]) {
    blob(c, [tube([[x + s * 26, B - 98], [x + s * 27, B - 14]], 18, 17)], { ...BO, ramp: CREAM, thick: 10, base: 4.1, outline: "#3A2026", litOutline: LITC });
    blob(c, [ell(x + s * 28, B - 7, 22, 12)], { ...BO, ramp: CREAM, thick: 7, base: 4.6, outline: "#3A2026", litOutline: LITC });
    for (const dx of [-7, 1, 9]) fade(c, a).line(R(x + s * 28 + dx * s - 1), R(B - 11), R(x + s * 28 + dx * s - 1), R(B - 5), "#9A7A7A");
  }
  // red bandana with cream polka dots: a band round the neck and a triangle on the chest
  const hy = y + br, cp = [x, B - 184 + br * 0.5];
  blob(c, [ell(cp[0], cp[1], 38, 8), [[cp[0] - 30, cp[1] + 2], [cp[0] + 30, cp[1] + 2], [cp[0] + 2, cp[1] + 40]]], { ...BO, ramp: RED, thick: 6, base: 2.5, gain: 2.2, outline: "#3A0A10", litOutline: "#FF9A80" });
  { const g = fade(c, a); for (const [dx, dy] of [[-18, 4], [-4, 8], [12, 6], [-8, 20], [6, 22], [0, 32], [24, 2]]) { g.rect(R(cp[0] + dx), R(cp[1] + dy), 2, 2, "#FDEBD8"); g.px(R(cp[0] + dx), R(cp[1] + dy) + 2, "#C04A40"); } }
  blob(c, [ell(cp[0] - 28, cp[1] - 2, 7, 6), [[cp[0] - 32, cp[1] + 2], [cp[0] - 44, cp[1] + 16], [cp[0] - 30, cp[1] + 12]]], { ...BO, ramp: RED, thick: 4, base: 2.8, outline: "#3A0A10", litOutline: "#FF9A80" });
  const mouth = dogHead(c, x, hy, t, o, 1);
  return { mouth, top: [x, hy - 80] };
}

/** ~56×56 head portrait (readout + guess cards). */
export function dogIcon(c, cx, cy, a = 1) { dogHead(c, cx, cy + 4, 0.6, { a, open: 0.7, earPerk: 0.3 }, 0.37); }
