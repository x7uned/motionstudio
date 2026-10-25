import {z} from "zod";
/**
 * Portrait overlay layout of the illustrated film (renderer-safe: zod only). Absent option = the original
 * numbers, byte for byte. "tiktok-safe" (explicit per-project choice, 2026-10-20) lowers the header below
 * TikTok's top tabs and shifts the stage, chapter label and captions with it; the stage size (VIEW), focus
 * and safe x-range are unchanged, so director plans and the validator are identical.
 */
export const portraitLayoutSchema=z.enum(["tiktok-safe"]);
export type PortraitLayout=z.infer<typeof portraitLayoutSchema>;
/**
 * Overlay version (editor decision 2026-10-21): 2 = clean header — avatar, handle, duration and the film title only;
 * no chapter bars under the title and no chapter label above the captions. The freed rows go to a taller stage window;
 * the 1080×900 director view stays centred inside it, so plans and the validator are unchanged. Absent = version 1.
 * 3 (user decision 2026-10-22) = no overlay at all: no avatar, handle, duration or title. The picture fills the whole
 * 9:16 frame without black bands or fades; only the captions stay, over the picture with a soft shade under them.
 * The director view keeps its v2 position in the frame, so framing against the captions is unchanged.
 */
export const overlayVersionSchema=z.union([z.literal(2),z.literal(3)]);
export type OverlayVersion=z.infer<typeof overlayVersionSchema>;
const CAPTION_BOX=145,VIEW_HEIGHT=900,FRAME_HEIGHT=1920;
export function illustratedLayout(layout?:PortraitLayout,overlay?:OverlayVersion){
 const l=layout==="tiktok-safe"
  ?{header:256,title:330,progress:384,stage:404,chapter:1312,captions:1360}
  :{header:108,title:182,progress:236,stage:292,chapter:1206,captions:1262};
 // Clean overlay: the stage starts right under the title line and ends just above the captions.
 const clean=overlay===2||overlay===3,cleanStage=l.title+46,cleanHeight=l.captions-4-cleanStage;
 const stage=clean?cleanStage:l.stage,stageHeight=clean?cleanHeight:VIEW_HEIGHT,viewTop=stage+(stageHeight-VIEW_HEIGHT)/2;
 // OCR check on the exported MP4: text must stay between the header row and the caption box (+15.5 px margin).
 // Without an overlay (v3) the header row is still the top of the safe zone: TikTok's tabs sit above it.
 const ocr={top:l.header-2.5,bottom:l.captions+CAPTION_BOX+15.5};
 if(overlay===3)return {...l,stage:0,stageHeight:FRAME_HEIGHT,viewTop,chrome:false,bare:true,ocr};
 return {...l,stage,stageHeight,viewTop,chrome:!clean,bare:false,ocr};
}
