// catalog-v1 item «water-drop»: the blue water droplet of the dog films (dog/film/props.mjs#droplet, lib/dog-droplet.mjs).
// Changes: the film's single drop is drawn in screen space at the item's size; hanging, falling, splashing and glinting are
// eased parameters (fy fall progress, vis presence, sp splash progress, gl glint), so each change is continuous: the drop
// dissolves in or out through a Bayer gate, splash droplets grow from points and dissolve out at the end of the splash.
import { droplet, gateG } from "./lib/dog-droplet.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const IV = "#FDFEED";
// splash droplets: [angle (rad, upward half-plane), size variety 0..1]
const SPL = [[-2.6, 0.9], [-2.2, 0.4], [-1.8, 0.7], [-1.4, 0.2], [-1.0, 0.6], [-0.6, 0.5]];
export default {
  kind: "water-drop",
  covers: ["water-drop"],
  source: "dog/film/props.mjs#droplet (+ WATER ramp)",
  desc: "blue water droplet that hangs, falls, splashes into small droplets that dissolve, or glints",
  hw: 22, hh: 25, start: "hangs above its spot, bobbing a little",
  states: {
    hang: [0.4, "hangs in the air, bobbing"],
    fall: [0.6, "falls, speeding up, stretching tall", "fall"],
    splash: [0.5, "hits the ground: flattens, breaks into droplets that spread, dissolve and leave a few on the floor", "thud"],
    shine: [0.5, "glints with a quick white sparkle", "sparkle"],
  },
  // fy: fall progress 0..1 · vis: drop presence 0..1 · sp: splash progress 0..1 · gl: glint 0..1
  base: { fy: 0, vis: 1, sp: 0, gl: 0 },
  st: {
    hang: { fy: 0, vis: 1, sp: 0, gl: 0 },
    fall: { fy: 1, vis: 1, sp: 0, gl: 0 },
    splash: { fy: 1, vis: 0, sp: 1, gl: 0 },
    shine: { fy: 0, vis: 1, sp: 0, gl: 1 },
  },
  linear: [],
  demo: {},
  notes: "The film's droplet kept (shading ramp, rim, glint). Fall is quadratic in the eased fy (gravity look). The splash droplets are arcs that grow from points and dither out, so nothing pops; the main drop dithers out as it splashes (a few small droplets stay on the floor) and dithers back in when it shines. Fixed splash directions (6 arcs) are a stylised choice, not a fluid sim.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, r = 11 * z;
    const hangY = cy - 11 * z, floorY = cy + 11 * z;
    const bob = (1 - clamp01(v.fy)) * 1.2 * z * Math.sin(t * 2.4);      // idle bob, only while hanging
    const y = hangY + (floorY - hangY) * clamp01(v.fy) * clamp01(v.fy) + bob;
    const sp = clamp01(v.sp), stretch = (1 - 0.2 * clamp01(v.fy)) * (1 + 0.45 * sp);
    const vis = clamp01(v.vis);
    if (vis > 0) droplet(gateG(c, 0, vis), cx, y, r, stretch, 0);
    if (sp > 0) {
      const out = gateG(c, 0, 1 - 0.7 * sm((sp - 0.45) / 0.55));    // the small droplets dissolve, a few stay on the floor
      for (const [a, f] of SPL) {
        const D = sp * 24 * z * (0.6 + 0.4 * f), arc = 14 * z * Math.sin(Math.PI * sp) * (0.6 + 0.4 * f);
        const x = cx + Math.cos(a) * D, yy = floorY - arc + Math.sin(a) * D * 0.25;
        const rr = Math.max(0.6, (1.6 + 1.6 * f) * z * sm(sp * 4));
        droplet(out, x, yy, rr, 1, 0);
      }
    }
    if (v.gl > 0) {
      const gl = gateG(c, 0, clamp01(v.gl)), gx = cx + 8 * z, gy = y - 8 * z, arm = Math.max(2, Math.round(3 * z));
      for (let d = -arm; d <= arm; d++) { gl.px(Math.round(gx + d), Math.round(gy), IV); gl.px(Math.round(gx), Math.round(gy + d), IV); }
    }
    const top = Math.min(hangY, y) - 13 * z, bot = Math.max(floorY, y) + 13 * z;
    return { box: { x0: cx - 17 * z, y0: top, x1: cx + 17 * z, y1: bot }, pt: [cx, y] };
  },
};
