// catalog-v1 backdrop «race-track»: the stadium level of the animals-speed film (levels/stadium.mjs back; static parts copied to
// lib/animals-stadium.mjs): a daylight sprint stadium with a blue-and-yellow crowd stand with pennants, a padded blue wall,
// a floodlight tower, grass verges with hedges and a red running track with perspective lane lines and a white kerb.
// Catalog changes: painted once at 1× into a cache and sampled nearest through the camera (the film's perspective track,
// scrolled by the run distance, is frozen at distance 0); the scene is lifted 60 px so the stand foot / track edge sits at
// y 580; a daylight sky replaces the film's; runner, speed board with its numbers, start/finish lines, cheering crowd and
// camera flashes are not drawn. Only the pennants wave.
import { layer } from "../engine/layout.mjs";
import { buildStadium, flagsLayer, CW, CH, PADX, SH } from "./lib/animals-stadium.mjs";

function draw(c, cam, t) {
  const V = layer(cam, 1), src = buildStadium(), sd = src.d, dd = c.d, GW = c.w, GH = c.h;
  const xs = new Int32Array(GW);
  for (let x = 0; x < GW; x++) { let i = Math.floor(V.wx(x + 0.5)) + PADX; xs[x] = i < 0 ? 0 : i >= CW ? CW - 1 : i; }
  const fl = flagsLayer(t), fm = fl.c.m, fd = fl.c.d, FW = fl.c.w, FH = fl.c.h;
  for (let y = 0; y < GH; y++) {
    let j = Math.floor(V.wy(y + 0.5)) + SH; j = j < 0 ? 0 : j >= CH ? CH - 1 : j;
    const row = j * CW, fj = j - fl.wy0, frow = fj * FW, inFl = fj >= 0 && fj < FH;
    for (let x = 0; x < GW; x++) {
      const q = (y * GW + x) * 3, i = xs[x];
      if (inFl) { const li = frow + i;; /* layer wx0 = -PADX: its column = cache column */ if (fm[li]) { const p = li * 3; dd[q] = fd[p]; dd[q + 1] = fd[p + 1]; dd[q + 2] = fd[p + 2]; continue; } }
      const p = (row + i) * 3; dd[q] = sd[p]; dd[q + 1] = sd[p + 1]; dd[q + 2] = sd[p + 2];
    }
  }
}

export default {
  kind: "race-track",
  backdrop: true,
  covers: ["race-track"],
  source: "animals-speed/film/levels/stadium.mjs#back",
  desc: "sunny sprint stadium: crowd stand with pennants, floodlight tower, red running track with lanes",
  theme: { accent: "#F8C83A", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#1A2A5A", "#2E58B0", "#101A3C"], beam: "#FFF6D0" },
  draw,
  notes: "Stand and track painted at 1× and nearest-sampled through the camera (non-integer zoom makes pixel columns uneven; the crowd and lane dashes are tiny and shimmer slightly while zooming). Wide shot: stand y 392–552 with a padded wall, track from y 580 down with a white kerb and perspective lane lines, floodlight tower at the right edge, sky above y 390. Props at y 262–440 overlap the busy crowd rows; dark/saturated props read, pale ones need their outline. The track is pure red: props with red/orange fur blend in. Not drawn: runner, speed board, finish line, cheering crowd and flashes.",
};
