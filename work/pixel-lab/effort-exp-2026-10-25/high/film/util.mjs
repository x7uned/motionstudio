// Small shared helpers (pure functions of t).
export const GW = 540, GH = 960;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const k01 = (t, w) => clamp01((t - w[0]) / (w[1] - w[0]));
export const lerp = (a, b, k) => a + (b - a) * k;
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const TAU = Math.PI * 2;
/** Loop-exact smooth wobble: integer cycles per 10 s, so frame 300 equals frame 0. */
export const wob = (t, cycles, ph = 0) => Math.sin((TAU * cycles * t) / 10 + ph);
