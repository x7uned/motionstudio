// catalog-v1 item «sound-wave»: the cat-zoomies sound arcs (ivory arcs with a dark outline that grow out and fade, three
// at a time), ported from work/pixel-lab/cat-zoomies/film/hud.mjs soundWaves (copy in lib/zoomies-hud.mjs), as a world
// effect prop: rings all round its slot, or a cone of arcs travelling toward its target; optional label = the sound word.
// The phase is integrated (∫ rate dt), so getting louder / faster never jumps.
import { soundWaves, otext, tw } from "./lib/zoomies-hud.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerpAng = (a, b, k) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * k;   // shortest way round
export default {
  kind: "sound-wave",
  covers: ["sound-wave"],
  source: "cat-zoomies/film/hud.mjs#soundWaves",
  desc: "sound waves: ivory arcs pulsing out (rings all round, or toward the target); optional label = the sound word",
  hw: 84, hh: 84, start: "soft rings pulse outward",
  text: true,
  states: {
    quiet: [0.5, "soft, small rings all round"],
    loud: [0.5, "big, fast, thick rings all round", "swell"],
    silent: [0.6, "the arcs fade away: silence", "dim"],
    pulse: [0.7, "one strong yellow ring bursts out", "sonar"],
    toward: [0.6, "the arcs narrow into a cone that travels toward the target prop", "whoosh"],
  },
  base: { amp: 0.5, rate: 0.9, loud: 0, toward: 0 },
  st: {
    quiet: { amp: 0.5, rate: 0.9, loud: 0, toward: 0 },
    loud: { amp: 1, rate: 1.6, loud: 1, toward: 0 },
    toward: { amp: 0.85, rate: 1.3, loud: 0.4, toward: 1 },
    pulse: { amp: 0.9, rate: 1.2, loud: 0.5 },
    silent: { amp: 0, rate: 0.6, loud: 0 },
  },
  demo: { target: true, label: "MEOW" },
  notes: "World effect prop (moves with the camera). quiet / loud / pulse / silent = rings all round the slot; toward = a cone of arcs travelling at the target, so give it a target. the aim eases with the target's presence (engine lookK), so a target may enter later. The label (the sound word from the script) sits at a fixed place above the slot and dissolves with the waves.",
  draw(c, cx, cy, z, t, s) {
    // aimed cone eases with the target's presence (lookK): no one-frame re-aim when the target enters later
    const v = s.v, k = s.integ((q) => q.rate), tow = s.look ? v.toward * s.lookK : 0;
    const ang = s.look ? lerpAng(-Math.PI / 2, Math.atan2(s.look[1] - cy, s.look[0] - cx), s.lookK) : -Math.PI / 2;
    const reach = (36 + 64 * v.amp) * z, spread = lerp(Math.PI, 0.75, tow);
    // aimed: the source moves back so the cone of arcs is centred on the slot
    const sx = cx - Math.cos(ang) * reach * 0.45 * tow, sy = cy - Math.sin(ang) * reach * 0.45 * tow;
    soundWaves(c, sx, sy, k, { ang, spread, reach, amp: v.amp, z, th: 3 + 1.5 * v.loud, burst: s.acc("pulse"), burstCol: s.theme?.hot ?? "#FFE38E" });
    const ext = reach + 4 * z, box = { x0: Math.min(sx, cx) - ext * (1 - tow) - 8, y0: Math.min(sy, cy) - ext * (1 - tow) - 8, x1: Math.max(sx, cx) + ext * (1 - tow) + 8, y1: Math.max(sy, cy) + ext * (1 - tow) + 8 };
    if (tow > 0) { const ex = sx + Math.cos(ang) * reach, ey = sy + Math.sin(ang) * reach; box.x0 = Math.min(box.x0, ex - 10, sx - 10); box.x1 = Math.max(box.x1, ex + 10, sx + 10); box.y0 = Math.min(box.y0, ey - 10, sy - 10); box.y1 = Math.max(box.y1, ey + 10, sy + 10); }
    let textBox;
    if (s.label) {
      // the sound word sits at a fixed place above the slot (2× pixel font, dark outline: big rings may pass behind it),
      // dissolving with the waves' strength
      const w = tw(c, s.label, 2), lx = cx - w / 2, ly = cy - 70 * z - 20;
      otext(c, s.label, lx, ly, s.theme?.gold ?? "#F4CA50", clamp01(v.amp * 2.5), 2);
      textBox = { x0: lx - 2, y0: ly - 2, x1: lx + w + 2, y1: ly + 18 };
      box.y0 = Math.min(box.y0, ly - 2);
    }
    return { box, pt: [cx, cy], textBox };
  },
};
