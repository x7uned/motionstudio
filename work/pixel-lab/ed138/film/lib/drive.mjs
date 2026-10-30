// ed138 item adapter (film-only, 2026-10-28): drives a catalog-contract item from the film's timeline. keys = [[t, state], …]
// (the first state of the item is the look before the first key). Builds s = { v, acc, integ, a, label, value, look, lookK }:
// every parameter eases from its value at the key to the state's target over the state's D seconds (ease in-out, or linear
// for item.linear), so no state change lands in one frame. integ(f) integrates f(params) dt from 0 to t at 120 Hz (pure).
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const eio = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

function paramsAt(item, keys, t) {
  const v = { ...(item.base || {}) }, first = Object.keys(item.states)[0];
  Object.assign(v, item.st?.[first] || {});
  for (const [tk, state] of keys) {
    if (t <= tk) break;
    const D = item.states[state][0], k = clamp01((t - tk) / D), tgt = item.st?.[state] || {};
    for (const p of Object.keys(tgt)) { const from = v[p]; const e = (item.linear || []).includes(p) ? k : eio(k); v[p] = from + (tgt[p] - from) * e; }
  }
  return v;
}
/** s for item at film time t. o: { a, label, value, unit, look, lookK, x, slot } */
export function drive(item, keys, t, o = {}) {
  const v = paramsAt(item, keys, t);
  const acc = (state, w0 = 0, w1 = 1) => {
    let last = null; for (const [tk, st] of keys) if (st === state && tk <= t) last = tk;
    if (last === null) return 0; const D = item.states[state][0], u = clamp01((t - last) / D);
    return clamp01((u - w0) / Math.max(1e-6, w1 - w0));
  };
  const integ = (f) => { let s = 0; const dt = 1 / 120; for (let x = 0; x < t; x += dt) s += f(paramsAt(item, keys, Math.min(t, x + dt / 2))) * Math.min(dt, t - x); return s; };
  return { v, acc, integ, a: o.a ?? 1, label: o.label, value: o.value, unit: o.unit, look: o.look ?? null, lookK: o.lookK ?? 0, x: o.x, slot: o.slot, seed: o.seed };
}
/** A dissolve view of c for presence a (ordered dither), as the catalog engine hands to items while they enter/exit. */
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
export function view(c, a) {
  if (a >= 1) return c;
  const o = Object.create(c); o.px = (x, y, col) => { if (a > bayer(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; return o;
}
/** Draw an item: presence a dissolves it; returns the item's { box, pt } or null when a <= 0. */
export function put(c, item, x, y, z, t, keys, o = {}) {
  const a = o.a ?? 1; if (a <= 0.001) return null;
  return item.draw(view(c, a), x, y, z, t, drive(item, keys, t, o));
}
