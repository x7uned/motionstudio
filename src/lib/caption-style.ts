import {z} from "zod";
/** Caption looks of the illustrated film (renderer/CaptionStyles.tsx). Absent = the classic purple-pill captions. */
export const CAPTION_STYLES=["karaoke","word","marker","terminal","roll","chips","bold","focus","tape","sticker"] as const;
export const captionStyleSchema=z.enum(CAPTION_STYLES);
export type CaptionStyleId=z.infer<typeof captionStyleSchema>;
/** Editor decision 2026-10-21: new illustrated films use the karaoke fill. */
export const DEFAULT_CAPTION_STYLE:CaptionStyleId="karaoke";
