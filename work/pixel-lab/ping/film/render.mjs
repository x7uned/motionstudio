// «Why you die behind walls» — pixel film about ping and lag compensation. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the picture runs to the top and bottom edges; captions sit over a soft dithered shade.
// Shots (all continuous, joined by camera moves or dither dissolves, never one-frame cuts):
//   OTS over the gamer's shoulder → push into the monitor → first person: strafe behind the corner, shot, YOU DIED →
//   through the screen to his face (red light) → out to his room in the night city → pan to the game server → packets →
//   the enemy's house and his screen → his shot travels to the server → dive into the server's map: rewind, hit →
//   the news travels back → you die behind the wall → lag compensation, without it you miss → tips → paper plane to the friend.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
const GM = await import(process.env.GAME_MOD ?? "./game.mjs");
const PP = await import(process.env.PEOPLE_MOD ?? "./people.mjs");
import * as Wd from "./world.mjs";
import { P, G, stext, textW, wrect, routeYou, routeEnemy, routeAt, drawPacket } from "./world.mjs";
import { clamp01, smooth, ease, easeOut, lerp, win, tag, pointer, stamp, pingBadge, bubble, rewindClock, paperPlane, picker, panel, bars } from "./hud.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, K = "#000000";
const PI = Math.PI;

// ---------------------------------------------------------------- the desk sets in the rooms (world placement)
const DESK_S = 1.0;
const SETS = {
  you: { room: Wd.ROOM_YOU, who: "you" },
  friend: { room: Wd.ROOM_FRIEND, who: "friend" },
  enemy: { room: Wd.ROOM_ENEMY, who: "enemy" },
};
// world-space key points of each desk set (face, screen centre, PC port, hand), measured once on a scratch canvas
const scratch = new Canvas(GW, GH, K);
for (const s of Object.values(SETS)) {
  const cam = { cx: s.room.chairX, cy: s.room.y1, z: 1 }, g = G(cam);
  const pts = PP.drawDesk(scratch, g.X(s.room.chairX), g.Y(s.room.y1), DESK_S, { who: s.who, t: 0, expr: "focus", screen: { kind: "game", k: 1 } }) || {};
  const w = (p) => (p ? g.inv(p[0], p[1]) : null);
  s.face = w(pts.face) ?? [s.room.chairX + 10, s.room.y1 - 55];
  s.screen = w(pts.screenCenter) ?? [s.room.chairX + 90, s.room.y1 - 50];
  s.pc = w(pts.pcPort) ?? [s.room.chairX + 120, s.room.y1 - 20];
  s.hand = w(pts.hand) ?? [s.room.chairX + 50, s.room.y1 - 40];
  s.desk = pts.deskTop != null ? g.inv(0, pts.deskTop)[1] : s.room.y1 - 40;
}
// the raised hand (holding the paper plane) in world space, measured once
const HAND_UP = (() => { const s = SETS.you, cam = { cx: s.room.chairX, cy: s.room.y1, z: 1 }, g = G(cam), p = PP.drawDesk(scratch, g.X(s.room.chairX), g.Y(s.room.y1), DESK_S, { who: "you", t: 0, expr: "focus", throwArm: 1, screen: { kind: "game", k: 1 } }) || {}; return p.hand ? g.inv(p.hand[0], p.hand[1]) : s.hand; })();
const PLANE_T0 = EV.send + 0.3, PLANE_T1 = EV.dies + 0.15;
const ROUTE_YOU = routeYou(SETS.you.pc), ROUTE_ENEMY = routeEnemy(SETS.enemy.pc);
const rev = (r) => [...r].reverse();

// ---------------------------------------------------------------- game states (first person and the server map)
const Y0 = 4.5, X_PEEK = GM.YOU_PEEK.x, X_COVER = GM.YOU_COVER.x, X_SEEN = 13.2;
function youX(t) { return lerp(X_PEEK, X_COVER, ease((t - EV.strafe[0]) / (EV.strafe[1] - EV.strafe[0]))); }
function yourFP(t, { deathAt = EV.still, diedAt = EV.died, x = null } = {}) {
  const xx = x ?? youX(t), moving = t > EV.strafe[0] && t < EV.strafe[1] + 0.1 && x == null;
  const d = t - deathAt;
  return {
    eye: { x: xx, y: Y0, ang: PI / 2 + (moving ? 0 : 0.02 * Math.sin(t * 1.3)), bob: moving ? Math.sin(t * 14) : 0.15 * Math.sin(t * 2.2), pitch: 0, roll: 0 },
    actors: [{ x: GM.ENEMY_POS.x, y: GM.ENEMY_POS.y, team: "t", face: -PI / 2, run: null, aim: 1 }],
    weapon: "m4", crosshair: 1 - smooth(t, deathAt, deathAt + 0.2),
    hud: { hp: d < 0 ? 100 : 0, ammo: [30, 90], kill: { alpha: smooth(t, deathAt, deathAt + 0.15), killer: "ENEMY", victim: "YOU", head: true } },
    hit: d < 0 ? 0 : smooth(t, deathAt - 0.02, deathAt + 0.1) * (1 - 0.55 * smooth(t, deathAt + 0.1, deathAt + 0.6)),
    tilt: smooth(t, deathAt + 0.02, deathAt + 0.55), gray: smooth(t, deathAt + 0.1, deathAt + 0.6), died: smooth(t, diedAt - 0.02, diedAt + 0.25),
  };
}
// the enemy's (late) view: you strafe slowly across the end of the lane, still in the open
function hisFP(t) {
  const k = clamp01((t - EV.intoEnemy[0]) / (EV.shoots - EV.intoEnemy[0])), x = lerp(12.2, X_SEEN, easeOut(k));
  const fire = win(t, EV.shoots - 0.02, EV.shoots + 0.06, 0.02, 0.16);
  return {
    eye: { x: GM.ENEMY_POS.x, y: GM.ENEMY_POS.y, ang: -PI / 2 + 0.006 * Math.sin(t * 1.7) + (x - 12) * 0.0, bob: 0, pitch: 0, roll: 0 }, fov: 30,
    actors: [{ x, y: Y0, team: "ct", face: 0, run: t < EV.shoots ? t * 6 : null, aim: 0.3, hit: smooth(t, EV.shoots + 0.05, EV.shoots + 0.12) }],
    weapon: "ak", fire, crosshair: 1, hud: null,
    tracer: t > EV.shoots && t < EV.shoots + 0.35 ? { from: [GM.ENEMY_POS.x, GM.ENEMY_POS.y - 0.6], to: [x, Y0], alpha: 1 - smooth(t, EV.shoots + 0.1, EV.shoots + 0.35) } : null,
    hitmark: win(t, EV.shoots + 0.05, EV.shoots + 0.45, 0.04, 0.3),
  };
}
// "without it": you aim perfectly at a runner crossing the far end of the lane; the shot lands where he was
function withoutFP(t) {
  const t0 = EV.without - 0.2, x = lerp(10.4, 13.8, clamp01((t - t0) / 2.6)), fireT = EV.perfectly + 0.15;
  const aimX = t < fireT ? x : lerp(10.4, 13.8, clamp01((fireT - t0) / 2.6));
  const ang = PI / 2 + Math.atan2(-(aimX - 12), 16 - Y0) * 1;
  return {
    eye: { x: 12, y: Y0, ang, bob: 0, pitch: 0, roll: 0 }, fov: 40,
    actors: [{ x, y: 16, team: "t", face: 0, run: t * 6, aim: 0 }],
    weapon: "m4", fire: win(t, fireT - 0.02, fireT + 0.05, 0.02, 0.15), crosshair: 1, hud: null,
    tracer: t > fireT && t < fireT + 0.3 ? { from: [12, Y0 + 0.4], to: [aimX, 16], alpha: 1 - smooth(t, fireT + 0.05, fireT + 0.3) } : null,
  };
}
// the server's map: you behind the wall now; rewound to where he saw you
const MAPCAM = { cx: 13.4, cy: 14.2, ppm: 28 };
function mapState(t) {
  const rw = ease((t - EV.rewind[0]) / (EV.rewind[1] - EV.rewind[0])), back = ease((t - EV.counts - 0.15) / 0.5);
  const x = lerp(X_COVER, X_SEEN, rw * (1 - back));
  const actors = [
    { x: GM.ENEMY_POS.x, y: GM.ENEMY_POS.y, team: "t", face: -PI / 2, run: null, aim: 1 },
    { x, y: Y0, team: "ct", face: rw > 0 && rw < 1 ? 0 : PI, run: rw > 0.02 && rw < 0.98 ? -t * 6 : back > 0.02 && back < 0.98 ? t * 6 : null, aim: 0, hit: smooth(t, EV.hit, EV.hit + 0.1) },
  ];
  // ghost of "now" stays at the corner while the server looks back in time
  const ghostA = 0.5 * smooth(t, EV.rewind[0], EV.rewind[0] + 0.3) * (1 - smooth(t, EV.counts + 0.15, EV.counts + 0.6));
  if (ghostA > 0) actors.push({ x: X_COVER, y: Y0, team: "ct", face: PI, run: null, aim: 0, alpha: ghostA });
  return { cam: MAPCAM, actors, x };
}

// ---------------------------------------------------------------- camera (city)
const FY = SETS.you.face, FE = SETS.enemy.face, FF = SETS.friend.face;
const ROOMV = (room, dy = 0) => ({ cx: room.chairX + 60, cy: (room.y0 + room.y1) / 2 + 30 + dy, z: 2.6 });
const SCR = { cx: Wd.SCREEN.x + Wd.SCREEN.w / 2, cy: Wd.SCREEN.y + Wd.SCREEN.h / 2 };
const WIDE_A = { cx: 415, cy: -210, z: 0.47 }, WIDE_B = { cx: 1130, cy: -190, z: 0.6 };
const CAM = [
  { t: 0, cx: FY[0], cy: FY[1], z: 9 }, { t: EV.faceOut[0], cx: FY[0], cy: FY[1], z: 9 },
  { t: EV.faceOut[0] + 0.9, ...ROOMV(Wd.ROOM_YOU) }, { t: EV.toServer[0], ...ROOMV(Wd.ROOM_YOU) },
  { t: EV.toServer[1], ...WIDE_A }, { t: EV.toEnemy[0], cx: WIDE_A.cx + 20, cy: WIDE_A.cy, z: WIDE_A.z * 1.03 },
  { t: EV.toEnemy[1], ...WIDE_B }, { t: EV.intoEnemy[0], ...WIDE_B },
  { t: EV.intoEnemy[1] + 0.3, ...ROOMV(Wd.ROOM_ENEMY, -40) }, { t: EV.shotTravel[0], ...ROOMV(Wd.ROOM_ENEMY, -40) },
  { t: EV.shotTravel[0] + 0.55, cx: WIDE_B.cx - 60, cy: WIDE_B.cy, z: WIDE_B.z }, { t: EV.dive[0], cx: SCR.cx - 40, cy: SCR.cy - 40, z: 0.85 },
  { t: EV.dive[1], cx: SCR.cx, cy: SCR.cy, z: 10 }, { t: EV.newsTravel[0], cx: SCR.cx, cy: SCR.cy, z: 10 },
  { t: EV.newsTravel[0] + 0.8, ...WIDE_A },
  { t: EV.newsTravel[1] + 0.2, ...ROOMV(Wd.ROOM_YOU, -40) }, { t: EV.wall3 + 0.6, ...ROOMV(Wd.ROOM_YOU, -40) },
  { t: EV.lagComp + 0.3, cx: 0, cy: -300, z: 1.2 }, { t: EV.pick - 0.45, cx: 0, cy: -300, z: 1.2 },
  { t: EV.pick + 0.15, ...ROOMV(Wd.ROOM_YOU, -40) }, { t: EV.send + 0.15, ...ROOMV(Wd.ROOM_YOU, -40) },
  { t: EV.friend + 0.4, ...ROOMV(Wd.ROOM_FRIEND, -40) }, { t: END + 10, ...ROOMV(Wd.ROOM_FRIEND, -40) },
];
export function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
}
// OTS push into the monitor: starts already moving (ease-out)
function otsCam(t) { const u = clamp01((t - EV.push[0]) / (EV.push[1] - EV.push[0])), k = 0.15 * u + 0.85 * ease(u); return { cx: lerp(-20, 0, k), cy: lerp(60, 0, k), z: Math.exp(lerp(Math.log(2.3), Math.log(960 / 90), k)) }; }

// ---------------------------------------------------------------- desk states over time
function deskState(who, t) {
  const st = { who, t, expr: "focus", exprTo: "focus", exprK: 0, mouse: 0.4, lean: 0.2, facepalm: 0, throwArm: 0, screen: { kind: "game", k: 1 }, light: null };
  if (who === "you") {
    const dead1 = t < EV.toServer[0] + 0.6, dead2 = t > EV.die && t < EV.lagComp + 1.2;
    if (dead1 || dead2) { st.screen = { kind: "dead", k: 1 }; st.light = { color: "#E03056", k: 0.7 }; }
    if (t < EV.toServer[0] + 1) { st.expr = "annoyed"; st.mouse = 0; }
    else if (t < EV.every - 0.2) { st.expr = "annoyed"; st.exprTo = "focus"; st.exprK = smooth(t, EV.toServer[0] + 1, EV.every - 0.3); }
    else if (t < EV.die) { st.mouse = t > EV.every && t < EV.back + 0.6 ? 1 : 0.4; }
    else if (t < EV.lagComp + 1.5) { st.expr = "shock"; st.exprTo = "annoyed"; st.exprK = smooth(t, EV.die + 0.15, EV.die + 0.5); st.mouse = 0; }
    else if (t < EV.cable) { st.expr = "annoyed"; st.exprTo = "focus"; st.exprK = smooth(t, EV.lagComp + 1.5, EV.lagComp + 2.2); }
    else { st.expr = "focus"; st.exprTo = "happy"; st.exprK = smooth(t, EV.cable + 0.1, EV.cable + 0.5); }
    st.throwArm = smooth(t, EV.send - 0.15, EV.send + 0.25) * (1 - smooth(t, EV.send + 0.9, EV.send + 1.4)); st.planeHeld = 1 - smooth(t, PLANE_T0 - 0.02, PLANE_T0 + 0.06);
  } else if (who === "enemy") {
    st.expr = "focus"; st.exprTo = "smirk"; st.exprK = smooth(t, EV.open1 - 0.4, EV.open1); st.mouse = 0.7; st.lean = 0.5;
  } else {
    const d = smooth(t, EV.dies - 0.05, EV.dies + 0.15);
    st.screen = { kind: d > 0.5 ? "dead" : "game", k: 1 }; if (d > 0.5) st.light = { color: "#E03056", k: 0.7 };
    st.expr = "focus"; st.exprTo = "annoyed"; st.exprK = smooth(t, EV.dies + 0.1, EV.dies + 0.4); st.facepalm = smooth(t, EV.walls + 0.1, EV.walls + 0.7);
  }
  return st;
}

// ---------------------------------------------------------------- city frame
function drawCity(c, t, cam) {
  const g = G(cam);
  Wd.drawSky(c, cam, t); Wd.drawSkyline(c, cam, t);
  Wd.drawGround(c, cam, t); Wd.drawProps(c, cam, t);
  Wd.drawBlock(c, cam, t); Wd.drawServerHall(c, cam, t, { sign: smooth(t, EV.server - 0.1, EV.server + 0.2), busy: win(t, EV.reaches, EV.counts, 0.2, 0.4) });
  Wd.drawHouse(c, cam, t);
  // the server's map screen (the same map as in the dive)
  const sr = Wd.screenRect(cam); if (sr.x + sr.w > 0 && sr.x < GW && sr.y + sr.h > 0 && sr.y < GH) drawMapInto(c, sr, t);
  // rooms and desk sets
  const pts = {};
  for (const [key, s] of Object.entries(SETS)) {
    const room = s.room; if (g.X(room.x1) < -10 || g.X(room.x0) > GW + 10 || g.Y(room.y1) < -10 || g.Y(room.y0) > GH + 10) continue;
    const st = deskState(s.who, t), dead = st.screen.kind === "dead";
    Wd.drawRoomShell(c, g, room, t, { screenColor: dead ? "#C8304A" : s.who === "enemy" ? "#C8783A" : "#5E8EC8" });
    if (key === "you") drawRouter(c, g, t);
    pts[key] = PP.drawDesk(c, g.X(room.chairX), g.Y(room.y1), DESK_S * g.z, st) || {};
    if (key === "you") { drawBug(c, g, t); drawLanCable(c, g, t, pts.you); }
  }
  return { g, pts };
}
function drawMapInto(c, rect, t) {
  const st = mapState(t), k = rect.h / GH, cam = { cx: st.cam.cx, cy: st.cam.cy, ppm: st.cam.ppm * k };
  GM.drawMap(c, rect, [rect.x, rect.y, rect.x + rect.w, rect.y + rect.h], { cam, actors: st.actors });
  mapOverlay(c, rect, cam, t, st, k);
}

// a little beetle on the desk for "It's not a bug"
function drawBug(c, g, t) {
  const a = win(t, EV.bug - 0.35, EV.ping0 - 0.1, 0.25, 0.3); if (a <= 0) return;
  const s = SETS.you, wx = s.screen[0] - 34 + (t - EV.bug) * 5, wy = s.desk - 1.5, x = g.X(wx), y = g.Y(wy), z = g.z * 1.6, f = fade(c, a);
  const leg = Math.sin(t * 18) > 0 ? 1 : 0;
  for (const dx of [-2, 0, 2]) { f.line(R(x + dx * z), R(y), R(x + (dx + (leg ? 1 : -1)) * z), R(y + 2.6 * z), "#1A1020"); f.line(R(x + dx * z), R(y), R(x + (dx - (leg ? 1 : -1)) * z), R(y - 2.6 * z) , "#1A1020"); }
  f.ellipse(R(x), R(y), R(3.4 * z), R(2.4 * z), "#1A1020"); f.ellipse(R(x - 0.4 * z), R(y - 0.3 * z), R(2.8 * z), R(1.8 * z), "#6E4FB0"); f.line(R(x - 3 * z), R(y), R(x + 2 * z), R(y), "#2A1830");
  f.px(R(x - 1.2 * z), R(y - 1 * z), "#B08AE8"); f.disc(R(x + 3.6 * z), R(y), Math.max(1, R(1.3 * z)), "#1A1020");
  const r = tag(c, ["BUG?"], x, y - 70, a, P.l, 2);
  if (r) { pointer(c, x, r.y + r.h, x, y - 4 * z, a, P.l); const k = smooth(t, EV.notBug - 0.05, EV.notBug + 0.15) * a; if (k > 0) { const ff = fade(c, k); for (let i = 0; i < 3; i++) { ff.line(r.x + 2 + i, r.y + 2, r.x + r.w - 4 + i, r.y + r.h - 3, P.pk); ff.line(r.x + 2 + i, r.y + r.h - 3, r.x + r.w - 4 + i, r.y + 2, P.pk); } } }
}
// the Wi-Fi router on the shelf and the LAN cable to the PC
const ROUTER = [Wd.ROOM_YOU.x1 - 40, Wd.ROOM_YOU.y0 + 30];
function drawRouter(c, g, t) {
  const [rx, ry] = ROUTER, z = g.z;
  wrect(c, g, rx - 9, ry - 6, rx + 9, ry, "#2A2440"); wrect(c, g, rx - 9, ry - 6, rx + 9, ry - 5, "#5A4E74");
  for (const ax of [rx - 6, rx + 6]) wrect(c, g, ax - 0.6, ry - 14, ax + 0.6, ry - 6, "#5A4E74");
  for (let i = 0; i < 3; i++) { const on = Math.sin(t * 7 + i * 2) > 0; wrect(c, g, rx - 5 + i * 3, ry - 3, rx - 4 + i * 3, ry - 2, on ? P.gr : "#16301E"); }
  // Wi-Fi waves: shown while explaining tips; crossed out on "not Wi-Fi"
  const wa = win(t, EV.pick, END, 0.3, 0.1) * (1 - 0.65 * smooth(t, EV.wifi, EV.wifi + 0.4));
  if (wa > 0) { const f = fade(c, wa), cx = g.X(rx), cy = g.Y(ry - 16); for (let i = 1; i <= 3; i++) { const ph = ((t * 1.5 - i * 0.25) % 1 + 1) % 1; f.ering(R(cx), R(cy), R((4 + i * 4) * z * 0.6), R((4 + i * 4) * z * 0.6), mix(P.cy, P.p3, ph * 0.7), -PI * 0.8, -PI * 0.2); } }
  const xa = smooth(t, EV.wifi - 0.05, EV.wifi + 0.25); if (xa > 0) { const f = fade(c, xa), cx = g.X(rx), cy = g.Y(ry - 24), r = 7 * z; for (let k = -1; k <= 1; k++) { f.line(R(cx - r + k), R(cy - r), R(cx + r + k), R(cy + r), P.pk); f.line(R(cx + r + k), R(cy - r), R(cx - r + k), R(cy + r), P.pk); } }
}
function drawLanCable(c, g, t, pts) {
  const k = smooth(t, EV.cable - 0.45, EV.cable + 0.05); if (k <= 0) return;
  const pc = SETS.you.pc, [rx, ry] = ROUTER, path = [[rx + 9, ry - 3], [rx + 14, ry - 3], [rx + 14, Wd.ROOM_YOU.y1 - 6], [pc[0] + 6, Wd.ROOM_YOU.y1 - 6], [pc[0] + 6, pc[1]], [pc[0], pc[1]]];
  let L = 0; const seg = []; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(d); L += d; }
  let left = L * k; for (let i = 1; i < path.length && left > 0; i++) { const d = seg[i - 1], u = Math.min(1, left / d), a = path[i - 1], b = [a[0] + (path[i][0] - a[0]) * u, a[1] + (path[i][1] - a[1]) * u];
    const w = Math.max(1, R(1.6 * g.z)); for (let o = 0; o < w; o++) c.line(R(g.X(a[0])) + (a[1] === b[1] ? 0 : o), R(g.Y(a[1])) + (a[1] === b[1] ? o : 0), R(g.X(b[0])) + (a[1] === b[1] ? 0 : o), R(g.Y(b[1])) + (a[1] === b[1] ? o : 0), "#F4CA50"); left -= d; }
  if (k > 0.98) { const plug = smooth(t, EV.cable, EV.cable + 0.25); fade(c, 1 - plug * 0.6).disc(R(g.X(pc[0])), R(g.Y(pc[1])), Math.max(2, R((2 + 6 * (1 - plug)) * g.z * 0.6)), P.yl); }
}

// ---------------------------------------------------------------- packets
function packets(c, cam, t) {
  const trail = (r, u, du) => [1, 2, 3, 4].map((i) => routeAt(r, u - du * i));
  // your first trip: there (to the server) and back
  { const u1 = clamp01((t - EV.every) / (EV.there - EV.every + 0.05)), u2 = clamp01((t - EV.there - 0.05) / (EV.back + 0.35 - EV.there)), a = win(t, EV.every - 0.1, EV.back + 0.35, 0.15, 0.2);
    if (a > 0) { if (u2 <= 0) drawPacket(c, cam, routeAt(ROUTE_YOU, u1), P.cy, { size: 10, icon: "arrow", alpha: a, trail: trail(ROUTE_YOU, u1, 0.012) }); else drawPacket(c, cam, routeAt(rev(ROUTE_YOU), u2), P.cy, { size: 10, alpha: a, trail: trail(rev(ROUTE_YOU), u2, 0.012) }); } }
  // the steady stream afterwards: your packets fast, his slow
  const loop = (route, t0, t1, period, col, size, off = 0) => { if (t < t0 || t > t1 + period) return; for (let k = Math.floor((t - t0 - period) / period * 2) - 1; k <= Math.floor((t - t0) / period * 2) + 1; k++) { const s = t0 + off + k * period / 2, u = (t - s) / period; if (u < 0 || u > 1 || s < t0 - 0.01) continue; const a = Math.min(smooth(t, s, s + 0.15), 1 - smooth(t, t1, t1 + 0.4)) * 0.85; if (a <= 0) continue; const r = k % 2 ? rev(route) : route; drawPacket(c, cam, routeAt(r, u), col, { size, alpha: a, trail: trail(r, u, 0.01) }); } };
  loop(ROUTE_YOU, EV.trip - 0.1, EV.dive[0], 1.3, P.cy, 7);
  loop(ROUTE_ENEMY, EV.enemy - 0.4, EV.dive[0], 3.4, P.or, 7, 0.6);
  // his shot packet: from his PC to the server
  { const u = clamp01((t - EV.shotTravel[0]) / (EV.shotTravel[1] - EV.shotTravel[0])), a = win(t, EV.shotTravel[0] - 0.05, EV.shotTravel[1], 0.1, 0.25); if (a > 0) drawPacket(c, cam, routeAt(ROUTE_ENEMY, u), P.red, { size: 11, icon: "cross", alpha: a, trail: trail(ROUTE_ENEMY, u, 0.01) }); }
  // the news: from the server to your PC
  { const u = clamp01((t - EV.newsTravel[0] - 0.2) / (EV.newsTravel[1] - EV.newsTravel[0] - 0.25)), a = win(t, EV.newsTravel[0] + 0.15, EV.newsTravel[1] - 0.02, 0.1, 0.25); if (a > 0) drawPacket(c, cam, routeAt(rev(ROUTE_YOU), u), P.red, { size: 11, icon: "skull", alpha: a, trail: trail(rev(ROUTE_YOU), u, 0.012) }); }
}

// ---------------------------------------------------------------- city labels and bubbles
function cityOverlay(c, t, cam, pts) {
  const g = G(cam);
  // "It's ping": a PING badge over the monitor
  { const a = win(t, EV.ping0 - 0.05, EV.toServer[0] + 0.6, 0.25, 0.4); if (a > 0) { const [sx, sy] = SETS.you.screen; tag(c, ["PING"], g.X(sx), g.Y(sy) - 120, a, P.y, 4); } }
  // FAR AWAY: a dimension line between your block and the server
  { const a = win(t, EV.far - 0.1, EV.every - 0.2, 0.3, 0.4); if (a > 0) { const y = g.Y(-30), x0 = g.X(Wd.B1.x1 + 8), x1 = g.X(Wd.B2.x0 - 8), f = fade(c, a); f.line(R(x0), R(y), R(x1), R(y), P.l, [4, 3]); for (const x of [x0, x1]) f.rect(R(x), R(y - 5), 1, 11, P.l); tag(c, ["FAR AWAY"], (x0 + x1) / 2, y - 44, a, P.l, 2); } }
  // round trip counter, then YOUR PING badge pinned above your block (stays)
  const yourMs = lerp(lerp(40, 18, smooth(t, EV.closest, EV.closest + 0.4)), 12, smooth(t, EV.cable, EV.cable + 0.4));
  { const a = win(t, EV.trip - 0.1, EV.yourPing - 0.1, 0.2, 0.2); if (a > 0) { const ms = 40 * clamp01((t - EV.trip) / (EV.time + 0.3 - EV.trip)); tag(c, ["ROUND TRIP", `${Math.round(ms)} MS`], g.X(Wd.B1.x1 + 160), g.Y(-30) - 80, a, P.cy, 2); } }
  { const aa = Math.min(1, win(t, EV.yourPing - 0.05, EV.toEnemy[0] + 0.3, 0.3, 0.3) + win(t, EV.newsTravel[1], EV.lagComp - 0.2, 0.3, 0.3) + win(t, EV.pick - 0.2, EV.send - 0.1, 0.3, 0.3));
    if (aa > 0) { const pulse = win(t, EV.counts2 - 0.3, EV.counts2 + 0.8, 0.1, 0.3); const x = Math.max(100, Math.min(440, g.X(0))), y = Math.max(112, g.Y(-Wd.FH * Wd.B1.floors) - 70); pingBadge(c, x, y, "YOUR PING", yourMs, P.cy, aa, { pulse }); } }
  // HIS PING badge pinned above his house
  { const a = win(t, EV.high - 0.1, EV.shotTravel[0], 0.3, 0.3); if (a > 0) pingBadge(c, Math.min(440, g.X((Wd.B3.x0 + Wd.B3.x1) / 2)), Math.max(112, g.Y(-2 * Wd.FH - 90) - 46), "HIS PING", 150, P.or, a); }
  // HIS SCREEN bubble with his late view
  { const a = win(t, EV.sees - 0.15, EV.shotTravel[0] + 0.15, 0.25, 0.3), pop = smooth(t, EV.sees - 0.15, EV.sees + 0.35);
    if (a > 0) { const from = pts.enemy?.screenCenter ?? [g.X(SETS.enemy.screen[0]), g.Y(SETS.enemy.screen[1])];
      const r = bubble(c, { x: 34, y: 172, w: 472, h: 266 }, "HIS SCREEN", a, P.or, (rect, clip) => GM.drawFP(c, rect, clip, hisFP(t)), { fromX: from[0], fromY: from[1], pop });
      if (r) { const la = win(t, EV.late - 0.1, EV.shotTravel[0], 0.2, 0.3) * a; if (la > 0) tag(c, ["LATE: 0.15 S"], r.x + r.w - 90, r.y + 8, la, P.pk, 2);
        const ya = win(t, EV.hisScreen, EV.shoots + 0.4, 0.25, 0.3) * a; if (ya > 0) { const st = hisFP(t), p = GM.projectFP(r, st.eye, st.actors[0].x, st.actors[0].y, 2.3, st.fov); if (p && p.visible) { tag(c, ["YOU"], p.x, p.y - 48, ya, P.cy, 2); pointer(c, p.x, p.y - 22, p.x, p.y - 8, ya, P.cy); } } } } }
  // YOUR SCREEN bubble: behind the wall, then the news arrives
  { const a = win(t, EV.newsTravel[1] - 0.25, EV.lagComp + 0.2, 0.25, 0.35), pop = smooth(t, EV.newsTravel[1] - 0.25, EV.newsTravel[1] + 0.25);
    if (a > 0) { const from = pts.you?.screenCenter ?? [g.X(SETS.you.screen[0]), g.Y(SETS.you.screen[1])];
      bubble(c, { x: 34, y: 172, w: 472, h: 266 }, "YOUR SCREEN", a, P.cy, (rect, clip) => GM.drawFP(c, rect, clip, yourFP(t, { deathAt: EV.die - 0.05, diedAt: EV.die + 0.2, x: X_COVER })), { fromX: from[0], fromY: from[1], pop }); } }
  // LAG COMPENSATION title, ON PURPOSE stamp
  { const a = win(t, EV.lagComp - 0.1, EV.without - 0.3, 0.3, 0.3); if (a > 0) { const y = 120 + (1 - a) * 6; stext(c, MAIN, "LAG", 270, y, 7, P.y, { align: 0.5, alpha: a, shadow: P.ink }); stext(c, MAIN, "COMPENSATION", 270, y + 70, 4, P.iv, { align: 0.5, alpha: a, shadow: P.ink });
    const s = win(t, EV.purpose - 0.05, EV.without - 0.3, 0.12, 0.3); if (s > 0) stamp(c, "ON PURPOSE", 270, y + 150, s, P.gr, 3, smooth(t, EV.purpose - 0.05, EV.purpose + 0.2)); } }
  // WITHOUT IT bubble: perfect aim, still a miss
  { const a = win(t, EV.without - 0.2, EV.cantFix - 0.25, 0.25, 0.3), pop = smooth(t, EV.without - 0.2, EV.without + 0.25);
    if (a > 0) { const r = bubble(c, { x: 34, y: 172, w: 472, h: 266 }, "WITHOUT IT", a, P.l, (rect, clip) => GM.drawFP(c, rect, clip, withoutFP(t)), { pop });
      if (r) { const ok = win(t, EV.aim, EV.miss - 0.1, 0.2, 0.2) * a; if (ok > 0) tag(c, ["PERFECT AIM"], r.x + r.w / 2, r.y + 10, ok, P.gr, 2);
        const m = win(t, EV.miss - 0.05, EV.cantFix - 0.25, 0.1, 0.3); if (m > 0) stamp(c, "MISS", r.x + r.w / 2, r.y + r.h / 2 + 40, m, P.pk, 4, smooth(t, EV.miss - 0.05, EV.miss + 0.2)); } } }
  // can't fix his ping / yours counts too
  { const a = win(t, EV.cantFix - 0.15, EV.pick - 0.2, 0.25, 0.3); if (a > 0) { pingBadge(c, 270, 150, "HIS PING", 150, P.or, a, { strike: 0 }); const k = smooth(t, EV.hisPing - 0.2, EV.hisPing + 0.2) * a; if (k > 0) tag(c, ["CAN'T FIX"], 270, 200, k, P.pk, 2); } }
  { const a = win(t, EV.yourPing2 - 0.15, EV.pick - 0.2, 0.25, 0.3); if (a > 0) pingBadge(c, 270, 260, "YOUR PING", 40, P.cy, a, { pulse: win(t, EV.counts2, EV.counts2 + 0.6, 0.1, 0.3) }); }
  // the server picker, then the LAN cable
  { const a = win(t, EV.pick - 0.2, EV.cable - 0.2, 0.25, 0.3); if (a > 0) picker(c, 120, 150, 300, [["FAR", 85], ["USUAL", 40], ["CLOSEST", 12]], lerp(1, 2, ease((t - EV.closest + 0.15) / 0.35)), a, smooth(t, EV.closest + 0.25, EV.closest + 0.45)); }
  { const a = win(t, EV.cable - 0.4, EV.send - 0.2, 0.25, 0.3); if (a > 0) { tag(c, ["CABLE"], g.X(SETS.you.pc[0]), g.Y(Wd.ROOM_YOU.y0) - 90, smooth(t, EV.cable - 0.1, EV.cable + 0.15) * a, P.y, 2); const w = smooth(t, EV.wifi - 0.05, EV.wifi + 0.2) * a; if (w > 0) tag(c, ["NOT WI-FI"], g.X(ROUTER[0]) - 30, g.Y(Wd.ROOM_YOU.y0) - 140, w, P.pk, 2); } }
  // the paper plane to your friend, SEND → SENT
  { const t0 = PLANE_T0, t1 = PLANE_T1, u = clamp01((t - t0) / (t1 - t0)), a = smooth(t, t0 - 0.03, t0 + 0.03) * (1 - smooth(t, t1 + 0.05, t1 + 0.4));
    const A = HAND_UP, B = [SETS.friend.screen[0] - 30, Wd.ROOM_FRIEND.y1 - 34];
    if (a > 0 && u < 1) { const path = (q) => { const e = ease(q); return [lerp(A[0], B[0], e) + Math.sin(e * PI) * 150, lerp(A[1], B[1], Math.pow(e, 0.8)) - Math.sin(e * PI) * 40]; }; const [cx, cy] = path(u), [nx, ny] = path(clamp01(u + 0.01));
      paperPlane(c, g.X(cx), g.Y(cy), Math.atan2(ny - cy, nx - cx), 1.25 * g.z, a); }
    const sa = win(t, EV.send - 0.1, END, 0.25, 0.1), sent = smooth(t, t1 + 0.1, t1 + 0.35);
    if (sa > 0) { const x = 270, y = 150; if (sent < 1) tag(c, ["SEND"], x, y, sa * (1 - sent), P.cy, 4); if (sent > 0) tag(c, ["SENT ✓"], x, y, sa * sent, P.gr, 4); } }
}

// ---------------------------------------------------------------- overlays on the server's map (scale k = rect.h / 960)
function mapOverlay(c, rect, cam, t, st, k) {
  if (k < 0.3) return; const proj = (x, y, zz = 0) => GM.projectMap(rect, cam, x, y, zz), ps = Math.max(1, 2 * k), X = (u) => rect.x + u * k, Y = (v) => rect.y + v * k;
  const you = proj(st.x, Y0, 0), cover = proj(X_COVER, Y0, 0), en = proj(GM.ENEMY_POS.x, GM.ENEMY_POS.y, 0);
  // title (top-left): this is the server's copy of the game
  { const a = win(t, EV.dive[1] - 0.3, EV.newsTravel[0], 0.3, 0.2); if (a > 0) tag(c, ["SERVER"], X(70), Y(112), a, P.l, ps, { minX: rect.x + 6, maxX: rect.x + rect.w - 6 }); }
  { const a = win(t, EV.dive[1] - 0.3, EV.newsTravel[0], 0.3, 0.2); if (a > 0) tag(c, ["ENEMY"], en[0], en[1] - 96 * k, a, P.or, ps, { minX: rect.x + 6, maxX: rect.x + rect.w - 6 }); }
  { const a = win(t, EV.byNow - 0.1, EV.rewind[0], 0.2, 0.3); if (a > 0) { tag(c, ["NOW"], cover[0], cover[1] + 22 * k, a, P.cy, ps, { minX: rect.x + 6, maxX: rect.x + rect.w - 6 }); } }
  // the rewind: tint + scanlines + the clock over the east block
  { const a = win(t, EV.turns - 0.1, EV.counts + 0.4, 0.3, 0.4); if (a > 0) {
      const rw = clamp01((t - EV.rewind[0]) / (EV.rewind[1] - EV.rewind[0])), scan = (t * 240) % 16;
      c.tint(Math.max(0, R(rect.x)), Math.max(0, R(rect.y)), Math.min(GW, R(rect.w)), Math.min(GH, R(rect.h)), (x, y) => a * (0.16 + ((y - scan) % 16 < 2 && rw > 0 && rw < 1 ? 0.25 : 0)), "#3B2C5C", 4);
      rewindClock(c, X(430), Y(330), 40 * k, -PI / 2 - rw * 2 * PI, a);
      const ms = Math.round(150 * ease(rw)); tag(c, ["TIME", `-${ms} MS`], X(430), Y(400), a, P.l, ps, { minX: rect.x + 6, maxX: rect.x + rect.w - 6 }); } }
  // his line of sight at the moment he fired, then the shot
  { const a = win(t, EV.fired - 0.1, EV.counts + 0.4, 0.2, 0.3); if (a > 0) { const e = proj(GM.ENEMY_POS.x, GM.ENEMY_POS.y, 1.3), y = proj(st.x, Y0, 1.3), f = fade(c, a * 0.9); f.line(R(e[0]), R(e[1]), R(y[0]), R(y[1]), P.y, [5, 4]); } }
  { const a = win(t, EV.backThen - 0.1, EV.counts + 0.4, 0.2, 0.3); if (a > 0) { fade(c, a).ering(R(you[0]), R(you[1]), R(24 * k), R(10 * k), P.y); tag(c, ["IN THE", "OPEN"], you[0] - 120 * k, you[1] + 30 * k, a, P.y, ps, { minX: rect.x + 6, maxX: rect.x + rect.w - 6 }); } }
  { const a = win(t, EV.hit - 0.05, EV.hit + 0.35, 0.03, 0.25); if (a > 0) { const e = proj(GM.ENEMY_POS.x, GM.ENEMY_POS.y, 1.3), y = proj(st.x, Y0, 1.3), f = fade(c, a); for (let o = -1; o <= 1; o++) f.line(R(e[0]) + o, R(e[1]), R(y[0]) + o, R(y[1]), P.red); f.disc(R(y[0]), R(y[1]), R(6 * k), P.yl); } }
  { const a = win(t, EV.hit, EV.newsTravel[0] + 0.1, 0.1, 0.2); if (a > 0) stamp(c, "HIT ✓", X(410), Y(520), a, P.gr, 4 * k, smooth(t, EV.hit, EV.hit + 0.2)); }
}

// ---------------------------------------------------------------- captions (karaoke, same style as the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 1.2) - 0.15; });
const CAP_Y = 690;
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = CAP_Y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, P.ink, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : P.ink) });
      c.text(MAIN, txt, x, y0, P.iv, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(P.iv, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? P.iv : P.y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
const L1 = new Canvas(GW, GH, K), L2 = new Canvas(GW, GH, K), TMP = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }

function openingLayer(c, t) {
  // OTS push into the monitor, then first person full screen
  const cam = otsCam(t), fp = yourFP(t);
  if (cam.z < 960 / 90 - 1e-3) PP.drawOTS(c, cam, { t, mouse: 1, who: "you" }, (rect, clip) => GM.drawFP(c, rect, clip, fp));
  else { const w = lerp(1706.67, GW, ease((t - EV.push[1] - 0.05) / 0.45)); GM.drawFP(c, { x: 270 - w / 2, y: 0, w, h: 960 }, [0, 0, GW, GH], fp); }
}
function faceLayer(c, t) {
  c.rect(0, 0, GW, GH, "#0B0812");
  const k = smooth(t, EV.faceIn[0] - 0.15, EV.faceIn[1] + 0.2), s = lerp(1.12, 1.0, easeOut(k)) * lerp(1, 0.94, smooth(t, EV.faceOut[0], EV.faceOut[1]));
  const red = 1 - 0.0 * smooth(t, EV.right, EV.faceOut[1]);
  PP.drawFace(c, 270, 500, s, { who: "you", t, expr: "shock", exprTo: "annoyed", exprK: smooth(t, EV.annoyed - 0.05, EV.annoyed + 0.3), light: { color: "#E03056", k: 0.8 * red } });
}

export function frame(t) {
  const c = new Canvas(GW, GH, K); c.__tmp = TMP;
  const faceA = smooth(t, EV.faceIn[0] - 0.18, EV.faceIn[1] + 0.12), cityA = smooth(t, EV.faceOut[0], EV.faceOut[1]);
  if (faceA < 1) openingLayer(c, t);
  if (faceA > 0 && cityA < 1) { L1.__tmp = TMP; faceLayer(L1, t); dissolve(c, L1, faceA); }
  if (cityA > 0) {
    const cam = camera(t);
    const L = cityA >= 1 ? c : L2; L.__tmp = TMP;
    if (cam.z >= 9.99 && t > EV.dive[0]) { // inside the server's map: full frame
      drawMapInto(L, { x: 0, y: 0, w: GW, h: GH }, t);
    } else {
      const { pts } = drawCity(L, t, cam);
      packets(L, cam, t);
      cityOverlay(L, t, cam, pts);
    }
    if (L !== c) dissolve(c, L, cityA);
  }
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(PI * (y - 640) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
}
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s), t0 = Date.now(); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t, Date.now() - t0, "ms"); }
} else if (args[0] === "--video") {
  const from = Number(args[1] ?? 0), to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
