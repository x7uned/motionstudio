// catalog-v1 item «photograph»: a photo card (white border, thicker bottom strip, drop shadow, label strip).
// Source: not-ugly/film/levels/finder-view.mjs#card (+ the turn in drawFlip: cos(pi k) squeeze, front/back swap at the
// edge-on moment, darkening while turning). Changes: no face, no mirror/study modes; the picture area shows a snapshot
// of the canvas around the target prop s.look (blended with a dusk gradient by s.lookK, so a target arriving never
// re-aims in one frame); the back of the card is a plain paper back crossfaded by Bayer gate; flash = eased white halo
// and a pale print, develop = the picture fades in through the dither gate. The film's channel hero is not ported.
import { bayer, mix, MAIN } from "../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); }, R = Math.round;
const CARD = { hw: 88, hh: 122, side: 7, bottom: 28 }, Q = 0.8;           // film card, scaled to fit the prop footprint
export default {
  kind: "photograph",
  covers: ["photograph"],
  source: "not-ugly/film/levels/finder-view.mjs#card,drawFlip",
  desc: "white-bordered photo card; shows a snapshot of its target, flashes, turns over, develops",
  hw: 72, hh: 100, start: "a developed photo card hangs still, its picture a snapshot",
  text: true,
  states: {
    show: [0.5, "photo card hangs still"],
    flash: [0.5, "camera flash: bright halo, the print goes pale", "sparkle"],
    develop: [0.9, "the picture slowly fades in", "glow"],
    flip: [0.8, "card turns over to show its paper back", "swish"],
  },
  base: { dev: 1, flip: 0 },
  st: { show: { dev: 1, flip: 0 }, flash: { dev: 0.06, flip: 0 }, develop: { dev: 1, flip: 0 }, flip: { flip: 1 } },
  demo: { target: true, label: "PHOTO" },
  notes: "Picture = copy of the canvas around the target (1:1, nearest) or a dusk gradient when there is no target; label (script word) goes in the bottom strip and dissolves while the card is edge-on. The flash halo is a dithered disc scaled by the eased accent.",
  draw(c, cx0, cy0, z, t, s) {
    const v = s.v, q = Q * z, k = v.flip, sx = Math.cos(Math.PI * k), asx = Math.abs(sx), back = sm((k - 0.46) / 0.08);
    const cx = cx0, cy = R(cy0 + Math.sin(t * 1.5) * 1.5 * z);
    const hw = CARD.hw * q * asx, hh = CARD.hh * q, x0 = R(cx - hw), x1 = R(cx + hw), y0 = R(cy - hh), y1 = R(cy + hh);
    const ins = Math.max(2, R(CARD.side * q * asx)), bot = R(CARD.bottom * q), px0 = x0 + ins, px1 = x1 - ins, py0 = y0 + R(CARD.side * q), py1 = y1 - bot;
    const turnDark = (1 - asx) * 0.35, frame = (col) => (turnDark > 0 ? mix(col, "#2A1F40", turnDark) : col);
    // snapshot the picture first (the card must not read itself): target blend through the Bayer gate
    const pw = Math.max(0, px1 - px0), ph = Math.max(0, py1 - py0), pic = new Array(pw * ph);
    const look = s.look, raw = s.raw;
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
      const x = px0 + i, y = py0 + j, u = (i + 0.5) / pw, w = (j + 0.5) / ph;
      const gy = clamp01(w * 1.1), grad = mix(mix("#2A1F55", "#C06A8A", gy), "#F4CA50", clamp01((gy - 0.72) * 3.2) * 0.9);
      let col = grad;
      if (look && s.lookK > bayer(x, y)) col = raw.get(Math.floor(look[0] + (u - 0.5) * (CARD.hw * 2 - 14) * Q * z), Math.floor(look[1] + (w - 0.5) * (CARD.hh * 2 - 35) * Q * z));
      pic[j * pw + i] = col;
    }
    if (x1 - x0 < 2) { c.rect(R(cx), y0, 1, y1 - y0, "#E8E2D4"); return { box: { x0, y0, x1, y1 }, pt: [cx, cy] }; }
    // flash halo (eased accent) behind the card
    const fl = Math.sin(Math.PI * s.acc("flash")) * (s.last && s.last.state === "flash" ? 1 : 0);
    if (fl > 0.002) for (let y = y0 - 30; y < y1 + 30; y++) for (let x = x0 - 30; x < x1 + 30; x++) {
      const d = Math.hypot((x - cx) / ((hw + 30) * Math.sqrt(fl)), (y - cy) / ((hh + 30) * Math.sqrt(fl))); if (d >= 1) continue;
      const st = Math.min(0.85, 0.95 * Math.sqrt(fl) * (1 - d) ** 0.8) / 0.17, lo = Math.floor(st), qq = (st - lo > bayer(x, y) ? lo + 1 : lo) * 0.17;
      if (qq > 0) c.px(x, y, mix(c.get(x, y), "#FFFFF0", qq));
    }
    // drop shadow
    for (let y = y0 + 5; y < y1 + 5; y++) for (let x = x0 + 4; x < x1 + 4; x++) if ((x >= x1 || y >= y1) && bayer(x, y) < 0.55) c.px(x, y, "#0B0812");
    // frame; back side = paper back crossfaded through the gate
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const inPic = x >= px0 && x < px1 && y >= py0 && y < py1;
      if (inPic && back < 1) continue;
      const edge = x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1, bk = back > bayer(x, y);
      let col;
      if (bk) col = edge ? "#5A5068" : (x + y) % 11 === 0 ? "#D8D0BE" : ((x >> 2) + (y >> 2)) % 7 === 0 ? "#DDD5C4" : "#E6DFCE";
      else col = edge ? "#5A5068" : (y === y0 + 1 || x === x0 + 1) ? "#FFFFFF" : y >= py1 ? "#F2EEE4" : "#ECE6DA";
      c.px(x, y, frame(col));
    }
    // picture: developed (dev) through the dither gate over a pale cream print; hidden by the back
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) {
      const x = px0 + i, y = py0 + j; if (back >= bayer(x, y)) continue;
      const col = v.dev > bayer(x, y) ? pic[j * pw + i] : "#CFC8B4";
      c.px(x, y, turnDark > 0 ? mix(col, "#120C1D", turnDark) : col);
    }
    // glare corner on the picture
    for (let j = 0; j < ph; j++) for (let i = 0; i < pw; i++) { const d = i + j * 0.8; if (d > pw * 0.22 && d < pw * 0.3 && bayer(px0 + i, py0 + j) < 0.2 && back < 0.5 && v.dev > 0.5) c.px(px0 + i, py0 + j, "#FFFFFF"); }
    // label in the bottom strip
    const lk = sm((asx - 0.55) / 0.35) * (1 - back);
    if (s.label && lk > 0.01) { const sc = q >= 0.7 ? 2 : 1, tw = c.measure(MAIN, s.label, { scale: sc }), lv = lk >= 1 ? c : Object.create(c); if (lk < 1) lv.px = (x, y, col) => { if (lk > bayer(Math.floor(x), Math.floor(y))) c.px(x, y, col); }; lv.text(MAIN, s.label, R(cx - tw / 2), R(py1 + (bot - 7 * sc) / 2), "#3B2C5C", { scale: sc }); }
    return { box: { x0, y0, x1, y1 }, pt: [cx, cy] };
  },
};
