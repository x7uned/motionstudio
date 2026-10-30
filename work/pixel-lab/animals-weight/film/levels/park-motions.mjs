// Audible motions of the park (LV5 dog, LV6 human) and the savanna (LV9 elephant) for the 8-bit sound design: every
// entry spans exactly the motion it accompanies, computed from the levels' own timing tables (park.mjs / savanna.mjs
// TIMING) and the timeline's events — no hard-coded seconds. The balance beams' swings are traced with the very same
// spring stepper (park.mjs beamStep) the picture uses. Not listed: idle loops (breathing, blinks, tail wag, ear sway,
// the leash's gentle sway — it never tugs —, fountain water, butterflies, birds).
// Entry: { t0, t1, kind, level, note }.
import { EV } from "../timeline.mjs";
import { TIMING as P, beamStep, BEAM_DT } from "./park.mjs";
import { TIMING as S } from "./savanna.mjs";

const M = [], add = (t0, t1, kind, level, note) => M.push({ t0, t1, kind, level, note });
const rise = (life) => life / 1.6;                     // cute.mjs pickup(): the text rises during the first 1/1.6 of its life

// ================================================================ park · LV5 dog, LV6 human
add(EV.twentyKg, EV.twentyKg + rise(P.PICKUP_LIFE), "pickup", "dog", `20 KG rises above the collie (visible ${P.PICKUP_LIFE} s)`);
add(EV.people, EV.people + rise(P.PICKUP_LIFE), "pickup", "human", `62 KG rises beside the hero (visible ${P.PICKUP_LIFE} s)`);
const loads = { dogs: [["left", "dog", P.D_T], ["right", "wild animal", P.W_T]], people: [["left", "person", P.P_T]] };   // (the 2nd balance's wild animals are already in their pan)
for (const b of P.balances) {
  const lvl = b.id === "dogs" ? "dog" : "human", name = b.id === "dogs" ? "ALL DOGS = WILD LAND MAMMALS" : "ALL PEOPLE vs WILD LAND MAMMALS";
  add(b.t0, b.t0 + P.BAL_FADE[0], "clink", lvl, `brass balance (${name}) dissolves in`);
  add(b.out, b.out + P.BAL_FADE[1], "whoosh", lvl, "the balance dissolves out (camera moving on)");
  // tiny animals / people dropping into the pans: fall DROP_FALL, then a little bounce DROP_BOUNCE
  for (const [side, what, T] of loads[b.id]) T.forEach((t0, i) => add(t0, t0 + P.DROP_FALL + P.DROP_BOUNCE, "drop", lvl, `${what} ${i + 1}/${T.length} drops into the ${side} pan (lands at +${P.DROP_FALL} s)`));
  // beam: trace the spring from the balance's start to its fade-out, split into moving stretches
  const end = b.out + P.BAL_FADE[1], segs = [];
  let th = b.theta0, v = 0, cur = null;
  for (let s = b.t0; s < end; s += BEAM_DT) {
    const before = th; [th, v] = beamStep(th, v, s, b.wL, b.wR, BEAM_DT);
    const moving = Math.abs(v) > 0.03 || Math.abs(th - before) > 1e-4;
    if (Math.abs(th) >= 0.21 && Math.abs(before) < 0.21) add(s, s + 2 * BEAM_DT, "tick", lvl, `beam knocks against its stop (${th > 0 ? "left" : "right"} pan down)`);
    if (moving) { if (cur && s - cur.t1 < 0.08) { cur.t1 = s + BEAM_DT; cur.th1 = th; cur.turns += Math.sign(v) !== cur.dir && v !== 0 ? 1 : 0; if (v) cur.dir = Math.sign(v); } else { cur = { t0: s, t1: s + BEAM_DT, th0: before, th1: th, turns: 0, dir: Math.sign(v) }; segs.push(cur); } }
  }
  for (const g of segs) {
    if (g.t1 - g.t0 < 0.05) continue;
    const d = g.th1 - g.th0, how = Math.abs(g.th1) < 0.03 ? "settles level" : g.th1 > 0 ? "left pan sinks" : "right pan sinks";
    add(g.t0, g.t1, "swing", lvl, `beam swings ${d > 0 ? "toward the left pan" : "toward the right pan"} (${g.th0.toFixed(2)} → ${g.th1.toFixed(2)} rad, ${g.turns} wobble turn${g.turns === 1 ? "" : "s"}), ${how}`);
  }
}
add(P.LBL.dogs[0], P.LBL.dogs[1], "tag", "dog", "ALL DOGS label dissolves in under the left pan");
add(P.LBL.wild[0], P.LBL.wild[1], "tag", "dog", "WILD LAND MAMMALS label dissolves in under the right pan");
add(P.LBL.people[0], P.LBL.people[1], "tag", "human", "ALL PEOPLE label dissolves in under the left pan");
add(P.EQ[0], P.EQ[1], "pop", "dog", "\"=\" badge pops in under the level beam");
add(P.X20.fade[0], Math.max(P.X20.fade[1], P.X20.fade[0] + P.X20.slide), "pop", "human", "×20 dissolves in and slides up under ALL PEOPLE");

// ================================================================ savanna · LV9 elephant
add(S.T_CROWN, S.T_LAND, "whoosh", "elephant", "golden crown falls onto the elephant's head");
add(S.T_LAND, S.T_LAND + S.CROWN_BOUNCE, "clink", "elephant", "crown lands and bounces once (ears give a little flap)");
add(S.SPARKLE[0], S.SPARKLE[1] + S.SPARKLE[3], "sparkle", "elephant", "sparkles circle out from the crown");
add(S.TAG_HEAVY[0], S.TAG_HEAVY[0] + S.TAG_HEAVY[2], "tag", "elephant", "HEAVIEST ON LAND tag dissolves in");
add(EV.six, EV.six + rise(S.PICKUP_LIFE), "pickup", "elephant", `6 T rises beside the head (visible ${S.PICKUP_LIFE} s)`);
S.CLUMPS.map(([, , , d], i) => [S.T_PILE + d, i]).sort((a, b) => a[0] - b[0]).forEach(([t0, i], n) => add(t0, t0 + S.CLUMP_FALL, "rustle", "elephant", `leaf clump ${n + 1}/${S.CLUMPS.length} tumbles onto the pile (bounces in the last 20 %)`));
add(S.TAG_150[0], S.TAG_150[0] + S.TAG_150[2], "tag", "elephant", "150 KG / DAY tag dissolves in");
S.BITES.forEach(([t0], b) => {
  const grab = t0 + S.REACH, lift = grab + S.GRAB, chew = lift + S.LIFT, next = S.BITES[b + 1]?.[0] ?? Infinity, n = b + 1;
  add(t0, grab, "whoosh", "elephant", `bite ${n}: the trunk reaches down-left to the leaf pile (head dips)`);
  add(grab, lift, "rustle", "elephant", `bite ${n}: the trunk tip curls around a leaf bunch`);
  add(lift, chew, "whoosh", "elephant", `bite ${n}: the trunk curls the bunch up to the mouth (mouth opens)`);
  add(chew, chew + S.CHEW, "munch", "elephant", `bite ${n}: chewing, 2 chomps (mouth shut at +${(0.25 * S.CHEW).toFixed(3)} and +${(0.75 * S.CHEW).toFixed(3)} s)`);
  add(chew, chew + S.CRUMBS, "patter", "elephant", `bite ${n}: a few leaf crumbs fall from the mouth`);
  add(chew + S.TRUNK_BACK[0] * S.CHEW, Math.min(chew + (S.TRUNK_BACK[0] + S.TRUNK_BACK[1]) * S.CHEW, next), "whoosh", "elephant", `bite ${n}: the trunk swings back down${next < Infinity ? " (cut short by the next reach)" : ""}`);
});

export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
