// ed138 «ice-world» (new, 2026-10-28): the look of the dwarf-planet candidate 2026 ED138 — an illustration, not its real face.
// Grey-blue ice with pinkish (tholin-like) patches, frost spots and craters, lit from the upper left (lib/sphere.mjs). Reads
// from a faint distant dot («far») to a full world («grow»); «shiny» / «dark» change how much light the ice reflects (the size
// question of the film); «roll» spins it fast as it rolls into place. Pure function of t, s.integ and the eased params.
import { body, craters, n3 } from "../lib/sphere.mjs";
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const ICE = ["#121A30", "#1E2C4A", "#2E4266", "#445C84", "#6080A4", "#86A4C2", "#B2CAE0", "#E4F0FA"];
const SOOT = ["#0E1220", "#161C30", "#202A42", "#2C3854", "#3A4866", "#4C5A78", "#62708C", "#7E8AA2"];
const PINK = ["#26121E", "#40202E", "#603244", "#84485C", "#A86676", "#C48A98", "#DCB2BC", "#F4DCE2"];
const DUSK = ["#1A0E16", "#2A1622", "#3C2030", "#502C3E", "#64384C", "#784A5C", "#8E5E70", "#A47686"];
const CR = [[0.3, 0.45, 0.84, 0.2, 0.32], [-0.5, -0.1, 0.86, 0.16, 0.28], [0.62, -0.42, 0.66, 0.13, 0.25], [-0.15, -0.66, 0.74, 0.11, 0.22], [-0.7, 0.5, 0.5, 0.12, 0.24], [0.1, 0.9, -0.4, 0.15, 0.25], [0.85, 0.2, -0.48, 0.12, 0.2], [-0.4, 0.2, -0.9, 0.18, 0.28], [0.2, -0.3, -0.93, 0.12, 0.22], [0.05, 0.08, 1, 0.07, 0.18]]
  .map(([x, y, z, r, d]) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l, r, d]; });

export function drawIce(c, cx, cy, r, o) {
  const alb = o.alb ?? 0, shine = Math.max(0, alb), dark = Math.max(0, -alb);
  return body(c, cx, cy, {
    r, a: o.a, spin: o.spin, tilt: -0.22, phi: 0.32, amb: 0.08 - 0.03 * dark, rim: 0.3, edge: shine > 0.3 ? "#3A5070" : "#24203A",
    spec: 0.25 + 0.9 * shine, glow: (o.glow ?? 0) + 0.55 * shine, glowCol: "#B8D8FF", dot: "#CFE2FF",
    surface(P, lat, lon, X, Y) {
      const sooty = dark > 0.15 + 0.7 * bayer(X, Y);
      const big = n3(P[0] * 1.9 + 4, P[1] * 1.9, P[2] * 1.9, 3), fine = n3(P[0] * 5.2, P[1] * 5.2 + 7, P[2] * 5.2, 5);
      const pinkK = big * 0.75 + fine * 0.25;
      let ramp = sooty ? SOOT : ICE, v = 0.04 * (fine - 0.5);
      if (pinkK > 0.6) { ramp = sooty ? DUSK : PINK; v -= 0.02 + (pinkK > 0.68 ? 0.05 : 0); }
      else if (pinkK < 0.36) v += 0.07;                                                     // fresh frost plains
      if (n3(P[0] * 11, P[1] * 11, P[2] * 11 + 3, 8) > 0.8) v += 0.1;                     // frost speckle
      v += craters(P, CR, 1);
      v += 0.1 * shine - (sooty ? 0.04 : 0.12) * dark;
      return { ramp, v };
    },
  });
}

export default {
  kind: "ice-world",
  covers: ["ice world", "dwarf planet", "dwarf planet candidate", "2026 ed138", "trans-neptunian object", "kuiper belt object", "icy world"],
  source: "ed138 (new)",
  desc: "a small icy world beyond Pluto: grey-blue ice, pinkish patches, craters; can shrink to a faint dot",
  hw: 60, hh: 60, start: "turns slowly, frost glints on the lit side",
  states: {
    idle: [0.6, "a full icy world, turning slowly"],
    far: [1.0, "shrinks to a faint distant dot of light", "dim"],
    grow: [1.2, "swells from a faint dot into a full icy world", "swell"],
    shiny: [0.8, "the ice turns bright and glossy and glows", "sparkle"],
    dark: [0.8, "the ice darkens to sooty grey", "dim"],
    roll: [0.9, "spins fast, as if rolling into place", "whirr"],
  },
  base: { size: 1, alb: 0, spin: 0 },
  st: { idle: { size: 1, alb: 0, spin: 0 }, far: { size: 0.05 }, grow: { size: 1 }, shiny: { alb: 1 }, dark: { alb: -1 }, roll: { spin: 1 } },
  linear: [],
  notes: "lib/sphere.mjs body; below radius 7 px it crossfades into a star dot, so far/grow never pop",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, spin = 0.5 + 0.12 * t + s.integ((q) => 5.5 * q.spin);
    return drawIce(c, cx, cy, 60 * z * v.size, { a: s.a, spin, alb: v.alb });
  },
};
