// catalog-v1 item «traffic-light»: the car signal (red / yellow / green) over the pedestrian signal (hand / walking man)
// on one pole, from «Fake buttons» (fake-buttons/film/levels/street-props.mjs#drawSignals). Lib copy:
// items/lib/fakebuttons-street.mjs (HAND, MAN, icon). Changes: the two signals are stacked on one pole; the film's
// carLamps/walkK time functions are eased parameters (r, y, g, man, hand, blink), so lamps crossfade through Bayer gates;
// glows go through tintRect scaled by the presence; the layer is composited with c.px.
import { Layer, blitS, glow, icon, HAND, MAN, INK, RIM, mix, bayer, hline, vline, clamp01 } from "./lib/fakebuttons-street.mjs";
const S0 = 1.6;
const LAMPS = [["#FF4A4A", "#5A1A1E", "r"], ["#FFC83A", "#5A4416", "y"], ["#5AF08A", "#163A24", "g"]];
export default {
  kind: "traffic-light",
  covers: ["traffic-light"],
  source: "fake-buttons/film/levels/street-props.mjs#drawSignals",
  desc: "car traffic light over a pedestrian walk/hand signal on one pole",
  hw: 42, hh: 80, start: "red lamp lit, orange hand",
  states: {
    red: [0.4, "red lamp lit, orange hand: stop"],
    amber: [0.4, "the yellow lamp fades in, red fades out", "blip"],
    green: [0.45, "green lamp lit", "ding"],
    walk: [0.5, "green lamp and the white walking man light up, the hand fades", "glow"],
    blink: [0.45, "the yellow lamp and the orange hand blink together", "tick"],
  },
  base: { r: 1, y: 0, g: 0, man: 0, hand: 1, blink: 0 },
  st: {
    red: { r: 1, y: 0, g: 0, man: 0, hand: 1, blink: 0 },
    amber: { r: 0, y: 1, g: 0, man: 0, hand: 1, blink: 0 },
    green: { r: 0, y: 0, g: 1, man: 0, hand: 1, blink: 0 },
    walk: { r: 0, y: 0, g: 1, man: 1, hand: 0, blink: 0 },
    blink: { r: 0, y: 1, g: 0, man: 0, hand: 1, blink: 1 },
  },
  demo: {},
  notes: "Stacked layout is new (the film hangs the two signals at different places). Close-up magnifies 1x pixels.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, bl = v.blink * (0.5 + 0.5 * Math.sin(t * 5.5)) * 0.85, a = s.a;
    const L = new Layer(60, 104, -30, -6), g = L.g;
    // pole (behind both housings) + foot
    g.rect(-2, -3, 5, 98, "#3A4440"); vline(g, -2, -3, 98, RIM); vline(g, 2, -3, 98, "#1E2624"); g.rect(-6, 90, 13, 6, "#2A3230"); hline(g, -6, 90, 13, RIM);
    // car signal: gold housing, three lamps
    const sx = 0, sy = 0;
    g.rect(sx - 7, sy, 15, 37, INK); g.rect(sx - 6, sy + 1, 13, 35, "#C8A030"); g.rect(sx - 6, sy + 1, 13, 1, "#FFE08A"); g.rect(sx + 5, sy + 1, 2, 35, "#8A6A20");
    const lev = { r: v.r, y: v.y * (1 - bl), g: v.g };
    LAMPS.forEach(([on, off, k], i) => {
      const ly = sy + 7 + i * 11, A = clamp01(lev[k]); g.rect(sx - 5, ly - 5, 11, 2, "#2A2016");
      for (let j = -3; j <= 3; j++) for (let q = -3; q <= 3; q++) if (q * q + j * j <= 10) { const X = sx + q, Y = ly + j, lit = A > bayer(X, Y) * 0.98; g.px(X, Y, lit ? (q + j < -1 ? "#FFFFFF" : on) : off); }
    });
    // pedestrian signal: bracket, visor, housing with hand (left) and man (right)
    const x0 = -24, y0 = 46, w = 48, h = 28;
    g.rect(-2, 37, 5, 9, "#2A3230");
    g.rect(x0 - 1, y0 - 1, w + 2, h + 2, INK); g.rect(x0, y0, w, h, "#2C2E36"); g.rect(x0, y0, w, 1, RIM); g.rect(x0, y0 + 1, 1, h - 1, mix("#2C2E36", RIM, 0.5));
    g.rect(x0 - 2, y0 - 3, w + 4, 3, "#22242C"); g.rect(x0 - 2, y0 - 3, w + 4, 1, RIM);
    for (const fx of [x0 + 3, x0 + 25]) { g.rect(fx, y0 + 3, 20, 22, "#121318"); g.rect(fx, y0 + 3, 20, 1, "#3A3C46"); }
    const hand = clamp01(v.hand * (1 - bl)), man = clamp01(v.man);
    icon(g, HAND, x0 + 6, y0 + 6, hand, ["#FF9A4A", "#FF6A2A"], ["#4A2A1C", "#3A2218"]);
    icon(g, MAN, x0 + 29, y0 + 7, man, ["#FFFFFF", "#D8F0FF"], ["#2E3440", "#262A34"]);
    blitS(c, L, cx, cy - 46 * S + 0, S);
    // soft glows (screen space, scaled by presence)
    const ox = cx, oy = cy - 46 * S;
    LAMPS.forEach(([on], i) => glow(c, ox, oy + (7 + i * 11) * S, 9 * S, on, 0.45 * clamp01(lev[LAMPS[i][2]]) * a));
    glow(c, ox + (x0 + 13) * S, oy + (y0 + 14) * S, 15 * S, "#FF6A2A", 0.55 * hand * a); glow(c, ox + (x0 + 35) * S, oy + (y0 + 14) * S, 15 * S, "#E8F6FF", 0.5 * man * a);
    return { box: { x0: ox - 26 * S, y0: oy - 3 * S, x1: ox + 26 * S, y1: oy + 96 * S }, pt: [ox, oy + 18 * S] };
  },
};
