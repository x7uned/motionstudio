// catalog-v1 prop «crt-tv»: an old tube TV with a glass highlight, rounded dark corners, knobs and a speaker grille, ported
// from work/pixel-lab/tetris/film/room.mjs drawTV (body/bezel/glass/knob geometry copied at half scale; the film's game
// picture is replaced by a plain glow, static noise or colour bars: no game IP, no text). Off-again shrinks the picture to a
// line and then a dot (eased, width and height collapse one after the other). Idle: a slow shimmer of the glow (no body sway: a sub-pixel sway re-rasterises the edges by 1 px).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { ramp, sm, rnd, lerp } from "../engine/layout.mjs";

const GLOW = ["#05050A", "#12243C", "#1E4468", "#2F6A94", "#58A0C8", "#98D0E8", "#DDF4FF"];
const BARS = ["#E8E8EC", "#E4D840", "#40D8D8", "#48D048", "#D048D0", "#D84040", "#4048D8"];
const BARSD = ["#5A5A60", "#58551A", "#1A5858", "#1C541C", "#541C54", "#561A1A", "#1A1C58"];

export default {
  kind: "crt-tv",
  covers: ["crt-tv", "tv"],
  source: "tetris/film/room.mjs#drawTV",
  desc: "old tube TV with knobs and speaker grille: off, glowing screen, static, colour bars, switch-off dot",
  hw: 94, hh: 84,
  start: "stands switched off, dark glass with a small highlight",
  states: {
    off: [0.5, "dark screen, switched off", "dim"],
    on: [0.7, "switches on: a line opens into a soft blue glow", "glow"],
    static: [0.5, "screen fills with grey static noise", "zap"],
    bars: [0.5, "colour test bars on the screen", "blip"],
    glow: [0.5, "bright plain glow lights the TV", "glow"],
    shut: [0.9, "switches off: picture shrinks to a line then a dot and dies", "dim"],
  },
  base: { pwr: 0, stat: 0, bars: 0, gl: 0 },
  st: {
    off: { pwr: 0, stat: 0, bars: 0, gl: 0 },
    on: { pwr: 1, stat: 0, bars: 0, gl: 0 },
    static: { pwr: 1, stat: 1, bars: 0, gl: 0 },
    bars: { pwr: 1, stat: 0, bars: 1, gl: 0 },
    glow: { pwr: 1, stat: 0, bars: 0, gl: 1 },
    shut: { pwr: 0, stat: 0, bars: 0, gl: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { tile: "bars", },
  notes: "Film TV (368x324 film px) drawn at half scale; the film's dark body, bezel strip, rounded dark glass corners, faint glass highlight, speaker-grille bar, two grey knobs and green power LED are kept; added a 1-px dark outline and two stubby feet so it stands alone. LED fades with power. Switch-on/off: width opens first (line), then height; reverse on switch-off, ending as a dot that fades. Static is re-seeded every frame (noise, not a state change).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = 0.5 * z;
    const ox = cx, oy = cy;
    const X = (x) => Math.round(ox + x * k), Y = (y) => Math.round(oy + y * k);
    const R = (x0, y0, x1, y1, col) => { const a = X(x0), b = Y(y0); c.rect(a, b, Math.max(1, X(x1) - a), Math.max(1, Y(y1) - b), col); };
    // body (film: TV 86..454 x 128..452 → centred at 270,290)
    R(-184, -162, 184, 162, "#0B0812");                       // outline
    R(-178, -162 + 1, 178, 162 - 1, "#2E2A36"); R(-184 + 1, -156, 184 - 1, 156, "#2E2A36"); R(-178, -158, 178, -152, "#4A4656");
    R(-120, 160, -90, 172, "#0B0812"); R(90, 160, 120, 172, "#0B0812");   // feet
    R(-160, -144, 160, 112, "#141218");                         // bezel
    // screen 308 x 244 at (-154,-138)
    const sx0 = X(-154), sy0 = Y(-138), sx1 = X(154), sy1 = Y(106), W = sx1 - sx0, H = sy1 - sy0;
    const pw = v.pwr, fx = sm(pw, 0.04, 0.4), fy = sm(pw, 0.35, 0.8), warm = sm(pw, 0.6, 1), fl = sm(pw, 0, 0.1);
    c.rect(sx0, sy0, W, H, "#05050A");
    const mx = (sx0 + sx1) / 2, my = (sy0 + sy1) / 2, hx = Math.max(0.5, fx * W / 2), hy = Math.max(0.5, fy * H / 2);
    const bright = 0.34 + 0.4 * v.gl, frame = Math.floor(t * 30);
    if (fl > 0.001) {
      const xa = Math.round(mx - hx), xb = Math.round(mx + hx), ya = Math.round(my - hy), yb = Math.round(my + hy);
      for (let y = Math.max(sy0, ya); y < Math.min(sy1, Math.max(yb, ya + 1)); y++) {
        const vv = (y - my) / (H / 2), scan = (y - sy0) % 3 === 0 ? 0.05 : 0;
        for (let x = Math.max(sx0, xa); x < Math.min(sx1, Math.max(xb, xa + 1)); x++) {
          const uu = (x - mx) / (W / 2), r2 = Math.min(1, uu * uu * 0.6 + vv * vv * 0.6), gate = bayer(x, y);
          let col;
          if (gate >= warm) col = GLOW[GLOW.length - 1];       // white-hot while the tube is opening / closing
          else if (gate < v.bars) { const i = Math.min(6, Math.floor(((x - sx0) / W) * 7)); col = (y - sy0) / H > 0.82 ? BARSD[i] : BARS[i]; }
          else if (gate < v.bars + v.stat * (1 - v.bars)) { const n = rnd(x * 977 + y * 131 + frame * 7919); col = ramp(["#1A1A20", "#4A4A54", "#8A8A96", "#D8D8E4"], n, x, y); }
          else col = ramp(GLOW, (bright * (1 - 0.45 * r2) * (1 + 0.04 * Math.sin(t * 2.1 + vv * 3)) - scan) * fl, x, y);
          c.px(x, y, col);
        }
      }
    }
    // glass: faint highlight top-left (lighter on a lit screen), dark rounded corners
    const lit = warm;
    for (let j = 0; j < 3; j++) { const a = X(-146 + j * 6), b = X(-94 - j * 6), yy = Y(-132) + (j > 1 ? 0 : 0);
      for (let x = a; x < b; x++) for (let y = yy; y < yy + Math.max(1, Y(-130) - Y(-132)); y++) if (bayer(x, y) < 0.35) c.px(x, y, bayer(x + 1, y + 2) < lit ? "#9ACCEE" : "#2A2A3A"); }
    for (const [qx, qy] of [[-154, -138], [148, -138], [-154, 100], [148, 100]]) R(qx, qy, qx + 6, qy + 6, "#141218");
    // grille bar, knobs, power LED
    R(-144, 122, 144, 128, "#24202C");
    for (const gx of [-90, -70, -50, -30, -10, 10, 30, 50, 70, 90]) R(gx, 124, gx + 2, 127, "#0B0812");
    const disc = (qx, qy, r, col) => c.disc(X(qx), Y(qy), Math.max(1, Math.round(r * k)), col);
    disc(150, 140, 7, "#0B0812"); disc(150, 140, 6, "#5A5666"); disc(130, 140, 7, "#0B0812"); disc(130, 140, 6, "#5A5666");
    c.px(X(147), Y(137), "#7A7686"); c.px(X(127), Y(137), "#7A7686");
    disc(-154, 140, 4, "#0B0812"); disc(-154, 140, 3, bayer(X(-154), Y(140)) < Math.max(fl, 0) ? "#65DA41" : "#1E4A18");
    return { box: { x0: X(-184), y0: Y(-162), x1: X(184), y1: Y(172) }, pt: [X(0), Y(-16)] };
  },
};
