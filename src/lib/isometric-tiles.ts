import {z} from "zod";
import {anchor3dSchema} from "./scene3d";

// Real logo / flag / portrait tiles in the «Изометрия» city (experimental coverage mode 2026-10-21, opt-in per project). The picture is the project's media snapshot (Wikidata → Wikimedia Commons with licence and
// SHA-256, src/lib/media-assets.ts); the director only places it over a point of the city on the word that names it.
// Nothing is drawn or generated. This module imports no runtime code from ./isometric, so the core can import it.

const id=z.string().regex(/^[a-z][a-z0-9-]{0,23}$/);
const block=z.number().int().min(-7).max(7);
export const TILE_KINDS=["logo","flag","person"] as const;
export const tileSchema=z.object({
 id,kind:z.enum(TILE_KINDS),
 /** Exactly the media subject (as the narration says it). */
 subject:z.string().min(1).max(60),
 /** route!=='' places the tile over that route at fraction u; otherwise over the centre of block bx/bz. */
 route:z.string().max(24),u:z.number().min(0).max(1),bx:block,bz:block,
 /** Height of the tile's stem above the ground, world units. */
 lift:z.number().min(.6).max(4),
 /** Show the subject as a caption under the tile. */
 label:z.boolean(),
 enter:anchor3dSchema,exit:anchor3dSchema.nullable(),
});
export type IsoTile=z.infer<typeof tileSchema>;
export const TILE_GUIDE=`ПЛИТКИ (поле tiles): настоящий логотип (kind logo), флаг (flag) или портрет (person) из медиаснимка проекта — subject дословно как в списке media в CONTEXT (только эти). Плитка висит на тонкой стойке над точкой города: над маршрутом route=id, u 0..1 (bx=bz=0) или над кварталом route='', bx/bz; lift 0.6..4 — высота стойки. label true — подпись subject под плиткой. enter — на слове, которое называет компанию, страну или человека; exit — когда разговор ушёл дальше (плитка уходит плавно). Поставь камеру так, чтобы плитка была крупно в кадре. Не больше 8. Рисовать или придумывать логотипы нельзя: нет subject в media — нет плитки.`;
