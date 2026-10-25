import { z } from "zod";
import { videoAnalysisSchema, IMPORT_LIMIT } from "./author-model";
export function reelLink(input:string){
 let u:URL;try{u=new URL(input.trim());}catch{throw new Error("Нужна полная HTTPS-ссылка на конкретный Reel.");}
 if(u.protocol!=="https:"||!["instagram.com","www.instagram.com"].includes(u.hostname)||u.username||u.password||u.port)throw new Error("Разрешены только HTTPS-ссылки на Instagram Reels.");
 const match=/^\/(?:reel|reels)\/([A-Za-z0-9_-]{3,64})\/?$/.exec(u.pathname);
 if(!match)throw new Error("Вставьте ссылку на Reel, а не на аккаунт или раздел Instagram.");
 return `https://www.instagram.com/reel/${match[1]}/`;
}
export function reelLinks(input:string|string[]){
 const raw=Array.isArray(input)?input:input.split(/\s+/).filter(Boolean);
 if(!raw.length)throw new Error("Добавьте хотя бы одну ссылку на Reel.");
 if(raw.length>100)throw new Error("Слишком много строк. Подборка ограничена 20 видео.");
 const links=[...new Set(raw.map(reelLink))];
 if(links.length>IMPORT_LIMIT)throw new Error("В одной подборке может быть не больше 20 разных видео.");
 return links;
}
export const cameraModes=["static","orbit","dolly","pan","tilt","truck","crane","flythrough","zoom","mixed","unknown"] as const;
export const shotSchema=z.object({
 id:z.string().max(40),at:z.number().nonnegative(),end:z.number().nonnegative(),
 purpose:z.string().max(400),
 composition:z.string().max(600),
 onScreenText:z.array(z.string().max(180)).max(12),
 camera:z.object({mode:z.enum(cameraModes),description:z.string().max(600),evidence:z.string().max(400),confidence:z.enum(["high","medium","low"])}),
 objects:z.array(z.object({name:z.string().max(100),kind:z.enum(["model3d","text","image","shape","particle","person","video","unknown"]),appearance:z.string().max(400),motion:z.string().max(400),evidence:z.string().max(300)})).max(12),
 lighting:z.string().max(500),
 transition:z.string().max(500),
 speechSync:z.string().max(500),
 reproduction:z.object({method:z.enum(["remotion2d","threejs","blender","video-editing","unknown"]),steps:z.array(z.string().max(400)).min(1).max(8),assets:z.array(z.string().max(240)).max(12),unknowns:z.array(z.string().max(300)).max(8)}),
});
export const chunkAnalysisSchema=z.object({
 summary:z.string().max(600),
 observations:videoAnalysisSchema.shape.observations,
 shots:z.array(shotSchema).min(1).max(10),
 limitations:z.array(z.string().max(300)).max(8),
});
export type ChunkAnalysis=z.infer<typeof chunkAnalysisSchema>;
export const productionAnalysisSchema=videoAnalysisSchema.extend({
 version:z.literal(2),
 sceneType:z.enum(["3d","2d","mixed","live-action","screen-recording","unknown"]),
 shots:z.array(shotSchema).min(1).max(400),
 reconstruction:z.object({
  concept:z.string().max(900),
  recommendedTools:z.array(z.string().max(160)).min(1).max(8),
  assetChecklist:z.array(z.string().max(300)).max(30),
  steps:z.array(z.string().max(500)).min(1).max(20),
  unknowns:z.array(z.string().max(400)).max(16),
 }),
});
export type ProductionAnalysis=z.infer<typeof productionAnalysisSchema>;
export function validateChunk(raw:unknown,start:number,end:number){
 const a=chunkAnalysisSchema.parse(raw);
 for(const s of a.shots)if(s.at<start-.001||s.end>end+.001||s.end<=s.at)throw new Error("Сцена выходит за границы разобранного фрагмента.");
 for(const o of a.observations)if(o.at<start-.001||o.end>end+.001||o.end<o.at)throw new Error("Наблюдение выходит за границы фрагмента.");
 const sorted=[...a.shots].sort((a,b)=>a.at-b.at);
 let cursor=start;
 for(const shot of sorted){if(shot.at>cursor+.15)throw new Error("В разборе пропущен участок фрагмента.");cursor=Math.max(cursor,shot.end);}
 if(cursor<end-.15)throw new Error("Разбор не покрывает конец фрагмента.");
 return a;
}
export function validateProduction(raw:unknown,duration:number){
 const a=productionAnalysisSchema.parse(raw);
 for(const s of a.shots)if(s.end<=s.at||s.end>duration+.05)throw new Error("Некорректный таймкод сцены.");
 for(const o of a.observations)if(o.end<o.at||o.end>duration+.05)throw new Error("Некорректный таймкод наблюдения.");
 return a;
}
export function needsCustomRenderer(a:ProductionAnalysis){return a.sceneType==="3d"||a.sceneType==="mixed"||a.shots.some(s=>["threejs","blender","video-editing"].includes(s.reproduction.method));}
export function referenceTitle(a:any){return a.state?.name||`Архивный разбор @${a.username}`;}
