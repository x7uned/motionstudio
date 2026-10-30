// The series' hummingbird, drawn once and shared by two films (an identical copy lives in the heart film's levels/):
// a chibi hummingbird hovering face-on — big round head with glossy bead eyes and blush, an iridescent throat (gorget)
// with a slowly sliding sheen, a soft round belly, a fanned tail, tucked feet, a long thin beak to one side and
// blurred buzzing wings (a dithered sweep with brighter turning points and one flickering wing). Two colourings:
//   "bee"        — bee hummingbird (Cuba), male: fiery rose head and gorget with side plumes, blue back, pale belly;
//   "bluethroat" — blue-throated hummingbird (Lampornis clemenciae), male: bronze-green crown, white eye stripe and
//                  moustache, bright blue throat, grey belly, blue-black tail with big white corners.
// drawHummingbird(c, x, y, o): (x, y) = head centre (screen). The expensive volume shading is cached per
// (look, scale, tilt) as a sprite; wings, sheen, eyes and beak are drawn per frame (cheap). Pure function of its inputs.
import { blob, ell, tube, eye, blush, RAMP, fade, mix, bayer, rnd } from "../cute.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";

const R = Math.round;
export const LOOKS = {
  bee: {
    crown: ["#24081E", "#4A0E3A", "#761A5C", "#A02874", "#C8408E", "#E066A8", "#F296C4", "#FFD0E6"],
    face: ["#2E0818", "#5E1030", "#931C46", "#C42A58", "#E84468", "#F8707E", "#FFA2A2", "#FFD6CC"],
    gorget: ["#300618", "#640E30", "#A21642", "#DA2650", "#FA4C5C", "#FF7E62", "#FFB878", "#FFEAA8"],
    belly: ["#2A2A3A", "#4A4C62", "#6C708A", "#9296AE", "#B6BACE", "#D2D6E4", "#EAECF4", "#FFFFFF"],
    back: ["#0C1838", "#142858", "#1C3E7C", "#2858A4", "#3A76C6", "#5C9ADE", "#8CC0F0", "#C4E2FA"],
    tail: ["#0A1024", "#141E3C", "#1E2E58", "#2A4276", "#3A5894", "#5070AE", "#7090C6", "#A0B8DE"],
    beak: "#1A1220", beakHi: "#5A4A64", iris: ["#07060C", "#140E1C", "#221830", "#4A3A5A", "#7A6A8A"],
    sheen: ["#FFE48A", "#FFF8D8"], plumes: true, tailTip: "#DDE6F4", tailTipBig: false, stripes: false, blush: "#FF8AA0",
  },
  bluethroat: {
    crown: ["#101E0C", "#1E3816", "#2E5222", "#426E30", "#5A8A3E", "#78A650", "#9EC26A", "#CCE09A"],
    face: ["#24262E", "#3C404A", "#585C68", "#767A86", "#969AA4", "#B4B8C0", "#D2D4DA", "#EEEEF2"],
    gorget: ["#06142E", "#0C2A5E", "#123E94", "#1C5CC8", "#2E7EEA", "#5AA6FA", "#92CCFF", "#DAF2FF"],
    belly: ["#24262E", "#3C404A", "#585C68", "#767A86", "#969AA4", "#B4B8C0", "#D2D4DA", "#EEEEF2"],
    back: ["#121E10", "#22361C", "#34502A", "#486A38", "#5E8448", "#7A9E5C", "#9EBC7A", "#C8DCA4"],
    tail: ["#06080E", "#0E121C", "#161E2C", "#20283C", "#2C3650", "#3C4864", "#56607C", "#7A849A"],
    beak: "#141018", beakHi: "#4A4250", iris: ["#07060C", "#140E1C", "#221830", "#4A3A5A", "#7A6A8A"],
    sheen: ["#C8F0FF", "#FFFFFF"], plumes: false, tailTip: "#F4F6FA", tailTipBig: true, stripes: true, blush: "#F59AB0",
  },
};
const SPR = spriteCache(16);

/** Gorget outline (local units): a rounded bib under the face; with plumes it flares into two points at the sides. */
function gorgetPoly(L) {
  if (L.plumes) return [[-26, 18], [-32, 30], [-42, 40], [-28, 41], [-17, 50], [0, 55], [17, 50], [28, 41], [42, 40], [32, 30], [26, 18], [0, 26]];
  return [[-24, 20], [-27, 34], [-18, 46], [0, 51], [18, 46], [27, 34], [24, 20], [0, 26]];
}

function bodySprite(kind, s, tilt, turn) {
  const L = LOOKS[kind], tx = turn * 7, key = `hb:${kind}:${s.toFixed(3)}:${tilt.toFixed(2)}:${turn.toFixed(1)}`, W = R(130 * s) + 10, H = R(170 * s) + 10, ox = R(W / 2), oy = R(52 * s) + 5;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => xform(pts.map(([u, v]) => [x + u * s, y + v * s]), x, y + 40 * s, tilt);
    const E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 40));
    // tail: five feathers fanning down from under the belly, light tips (bluethroat: big white outer corners)
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i - 2) * 0.24, len = 34 - Math.abs(i - 2) * 3, root = [0, 76], tip = [Math.cos(a) * len, 76 + Math.sin(a) * len];
      blob(g, [T(tube([root, [(root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2], tip], 5.5, 4))], { ramp: L.tail, thick: 4 * s, base: 3.2, litOutline: L.tail[2] });
      const big = L.tailTipBig && (i === 0 || i === 4), tl = big ? 11 : 5;
      const tp = T(tube([[tip[0] - Math.cos(a) * tl, tip[1] - Math.sin(a) * tl], tip], big ? 4.2 : 3.4, big ? 3.6 : 3));
      g.poly(tp, L.tailTip); g.poly(T(tube([[tip[0] - Math.cos(a) * tl * 0.5, tip[1] - Math.sin(a) * tl * 0.5], tip], 1.6, 1.2)), "#FFFFFF");
    }
    // back/flanks peeking out at the sides, then the soft belly
    blob(g, [E(0, 50, 34, 33)], { ramp: L.back, thick: 12 * s, base: 3.0, gain: 2.2, litOutline: L.back[3] });
    blob(g, [E(0, 54, 25, 29)], { ramp: L.belly, thick: 14 * s, base: 3.6, gain: 2.4, outline: L.belly[2], litOutline: null });
    // tucked feet
    for (const sd of [-1, 1]) { const [fx, fy] = T([[sd * 8, 82]])[0]; g.rect(R(fx) - 2, R(fy), 4, 2, "#1A1220"); g.px(R(fx) - 2 + (sd > 0 ? 3 : 0), R(fy) + 2, "#1A1220"); }
    // iridescent gorget (throat)
    blob(g, [T(gorgetPoly(L))], { ramp: L.gorget, thick: 10 * s, base: 3.4, gain: 2.6, slope: 0.6, litOutline: L.gorget[2] });
    // head: round, crown colour; a lighter face mask around the eyes for readable expressions
    // head: the face colour all round, then the iridescent cap with a little widow's peak between the eyes
    blob(g, [E(0, 0, 39, 36)], { ramp: L.face, thick: 22 * s, base: L.stripes ? 3.6 : 3.3, gain: 2.3, litOutline: L.face[3] });
    { const cap = []; for (let i = 0; i <= 16; i++) { const an = Math.PI + (i / 16) * Math.PI; cap.push([Math.cos(an) * 39.5, Math.sin(an) * 36.5 + 2]); }
      cap.push([30, 0], [14 + tx, -8], [6 + tx, -2], [tx, 8], [-6 + tx, -2], [-14 + tx, -8], [-30, 0]);
      blob(g, [T(cap)], { ramp: L.crown, thick: 16 * s, base: 3.2, gain: 2.4, outline: L.crown[1], litOutline: L.crown[3] }); }
    if (L.stripes) {
      // white stripe behind each eye and a white moustache stripe (blue-throated hummingbird field marks)
      for (const sd of [-1, 1]) {
        const k = 1 - sd * turn * 0.35, o = tx * 0.6;
        g.poly(T([[o + sd * 27 * k, -14], [o + sd * 37 * k, -12], [o + sd * 38 * k, -8], [o + sd * 27 * k, -9]]), "#F4F6FA");
        g.poly(T([[o + sd * 10 * k, 21], [o + sd * 28 * k, 17], [o + sd * 33 * k, 20], [o + sd * 12 * k, 25]]), "#F4F6FA");
      }
    } else for (const sd of [-1, 1]) g.poly(T(ell(tx * 0.6 + sd * 32 * (1 - sd * turn * 0.3), -9, 3, 2.4, 0, 12)), "#FFF4F4");   // tiny post-ocular spot
  });
}

/**
 * o: kind ("bee" | "bluethroat"), s scale, tilt, look [dx, dy], blink, wing (phase 0..1, any speed), buzz 0..1 (extra
 * flicker), wings (false = perched, folded), turn −1..1 (head turned toward the beak side, 3/4 view), beak (direction in rad, 0 = right; default follows
 * the turn: 0.32 = slightly down-right), a (dissolve), sheen (phase 0..1).
 * Returns anchors: { chest, throat, beakTip, top, bottom } in screen pixels.
 */
export function drawHummingbird(c, x, y, o = {}) {
  const kind = o.kind ?? "bee", L = LOOKS[kind], s = o.s ?? 1, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1;
  x = R(x); y = R(y);
  const T = (u, v) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u * s, dy = v * s - 40 * s; return [x + dx * cs - dy * sn, y + 40 * s + dx * sn + dy * cs]; };
  const out = { chest: T(0, 46), throat: T(0, 38), top: y - 42 * s, bottom: y + 112 * s };
  if (a <= 0) return out;
  // ---- wings (behind): a blurred sweep from the shoulder, brighter at the turning points, one flickering wing
  const ph = o.wing ?? 0, buzz = o.buzz ?? 0;
  if (o.wings === false) for (const sd of [-1, 1]) {               // perched: wings folded along the sides
    const [wx, wy] = T(sd * 30, 58), q = fade(c, a); q.poly(ell(wx, wy, 9 * s, 26 * s, sd * 0.22, 24), L.back[1]); q.poly(ell(wx - sd * s, wy - s, 7 * s, 23 * s, sd * 0.22, 24), L.back[3]);
  }
  else for (const sd of [-1, 1]) {
    const [rx, ry] = T(sd * 22, 30), A0 = -1.38, A1 = -0.5, len = 68 * s, g = fade(c, a);
    const angAt = (k) => A0 + (A1 - A0) * k + tilt;                                        // k 0..1 across the sweep
    const wingPoly = (ang, l, w) => { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, half = Math.sin(Math.PI * Math.min(1, u * 1.15)) * w * (1 - u * 0.35); pts.push([u * l, -half]); } for (let i = 10; i >= 0; i--) { const u = i / 10, half = Math.sin(Math.PI * Math.min(1, u * 1.15)) * w * 0.55 * (1 - u * 0.35); pts.push([u * l, half]); } const cs = Math.cos(ang), sn = Math.sin(ang); return pts.map(([u, v]) => [rx + sd * (u * cs - v * sn), ry + (u * sn + v * cs)]); };
    // the sweep: dithered fan, denser toward the tip arc
    for (let Y = R(ry - len - 4); Y <= R(ry + 10); Y++) for (let X = R(rx - (sd < 0 ? len + 6 : 4)); X <= R(rx + (sd > 0 ? len + 6 : 4)); X++) {
      const dx = (X - rx) * sd, dy = Y - ry, d = Math.hypot(dx, dy); if (d < 6 * s || d > len) continue;
      const an = Math.atan2(dy, dx) - tilt * sd; if (an < A0 - 0.05 || an > A1 + 0.05) continue;
      const k = (an - A0) / (A1 - A0), edge = Math.min(1, Math.min(k, 1 - k) * 6), dens = (0.2 + 0.34 * (d / len) ** 2) * (1.15 - 0.45 * edge) + buzz * 0.08;
      if (dens > bayer(X, Y)) g.px(X, Y, d > len - 3 ? "#8E9ECC" : ((X + Y) & 1) ? "#E6EEFF" : "#B6C4E6");
    }
    // turning-point ghosts at both ends of the sweep, and the flickering wing in between
    for (const [k, dens, edge] of [[0.02, 0.42, 0], [0.98, 0.42, 0], [0.5 + 0.48 * Math.sin(ph * 2 * Math.PI), 0.66, 1]]) {
      const w = wingPoly(angAt(k), len * (0.96 - 0.06 * Math.abs(k - 0.5)), 9 * s), q = fade(c, a * dens);
      q.poly(w, null, (X, Y) => (((X + Y) & 1) === 0 ? "#F2F6FF" : "#AEBEE4"));
      if (edge) for (let i = 0; i < w.length; i++) { const p = w[i], r = w[(i + 1) % w.length]; q.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), "#5E6E9E"); }
    }
    // buzz lines at the sweep tips
    if (buzz > 0.05) { const q = fade(c, a * buzz); for (let i = 0; i < 3; i++) { const an = angAt(i === 0 ? -0.05 : i === 1 ? 1.05 : 0.5) , d0 = len + 4 + 3 * Math.sin(ph * 12.566 + i), ex = rx + sd * Math.cos(an) * d0, ey = ry + Math.sin(an) * d0; q.line(R(ex), R(ey), R(ex + sd * Math.cos(an) * 6 * s), R(ey + Math.sin(an) * 6 * s), "#FFFFFF"); } }
  }
  // ---- body sprite
  const turn = Math.round((o.turn ?? 0) * 10) / 10, tx = turn * 7;
  bodySprite(kind, s, tilt, turn).blit(c, x, y, { a });
  // ---- sliding iridescent sheen across the gorget (a soft diagonal band of lighter tones)
  const sh = o.sheen ?? 0, gp = gorgetPoly(L).map(([u, v]) => T(u, v)), band = -50 + 110 * sh, g = fade(c, a);
  let gx0 = Infinity, gx1 = -Infinity, gy0 = Infinity, gy1 = -Infinity; for (const [px, py] of gp) { gx0 = Math.min(gx0, px); gx1 = Math.max(gx1, px); gy0 = Math.min(gy0, py); gy1 = Math.max(gy1, py); }
  const inside = (X, Y) => { let k = false; for (let i = 0, j = gp.length - 1; i < gp.length; j = i++) { const [xi, yi] = gp[i], [xj, yj] = gp[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) k = !k; } return k; };
  for (let Y = R(gy0) + 2; Y <= R(gy1) - 2; Y++) for (let X = R(gx0) + 2; X <= R(gx1) - 2; X++) {
    const u = (X - x) / s + (Y - y) / s * 0.7 - band, w = Math.abs(u); if (w > 9) continue;
    if (!inside(X + 0.5, Y + 0.5)) continue; const k = 1 - w / 9;
    if (k * 0.9 > bayer(X, Y) + 0.15) g.px(X, Y, k > 0.7 ? L.sheen[1] : L.sheen[0]);
  }
  // small crown glint (iridescent highlight on the head, moves with the sheen)
  { const [hx, hy] = T(-16 + 10 * Math.sin(sh * 2 * Math.PI), -26); for (let i = -4; i <= 4; i++) if (Math.abs(i) < 3 || ((i + R(hx)) & 1)) g.px(R(hx + i * s), R(hy - Math.abs(i) * 0.3), L.crown[7]); }
  // ---- face: glossy bead eyes, blush
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) { const k = 1 - sd * turn * 0.22, [ex, ey] = T(tx + sd * 17 * (1 - sd * turn * 0.12), -3); eye(c, ex, ey, 12.5 * s * k, { ry: 14 * s, iris: L.iris, pupil: "bead", look, blink, lid: L.face[4], a }); }
  for (const sd of [-1, 1]) { const [bx1, by1] = T(tx * 0.8 + sd * 27 * (1 - sd * turn * 0.25), 14); blush(c, bx1, by1, 7 * s * (1 - sd * turn * 0.3), 3.5 * s, L.blush, a); }
  // ---- the long thin beak from the middle of the face (drawn last, in front)
  const ba0 = (o.beak ?? (turn < 0 ? Math.PI - 0.32 : 0.32)) + tilt, side = Math.cos(ba0) >= 0 ? 1 : -1, [bx, by] = T(tx * 1.6 + side * 3, 12), bl = 60 * s;
  let px = bx, py = by, tip = [bx, by];
  for (let i = 0; i <= bl; i++) {
    const u = i / bl, ang = ba0 + side * 0.12 * u * u, cs = Math.cos(ang), sn = Math.sin(ang);
    const w = (u < 0.16 ? 3.4 - u * 11 : u < 0.8 ? 1.5 - (u - 0.16) * 0.8 : 1.0 - (u - 0.8) * 2.5) * Math.max(1, s * 0.9);
    for (let j = -4; j <= 4; j++) { if (Math.abs(j) > w + 0.25) continue; const top = side > 0 ? j <= -Math.floor(w) + 0.5 : j >= Math.floor(w) - 0.5; g.px(R(px - sn * j), R(py + cs * j), top && u > 0.04 && u < 0.85 && w > 1.2 ? L.beakHi : L.beak); }
    px += cs; py += sn; tip = [px, py];
  }
  out.beakTip = tip;
  return out;
}

/** Pixel motion/heat helper: a wavy line rising from (x, y) of length n, phase ph (for heat waves). */
export function heatWave(c, x, y, n, ph, col = "#FF5A4A", a = 1, dir = -Math.PI / 2) {
  const g = fade(c, a), cs = Math.cos(dir), sn = Math.sin(dir);
  for (let i = 0; i < n; i++) { const w = Math.sin(i * 0.55 + ph) * 2.2, px = x + cs * i - sn * w, py = y + sn * i + cs * w; g.px(R(px), R(py), i < 2 || i > n - 3 ? mix(col, "#FFFFFF", 0.35) : col); }
}
export { rnd };
