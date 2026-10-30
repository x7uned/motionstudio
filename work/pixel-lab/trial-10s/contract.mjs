// Trial 10 s · «10-second fact» (experiment 2026-10-26, work/pixel-lab/trial-10s). Not wired into the studio.
// The contract between ONE Claude call and the deterministic pixel renderer:
//   CATALOG — prepared props with discrete states (the model only picks kinds, slots, states and word anchors),
//   SCHEMA  — strict JSON schema with enums (Claude CLI --json-schema),
//   issues()  — every broken rule at once (each tagged "repair" or "retry"),
//   repair()  — deterministic fixes: drops decorative rule breakers, never invents content,
//   resolve() — word anchors → seconds, slots → world positions: the plan the renderer draws.
// On-screen words come only from the script (captions = the script; labels/values must be grounded in it).

export const FPS = 30, FRAMES = 300, END = FRAMES / FPS, VOICE_AT = 0.3;
export const MAX_WORDS = 28, LAST_WORD_END_MAX = 8.45, MAX_PROPS = 5, MAX_VISIBLE = 4;

// ---------------------------------------------------------------- catalog (also printed into the prompt)
// D = transition seconds for entering that state. hw/hh = half extents (grid px) at size "m" for the overlap check.
export const CATALOG = {
  pumpkin: { desc: "carved-to-be jack-o'-lantern on a hay bale; candle light shows through cut holes", hw: 96, hh: 92, start: "drops onto the bale and squashes",
    states: { plain: [0.3, "uncarved"], "one-eye": [0.3, "first round hole punched"], eyes: [0.55, "two round holes"], face: [0.7, "two holes + mouth slit cut left→right"], glow: [0.5, "candle flares brighter"], smile: [0.55, "slit bends into a smile, one wink"] } },
  kid: { desc: "child in profile at the left edge, facing right, looking at its target prop; the head can turn into an X-ray window with the brain inside", hw: 118, hh: 300, slots: ["left"], start: "breathing, blinking",
    states: { watch: [0.4, "looks at the target"], xray: [0.46, "scan line reveals the brain"], signal: [1.2, "a pulse runs eye → back of the brain → face area"], lit: [0.6, "a brain area lights up (needs xray)"], smile: [0.5, "smiles"] } },
  stopwatch: { desc: "tombstone card with a dial and a counter (number + unit); HUD card, the camera does not move it", hw: 66, hh: 78, hud: true, value: true, start: "dial idles",
    states: { show: [0.4, "card rises in, dial at 0"], run: [1.2, "hand sweeps, counter counts 0 → value (a fraction like 1/6 sweeps that part of the dial)"], done: [0.45, "dial flashes, stays"] } },
  counter: { desc: "big number plate: value + unit, label line above; HUD card", hw: 110, hh: 62, hud: true, value: true, start: "digits flicker",
    states: { show: [0.4, "plate rises in, shows 0"], count: [1.2, "counts up 0 → value"], done: [0.45, "number flashes, stays"] } },
  earth: { desc: "pixel Earth globe with day/night side and city lights", hw: 92, hh: 92, start: "slowly turning",
    states: { day: [0.8, "lit side to the viewer"], night: [0.8, "night side, city lights"], spin: [0.8, "spins fast"] } },
  sun: { desc: "pixel Sun with rotating dithered rays and corona", hw: 90, hh: 90, start: "rays rotate",
    states: { shine: [0.5, "steady glow"], flare: [0.5, "big flare burst, light surges"], dim: [0.6, "dims to a dull disc"] } },
  moon: { desc: "big cratered moon with a soft halo", hw: 80, hh: 80, start: "halo breathes",
    states: { glow: [0.5, "soft glow"], bright: [0.5, "halo swells bright"] } },
  heart: { desc: "glossy pixel heart that beats (continuous rhythm)", hw: 72, hh: 68, start: "beating",
    states: { rest: [0.6, "slow beat ~60/min"], beat: [0.6, "normal beat ~80/min"], fast: [0.6, "racing ~150/min"], glow: [0.5, "warm glow, beats"] } },
  eye: { desc: "one big front-facing eye with iris, pupil and lids", hw: 84, hh: 52, start: "glances around",
    states: { open: [0.35, "looks ahead"], look: [0.35, "looks at its target prop"], wide: [0.45, "pupil opens wide"], blink: [0.36, "blinks once"], glow: [0.5, "eyeshine: glows in the dark"] } },
  bat: { desc: "cute bat with wide wings", hw: 86, hh: 56, start: "flaps in its slot",
    states: { hang: [0.6, "hangs upside down, wings folded"], fly: [0.6, "flaps and loops around its slot"], ping: [0.8, "flies and sends sonar rings toward its target"] } },
  ghost: { desc: "sheet ghost with a wavy hem", hw: 66, hh: 80, start: "floats and bobs",
    states: { float: [0.5, "floats"], boo: [0.45, "grows, arms up, mouth open"], fade: [0.6, "turns see-through"] } },
};
export const KINDS = Object.keys(CATALOG);
export const STATES = [...new Set(KINDS.flatMap((k) => Object.keys(CATALOG[k].states)))];
// World positions at the wide shot (zoom 1). Grid 540×960; main safe zone x 35–440 (505 above y 400), y 150–625.
export const SLOTS = { center: [262, 420], left: [140, 440], right: [370, 440], top: [262, 262], "top-left": [148, 262], "top-right": [372, 262] };
export const SIZES = { s: 0.72, m: 1, l: 1.28 };
export const ZOOMS = { wide: 1, medium: 1.4, close: 1.85 };
export const BACKDROPS = ["night-hill", "space"];
export const IDS = ["a", "b", "c", "d", "e"];
export const UNITS = { MS: ["millisecond"], S: ["second"], MIN: ["minute"], H: ["hour"], DAYS: ["day"], YEARS: ["year"], KM: ["kilometer", "kilometre"], "%": ["percent"], TIMES: ["time"], BEATS: ["beat"] };
export const BEAM_STYLES = ["light", "signal"];
const FONT = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@_.,!'?-:/+%°·>*✓±×=$< ");

// ---------------------------------------------------------------- strict schema (all fields required, nullable where optional)
const anchor = { type: "string", maxLength: 24, description: "a spoken word copied from the script, or @start (frame 0) or @end (payoff after the last word)" };
const occ = { type: "integer", minimum: 1, maximum: 4, description: "which occurrence of that word (1 = first)" };
const ref = { type: "string", enum: IDS };
const obj = (properties) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
export const SCHEMA = obj({
  title: { type: "string", maxLength: 40 },
  script: { type: "string", maxLength: 220, description: "the narration, one paragraph, ≤ 28 words" },
  backdrop: { type: "string", enum: BACKDROPS },
  props: { type: "array", minItems: 1, maxItems: MAX_PROPS, items: obj({
    id: ref, kind: { type: "string", enum: KINDS }, slot: { type: "string", enum: Object.keys(SLOTS) }, size: { type: "string", enum: Object.keys(SIZES) },
    enter: anchor, enterN: occ, exit: { type: ["string", "null"], maxLength: 24 }, exitN: occ,
    target: { type: ["string", "null"], enum: [...IDS, null] },
    value: { type: ["string", "null"], maxLength: 12, description: "stopwatch/counter only: a number spoken in the script (digits or words) or a fraction like 1/6 for 'a sixth'" },
    unit: { type: ["string", "null"], enum: [...Object.keys(UNITS), null] },
    label: { type: ["string", "null"], maxLength: 18 },
    keys: { type: "array", maxItems: 6, items: obj({ at: anchor, n: occ, state: { type: "string", enum: STATES } }) },
  }) },
  camera: { type: "array", minItems: 1, maxItems: 6, items: obj({ at: anchor, n: occ, focus: { type: "string", enum: ["wide", ...IDS] }, zoom: { type: "string", enum: Object.keys(ZOOMS) } }) },
  labels: { type: "array", maxItems: 4, items: obj({ at: anchor, n: occ, until: { type: ["string", "null"], maxLength: 24 }, text: { type: "string", maxLength: 18 }, target: ref }) },
  beams: { type: "array", maxItems: 3, items: obj({ at: anchor, n: occ, from: ref, to: ref, style: { type: "string", enum: BEAM_STYLES } }) },
  focus: { type: "array", maxItems: 2, items: obj({ at: anchor, n: occ, until: { type: ["string", "null"], maxLength: 24 }, target: ref, tag: { type: ["string", "null"], maxLength: 12 } }) },
});

// ---------------------------------------------------------------- words, numbers, grounding
export const cleanScript = (s) => String(s).replace(/[’‘]/g, "'").replace(/[“”"]/g, "").replace(/[—–]/g, ", ").replace(/…/g, "...").replace(/\s+/g, " ").trim();
export const norm = (w) => w.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'/,.]/g, "").replace(/[,.]+$/g, "").replace(/'s$/, "").replace(/^'+|'+$/g, "");
export const stem = (w) => { w = norm(w).replace(/,/g, ""); if (/^\d/.test(w)) return w; if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y"; if (w.length > 4 && /(ses|xes|ches|shes)$/.test(w)) return w.slice(0, -2); if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1); return w; };
export const scriptWords = (script) => cleanScript(script).split(" ").filter(Boolean).map((text, i) => ({ i, text, norm: norm(text), stem: stem(text) }));
const ONES = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9 };
const ORD = { half: 2, third: 3, quarter: 4, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, hundredth: 100, thousandth: 1000 };
/** Every number the narration says: digits ("100,000", "8.3"), word runs ("a hundred thousand"), ordinal fractions ("a sixth" → 1/6). */
export function spokenNumbers(words) {
  const nums = new Set(), fracs = new Set();
  let run = null;
  const flush = () => { if (run && run.any) nums.add(run.total + run.cur); run = null; };
  for (let i = 0; i < words.length; i++) {
    const w = words[i].norm.replace(/,/g, "");
    if (/^\d+(\.\d+)?$/.test(w)) { flush(); nums.add(Number(w)); continue; }
    if (/^\d+\/\d+$/.test(w)) { flush(); fracs.add(w); continue; }
    const ow = w.replace(/s$/, "");
    if (ORD[w] || ORD[ow]) { flush(); fracs.add(`1/${ORD[w] || ORD[ow]}`); continue; }
    if (w in ONES) { run ??= { total: 0, cur: 0 }; run.cur += ONES[w]; run.any = true; continue; }
    if (w in SCALE) { run ??= { total: 0, cur: 0 }; const c = run.cur || 1; if (SCALE[w] === 100) run.cur = c * 100; else { run.total += c * SCALE[w]; run.cur = 0; } run.any = true; continue; }
    if ((w === "a" || w === "and") && run === null && w === "a" && SCALE[words[i + 1]?.norm]) { run = { total: 0, cur: 0 }; continue; }
    if (w === "and" && run) continue;
    flush();
  }
  flush();
  return { nums, fracs };
}
export const parseValue = (v) => { const s = String(v ?? "").replace(/,/g, "").trim(); if (/^\d+\/\d+$/.test(s)) return { frac: s, num: s.split("/").reduce((a, b) => Number(a) / Number(b)) }; if (/^\d+(\.\d+)?$/.test(s)) return { num: Number(s) }; return null; };
export function groundedValue(v, words) { const p = parseValue(v); if (!p) return false; const { nums, fracs } = spokenNumbers(words); return p.frac ? fracs.has(p.frac) || nums.has(p.num) : nums.has(p.num); }
export function groundedText(text, words) {
  const stems = new Set(words.map((w) => w.stem)), { nums } = spokenNumbers(words);
  const parts = String(text).trim().split(/\s+/).filter(Boolean);
  if (!parts.length || parts.length > 3) return false;
  return parts.every((p) => { const s = stem(p); if (/^\d/.test(s)) return parseValue(s) ? groundedValue(s, words) : false; return stems.has(s) || stems.has(norm(p)); });
}
const fontOk = (s) => [...String(s).toUpperCase()].every((ch) => FONT.has(ch));

// ---------------------------------------------------------------- anchors → word index (−1 = @start, N = @end)
export function anchorIndex(at, n, words) {
  if (at == null) return null;
  const a = String(at).trim();
  if (a === "@start") return -1;
  if (a === "@end") return words.length;
  const k = norm(a), s = stem(a);
  let seen = 0;
  for (const w of words) if (w.norm === k && ++seen === (n || 1)) return w.i;
  seen = 0; for (const w of words) if (w.stem === s && ++seen === (n || 1)) return w.i;     // tolerant: plural/stem
  return null;
}

// ---------------------------------------------------------------- timing helpers (word index → seconds)
export function timeOf(idx, timing) {
  if (idx === -1) return 0;
  if (idx >= timing.words.length) return Math.min(END - 1.2, timing.words.at(-1).end + 0.35);
  return Math.max(0, timing.words[idx].start - 0.02);
}

// ---------------------------------------------------------------- validation: ALL issues at once
// fix: "repair" = code can fix it without the model; "retry" = only the model can (script length, hook, missing hero…).
export function issues(plan, ctx) {
  const out = [], add = (path, msg, fix) => out.push({ path, msg, fix });
  const script = cleanScript(plan.script || ""), words = scriptWords(script);
  if (ctx.fixedScript && scriptWords(ctx.fixedScript).map((w) => w.norm).join(" ") !== words.map((w) => w.norm).join(" ")) add("script", "script must be exactly the recorded narration", "repair");
  if (!ctx.fixedScript) {
    if (words.length > MAX_WORDS) add("script", `script has ${words.length} words; the limit is ${MAX_WORDS}`, "retry");
    if (words.length < 12) add("script", `script has ${words.length} words; write at least 12`, "retry");
    if (/^(have you ever|did you know|imagine|hey|hi\b|hello|welcome|today|in this video|so,)/i.test(script)) add("script", "the first words must be the hook itself (no 'Did you know', 'Imagine', greeting or intro)", "retry");
    if (!fontOk(script)) add("script", "script uses characters the pixel font has no glyph for; use plain letters, digits and . , ' ! ? - : / %", "retry");
    if (ctx.timing && ctx.timing.words.at(-1)?.end > LAST_WORD_END_MAX) add("script", `the narration runs to ${ctx.timing.words.at(-1).end.toFixed(1)} s; it must end by ${LAST_WORD_END_MAX} s (shorter sentences, fewer words)`, "retry");
  }
  const ids = new Set(), props = plan.props || [];
  if (!props.length) add("props", "at least one prop is required", "retry");
  props.forEach((p, i) => {
    const P = `props[${i}](${p.id})`, K = CATALOG[p.kind];
    if (ids.has(p.id)) add(P, "duplicate prop id", "repair"); ids.add(p.id);
    if (!K) { add(P, `unknown kind ${p.kind}`, "repair"); return; }
    if (K.slots && !K.slots.includes(p.slot)) add(P, `${p.kind} can only stand in slot ${K.slots.join("/")}`, "repair");
    if (anchorIndex(p.enter, p.enterN, words) == null) add(P + ".enter", `enter anchor «${p.enter}» is not a spoken word`, "repair");
    if (p.exit != null && anchorIndex(p.exit, p.exitN, words) == null) add(P + ".exit", `exit anchor «${p.exit}» is not a spoken word`, "repair");
    if (K.value) {
      if (p.value == null || !groundedValue(p.value, words)) add(P + ".value", `value «${p.value}» is not a number spoken in the script`, "repair");
      if (p.unit && !UNITS[p.unit].some((u) => words.some((w) => w.stem.startsWith(u)))) add(P + ".unit", `unit ${p.unit} needs the word «${UNITS[p.unit][0]}» in the script`, "repair");
    }
    if (p.label != null && (!groundedText(p.label, words) || !fontOk(p.label))) add(P + ".label", `label «${p.label}» must use only words of the script (≤ 3)`, "repair");
    (p.keys || []).forEach((k, j) => {
      if (!K.states[k.state]) add(`${P}.keys[${j}]`, `state ${k.state} does not exist for ${p.kind} (${Object.keys(K.states).join(", ")})`, "repair");
      if (anchorIndex(k.at, k.n, words) == null) add(`${P}.keys[${j}]`, `anchor «${k.at}» is not a spoken word`, "repair");
    });
    if (p.target != null && !props.some((q) => q.id === p.target && q.id !== p.id)) add(P + ".target", `target ${p.target} is not another prop`, "repair");
  });
  const startProps = props.filter((p) => anchorIndex(p.enter, p.enterN, words) === -1);
  if (props.length && !startProps.length) add("props", "the hero must be on screen at @start (frame 0) and already moving", "repair");
  // timeline windows for overlap / crowding
  if (ctx.timing && words.length) {
    const win = props.filter((p) => CATALOG[p.kind]).map((p) => { const e = anchorIndex(p.enter, p.enterN, words), x = p.exit == null ? null : anchorIndex(p.exit, p.exitN, words); return { p, t0: e == null ? 0 : timeOf(e, ctx.timing), t1: x == null ? END : timeOf(x, ctx.timing) + 0.4 }; });
    for (let i = 0; i < win.length; i++) for (let j = i + 1; j < win.length; j++) {
      const a = win[i], b = win[j]; if (a.t1 <= b.t0 || b.t1 <= a.t0) continue;
      if (overlapK(box(a.p), box(b.p)) > 0.18) add(`props(${b.p.id})`, `${b.p.kind} in slot ${b.p.slot} overlaps ${a.p.kind} (${a.p.id}) while both are visible`, "repair");
    }
    for (const w of win) { const n = win.filter((v) => v.t0 <= w.t0 + 0.01 && v.t1 > w.t0 + 0.01).length; if (n > MAX_VISIBLE) { add("props", `more than ${MAX_VISIBLE} props visible at once`, "retry"); break; } }
  }
  (plan.camera || []).forEach((k, j) => {
    if (anchorIndex(k.at, k.n, words) == null) add(`camera[${j}]`, `anchor «${k.at}» is not a spoken word`, "repair");
    if (k.focus !== "wide" && !props.some((p) => p.id === k.focus)) add(`camera[${j}]`, `focus ${k.focus} is not a prop`, "repair");
    else if (k.focus !== "wide" && CATALOG[props.find((p) => p.id === k.focus)?.kind]?.hud) add(`camera[${j}]`, "the camera cannot focus a HUD card", "repair");
  });
  if (!(plan.camera || []).length || anchorIndex(plan.camera[0].at, plan.camera[0].n, words) !== -1) add("camera[0]", "the first camera key must be at @start", "repair");
  if (ctx.timing) { const ts = (plan.camera || []).map((k) => anchorIndex(k.at, k.n, words)).filter((x) => x != null).map((x) => timeOf(x, ctx.timing)); for (let j = 1; j < ts.length; j++) if (ts[j] - ts[j - 1] < 1) add(`camera[${j}]`, "camera keys must be ≥ 1 s apart", "repair"); }
  (plan.labels || []).forEach((l, j) => {
    if (!groundedText(l.text, words) || !fontOk(l.text)) add(`labels[${j}]`, `label «${l.text}» must use only words of the script (≤ 3)`, "repair");
    if (anchorIndex(l.at, l.n, words) == null) add(`labels[${j}]`, `anchor «${l.at}» is not a spoken word`, "repair");
    if (!props.some((p) => p.id === l.target)) add(`labels[${j}]`, `target ${l.target} is not a prop`, "repair");
  });
  (plan.beams || []).forEach((b, j) => {
    if (anchorIndex(b.at, b.n, words) == null) add(`beams[${j}]`, `anchor «${b.at}» is not a spoken word`, "repair");
    if (b.from === b.to || !props.some((p) => p.id === b.from) || !props.some((p) => p.id === b.to)) add(`beams[${j}]`, "a beam needs two different props", "repair");
  });
  (plan.focus || []).forEach((f, j) => {
    if (anchorIndex(f.at, f.n, words) == null) add(`focus[${j}]`, `anchor «${f.at}» is not a spoken word`, "repair");
    if (!props.some((p) => p.id === f.target)) add(`focus[${j}]`, `target ${f.target} is not a prop`, "repair");
    if (f.tag != null && (!groundedText(f.tag, words) || !fontOk(f.tag))) add(`focus[${j}]`, `tag «${f.tag}» must be a word of the script`, "repair");
  });
  return out;
}
export function box(p) {
  const K = CATALOG[p.kind], s = SIZES[p.size] ?? 1, [x, y] = SLOTS[p.slot] ?? SLOTS.center;
  if (p.kind === "kid") return { x0: 20, x1: 252, y0: 150, y1: 960 };
  return { x0: x - K.hw * s, x1: x + K.hw * s, y0: y - K.hh * s, y1: y + K.hh * s };
}
const overlapK = (a, b) => { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (w <= 0 || h <= 0) return 0; return (w * h) / Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)); };

// ---------------------------------------------------------------- deterministic repair (never adds content; records what it changed)
export function repair(plan0, ctx) {
  const plan = structuredClone(plan0), log = [];
  if (ctx.fixedScript) { if (cleanScript(plan.script) !== cleanScript(ctx.fixedScript)) log.push("script ← recorded narration"); plan.script = ctx.fixedScript; }
  plan.script = cleanScript(plan.script);
  const words = scriptWords(plan.script), A = (at, n) => anchorIndex(at, n, words), T = (i) => (ctx.timing ? timeOf(i, ctx.timing) : i);
  // props: unknown kinds / duplicate ids out; wrong slots fixed; bad anchors; ungrounded values and labels
  const seen = new Set();
  plan.props = (plan.props || []).filter((p) => { if (!CATALOG[p.kind] || seen.has(p.id)) { log.push(`drop prop ${p.id} (${p.kind})`); return false; } seen.add(p.id); return true; });
  for (const p of plan.props) {
    const K = CATALOG[p.kind];
    if (K.slots && !K.slots.includes(p.slot)) { log.push(`${p.id}: slot ${p.slot} → ${K.slots[0]}`); p.slot = K.slots[0]; }
    if (A(p.enter, p.enterN) == null) { log.push(`${p.id}: enter «${p.enter}» → @start`); p.enter = "@start"; p.enterN = 1; }
    if (p.exit != null && A(p.exit, p.exitN) == null) { log.push(`${p.id}: exit «${p.exit}» removed`); p.exit = null; }
    if (p.target != null && !plan.props.some((q) => q.id === p.target && q.id !== p.id)) { log.push(`${p.id}: target removed`); p.target = null; }
    if (K.value) {
      if (p.value != null && !groundedValue(p.value, words)) { log.push(`${p.id}: value «${p.value}» removed (not spoken)`); p.value = null; }
      if (p.unit && !UNITS[p.unit].some((u) => words.some((w) => w.stem.startsWith(u)))) { log.push(`${p.id}: unit ${p.unit} removed`); p.unit = null; }
      if (p.value == null) { const before = (p.keys || []).length; p.keys = (p.keys || []).filter((k) => k.state === "show"); if (before !== p.keys.length) log.push(`${p.id}: run/count keys dropped (no value)`); }
    } else { p.value = null; p.unit = null; }
    if (p.label != null && (!groundedText(p.label, words) || !fontOk(p.label))) { log.push(`${p.id}: label «${p.label}» removed`); p.label = null; }
    const keys = []; let lastT = -1;
    for (const k of (p.keys || []).map((k) => ({ ...k, i: A(k.at, k.n) })).filter((k) => { const ok = K.states[k.state] && k.i != null; if (!ok) log.push(`${p.id}: key ${k.state}@«${k.at}» dropped`); return ok; }).sort((a, b) => a.i - b.i)) {
      // two keys on (nearly) the same word: the later, more advanced state wins (e.g. show@"Sun" + run@"8" → run)
      const t = T(k.i); if (keys.length && t - lastT < 0.15) { const old = keys.pop(); log.push(`${p.id}: key ${old.state}@«${old.at}» dropped (${k.state} follows within 0.15 s)`); }
      keys.push({ at: k.at, n: k.n, state: k.state }); lastT = t;
    }
    p.keys = keys;
  }
  // value cards without a value and nothing to show are pointless
  plan.props = plan.props.filter((p) => { if (CATALOG[p.kind].value && p.value == null && !p.label) { log.push(`drop ${p.kind} ${p.id} (no grounded value or label)`); return false; } return true; });
  // hero at frame 0
  if (plan.props.length && !plan.props.some((p) => A(p.enter, p.enterN) === -1)) { const h = plan.props.find((p) => !CATALOG[p.kind].hud) || plan.props[0]; log.push(`${h.id}: enter → @start (hero on screen at frame 0)`); h.enter = "@start"; h.enterN = 1; }
  // overlaps: move the later prop to the nearest free slot, else drop it (if it is not a hero)
  if (ctx.timing) {
    const win = (p) => { const e = A(p.enter, p.enterN), x = p.exit == null ? null : A(p.exit, p.exitN); return [e == null ? 0 : T(e), x == null ? END : T(x) + 0.4]; };
    const clash = (p, slot) => plan.props.some((q) => q !== p && q.__placed && (() => { const [a0, a1] = win(p), [b0, b1] = win(q); return !(a1 <= b0 || b1 <= a0); })() && overlapK(box({ ...p, slot }), box(q)) > 0.18);
    for (const p of [...plan.props].sort((a, b) => win(a)[0] - win(b)[0])) {
      if (clash(p, p.slot)) {
        const [x, y] = SLOTS[p.slot], free = Object.keys(SLOTS).filter((s) => !CATALOG[p.kind].slots || CATALOG[p.kind].slots.includes(s)).filter((s) => !clash(p, s)).sort((a, b) => Math.hypot(SLOTS[a][0] - x, SLOTS[a][1] - y) - Math.hypot(SLOTS[b][0] - x, SLOTS[b][1] - y));
        if (free.length) { log.push(`${p.id}: slot ${p.slot} → ${free[0]} (overlap)`); p.slot = free[0]; }
        else if (A(p.enter, p.enterN) !== -1) { log.push(`drop ${p.kind} ${p.id} (no free slot)`); p.__drop = true; continue; }
      }
      p.__placed = true;
    }
    plan.props = plan.props.filter((p) => !p.__drop); plan.props.forEach((p) => delete p.__placed);
  }
  const has = (id) => plan.props.some((p) => p.id === id), hud = (id) => CATALOG[plan.props.find((p) => p.id === id)?.kind]?.hud;
  // camera: valid anchors, first key at frame 0, ≥ 1 s apart, focus on a visible non-HUD prop
  let cam = (plan.camera || []).map((k) => ({ ...k, i: A(k.at, k.n) })).filter((k) => { if (k.i == null) log.push(`camera @«${k.at}» dropped`); return k.i != null; }).sort((a, b) => a.i - b.i);
  for (const k of cam) if (k.focus !== "wide" && (!has(k.focus) || hud(k.focus))) { log.push(`camera @«${k.at}»: focus ${k.focus} → wide`); k.focus = "wide"; }
  for (const k of cam) if (k.focus === "wide" && k.zoom !== "wide") k.zoom = "wide";
  if (!cam.length || cam[0].i !== -1) { log.push("camera: first key moved to @start"); if (cam.length && cam[0].i <= 2) cam[0].i = -1; else cam.unshift({ at: "@start", n: 1, focus: "wide", zoom: "wide", i: -1 }); cam[0].at = "@start"; cam[0].n = 1; }
  const kept = [cam[0]]; for (const k of cam.slice(1)) { if (T(k.i) - T(kept.at(-1).i) < 1) { log.push(`camera @«${k.at}» dropped (< 1 s after the previous key)`); continue; } kept.push(k); }
  plan.camera = kept.map(({ i, ...k }) => k);
  // overlays: grounded text, valid anchors and targets; otherwise dropped
  plan.labels = (plan.labels || []).filter((l) => { const ok = groundedText(l.text, words) && fontOk(l.text) && A(l.at, l.n) != null && has(l.target); if (!ok) log.push(`label «${l.text}» dropped`); else if (l.until != null && A(l.until, 1) == null) l.until = null; return ok; });
  plan.beams = (plan.beams || []).filter((b) => { const ok = A(b.at, b.n) != null && b.from !== b.to && has(b.from) && has(b.to); if (!ok) log.push(`beam ${b.from}→${b.to} dropped`); return ok; });
  plan.focus = (plan.focus || []).filter((f) => { const ok = A(f.at, f.n) != null && has(f.target) && !hud(f.target); if (!ok) { log.push(`focus on ${f.target} dropped`); return false; } if (f.tag != null && (!groundedText(f.tag, words) || !fontOk(f.tag))) { log.push(`focus tag «${f.tag}» removed`); f.tag = null; } if (f.until != null && A(f.until, 1) == null) f.until = null; return true; });
  return { plan, log };
}

// ---------------------------------------------------------------- resolve: the renderer's input (seconds, world positions)
export function resolve(plan, timing) {
  const words = scriptWords(plan.script), A = (at, n) => anchorIndex(at, n, words), T = (i) => timeOf(i, timing);
  const props = plan.props.map((p) => {
    const K = CATALOG[p.kind], s = SIZES[p.size] ?? 1, [x, y] = SLOTS[p.slot];
    const enterT = T(A(p.enter, p.enterN)), exitI = p.exit == null ? null : A(p.exit, p.exitN), exitT = exitI == null ? null : T(exitI);
    const first = Object.keys(K.states)[0];
    let init = first; const keys = [];
    for (const k of p.keys) { const t = T(A(k.at, k.n)); if (t <= enterT + 0.05) { init = k.state; continue; } keys.push({ t, state: k.state, D: K.states[k.state][0], word: A(k.at, k.n) }); }
    // a transition never runs into the next one; long motions (run/count/signal) last until the next key or their D
    for (let j = 0; j < keys.length; j++) { const next = keys[j + 1]?.t ?? Math.min(END - 0.3, (exitT ?? END) - 0.05); const wd = keys[j].word < words.length ? timing.words[keys[j].word].end - keys[j].t : 0;
      if (["face"].includes(keys[j].state)) keys[j].D = Math.max(keys[j].D, Math.min(0.9, wd));
      keys[j].D = Math.max(0.12, Math.min(keys[j].D, next - keys[j].t - 0.02)); }
    return { id: p.id, kind: p.kind, hud: !!K.hud, x, y, s, slot: p.slot, enterT, start: enterT === 0, exitT, target: p.target, value: p.value, unit: p.unit, label: p.label ? p.label.toUpperCase() : null, init, keys };
  });
  const cam = plan.camera.map((k) => ({ t: T(A(k.at, k.n)), focus: k.focus, zoom: ZOOMS[k.zoom] ?? 1 }));
  const lastEnd = timing.words.at(-1).end;
  const labels = plan.labels.map((l) => { const t = T(A(l.at, l.n)), u = l.until == null ? null : T(A(l.until, 1)); return { t, until: u != null && u > t + 0.6 ? u : Math.min(END - 0.5, Math.max(t + 2.2, lastEnd - 0.1)), text: l.text.toUpperCase(), target: l.target }; });
  const beams = plan.beams.map((b) => ({ t: T(A(b.at, b.n)), from: b.from, to: b.to, style: b.style }));
  const focus = plan.focus.map((f) => { const t = T(A(f.at, f.n)), u = f.until == null ? null : T(A(f.until, 1)); return { t, until: u != null && u > t + 0.6 ? u : t + 1.6, target: f.target, tag: f.tag ? f.tag.toUpperCase() : null }; });
  return { title: plan.title, script: plan.script, backdrop: plan.backdrop, words: timing.words, voiced: timing.voiced, props, cam, labels, beams, focus, end: END };
}
