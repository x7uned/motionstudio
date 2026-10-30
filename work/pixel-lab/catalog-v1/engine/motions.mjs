// Trial 10 s · every sounding motion, derived from the same resolved plan as the picture: one 8-bit sound per visible
// motion, lasting exactly that motion (t0 → t1). Background motion (stars, fog, idle sways, the slow camera push-in) is
// silent on purpose. The same sound kind never restarts within 0.25 s (the shorter one is dropped, never moved).
import { STATE_PARAMS, params } from "./props.mjs";
import { cameraPath } from "./scene.mjs";
import { ITEMS } from "../contract.mjs";

const KEY_SOUND = {
  kid: { xray: "scan", signal: "sparkle", lit: "glow", smile: "blip" },
  stopwatch: { run: "tick", done: "ding" }, counter: { count: "count", done: "ding" },
  earth: { day: "rise", night: "dim", spin: "whirr" }, sun: { flare: "swell", dim: "dim" }, moon: { bright: "glow" },
  heart: { fast: "rise", glow: "swell" }, eye: { look: "blip", wide: "rise", blink: "blink", glow: "glow" },
  bat: { hang: "fold", fly: "flutter", ping: "sonar" }, ghost: { boo: "boo", fade: "dim" },
};
export function motions(R0) {
  const M = [], add = (t0, t1, kind, note) => { if (t1 > t0 + 0.02 && t0 < R0.end - 0.05) M.push({ t0: +t0.toFixed(3), t1: +Math.min(t1, R0.end - 0.02).toFixed(3), kind, note }); };
  for (const p of R0.props) {
    const e = p.enterT;
    if (p.kind === "pumpkin") { add(e, e + 0.26, "fall", `${p.id} pumpkin drops`); add(e + 0.26, e + 0.6, "thud", `${p.id} lands on the bale`); }
    else if (!p.start) add(e, e + (p.kind === "kid" ? 0.5 : 0.38), p.hud ? "swish" : p.kind === "kid" ? "whoosh" : "appear", `${p.id} ${p.kind} enters`);
    if (p.exitT != null) add(p.exitT, p.exitT + 0.38, "fold", `${p.id} leaves`);
    for (const k of p.keys) {
      if (p.kind === "pumpkin") {
        const before = params(p, k.t - 0.001).v, tgt = STATE_PARAMS.pumpkin.st[k.state];
        const seq = ["open1", "open2", "cut"].filter((n) => n in tgt && Math.abs(tgt[n] - before[n]) > 1e-6), share = k.D / Math.max(1, seq.length);
        seq.forEach((n, i) => add(k.t + i * share, k.t + (i + 1) * share, n === "cut" ? "carve" : "pop", `${p.id} ${n} on «${R0.words[k.word]?.text ?? "@end"}»`));
        if (k.state === "glow") add(k.t, k.t + k.D, "swell", `${p.id} candle flares`);
        if (k.state === "smile") { add(k.t + 0.15 * k.D, k.t + 0.85 * k.D, "wink", `${p.id} winks`); add(k.t, k.t + k.D, "creak", `${p.id} smile`); }
        continue;
      }
      const kind = KEY_SOUND[p.kind]?.[k.state] ?? ITEMS[p.kind]?.states[k.state]?.[2]; if (!kind) continue;   // catalog-v1 items: 3rd field of a state
      let t1 = k.t + k.D;
      if (kind === "sonar") { const next = p.keys.find((q) => q.t > k.t)?.t ?? R0.end - 0.3; t1 = Math.min(next, k.t + 1.4); }
      if (kind === "ding") t1 = k.t + Math.min(k.D, 0.45);
      add(k.t, t1, kind, `${p.id} ${p.kind} → ${k.state}`);
    }
    // a beating heart: one soft thump per "lub" (each beat is a visible pulse)
    if (p.kind === "heart") { let ph = 0.8; for (let t = 0; t < R0.end - 0.3; t += 1 / 60) { const v = params(p, t).v, n = ph + v.bpm / 60 / 60; if (t >= e && Math.floor(n - 0.06) > Math.floor(ph - 0.06)) add(t, t + 0.12, "thump", `${p.id} beat`); ph = n; } }
  }
  // camera: an audible move only when the framing really changes (zoom ≥ 15 % or a pan ≥ 50 px)
  const path = cameraPath(R0);
  for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], zr = Math.max(a.z, b.z) / Math.min(a.z, b.z), pan = Math.hypot((b.cx - a.cx) * b.z, (b.cy - a.cy) * b.z);
    if (zr >= 1.15 || pan >= 50) add(b.t, b.t + b.move, "whoosh", `camera move ${i}`); }
  for (const l of R0.labels) add(l.t, l.t + 0.3, "blip", `label ${l.text}`);
  for (const b of R0.beams) add(b.t, b.t + 0.65, b.style === "light" ? "sparkle" : "zap", `beam ${b.from}→${b.to}`);
  for (const f of R0.focus) { add(f.t, f.t + 0.4, "rise", `focus ${f.target}`); add(f.t + 0.4, f.t + 0.7, "lock", `focus lock ${f.target}`); }
  M.sort((a, b) => a.t0 - b.t0);
  const last = {}, out = [];
  // same kind twice within 0.25 s: keep the longer motion (a camera pull-back wins over a short slide-in)
  for (const m of M) { const prev = last[m.kind]; if (prev && m.t0 - prev.t0 < 0.25 && m.kind !== "pop" && m.kind !== "thump") { if (m.t1 - m.t0 > prev.t1 - prev.t0) { out[out.indexOf(prev)] = m; last[m.kind] = m; } continue; } last[m.kind] = m; out.push(m); }
  return out;
}
