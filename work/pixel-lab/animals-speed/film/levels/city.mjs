// LV8 · city rooftop at dawn — the finale: "So which animal is the fastest? … It's this bird: the peregrine falcon.
// When it dives at its prey, it goes over three hundred kilometres an hour. That's as fast as a bullet train."
// A skyscraper rooftop (back parapet, deck, the facade below, a water tower) under the sunrise; the dawn skyline, the
// radio mast and the elevated bullet-train viaduct behind. The channel's own character stands on the roof with a radar
// speed gun. The falcon drops onto the parapet, shows off, stoops past the roof at a far-off pigeon (it escapes), races
// the bullet train, perches on the radio mast, and after the last word zooms past the hero — the gust tips him over.
import { BIOME, REST, END } from "../timeline.mjs";
import { sign, rnd, fade, mix, bayer, blinkAt } from "../cute.mjs";
import { Layer, R, sm, ease, easeOut, easeIn, lerp, clamp01, prog, spline, along, glow, graded, xform } from "./city-kit.mjs";
import { drawFar, drawMid, drawViaduct, cityGrade, CX0, DECK, MAST } from "./city-sky.mjs";
import { drawFalcon, falconIcon, SLATE } from "./city-falcon.mjs";
import { drawHero, HERO_POSE, gunState, drawGun, HWX, HWY } from "./city-hero.mjs";
import { FAL, PIG, TRAIN, HIT, GUN, EV } from "./city-time.mjs";

export const RANGE = BIOME.city;
export { HERO_POSE };
const OX = REST.city.cx - 270, OY = REST.city.cy - 480;     // rest-screen → world: wx = sx + OX, wy = sy + OY
const S = (V, sx, sy) => [V.X(sx + OX), V.Y(sy + OY)];
const PARAPET = 586, DECK_Y = 634, LIP = 700, FAC = 712;    // rest-screen rows of the roof
const PERCH = { x: 270, head: 394 };                        // the falcon's head when perched on the parapet (feet at 588)

// ---------------------------------------------------------------- the rooftop (static, dawn-painted, graded during the pan)
let ROOF = null, FRONT = null;
function paintRoof() {
  const L = new Layer(OX - 4, OY + 380, OX + 820, OY + 962), g = L.g, put = (x, y, c) => g.px(x + OX, y + OY, c);
  // back parapet: brick wall with a light concrete cap; a taller corner pillar at the left end
  for (let y = PARAPET; y < DECK_Y + 2; y++) for (let x = 0; x < 812; x++) {
    let col;
    if (y < PARAPET + 3) col = y === PARAPET ? "#FFE2D0" : "#E8BCB0";
    else if (y < PARAPET + 6) col = y === PARAPET + 5 ? "#5A3E58" : "#B08C9C";
    else { const row = Math.floor((y - PARAPET - 6) / 7), off = row % 2 ? 9 : 0, joint = (y - PARAPET - 6) % 7 === 0 || (x + off) % 18 === 0; col = joint ? "#6A4A62" : ((x + off) % 18) < 2 ? "#A8808E" : rnd(Math.floor((x + off) / 18) * 31 + row * 7) < 0.25 ? "#946E82" : "#8A6478"; if (y > DECK_Y - 4) col = mix(col, "#3A2840", 0.35); }
    put(x, y, col);
  }
  for (let y = PARAPET - 8; y < DECK_Y; y++) for (let x = 0; x < 12; x++) put(x, y, y < PARAPET - 5 ? "#FFE2D0" : x === 0 ? "#3A2840" : x > 9 ? "#C89AA8" : "#9A7488");
  // roof deck: warm tar-and-gravel, lighter toward the front edge, a puddle reflecting the sunrise, a drain
  for (let y = DECK_Y; y < LIP; y++) for (let x = 0; x < 812; x++) {
    const v = (y - DECK_Y) / (LIP - DECK_Y), c0 = v < 0.15 ? "#5E4660" : v < 0.5 ? ((v - 0.15) / 0.35 > bayer(x, y) ? "#7A5C74" : "#6C5068") : "#7A5C74";
    let col = rnd(x * 13 + y * 7) < 0.06 ? "#9A7C90" : rnd(x * 7 + y * 13) < 0.04 ? "#4E3A52" : c0;
    const pd = ((x - 330) / 46) ** 2 + ((y - 676) / 7) ** 2; if (pd < 1) col = pd > 0.8 ? "#5E4660" : y < 676 ? (bayer(x, y) > 0.5 ? "#F4B4A0" : "#E89AA0") : "#FFD8A0";
    put(x, y, col);
  }
  for (let x = 0; x < 812; x++) { put(x, DECK_Y, "#3A2840"); put(x, DECK_Y + 1, "#4E3A52"); }
  // front edge: a light coping lip, then the facade with windows down to the bottom of the frame
  for (let y = LIP; y < FAC; y++) for (let x = 0; x < 812; x++) put(x, y, y === LIP ? "#FFE6D6" : y < LIP + 3 ? "#E8C0B4" : y > FAC - 3 ? "#5A3E58" : "#B4909E");
  for (let y = FAC; y < 962; y++) for (let x = 0; x < 812; x++) {
    const row = Math.floor((y - FAC) / 6), off = row % 2 ? 7 : 0, joint = (y - FAC) % 6 === 0 || (x + off) % 14 === 0;
    put(x, y, joint ? "#3A2442" : rnd(Math.floor((x + off) / 14) * 17 + row * 5) < 0.2 ? "#58385A" : "#4E3252");
  }
  for (let y = FAC; y < FAC + 6; y++) for (let x = 0; x < 812; x++) put(x, y, mix("#4E3252", "#1E1226", 0.6 * (1 - (y - FAC) / 6)));
  // windows: frames, sills, glass reflecting the pink sky or warm lit rooms with curtains
  for (let wy = FAC + 26; wy < 962; wy += 92) for (let wx = 18; wx < 800; wx += 66) {
    const lit = rnd(wx * 3 + wy) < 0.35, w = 30, h = 46;
    for (let y = wy - 2; y < wy + h + 2; y++) for (let x = wx - 2; x < wx + w + 2; x++) put(x, y, "#7A5A7C");
    for (let y = wy; y < wy + h; y++) for (let x = wx; x < wx + w; x++) {
      const v = (y - wy) / h; let col = lit ? (v < 0.5 ? "#FFD08A" : "#F0AE60") : v < 0.3 ? "#8A6A9C" : v < 0.65 ? (((v - 0.3) / 0.35 > bayer(x, y)) ? "#4A3A6A" : "#6A5088") : "#3A2C58";
      if (x === wx + (w >> 1) || y === wy + (h >> 1)) col = lit ? "#B07858" : "#5A4270";
      if (lit && (x < wx + 6 || x > wx + w - 7)) col = (x + y) % 3 ? "#C8486A" : "#A83458";   // curtains
      if (!lit && x - wx + (y - wy) * 0.6 > 8 && x - wx + (y - wy) * 0.6 < 11) col = "#B898C0";   // faint glint
      put(x, y, col);
    }
    for (let x = wx - 4; x < wx + w + 4; x++) { put(x, wy + h + 2, "#A88498"); put(x, wy + h + 3, "#2A1A30"); }
  }
  // water tower on the deck (left): legs over the parapet, wooden tank with steel bands, cone roof, ladder
  const tx = 56, tTop = 432, tBot = 522;
  for (const [lx, lean] of [[24, -6], [44, -2], [68, 2], [88, 6]]) for (let y = tBot; y < 656; y++) { const x = R(lx + (lean * (y - tBot)) / 134); put(x, y, "#2E2238"); put(x + 1, y, "#5A4466"); }
  for (let y = 560; y < 562; y++) for (let x = 22; x < 92; x++) put(x, y, "#3A2A44"); for (let i = 0; i < 64; i++) { put(26 + i, 530 + R(i * 0.45), "#3A2A44"); put(88 - i, 530 + R(i * 0.45), "#3A2A44"); }
  for (let y = tTop; y < tBot; y++) for (let x = tx - 38; x < tx + 38; x++) {
    const u = (x - tx) / 38; let col = u > 0.62 ? "#E89A6A" : u > 0.3 ? "#B8704C" : u > -0.4 ? "#9A5A40" : "#743F30";
    if ((x - tx + 40) % 7 === 0) col = mix(col, "#3A1E1A", 0.45);
    if ([tTop + 12, tTop + 44, tTop + 76].some((b) => y >= b && y < b + 3)) col = y % 3 === 0 ? "#6A5068" : u > 0.5 ? "#C8A0B0" : "#3A2A44";
    if (Math.abs(u) > 0.97 || y === tBot - 1) col = "#2A1A22";
    put(x, y, col);
  }
  for (let y = tTop - 26; y < tTop + 1; y++) { const k = (y - (tTop - 26)) / 26, hw = R(4 + k * 40); for (let x = tx - hw; x <= tx + hw; x++) put(x, y, x === tx - hw || x === tx + hw || y === tTop ? "#2A1A22" : (x - tx) / hw > 0.45 ? "#B08AA0" : (x - tx) / hw > -0.3 ? "#7A5A74" : "#5A4058"); }
  for (let y = tTop - 34; y < tTop - 26; y++) { put(tx, y, "#2A1A22"); put(tx + 1, y, "#9A7A90"); }
  for (let y = tTop + 6; y < 652; y++) { put(tx + 22, y, "#2E2238"); put(tx + 28, y, "#2E2238"); if ((y - tTop) % 6 === 0) for (let x = tx + 22; x <= tx + 28; x++) put(x, y, "#2E2238"); }
  // LV 8 neon board fixed to the parapet face (the neon itself is lit per frame)
  return L;
}
function paintFront() {
  const L = new Layer(OX - 4, OY + 860, OX + 560, OY + 962), g = L.g, put = (x, y, c) => g.px(x + OX, y + OY, c);
  // a window air conditioner under a lit window (front, bottom-left) and a drain pipe down the facade (right)
  for (let y = 905; y < 930; y++) for (let x = 84; x < 118; x++) put(x, y, y === 905 ? "#C8A8B8" : x === 84 || x === 117 || y === 929 ? "#2A1A30" : (y - 905) % 4 === 2 && x > 88 && x < 113 ? "#4A3A58" : "#7A6888");
  for (let y = 700; y < 962; y++) { put(506, y, "#2A1A30"); put(507, y, "#6A5070"); put(508, y, "#8A7090"); put(509, y, "#2A1A30"); if ((y - 700) % 60 === 0) for (let x = 504; x < 512; x++) put(x, y, "#2A1A30"); }
  return L;
}

// ---------------------------------------------------------------- the LV 8 neon (unlit board, flickers on)
const NEON = { x: 56, y: 496 };
function neonOn(t) {
  const s0 = FAL.sign[0], K = [[0, 0], [0.08, 0.85], [0.16, 0.15], [0.26, 0.95], [0.34, 0.4], [0.46, 1]];
  const u = t - s0; if (u <= 0) return 0; if (u >= 0.46) return 1;
  for (let i = 0; i < K.length - 1; i++) if (u <= K[i + 1][0]) return lerp(K[i][1], K[i + 1][1], (u - K[i][0]) / (K[i + 1][0] - K[i][0]));
  return 1;
}

// ---------------------------------------------------------------- pigeons
function drawPigeon(c, x, y, o = {}) {
  const s = o.s ?? 1, f = o.face ?? 1, a = o.a ?? 1, g = fade(c, a), X = R(x), Y = R(y), gr = o.grade;
  const C = (col) => graded(col, gr);
  const E = (cx, cy, rx, ry, col) => { for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1.05) g.px(R(cx + i), R(cy + j), col); };
  const flap = o.flap, hb = R(o.bob ?? 0);
  // outline pass (slightly larger), then fills
  const parts = (d, body, wing, neck, head) => {
    E(X - f * 2 * s, Y - 8 * s, 9 * s + d, 6.5 * s + d, body);                 // body
    E(X - f * 11 * s, Y - 6 * s, 5 * s + d, 2.5 * s + d, body);                // tail
    E(X + f * 4 * s + f * hb * 0.5, Y - 13 * s, 4.5 * s + d, 5 * s + d, neck);   // neck
    E(X + f * 6 * s + f * hb, Y - 19 * s + hb * 0.5, 4.2 * s + d, 4 * s + d, head);  // head (bobs forward)
  };
  parts(1, C("#2A2838"), null, C("#2A2838"), C("#2A2838"));
  parts(0, C("#A8A8C0"), null, C("#7AA898"), C("#8A8AA6"));
  E(X - f * 4 * s, Y - 5 * s, 7 * s, 3 * s, C("#8A8AA4"));                   // belly shade
  E(X + f * 5 * s, Y - 12 * s, 2.5 * s, 2.5 * s, C("#A07AB8"));              // purple sheen
  // wing: folded (two dark bars) or flapping (up/down)
  if (flap == null) { E(X - f * 3 * s, Y - 9 * s, 6 * s, 3.6 * s, C("#9494AE")); g.px(X - f * R(5 * s), Y - R(8 * s), C("#4A4A5E")); g.px(X - f * R(3 * s), Y - R(8 * s), C("#4A4A5E")); g.px(X - f * R(5 * s), Y - R(10 * s), C("#4A4A5E")); g.px(X - f * R(3 * s), Y - R(10 * s), C("#4A4A5E")); }
  else for (const sd of [-1, 1]) { const tipx = X - f * 2 * s + sd * 12 * s, tipy = Y - 8 * s - flap * 10 * s; g.poly([[X - f * 2 * s - 3 * s, Y - 9 * s], [tipx, tipy], [X - f * 2 * s + 3 * s, Y - 7 * s]], C("#8A8AA6")); g.line(R(X - f * 2 * s), R(Y - 9 * s), R(tipx), R(tipy), C("#4A4A5E")); }
  // eye, beak, feet
  const HX = X + f * hb, HY = Y + R(hb * 0.5);
  g.px(HX + f * R(7 * s), HY - R(20 * s), C("#F08A30")); if (s >= 0.9) g.px(HX + f * R(7 * s), HY - R(19 * s), C("#1A1018"));
  g.px(HX + f * R(10 * s), HY - R(18 * s), C("#E8E8F0")); g.px(HX + f * R(11 * s), HY - R(18 * s), C("#3A3440")); g.px(HX + f * R(11 * s), HY - R(17 * s), C("#3A3440"));
  if (flap == null) { g.px(X - 2, Y - 1, C("#E87A8A")); g.px(X - 2, Y, C("#E87A8A")); g.px(X + 1, Y - 1, C("#E87A8A")); g.px(X + 1, Y, C("#E87A8A")); g.px(X - 3, Y, C("#E87A8A")); g.px(X + 2, Y, C("#E87A8A")); }
}
const PARA_PIGS = [{ x: 352, f: -1, ph: 0.3, fly: [240, -440] }, { x: 392, f: 1, ph: 1.4, fly: [270, -390] }];
function drawParapetPigeons(c, V, t, gr) {
  PARA_PIGS.forEach((p, i) => {
    const t0 = PIG.flee[0] + i * 0.12, k = clamp01((t - t0) / (PIG.flee[1] - t0)); if (k >= 1) return;
    let [x, y] = S(V, p.x, PARAPET), flap = null;
    if (t < t0) { const bob = 2 * Math.max(0, Math.sin(t * 6 + p.ph)) ** 2; drawPigeon(c, x, y, { face: p.f, grade: gr, s: 1, bob }); return; }
    const e = easeIn(k); x += p.fly[0] * e; y += p.fly[1] * e - 10 * Math.sin(Math.PI * Math.min(1, k * 4)); flap = Math.sin(t * 40 + i);
    drawPigeon(c, x, y, { face: p.fly[0] > 0 ? 1 : -1, flap, grade: gr });
  });
}
/** The far-off prey pigeon (beyond the roof edge) and its escape. */
function preyPigeon(t) {
  const [p0, p1] = PIG.prey; if (t < p0 || t > p1) return null;
  const d = PIG.dodge;
  if (t < d) { const k = (t - p0) / (d - p0); return { x: lerp(560, 404, k), y: 548 + Math.sin(t * 6) * 3, flap: Math.sin(t * 26), face: -1, a: 1 }; }
  const k = (t - d) / (p1 - d), e = easeOut(Math.min(1, k * 1.2));   // jinks up-left and escapes out of the frame
  return { x: 404 - 60 * e - 430 * k * k, y: 548 - 36 * Math.sin(Math.PI * Math.min(1, k * 3)) - 340 * k * k, flap: Math.sin(t * 34), face: -1, a: 1, puff: clamp01(k * 3) };
}

// ---------------------------------------------------------------- the falcon's positions (rest-screen head centre)
function falconState(t) {
  const blink = blinkAt(t, 3.4, 0.2);
  if (t < FAL.land[0]) return null;
  if (t < FAL.land[1]) {
    const k = prog(t, FAL.land), e = easeOut(k), y = lerp(-180, 376, e), beat = Math.sin(t * 2 * Math.PI * 3.2);
    return [{ mode: "fly", x: PERCH.x + 18 * (1 - e), y, wing: k < 0.82 ? 0.38 + 0.38 * beat : lerp(0.38 + 0.38 * beat, 0, sm(k, 0.82, 1)), legs: sm(k, 0.3, 0.8), blink, look: [0, 0.3] }];
  }
  if (t < FAL.fold[1]) {
    const k = prog(t, FAL.fold), w = ease(sm(k, 0, 0.7)), y = lerp(376, PERCH.head, ease(k));
    const fly = { mode: "fly", x: PERCH.x, y, wing: w, legs: 1 - sm(k, 0, 0.6), blink, look: [0, 0.15] }, perch = { mode: "perch", x: PERCH.x, y: PERCH.head, squash: 0.35 * Math.sin(Math.PI * k), blink };
    const cf = sm(k, 0.55, 0.95); return cf <= 0 ? [fly] : cf >= 1 ? [perch] : [{ ...fly, a: 1 - cf }, { ...perch, a: cf }];
  }
  if (t < FAL.launch[0]) {
    const breathe = Math.sin(t * 2.4) * 0.5 + 0.5, puff = sm(t, FAL.proud[0], FAL.proud[0] + 0.25) * (1 - sm(t, FAL.proud[1] - 0.2, FAL.proud[1]));
    const happy = sm(t, FAL.proud[0] + 0.08, FAL.proud[0] + 0.24) * (1 - sm(t, FAL.proud[1] - 0.3, FAL.proud[1] - 0.14));
    const squash = ease(prog(t, FAL.crouch)) * 0.9;
    return [{ mode: "perch", x: PERCH.x, y: PERCH.head + R(breathe) - R(puff * 3), puff, happy: happy > 0.6 ? 1 : 0, blink: happy > 0.6 ? 0 : Math.max(blink, happy / 0.6), squash, look: [0, squash > 0.1 ? -0.6 : 0.05], fierce: squash }];
  }
  if (t < FAL.launch[1] + 0.05) {
    const k = prog(t, FAL.launch), y = lerp(PERCH.head + 6, -260, easeIn(k)), cf = sm(k, 0, 0.3);
    const perch = { mode: "perch", x: PERCH.x, y: PERCH.head, squash: 0.9 * (1 - cf), fierce: 1, look: [0, -0.8] }, fly = { mode: "fly", x: PERCH.x, y, wing: 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 6), legs: 0, look: [0, -0.8], fierce: 1 };
    return cf >= 1 ? [fly] : [{ ...perch, a: 1 - cf }, { ...fly, a: cf }];
  }
  return null;
}
// the stoop: a straight dive from the top of the frame, past the pigeon, down behind the parapet
const STOOP_A = [318, -70], STOOP_B = [408, 540], STOOP_C = [420, 700];
function stoopState(t) {
  if (t < FAL.stoop[0] || t > FAL.stoop[1]) return null;
  const k = prog(t, FAL.stoop), kk = easeIn(k * 0.5 + 0.5) * 2 - 1; // fast already, still accelerating
  const p = k < 0.8 ? [lerp(STOOP_A[0], STOOP_B[0], k / 0.8), lerp(STOOP_A[1], STOOP_B[1], k / 0.8)] : [lerp(STOOP_B[0], STOOP_C[0], (k - 0.8) / 0.2), lerp(STOOP_B[1], STOOP_C[1], (k - 0.8) / 0.2)];
  void kk; return { x: p[0], y: p[1], dir: Math.atan2(STOOP_B[1] - STOOP_A[1], STOOP_B[0] - STOOP_A[0]), k };
}
// the race beside the train's nose
const TRAIN_Y = 471, TRAIN_H = 34, CAR = [262, 240, 240];
const noseX = (t) => -36 + TRAIN.speed * (t - TRAIN.run[0]);
// circle back and perch on the radio mast; leave; final pass
const BACK_PATH = spline([[590, 352], [520, 300], [440, 292], [376, 318], [366, 352], [398, 368], [MAST.sx + 1, 340]], 10);
const MAST_HEAD = MAST.top - 2 - R(194 * 0.3);
function mastState(t) {
  const blink = blinkAt(t, 2.9, 0.7), s = 0.3;
  if (t < FAL.back[0] || t > FAL.leave[1] + 0.3) return null;
  if (t < FAL.back[1]) { const k = prog(t, FAL.back), p = along(BACK_PATH, easeOut(k)); return [{ mode: "fly", s, x: p.x, y: p.y, wing: 0.4 + 0.4 * Math.sin(t * 2 * Math.PI * 4), legs: sm(k, 0.7, 1), blink, look: [p.dx < 0 ? -0.6 : 0.6, 0.2] }]; }
  if (t < FAL.perch[1]) { const k = prog(t, FAL.perch), y = lerp(340, MAST_HEAD, ease(k)), cf = sm(k, 0.3, 0.9); const fly = { mode: "fly", s, x: MAST.sx + 1, y, wing: ease(k), legs: 1, blink }, perch = { mode: "perch", s, x: MAST.sx + 1, y: MAST_HEAD, blink }; return cf >= 1 ? [perch] : [{ ...fly, a: 1 - cf }, { ...perch, a: cf }]; }
  if (t < FAL.leave[0]) { const look = [Math.sin(t * 0.9) > 0.3 ? -0.7 : Math.sin(t * 0.9) < -0.5 ? 0.6 : 0, 0.1]; return [{ mode: "perch", s, x: MAST.sx + 1, y: MAST_HEAD + R(Math.sin(t * 2.2) * 0.6), blink, look }]; }
  const k = prog(t, [FAL.leave[0], FAL.leave[1] + 0.3]), cf = sm(k, 0, 0.25);
  const perch = { mode: "perch", s, x: MAST.sx + 1, y: MAST_HEAD, look: [1, 0], squash: 0.6 * (1 - cf) }, fly = { mode: "fly", s, x: MAST.sx + 1 + 220 * easeIn(k), y: MAST_HEAD - 70 * easeIn(k), wing: 0.5 + 0.5 * Math.sin(t * 40), legs: 0, look: [1, 0] };
  return cf >= 1 ? [fly] : [{ ...perch, a: 1 - cf }, { ...fly, a: cf }];
}
const passX = (t) => lerp(-220, 780, prog(t, FAL.pass));
const PASS_Y = 548;

// ---------------------------------------------------------------- the train
let TRAINL = null;
function paintTrain() {
  const len = CAR.reduce((a, b) => a + b, 0) + 6, L = new Layer(-len, 0, 4, TRAIN_H + 4), g = L.g;   // nose tip at x = 0
  const put = (x, y, c) => g.px(x, y, c);
  let x1 = 0;
  for (let ci = 0; ci < CAR.length; ci++) {
    const cl = CAR[ci], x0 = x1 - cl + (ci ? 0 : 0), nose = ci === 0 ? 96 : 0;
    for (let x = x0 + 3; x < x1; x++) {
      const fromNose = x1 - x, topY = ci === 0 && fromNose < nose ? R(lerp(TRAIN_H - 9, 0, Math.pow(fromNose / nose, 0.62))) : 0;
      for (let y = topY; y < TRAIN_H; y++) {
        let col = y === topY ? "#2A2440" : y < topY + 2 ? "#FFF2EE" : y < 12 ? "#F4F2F8" : y < 22 ? "#E8E6F0" : y < 26 ? "#2A5AC8" : y < 28 ? "#F4F2F8" : y < 30 ? "#3A6AD8" : y < TRAIN_H - 1 ? "#C8C6D8" : "#2A2440";
        // window band on the carriages, cab window on the nose
        if (ci === 0 && fromNose >= 70 && fromNose < 94 && y > topY + 2 && y < topY + 8) col = y < topY + 4 ? "#6A8AC0" : "#2A3450";
        if (fromNose >= (ci === 0 ? 110 : 10) && fromNose < cl - 10 && y >= 9 && y < 15) col = (x % 14 < 9) ? (y === 9 ? "#8AA4D8" : "#34405C") : "#E8E6F0";
        if (fromNose > 0 && fromNose < 3 && ci === 0 && y > TRAIN_H - 12 && y < TRAIN_H - 7) col = "#FFF6C0";       // headlight
        if (ci > 0 && (fromNose === 40 || fromNose === cl - 40) && y > 6 && y < 24) col = "#9A98B0";                // doors
        put(x, y, col);
      }
      if (topY > 0) put(x, topY - 1, "#2A2440");
    }
    // gangway between cars
    for (let y = 4; y < TRAIN_H - 2; y++) for (let x = x0; x < x0 + 3; x++) put(x, y, "#2A2440");
    if (ci === 1) { const px = x0 + 120; for (let i = 0; i < 18; i++) { put(px + i, -1 + R(Math.abs(i - 9) * 0.5) - 4 + 4, "#3A3450"); } }
    x1 = x0;
  }
  return L;
}
function drawTrain(c, V, t) {
  if (t < TRAIN.run[0] || t > TRAIN.run[1]) return;
  if (!TRAINL) TRAINL = paintTrain();
  const nx = noseX(t), [sx, sy] = S(V, nx, TRAIN_Y);
  TRAINL.c && TRAINL.blit(c, { X: (wx) => sx + wx, Y: (wy) => sy + wy }, { grade: cityGrade(V) });
  // speed streaks trailing behind the train and above its roof
  const g = fade(c, 0.8);
  for (let i = 0; i < 10; i++) { const y = R(sy + 2 + rnd(i * 3) * (TRAIN_H - 4)), len = 30 + rnd(i * 7) * 60, x0 = R(sx - 760 - rnd(i * 11) * 30 - ((t * 900 + i * 37) % 40)); for (let j = 0; j < len; j++) if (j % 3) g.px(x0 - j, y, "#FFFFFF"); }
}

// ---------------------------------------------------------------- module interface
export function back(c, V, t) {
  if (RANGE[1] < V.x0 - 20 || RANGE[0] - 60 > V.x1) return;
  drawFar(c, V, t, RANGE[0], RANGE[1] + 40);
  drawMid(c, V, t);
  drawViaduct(c, V, t, "back", RANGE[0], RANGE[1] + 40);
  const gr = cityGrade(V);
  // the far-off prey pigeon beyond the roof edge
  const pp = preyPigeon(t); if (pp) { const [x, y] = S(V, pp.x, pp.y); drawPigeon(c, x, y, { s: 1.1, flap: pp.flap, face: pp.face, a: pp.a, grade: gr }); if (pp.puff > 0 && pp.puff < 1) { const [dx, dy] = S(V, 404, 548); for (let i = 0; i < 5; i++) { const an = i * 1.3 + 0.4, r = 4 + pp.puff * 16; fade(c, 1 - pp.puff).px(R(dx + Math.cos(an) * r), R(dy + Math.sin(an) * r * 0.7 + pp.puff * 8), "#E8E8F4"); } } }
  // the stoop (behind the parapet, so the parapet hides where it plunges past the roof)
  if (t > FAL.stoop[0] && t < FAL.stoop[1] + 0.5) {
    // contrail: the path it has already covered, lingering and fading behind it
    const N = 220;
    for (let i = 0; i <= N; i++) {
      const ti = FAL.stoop[0] + (i / N) * (FAL.stoop[1] - FAL.stoop[0]); if (ti > t) break;
      const p = stoopAtTime(ti), al = 1 - (t - ti) / 0.5; if (al <= 0.02) continue;
      const [x, y] = S(V, p[0], p[1]), w = al > 0.6 ? 2 : al > 0.25 ? 1 : 0, g = fade(c, al);
      for (let d = -w; d <= w; d++) g.px(R(x) + d, R(y), Math.abs(d) === w && w > 0 ? "#F8C8DC" : "#FFFFFF");
    }
  }
  const st = stoopState(t);
  if (st) {
    const [x, y] = S(V, st.x, st.y), g = fade(c, 0.9), ux = Math.cos(st.dir), uy = Math.sin(st.dir);
    for (let i = 0; i < 14; i++) { const off = (rnd(i * 5) - 0.5) * 70, len = 70 + rnd(i * 3) * 170; for (let j = 34; j < len; j++) if ((j + i) % 5) g.px(R(x - ux * j - uy * off), R(y - uy * j + ux * off), j < 70 ? "#FFFFFF" : "#F8D8E8"); }
    for (const [back, aa] of [[60, 0.25], [30, 0.5]]) drawFalcon(c, x - ux * back, y - uy * back, { mode: "streak", s: 0.64, dir: st.dir, a: aa, fierce: 1, look: [0.2, 1] });
    drawFalcon(c, x, y, { mode: "streak", s: 0.64, dir: st.dir, fierce: 1, look: [0.2, 1] });
  }
  // the sonic-looking ring mid-dive (bursts open and fades)
  { const rk = (t - FAL.ring) / 0.4; if (rk > 0 && rk < 1) { const p = stoopAtTime(FAL.ring), [rx, ry] = S(V, p[0], p[1] + 30 * rk), dir = Math.atan2(STOOP_B[1] - STOOP_A[1], STOOP_B[0] - STOOP_A[0]), cs = Math.cos(dir - Math.PI / 2), sn = Math.sin(dir - Math.PI / 2);
    for (const [dr, col] of [[0, "#FFFFFF"], [-4, "#BFF0FF"]]) { const r = 14 + easeOut(rk) * 58 + dr, q = fade(c, (1 - rk) * (dr ? 0.7 : 1)); for (let i = 0; i < 120; i++) { const an = (i / 120) * 2 * Math.PI, ex = Math.cos(an) * r, ey = Math.sin(an) * r * 0.3; const X = R(rx + ex * cs - ey * sn), Y = R(ry + ex * sn + ey * cs); q.px(X, Y, col); if (!dr) q.px(X, Y + 1, col); } } } }
  // the bullet train and the falcon neck and neck beside its nose
  drawTrain(c, V, t);
  drawViaduct(c, V, t, "front", RANGE[0], RANGE[1] + 40);
  if (t > FAL.race[0] && t < FAL.race[1]) {
    const nx = noseX(t), lead = 4 + 10 * sm(t, EV.train + 0.1, FAL.race[1]) + 3 * Math.sin(t * 11), [x, y] = S(V, nx + lead, TRAIN_Y - 4 + Math.sin(t * 7) * 2);
    const g = fade(c, 0.85); for (let i = 0; i < 6; i++) { const yy = R(y - 8 + i * 4), len = 40 + rnd(i * 9) * 60; for (let j = 30; j < len; j++) if ((j + i) % 3) g.px(R(x - j), yy, "#FFFFFF"); }
    drawFalcon(c, x, y, { mode: "streak", s: 0.36, dir: 0, fierce: 0.6, look: [0.4, 0] });
  }
  // circling back and sitting on the radio mast (far away: small)
  const ms = mastState(t); if (ms) for (const o of ms) { const [x, y] = S(V, o.x, o.y); drawFalcon(c, x, y, o); }
  // the rooftop
  if (!ROOF) ROOF = paintRoof();
  ROOF.blit(c, V, { grade: gr, wxa: RANGE[0] });
  // LV 8 neon on the parapet: unlit board, then the neon flickers on
  const [nx, ny] = S(V, NEON.x, NEON.y);
  if (nx > -60 && nx < 600) {
    const on = neonOn(t), w = c.measure(MAIN_FONT, "LV 8", { scale: 2 }) + 16, bx = R(nx - w / 2), by = R(ny - 24);
    c.rect(bx - 2, by - 2, w + 4, 28, graded("#1A0E2A", gr)); c.rframe(bx, by, w, 24, graded("#4A2A5A", gr), 2); c.text(MAIN_FONT, "LV 8", bx + 8, by + 5, graded("#3A2448", gr), { scale: 2 });
    if (on > 0) { sign(c, nx, ny, "LV 8", "neon", on, t); if (on > 0.5) glow(c, nx, ny - 12, w * 0.75, 22, "#FF6AD8", 0.16 * on); }
    for (const dx of [-w / 2 + 4, w / 2 - 4]) { c.px(R(nx + dx), by - 3, "#2A1A30"); c.px(R(nx + dx), by - 4, "#2A1A30"); }
  }
}

function stoopAtTime(t) { const s = stoopState(t); return s ? [s.x, s.y] : STOOP_B; }

export function actors(c, V, t) {
  if (RANGE[1] < V.x0 - 20 || RANGE[0] - 140 > V.x1) return;
  const gr = cityGrade(V);
  drawParapetPigeons(c, V, t, gr);
  // the falcon on / at the parapet
  const fs = falconState(t);
  if (fs) for (const o of fs) { const [x, y] = S(V, o.x, o.y); drawFalcon(c, x, y, o); }
  // proud sparkles around the falcon's head
  if (t > FAL.proud[0] && t < FAL.proud[1]) for (let i = 0; i < 4; i++) {
    const u = ((t - FAL.proud[0]) * 1.4 + i * 0.25) % 1, an = -2.4 + i * 0.95, [x, y] = S(V, PERCH.x + Math.cos(an) * 86, PERCH.head - 10 + Math.sin(an) * 64), r = R(4 * Math.sin(Math.PI * u)), g = fade(c, Math.sin(Math.PI * u) * (1 - sm(t, FAL.proud[1] - 0.2, FAL.proud[1])));
    for (let j = -r; j <= r; j++) { g.px(R(x) + j, R(y), "#FFF4B0"); g.px(R(x), R(y) + j, "#FFF4B0"); } g.px(R(x), R(y), "#FFFFFF");
  }
  // launch puff on the parapet
  { const k = prog(t, [FAL.launch[0], FAL.launch[0] + 0.5]); if (k > 0 && k < 1) for (let i = 0; i < 8; i++) { const an = Math.PI + (i / 7) * Math.PI, r = 10 + k * 40, [x, y] = S(V, PERCH.x + Math.cos(an) * r * 1.6, PARAPET - 2 + Math.sin(an) * r * 0.25); fade(c, 1 - k).rect(R(x) - 2, R(y) - 1, 4, 3, "#F4E4E8"); } }
  // the hero: shadow, sprite, radar gun, dust
  const [hx, hy] = S(V, HWX - OX, HWY - OY);
  const lying = sm(t, HIT.fall[0], HIT.fall[1]);
  c.tint(R(hx - 40 + lying * 20), R(hy - 4), R(80 + lying * 170), 9, (X, Y) => { const cx = hx + lying * 104, rx = 36 + lying * 92, d = ((X - cx) / rx) ** 2 + ((Y - hy) / 4.5) ** 2; return d >= 1 ? 0 : 0.5 * (1 - d); }, "#2A1830", 3);
  drawHero(c, hx, hy, t, gr);
  const gs = gunState(t, hx, hy);
  if (gs) drawGun(c, gs.x, gs.y, gs.ang, t, gs.a);
  // dust puff where he lands
  { const k = prog(t, [HIT.fall[1] - 0.04, HIT.fall[1] + 0.6]); if (k > 0 && k < 1) for (let i = 0; i < 12; i++) { const px = hx + 10 + i * 18 + (rnd(i) - 0.5) * 10, r = 3 + k * 9 * (0.6 + rnd(i * 3)), py = hy - 4 - k * 14 * rnd(i * 7); const g = fade(c, (1 - k) * 0.9); for (let j = -r; j <= r; j++) for (let q = -R(r * 0.6); q <= R(r * 0.6); q++) if (j * j + q * q * 2.8 <= r * r) g.px(R(px + j), R(py + q), q < 0 ? "#F8E8EC" : "#D8C0CC"); } }
  // gun landing clack puff
  { const k = prog(t, [HIT.gunFly[1], HIT.gunFly[1] + 0.4]); if (k > 0 && k < 1) { const [x, y] = [hx + 252, hy + 10]; for (let i = 0; i < 6; i++) { const an = Math.PI + (i / 5) * Math.PI, r = 4 + k * 14; fade(c, 1 - k).rect(R(x + Math.cos(an) * r), R(y + Math.sin(an) * r * 0.4), 3, 2, "#F4E4E8"); } } }
}

export function front(c, V, t) {
  if (RANGE[1] < V.x0 - 20 || RANGE[0] - 60 > V.x1) return;
  if (!FRONT) FRONT = paintFront();
  FRONT.blit(c, V, { grade: cityGrade(V) });
  // the last super-fast pass right past him (in front), with a wind blast
  if (t > FAL.pass[0] - 0.05 && t < FAL.pass[1] + 0.5) {
    const k = prog(t, FAL.pass);
    if (k > 0 && k < 1) {
      const [x, y] = S(V, passX(t), PASS_Y), g = fade(c, 0.9);
      for (let i = 0; i < 14; i++) { const yy = R(y - 40 + i * 6 + (rnd(i) - 0.5) * 4), len = 80 + rnd(i * 3) * 200; for (let j = 40; j < len; j++) if ((j + i) % 4) g.px(R(x - j), yy, j < 90 ? "#FFFFFF" : "#F8DCE8"); }
      for (const [dx, aa] of [[-70, 0.25], [-36, 0.45]]) drawFalcon(c, x + dx, y, { mode: "streak", s: 0.9, dir: 0, a: aa, fierce: 1 });
      drawFalcon(c, x, y, { mode: "streak", s: 0.9, dir: 0, fierce: 1, look: [0.6, 0] });
    }
    // wind gust lines sweeping across him
    const wk = prog(t, [HIT.t - 0.04, HIT.t + 0.5]);
    if (wk > 0 && wk < 1) { const [hx, hy] = S(V, HWX - OX, HWY - OY), g = fade(c, 1 - wk); for (let i = 0; i < 10; i++) { const yy = R(hy - 190 + i * 18 + Math.sin(i * 2.1 + t * 20) * 4), x0 = R(hx - 120 + wk * 420 + rnd(i * 13) * 60), len = 30 + rnd(i * 5) * 50; for (let j = 0; j < len; j++) g.px(x0 + j, yy + R(Math.sin((x0 + j) * 0.12 + i) * 2), "#FFFFFF"); } }
  }
  // feathers floating down after the pass
  if (t > HIT.feathers[0]) for (let i = 0; i < 4; i++) {
    const u = t - HIT.feathers[0] - i * 0.08; if (u <= 0) continue;
    const x0 = 300 + i * 34, y0 = PASS_Y - 96 + (i % 2) * 18, [x, y] = S(V, x0 + 26 * Math.sin(u * 2.4 + i) + u * 16, y0 + u * 26 + 4 * Math.sin(u * 4.8 + i)), an = 0.6 * Math.sin(u * 2.4 + i + 0.6), a = sm(u, 0, 0.15);
    const g = fade(c, a), cs = Math.cos(an), sn = Math.sin(an);
    // a small barred falcon feather: dark edge, slate-and-cream vane, white shaft
    for (const pass of [0, 1]) for (let j = -9; j <= 9; j++) { const w = j < -6 ? 0.6 : 3.2 * Math.sqrt(Math.max(0, 1 - ((j + 1) / 10) ** 2)); for (let q = -R(w) - (pass ? 0 : 1); q <= R(w) + (pass ? 0 : 1); q++) { const px = R(x + j * cs - q * sn), py = R(y + j * sn + q * cs); if (!pass) { g.px(px, py, "#1C2236"); continue; } g.px(px, py, q === 0 ? "#F4F6FC" : j > 5 ? SLATE[3] : (j + 20) % 6 === 0 ? SLATE[5] : q < 0 ? "#C4D0E8" : "#A8B8D8"); } }
  }
}

export function hud(c, V, t) {}

/** Head portrait for the speedometer and the guess cards. */
export function ICON(c, cx, cy, a = 1) { falconIcon(c, cx, cy, a); }

import { MAIN as MAIN_FONT } from "../cute.mjs";
