import {z} from "zod";

/** Pure schema of the project's background music choice (docs/background-music.md); safe for the renderer bundle. */
/** Current pack for new projects; older projects keep the pack recorded in their profile. */
export const MUSIC_PACK="background-beds/v4";
export const MUSIC_PACKS=["background-beds/v2","background-beds/v3","background-beds/v4","background-beds/v5"] as const;
/** v5 (2026-10-22) = v4 plus the seamless loop mode; chosen only for projects with the explicit loop ending. */
export const LOOP_MUSIC_PACK="background-beds/v5";
export const MUSIC_BED_IDS=["pluck-curious","glass-arp","chip-soft","warm-pad","space-drone","lofi-pulse","music-box","nature-air"] as const;
export type MusicBedId=typeof MUSIC_BED_IDS[number];
export const musicBedSchema=z.object({version:z.literal(1),pack:z.enum(MUSIC_PACKS),id:z.enum(MUSIC_BED_IDS),selection:z.enum(["topic","explainer-random","editor"]),matched:z.string().max(40).optional(),sha256:z.string().regex(/^[a-f0-9]{64}$/)});
export type MusicBed=z.infer<typeof musicBedSchema>;
