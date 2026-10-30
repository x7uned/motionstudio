// Builder PLANE · composition: sky + wisps + cloud sea (fill) → fuselage skin, seams, windows with cabins and passengers
// (back) → the hero in his window (actors) → hero window glass, pressure arrows, stress view, crack, ghost, sparkle (front).
import { BODY, winX, glassA, PITCH, sdRR, HW, HH, RING, radiusOf, winScreen } from "./plane-kit.mjs";
import { drawCleanSky, drawWisps, drawClouds, drawBellyReflection } from "./plane-sky.mjs";
import { drawSkin, drawSeams, drawEdgeArrows, edges } from "./plane-body.mjs";
import { drawWindowBack, glass, groove, windowArrows } from "./plane-window.mjs";
import { drawHero } from "./plane-hero.mjs";
import { drawStress, drawCrack, drawGhost, drawRowSparkle, drawGlint } from "./plane-stress.mjs";
import { EV } from "./plane-kit.mjs";

const GW = 540;
const visibleWindows = (V) => { const out = []; for (let k = Math.floor((V.x0 - 80) / PITCH); k <= Math.ceil((V.x1 + 80) / PITCH); k++) out.push(k); return out; };

export function fill(c, V, t) {
  const top = V.Y(BODY.top) + 4;                       // the skin covers everything below its (bulging) top edge
  drawCleanSky(c, top);
  drawWisps(c, V, t, top);
  drawClouds(c, V, t, V.Y(BODY.bot) - 8);
}

export function back(c, V, t) {
  drawSkin(c, V, t);
  drawBellyReflection(c, V, t, V.Y(104), V.Y(162), 0.7);
  const ks = visibleWindows(V);
  const wins = ks.map((k) => [...winScreen(V, t, k), radiusOf(k, t)]);
  const skip = (x, y) => { for (const [sx, sy, r] of wins) if (Math.abs(x - sx) < HW + RING + 2 && Math.abs(y - sy) < HH + RING + 2 && sdRR(x - sx + 0.5, y - sy + 0.5, HW, HH, r) < RING + 1) return true; return false; };
  drawSeams(c, V, t, skip);
  for (const k of ks) drawWindowBack(c, V, t, k);
  drawEdgeArrows(c, V, t);
}

export function actors(c, V, t) { drawHero(c, V, t); }

export function front(c, V, t) {
  const ga = glassA(t);
  glass(c, V, t, 0, ga);
  groove(c, V, t, 1 - ga);
  const ks = visibleWindows(V);
  for (const k of ks) windowArrows(c, V, t, k, k === 0 ? ga : 1);
  drawStress(c, V, t);
  drawCrack(c, V, t);
  drawGhost(c, V, t);
  drawGlint(c, V, t, 0, EV.round1 - 0.12, EV.round1 + 0.5);      // "…are round": a glint runs round the hero window
  drawRowSparkle(c, V, t, ks);
}
