// «Zombie ants» (Halloween) — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps. Flat side view of one
// rainforest at night (moon, bats, fog, fireflies): the next ant on the path with a spore → into the shell → days
// pass, up the tree to the nest → out, shakes, falls → climbs the plant 25 cm → noon, the death grip under leaf B →
// x-ray (fungus around the muscles, not in the brain) → dies → the stalk → spores rain on the path → fossil leaves
// 48 million years old → The Last of Us → too hot for people → a spore lands on the next ant: the first frame.
// No overlay; karaoke captions (pumpkin-orange fill) on a soft dithered shade. Safe zones v1 for every tag and panel.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "./ui.mjs";
import { tag, panel, pointer } from "./hud.mjs";
import { drawAnt, antPoint, toScreen, tline, BRAIN, SPORE_UV, STALK_BASE } from "./ant.mjs";
import { drawSky, drawFar, drawMid, drawTrunk, drawGround, drawPlant, drawMist, layer } from "./draw.mjs";
import { light, hero, corpse, heroOnPath, OLD, others, AMBIENT, ambientSpore, RAIN, STALK_PAD, landingSpore, camera, smooth, ease, lerp, win, clamp01, T, NEST, LEAF_B, STEM, BITE, leafUnder } from "./scene.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, K = "#000000";
const TOP = 156, ZX0 = 36, ZX1 = 504;
const OR = "#F08A3C", GRN = "#8CFF6A", BONE = "#E8E0CC";
const wrapT = (t) => ((t % END) + END) % END;
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));
let C0 = null;
const TG = (lines, cx, y, a, col = OR, ps = 3) => { y = Math.max(TOP, Math.min(560, y)); return tag(C0, lines, cx, y, a, col, ps, { minX: ZX0, maxX: y > 400 ? 440 : ZX1 }); };
const scr = (cam, x, y) => toScreen(cam, x, y);

// ---------------------------------------------------------------- world
function world(c, cam, t) {
  const L = light(t);
  drawSky(c, cam, t, L); drawFar(c, cam, t, L); drawMid(c, cam, t, L);
  drawTrunk(c, cam, t, L); drawGround(c, cam, t, L); drawPlant(c, cam, t, L);
  for (const o of others(t)) if (o.alpha > 0) drawAnt(c, cam, o, t);
  drawAnt(c, cam, { ...OLD, light: L, glow: 0.6 }, t);
  const cp = corpse(t); if (cp) drawAnt(c, cam, cp, t);
  const h = hero(t); if (heroOnPath(t)) drawAnt(c, cam, h, t);
  // the fall: a fading streak above the falling ant so the eye can follow it
  { const a = win(t, T.shake1, T.land, 0.05, 0.15); if (a > 0) { const g = fade(c, a * 0.8); for (let k = 1; k <= 14; k++) { const q = hero(t - k * 0.025), [x, y] = scr(cam, q.x, q.y - 3), [x2, y2] = scr(cam, hero(t - (k - 1) * 0.025).x, hero(t - (k - 1) * 0.025).y - 3); fade(g, 1 - k / 15).line(R(x), R(y), R(x2), R(y2), k < 5 ? "#B8FF8A" : "#6A58A0"); } } }
  spores(c, cam, t);
  drawMist(c, cam, t, L, 0.25 + 0.55 * win(t, EV.where - 0.2, EV.wetEnd + 0.2, 0.4, 0.5));
  return { h, cp, L };
}
function sporeDot(c, cam, x, y, a, big = 1) { if (a <= 0) return; const [X, Y] = scr(cam, x, y); if (X < -6 || X > GW + 6 || Y < -6 || Y > GH + 6) return; const g = fade(c, a), r = Math.max(1, Math.min(6, 0.35 * cam.z * big));
  fade(g, 0.6).disc(R(X), R(Y), R(r + 2), "#1E4A1A"); g.disc(R(X), R(Y), R(r), "#5FE04A"); g.px(R(X), R(Y), "#E8FFD0"); }
function spores(c, cam, t) {
  { const za = smooth(cam.z, 0.6, 1.4); if (za > 0) for (const p of AMBIENT) { const s = ambientSpore(p, t); sporeDot(c, cam, s.x, s.y, s.a * 0.85 * za); } }
  // the rain from the hero's stalk (spawned over "rains spores on the path below")
  const [px, py] = STALK_PAD();
  for (const r of RAIN) { const k = (t - r.t0) / r.dur; if (k < 0 || k > 1) continue; const x = px + r.dx * k + Math.sin(k * 7 + r.ph * 6) * 4, y = lerp(py, -1, k); sporeDot(c, cam, x, y, Math.min(smooth(k, 0, 0.1), 1 - smooth(k, 0.85, 1)), 1.1); }
  const ls = landingSpore(t); if (ls) sporeDot(c, cam, ls.x, ls.y, ls.a, 1.3);
}

// ---------------------------------------------------------------- small pictures
function dial(c, cx, cy, r, a, t, speed) {      // a day/night dial: sun and moon going round
  if (a <= 0) return; const g = fade(c, a); g.disc(R(cx), R(cy), R(r + 2), "#3B2C5C"); g.disc(R(cx), R(cy), R(r), "#120C1D"); g.rect(R(cx - r), R(cy), R(2 * r), 1, "#3B2C5C");
  const an = t * speed; const sx = cx + Math.cos(an) * r * 0.7, sy = cy + Math.sin(an) * r * 0.7, mx = cx - Math.cos(an) * r * 0.7, my = cy - Math.sin(an) * r * 0.7;
  g.disc(R(sx), R(sy), Math.max(2, R(r * 0.22)), P.y); g.disc(R(mx), R(my), Math.max(2, R(r * 0.18)), BONE); g.disc(R(mx + r * 0.08), R(my - r * 0.05), Math.max(1, R(r * 0.14)), "#120C1D");
}
function clock(c, cx, cy, r, a) { if (a <= 0) return; const g = fade(c, a); g.disc(R(cx), R(cy), R(r + 2), OR); g.disc(R(cx), R(cy), R(r), "#1D1430"); for (let i = 0; i < 12; i++) { const an = (i / 12) * 2 * Math.PI; g.px(R(cx + Math.cos(an) * (r - 3)), R(cy + Math.sin(an) * (r - 3)), BONE); }
  g.line(R(cx), R(cy), R(cx), R(cy - r * 0.8), P.y); g.line(R(cx) + 1, R(cy), R(cx) + 1, R(cy - r * 0.6), P.y); g.disc(R(cx), R(cy), 2, P.y); }
function microscope(c, x, y, s, a) { if (a <= 0) return; const g = fade(c, a); g.rect(R(x), R(y + 26 * s), R(22 * s), R(3 * s), P.l); g.rect(R(x + 14 * s), R(y + 6 * s), R(3 * s), R(20 * s), P.l); g.poly([[x + 4 * s, y + 2 * s], [x + 10 * s, y], [x + 16 * s, y + 16 * s], [x + 11 * s, y + 18 * s]], P.cy); g.rect(R(x + 6 * s), R(y + 20 * s), R(9 * s), R(2 * s), P.l); }
function thermo(c, x, y, s, a, k) { if (a <= 0) return; const g = fade(c, a); g.rrect(R(x), R(y), R(8 * s), R(34 * s), BONE, 2); g.rect(R(x + 2 * s), R(y + 2 * s), R(4 * s), R(28 * s), "#1D1430"); const hgt = 26 * s * (0.3 + 0.7 * k); g.rect(R(x + 2 * s), R(y + 30 * s - hgt), R(4 * s), R(hgt), P.pk); g.disc(R(x + 4 * s), R(y + 34 * s), R(5 * s), P.pk); }
function fossil(c, x, y, w, h, a, t) {          // our drawing: a stone slab with a leaf imprint and dumbbell-shaped bite scars on its vein
  if (a <= 0) return; const g = fade(c, a); g.rrect(R(x), R(y), w, h, "#6E6458", 2); g.rrect(R(x + 3), R(y + 3), w - 6, h - 6, "#8A7E6C", 2);
  for (let i = 0; i < 40; i++) g.px(R(x + 6 + ((i * 37) % (w - 12))), R(y + 6 + ((i * 53) % (h - 12))), "#9A8E7A");
  const cx = x + w / 2, cy = y + h / 2, L = w * 0.42; const pts = []; for (let i = 0; i <= 20; i++) { const q = i / 20, u = -L + 2 * L * q, hw = h * 0.3 * Math.sin(Math.PI * q) ** 0.8; pts.push([cx + u, cy - hw]); } for (let i = 20; i >= 0; i--) { const q = i / 20, u = -L + 2 * L * q, hw = h * 0.3 * Math.sin(Math.PI * q) ** 0.8; pts.push([cx + u, cy + hw]); }
  g.poly(pts, "#6A5E4E"); g.line(R(cx - L), R(cy), R(cx + L), R(cy), "#4E4438"); for (let k = -3; k <= 3; k++) { if (!k) continue; g.line(R(cx + k * L / 4), R(cy), R(cx + k * L / 4 + L / 6), R(cy - h * 0.18), "#5A4E40"); g.line(R(cx + k * L / 4), R(cy), R(cx + k * L / 4 + L / 6), R(cy + h * 0.18), "#5A4E40"); }
  // the bite scars: two small holes either side of the vein, joined (dumbbell), here and there
  for (const u of [-0.35, 0.05, 0.4]) { const bx = cx + u * L * 2 * 0.5; g.disc(R(bx - 4), R(cy - 3), 2, "#2A2420"); g.disc(R(bx - 4), R(cy + 3), 2, "#2A2420"); g.rect(R(bx - 5), R(cy - 2), 2, 5, "#2A2420"); }
}

// ---------------------------------------------------------------- story overlays (Halloween cards: orange edges)
function story(c, cam, t, W0) {
  C0 = c; const h = W0.h, cp = W0.cp;
  const heroAt = (u, v) => scr(cam, ...antPoint(h, u, v));
  // the seam: "ZOMBIE ANT" points at the ant on the path (across the loop seam)
  { const a = winW(t, EV.give - 0.1, EV.brain0End + 0.2, 0.35, 0.4); if (a > 0) { const [x, y] = heroAt(0.5, 3.0); const b = TG(["ZOMBIE ANT"], R(x), TOP + 40, a, OR, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 4, a, OR); } }
  { const a = win(t, EV.spore1 - 0.1, EV.seedEnd + 0.15, 0.3, 0.35); if (a > 0) { const [x, y] = heroAt(...SPORE_UV); const b = TG(["SPORE", "A TINY FUNGUS SEED"], R(x), TOP + 30, a, GRN, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 6, a, GRN); } }
  { const a = win(t, EV.grows1 - 0.1, EV.shellEnd, 0.3, 0.3); TG(["GROWS IN", "THROUGH THE SHELL"], 270, TOP, a, GRN, 3); }
  { const a = win(t, EV.forDays - 0.1, EV.normalEnd + 0.15, 0.3, 0.35); if (a > 0) { panel(c, 160, TOP, 220, 92, a, OR); dial(c, 204, TOP + 46, 28, a, t, 2 * Math.PI * 2 / Math.max(0.5, EV.normalEnd - EV.forDays)); stext(c, MAIN, "DAYS PASS", 310, TOP + 24, 2, OR, { align: 0.5, alpha: a }); stext(c, MAIN, "ACTS NORMAL", 310, TOP + 52, 2, BONE, { align: 0.5, alpha: smooth(t, EV.acts - 0.1, EV.acts + 0.2) * a }); } }
  { const a = win(t, EV.nest - 0.15, EV.trees + 0.4, 0.3, 0.35); if (a > 0) { const [x, y] = scr(cam, NEST.x - 12, NEST.y); const b = TG(["NEST", "HIGH IN THE TREES"], R(x) + 90, TOP + 40, a, OR, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x + 4, y - 8, a, OR); } }
  { const a = win(t, EV.shakes - 0.08, EV.falls + 0.25, 0.15, 0.3); if (a > 0) { const [x, y] = heroAt(0, 3); TG(["SHAKES"], R(x) + 70, R(y) - 60, a, P.pk, 3); } }
  { const a = win(t, EV.climbs - 0.1, EV.about + 0.1, 0.3, 0.35); if (a > 0) { const [x, y] = heroAt(0, 2.5); const b = TG(["ZOMBIE ANT"], R(x) - 90, R(y) - 40, a, OR, 2); if (b) pointer(c, b.x + b.w, b.y + b.h / 2, x - 3, y, a, OR); } }
  // 25 cm
  { const a = win(t, EV.twentyfive - 0.1, EV.wetEnd + 0.1, 0.3, 0.35); if (a > 0) { const x = -22, [X0, Y0] = scr(cam, x, 0), [, Y1] = scr(cam, x, LEAF_B.y), k = smooth(t, EV.twentyfive - 0.1, EV.cm + 0.2), g = fade(c, a), Ye = lerp(Y0, Y1, k);
      g.line(R(X0), R(Y0), R(X0), R(Ye), OR); g.line(R(X0) + 1, R(Y0), R(X0) + 1, R(Ye), OR); g.line(R(X0) - 5, R(Y0), R(X0) + 6, R(Y0), OR); if (k > 0.98) g.line(R(X0) - 5, R(Y1), R(X0) + 6, R(Y1), OR);
      TG(["25 CM"], R(X0) - 50, R((Y0 + Y1) / 2) - 20, smooth(t, EV.cm - 0.1, EV.cm + 0.2) * a, OR, 3); } }
  { const a = win(t, EV.warm - 0.1, EV.wetEnd + 0.15, 0.25, 0.35); if (a > 0) { TG(["WARM"], 190, TOP, a, OR, 3); TG(["WET"], 340, TOP, smooth(t, EV.wet - 0.1, EV.wet + 0.2) * a, P.cy, 3); } }
  { const a = win(t, EV.around - 0.1, EV.leaf + 0.2, 0.3, 0.35); if (a > 0) { panel(c, 180, TOP, 180, 84, a, OR); clock(c, 222, TOP + 42, 26, a); stext(c, MAIN, "12:00", 300, TOP + 22, 2, P.y, { align: 0.5, alpha: a }); stext(c, MAIN, "NOON", 300, TOP + 48, 2, BONE, { align: 0.5, alpha: a }); } }
  { const a = win(t, EV.never2 - 0.15, EV.goEnd + 0.05, 0.25, 0.3); if (a > 0) { const [x, y] = heroAt(5.0, 1.6); const b = TG(["DEATH GRIP"], R(x) - 30, TOP + 60, a, P.pk, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y, a, P.pk); } }
  // inside: fungus, muscles, 2017, the brain, the mystery
  if (cp) { const at2 = (u, v) => scr(cam, ...antPoint(cp, u, v));
    { const a = win(t, EV.fungus3 - 0.1, EV.bodyEnd + 0.1, 0.3, 0.35); if (a > 0) { const [x, y] = at2(-3.2, 2.0); const b = TG(["FUNGUS"], 150, TOP, a, GRN, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y, a, GRN);
        const m = smooth(t, EV.muscles - 0.1, EV.muscles + 0.2) * a, [mx, my] = at2(0.8, 2.2), b2 = TG(["MUSCLES"], 380, TOP, m, P.pk, 3); if (b2) pointer(c, b2.x + b2.w / 2, b2.y + b2.h, mx, my, m, P.pk); } }
    { const a = win(t, EV.y2017 - 0.1, EV.everywhere + 0.6, 0.3, 0.35); if (a > 0) { panel(c, 150, TOP, 240, 84, a, P.cy); microscope(c, 170, TOP + 14, 2, a); stext(c, MAIN, "2017", 300, TOP + 18, 3, P.cy, { align: 0.5, alpha: a }); stext(c, MAIN, "3D MICROSCOPE", 300, TOP + 52, 2, BONE, { align: 0.5, alpha: a });
        TG(["FUNGUS EVERYWHERE"], 270, TOP + 98, smooth(t, EV.fungus4 - 0.1, EV.fungus4 + 0.2) * a, GRN, 2); } }
    { const a = win(t, EV.but1 - 0.05, EV.mysteryEnd, 0.3, 0.4); if (a > 0) { const [x, y] = at2(BRAIN[0], BRAIN[1] + 0.6); const b = TG(["BRAIN:", "NO FUNGUS"], R(x) + 20, TOP + 80, a, BONE, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 6, a, BONE); } }
    { const a = win(t, EV.how - 0.1, EV.mysteryEnd + 0.05, 0.3, 0.35); TG(["HOW? STILL", "A MYSTERY"], 270, TOP, a, OR, 3); }
    { const a = win(t, EV.few1 - 0.1, EV.later + 0.6, 0.3, 0.35); if (a > 0) { panel(c, 170, TOP, 200, 76, a, OR); dial(c, 210, TOP + 38, 24, a, t, 2 * Math.PI * 2 / Math.max(0.5, EV.stalk - EV.few1)); stext(c, MAIN, "DAYS", 300, TOP + 18, 2, OR, { align: 0.5, alpha: a }); stext(c, MAIN, "LATER", 300, TOP + 42, 2, BONE, { align: 0.5, alpha: a }); } }
    { const a = win(t, EV.stalk - 0.1, EV.rains - 0.05, 0.3, 0.35); if (a > 0) { const q = cp.stalk, [x, y] = at2(STALK_BASE[0] - 0.4, STALK_BASE[1] + 9 * q); const b = TG(["STALK"], R(x) + 90, R(y) - 30, a, BONE, 3); if (b) pointer(c, b.x, b.y + b.h / 2, x + 3, y, a, BONE); } }
    { const a = win(t, EV.rains - 0.1, EV.below1End + 0.05, 0.3, 0.35); if (a > 0) { const [px, py] = STALK_PAD(), [x, y] = scr(cam, px + 30, py + 90); const b = TG(["SPORES"], R(x) + 80, TOP + 40, a, GRN, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y, a, GRN);
        const p2 = smooth(t, EV.path1 - 0.1, EV.path1 + 0.2) * a, [qx, qy] = scr(cam, -20, -2), b2 = TG(["THE PATH"], R(qx) + 60, 480, p2, OR, 2); if (b2) pointer(c, b2.x + b2.w / 2, b2.y + b2.h, qx, qy - 2, p2, OR); } }
  }
  { const a = win(t, EV.bite - 0.1, EV.oldEnd + 0.15, 0.3, 0.35); if (a > 0) { panel(c, 110, TOP, 320, 190, a, BONE); fossil(c, 130, TOP + 14, 280, 110, a, t); stext(c, MAIN, "FOSSIL LEAF, BITE MARKS", 270, TOP + 134, 2, BONE, { align: 0.5, alpha: a }); stext(c, MAIN, "48 MILLION YEARS", 270, TOP + 158, 3, OR, { align: 0.5, alpha: smooth(t, EV.fortyeight - 0.1, EV.fortyeight + 0.2) * a }); } }
  { const a = win(t, EV.inspired - 0.1, EV.usEnd + 0.1, 0.3, 0.35); TG(["IT INSPIRED", "THE LAST OF US"], 270, TOP, a, OR, 3); }
  { const a = win(t, EV.but2 - 0.1, EV.brain3End + 0.15, 0.3, 0.35); if (a > 0) { panel(c, 110, TOP, 320, 92, a, OR); stext(c, MAIN, "IN THE GAME:", 130, TOP + 16, 2, BONE, { alpha: a }); stext(c, MAIN, "IT TAKES THE BRAIN", 130, TOP + 36, 2, P.pk, { alpha: a }); stext(c, MAIN, "IN REAL LIFE: IT DOESN'T", 130, TOP + 62, 2, GRN, { alpha: smooth(t, EV.brain3 - 0.1, EV.brain3 + 0.2) * a }); } }
  { const a = win(t, EV.cant - 0.1, EV.hotEnd + 0.1, 0.3, 0.35); if (a > 0) { panel(c, 150, TOP, 240, 120, a, P.pk); thermo(c, 176, TOP + 14, 2.4, a, smooth(t, EV.people, EV.hot + 0.3)); stext(c, MAIN, "YOU: 37°C", 300, TOP + 28, 2, BONE, { align: 0.5, alpha: a }); stext(c, MAIN, "TOO HOT", 300, TOP + 58, 3, P.pk, { align: 0.5, alpha: smooth(t, EV.hot - 0.1, EV.hot + 0.2) * a }); stext(c, MAIN, "FOR THE FUNGUS", 300, TOP + 90, 2, BONE, { align: 0.5, alpha: smooth(t, EV.hot - 0.1, EV.hot + 0.2) * a }); } }
  { const a = win(t, EV.next - 0.1, EV.give - 0.15, 0.3, 0.3); if (a > 0) { const [x, y] = heroAt(0.5, 3.0); const b = TG(["THE NEXT ANT"], R(x), TOP + 40, a, OR, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 4, a, OR); } }
}

// ---------------------------------------------------------------- captions (karaoke, pumpkin-orange fill)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : END - 0.12; });
function captions(c, t) {
  for (const g of GROUPS) {
    const first = g === GROUPS[0], last = g === GROUPS[GROUPS.length - 1];
    const show = first ? 0 : g.show, hide = last ? END - 0.17 : g.hide;
    if (t < show || t > hide + 0.16) continue;
    const a = Math.min(smooth(t, show, show + (first ? 0.15 : 0.18)), 1 - smooth(t, hide, hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(255 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, P.ink, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : P.ink) });
      c.text(MAIN, txt, x, y0, P.iv, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(P.iv, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? P.iv : OR) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  t = wrapT(t);
  const c = new Canvas(GW, GH, K), cam = camera(t);
  const W0 = world(c, cam, t);
  story(c, cam, t, W0);
  c.tint(0, 640, GW, 150, (x, y) => 0.6 * Math.sin(Math.PI * (y - 640) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULLBUF = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULLBUF.set(row, y * 2 * 3240); FULLBUF.set(row, (y * 2 + 1) * 3240); }
  return FULLBUF;
}
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4", from = Number(args[1] || 0), upto = Number(args[2] || to);
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", args[3] || out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < upto; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
