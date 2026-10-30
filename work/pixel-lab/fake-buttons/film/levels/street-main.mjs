// LEVEL «the corner» of «Fake buttons» (Builder STREET). One side-view New York corner at golden hour:
// back   = FAR skyline · MID towers (parallax) · the far side (NEAR: tenements, fire escapes, water tower, far sidewalk,
//          signal pole) · the live signal heads · the road with the zebra, the front sidewalk and furniture (GROUND) ·
//          the avenue's near lane at the bottom (FORE, parallax 1.15)
// actors = far walkers, cars on both lanes and the crossers (depth-sorted) · the controller cabinet · the push-button box
//          on its pole · the hero (shadow, sprite) · his phone
// front  = the cars passing in the avenue's near lane at the very bottom
// hud    = the X-ray lens over the box · the camera flash + CLICK! · +CONTROL and the heart
// Everything right of the office building's facade (x ≥ BLD.x0) is clipped: the building draws itself there.
import { BLD, BUTTON } from "../timeline.mjs";
import { blit, R } from "./street-kit.mjs";
import { NEAR, GROUND, FORE, MID, FAR, MID_P, FAR_P, FORE_P, X_MAX } from "./street-art.mjs";
import { drawSignals, drawButtonBox, drawCabinet, drawLens } from "./street-props.mjs";
import { drawRoad, drawForeCars } from "./street-traffic.mjs";
import { HERO, drawHeroShadow, drawPhone, drawFlash, drawPickups } from "./street-hero.mjs";
import { drawPigeons, drawSteam, drawJet, drawBirds } from "./street-life.mjs";

const cornerVisible = (V) => V.x0 < X_MAX + 20;
const clipOf = (c, V) => Math.max(0, Math.min(c.w, R(V.X(BLD.x0))));

export function back(c, V, t) {
  drawJet(c, V, t);
  drawBirds(c, V, t);
  blit(c, FAR, FAR.at[0] - (V.cx + 300) * FAR_P[0], FAR.at[1] + (-160 - V.cy) * FAR_P[1]);
  blit(c, MID, MID.at[0] - (V.cx + 300) * MID_P[0], MID.at[1] + (-160 - V.cy) * MID_P[1]);
  if (!cornerVisible(V)) return;
  blit(c, NEAR, V.X(NEAR.ox), V.Y(NEAR.oy));
  drawSignals(c, V, t);
  blit(c, GROUND, V.X(GROUND.ox), V.Y(GROUND.oy));
  blit(c, FORE, FORE.ox + 570 - (V.cx + 300) * FORE_P, V.Y(FORE.oy));
  drawSteam(c, V, t);
}
export function actors(c, V, t) {
  if (!cornerVisible(V)) return;
  const clipX = clipOf(c, V);
  drawRoad(c, V, t, clipX);
  drawPigeons(c, V, t, clipX);
  drawCabinet(c, V, t);
  drawButtonBox(c, V, t);
  drawHeroShadow(c, V, t);
  HERO.draw(c, V, t);
  drawPhone(c, V, t);
}
export function front(c, V, t) { if (cornerVisible(V)) drawForeCars(c, V, t, clipOf(c, V)); }
export function hud(c, V, t) {
  if (!cornerVisible(V)) return;
  drawLens(c, V, t);
  drawFlash(c, V, t);
  drawPickups(c, V, t, { x: R(V.X(BUTTON.x)), y: R(V.Y(BUTTON.y)) });
}
