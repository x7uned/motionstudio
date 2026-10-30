// Everything that moves or stands on the street of «GTA 6: the city behind you»: the channel's character (always drawn —
// the player is always rendered), the console prop of the "PS5 … without lag?" beat, the traffic on the road and the
// pedestrians on both sidewalks. Cars and people obey the game camera's view (timeline.mjs → drawnAt): inside the cone
// they are full pixel art, outside it a blueprint ghost that soon vanishes (deleted); driving into the cone they
// materialise from the blueprint. Scripted beats: spawns with a sparkle ahead of him ("they appear in front of you"),
// the deleted car with its DELETED stamp and trash can, the T-pose glitch on the late-drawn side after the fast turn.
import { drawnAt, WORLD_W } from "../timeline.mjs";
import { sm, ease, lerp, clamp01, rnd } from "../cute.mjs";
import { mix, bayer, fade, MAIN } from "../../../../../renderer/pixel/raster.mjs";
import * as T from "./actors-time.mjs";
import { carSprite, personSprite, consoleSprite, makeSprite, blitSprite, CAR_DIM, BP, PHASES, PERSON } from "./actors-sprites.mjs";
import { drawHero, drawHeroShadow, heroState, HERO_BOX } from "./actors-hero.mjs";
export { HERO_BOX };

const R = Math.round, { HERO_X, LANE, WALK } = T;
export const RANGE = [0, WORLD_W];

// ---------------------------------------------------------------- presence: does the game keep this thing at time t?
// ins = how much of the object (front, middle, back) is inside the view; it lingers as a blueprint ghost ~0.5 s after
// leaving the view and fades in as a ghost ~0.4 s before entering it — nowhere else in the not-drawn part of the street.
function insAt(xf, hw, tt) { const x = xf(tt); return Math.max(drawnAt(x - hw, tt), drawnAt(x, tt), drawnAt(x + hw, tt)); }
function presence(xf, hw, t) {
  if (insAt(xf, hw, t) >= 0.999) return 1;
  let e = 0;
  for (let j = 0; j <= 18; j++) { const s = j / 30, w = 1 - sm(s, 0.15, 0.6); e = Math.max(e, insAt(xf, hw, t - s) * w); if (e >= 0.999) return 1; }
  for (let j = 1; j <= 13; j++) { const s = j / 30, w = 1 - sm(s, 0.05, 0.42); e = Math.max(e, insAt(xf, hw, t + s) * w); }
  return e;
}
const ghostAfter = (xf, hw, t) => { let e = 0; for (let j = 0; j <= 18; j++) { const s = j / 30, w = 1 - sm(s, 0.15, 0.6); e = Math.max(e, insAt(xf, hw, t - s) * w); if (e >= 0.999) return 1; } return e; };

// ---------------------------------------------------------------- actor lists (pure functions of t)
const dirOf = (lane) => (lane === "far" ? -1 : 1);
const CARS = T.CARS.map(([kind, col, lane, tA, v], i) => ({ id: i, kind, col, lane, dir: dirOf(lane), hw: CAR_DIM[kind].w / 2, x: (t) => HERO_X + dirOf(lane) * v * (t - tA) }));
const PEOPLE = T.PEOPLE.map(([kind, walk, tA, v], i) => ({ id: 100 + i, kind, walk, v, hw: 8, x: (t) => HERO_X + v * (t - tA) }));
const SPAWNS = T.SPAWN.map((s, i) => ({ ...s, id: 200 + i, hw: s.what === "car" ? CAR_DIM[s.kind].w / 2 : 8, xf: (t) => s.x + s.v * (t - s.t), dir: Math.sign(s.v) }));

// the deleted car: its tail leaves the view exactly on "deleted", then the ghost rolls to a stop
const DL = T.DELETE, DLW = CAR_DIM[DL.kind].w;
const OUT_X = (() => { for (let x = HERO_X; x > 0; x -= 0.5) if (drawnAt(x + DLW / 2 - 1, DL.out) < 0.03) return x; return HERO_X - 120; })();
const STOP_D = (DL.v * (DL.stop[1] - DL.stop[0])) / 2, STOP_X = OUT_X - STOP_D;
function deletedX(t) {
  if (t <= DL.out) return OUT_X + DL.v * (DL.out - t);
  const u = clamp01((t - DL.stop[0]) / (DL.stop[1] - DL.stop[0])); return OUT_X - STOP_D * (2 * u - u * u);
}
const CAN_X = STOP_X - 74;                                            // the trash can stands on the far lane, left of the ghost

// ---------------------------------------------------------------- helpers
function columns(V, t) { const K = new Float32Array(540); for (let X = 0; X < 540; X++) K[X] = drawnAt(V.cx - 270 + X, t); return K; }
const kOf = (K, cap = 1) => (X) => Math.min(cap, K[X < 0 ? 0 : X > 539 ? 539 : X]);
function soft(c, x, y, rx, ry, k, col = "#1A0A22") { if (k <= 0.01) return; c.tint(R(x - rx - 1), R(y - ry - 1), R(rx * 2 + 2), R(ry * 2 + 2), (X, Y) => { const q = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return q >= 1 ? 0 : k * (1 - q); }, col, 3); }

/** One car at world x on its lane; ex = existence, cap = max drawn-ness (materialising), line = blueprint line colour. */
function drawCar(c, V, t, K, kind, col, dir, x, laneY, ex, cap = 1, line = null) {
  if (ex <= 0.004) return;
  const D = CAR_DIM[kind], s = carSprite(kind, col, dir < 0 ? -1 : 1), X = V.X(x), Y = V.Y(laneY);
  if (X + D.w / 2 + 40 < 0 || X - D.w / 2 - 40 > c.w) return;
  const kc = Math.min(cap, K[Math.max(0, Math.min(539, R(X)))]), kf = kOf(K, cap);
  soft(c, X, Y + 1, D.w * 0.5, 3, 0.5 * ex * Math.max(0.25, kc));                       // contact shadow on the road
  blitSprite(c, s, X, Y, { k: kf, ex, lineCol: line });
  // wheels turn: two dark spokes rotate with the distance driven (blueprint: dim cyan)
  const g = fade(c, ex);
  for (const wx of D.wheels) {
    const cx = dir > 0 ? R(X) + wx - R(D.w / 2) : R(X) - wx + R(D.w / 2), cy = R(Y) - D.r, a = (x / D.r) * dir, rr = Math.max(1, D.r - 2);
    for (const q of [0, Math.PI]) { const px = R(cx + Math.cos(a + q) * rr), py = R(cy + Math.sin(a + q) * rr), art = kf(px) > bayer(px, py); g.px(px, py, art ? "#5E5A76" : BP.inner); }
  }
  // headlights on at sunset: a soft warm beam ahead, a red glow behind (only where the car is drawn)
  if (kc > 0.05) {
    const hx = R(X + (D.head[0] - D.w / 2) * dir), hy = R(Y - (D.h - 1 - D.head[1])), L = 30, k0 = 0.42 * kc * ex;
    c.tint(dir > 0 ? hx + 1 : hx - L, hy - 2, L, 12, (Xx, Yy) => { const u = Math.abs(Xx - hx) / L, sp = 1.5 + u * 6, dy = Yy - hy - u * 2.5; return Math.abs(dy) > sp || Yy > Y ? 0 : k0 * (1 - u) * (1 - Math.abs(dy) / (sp + 0.5)); }, "#FFE6A8", 3);
    const tx = R(X + (D.tail[0] - D.w / 2) * dir), ty = R(Y - (D.h - 1 - D.tail[1]));
    c.tint(tx - 5, ty - 4, 10, 8, (Xx, Yy) => { const q = Math.hypot(Xx - tx, (Yy - ty) * 1.3) / 5; return q >= 1 ? 0 : 0.5 * kc * ex * (1 - q); }, "#FF4A5A", 3);
  }
}

const SCALE = { back: 1, front: 1.5 };
function phaseOf(kind, s, x) { const K = PERSON[kind], cyc = (K.skate ? 34 : K.run ? 22 : 13) * s; return Math.floor((((x / cyc) % 1) + 1) % 1 * PHASES) % PHASES; }
/** One pedestrian at world x on its sidewalk. */
function drawPerson(c, V, t, K, kind, walk, v, x, ex, cap = 1, o = {}) {
  if (ex <= 0.004 && !o.inv) return;
  const s = SCALE[walk], X = V.X(x), Y = V.Y(WALK[walk]);
  if (X + 60 < 0 || X - 60 > c.w) return;
  const sp = o.sprite ?? personSprite(kind, s, phaseOf(kind, s, x)), kc = Math.min(cap, K[Math.max(0, Math.min(539, R(X)))]);
  if (!o.noShadow) soft(c, X + (PERSON[kind].extra === "dog" ? 8 * s * Math.sign(v || 1) : 0), Y + 1, (PERSON[kind].extra === "dog" ? 20 : 8) * s, 2, 0.45 * ex * Math.max(0.3, kc));
  blitSprite(c, sp, X, Y, { k: kOf(K, cap), ex, flip: o.flip ?? v < 0, inv: o.inv });
}

// ---------------------------------------------------------------- spawn sparkle (a little game "spawn" burst)
function sparkle(c, X, Y, h, k) {
  if (k <= 0 || k >= 1) return;
  const a = 1 - sm(k, 0.55, 1), g = fade(c, a), cy = Y - h * 0.5, r = 4 + 16 * ease(Math.min(1, k * 1.4));
  // light pillar from the ground
  c.tint(R(X - 5), R(Y - h - 10), 11, R(h + 12), (Xx, Yy) => { const u = Math.abs(Xx - X) / 5.5, v = (Y - Yy) / (h + 10); return u >= 1 || v < 0 ? 0 : 0.7 * a * (1 - u) * (1 - v) * (1 - k); }, "#FFF6C8", 3);
  // four-point star in the middle
  const st = R(3 + 6 * Math.sin(Math.PI * Math.min(1, k * 1.3)));
  for (let i = -st; i <= st; i++) { const col = Math.abs(i) < 2 ? "#FFFFFF" : "#FFE27A"; g.px(R(X + i), R(cy), col); g.px(R(X), R(cy + i), col); }
  g.px(R(X) - 1, R(cy) - 1, "#FFFFFF"); g.px(R(X) + 1, R(cy) + 1, "#FFFFFF"); g.px(R(X) + 1, R(cy) - 1, "#FFFFFF"); g.px(R(X) - 1, R(cy) + 1, "#FFFFFF");
  // ring of twinkles flying out
  for (let i = 0; i < 8; i++) { const an = (i / 8) * 2 * Math.PI + 0.3, px = R(X + Math.cos(an) * r), py = R(cy + Math.sin(an) * r * 0.8); g.px(px, py, i % 2 ? "#7FE3F0" : "#FFE27A"); if (k < 0.6) g.px(px + 1, py, "#FFFFFF"); }
}

// ---------------------------------------------------------------- the console prop
const CON = consoleSprite();
function consoleState(t) {
  const C = T.CONSOLE, p0 = C.pop[0], land = p0 + 0.2;
  const ex = Math.min(sm(t, p0, p0 + 0.16), 1 - sm(t, C.out[0], C.out[1]));
  const fall = t < land ? -26 * (1 - clamp01((t - p0) / 0.2)) ** 2 : 0;
  const q = clamp01((t - land) / (C.pop[1] - land)), sq = t > land && q < 1 ? Math.sin(Math.PI * q) * (1 - q) : 0;
  const str = Math.min(sm(t, C.strain[0], C.strain[0] + 0.2), 1 - sm(t, C.strain[1] - 0.15, C.strain[1] + 0.1));
  const shake = str * 1.4 * Math.sin(t * 2 * Math.PI * 11);
  return { ex, fall, sx: 1 + 0.16 * sq, sy: 1 - 0.2 * sq, str, shake };
}
function drawConsole(c, V, t) {
  const C = T.CONSOLE; if (t < C.pop[0] - 0.01 || t > C.out[1] + 0.6) return;
  const st = consoleState(t), X = V.X(C.x) + st.shake, Y = V.Y(T.LAND) + st.fall;
  if (st.ex > 0) {
    soft(c, V.X(C.x), V.Y(T.LAND) + 1, 18 * (1 - 0.3 * clamp01(-st.fall / 26)), 2.5, 0.55 * st.ex);
    // squash/stretch about the base (nearest), then the spinning fan, heat shimmer and sweat while it strains
    const s = CON, x0 = X - s.ox * st.sx, y0 = Y - s.oy * st.sy, d = c.d;
    for (let Yy = Math.floor(y0); Yy < y0 + s.h * st.sy + 1; Yy++) for (let Xx = Math.floor(x0); Xx < x0 + s.w * st.sx + 1; Xx++) {
      if (Xx < 0 || Yy < 0 || Xx >= c.w || Yy >= c.h) continue;
      const u = Math.floor((Xx + 0.5 - x0) / st.sx), v = Math.floor((Yy + 0.5 - y0) / st.sy); if (u < 0 || v < 0 || u >= s.w || v >= s.h) continue;
      const i = v * s.w + u; if (!s.m[i] || (st.ex < 1 && st.ex <= bayer(Xx + 1, Yy + 2))) continue;
      const p = (Yy * c.w + Xx) * 3; d[p] = s.art[i * 3]; d[p + 1] = s.art[i * 3 + 1]; d[p + 2] = s.art[i * 3 + 2];
    }
    const g = fade(c, st.ex), fx = R(X + 10 * st.sx), fy = R(Y - 36 * st.sy);
    // fan vent on the right fin: blades spin faster and faster while it strains
    const spin = 3 * t + 26 * Math.max(0, Math.min(t, C.strain[1]) - C.strain[0]) ** 1.6 * (t > C.strain[0] ? 1 : 0);
    g.disc(fx, fy, 4, "#3A3448"); g.ring(fx, fy, 4, "#9A94AE");
    for (let b = 0; b < 3; b++) { const an = spin + (b * 2 * Math.PI) / 3; for (let r = 1; r <= 3; r++) g.px(R(fx + Math.cos(an) * r), R(fy + Math.sin(an) * r), "#D8D4E4"); }
    g.px(fx, fy, "#FFFFFF");
    if (st.str > 0.05) {
      const h = fade(c, st.ex * st.str);
      for (let k = 0; k < 2; k++) { const an = spin * 0.5 + k * Math.PI; for (let j = 0; j < 4; j++) { const aa = an + j * 0.22; h.px(R(fx + Math.cos(aa) * 7), R(fy + Math.sin(aa) * 7), "#FFFFFF"); } }
      // heat shimmer rising from the top
      for (let k = 0; k < 3; k++) { const ph = ((t * 1.7 + k / 3) % 1), bx = X - 8 + k * 8, by = Y - 68 * st.sy - 3 - ph * 26;
        for (let j = 0; j < 9; j++) { const yy = R(by - j), xx = R(bx + Math.sin((j + t * 14) * 0.8) * 1.8), a = (1 - ph) * st.str; if (a > 0.15 + 0.5 * bayer(xx, yy)) h.px(xx, yy, j < 4 ? "#FF8A5A" : "#FFC8A0"); } }
      // sweat drops fly off the top corners, drips slide down its face
      for (let i = 0; i < 9; i++) { const life = 0.55, t0 = C.strain[0] + i * 0.14; const u = (t - t0) / life; if (u < 0 || u > 1) continue;
        const side = i % 2 ? 1 : -1, dx = side * (12 + 24 * u), dy = -62 - 16 * u + 54 * u * u, a = 1 - sm(u, 0.75, 1);
        sweat(fade(c, st.ex * a * st.str), R(X + dx), R(Y + dy)); }
      for (const [ox, per, ph] of [[-11, 0.8, 0], [12, 0.95, 0.4]]) { const du = (((t - C.strain[0]) / per + ph) % 1), a = 1 - sm(du, 0.8, 1); sweat(fade(c, st.ex * st.str * a), R(X + ox), R(Y - 62 + du * 34)); }
      // shake marks either side
      for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) h.px(R(X + sd * (21 + (j % 2))), R(Y - 30 - j * 4), "#FFF2D8");
    }
  }
  // dissolves away with a small poof
  const pk = (t - C.out[0]) / 0.7; if (pk > 0 && pk < 1) sparkle(c, V.X(C.x), V.Y(T.LAND), 40, pk);
}
function sweat(g, x, y) { g.px(x + 1, y, "#2A5A9A"); g.px(x, y + 1, "#2A5A9A"); g.px(x + 2, y + 1, "#2A5A9A"); g.rect(x + 1, y + 1, 1, 1, "#FFFFFF"); g.rect(x - 1, y + 2, 1, 2, "#2A5A9A"); g.rect(x + 3, y + 2, 1, 2, "#2A5A9A"); g.rect(x, y + 2, 3, 2, "#8ADCFF"); g.px(x, y + 2, "#FFFFFF"); g.rect(x, y + 4, 3, 1, "#2A5A9A"); }
// speech bubble "LAG?" above the console
function bubble(c, x, y, text, a, col = "#C0203C") {
  if (a <= 0) return; const g = fade(c, a), s = 2, tw = c.measure(MAIN, text, { scale: s }), w = tw + 12, h = 22, bx = R(x - w / 2), by = R(y - h);
  g.rrect(bx - 1, by - 1, w + 2, h + 2, "#1A0E1C", 2); g.rrect(bx, by, w, h, "#FFFDF4", 2); g.rect(bx + 2, by + h - 3, w - 4, 1, "#EADFD0");
  g.poly([[x - 5, by + h - 1], [x + 3, by + h - 1], [x - 4, by + h + 6]], "#1A0E1C"); g.poly([[x - 4, by + h - 1], [x + 1, by + h - 1], [x - 3.5, by + h + 4]], "#FFFDF4");
  g.text(MAIN, text, bx + 6, by + 4, mix(col, "#000000", 0.35), { scale: s }); g.text(MAIN, text, bx + 6, by + 3, col, { scale: s });
}

// ---------------------------------------------------------------- DELETED stamp + trash can
const STAMP = makeSprite(98, 26, 49, 25, (g, P) => {
  g.rect(P, P, 98, 26, "#2A0A16"); g.frame(P, P, 98, 26, "#FF5468"); g.frame(P + 2, P + 2, 94, 22, "#FF5468");
  g.text(MAIN, "DELETED", P + 8, P + 7, "#7A1426", { scale: 2 }); g.text(MAIN, "DELETED", P + 8, P + 6, "#FF6A7C", { scale: 2 });
}, { rim: 0 });
const CAN_W = 22, CAN_H = 26;
const CAN = makeSprite(CAN_W, CAN_H, CAN_W / 2, CAN_H - 1, (g, P) => {
  g.poly([[P, P], [P + CAN_W, P], [P + CAN_W - 3, P + CAN_H], [P + 3, P + CAN_H]], "#E8E4F0");
  g.poly([[P + CAN_W - 6, P], [P + CAN_W, P], [P + CAN_W - 3, P + CAN_H], [P + CAN_W - 7, P + CAN_H]], "#C8C2D8");
  for (const x of [6, 11, 16]) g.rect(P + x, P + 4, 1, CAN_H - 8, "#9A94B0");
  g.rect(P, P, CAN_W, 2, "#B8B2CC"); g.rect(P + 3, P + CAN_H - 2, CAN_W - 6, 2, "#9A94B0"); g.rect(P + 2, P + 3, 1, CAN_H - 6, "#FFFFFF");
}, { rim: 0 });
function drawCanAndStamp(c, V, t) {
  if (t < DL.stamp[0] || t > DL.fade[1] + 0.05) return;
  const fadeA = 1 - sm(t, DL.fade[0], DL.fade[1]);
  // the stamp slams down above the ghost car (scale 1.7 → 1, dithered in)
  const su = clamp01((t - DL.stamp[0]) / (DL.stamp[1] - DL.stamp[0])), sc = 1 + 0.7 * (1 - ease(su)) ** 2, sa = Math.min(sm(t, DL.stamp[0], DL.stamp[0] + 0.1), fadeA);
  const sx = V.X(STOP_X), sy = V.Y(LANE.far) - 36;
  // the trash can pops up on the road to the left; its lid opens for the ghost and shuts after it
  const cu = clamp01((t - DL.can[0]) / (DL.can[1] - DL.can[0]));
  if (t >= DL.can[0]) drawCan(c, V, t, cu, fadeA);
  blitSprite(c, STAMP, sx, sy, { ex: sa, scale: sc === 1 ? 1 : Math.round(sc * 8) / 8 });
}
function drawCan(c, V, t, cu, fadeA) {
  const ca = Math.min(sm(t, DL.can[0], DL.can[0] + 0.12), fadeA), bounce = cu < 1 ? Math.sin(Math.PI * cu) * (1 - cu) * 6 : 0;
  const cx = V.X(CAN_X), cy = V.Y(LANE.far) - R(bounce);
  soft(c, cx, V.Y(LANE.far) + 1, 10, 2, 0.5 * ca);
  // lid: hinge at the back (left) top corner; open while the ghost flies in
  const open = Math.min(sm(t, DL.drop[0] - 0.12, DL.drop[0] + 0.08), 1 - sm(t, DL.lid[0], DL.lid[1]));
  drawGhostDrop(c, V, t, cx, cy - CAN_H + 1);
  blitSprite(c, CAN, cx, cy, { ex: ca });
  // lid: a thick slab hinged at the can's back-left corner, swinging open (up-left) and shut
  const g = fade(c, ca), hx = cx - CAN_W / 2 - 1, hy = cy - CAN_H - 1, an = -open * 1.9, L = CAN_W + 2;
  for (let i = 0; i <= L; i++) for (let j = -1; j <= 2; j++) { const px = R(hx + Math.cos(an) * i - Math.sin(an) * j), py = R(hy + Math.sin(an) * i + Math.cos(an) * j);
    g.px(px, py, j === -1 || j === 2 || i === 0 || i === L ? "#1A0E1C" : j === 0 ? "#FFFFFF" : "#C8C2D8"); }
  { const mx = hx + Math.cos(an) * (L / 2), my = hy + Math.sin(an) * (L / 2); g.rect(R(mx - Math.sin(an) * -2) - 2, R(my - 3), 5, 2, "#1A0E1C"); g.rect(R(mx - Math.sin(an) * -2) - 1, R(my - 3), 3, 1, "#A8A2BC"); }
  // a red × on the can after the lid shuts
  if (t > DL.lid[1]) { const k = Math.min(sm(t, DL.lid[1], DL.lid[1] + 0.2), fadeA), h = fade(c, k); for (let i = -3; i <= 3; i++) for (const o of [0, 1]) { h.px(cx + i + o, cy - 11 + i, "#E8304A"); h.px(cx + i + o, cy - 11 - i, "#E8304A"); } }
}
/** The ghost car after deletion: rolls to a stop (drawn in actors with the traffic), then flips into the can (here). */
function drawGhostDrop(c, V, t, canX, canTop) {
  if (t < DL.drop[0] || t > DL.drop[1]) return;
  const u = clamp01((t - DL.drop[0]) / (DL.drop[1] - DL.drop[0])), e = ease(u), s = carSprite(DL.kind, DL.col, -1);
  const x0 = V.X(STOP_X), y0 = V.Y(LANE.far), x = lerp(x0, canX, e), y = lerp(y0, canTop + 8, e) - 16 * Math.sin(Math.PI * u), sc = Math.max(0.12, Math.round(lerp(1, 0.14, ease(Math.min(1, u * 1.15))) * 16) / 16);
  blitSprite(c, s, x, y, { k: () => 0, ex: 1 - sm(u, 0.9, 1), lineCol: BP.red, scale: sc });
}

// ---------------------------------------------------------------- the T-pose glitch (after the fast turn)
const TP = T.TPOSE, tpX = (t) => TP.x + TP.v * Math.max(0, t - TP.slide[0]) * (t < TP.snap[0] ? 0.55 : 1) - (t >= TP.snap[0] ? TP.v * 0.45 * (TP.snap[0] - TP.slide[0]) : 0);
function drawTpose(c, V, t, K) {
  if (t < TP.pop[0]) return;
  const x = tpX(t), ex = sm(t, TP.pop[0], TP.pop[1]), ks = sm(t, TP.snap[0], TP.snap[1]), s = SCALE[TP.walk];
  const tSprite = personSprite(TP.kind, s, 0, "t");
  if (ks < 1) drawPerson(c, V, t, K, TP.kind, TP.walk, TP.v, x, Math.min(ex, 1 - ks), 1, { sprite: tSprite, noShadow: ks > 0.5, flip: false });
  if (ks > 0) drawPerson(c, V, t, K, TP.kind, TP.walk, TP.v, x, 1 - ks, 1, { inv: true, noShadow: ks <= 0.5 });
}
function tposeGlitch(c, V, t) {
  const u = (t - TP.pop[0]) / 0.5; if (u < 0 || u > 1) return;
  const X = V.X(tpX(t)), Y = V.Y(WALK[TP.walk]), g = fade(c, 1 - sm(u, 0.5, 1));
  for (let i = 0; i < 6; i++) { const yy = R(Y - 10 - rnd(i * 7 + 3) * 50), w = 4 + R(rnd(i * 5 + 1) * 10), xx = R(X - 26 + rnd(i * 11) * 52 + Math.sin(t * 40 + i) * 3); g.rect(xx, yy, w, 1, i % 2 ? "#FF4AD8" : "#4AF0FF"); }
}

// ---------------------------------------------------------------- frame layers
export function actors(c, V, t) {
  const K = columns(V, t), near = (x, hw) => x + hw + 60 > V.x0 && x - hw - 60 < V.x1;
  const people = { back: [], front: [] }, cars = { far: [], near: [] };
  for (const p of PEOPLE) { const x = p.x(t); if (!near(x, 40)) continue; const ex = presence(p.x, p.hw, t); if (ex > 0.004) people[p.walk].push([p.kind, p.walk, p.v, x, ex, 1]); }
  for (const p of SPAWNS) { if (t < p.t) continue; const x = p.xf(t); if (!near(x, p.hw)) continue;
    const ex = Math.min(sm(t, p.t, p.t + 0.14), ghostAfter(p.xf, p.hw, t)), cap = sm(t, p.t + 0.06, p.t + 0.42);
    if (ex <= 0.004) continue;
    if (p.what === "car") cars[p.lane].push([p.kind, p.col, p.dir, x, LANE[p.lane], ex, cap]);
    else people[p.walk].push([p.kind, p.walk, p.v, x, ex, cap]); }
  for (const a of CARS) { const x = a.x(t); if (!near(x, a.hw)) continue; const ex = presence(a.x, a.hw, t); if (ex > 0.004) cars[a.lane].push([a.kind, a.col, a.dir, x, LANE[a.lane], ex, 1]); }
  // the deleted car is part of the far-lane traffic until it flips into the can
  if (t < DL.drop[0]) { const x = deletedX(t); if (near(x, DLW / 2)) cars.far.push([DL.kind, DL.col, -1, x, LANE.far, 1, 1, t >= DL.stamp[0] ? mix(BP.line, BP.red, sm(t, DL.stamp[0], DL.stamp[0] + 0.24)) : null]); }

  for (const p of people.back) drawPerson(c, V, t, K, ...p);
  for (const a of cars.far) drawCar(c, V, t, K, ...a);
  for (const a of cars.near) drawCar(c, V, t, K, ...a);
  for (const p of people.front) drawPerson(c, V, t, K, ...p);
  drawTpose(c, V, t, K);
  drawConsole(c, V, t);
  const st = heroState(t);
  drawHeroShadow(c, V, t, st);
  drawHero(c, V, t, st);
}

export function front(c, V, t) {
  // spawn sparkles ahead of him
  for (const p of SPAWNS) { const k = (t - p.t + 0.04) / 0.55; if (k <= 0 || k >= 1) continue; const x = p.xf(t), h = p.what === "car" ? 26 : 40 * SCALE[p.walk];
    sparkle(c, V.X(x), V.Y(p.what === "car" ? LANE[p.lane] : WALK[p.walk]), h, k); }
  // "LAG?" bubble over the console
  const C = T.CONSOLE, ba = Math.min(sm(t, C.bubble[0], C.bubble[0] + 0.14), 1 - sm(t, C.bubble[1], C.bubble[1] + 0.22));
  if (ba > 0) { const st = consoleState(t), pu = clamp01((t - C.bubble[0]) / 0.22), lift = R(5 * Math.sin(Math.PI * pu) * (1 - pu)); bubble(c, R(V.X(C.x) + 8 + st.shake * 0.5), V.Y(T.LAND) - 74 - lift, "LAG?", ba); }
  drawCanAndStamp(c, V, t);
  tposeGlitch(c, V, t);
  honk(c, V, t);
}
// horn: three short lines burst from the front of the spawned taxi
function honk(c, V, t) {
  const H = T.HONK, u = (t - H.t[0]) / (H.t[1] - H.t[0]); if (u <= 0 || u >= 1) return;
  const p = SPAWNS[H.spawn], D = CAR_DIM[p.kind], x = p.xf(t), fx = V.X(x) + p.dir * (D.w / 2 + 4), fy = V.Y(LANE[p.lane]) - D.h + 8, g = fade(c, Math.min(sm(u, 0, 0.15), 1 - sm(u, 0.7, 1)));
  for (const an of [-0.6, 0, 0.6]) { const r0 = 3 + 6 * u, ca = Math.cos(an) * p.dir, sa = Math.sin(an); for (let i = 0; i < 4; i++) g.px(R(fx + ca * (r0 + i)), R(fy + sa * (r0 + i)), i < 2 ? "#FFFFFF" : "#FFE27A"); }
}

/** For layout checks / tests. */
export const _debug = { OUT_X, STOP_X, CAN_X, deletedX, presence, ghostAfter, CARS, PEOPLE, SPAWNS, tpX };
