import {z} from "zod";
/**
 * Real logos and people photos (user decision 2026-10-21). A project snapshots each one from Wikimedia Commons via
 * Wikidata (logo / small-logo / image property) with its source, licence, trademark restriction and SHA-256; the
 * illustrated renderer shows it as a prepared logo-tile or person-tile. Nothing is redrawn or generated.
 * Renderer-safe: zod only.
 */
/** flag (2026-10-21, isometric tiles): a country/state flag via Wikidata P41, named in the narration. */
export const MEDIA_KINDS=["logo","person","flag"] as const;
export type MediaKind=typeof MEDIA_KINDS[number];
export const mediaAssetSchema=z.object({
 id:z.string().regex(/^[a-z0-9][a-z0-9-]{1,47}$/),
 kind:z.enum(MEDIA_KINDS),
 /** The name exactly as the narration says it; logo-tile/person-tile labels must match it. */
 subject:z.string().min(1).max(60),
 file:z.string().regex(/^[a-f0-9-]{36}\/media\/[a-z0-9-]+\.(png|jpg)$/),
 sha256:z.string().regex(/^[a-f0-9]{64}$/),
 width:z.number().int().positive(),height:z.number().int().positive(),
 /** Person photos are cropped to a square around the detected face (pixels of the Commons rendition); absent for logos. */
 crop:z.object({left:z.number().int().min(0),top:z.number().int().min(0),size:z.number().int().positive(),face:z.boolean()}).optional(),
 source:z.object({
  wikidata:z.string().regex(/^Q\d+$/),label:z.string().max(160),description:z.string().max(300),
  property:z.enum(["P8972","P154","P18","P41"]),
  commonsFile:z.string().max(300),page:z.string().max(600),
  license:z.string().max(160),licenseUrl:z.string().max(400),artist:z.string().max(400),credit:z.string().max(600),
  restrictions:z.string().max(200),attributionRequired:z.boolean(),date:z.string().max(160),retrievedAt:z.string().max(40),
 }),
});
export type MediaAsset=z.infer<typeof mediaAssetSchema>;
/** Visual-concept recommendation: a company, product or person named in the narration worth a small real logo/photo tile. */
export const mediaRecommendationSchema=z.object({
 subject:z.string().min(2).max(60),kind:z.enum(MEDIA_KINDS),scene:z.number().int().min(1).max(24),reason:z.string().max(240),
});
export type MediaRecommendation=z.infer<typeof mediaRecommendationSchema>;
export const mediaKey=(s:string)=>s.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}]/gu,"");
export const MEDIA_TILE_KIND={logo:"logo-tile",person:"person-tile"} as const;
export function findMedia(media:readonly MediaAsset[]|undefined,label:string,kind:MediaKind){
 const key=mediaKey(label);return media?.find(m=>m.kind===kind&&mediaKey(m.subject)===key);
}
