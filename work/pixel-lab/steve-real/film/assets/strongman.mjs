// steve-real · strongman (new, 2026-10-28): a strongman in a red singlet built on the people rig (lib/people-rig.mjs) with
// our own barbell (long bar, big dark plates). States: rest (bar on the floor) / lift (bar rises overhead, arms up, a strain
// tremble) / lower (bar eases back down) / look (lowers it and looks at a target). Not a real athlete.
import { drawPerson, SKIN, hairRamp, clothRamp } from "../lib/people-rig.mjs";
const R = Math.round, TAU = Math.PI * 2;
const CFG = { kind: "strongman", hw: 66, hh: 92, skin: SKIN.tan, hair: { style: "buzz", ramp: hairRamp("#2A1A10") }, iris: ["#1A1020", "#3A2414", "#5A3A20", "#7A5230", "#9A6A40"],
  shirt: clothRamp("#D8343C"), shortSleeve: true, pants: clothRamp("#2A2A44"), shoe: clothRamp("#3A3A50"), neck: "v", stripe: "#FF8A80", cuffs: null, dims: {} };
const ZERO = { look: 0, point: 0, wave: 0, talk: 0, happy: 0, surp: 0 };
function plateDisc(c, x, y, h, col, dk) { c.rrect(R(x - 3), R(y - h / 2), 7, R(h), "#07060E", 2); c.rrect(R(x - 2), R(y - h / 2) + 1, 5, R(h) - 2, col, 1); c.rect(R(x - 2), R(y - h / 2) + 2, 1, R(h) - 4, dk); }
export default {
  kind: "strongman", covers: ["strongman", "weightlifter", "athlete", "barbell"], source: "steve-real/film (new, on lib/people-rig)",
  desc: "strongman in a red singlet with a heavy barbell: rests, lifts it overhead trembling, lowers it, looks over",
  hw: 66, hh: 92, start: "stands by the barbell",
  states: { rest: [0.4, "stands, barbell on the floor"], lift: [0.9, "lifts the barbell overhead, trembling", "rise"], lower: [1.0, "lowers the barbell slowly", "thud"], look: [0.5, "looks at a target", "blip"] },
  base: { lift: 0, look: 0 }, st: { rest: { lift: 0, look: 0 }, lift: { lift: 1 }, lower: { lift: 0 }, look: { lift: 0, look: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const v = s.v, lift = v.lift, strain = lift * (1 - Math.abs(Math.sin(Math.PI * Math.min(1, s.acc("lift") * 1.2))) * 0) , tr = 1.3 * Math.sin(TAU * 7 * t) * strain * z;
    const ps = { ...s, v: { ...ZERO, happy: lift, point: v.look * 0.0, look: v.look }, acc: (st) => st === "happy" ? s.acc("lift") * 0.6 : 0 };
    const r = drawPerson(c, CFG, cx + tr * 0.4, cy, z, t, ps);
    const top = (r && r.box ? r.box.y0 + 14 * z : cy - 90 * z), feet = cy + 92 * z, by = feet - 14 * z + (top + 6 * z - (feet - 14 * z)) * lift, half = 84 * z;
    const x0 = R(cx - half + tr), x1 = R(cx + half + tr), byR = R(by + tr * 0.3);
    c.rect(x0, byR - 1, x1 - x0, 3, "#07060E"); c.rect(x0, byR, x1 - x0, 1, "#C8C8D8");
    for (const sx of [-1, 1]) { const px = sx < 0 ? x0 + 6 : x1 - 6; plateDisc(c, px, byR, 50 * z, "#2E2C40", "#5A5674"); plateDisc(c, px - sx * 8, byR, 44 * z, "#3A3850", "#6A6688"); plateDisc(c, px - sx * 16, byR, 36 * z, "#2E2C40", "#5A5674"); c.rect(R(px + sx * 5), byR - 3, 3, 6, "#9A98B0"); }
    return { box: { x0: Math.min(x0, r?.box?.x0 ?? x0), y0: Math.min(byR - 18 * z, top), x1: Math.max(x1, r?.box?.x1 ?? x1), y1: feet }, pt: [cx, top], face: r?.face };
  },
};
