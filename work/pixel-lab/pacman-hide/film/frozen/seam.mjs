import { frame } from "../render.mjs";
import { END } from "../timeline.mjs";
const a = frame(END - 1 / 30).d.slice(), b = frame(0).d.slice(), c2 = frame(1 / 30).d.slice(), z = frame(END).d.slice();
const diff = (p, q) => { let s = 0; const rows = new Float64Array(960); for (let i = 0; i < p.length; i++) { const d = Math.abs(p[i] - q[i]); s += d; rows[Math.floor(i / 1620)] += d; } return { m: s / p.length, rows }; };
const d1 = diff(a, b), d2 = diff(b, c2), d3 = diff(z, b);
console.log("last→first", d1.m.toFixed(3), "first→second", d2.m.toFixed(3), "frame(END) vs frame(0)", d3.m.toFixed(3));
const band = (r) => { const out = []; for (let y = 0; y < 960; y += 40) { let s = 0; for (let k = y; k < y + 40; k++) s += r[k]; out.push((s / (40 * 1620)).toFixed(2)); } return out.join(" "); };
console.log("rows last→first", band(d1.rows)); console.log("rows first→2nd ", band(d2.rows));
