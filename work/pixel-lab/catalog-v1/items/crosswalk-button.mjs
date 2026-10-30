// catalog-v1 item «crosswalk-button»: the pedestrian push-button box of «Fake buttons» (fake-buttons/film/levels/street-props.mjs
// BOXART + drawButtonBox): yellow housing, chrome dome that sinks when pressed, lamp window, sign plate, pole stub.
// Lib copy: items/lib/fakebuttons-street.mjs. Changes: plate lines and the WAIT letters are not text (grey bars / a lit
// bar); the pole is a stub with a foot; the film's pressAt/waitLampAt time functions are parameters + s.acc accents;
// the highlight outline of the film is dropped (the engine has focus brackets); the layer is composited through c.px.
import { boxArt, boxLive, blitS, glow, clamp01 } from "./lib/fakebuttons-street.mjs";
const S0 = 1.5;
export default {
  kind: "crosswalk-button",
  covers: ["crosswalk-button"],
  source: "fake-buttons/film/levels/street-props.mjs#drawButtonBox,boxScreen",
  desc: "yellow pedestrian push-button box on a pole, chrome dome, lamp window, sign plate",
  hw: 39, hh: 116, start: "stands idle, lamp dark",
  states: {
    idle: [0.4, "stands idle, lamp dark"],
    press: [0.35, "the dome sinks and springs back once", "tick"],
    wait: [0.45, "the lamp window glows orange and pulses", "glow"],
    go: [0.5, "the lamp turns green and stays lit", "ding"],
    fake: [0.5, "nothing happens: the lamp blinks faintly twice", "blip"],
  },
  base: { wait: 0, go: 0 },
  st: { idle: { wait: 0, go: 0 }, press: { wait: 0, go: 0 }, wait: { wait: 1, go: 0 }, go: { wait: 0, go: 1 }, fake: { wait: 0, go: 0 } },
  demo: {},
  notes: "Pictograms instead of the film's printed text (no readable text). Highlight outline of the film not ported. Close-up magnifies 1x pixels.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z, acc = s.acc;
    const press = Math.sin(Math.PI * clamp01(acc("press"))), fk = Math.sin(Math.PI * 2 * clamp01(acc("fake"))) ** 2;
    const pulse = 0.72 + 0.28 * Math.sin(t * 5);
    const w = clamp01(v.wait * pulse + 0.35 * fk), gr = v.go;
    const L = boxArt().clone(); boxLive(L, Math.max(press, 0.35 * Math.sin(Math.PI * clamp01(acc("fake")))), w, gr);
    const ox = cx, oy = cy + 11 * S;
    blitS(c, L, ox, oy, S);
    const a = s.a;
    glow(c, ox + S, oy - 23.5 * S, 15 * S, "#FF6A3A", 0.4 * w * a); glow(c, ox + S, oy - 23.5 * S, 15 * S, "#5AF08A", 0.4 * gr * a);
    return { box: { x0: cx - 26 * S, y0: cy - 85 * S + 11 * S, x1: cx + 26 * S, y1: cy + 62 * S + 11 * S }, pt: [ox, oy - 11 * S] };
  },
};
