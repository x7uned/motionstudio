// LV7 · jungle (snake): choreography table. Every time is a measured word time (EV / LV) plus an offset — no hard-coded
// seconds — and both the picture (levels/jungle.mjs, levels/jungle-snake.mjs) and the sound list (jungle-motions.mjs)
// read these same spans, so a sound always lasts exactly as long as its motion. Spans are [t0, t1] on the film clock.
// "Snakes kill about a hundred thousand people every year."
import { EV, LV, W } from "../timeline.mjs";

export const JT = {
  // the snake rises from its coil as the camera arrives (camera: LV.dog[1] − 0.2 → EV.snakes + 0.3)
  rise: [EV.snakes - 0.06, EV.snakes + 0.56],
  wake: [EV.snakes + 0.02, EV.snakes + 0.24],                 // eyes open while it rises
  // "hundred": the hood spreads (ease-out with a little overshoot)
  hood: [EV.hundred3 - 0.06, EV.hundred3 + 0.3],
  // "thousand": the hiss — mouth opens, fangs, the forked tongue flicks twice, cute angry brows
  hiss: [EV.thousand4 - 0.04, EV.thousand4 + 0.46],
  mouth: [EV.thousand4 - 0.04, EV.thousand4 + 0.06],          // opening (closes over the last 0.12 s of `hiss`)
  flicks: [[EV.thousand4 + 0.0, EV.thousand4 + 0.16], [EV.thousand4 + 0.2, EV.thousand4 + 0.36]],
  brows: [EV.thousand4 - 0.1, EV.thousand4 + 0.05],           // fade in; fade out after the hiss
  // the S-sway: gentle while it rises, a big S from "hundred", calmer from "year"
  swayBig: [EV.hundred3, EV.hundred3 + 0.5],
  swayCalm: [EV.year3, EV.year3 + 0.7],
  // "+VENOM" game pickup above its head, rising out of the hiss
  pickup: { t0: EV.thousand4 + 0.08, dur: 1.6 },
  // "year": it settles — the hood relaxes a little, a slow happy blink, a smile
  settle: [EV.year3 - 0.02, EV.year3 + 0.5],
  happyBlink: [EV.year3 + 0.05, EV.year3 + 0.55],
  // the camera leaves for the camp: the snake watches it go
  watch: [LV.snake[1] + 0.05, LV.snake[1] + 0.45],
  // ordinary blinks (0.2 s each): between the rise and the hood, after the hiss, then periodic while the camera leaves
  blinks: [EV.snakes + 0.58, W("people", 4) + 0.26],
  blinkEvery: { from: LV.snake[1] + 0.6, every: 2.9 },
};
