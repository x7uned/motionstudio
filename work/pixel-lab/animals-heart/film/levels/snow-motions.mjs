// Timed motions of LV2 snow, LV10 wall and the twist panels, for the 8-bit sound design (each sound lasts exactly as
// long as its motion). Every window comes from the timing tables the level code itself draws with (SNOW_T in
// levels/snow.mjs, WALL_T in levels/wall.mjs, TWIST_T in levels/wall-twist.mjs) — no seconds are typed here.
// MOTIONS: [{ t0, t1, kind, level, note }], sorted by t0. Not included on purpose: the shrew's jitter and every heart
// pulse (the heartbeat track covers them), the "+80 BPM" / "+5 BPM" / "+1,511 BPM" pickups (shared pickup sound).
import { LV } from "../timeline.mjs";
import { SNOW_T, walkAmount } from "./snow.mjs";
import { WALL_T } from "./wall.mjs";
import { TWIST_T } from "./wall-twist.mjs";

const M = [], add = ([t0, t1], kind, level, note) => M.push({ t0, t1, kind, level, note });
const S = SNOW_T, W = WALL_T, T = TWIST_T;

// ---------------------------------------------------------------- LV2 · groundhog (snow.mjs)
add(S.snowfall, "shimmer", "snow", "snow starts falling (density fades in)");
add(S.yawn, "huh", "snow", "sleepy yawn: mouth opens and closes");
// waddle: the feet lift on alternate half-cycles of the walk phase (linear over S.walk, S.stepCycles cycles);
// a step counts while the waddle is clearly on (walkAmount at its middle > 0.25)
{ const [a, b] = S.walk, half = S.stepCycles * 2;
  for (let n = 0; n < half; n++) { const t0 = a + ((b - a) * n) / half, t1 = a + ((b - a) * (n + 1)) / half; if (walkAmount((t0 + t1) / 2) > 0.25) add([t0, t1], "step", "snow", `waddle step ${n % 2 ? "right" : "left"} foot`); } }
add(S.hop, "boing", "snow", "little hop at the burrow entrance");
add(S.puff, "whoosh", "snow", "dives into the hole inside a puff of snow (puff expands and settles)");
add(S.roll, "slide", "snow", "rolls as a ball out of the tunnel into the chamber");
add(S.settle, "boing", "snow", "small bounce as the ball lands on the bedding");
{ const { t0, every, life, n } = S.zzz; for (let k = 0; k < n; k++) { const s = t0 + k * every; if (s < LV.groundhog[1] - 0.5) add([s, s + life], "tick", "snow", `Z ${k + 1} rises and fades`); } }
add([Math.min(S.frostWalls[0], S.frostFur[0]), Math.max(S.frostWalls[1], S.frostFur[1])], "shimmer", "snow", "frost spreads over the chamber walls and the fur");
add(S.thermoIn, "tag", "snow", "thermometer dissolves in on the chamber wall");
add(S.thermoFall, "slide", "snow", "thermometer falls from warm red to icy blue");
add(S.tagHib, "tag", "snow", "HIBERNATING tag");
add(S.fat, "glow", "snow", "golden fat glow inside the sleeping groundhog");
add(S.tagFat, "tag", "snow", "FAT LASTS TILL SPRING tag");
S.drops.forEach((w, i) => add(w, "pop", "snow", `snowdrop ${i + 1} grows and its bell opens`));
add(S.tagsOut, "tagout", "snow", "HIBERNATING / FAT tags fade out");

// ---------------------------------------------------------------- LV10 · Etruscan shrew (wall.mjs)
add(W.ribbon, "draw", "wall", "gold RECORD ribbon unrolls from the centre");
add(W.ribbonText, "clink", "wall", "trophy and the word RECORD appear on the ribbon");
add(W.ribbonOut, "tagout", "wall", "RECORD ribbon fades as the twist begins");
add(W.huh, "pop", "wall", "!? bubble pops up beside the shrew");
add(W.huhOut, "tagout", "wall", "!? bubble fades as the counter arrives");

// ---------------------------------------------------------------- the twist panels (wall-twist.mjs)
add(T.dimIn, "whoosh", "twist", "scene dims for the twist panels");
add(T.counterIn, "tag", "twist", "counter panel appears");
add(T.count, "count", "twist", "counter rolls up from 0 to 1,000,000,000");
add(T.approx, "pop", "twist", "≈ sign appears, number turns gold");
add(T.perLife, "tag", "twist", "HEARTBEATS PER LIFE line appears");
add(T.life, "glow", "twist", "LIFE flashes on the word life");
add(T.mouse, "pop", "twist", "mouse portrait (with its empty bar) appears");
add(T.mouseLabel, "tag", "twist", "2 YEARS label");
add(T.eleph, "pop", "twist", "elephant portrait (with its empty bar) appears");
add(T.elephLabel, "tag", "twist", "60 YEARS label");
add(T.fill, "draw", "twist", "both heartbeat bars fill to the same length");
add(T.equals, "pop", "twist", "= sign between the bars");
add(T.billion, "tag", "twist", "≈ 1 BILLION label");
add(T.panelsOut, "tagout", "twist", "counter, portraits, bars and labels fade out");
add(T.dimOut, "whoosh", "twist", "scene brightens as the camera starts the dive");
add(T.hero, "pop", "twist", "hero portrait appears");
add(T.threeBars, "tag", "twist", "three empty bars appear under the hero");
add(T.three, "tag", "twist", "3 BILLION label");
T.threeFill.forEach((w, i) => add(w, "draw", "twist", `hero bar ${i + 1} of 3 fills`));
add(T.heroOut, "tagout", "twist", "hero panel fades out before the final question");

M.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
for (const m of M) if (!(m.t1 > m.t0)) throw new Error(`empty motion window: ${m.note}`);
export const MOTIONS = M;
