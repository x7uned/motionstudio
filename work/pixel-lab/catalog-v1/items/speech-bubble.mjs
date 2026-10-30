// catalog-v1 item «speech-bubble»: the speech bubble of «Your cat knows its name» (identical in «mosquito-buzz») as a HUD
// card — dark card, lilac edge, pointed tail swinging toward the target prop (the speaker), the label in ivory pixel text.
// Ported from work/pixel-lab/cat-name/film/name-hud.mjs speech() (copy in lib/catname-speech.mjs). HUD like in the film
// (a screen overlay aimed at a world target): the words stay legible and uncropped while the camera moves. The ping
// film's bubble (hud.mjs#bubble) is a window with a title bar, not a speech bubble, so it was not used.
import { bubbleLayout, drawBubble } from "./lib/catname-speech.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const popEase = (x) => { x = clamp01(x); const c1 = 1.7, y = x - 1; return 1 + (c1 + 1) * y * y * y + c1 * y * y; };
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const LAY = new Map();
const layout = (label) => { const k = label || ""; let l = LAY.get(k); if (!l) { l = bubbleLayout(label); LAY.set(k, l); } return l; };

export default {
  kind: "speech-bubble",
  covers: ["speech-bubble"],
  source: "cat-name/film/name-hud.mjs#speech",
  desc: "speech bubble with the label words, tail points at its target (the speaker); can shout, think or whisper; HUD card",
  hw: 92, hh: 40, start: "pops in with a small overshoot, bobs gently",
  hud: true, text: true,
  states: {
    show: [0.4, "plain speech bubble, ivory words"],
    shout: [0.45, "bubble swells and shakes, yellow words, action strokes at the corners", "pop"],
    think: [0.6, "turns into a thought cloud with a trail of little bubbles", "flutter"],
    quiet: [0.5, "shrinks a little, dashed edge, dim lilac words (a whisper)", "dim"],
  },
  base: { loud: 0, think: 0, quiet: 0 },
  st: { show: { loud: 0, think: 0, quiet: 0 }, shout: { loud: 1, think: 0, quiet: 0 }, think: { loud: 0, think: 1, quiet: 0 }, quiet: { loud: 0, think: 0, quiet: 1 } },
  linear: [],
  demo: { slot: "top-left", target: true, label: "WHO, ME?" },
  notes: "HUD like the film's overlay: the tail swings toward the target's screen point (blended by its presence; no target = points down, leaning to the frame centre). Label: 1 line at text size 3, or 2 balanced lines, or size 2 for long labels (decided once per label); the declared 92×40 fits labels up to ~9 letters, an 18-letter label is ~120 px half-wide. No label = three bouncing dots (typing), no text. Tail is a narrow spike when the target is beside the bubble (the box is short). The thought cloud is small scallops, not a big fluffy cloud. Checker: clean.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, lay = layout(s.label);
    // pop in (0.55 → overshoot → 1) with the engine's dissolve; shrink a little while dissolving out
    const pop = 0.55 + 0.45 * popEase(s.enterK), out = s.enterK >= 1 ? 0.82 + 0.18 * s.a : 1;
    const Z = z * pop * out * (1 + 0.1 * v.loud - 0.12 * v.quiet);
    const bx = cx + v.loud * 2 * Math.sin(t * 21) * Z, by = cy + 1.2 * Math.sin(t * 2.1) * Z;
    // tail: rest = down, leaning toward the frame centre; aim = the target, blended by its presence
    const rest = Math.PI / 2 - 0.45 * Math.max(-1, Math.min(1, (262 - s.x) / 120));
    const aim = s.look ? Math.atan2(s.look[1] - by, s.look[0] - bx) : rest, ang = lerpAng(rest, aim, s.look ? s.lookK : 0);
    const A = drawBubble(c, lay, bx, by, Z, ang, { loud: v.loud, think: v.think, quiet: v.quiet, t });
    return { box: A.box, textBox: A.box, pt: A.centre };
  },
};
