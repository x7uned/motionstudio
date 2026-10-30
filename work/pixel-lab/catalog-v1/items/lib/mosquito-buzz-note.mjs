// catalog-v1 copy (2026-10-26) of work/pixel-lab/mosquito-buzz/film/fx.mjs#note (the eighth note of the buzz film's
// «singing» beat, drawn in film pixels). Changes: the one function only; import of fade from the shared raster.mjs
// (the film imports the same dissolve from its cute.mjs); the outline and note colours are inlined from the film's
// palette (C.O = #0B0812, C.Y = #F4CA50). The drawing itself is unchanged.
import { fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const NOTE_O = "#0B0812", NOTE_Y = "#F4CA50";

export function note(c, x, y, a, col = NOTE_Y) { if (a <= 0) return; const g = fade(c, a); g.ellipse(R(x), R(y), 4, 3, NOTE_O); g.ellipse(R(x), R(y), 3, 2, col); g.rect(R(x + 2), R(y - 12), 2, 12, NOTE_O); g.rect(R(x + 3), R(y - 12), 1, 11, col); g.rect(R(x + 3), R(y - 12), 5, 2, NOTE_O); g.rect(R(x + 3), R(y - 12), 4, 1, col); }
